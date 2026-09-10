import { runBattle, makeEnemyGuard } from "./combat";

/**
 * Run a team battle: each side has 1-3 guards, they fight sequentially.
 * When one side's active guard is KO'd, the next one comes in.
 * Battle ends when one team has no guards left.
 *
 * Returns:
 *   {
 *     won: bool,
 *     log: [...],          // combined log with team-switch entries
 *     fights: [...],       // individual fight results
 *     playerSurvivors: int,
 *     enemySurvivors: int,
 *   }
 */
export function runTeamBattle(playerTeam, enemyTeam) {
  const log = [];
  const fights = [];

  let pIdx = 0;
  let eIdx = 0;

  // Track active player guard with carry-over HP
  let pCurrent = { ...playerTeam[0], _hp: null };
  let eCurrent = { ...enemyTeam[0], _hp: null };

  log.push({
    text: `🎯 TEAM BATTLE — ${playerTeam.length}v${enemyTeam.length}`,
    type: "header",
  });

  let safety = 0;
  while (pIdx < playerTeam.length && eIdx < enemyTeam.length && safety < 20) {
    safety++;

    log.push({
      text: `${pCurrent.emoji} ${pCurrent.name} VS ${eCurrent.emoji} ${eCurrent.name}`,
      type: "matchup",
    });

    const fight = runBattle(pCurrent, eCurrent);
    fights.push(fight);

    // Append fight log
    for (const entry of fight.log) {
      log.push(entry);
    }

    if (fight.won) {
      // Player won this fight — enemy guard is KO'd
      eIdx++;
      if (eIdx < enemyTeam.length) {
        eCurrent = { ...enemyTeam[eIdx], _hp: null };
        log.push({
          text: `⚔️ Enemy sends out ${eCurrent.name}!`,
          type: "switch_enemy",
        });
      }
    } else {
      // Player lost — player guard is KO'd
      pIdx++;
      if (pIdx < playerTeam.length) {
        pCurrent = { ...playerTeam[pIdx], _hp: null };
        log.push({
          text: `🛡️ You send out ${pCurrent.name}!`,
          type: "switch_player",
        });
      }
    }
  }

  const won = pIdx < playerTeam.length;
  const playerSurvivors = playerTeam.length - pIdx;
  const enemySurvivors = enemyTeam.length - eIdx;

  log.push({
    text: won ? `🏆 TEAM VICTORY! (${playerSurvivors} guard${playerSurvivors !== 1 ? "s" : ""} remaining)` : "💀 TEAM DEFEATED",
    type: won ? "win" : "lose",
  });

  return { won, log, fights, playerSurvivors, enemySurvivors };
}

/**
 * Build an enemy team from a roster definition.
 * Each roster entry: { guardId, level, statBoosts? }
 */
export function buildEnemyTeam(roster) {
  return roster.map(entry => {
    const guard = makeEnemyGuard(entry.guardId, entry.level);
    if (!guard) return null;
    // Apply optional stat boosts (e.g., AI gets +5 to all stats at higher tiers)
    if (entry.statBoosts) {
      for (const s of Object.keys(entry.statBoosts)) {
        guard.stats[s] = (guard.stats[s] || 0) + entry.statBoosts[s];
      }
    }
    return guard;
  }).filter(Boolean);
}
