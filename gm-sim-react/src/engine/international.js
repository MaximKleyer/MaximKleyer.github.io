/**
 * international.js — International tournament orchestrator.
 *
 * Runs the full international flow for one international slot:
 *   1. Qualification — top 3 per region from most recent stage:
 *        1st place → auto-bid straight to 8-team playoff bracket
 *        2nd, 3rd  → 8-team Swiss
 *   2. Swiss — 3 rounds, 4 teams advance
 *   3. Selection show — each auto-bid picks a Swiss survivor as R1 opponent
 *        Random pick order. Phase 3a = all picks automated (weakest-opponent AI).
 *        Phase 3b will make the human-picker interactive.
 *   4. Bracket — 8-team no-byes double-elim (bracketInternational.js)
 *   5. Complete — results computed, handed back to season.js for points + history
 *
 * State lives on gameState.international while active. Cleared when the
 * international is fully snapshotted to history by season.js.
 */

import { REGION_KEYS } from '../data/regions.js';
import {
  initSwiss,
  advanceSwissRound,
  getSwissSurvivors,
  getSwissEliminated,
} from './swiss.js';
import {
  initInternationalBracket,
  advanceInternationalBracket,
  isInternationalBracketComplete,
  computeInternationalBracketPlacements,
} from './bracketInternational.js';

/* ─────────────── Init ─────────────── */

/**
 * Build the international state from the most recent stage's results.
 * Called by season.js when the circuit advances into an international slot.
 */
export function initInternational(gameState, internationalNumber) {
  const stageEntry = [...gameState.season.history].reverse().find(
    e => e.type === 'stage' && !e.placeholder
  );

  // Phase 6e+ Ask 3 hardening: previously this threw if there was no
  // prior stage history, which left season.status stuck on 'transition'
  // and grayed the UI permanently. Now we log + return a minimally-valid
  // empty international object. The user still loses some pointable
  // outcomes but the app stays usable. The 'await stage history' state
  // implies a sim/state-machine bug elsewhere worth surfacing in console.
  if (!stageEntry) {
    console.warn('[initInternational] No prior stage history found. Returning empty tournament.');
    return {
      number: internationalNumber,
      name: `International ${internationalNumber}`,
      phase: 'complete', // skip directly — no teams to play
      autoBids: [],
      swissTeams: [],
      swiss: initSwiss([]),
      selectionShow: null,
      bracket: null,
    };
  }

  const autoBids = [];   // [{ team, region }]
  const swissTeams = []; // [{ team, region }]

  for (const regionKey of REGION_KEYS) {
    const placements = stageEntry.pointsAwarded?.[regionKey];
    if (!placements || placements.length === 0) continue;

    const region = gameState.regions[regionKey];
    if (!region) continue;
    const findTeam = (abbr) => region.teams.find(t => t.abbr === abbr);

    // Sort by placement ascending (1st place first)
    const sorted = [...placements].sort((a, b) => a.placement - b.placement);

    // 1st → auto-bid, 2nd/3rd → Swiss
    if (sorted[0]) {
      const t = findTeam(sorted[0].abbr);
      if (t) autoBids.push({ team: t, region: regionKey });
    }
    if (sorted[1]) {
      const t = findTeam(sorted[1].abbr);
      if (t) swissTeams.push({ team: t, region: regionKey });
    }
    if (sorted[2]) {
      const t = findTeam(sorted[2].abbr);
      if (t) swissTeams.push({ team: t, region: regionKey });
    }
  }

  // Reset records for everyone in the international — they're starting fresh
  // for their international record display (win/loss in this tournament only).
  for (const { team } of [...autoBids, ...swissTeams]) {
    if (!team || !team.record) continue;
    team.record.wins = 0;
    team.record.losses = 0;
    team.record.mapWins = 0;
    team.record.mapLosses = 0;
    team.record.roundWins = 0;
    team.record.roundLosses = 0;
  }

  return {
    number: internationalNumber,
    name: `International ${internationalNumber}`,
    phase: 'swiss', // 'swiss' | 'bracket' | 'complete'
    autoBids,
    swissTeams,
    swiss: initSwiss(swissTeams.map(x => x.team)),
    selectionShow: null,
    bracket: null,
  };
}

/* ─────────────── Advance ─────────────── */

/**
 * Advance the international by one tick. Called from App.jsx advance button
 * when the current slot is international.
 *
 * Phase transitions:
 *   swiss     → selection (once Swiss completes, pick order is rolled)
 *   selection → bracket   (after all 4 picks are made)
 *   bracket   → complete  (once grand final resolves)
 *
 * During 'selection', each advance tick reveals one AI pick. If the current
 * picker is the human, the tick is a no-op — App.jsx should hide/disable the
 * advance button and wait for submitHumanPick() instead.
 */
export function advanceInternational(gameState) {
  const intl = gameState.international;
  if (!intl || intl.phase === 'complete') return;

  if (intl.phase === 'swiss') {
    intl.swiss = advanceSwissRound(intl.swiss);
    if (intl.swiss.status === 'complete') {
      beginSelectionShow(intl, gameState);
    }
    return;
  }

  if (intl.phase === 'selection') {
    // If waiting on the human, the advance button does nothing.
    if (intl.selectionShow.awaitingHuman) return;
    revealNextPick(intl);
    return;
  }

  if (intl.phase === 'bracket') {
    intl.bracket = advanceInternationalBracket(intl.bracket);
    if (isInternationalBracketComplete(intl.bracket)) {
      intl.phase = 'complete';
    }
    return;
  }
}

export function isInternationalComplete(gameState) {
  return gameState.international?.phase === 'complete';
}

/**
 * True when the selection show is waiting for the human to make a pick.
 * App.jsx uses this to disable the advance button and show the pick UI.
 */
export function isAwaitingHumanPick(gameState) {
  const intl = gameState.international;
  return intl?.phase === 'selection' && intl.selectionShow?.awaitingHuman === true;
}

/**
 * Commit a human pick. Called from the International component when the
 * user clicks a Swiss survivor card during their pick turn.
 * No-op if we're not waiting on the human or the picked team isn't available.
 */
export function submitHumanPick(gameState, pickedTeam) {
  const intl = gameState.international;
  if (!intl || intl.phase !== 'selection') return;
  const show = intl.selectionShow;
  if (!show?.awaitingHuman) return;

  const currentBid = show.pickOrder[show.currentPickIndex];
  if (!currentBid) return;

  // Validate that the picked team is still available
  const available = getAvailableSwissSurvivors(intl);
  if (!available.includes(pickedTeam)) return;

  commitPick(intl, currentBid, pickedTeam);
}

/* ─────────────── Selection show — interactive state machine ─────────────── */

/**
 * Initialize the selection show when Swiss completes.
 * Generates a random pick order and sets up empty state. Does not make any
 * picks — the first pick happens on the next advance tick (or via human input
 * if slot 1 belongs to the human).
 */
function beginSelectionShow(intl, gameState) {
  const pickOrder = [...intl.autoBids];
  for (let i = pickOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pickOrder[i], pickOrder[j]] = [pickOrder[j], pickOrder[i]];
  }

  intl.selectionShow = {
    pickOrder: pickOrder.map(b => ({ team: b.team, region: b.region })),
    picks: [],
    currentPickIndex: 0,
    awaitingHuman: false,
  };

  intl.phase = 'selection';

  // If pick slot 1 is the human, flag it so the UI waits for input
  syncAwaitingHuman(intl, gameState);
}

/**
 * Reveal the next pick in the sequence (used for AI picks and non-human
 * spectator reveals). Picks the weakest-rated remaining survivor.
 */
function revealNextPick(intl) {
  const show = intl.selectionShow;
  if (show.currentPickIndex >= show.pickOrder.length) return;

  const currentBid = show.pickOrder[show.currentPickIndex];
  const available = getAvailableSwissSurvivors(intl);

  // AI: pick weakest remaining opponent
  available.sort((a, b) => a.overallRating - b.overallRating);
  const picked = available[0];
  if (!picked) return;

  commitPick(intl, currentBid, picked);
}

/**
 * Core commit routine used by both the AI reveal and the human submit path.
 * Appends to picks[], advances currentPickIndex, and either transitions into
 * the bracket phase (if all picks are done) or re-evaluates awaitingHuman.
 */
function commitPick(intl, bid, pickedTeam) {
  const show = intl.selectionShow;

  show.picks.push({
    order: show.currentPickIndex + 1,
    picker: bid.team,
    pickerRegion: bid.region,
    picked: pickedTeam,
  });
  show.currentPickIndex++;
  show.awaitingHuman = false;

  // All picks done → init bracket and flip phase
  if (show.currentPickIndex >= show.pickOrder.length) {
    intl.bracket = initInternationalBracket(show.picks);
    intl.phase = 'bracket';
    return;
  }

  // Otherwise, check if the next picker is the human
  // We need gameState.humanRegion here — walked up via the intl's autoBids
  // which carry region keys. Find the human team in autoBids, if any.
  syncAwaitingHumanFromIntl(intl);
}

/**
 * Determine whether the *next* pick belongs to the human. Called after each
 * commit (and once at selection-show start). We don't have gameState in this
 * scope so we rely on team.isHuman — the Team class already tracks this.
 */
function syncAwaitingHumanFromIntl(intl) {
  const show = intl.selectionShow;
  const nextBid = show.pickOrder[show.currentPickIndex];
  if (!nextBid) {
    show.awaitingHuman = false;
    return;
  }
  show.awaitingHuman = !!nextBid.team.isHuman;
}

/**
 * Convenience wrapper used at selection-show start. Takes gameState for API
 * symmetry but currently delegates to the isHuman check above.
 */
function syncAwaitingHuman(intl, gameState) {
  syncAwaitingHumanFromIntl(intl);
}

/**
 * Get the list of Swiss survivors not yet picked by anyone.
 */
function getAvailableSwissSurvivors(intl) {
  const survivors = getSwissSurvivors(intl.swiss);
  const picked = new Set(intl.selectionShow?.picks.map(p => p.picked) || []);
  return survivors.filter(t => !picked.has(t));
}

/**
 * Exposed helper so the International component can render the "available
 * teams to pick" grid during a human turn without reaching into internals.
 */
export function getSelectionShowAvailable(gameState) {
  const intl = gameState.international;
  if (!intl) return [];
  return getAvailableSwissSurvivors(intl);
}

/* ─────────────── Results ─────────────── */

/**
 * Compute full results for history/points awarding. Called after the
 * bracket completes. Returns an object with:
 *   bracketPlacements: [{ team, placement }] for teams 1–8
 *   swissEliminated: teams that lost in Swiss (get 0 pts, tied at 9th)
 */
export function computeInternationalResults(intl) {
  const bracketPlacements = computeInternationalBracketPlacements(intl.bracket);
  const swissEliminated = getSwissEliminated(intl.swiss);
  return {
    bracketPlacements,
    swissEliminated,
  };
}
