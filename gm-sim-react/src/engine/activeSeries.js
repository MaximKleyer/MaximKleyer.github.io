/**
 * activeSeries.js — Manages the in-flight series during per-map advance.
 *
 * Lifecycle:
 *   1. advanceGroupWeek() / advanceBracketStage() / advanceInternational()
 *      etc. are called on a FRESH tick (no active series exist for the
 *      current phase). Each builds the list of series that should start
 *      this tick and calls seedActiveSeries().
 *
 *   2. advanceOneMap() is called from the UI's Advance button. It plays
 *      ONE map in each active series. Series that complete get drained
 *      to a "completed" buffer for downstream processing (team records,
 *      stats, etc.).
 *
 *   3. When activeSeries becomes empty AND there are no more completed
 *      series to process, the caller (App.jsx) knows this tick is done
 *      and can advance the week/stage as usual.
 *
 * State shape on gameState.season:
 *   activeSeries: [
 *     {
 *       seriesId: 'emea:w1:0',   // stable key used by UI to dedupe
 *       phase: 'group',          // 'group' | 'bracket' | 'international' | 'worlds'
 *       regionKey: 'emea',       // scoping info used by completion processors
 *       week: 1,                 // if applicable
 *       scheduleIdx: 0,          // if phase === 'group', idx into region.schedule
 *       series: { teamA, teamB, bestOf, maps, winner, ... }   // from Match.js
 *     },
 *     ...
 *   ]
 *
 *   Whether the array is empty determines whether we're "between ticks"
 *   (ready to advance the week/stage) or "mid-tick" (more maps to play
 *   before progressing).
 */

import { startSeries, simulateNextMap, isSeriesComplete } from '../classes/Match.js';
import { getActivePool } from '../data/maps.js';
import { autoMapPlan, createVeto, runAIUntilHumanTurn } from './veto.js';

/**
 * Ensure the activeSeries field exists on the season. Safe to call
 * repeatedly; idempotent.
 */
export function ensureActiveSeries(gameState) {
  if (!gameState.season.activeSeries) {
    gameState.season.activeSeries = [];
  }
  return gameState.season.activeSeries;
}

/**
 * Are there any series currently in progress for the given phase?
 * Used by advance handlers to decide "should I play a map on existing
 * series, or should I seed new ones?"
 */
export function hasActiveSeries(gameState, phaseFilter = null) {
  const list = gameState.season.activeSeries || [];
  if (!phaseFilter) return list.length > 0;
  return list.some(a => a.phase === phaseFilter);
}

/**
 * Filter: active series matching the given predicate.
 */
export function getActiveSeries(gameState, predicate) {
  const list = gameState.season.activeSeries || [];
  if (!predicate) return list;
  return list.filter(predicate);
}

/**
 * Seed the active list with a fresh batch of series. Appends rather than
 * replaces, so it composes with series seeded from other regions/phases.
 *
 * Each item in `specs` should be:
 *   { seriesId, phase, regionKey?, week?, scheduleIdx?, teamA, teamB, bestOf, origin? }
 *
 * Returns the subset of seeded series (with the stateful series object
 * attached) so the caller can keep references if needed.
 */
export function seedActiveSeries(gameState, specs) {
  const list = ensureActiveSeries(gameState);
  const seeded = [];
  for (const s of specs) {
    // Copy ALL fields from the spec onto the entry, so caller-specific
    // refs (matchRef, bracketMatchRef, intlMatchRef, scheduleIdx, etc.)
    // survive intact for completion-handler routing AND UI lookup.
    // Only `series` is computed locally — everything else comes from the
    // caller. teamA/teamB/bestOf/origin are consumed by startSeries but
    // also kept on the entry for any consumers that want them.
    // Map plan: use the one the caller supplied (a human veto result),
    // otherwise auto-resolve the veto with AI on both sides.
    const bestOf = s.bestOf || 3;
    const pool = getActivePool(gameState);
    const grandFinal = !!s.grandFinal;
    const mapPlan = s.mapPlan
      || autoMapPlan(pool, bestOf, s.teamA, s.teamB, { grandFinal });
    const entry = {
      ...s,
      series: startSeries(s.teamA, s.teamB, bestOf, s.origin, mapPlan),
    };
    list.push(entry);
    seeded.push(entry);
    // Hold map play until the next advance — see isMapPlayBlocked().
    gameState.season._seededThisTick = true;

    // A fresh series means a fresh practice block. Reset before the veto
    // so the player can see what they're about to play, then train for it
    // on the next one.
    if (isHumanSeries(s)) gameState.season.trainingUsed = false;

    // If the human team is in this series and they haven't opted out for
    // the season, park an interactive veto. The series already carries a
    // usable auto plan, so declining the prompt costs nothing — accepting
    // it just overwrites that plan before any map is played.
    if (!s.mapPlan && !gameState.season?.skipVetoThisSeason
        && !gameState.season?._fastForward && isHumanSeries(s)) {
      const humanSide = s.teamA?.isHuman ? 'A' : 'B';
      const veto = createVeto(pool, bestOf, { grandFinal, humanSide });
      // Let the AI take any steps that come before the human's first turn.
      runAIUntilHumanTurn(veto, side => (side === 'A' ? s.teamA : s.teamB));
      gameState.season.pendingVeto = {
        entryIndex: list.length - 1,
        teamAAbbr: s.teamA?.abbr,
        teamBAbbr: s.teamB?.abbr,
        humanSide,
        bestOf,
        grandFinal,
        veto,
      };
    }
  }
  return seeded;
}

function isHumanSeries(spec) {
  return !!(spec?.teamA?.isHuman || spec?.teamB?.isHuman);
}

/**
 * No map may be played on the same tick that seeded the series, and none
 * while a human veto is open.
 *
 * Every advance handler seeds series and then immediately calls
 * advanceOneMap in the same click. Without this gate, map 1 was played
 * against the provisional auto veto BEFORE the player's ban/pick could
 * be applied — so a map you banned could still show up as map 1, and the
 * opening map of every series was played the instant the series started.
 *
 * Gating here rather than at the six call sites keeps the rule in one
 * place: seeding shows the matchup (and the veto), the NEXT advance
 * plays the opening map.
 */
function isMapPlayBlocked(gameState) {
  const season = gameState?.season;
  if (!season) return false;
  // Fast-forward buttons opted out of both the veto prompt and the
  // one-tick hold — the player asked to skip ahead, and blocking here
  // would spin their sim loop without ever playing a map.
  if (season._fastForward) return false;
  if (season.pendingVeto) return true;
  if (season._seededThisTick) {
    // One-shot: consume the flag so the next advance plays normally.
    season._seededThisTick = false;
    return true;
  }
  return false;
}

/**
 * True while a human veto is waiting on input. Map advancement must be
 * blocked until it resolves, otherwise maps would be played before the
 * user's picks could be applied.
 */
export function hasPendingVeto(gameState) {
  return !!gameState?.season?.pendingVeto;
}

/**
 * Apply a finished veto to its series and clear the prompt.
 * Passing null for `plan` keeps whatever auto plan the series already
 * has — that's the "Auto-pick & Sim" path.
 */
export function resolvePendingVeto(gameState, plan) {
  const pending = gameState?.season?.pendingVeto;
  if (!pending) return;
  const entry = gameState.season.activeSeries?.[pending.entryIndex];
  if (entry && plan && plan.length > 0) {
    entry.series.mapPlan = plan;
  }
  gameState.season.pendingVeto = null;
  // The veto screen WAS this tick's pause, so don't also spend the
  // seeded-this-tick hold — otherwise the player would have to click
  // advance twice after finishing a veto before any map is played.
  gameState.season._seededThisTick = false;
}

/**
 * Advance one map across ALL currently-active series (any phase).
 * Series that complete this tick are moved out of activeSeries and
 * returned as a list so the caller can process them.
 *
 * Returns:
 *   {
 *     playedCount: N,       // how many maps were played this call
 *     completed: [entry...] // entries whose series just finished
 *   }
 *
 * Map results for any given series are appended to series.maps inside
 * the entry. Callers can show them in the UI until the series drains.
 */
export function advanceOneMap(gameState) {
  if (isMapPlayBlocked(gameState)) return { playedCount: 0, completed: [] };

  const list = ensureActiveSeries(gameState);
  const completed = [];
  const remaining = [];
  let playedCount = 0;

  for (const entry of list) {
    if (isSeriesComplete(entry.series)) {
      // Shouldn't happen normally (completed series drain in prior tick),
      // but defensive: if somehow a complete series sits in the list,
      // move it to completed without playing another map.
      completed.push(entry);
      continue;
    }

    simulateNextMap(entry.series);
    playedCount++;

    if (isSeriesComplete(entry.series)) {
      completed.push(entry);
    } else {
      remaining.push(entry);
    }
  }

  gameState.season.activeSeries = remaining;
  return { playedCount, completed };
}

/**
 * Scoped variant: only advance series matching the predicate. Used by
 * per-phase fast-forward (e.g. "finish the current bracket stage but
 * leave other regions' group games alone"). Returns same shape as
 * advanceOneMap.
 *
 * Doesn't currently reorder the array; active series not matching the
 * filter pass through untouched.
 */
export function advanceOneMapScoped(gameState, predicate) {
  if (isMapPlayBlocked(gameState)) return { playedCount: 0, completed: [] };

  const list = ensureActiveSeries(gameState);
  const completed = [];
  const remaining = [];
  let playedCount = 0;

  for (const entry of list) {
    if (!predicate(entry)) {
      remaining.push(entry);
      continue;
    }
    if (isSeriesComplete(entry.series)) {
      completed.push(entry);
      continue;
    }
    simulateNextMap(entry.series);
    playedCount++;
    if (isSeriesComplete(entry.series)) completed.push(entry);
    else remaining.push(entry);
  }

  gameState.season.activeSeries = remaining;
  return { playedCount, completed };
}

/**
 * Remove all complete series from the active list and return them.
 * Called by advance handlers that want to drain completions explicitly
 * without playing new maps (used during fast-forward flows).
 */
export function drainCompleted(gameState) {
  const list = ensureActiveSeries(gameState);
  const completed = [];
  const remaining = [];
  for (const entry of list) {
    if (isSeriesComplete(entry.series)) completed.push(entry);
    else remaining.push(entry);
  }
  gameState.season.activeSeries = remaining;
  return completed;
}

/**
 * Empty the active list without processing. Used when a season resets
 * or the user bails out of a phase via offseason/save delete. Normal
 * gameplay should never need this — advance handlers drain completed
 * series as they go.
 */
export function clearActiveSeries(gameState) {
  gameState.season.activeSeries = [];
}

/**
 * UI helper: given a match object (from a region.schedule, bracket, swiss
 * round, etc.), find the corresponding in-flight active series entry if
 * one exists. Returns the active series entry (with .series inside) or
 * null. Used by MatchCard to render running scores + per-map breakdowns
 * for series that haven't finished yet.
 *
 * Match identity is by reference. All advance handlers that seed series
 * also store a matchRef on each entry pointing at the original match
 * object, so `entry.matchRef === match` is the canonical lookup.
 */
export function findActiveSeriesForMatch(gameState, match) {
  if (!match) return null;
  const list = gameState?.season?.activeSeries || [];
  for (const entry of list) {
    if (entry.matchRef === match) return entry;
  }
  return null;
}
