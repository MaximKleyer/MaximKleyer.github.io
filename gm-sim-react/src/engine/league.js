/**
 * league.js — Creates the league: teams, rosters, free agents, schedule.
 *
 * UNCHANGED FROM VANILLA (logic-wise).
 * Returns a plain object that becomes React state via useState().
 *
 * KEY CONCEPT: In vanilla JS, this returned a global variable that
 * every view read from directly. In React, this returned object gets
 * stored in useState(), and when you update it, React automatically
 * re-renders only the components that depend on the changed data.
 * That's the core magic of React — you never manually call
 * "renderStandings()" again. You just update the data.
 */

import { Team } from '../classes/Team.js';
import { generatePlayer } from '../classes/Player.js';
import { TEAM_DEFS } from '../data/teams.js';
import { REQUIRED_ROLES, FREE_AGENT_POOL_SIZE, GROUP_SIZE } from '../data/constants.js';

/**
 * Build the entire league from scratch.
 * @param {number} humanTeamIndex — which team the player controls (0-11)
 * @returns {object} gameState — the entire game in one object
 */
export function initLeague(humanTeamIndex = 0) {
  // Create team objects from the definitions
  const teams = TEAM_DEFS.map(def => new Team(def.name, def.abbr, def.color));
  teams[humanTeamIndex].isHuman = true;

  // Generate a 5-player roster for each team (one per role)
  for (const team of teams) {
    for (const role of REQUIRED_ROLES) {
      team.addPlayer(generatePlayer(role));
    }
  }

  // Generate free agents (unattached players available to sign)
  const freeAgents = [];
  for (let i = 0; i < FREE_AGENT_POOL_SIZE; i++) {
    const role = REQUIRED_ROLES[Math.floor(Math.random() * REQUIRED_ROLES.length)];
    freeAgents.push(generatePlayer(role));
  }

  // Randomly assign teams to Group A or Group B
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  shuffled.forEach((team, i) => {
    team.group = i < GROUP_SIZE ? 'A' : 'B';
  });

  // Build the match schedule
  const schedule = generateSchedule(teams);

  return {
    teams,
    freeAgents,
    schedule,
    currentWeek: 1,
    phase: 'group',    // 'group' → 'bracket' → 'finished'
    results: [],       // log of completed match results
  };
}

/**
 * Round-robin within each group.
 * 6 teams per group → 15 matchups per group → ~3 matches per week.
 */
function generateSchedule(teams) {
  const schedule = [];

  for (const groupLetter of ['A', 'B']) {
    const groupTeams = teams.filter(t => t.group === groupLetter);
    const n = groupTeams.length; // 6 teams

    const rotation = [...groupTeams];

    for (let week = 1; week <= n - 1; week++) {
      // Pair up: index 0 vs last, 1 vs second-to-last, etc.
      for (let i = 0; i < n / 2; i++) {
        schedule.push({
          teamA: rotation[i],
          teamB: rotation[n - 1 - i],
          group: groupLetter, week,
          result: null,
        });
      }

      // Rotate: keep index 0 fixed, shift the rest clockwise
      // [A, B, C, D, E, F] → [A, F, B, C, D, E]
      const last = rotation.pop();
      rotation.splice(1, 0, last);
    }
  }

  schedule.sort((a, b) => a.week - b.week);
  return schedule;
}

/** Helper to find the player's team */
export function getHumanTeam(gameState) {
  return gameState.teams.find(t => t.isHuman);
}
