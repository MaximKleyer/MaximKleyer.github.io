import { SIM } from '../data/constants.js';

/**
 * Run AI roster decisions for all CPU teams.
 * Called between weeks.
 */
export function runCpuMoves(gameState) {
    const { teams, freeAgents } = gameState;

    for (const team of teams) {
        if (team.isHuman) continue;                          // skip player's team
        if (Math.random() > SIM.CPU_MOVE_CHANCE) continue;   // sometimes CPUs do nothing

        cpuRosterMoves(team, freeAgents);
    }
}

/**
 * CPU logic for a single team:
 * 1. Fill any empty roster slots.
 * 2. Check if a free agent is a clear upgrade over a current player.
 */
function cpuRosterMoves(team, freeAgents) {
    // ── Step 1: Fill gaps ──
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
        }
    }

    // ── Step 2: Upgrade if clear improvement exists ──
    for (const player of [...team.roster]) {
        const upgrade = freeAgents
            .filter(p => p.role === player.role && p.overall > player.overall + SIM.UPGRADE_THRESHOLD)
            .sort((a, b) => b.overall - a.overall)[0];

        if (upgrade) {
            team.removePlayer(player);
            freeAgents.push(player);
            team.addPlayer(upgrade);
            freeAgents.splice(freeAgents.indexOf(upgrade), 1);
        }
    }
}
