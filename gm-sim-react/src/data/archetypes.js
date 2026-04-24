/**
 * archetypes.js — Team archetype definitions for AI offseason behavior.
 *
 * Each AI team has an archetype that shapes how they behave during FA windows.
 * Archetypes are hardcoded per team (see ARCHETYPE_BY_ABBR below). Teams not
 * listed default to BALANCED.
 *
 * ── Archetype philosophy ──
 * BIG_SPENDER    Aggressive roster churn. Signs top-overall FAs; releases
 *                weakest starters to make room. Willing to sign if FA beats
 *                team's weakest starter by 2+ overall.
 *
 * TALENT_SEEKER  Prospect hunter. Scores FAs with an age-based ceiling bonus,
 *                preferring young high-ceiling players. Only signs if the
 *                target is age ≤ 22 AND overall ≥ 70. Protects veteran IGLs
 *                (oldest player with highest gamesense) from release.
 *
 * BALANCED       Conservative. Only considers signings that beat weakest
 *                starter by 4+ overall. Result: most balanced teams do
 *                nothing most offseasons.
 *
 * ── Offseason signing mechanics (shared across archetypes) ──
 * Each AI team rolls ONCE per offseason to determine its move count:
 *   15% → try 2 moves (drop 2 weakest, sign 2)
 *   35% → try 1 move  (drop 1 weakest, sign 1)
 *   50% → do nothing
 *
 * For each "move slot" granted, walk the FA pool sorted by fit (archetype-
 * specific scoring) and find candidates matching the archetype's criteria.
 * For each candidate: 35% chance to execute the sign, 65% chance to skip
 * and try the next candidate. If no candidate executes, move slot is wasted.
 *
 * Additionally, when the USER releases a player to the FA pool, each AI team
 * that hasn't hit its max (2) yet gets ONE extra reactive move opportunity.
 * Capped at +1 per team per offseason to prevent runaway cascades.
 */

export const ARCHETYPES = {
  BIG_SPENDER: 'BIG_SPENDER',
  TALENT_SEEKER: 'TALENT_SEEKER',
  BALANCED: 'BALANCED',
};

/**
 * Hardcoded archetype assignments keyed by team abbr.
 * Teams not listed are BALANCED by default.
 */
export const ARCHETYPE_BY_ABBR = {
  // Big spenders — aggressive roster churn
  G2:   ARCHETYPES.BIG_SPENDER,
  NRG:  ARCHETYPES.BIG_SPENDER,
  MIBR: ARCHETYPES.BIG_SPENDER,
  SEN:  ARCHETYPES.BIG_SPENDER,
  FNC:  ARCHETYPES.BIG_SPENDER,
  VIT:  ARCHETYPES.BIG_SPENDER,
  M8:   ARCHETYPES.BIG_SPENDER,
  T1:   ARCHETYPES.BIG_SPENDER,
  PRX:  ARCHETYPES.BIG_SPENDER,
  EDG:  ARCHETYPES.BIG_SPENDER,
  XLG:  ARCHETYPES.BIG_SPENDER,

  // Talent seekers — prospect hunters
  KRU:  ARCHETYPES.TALENT_SEEKER,
  LEV:  ARCHETYPES.TALENT_SEEKER,
  TL:   ARCHETYPES.TALENT_SEEKER,
  NAVI: ARCHETYPES.TALENT_SEEKER,
  VAR:  ARCHETYPES.TALENT_SEEKER,
  NS:   ARCHETYPES.TALENT_SEEKER,
  TYL:  ARCHETYPES.TALENT_SEEKER,
  TE:   ARCHETYPES.TALENT_SEEKER,
  BLG:  ARCHETYPES.TALENT_SEEKER,
};

/**
 * Display metadata for UI rendering.
 */
export const ARCHETYPE_INFO = {
  [ARCHETYPES.BIG_SPENDER]:   { label: 'Big Spender',   emoji: '💰', color: '#ffd166' },
  [ARCHETYPES.TALENT_SEEKER]: { label: 'Talent Seeker', emoji: '🌱', color: '#4ade80' },
  [ARCHETYPES.BALANCED]:      { label: 'Balanced',      emoji: '⚖️',  color: '#8a98b1' },
};

/**
 * Resolve a team's archetype. Falls back to BALANCED for any team whose
 * abbr isn't in the hardcoded map.
 */
export function archetypeFor(team) {
  return ARCHETYPE_BY_ABBR[team.abbr] || ARCHETYPES.BALANCED;
}
