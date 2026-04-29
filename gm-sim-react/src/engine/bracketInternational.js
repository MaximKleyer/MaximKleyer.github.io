/**
 * bracketInternational.js — 8-team no-byes double-elimination bracket.
 *
 * Used for international tournaments and (eventually) Worlds playoffs.
 * Differs from engine/bracket.js which assumes 2 groups of 6 with some
 * bye-advantaged seeding; this one is a flat 8-team bracket where all
 * matches in UB R1 are played from the start.
 *
 * Bracket structure:
 *   UB: R1 (8→4) → SF (4→2) → Final (2→1)
 *   LB: R1 (UB R1 losers, 4→2)
 *       R2 (LB R1 winners × UB SF losers, crossed, 4→2)
 *       R3 (LB R2 winners, 2→1)
 *       LB Final (LB R3 winner vs UB Final loser) — BO5
 *   Grand Final — BO5
 *
 * Stage progression (same pattern as engine/bracket.js — one click per step):
 *   1 → play UB R1                 → stage 2
 *   2 → play UB SF + LB R1         → stage 3   (LB R1 losers eliminated)
 *   3 → play UB Final + LB R2      → stage 4   (LB R2 losers eliminated)
 *   4 → play LB R3                 → stage 5   (LB R3 loser eliminated)
 *   5 → play LB Final (BO5)        → stage 6   (LB Final loser eliminated)
 *   6 → play Grand Final (BO5)     → stage 7   (GF loser eliminated, champion crowned)
 *
 * Placement order (for international points):
 *   eliminated[0], [1] — LB R1 losers  → 7th, 8th
 *   eliminated[2], [3] — LB R2 losers  → 5th, 6th
 *   eliminated[4]      — LB R3 loser   → 4th
 *   eliminated[5]      — LB Final loser → 3rd
 *   eliminated[6]      — GF loser       → 2nd
 *   grandFinal.winner  — Champion       → 1st
 */

import { simulateSeries } from '../classes/Match.js';

export const INTL_BRACKET_COMPLETE_STAGE = 7;

function createMatch(teamA = null, teamB = null) {
  return { teamA, teamB, result: null };
}

function playMatch(match, bestOf = 3) {
  if (!match.teamA || !match.teamB || match.result) return;
  match.result = simulateSeries(match.teamA, match.teamB, bestOf);
  processMatchResult(match.result);
}

function processMatchResult(result) {
  if (!result) return;
  const { winner, loser, maps, score } = result;
  winner.record.wins++;
  loser.record.losses++;

  const wm = Math.max(score[0], score[1]);
  const lm = Math.min(score[0], score[1]);
  winner.record.mapWins += wm;
  winner.record.mapLosses += lm;
  loser.record.mapWins += lm;
  loser.record.mapLosses += wm;

  for (const map of maps) {
    const teamAIsWinner = (result.teamA === winner);
    if (teamAIsWinner) {
      winner.record.roundWins += map.roundsA;
      winner.record.roundLosses += map.roundsB;
      loser.record.roundWins += map.roundsB;
      loser.record.roundLosses += map.roundsA;
    } else {
      winner.record.roundWins += map.roundsB;
      winner.record.roundLosses += map.roundsA;
      loser.record.roundWins += map.roundsA;
      loser.record.roundLosses += map.roundsB;
    }
  }
}

/**
 * Initialize the bracket from selection-show pairings.
 * `selectionPicks` is an array of 4 { picker, picked } objects — UB R1
 * matches are created in pick order.
 */
export function initInternationalBracket(selectionPicks) {
  const ubR1 = selectionPicks.map(pick =>
    createMatch(pick.picker, pick.picked)
  );

  return {
    stage: 1,
    ubR1,
    ubSF: [createMatch(), createMatch()],
    ubFinal: createMatch(),
    lbR1: [createMatch(), createMatch()],
    lbR2: [createMatch(), createMatch()],
    lbR3: createMatch(),
    lbFinal: createMatch(),
    grandFinal: createMatch(),
    eliminated: [],
  };
}

/**
 * Per-map advance support. Returns the matches that should be played at
 * the current stage. Used by App.jsx to seed active series. Pure read —
 * doesn't play or mutate.
 */
export function getStageMatches(bracket) {
  switch (bracket.stage) {
    case 1: return bracket.ubR1.map(m => ({ match: m, bestOf: 3 }));
    case 2: return [
      ...bracket.ubSF.map(m => ({ match: m, bestOf: 3 })),
      ...bracket.lbR1.map(m => ({ match: m, bestOf: 3 })),
    ];
    case 3: return [
      { match: bracket.ubFinal, bestOf: 3 },
      ...bracket.lbR2.map(m => ({ match: m, bestOf: 3 })),
    ];
    case 4: return [{ match: bracket.lbR3, bestOf: 3 }];
    case 5: return [{ match: bracket.lbFinal, bestOf: 5 }];
    case 6: return [{ match: bracket.grandFinal, bestOf: 5 }];
    default: return [];
  }
}

/**
 * Mirror of advanceInternationalBracket but assumes match.result is
 * ALREADY set externally. Routes next-stage matchups + records
 * eliminations + bumps stage. Used by per-map advance flow.
 */
export function routeBracketStage(bracket) {
  const b = { ...bracket };
  switch (b.stage) {
    case 1: {
      b.ubSF[0].teamA = b.ubR1[0].result.winner;
      b.ubSF[0].teamB = b.ubR1[1].result.winner;
      b.ubSF[1].teamA = b.ubR1[2].result.winner;
      b.ubSF[1].teamB = b.ubR1[3].result.winner;
      b.lbR1[0].teamA = b.ubR1[0].result.loser;
      b.lbR1[0].teamB = b.ubR1[1].result.loser;
      b.lbR1[1].teamA = b.ubR1[2].result.loser;
      b.lbR1[1].teamB = b.ubR1[3].result.loser;
      b.stage = 2;
      break;
    }
    case 2: {
      b.ubFinal.teamA = b.ubSF[0].result.winner;
      b.ubFinal.teamB = b.ubSF[1].result.winner;
      b.lbR2[0].teamA = b.lbR1[0].result.winner;
      b.lbR2[0].teamB = b.ubSF[1].result.loser;
      b.lbR2[1].teamA = b.lbR1[1].result.winner;
      b.lbR2[1].teamB = b.ubSF[0].result.loser;
      b.eliminated = [...b.eliminated, b.lbR1[0].result.loser, b.lbR1[1].result.loser];
      b.stage = 3;
      break;
    }
    case 3: {
      b.lbR3.teamA = b.lbR2[0].result.winner;
      b.lbR3.teamB = b.lbR2[1].result.winner;
      b.eliminated = [...b.eliminated, b.lbR2[0].result.loser, b.lbR2[1].result.loser];
      b.stage = 4;
      break;
    }
    case 4: {
      b.lbFinal.teamA = b.lbR3.result.winner;
      b.lbFinal.teamB = b.ubFinal.result.loser;
      b.eliminated = [...b.eliminated, b.lbR3.result.loser];
      b.stage = 5;
      break;
    }
    case 5: {
      b.grandFinal.teamA = b.ubFinal.result.winner;
      b.grandFinal.teamB = b.lbFinal.result.winner;
      b.eliminated = [...b.eliminated, b.lbFinal.result.loser];
      b.stage = 6;
      break;
    }
    case 6: {
      b.eliminated = [...b.eliminated, b.grandFinal.result.loser];
      b.stage = 7;
      break;
    }
  }
  return b;
}

export function advanceInternationalBracket(bracket) {
  const b = { ...bracket };

  switch (b.stage) {
    case 1: {
      // UB R1
      for (const m of b.ubR1) playMatch(m);
      // Winners → UB SF (pair 0-1 and 2-3)
      b.ubSF[0].teamA = b.ubR1[0].result.winner;
      b.ubSF[0].teamB = b.ubR1[1].result.winner;
      b.ubSF[1].teamA = b.ubR1[2].result.winner;
      b.ubSF[1].teamB = b.ubR1[3].result.winner;
      // Losers → LB R1 (pair 0-1 and 2-3)
      b.lbR1[0].teamA = b.ubR1[0].result.loser;
      b.lbR1[0].teamB = b.ubR1[1].result.loser;
      b.lbR1[1].teamA = b.ubR1[2].result.loser;
      b.lbR1[1].teamB = b.ubR1[3].result.loser;
      b.stage = 2;
      break;
    }
    case 2: {
      // UB SF + LB R1
      for (const m of b.ubSF) playMatch(m);
      for (const m of b.lbR1) playMatch(m);
      b.ubFinal.teamA = b.ubSF[0].result.winner;
      b.ubFinal.teamB = b.ubSF[1].result.winner;
      // LB R2: cross LB R1 winners with UB SF losers from the opposite side
      b.lbR2[0].teamA = b.lbR1[0].result.winner;
      b.lbR2[0].teamB = b.ubSF[1].result.loser;
      b.lbR2[1].teamA = b.lbR1[1].result.winner;
      b.lbR2[1].teamB = b.ubSF[0].result.loser;
      b.eliminated = [...b.eliminated, b.lbR1[0].result.loser, b.lbR1[1].result.loser];
      b.stage = 3;
      break;
    }
    case 3: {
      // UB Final + LB R2
      playMatch(b.ubFinal);
      for (const m of b.lbR2) playMatch(m);
      b.lbR3.teamA = b.lbR2[0].result.winner;
      b.lbR3.teamB = b.lbR2[1].result.winner;
      b.eliminated = [...b.eliminated, b.lbR2[0].result.loser, b.lbR2[1].result.loser];
      b.stage = 4;
      break;
    }
    case 4: {
      // LB R3
      playMatch(b.lbR3);
      b.lbFinal.teamA = b.lbR3.result.winner;
      b.lbFinal.teamB = b.ubFinal.result.loser;
      b.eliminated = [...b.eliminated, b.lbR3.result.loser];
      b.stage = 5;
      break;
    }
    case 5: {
      // LB Final — BO5
      playMatch(b.lbFinal, 5);
      b.grandFinal.teamA = b.ubFinal.result.winner;
      b.grandFinal.teamB = b.lbFinal.result.winner;
      b.eliminated = [...b.eliminated, b.lbFinal.result.loser];
      b.stage = 6;
      break;
    }
    case 6: {
      // Grand Final — BO5
      playMatch(b.grandFinal, 5);
      b.eliminated = [...b.eliminated, b.grandFinal.result.loser];
      b.stage = 7;
      break;
    }
  }
  return b;
}

export function isInternationalBracketComplete(bracket) {
  return bracket && bracket.stage >= INTL_BRACKET_COMPLETE_STAGE;
}

export function getInternationalBracketStageName(stage) {
  return {
    1: 'Upper Bracket Round 1',
    2: 'UB Semifinals + LB Round 1',
    3: 'UB Final + LB Round 2',
    4: 'LB Round 3',
    5: 'LB Final',
    6: 'Grand Final',
    7: 'Tournament Complete',
  }[stage] || '';
}

export function getInternationalChampion(bracket) {
  if (!isInternationalBracketComplete(bracket)) return null;
  return bracket.grandFinal?.result?.winner || null;
}

const ELIM_INDEX_TO_PLACEMENT = [7, 8, 5, 6, 4, 3, 2];

/**
 * Compute final 1–8 placements for bracket teams (for international points).
 * Teams not yet finalized are not included — this should be called only
 * after the bracket completes.
 */
export function computeInternationalBracketPlacements(bracket) {
  const out = [];
  const champion = bracket.grandFinal?.result?.winner;
  if (champion) out.push({ team: champion, placement: 1 });

  const elim = bracket.eliminated || [];
  for (let i = 0; i < elim.length; i++) {
    const team = elim[i];
    if (!team || team === champion) continue;
    const placement = ELIM_INDEX_TO_PLACEMENT[i];
    if (placement != null) {
      out.push({ team, placement });
    }
  }
  return out;
}
