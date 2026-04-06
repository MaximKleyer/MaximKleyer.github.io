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
  if (!stageEntry) {
    throw new Error('Cannot initialize international — no stage history found');
  }

  const autoBids = [];   // [{ team, region }]
  const swissTeams = []; // [{ team, region }]

  for (const regionKey of REGION_KEYS) {
    const placements = stageEntry.pointsAwarded?.[regionKey];
    if (!placements) continue;

    const region = gameState.regions[regionKey];
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
 */
export function advanceInternational(gameState) {
  const intl = gameState.international;
  if (!intl || intl.phase === 'complete') return;

  if (intl.phase === 'swiss') {
    intl.swiss = advanceSwissRound(intl.swiss);
    if (intl.swiss.status === 'complete') {
      // Auto-run selection show (Phase 3a — AI picks)
      intl.selectionShow = runAutoSelectionShow(intl.autoBids, intl.swiss);
      intl.bracket = initInternationalBracket(intl.selectionShow.picks);
      intl.phase = 'bracket';
    }
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

/* ─────────────── Selection show (auto-pick for Phase 3a) ─────────────── */

/**
 * AI selection show: randomize pick order, each auto-bid picks the weakest
 * remaining Swiss survivor (by overall rating). Phase 3b will replace this
 * with an interactive UI when the human is an auto-bid.
 */
function runAutoSelectionShow(autoBids, swissState) {
  const survivors = getSwissSurvivors(swissState);

  // Random pick order
  const pickOrder = [...autoBids];
  for (let i = pickOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pickOrder[i], pickOrder[j]] = [pickOrder[j], pickOrder[i]];
  }

  const available = [...survivors];
  const picks = [];
  for (let i = 0; i < pickOrder.length; i++) {
    const bid = pickOrder[i];
    // AI: pick weakest remaining opponent (lowest overall rating)
    available.sort((a, b) => a.overallRating - b.overallRating);
    const picked = available.shift();
    picks.push({
      order: i + 1,
      picker: bid.team,
      pickerRegion: bid.region,
      picked,
    });
  }

  return {
    pickOrder: pickOrder.map(b => ({ team: b.team, region: b.region })),
    picks,
  };
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
