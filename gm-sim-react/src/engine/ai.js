/**
 * ai.js — CPU roster decisions.
 *
 * Players no longer have roles, so FA moves are driven by raw overall
 * ratings and roster size. The CPU will:
 *   1. Fill its roster up to ROSTER_MIN if it's short
 *   2. Look for clear upgrades — an FA whose overall beats the team's
 *      worst player by at least SIM.UPGRADE_THRESHOLD — and swap them in
 *
 * Phase 6e will replace this with team-archetype-flavored behavior
 * (big spenders, talent seekers, balanced) tied to FA windows. For now
 * this is the simple fallback that keeps rosters at valid size.
 */

import { SIM, ROSTER_MIN } from '../data/constants.js';

export function runCpuMoves(gameState) {
  const { teams, freeAgents } = gameState;

  for (const team of teams) {
    if (team.isHuman) continue;
    if (Math.random() > SIM.CPU_MOVE_CHANCE) continue;
    cpuRosterMoves(team, freeAgents);
  }
}

function cpuRosterMoves(team, freeAgents) {
  let madeChanges = false;

  // Step 1: Fill gaps
  while (team.roster.length < ROSTER_MIN && freeAgents.length > 0) {
    const best = [...freeAgents].sort((a, b) => b.overall - a.overall)[0];
    if (!best) break;
    team.addPlayer(best);
    freeAgents.splice(freeAgents.indexOf(best), 1);
    madeChanges = true;
  }

  // Step 2: Look for a clear upgrade
  if (team.roster.length >= ROSTER_MIN && freeAgents.length > 0) {
    const weakest = [...team.roster].sort((a, b) => a.overall - b.overall)[0];
    const bestFA = [...freeAgents].sort((a, b) => b.overall - a.overall)[0];
    if (weakest && bestFA && bestFA.overall > weakest.overall + SIM.UPGRADE_THRESHOLD) {
      team.removePlayer(weakest);
      freeAgents.push(weakest);
      team.addPlayer(bestFA);
      freeAgents.splice(freeAgents.indexOf(bestFA), 1);
      madeChanges = true;
    }
  }

  if (madeChanges) {
    team.validateStrategy();
  }
}
