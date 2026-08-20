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
import { calculateBaseSalary } from '../data/salary.js';

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
