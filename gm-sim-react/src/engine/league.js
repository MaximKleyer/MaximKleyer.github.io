/**
 * league.js — League init with strategy auto-assignment.
 */

import { Team } from '../classes/Team.js';
import { generatePlayer, resetTagPool } from '../classes/Player.js';
import { TEAM_DEFS } from '../data/teams.js';
import { REQUIRED_ROLES, FREE_AGENT_POOL_SIZE, GROUP_SIZE } from '../data/constants.js';
import { COMPOSITIONS } from '../data/strategy.js';

export function initLeague(humanTeamIndex = 0) {
  resetTagPool();

  const teams = TEAM_DEFS.map(def => new Team(def.name, def.abbr, def.color));
  teams[humanTeamIndex].isHuman = true;

  // Generate rosters
  for (const team of teams) {
    for (const role of REQUIRED_ROLES) {
      const player = generatePlayer(role);
      team.roster.push(player);
    }
  }

  // Validate rosters
  for (const team of teams) {
    while (team.roster.length < 5) {
      const role = REQUIRED_ROLES[team.roster.length % REQUIRED_ROLES.length];
      team.roster.push(generatePlayer(role));
    }
  }

  // Auto-assign strategy for ALL teams (CPU will use defaults,
  // human can customize via the Roster/Strategy UI)
  const compKeys = Object.keys(COMPOSITIONS);
  for (const team of teams) {
    if (!team.isHuman) {
      // Give CPU teams a random composition for variety
      team.strategy.comp = compKeys[Math.floor(Math.random() * compKeys.length)];
    }
    team.autoAssignStrategy();
  }

  // Generate free agents
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

  const schedule = generateSchedule(teams);

  return {
    teams,
    freeAgents,
    schedule,
    currentWeek: 0,
    phase: 'group',
    results: [],
  };
}

function generateSchedule(teams) {
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

export function getHumanTeam(gameState) {
  return gameState.teams.find(t => t.isHuman);
}
