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
import { calculateBaseSalary, DEFAULT_SALARY_CAP, syncSalaryCap, computeTeamSalary, getSalaryCap } from '../data/salary.js';
import { initTier2Region } from './tier2.js';
import { assignRosterRoles, swapKeepsSpread, FLEX } from '../data/roles.js';

/**
 * Bring a freshly generated tier-1 roster up to a professional standard.
 *
 * Five unbounded draws is a high-variance way to build a team: measured
 * over 2000 rosters it put 21% of them below 70 overall, down to 61. That
 * is not a weak team, it is a broken one, and the league had eight of
 * them on a typical new save.
 *
 * The fix re-rolls the weakest player rather than raising the floor on
 * everyone, because ratingFloor is the bottom of the stat range and not a
 * clamp — applying it across the board dragged the whole league up into
 * the 80s and flattened it. Re-rolling one slot leaves good teams exactly
 * as generated and only touches the squads that need it.
 *
 * Flex players are skipped: they are capped low by design, so re-rolling
 * one cannot lift a team and would just burn the guard.
 */
function topUpRoster(team, regionKey) {
  let guard = 0;
  while (team.overallRating < TIER1_MIN_TEAM_OVR && guard < 6) {
    const candidates = team.roster
      .filter(p => p.primaryRole !== FLEX)
      .sort((a, b) => a.overall - b.overall);
    const out = candidates[0];
    if (!out) break;

    // Each attempt asks for a better player than the last.
    const replacement = generatePlayer({
      regionKey,
      primaryRole: out.primaryRole,
      secondaryRole: out.secondaryRole,
      ratingFloor: 50 + guard * 4,
    });
    if (replacement.overall > out.overall) {
      team.roster[team.roster.indexOf(out)] = replacement;
    }
    guard++;
  }
}

/**
 * The standard of player left on the market, and how often a genuinely
 * elite name slips through anyway.
 */
const FREE_AGENT_CEILING = 72;
const FREE_AGENT_ELITE_CHANCE = 0.05;

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
      topUpRoster(team, regionKey);
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

    // Free agents.
    //
    // Drawn on a lower curve than rostered players, because that is what
    // being unsigned means. Generating the pool from the same unbounded
    // distribution as starters gave every region dozens of free agents
    // better than most of the league's first teams, which made the whole
    // board look broken — if they were that good, somebody would have
    // signed them.
    //
    // A small elite tail survives so each preseason still has a genuine
    // marquee name or two worth chasing.
    const freeAgents = [];
    for (let i = 0; i < FREE_AGENT_POOL_SIZE; i++) {
      const elite = Math.random() < FREE_AGENT_ELITE_CHANCE;
      freeAgents.push(generatePlayer({
        regionKey,
        ratingFloor: elite ? FREE_AGENT_CEILING + 1 : undefined,
        ratingCeiling: elite ? 85 : FREE_AGENT_CEILING,
      }));
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
        // Every (rostered player, free agent) pair, best gain first.
        // Only ever swapping the single weakest player left teams stuck
        // whenever that one slot had no legal replacement — the squad
        // could not improve even with obvious upgrades on the board for
        // its other positions.
        let best = null;
        for (const out of team.roster) {
          for (const fa of region.freeAgents) {
            const gain = fa.overall - out.overall;
            if (gain <= 0) continue;
            if (best && gain <= best.gain) continue;
            if (!swapKeepsSpread(team.roster, out, fa)) continue;
            best = { out, fa, gain };
          }
        }
        if (!best) break;   // nothing available that helps

        team.removePlayer(best.out);
        region.freeAgents.push(best.out);
        region.freeAgents.splice(region.freeAgents.indexOf(best.fa), 1);
        team.addPlayer(best.fa);
      }
      team.validateStrategy();
    }
  }
}

/* ─────────────── Preseason market clearing ─────────────── */

/**
 * Clubs sign the good free agents who are left.
 *
 * The floor pass above only lifts teams up to 70, so a fresh save could
 * still show a stack of unsigned 75s while half the league fielded worse
 * starters. That reads as a league where nobody does their job — a real
 * preseason clears the top of the market before the first game.
 *
 * Runs AFTER ensureContracts, because it is the first point at which
 * salaries exist and the cap means anything. Each signing is a swap: the
 * club's weakest player makes way and returns to the pool, so squad sizes
 * and the total player population are unchanged.
 *
 * A club only bites when the free agent clears its weakest player by
 * MARKET_UPGRADE_MARGIN. Without that margin teams churned endlessly over
 * one-point gains, and the pool emptied of anyone worth signing — the
 * human included.
 */
export const MARKET_UPGRADE_MARGIN = 3;

/**
 * How many players one club signs in the preseason window. Left
 * unlimited, every side simply swapped its way to the best five on the
 * market and the whole division converged into a three-point band — the
 * league lost its shape. Two moves clears the obvious mismatches at the
 * top of the pool while leaving teams recognisably different.
 */
export const MAX_MARKET_MOVES = 2;

function marketContractFor(player, seasonNumber) {
  const base = calculateBaseSalary(player.overall);
  return {
    salary: Math.round(base * INITIAL_CONTRACT_DISCOUNT / 5000) * 5000,
    yearsRemaining: 1 + Math.floor(Math.random() * 3),
    signedYear: seasonNumber,
  };
}

export function clearFreeAgentMarket(gameState) {
  if (!gameState?.regions) return 0;
  const season = gameState.seasonNumber || 2025;
  const cap = getSalaryCap();
  let signings = 0;

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    if (!region) continue;

    const moves = new Map();
    let progress = true;
    while (progress) {
      progress = false;

      // Best free agent still on the market leads each round.
      const ranked = [...region.freeAgents].sort((a, b) => b.overall - a.overall);

      for (const fa of ranked) {
        // The club this player improves most, that can also afford them.
        let best = null;
        for (const team of region.teams) {
          if ((moves.get(team) || 0) >= MAX_MARKET_MOVES) continue;
          const weakest = [...team.roster].sort((a, b) => a.overall - b.overall)[0];
          if (!weakest) continue;

          const gain = fa.overall - weakest.overall;
          if (gain < MARKET_UPGRADE_MARGIN) continue;
          if (!swapKeepsSpread(team.roster, weakest, fa)) continue;

          const salary = marketContractFor(fa, season).salary;
          const after = computeTeamSalary(team) - (weakest.contract?.salary || 0) + salary;
          if (after > cap) continue;

          if (!best || gain > best.gain) best = { team, weakest, gain };
        }

        if (!best) continue;

        best.team.removePlayer(best.weakest);
        best.weakest.contract = null;
        region.freeAgents.push(best.weakest);
        region.freeAgents.splice(region.freeAgents.indexOf(fa), 1);
        fa.contract = marketContractFor(fa, season);
        best.team.addPlayer(fa);
        best.team.validateStrategy();
        moves.set(best.team, (moves.get(best.team) || 0) + 1);
        signings++;
        progress = true;
        break;   // re-rank; the pool just changed
      }
    }
  }
  return signings;
}
