import TYPE_CHART from "../data/typeChart";
import GUARD_DB from "../data/guards";
import { calcHP } from "./formulas";

/**
 * Calculate damage for a single attack
 */
/**
 * Get effective stat value with percent bonus applied
 */
function getStat(guard, stat) {
  const base = guard.stats[stat] || 0;
  const bonusPct = guard.statBonuses?.[stat] || 0;
  return Math.floor(base * (1 + bonusPct / 100));
}

function calcDamage(attacker, defender, skill) {
  const isPhysical = skill.physical;
  const atkStat = isPhysical ? getStat(attacker, "atk") : getStat(attacker, "matk");
  const defStat = isPhysical ? getStat(defender, "def") : getStat(defender, "mdef");

  let base = (skill.power * (atkStat * 1.2)) / (defStat * 0.8 + 20);
  base *= 0.85 + Math.random() * 0.3;

  const attackType = TYPE_CHART[skill.type];
  if (attackType) {
    if (attackType.strong.includes(defender.bodyType)) base *= 1.5;
    const defenderType = TYPE_CHART[defender.bodyType];
    if (defenderType && defenderType.strong.includes(skill.type)) base *= 0.65;
  }

  base *= 1 + (attacker.level - defender.level) * 0.03;
  return Math.max(1, Math.floor(base));
}

/**
 * Create an enemy guard instance from a template at a given level
 */
export function makeEnemyGuard(guardId, level) {
  const template = GUARD_DB[guardId];
  if (!template) return null;

  const stats = {};
  const lvlBonus = level - 1;
  for (const s of Object.keys(template.baseStats)) {
    stats[s] = template.baseStats[s] + Math.floor(lvlBonus * (1 + Math.random() * 0.5));
  }

  return { ...template, level, stats, skills: template.skills };
}

/**
 * Run a full auto-battle. Each log entry now includes HP snapshots
 * so the battle screen can animate them.
 *
 * Log entry shape:
 *   { text, type, skill?, damage?, pHP, eHP, pMaxHP, eMaxHP, attacker?, effectiveness? }
 */
export function runBattle(playerGuard, enemyGuard) {
  const log = [];
  let pHP = calcHP(playerGuard);
  let eHP = calcHP(enemyGuard);
  const pMaxHP = pHP;
  const eMaxHP = eHP;
  let turn = 0;

  log.push({
    text: `${playerGuard.name} (Lv.${playerGuard.level}) vs ${enemyGuard.name} (Lv.${enemyGuard.level})`,
    type: "header", pHP, eHP, pMaxHP, eMaxHP,
  });

  while (pHP > 0 && eHP > 0 && turn < 30) {
    turn++;
    const pGoesFirst = playerGuard.stats.spd >= enemyGuard.stats.spd;

    const order = pGoesFirst
      ? [{ g: playerGuard, tag: "player" }, { g: enemyGuard, tag: "enemy" }]
      : [{ g: enemyGuard, tag: "enemy" }, { g: playerGuard, tag: "player" }];

    for (const attacker of order) {
      if (pHP <= 0 || eHP <= 0) break;

      const defender = attacker.tag === "player"
        ? { g: enemyGuard, tag: "enemy" }
        : { g: playerGuard, tag: "player" };

      const skill = attacker.g.skills[Math.floor(Math.random() * attacker.g.skills.length)];
      const dmg = calcDamage(attacker.g, defender.g, skill);

      if (attacker.tag === "player") { eHP = Math.max(0, eHP - dmg); }
      else { pHP = Math.max(0, pHP - dmg); }

      // Check effectiveness for display
      let effectiveness = "neutral";
      const atkType = TYPE_CHART[skill.type];
      if (atkType) {
        if (atkType.strong.includes(defender.g.bodyType)) effectiveness = "super";
        const defType = TYPE_CHART[defender.g.bodyType];
        if (defType && defType.strong.includes(skill.type)) effectiveness = "weak";
      }

      log.push({
        text: `${attacker.g.name} uses ${skill.name}!`,
        type: attacker.tag,
        skill,
        damage: dmg,
        effectiveness,
        attacker: attacker.tag,
        pHP, eHP, pMaxHP, eMaxHP,
      });
    }
  }

  const won = pHP > 0;
  log.push({
    text: won ? `${playerGuard.name} WINS!` : `${playerGuard.name} was defeated...`,
    type: won ? "win" : "lose",
    pHP, eHP, pMaxHP, eMaxHP,
  });

  return { won, log, pHP, eHP, pMaxHP, eMaxHP };
}
