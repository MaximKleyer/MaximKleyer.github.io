// Core game formulas

/** XP required to reach the next level */
export function xpForLevel(level) {
  return Math.floor(50 * Math.pow(level, 1.5));
}

/** Gold cost to level up a guard */
export function guardLevelUpCost(guardLevel) {
  return Math.floor(50 * Math.pow(guardLevel, 1.4));
}

/** Stat points awarded per guard level up */
export const STAT_POINTS_PER_LEVEL = 10;

/** Get effective stat with percent bonus applied */
export function getEffectiveStat(guard, stat) {
  const base = guard.stats?.[stat] || 0;
  const bonusPct = guard.statBonuses?.[stat] || 0;
  return Math.floor(base * (1 + bonusPct / 100));
}

/** Calculate max HP from stats and level */
export function calcHP(guard) {
  const eDef = getEffectiveStat(guard, "def");
  const eMdef = getEffectiveStat(guard, "mdef");
  return 50 + eDef * 3 + eMdef * 2 + guard.level * 5;
}

/** Calculate max energy from player level */
export function maxEnergy(playerLevel) {
  return 5 + Math.floor(playerLevel / 3);
}

/** Energy regen interval in ms (15s for dev, could be 90s for production) */
export const ENERGY_REGEN_MS = 100;
