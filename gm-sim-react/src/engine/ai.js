/**
 * ai.js — CPU roster decisions.
 *
 * UPDATED: Calls team.validateStrategy() after every roster change
 * so assignments stay in sync.
 */

import { SIM } from '../data/constants.js';

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
  const filledRoles = new Set(team.roster.map(p => p.role));
  const allRoles = ['duelist', 'initiator', 'controller', 'sentinel', 'flex'];

  for (const role of allRoles) {
    if (filledRoles.has(role)) continue;
    const best = freeAgents
      .filter(p => p.role === role)
      .sort((a, b) => b.overall - a.overall)[0];
    if (best) {
      team.addPlayer(best);
      freeAgents.splice(freeAgents.indexOf(best), 1);
      madeChanges = true;
    }
  }

  // Step 2: Upgrade
  for (const player of [...team.roster]) {
    const upgrade = freeAgents
      .filter(p => p.role === player.role && p.overall > player.overall + SIM.UPGRADE_THRESHOLD)
      .sort((a, b) => b.overall - a.overall)[0];
    if (upgrade) {
      team.removePlayer(player);
      freeAgents.push(player);
      team.addPlayer(upgrade);
      freeAgents.splice(freeAgents.indexOf(upgrade), 1);
      madeChanges = true;
    }
  }

  // Always re-validate strategy after any roster changes
  if (madeChanges) {
    team.validateStrategy();
  }
}
