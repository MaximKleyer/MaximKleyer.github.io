/**
 * swiss.js — Swiss tournament engine.
 *
 * Standard VCT-style Swiss:
 *   - 8 teams (or 4, for Worlds groups later), BO3 matches
 *   - 3 rounds max
 *   - Round 1: random pairings
 *   - Round 2: winners pair with winners, losers pair with losers
 *   - Round 3: only 1-1 teams play; 2-0 teams advance, 0-2 teams eliminated
 *   - "No rematches" constraint applies to R2 and R3 pairings
 *   - A team that reaches 2 wins advances (doesn't play more rounds)
 *   - A team that reaches 2 losses is eliminated
 *   - After all rounds, exactly 4 teams advance (2 via 2-0, 2 via 2-1)
 *
 * Note on R2 rematches: impossible by construction — R1 winners only ever
 * played R1 losers, so pairing two R1 winners cannot be a rematch. R3 is
 * where rematches can occur, since a 1-1 team from the "top loser" side
 * may have beaten a 1-1 team from the "bottom winner" side back in R1.
 */

import { simulateSeries } from '../classes/Match.js';

function createMatch(teamA = null, teamB = null) {
  return { teamA, teamB, result: null };
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Initialize a Swiss state for the given team list (must be even length).
 * Round 1 pairings are randomized.
 */
export function initSwiss(teams) {
  const shuffled = shuffle(teams);
  const round1 = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    round1.push(createMatch(shuffled[i], shuffled[i + 1]));
  }

  return {
    round: 1,
    maxRounds: 3,
    status: 'active', // 'active' | 'complete'
    // Team-level state used for standings + pairing
    teams: teams.map(t => ({
      team: t,
      wins: 0,
      losses: 0,
      advanced: false,
      eliminated: false,
      opponentAbbrs: [], // list of abbr strings the team has played
    })),
    matches: {
      round1,
      round2: [],
      round3: [],
    },
  };
}

/**
 * Per-map advance support (Phase 6e+ Ask 3 message 4).
 *
 * The original advanceSwissRound() plays the round atomically. For per-map
 * advance, App.jsx wants to enumerate the round's matches (seed them as
 * active series), play them map-by-map, then call routeSwissRound() to do
 * the post-play bookkeeping (update Swiss records, set up next round
 * pairings, mark Swiss complete if all rounds done).
 *
 * Both functions are pure of `simulateSeries` — they don't play matches
 * themselves. The caller is responsible for calling simulateNextMap() on
 * the seeded series and then injecting results back into match.result
 * before calling routeSwissRound().
 */

/**
 * Returns the list of matches that need PLAYING in the current round
 * (i.e., have both teams set + no result yet). Each entry is { match, bestOf }
 * for parity with the regional bracket helper.
 *
 * Used by App.jsx to enumerate what to seed as active series.
 */
export function getRoundMatches(swissState) {
  const round = swissState.round;
  const matches = swissState.matches[`round${round}`] || [];
  return matches
    .filter(m => !m.result && m.teamA && m.teamB)
    .map(m => ({ match: m, bestOf: 3 }));
}

/**
 * Post-play routing: assumes match.result has been set on each match in
 * the current round. Updates Swiss team records, marks advanced/eliminated,
 * generates next-round pairings (or marks the Swiss complete).
 *
 * Mutates swissState in place AND returns it for chaining symmetry with
 * the existing advanceSwissRound API.
 */
export function routeSwissRound(swissState) {
  const current = swissState.round;
  const matches = swissState.matches[`round${current}`];

  // Update records for any played matches we haven't yet processed.
  // (Simplest approach: re-process them all idempotently. updateSwissRecord
  // currently appends to opponentAbbrs unconditionally, which would corrupt
  // state if called twice — so we guard with a flag on each match.)
  for (const match of matches) {
    if (!match.result) continue;
    if (match._swissProcessed) continue;
    updateSwissRecord(swissState, match.result);
    match._swissProcessed = true;
  }

  if (current >= swissState.maxRounds) {
    swissState.status = 'complete';
    return swissState;
  }

  const nextRound = current + 1;
  const nextMatches = generateNextRoundPairings(swissState, nextRound);
  swissState.round = nextRound;
  swissState.matches[`round${nextRound}`] = nextMatches;

  if (nextMatches.length === 0) {
    swissState.status = 'complete';
  }

  return swissState;
}

/**
 * Play the current round and generate pairings for the next one.
 * Returns a new swiss state. Caller should replace `intl.swiss` with the result.
 */
export function advanceSwissRound(swissState) {
  const current = swissState.round;
  const matches = swissState.matches[`round${current}`];

  // Play all unplayed matches this round
  for (const match of matches) {
    if (!match.result && match.teamA && match.teamB) {
      const result = simulateSeries(match.teamA, match.teamB, 3);
      match.result = result;
      updateSwissRecord(swissState, result);
      match._swissProcessed = true;
    }
  }

  // Done with last round?
  if (current >= swissState.maxRounds) {
    swissState.status = 'complete';
    return swissState;
  }

  // Generate next round pairings
  const nextRound = current + 1;
  const nextMatches = generateNextRoundPairings(swissState, nextRound);
  swissState.round = nextRound;
  swissState.matches[`round${nextRound}`] = nextMatches;

  // If no matches to play next round (everyone resolved), Swiss is complete
  if (nextMatches.length === 0) {
    swissState.status = 'complete';
  }

  return swissState;
}

function updateSwissRecord(swissState, result) {
  const winner = swissState.teams.find(t => t.team === result.winner);
  const loser = swissState.teams.find(t => t.team === result.loser);
  if (!winner || !loser) return;

  winner.wins++;
  loser.losses++;
  winner.opponentAbbrs.push(loser.team.abbr);
  loser.opponentAbbrs.push(winner.team.abbr);

  if (winner.wins >= 2) winner.advanced = true;
  if (loser.losses >= 2) loser.eliminated = true;
}

/**
 * Build pairings for R2 or R3, respecting:
 *   - Teams in the same W-L group play each other
 *   - No rematches where avoidable
 *   - Teams already advanced/eliminated don't play
 */
function generateNextRoundPairings(swissState, round) {
  const active = swissState.teams.filter(t => !t.advanced && !t.eliminated);

  // Group teams by W-L record
  const groups = {};
  for (const entry of active) {
    const key = `${entry.wins}-${entry.losses}`;
    (groups[key] = groups[key] || []).push(entry);
  }

  const matches = [];
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const paired = pairGroupAvoidingRematches(group);
    for (const [a, b] of paired) {
      matches.push(createMatch(a.team, b.team));
    }
  }

  return matches;
}

/**
 * Pair up an even-sized group of teams, avoiding rematches when possible.
 * For small group sizes (2 or 4) we can brute-force; larger uses a greedy
 * fallback. In 8-team 3-round Swiss the max group size here is 4 (R3 1-1s),
 * so brute force is fine.
 */
function pairGroupAvoidingRematches(group) {
  const n = group.length;
  if (n === 0) return [];
  if (n === 2) return [[group[0], group[1]]];

  if (n === 4) {
    const pairings = [
      [[group[0], group[1]], [group[2], group[3]]],
      [[group[0], group[2]], [group[1], group[3]]],
      [[group[0], group[3]], [group[1], group[2]]],
    ];
    // Shuffle the order we try them so the choice isn't deterministic
    const shuffled = shuffle(pairings);
    for (const p of shuffled) {
      if (isValidPairing(p)) return p;
    }
    // No valid pairing — fall back to first (rare: all teams have rematch conflicts)
    return shuffled[0];
  }

  // Greedy fallback for larger groups
  const remaining = [...group];
  const out = [];
  while (remaining.length >= 2) {
    const a = remaining.shift();
    let partnerIdx = remaining.findIndex(b => !a.opponentAbbrs.includes(b.team.abbr));
    if (partnerIdx === -1) partnerIdx = 0; // accept rematch as last resort
    const b = remaining.splice(partnerIdx, 1)[0];
    out.push([a, b]);
  }
  return out;
}

function isValidPairing(pairing) {
  for (const [a, b] of pairing) {
    if (a.opponentAbbrs.includes(b.team.abbr)) return false;
  }
  return true;
}

/**
 * Returns the teams (Team objects, not entries) that advanced out of Swiss.
 * Should be exactly 4 teams for an 8-team 3-round Swiss.
 */
export function getSwissSurvivors(swissState) {
  return swissState.teams.filter(e => e.advanced).map(e => e.team);
}

/**
 * Returns the teams that were eliminated in Swiss (didn't advance to bracket).
 */
export function getSwissEliminated(swissState) {
  return swissState.teams.filter(e => e.eliminated).map(e => e.team);
}

/**
 * Convenience: get a team's current Swiss record as a string.
 */
export function getSwissRecord(swissState, team) {
  const entry = swissState.teams.find(e => e.team === team);
  if (!entry) return '0-0';
  return `${entry.wins}-${entry.losses}`;
}
