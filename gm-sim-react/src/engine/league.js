/**
 * league.js — Multi-region league initialization.
 *
 * Each region is an independent league with its own:
 *   teams, freeAgents, schedule, currentWeek, phase, bracket, frozenStandings
 *
 * The top-level gameState holds all regions + which one the human is in.
 */

import { Team } from '../classes/Team.js';
import { generatePlayer, resetTagPool } from '../classes/Player.js';
import { REGIONS, REGION_KEYS } from '../data/regions.js';
import { FREE_AGENT_POOL_SIZE, GROUP_SIZE } from '../data/constants.js';
import { COMPOSITIONS } from '../data/strategy.js';

import { initMapPool, generateMapRatings, syncCurrentPool } from '../data/maps.js';
import { calculateBaseSalary, DEFAULT_SALARY_CAP, syncSalaryCap } from '../data/salary.js';
import { initTier2Region } from './tier2.js';
import { assignRosterRoles, swapKeepsSpread } from '../data/roles.js';

/**
 * Initialize the full game — all 4 regions.
 * @param {string} humanRegion — region key the player chose (e.g. 'americas')
 * @param {number} humanTeamIndex — index within that region's team list
 */
export function initGame(humanRegion, humanTeamIndex) {
  resetTagPool();

  const regions = {};
  const compKeys = Object.keys(COMPOSITIONS);

  for (const regionKey of REGION_KEYS) {
    const regionDef = REGIONS[regionKey];
    const isHumanRegion = regionKey === humanRegion;

    // Create teams
    const teams = regionDef.teams.map(def => new Team(def.name, def.abbr, def.color));
    if (isHumanRegion) {
      teams[humanTeamIndex].isHuman = true;
    }

    // Generate rosters. Roles are assigned per TEAM, not per player:
    // every composition needs all four roles and several need two of
    // one, so rolling roles independently regularly left a squad missing
    // a role entirely and permanently stuck with an off-role penalty.
    // assignRosterRoles guarantees one of each plus a duplicate.
    for (const team of teams) {
      const roles = assignRosterRoles(5);
      while (team.roster.length < 5) {
        team.roster.push(generatePlayer({ regionKey, ...roles[team.roster.length] }));
      }
    }

    // Auto-assign strategy
    for (const team of teams) {
      if (!team.isHuman) {
        // Pick the composition this roster can actually field. Choosing
        // at random regularly demanded two of a role the team had one of,
        // leaving AI sides permanently off-role.
        team.strategy.comp = team.bestCompFor(COMPOSITIONS) || team.strategy.comp;
        team.autoAssignStrategy();
      }
      // The human team is deliberately left UNASSIGNED. Picking the five
      // is the decision the Strategy panel exists to make, and filling it
      // in automatically meant most managers never engaged with it.
      // Unassigned players take no penalty — see roleFit's 'none'.
    }

    // Per-map Attack/Defense strengths. Generated here (not in the Team
    // constructor) because the anchor is team overall, which only exists
    // once the roster has been generated above.
    for (const team of teams) {
      team.mapRatings = generateMapRatings(team.overallRating || 70);
    }

    // Free agents
    const freeAgents = [];
    for (let i = 0; i < FREE_AGENT_POOL_SIZE; i++) {
      freeAgents.push(generatePlayer({ regionKey }));
    }

    // Assign groups
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    shuffled.forEach((team, i) => {
      team.group = i < GROUP_SIZE ? 'A' : 'B';
    });

    // Schedule
    const schedule = generateSchedule(teams);

    regions[regionKey] = {
      name: regionDef.name,
      abbr: regionDef.abbr,
      color: regionDef.color,
      teams,
      freeAgents,
      schedule,
      currentWeek: 0,
      phase: 'group',
      results: [],
      bracket: null,
      frozenStandings: null,
      // The open second division: 16 teams, Swiss + double-elim, no
      // promotion for now. Poaching targets live here.
      tier2: initTier2Region(regionKey),
    };
  }

  // Bring every tier-1 side up to a professional standard before the
  // save starts, using the free agents already generated.
  upgradeTeamsToFloor(regions, REGION_KEYS);

  // Re-fit strategy after any roster churn from the upgrade pass.
  for (const regionKey of REGION_KEYS) {
    for (const team of regions[regionKey].teams) {
      if (team.isHuman) continue;
      team.strategy.comp = team.bestCompFor(COMPOSITIONS) || team.strategy.comp;
      team.autoAssignStrategy();
    }
  }

  // Mirror the pool for the batch sim paths (see maps.js).
  const pool = initMapPool();
  syncCurrentPool({ mapPool: pool });

  // Tunable rules the player can change mid-save. Kept in one bag so
  // future settings persist without touching persistence again.
  const settings = { salaryCap: DEFAULT_SALARY_CAP };
  syncSalaryCap({ settings });

  return {
    regions,
    humanRegion,
    humanTeamIndex,
    // Live map pool: 7 active, the rest benched. Rotates one in / one out
    // after each completed stage. Lives on gameState (not in maps.js)
    // because it changes during play and must survive a save/load.
    mapPool: pool,
    settings,
  };
}

/**
 * Phase 7: ensure every rostered player has a contract. Idempotent —
 * players who already have a contract are left alone. Players without
 * one get a freshly generated reasonable contract.
 *
 * Called from two paths:
 *   - initGame() right after roster generation (fresh game)
 *   - persistence.js Pass 4 migration (existing saves)
 *
 * Generated contract values:
 *   salary = calculateBaseSalary(player.overall) × INITIAL_DISCOUNT
 *           Backdating discount: players signed their current contracts
 *           in years past when they were younger / less developed, so
 *           they're slightly below today's market rate. Models real
 *           sports — you don't sign a new player at peak market
 *           every year. Without this discount the fresh league starts
 *           with most teams over cap, which would force panic releases.
 *
 *   yearsRemaining = random 1-3, biased toward 2.
 *           Ensures the league has both contracts expiring this season
 *           AND multi-year locked deals from day one. Variety is good.
 *
 *   signedYear = currentSeasonNumber - (3 - yearsRemaining).
 *           Backdates so a 2-year-remaining contract was signed last
 *           year, etc.
 *
 * Free agents are NOT touched — they're unsigned by definition.
 *
 * Morale is also initialized for any player missing it. Default 65 =
 * Content tier.
 */
const INITIAL_CONTRACT_DISCOUNT = 0.90;

export function ensureContracts(gameState) {
  if (!gameState?.regions) return;
  const currentYear = gameState.seasonNumber || 2025;

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    if (!region) continue;

    for (const team of region.teams) {
      for (const player of team.roster) {
        // Backfill morale if missing (older saves)
        if (typeof player.morale !== 'number') {
          player.morale = 65;
        }
        // Phase 7e: backfill moraleHistory array
        if (!Array.isArray(player.moraleHistory)) {
          player.moraleHistory = [];
        }

        if (player.contract) continue; // already has one — leave alone

        // Roll length 1-3, slight bias toward 2
        const r = Math.random();
        const length = r < 0.3 ? 1 : r < 0.7 ? 2 : 3;
        const baseSalary = calculateBaseSalary(player.overall);
        const discountedSalary = Math.round(baseSalary * INITIAL_CONTRACT_DISCOUNT / 5000) * 5000;

        player.contract = {
          salary: discountedSalary,
          yearsRemaining: length,
          signedYear: Math.max(2025, currentYear - (3 - length)),
        };
      }

      // Backfill team-level cap state for older saves
      if (!Array.isArray(team.deadCapHits)) {
        team.deadCapHits = [];
      }
    }

    // Free agents: just morale backfill, no contract
    for (const player of region.freeAgents || []) {
      if (typeof player.morale !== 'number') {
        player.morale = 65;
      }
      if (!Array.isArray(player.moraleHistory)) {
        player.moraleHistory = [];
      }
      if (player.contract) {
        player.contract = null;
      }
    }
  }
}

/**
 * Get the human-controlled team.
 */
export function getHumanTeam(gameState) {
  const region = gameState.regions[gameState.humanRegion];
  return region.teams.find(t => t.isHuman);
}

/**
 * Get a specific region's data.
 */
export function getRegion(gameState, regionKey) {
  return gameState.regions[regionKey];
}

/**
 * Round-robin schedule. Exported so season.js can regenerate between stages.
 */
export function generateSchedule(teams) {
  const schedule = [];
  for (const groupLetter of ['A', 'B']) {
    const groupTeams = teams.filter(t => t.group === groupLetter);
    const n = groupTeams.length;
    const rotation = [...groupTeams];
    for (let week = 1; week <= n - 1; week++) {
      for (let i = 0; i < n / 2; i++) {
        schedule.push({
          teamA: rotation[i],
          teamB: rotation[n - 1 - i],
          group: groupLetter,
          week,
          result: null,
        });
      }
      const last = rotation.pop();
      rotation.splice(1, 0, last);
    }
  }
  schedule.sort((a, b) => a.week - b.week);
  return schedule;
}

/* ─────────────── Squad quality floor ─────────────── */

/**
 * Every tier-1 side should look like a professional roster on a new save.
 *
 * Generation alone left roughly a fifth of teams below 70 overall — as
 * low as 63 — while dozens of 70+ free agents sat unsigned, which reads
 * as a league that has not done its business rather than as a weak team.
 *
 * So each team below the floor upgrades from free agency: its weakest
 * player is swapped for the best available free agent who improves them.
 * Swaps that would cost the squad its role coverage are skipped, and the
 * player who makes way returns to the pool, so nobody is invented or
 * lost. Teams already at the floor are left alone — the league should
 * still have a spread, just not a broken bottom end.
 */
export const TIER1_MIN_TEAM_OVR = 70;

export function upgradeTeamsToFloor(regions, regionKeys, floor = TIER1_MIN_TEAM_OVR) {
  for (const regionKey of regionKeys) {
    const region = regions[regionKey];
    if (!region) continue;

    for (const team of region.teams) {
      let guard = 0;
      while (team.overallRating < floor && guard++ < 10) {
        const weakest = [...team.roster].sort((a, b) => a.overall - b.overall)[0];
        if (!weakest) break;

        // Best free agent who is an upgrade AND keeps role coverage.
        const candidates = region.freeAgents
          .filter(fa => fa.overall > weakest.overall)
          .filter(fa => swapKeepsSpread(team.roster, weakest, fa))
          .sort((a, b) => b.overall - a.overall);

        const incoming = candidates[0];
        if (!incoming) break;   // nothing available that helps

        team.removePlayer(weakest);
        region.freeAgents.push(weakest);
        region.freeAgents.splice(region.freeAgents.indexOf(incoming), 1);
        team.addPlayer(incoming);
      }
      team.validateStrategy();
    }
  }
}
