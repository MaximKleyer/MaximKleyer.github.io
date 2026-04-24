/**
 * constants.js — All tuning knobs and configuration in one place.
 *
 * UNCHANGED FROM VANILLA VERSION.
 * This is pure data/logic — no DOM, no UI. That's why it transfers
 * directly to React with zero changes. This is a key lesson:
 * always separate your game logic from your display logic.
 */

// ── Role stat weights (how much each stat matters per role) ──
// These add up to 1.0 for each role.
// A duelist's overall is 35% aim, while a controller's is only 15% aim.
export const ROLE_WEIGHTS = {
  duelist:    { aim: 0.35, positioning: 0.15, utility: 0.15, gamesense: 0.20, clutch: 0.15 },
  initiator:  { aim: 0.20, positioning: 0.20, utility: 0.30, gamesense: 0.20, clutch: 0.10 },
  controller: { aim: 0.15, positioning: 0.25, utility: 0.30, gamesense: 0.25, clutch: 0.05 },
  sentinel:   { aim: 0.20, positioning: 0.30, utility: 0.25, gamesense: 0.20, clutch: 0.05 },
  flex:       { aim: 0.25, positioning: 0.20, utility: 0.20, gamesense: 0.20, clutch: 0.15 },
};

// ── Role-based stat floors ──
// Role specialists get higher minimums in their key stats.
// A controller will never generate with <65 utility, for example.
export const ROLE_FLOORS = {
  duelist:    { aim: 65, clutch: 55 },
  initiator:  { utility: 65, gamesense: 55 },
  controller: { utility: 65, positioning: 60 },
  sentinel:   { positioning: 65, utility: 55 },
  flex:       {},
};

export const ROSTER_MIN = 5;
export const ROSTER_MAX = 10;
export const REQUIRED_ROLES = ['duelist', 'initiator', 'controller', 'sentinel', 'flex'];
export const FREE_AGENT_POOL_SIZE = 100;

// ── Simulation tuning ──
export const SIM = {
  VARIANCE: 5,           // ±random swing on team strength per map
  UPGRADE_THRESHOLD: 7,   // CPU only swaps if FA is this many points better
  CPU_MOVE_CHANCE: 0.5,   // 70% chance CPU considers moves each week
};

export const TOTAL_TEAMS = 12;
export const GROUP_SIZE = 6;
export const REGULAR_SEASON_WEEKS = 5;
