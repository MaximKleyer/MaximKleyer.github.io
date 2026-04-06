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
import { REQUIRED_ROLES, FREE_AGENT_POOL_SIZE, GROUP_SIZE } from '../data/constants.js';
import { COMPOSITIONS } from '../data/strategy.js';

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

    // Generate rosters
    for (const team of teams) {
      for (const role of REQUIRED_ROLES) {
        team.roster.push(generatePlayer(role));
      }
    }

    // Validate
    for (const team of teams) {
      while (team.roster.length < 5) {
        const role = REQUIRED_ROLES[team.roster.length % REQUIRED_ROLES.length];
        team.roster.push(generatePlayer(role));
      }
    }

    // Auto-assign strategy
    for (const team of teams) {
      if (!team.isHuman) {
        team.strategy.comp = compKeys[Math.floor(Math.random() * compKeys.length)];
      }
      team.autoAssignStrategy();
    }

    // Free agents
    const freeAgents = [];
    for (let i = 0; i < FREE_AGENT_POOL_SIZE; i++) {
      const role = REQUIRED_ROLES[Math.floor(Math.random() * REQUIRED_ROLES.length)];
      freeAgents.push(generatePlayer(role));
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
    };
  }

  return {
    regions,
    humanRegion,
    humanTeamIndex,
  };
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
