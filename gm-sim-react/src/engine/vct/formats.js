/**
 * formats.js — the VCT 2027 tournament formats.
 *
 * Three shapes cover the whole season:
 *
 *   OPEN QUALIFIER  — 32 clubs, single-elim Bo3, rounds played until
 *                     `slots` teams remain standing. Those teams
 *                     qualify to the region's next main event.
 *
 *   REGIONAL EVENT  — Kickoff and both Cups: 16 teams (8 partners +
 *                     8 qualified opens), Swiss to 8 (first to 4 wins,
 *                     out at 4 losses), then the shared double-elim
 *                     bracket. Same machinery as a tier-2 stage, which
 *                     is exactly the plumbing it reuses. Champions uses
 *                     this shape too, at global scale.
 *
 *   MASTERS         — 8 teams (top 2 per region from the preceding
 *                     regional event), straight double-elim.
 *
 * The double-elim bracket's eliminated[] ordering is a documented
 * contract (see bracketInternational.js): [0-1]=7th-8th, [2-3]=5th-6th,
 * [4]=4th, [5]=3rd, [6]=2nd — so placements here are exact, not
 * inferred.
 *
 * Stored results are SLIMMED: per-map player detail is stripped the
 * same way tier-2 strips it, because a season of eleven qualifiers and
 * nine events would otherwise sink the save. Team references stay live
 * (the serializer turns them into __ref markers).
 */

import { simulateSeries } from '../../classes/Match.js';
import {
  initSwissStage, buildNextRound, pushRound, recordResult,
  isSwissComplete, finalizeSwiss, getQualifiedSeeds, getEliminatedTeams,
} from '../swissFormat.js';
import {
  advanceInternationalBracket, isInternationalBracketComplete, getInternationalChampion,
} from '../bracketInternational.js';
import { initTier2Bracket } from '../tier2.js';

/* ─────────────── Shared helpers ─────────────── */

/**
 * Drop per-map player detail from every match result in a bracket.
 * Matches involving `keepTeam` (the human) keep their detail — that is
 * what the match report renders later.
 */
export function stripEventDetail(bracket, keepTeam = null) {
  if (!bracket) return;
  for (const value of Object.values(bracket)) {
    const matches = Array.isArray(value) ? value : [value];
    for (const m of matches) {
      if (keepTeam && (m?.teamA === keepTeam || m?.teamB === keepTeam)) continue;
      for (const map of m?.result?.maps || []) { delete map.playerStats; delete map.roundLog; }
    }
  }
}

function slimSeries(a, b, result) {
  return {
    a, b,
    winner: result.winner,
    score: [...result.score],
  };
}

/** Exact placements from a completed 8-team double-elim. */
export function bracketPlacements(bracket) {
  const champion = getInternationalChampion(bracket) || null;
  const e = bracket?.eliminated || [];
  return {
    champion,
    runnerUp: e[6] || null,
    third: e[5] || null,
    fourth: e[4] || null,
    fifthSixth: [e[2], e[3]].filter(Boolean),
    seventhEighth: [e[0], e[1]].filter(Boolean),
  };
}

/* ─────────────── Open qualifier ─────────────── */

/**
 * Run one sub-region's open qualifier to completion: single-elim Bo3
 * from `teams.length` down to `slots` survivors. Seeded by rating with
 * fold pairing (1vN, 2vN-1 …) so the strongest clubs meet late.
 */
export function runOpenQualifier(teams, slots) {
  let alive = [...teams].sort((a, b) => b.overallRating - a.overallRating);
  const rounds = [];

  while (alive.length > slots) {
    const matches = [];
    const next = [];
    for (let i = 0; i < alive.length / 2; i++) {
      const a = alive[i];
      const b = alive[alive.length - 1 - i];
      const result = simulateSeries(a, b, 3);
      // Qualifier detail is never rendered map-by-map — keep the line
      // score, drop the rest.
      matches.push(slimSeries(a, b, result));
      next.push(result.winner);
    }
    rounds.push(matches);
    // Winners re-seed by rating so the field folds cleanly again.
    alive = next.sort((a, b) => b.overallRating - a.overallRating);
  }

  return { rounds, qualified: alive };
}

/* ─────────────── Regional event (Kickoff / Cup / Champions) ─────────────── */

/**
 * A 16-team event: Swiss to 8, double-elim bracket. Returns the swiss
 * state, the finished bracket, and exact placements. `bestOf` covers
 * the Swiss; the bracket applies its own Bo3/Bo5 placement.
 */
export function runSixteenTeamEvent(field, { bestOf = 3 } = {}) {
  const seeded = [...field].sort((a, b) => b.overallRating - a.overallRating);
  const swiss = initSwissStage(seeded, {
    winsToQualify: 4, lossesToEliminate: 4, maxRounds: 7, bestOf,
  });

  let guard = 0;
  while (!isSwissComplete(swiss) && guard++ < 20) {
    const matches = buildNextRound(swiss);
    if (matches.length === 0) break;
    pushRound(swiss, matches);
    for (const m of matches) {
      const a = swiss.entries[m.aId], b = swiss.entries[m.bId];
      const result = simulateSeries(a.team, b.team, swiss.config.bestOf);
      const aWon = result.winner === a.team;
      recordResult(swiss, m, {
        winnerId: aWon ? a.id : b.id,
        mapsA: result.score[0],
        mapsB: result.score[1],
        roundsA: result.maps.reduce((s, mp) => s + mp.roundsA, 0),
        roundsB: result.maps.reduce((s, mp) => s + mp.roundsB, 0),
      });
    }
  }
  finalizeSwiss(swiss);

  const seeds = getQualifiedSeeds(swiss);
  let bracket = initTier2Bracket(seeds);
  let bguard = 0;
  while (bracket && !isInternationalBracketComplete(bracket) && bguard++ < 12) {
    bracket = advanceInternationalBracket(bracket);
  }
  stripEventDetail(bracket);

  return {
    swiss,
    bracket,
    seeds,
    swissEliminated: getEliminatedTeams(swiss),
    placements: bracketPlacements(bracket),
  };
}

/* ─────────────── Masters ─────────────── */

/**
 * An 8-team global event: straight double-elim, seeded by rating with
 * the standard 1v8 / 3v6 / 4v5 / 2v7 split.
 */
export function runMastersEvent(field) {
  const s = [...field].sort((a, b) => b.overallRating - a.overallRating);
  let bracket = initTier2Bracket(s);
  let guard = 0;
  while (bracket && !isInternationalBracketComplete(bracket) && guard++ < 12) {
    bracket = advanceInternationalBracket(bracket);
  }
  stripEventDetail(bracket);
  return {
    bracket,
    seeds: s,
    placements: bracketPlacements(bracket),
  };
}
