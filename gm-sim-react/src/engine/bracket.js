/**
 * bracket.js — Double elimination bracket engine.
 *
 * UPDATED: processMatchResult helper tracks round W/L
 * for bracket matches (same as group stage tracking in App.jsx).
 */

import { getGroupStandings } from './standings.js';
import { simulateSeries } from '../classes/Match.js';

function createMatch(teamA = null, teamB = null) {
  return { teamA, teamB, result: null };
}

/**
 * Process a bracket match result — updates series, map, and round records.
 */
function processMatchResult(result) {
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

/** Helper: simulate and process a match */
function playMatch(match, bestOf = 3) {
  match.result = simulateSeries(match.teamA, match.teamB, bestOf);
  processMatchResult(match.result);
}

/**
 * Get the list of matches that should be PLAYED in the current stage.
 * Returns an array of { match, bestOf } objects. Used by the per-map
 * advance flow to know what to seed as active series.
 *
 * Unlike advanceBracketStage(), this does NOT play anything — just
 * enumerates the work that needs doing this stage.
 */
export function getStageMatches(bracket) {
  switch (bracket.stage) {
    case 1: return bracket.ubQF.map(m => ({ match: m, bestOf: 3 }));
    case 2: return [
      ...bracket.lbR1.map(m => ({ match: m, bestOf: 3 })),
      ...bracket.ubSF.map(m => ({ match: m, bestOf: 3 })),
    ];
    case 3: return [
      ...bracket.lbQF.map(m => ({ match: m, bestOf: 3 })),
      { match: bracket.ubFinal, bestOf: 3 },
    ];
    case 4: return [{ match: bracket.lbSF, bestOf: 3 }];
    case 5: return [{ match: bracket.lbFinal, bestOf: 5 }];
    case 6: return [{ match: bracket.grandFinal, bestOf: 5 }];
    default: return [];
  }
}

/**
 * Mirror of advanceBracketStage but assumes match.result is ALREADY set
 * by external per-map play. Performs the seeding/routing of next-stage
 * matchups + records eliminations + bumps stage.
 *
 * Use this in the per-map advance flow:
 *   1. seed all matches from getStageMatches as active series
 *   2. play maps until isSeriesComplete(every series)
 *   3. drain — caller copies series.result into match.result + runs processSeriesResult
 *   4. call routeBracketStage to set up the next stage
 */
export function routeBracketStage(bracket) {
  const b = { ...bracket };
  switch (b.stage) {
    case 1: {
      b.ubSF[0].teamB = b.ubQF[0].result.winner;
      b.ubSF[1].teamB = b.ubQF[1].result.winner;
      b.lbR1[0].teamA = b.ubQF[0].result.loser;
      b.lbR1[1].teamA = b.ubQF[1].result.loser;
      b.stage = 2;
      break;
    }
    case 2: {
      b.ubFinal.teamA = b.ubSF[0].result.winner;
      b.ubFinal.teamB = b.ubSF[1].result.winner;
      b.lbQF[0].teamA = b.ubSF[1].result.loser;
      b.lbQF[0].teamB = b.lbR1[0].result.winner;
      b.lbQF[1].teamA = b.ubSF[0].result.loser;
      b.lbQF[1].teamB = b.lbR1[1].result.winner;
      b.eliminated = [...b.eliminated, b.lbR1[0].result.loser, b.lbR1[1].result.loser];
      b.stage = 3;
      break;
    }
    case 3: {
      b.lbSF.teamA = b.lbQF[0].result.winner;
      b.lbSF.teamB = b.lbQF[1].result.winner;
      b.eliminated = [...b.eliminated, b.lbQF[0].result.loser, b.lbQF[1].result.loser];
      b.stage = 4;
      break;
    }
    case 4: {
      b.lbFinal.teamA = b.ubFinal.result.loser;
      b.lbFinal.teamB = b.lbSF.result.winner;
      b.eliminated = [...b.eliminated, b.lbSF.result.loser];
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

export function generateBracket(teams) {
  const groupA = getGroupStandings(teams, 'A');
  const groupB = getGroupStandings(teams, 'B');
  const a1 = groupA[0], a2 = groupA[1], a3 = groupA[2], a4 = groupA[3];
  const b1 = groupB[0], b2 = groupB[1], b3 = groupB[2], b4 = groupB[3];

  return {
    stage: 1,
    ubQF: [createMatch(b2, a3), createMatch(a2, b3)],
    ubSF: [createMatch(a1, null), createMatch(b1, null)],
    ubFinal: createMatch(),
    lbR1: [createMatch(null, b4), createMatch(null, a4)],
    lbQF: [createMatch(), createMatch()],
    lbSF: createMatch(),
    lbFinal: createMatch(),
    grandFinal: createMatch(),
    eliminated: [],
  };
}

export function advanceBracketStage(bracket) {
  const b = { ...bracket };

  switch (b.stage) {
    case 1: {
      for (const m of b.ubQF) playMatch(m);
      b.ubSF[0].teamB = b.ubQF[0].result.winner;
      b.ubSF[1].teamB = b.ubQF[1].result.winner;
      b.lbR1[0].teamA = b.ubQF[0].result.loser;
      b.lbR1[1].teamA = b.ubQF[1].result.loser;
      b.stage = 2;
      break;
    }
    case 2: {
      for (const m of b.lbR1) playMatch(m);
      for (const m of b.ubSF) playMatch(m);
      b.ubFinal.teamA = b.ubSF[0].result.winner;
      b.ubFinal.teamB = b.ubSF[1].result.winner;
      b.lbQF[0].teamA = b.ubSF[1].result.loser;
      b.lbQF[0].teamB = b.lbR1[0].result.winner;
      b.lbQF[1].teamA = b.ubSF[0].result.loser;
      b.lbQF[1].teamB = b.lbR1[1].result.winner;
      b.eliminated = [...b.eliminated, b.lbR1[0].result.loser, b.lbR1[1].result.loser];
      b.stage = 3;
      break;
    }
    case 3: {
      for (const m of b.lbQF) playMatch(m);
      playMatch(b.ubFinal);
      b.lbSF.teamA = b.lbQF[0].result.winner;
      b.lbSF.teamB = b.lbQF[1].result.winner;
      b.eliminated = [...b.eliminated, b.lbQF[0].result.loser, b.lbQF[1].result.loser];
      b.stage = 4;
      break;
    }
    case 4: {
      playMatch(b.lbSF);
      b.lbFinal.teamA = b.ubFinal.result.loser;
      b.lbFinal.teamB = b.lbSF.result.winner;
      b.eliminated = [...b.eliminated, b.lbSF.result.loser];
      b.stage = 5;
      break;
    }
    case 5: {
      playMatch(b.lbFinal, 5);
      b.grandFinal.teamA = b.ubFinal.result.winner;
      b.grandFinal.teamB = b.lbFinal.result.winner;
      b.eliminated = [...b.eliminated, b.lbFinal.result.loser];
      b.stage = 6;
      break;
    }
    case 6: {
      playMatch(b.grandFinal, 5);
      b.eliminated = [...b.eliminated, b.grandFinal.result.loser];
      b.stage = 7;
      break;
    }
  }
  return b;
}

export function getStageName(stage) {
  return { 1:'UB Quarterfinals', 2:'UB Semifinals + LB Round 1', 3:'UB Final + LB Quarterfinals',
    4:'LB Semifinal', 5:'LB Final', 6:'Grand Final', 7:'Tournament Complete' }[stage] || '';
}

export function getChampion(bracket) {
  if (bracket.stage < 7 || !bracket.grandFinal.result) return null;
  return bracket.grandFinal.result.winner;
}
