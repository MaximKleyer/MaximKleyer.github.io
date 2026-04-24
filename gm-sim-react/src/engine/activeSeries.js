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
    const entry = {
      seriesId: s.seriesId,
      phase: s.phase,
      regionKey: s.regionKey,
      week: s.week,
      scheduleIdx: s.scheduleIdx,
      bracketRef: s.bracketRef, // opaque — brackets use this to find themselves
      intlRef: s.intlRef,       // same for international
      worldsRef: s.worldsRef,   // same for worlds
      series: startSeries(s.teamA, s.teamB, s.bestOf || 3, s.origin),
    };
    list.push(entry);
    seeded.push(entry);
  }
  return seeded;
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
