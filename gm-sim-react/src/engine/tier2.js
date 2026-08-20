/**
 * tier2.js — tier-2 league generation.
 *
 * Sixteen teams per region, sitting below the franchised tier-1 league.
 *
 * ── Quality ──
 * Tier 2 is weaker, but not uniformly: a flat downshift would make every
 * team interchangeable and give no reason to look at any of them. Instead
 * each org gets a STRENGTH BAND, so the scene spans "nearly tier-1 ready"
 * down to "genuinely bad", and a minority of teams carry one STANDOUT
 * whose rating would not look out of place in tier 1. Those standouts are
 * the players worth poaching, which is the whole point of the scene.
 *
 * ── Age ──
 * Skewed young — tier 2 is where prospects sit — but not exclusively.
 * A tier-2 roster mixes teenagers on the way up with a few older players
 * who never made the jump, which reads more like a real second division
 * than an under-21 side.
 *
 * Academy teams (a tier-1 org's second string) are slightly stronger and
 * younger than independents on average: they get the parent org's
 * infrastructure and first pick of prospects.
 */

import { Team } from '../classes/Team.js';
import { generatePlayer } from '../classes/Player.js';
import { getTier2TeamDefs, TIER2_TEAM_COUNT } from '../data/tier2Teams.js';
import { generateMapRatings } from '../data/maps.js';
import { calculateBaseSalary, adjustMorale } from '../data/salary.js';
import { expectedAcs } from './poaching.js';
import { simulateSeries } from '../classes/Match.js';
import {
  initSwissStage, buildNextRound, pushRound, recordResult,
  isSwissComplete, finalizeSwiss, getQualifiedSeeds,
} from './swissFormat.js';
import {
  initInternationalBracket, advanceInternationalBracket,
  isInternationalBracketComplete, getInternationalChampion,
} from './bracketInternational.js';

export const TIER2_ROSTER_SIZE = 5;

/**
 * Strength bands. `weight` is how many of the 16 teams land in each band;
 * floor/ceiling bound player ratings. Tier 1 generates on 45-99, so even
 * the strongest tier-2 band tops out below a good tier-1 starter.
 */
const STRENGTH_BANDS = [
  { key: 'contender',  weight: 3, floor: 48, ceiling: 78 },
  { key: 'solid',      weight: 5, floor: 42, ceiling: 71 },
  { key: 'mid',        weight: 5, floor: 38, ceiling: 65 },
  { key: 'struggling', weight: 3, floor: 35, ceiling: 58 },
];

// Chance a team carries one clearly-better player.
const STANDOUT_CHANCE = 0.35;
const STANDOUT_FLOOR = 62;
const STANDOUT_CEILING = 88;

/** Tier-2 age curve: mostly 17-21, a tail of older players who stalled. */
function tier2Age(academy) {
  const r = Math.random();
  if (academy) {
    if (r < 0.55) return 17 + Math.floor(Math.random() * 3);  // 17-19
    if (r < 0.88) return 20 + Math.floor(Math.random() * 3);  // 20-22
    return 23 + Math.floor(Math.random() * 3);                // 23-25
  }
  if (r < 0.40) return 17 + Math.floor(Math.random() * 3);    // 17-19
  if (r < 0.75) return 20 + Math.floor(Math.random() * 3);    // 20-22
  if (r < 0.92) return 23 + Math.floor(Math.random() * 4);    // 23-26
  return 27 + Math.floor(Math.random() * 3);                  // 27-29
}

/** Expand the weighted bands into one entry per team, then shuffle. */
function assignBands(count) {
  const bands = [];
  for (const b of STRENGTH_BANDS) {
    for (let i = 0; i < b.weight; i++) bands.push(b);
  }
  while (bands.length < count) bands.push(STRENGTH_BANDS[2]);
  bands.length = count;
  for (let i = bands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bands[i], bands[j]] = [bands[j], bands[i]];
  }
  return bands;
}

function buildRoster(regionKey, band, academy) {
  const roster = [];
  const hasStandout = Math.random() < STANDOUT_CHANCE;

  for (let i = 0; i < TIER2_ROSTER_SIZE; i++) {
    const standout = hasStandout && i === 0;
    roster.push(generatePlayer({
      regionKey,
      ageOverride: tier2Age(academy),
      ratingFloor:   standout ? STANDOUT_FLOOR   : band.floor + (academy ? 3 : 0),
      ratingCeiling: standout ? STANDOUT_CEILING : band.ceiling + (academy ? 3 : 0),
    }));
  }
  // Best player first so the depth chart reads sensibly out of the box.
  roster.sort((a, b) => b.overall - a.overall);
  return roster;
}

/**
 * Contracts for tier-2 players. Deliberately cheap: these are the deals a
 * tier-1 side absorbs when poaching, and they should not eat much cap.
 */
function giveContract(player, seasonNumber) {
  const base = calculateBaseSalary(player.overall);
  const salary = Math.max(50000, Math.round(base * 0.55 / 5000) * 5000);
  const r = Math.random();
  const years = r < 0.45 ? 1 : r < 0.85 ? 2 : 3;
  player.contract = {
    salary,
    yearsRemaining: years,
    signedYear: seasonNumber,
  };
}

/**
 * Build one region's tier-2 scene.
 * Returns the object stored at region.tier2.
 */
export function initTier2Region(regionKey, seasonNumber = 2025) {
  const defs = getTier2TeamDefs(regionKey);
  const bands = assignBands(defs.length);

  const teams = defs.map((def, i) => {
    const team = new Team(def.name, def.abbr, def.color);
    team.tier = 2;
    team.parentAbbr = def.parent || null;
    team.roster = buildRoster(regionKey, bands[i], !!def.parent);
    for (const p of team.roster) giveContract(p, seasonNumber);
    team.mapRatings = generateMapRatings(team.overallRating || 60);
    team.autoAssignStrategy();
    return team;
  });

  return {
    teams,
    swiss: null,      // built when the stage starts
    bracket: null,    // built once 8 qualify
    phase: 'pending', // 'pending' | 'swiss' | 'bracket' | 'complete'
  };
}

/** Attach a tier-2 scene to every region on a gameState. */
export function initTier2(gameState, regionKeys, seasonNumber = 2025) {
  for (const rk of regionKeys) {
    const region = gameState.regions[rk];
    if (!region) continue;
    region.tier2 = initTier2Region(rk, seasonNumber);
  }
  return gameState;
}

/** Every tier-2 team across all regions. */
export function allTier2Teams(gameState, regionKeys) {
  const out = [];
  for (const rk of regionKeys) {
    for (const t of gameState.regions?.[rk]?.tier2?.teams || []) out.push(t);
  }
  return out;
}

export { TIER2_TEAM_COUNT };

/* ─────────────── Running a tier-2 stage ─────────────── */

/**
 * Seed the 8-team playoff bracket from Swiss qualifiers.
 *
 * Reuses the international bracket wholesale rather than adding a fourth
 * copy of the same double-elim shape: its routing already crosses the LB
 * R2 pairings to avoid immediate rematches, and its Bo3/Bo5 placement
 * (Bo5 for the LB Final and Grand Final only) is what tier 2 wants.
 *
 * UB R1 order is 1v8, 3v6, 4v5, 2v7. The bracket pairs the winners of
 * slots 0+1 and 2+3 in the semifinals, so this yields
 *   SF1 = (1v8) vs (3v6)   SF2 = (4v5) vs (2v7)
 * which is the intended half split.
 */
export function initTier2Bracket(seeds) {
  if (!seeds || seeds.length < 8) return null;
  const s = seeds;
  return initInternationalBracket([
    { picker: s[0], picked: s[7] },   // 1 v 8
    { picker: s[2], picked: s[5] },   // 3 v 6
    { picker: s[3], picked: s[4] },   // 4 v 5
    { picker: s[1], picked: s[6] },   // 2 v 7
  ]);
}

/** Clear per-stage records so each tier-2 stage starts level. */
function resetTier2Records(teams) {
  for (const t of teams) {
    t.record = { wins: 0, losses: 0, mapWins: 0, mapLosses: 0, roundWins: 0, roundLosses: 0 };
  }
}

/**
 * Play one region's tier-2 stage start to finish: Swiss to 8 qualifiers,
 * then the double-elim bracket.
 *
 * Simulated in full rather than advanced click-by-click — the player does
 * not manage a tier-2 side, and what matters to them is the OUTPUT: who
 * played well and is worth poaching. Player stats accumulate through
 * simulateSeries as normal, which is what feeds the scouting signal.
 */
export function runTier2Stage(gameState, regionKey) {
  const region = gameState.regions?.[regionKey];
  const tier2 = region?.tier2;
  if (!tier2?.teams?.length) return null;

  resetTier2Records(tier2.teams);
  // Reset player stats too: for tier 2 the useful number is current form,
  // not a career total, since form is what drives the scouting signal.
  for (const t of tier2.teams) {
    for (const p of t.roster) {
      p.stats = { kills: 0, deaths: 0, assists: 0, acs: 0, maps: 0 };
    }
  }

  // Seed the Swiss by current strength so the bracket seeding means
  // something; tiebreaks then take over from actual results.
  const seeded = [...tier2.teams].sort((a, b) => b.overallRating - a.overallRating);
  const swiss = initSwissStage(seeded, {
    winsToQualify: 4, lossesToEliminate: 4, maxRounds: 7, bestOf: 3,
  });
  tier2.phase = 'swiss';

  let guard = 0;
  while (!isSwissComplete(swiss) && guard++ < 20) {
    const matches = buildNextRound(swiss);
    if (matches.length === 0) break;
    pushRound(swiss, matches);
    for (const m of matches) {
      const a = swiss.entries[m.aId], b = swiss.entries[m.bId];
      const result = simulateSeries(a.team, b.team, swiss.config.bestOf);
      const aWon = result.winner === a.team;
      const roundsA = result.maps.reduce((s, mp) => s + mp.roundsA, 0);
      const roundsB = result.maps.reduce((s, mp) => s + mp.roundsB, 0);
      recordResult(swiss, m, {
        winnerId: aWon ? a.id : b.id,
        mapsA: result.score[0],
        mapsB: result.score[1],
        roundsA, roundsB,
      });
      applyTeamRecord(a.team, b.team, aWon, result);
    }
  }
  finalizeSwiss(swiss);
  tier2.swiss = swiss;

  // Playoffs
  const seeds = getQualifiedSeeds(swiss);
  const bracket = initTier2Bracket(seeds);
  tier2.phase = 'bracket';
  if (bracket) {
    let b = bracket;
    let bguard = 0;
    while (!isInternationalBracketComplete(b) && bguard++ < 12) {
      b = advanceInternationalBracket(b);
    }
    tier2.bracket = b;
    tier2.champion = getInternationalChampion(b) || null;
  }
  // Tier-2 match detail is never rendered map-by-map, so the per-player
  // stat tables inside every bracket result are pure save weight. The
  // scouting signal reads player.stats, which accumulates separately.
  stripTier2PlayerStats(tier2.bracket);

  tier2.phase = 'complete';
  tier2.seeds = seeds;
  applyTier2Morale(gameState, regionKey);
  return tier2;
}

/** Drop per-map playerStats from every match in a finished bracket. */
function stripTier2PlayerStats(bracket) {
  if (!bracket) return;
  for (const value of Object.values(bracket)) {
    const matches = Array.isArray(value) ? value : [value];
    for (const m of matches) {
      for (const map of m?.result?.maps || []) delete map.playerStats;
    }
  }
}

/**
 * Mirror a series result onto both teams' stage records.
 * roundsA/roundsB on a map result are always relative to teamA.
 */
function applyTeamRecord(teamA, teamB, aWon, result) {
  (aWon ? teamA : teamB).record.wins++;
  (aWon ? teamB : teamA).record.losses++;

  for (const map of result.maps) {
    teamA.record.roundWins   += map.roundsA;
    teamA.record.roundLosses += map.roundsB;
    teamB.record.roundWins   += map.roundsB;
    teamB.record.roundLosses += map.roundsA;

    if (map.winner === teamA) {
      teamA.record.mapWins++;
      teamB.record.mapLosses++;
    } else {
      teamB.record.mapWins++;
      teamA.record.mapLosses++;
    }
  }
}

/** Run every region's tier-2 stage. */
export function runAllTier2Stages(gameState, regionKeys) {
  const out = {};
  for (const rk of regionKeys) out[rk] = runTier2Stage(gameState, rk);
  return out;
}

/* ─────────────── Tier-2 morale ─────────────── */

/**
 * Morale for tier-2 players, applied after each tier-2 stage.
 *
 * Without this every tier-2 player sits at the default 65 forever, and
 * the rule that a happy player (90+) may refuse a tier-1 offer could
 * never fire. The scale is deliberately slow: a player has to be on a
 * side that keeps going deep before they become genuinely hard to poach,
 * which is what makes "he doesn't want to leave" a rare outcome rather
 * than a routine one.
 *
 * Team result dominates; individual form nudges.
 */
// Morale drifts back toward this each stage; see applyTier2Morale.
const MORALE_BASELINE = 65;
const MORALE_REVERSION = 0.08;

const TIER2_MORALE = {
  champion:   +14,
  finalist:    +9,
  topFour:     +6,
  qualified:   +2,
  swissMid:     0,   // 2-3 wins, missed the bracket
  swissPoor:   -3,   // 0-1 wins
};

/** Placement bucket for one tier-2 team after a completed stage. */
function tier2Placement(tier2, team) {
  if (tier2.champion === team) return 'champion';
  const elim = tier2.bracket?.eliminated || [];
  // eliminated is filled in knockout order, so the last entry is the
  // grand-final loser and the two before it went out in the semis.
  if (elim.length && elim[elim.length - 1] === team) return 'finalist';
  if (elim.slice(-3, -1).includes(team)) return 'topFour';
  if ((tier2.seeds || []).includes(team)) return 'qualified';
  const wins = team.record?.wins ?? 0;
  return wins >= 2 ? 'swissMid' : 'swissPoor';
}

/**
 * Apply post-stage morale to every tier-2 player in a region.
 * Returns a small summary for logging/among tests.
 */
export function applyTier2Morale(gameState, regionKey) {
  const tier2 = gameState.regions?.[regionKey]?.tier2;
  if (!tier2?.teams?.length || tier2.phase !== 'complete') return null;

  const counts = {};
  // Mean reversion first. Without it morale only ever ratchets upward on
  // a good side: measured 40% of tier-2 players above 90 after nine
  // stages, which would make "he refuses to leave" the normal case
  // rather than the rare one.
  for (const team of tier2.teams) {
    for (const player of team.roster) {
      const m = player.morale ?? 65;
      const pull = Math.round((MORALE_BASELINE - m) * MORALE_REVERSION);
      if (pull !== 0) adjustMorale(player, pull, 'settling');
    }
  }

  for (const team of tier2.teams) {
    const bucket = tier2Placement(tier2, team);
    counts[bucket] = (counts[bucket] || 0) + 1;
    const teamDelta = TIER2_MORALE[bucket] ?? 0;

    for (const player of team.roster) {
      let delta = teamDelta;
      // Individual form: carrying a weak side still feels good, and
      // underperforming on a good one does not.
      const acs = player.avgAcs;
      if (acs > 0) {
        const expected = expectedAcs(player.overall);
        if (acs >= expected + 25) delta += 2;
        else if (acs <= expected - 25) delta -= 2;
      }
      // Diminishing returns near the ceiling: the same run of results
      // moves a contented player far more than an already-elated one.
      if (delta > 0) {
        const headroom = Math.max(0, 100 - (player.morale ?? 65));
        delta = Math.max(1, Math.round(delta * (headroom / 70)));
      }
      if (delta !== 0) adjustMorale(player, delta, `tier2_${bucket}`);
    }
  }
  return counts;
}
