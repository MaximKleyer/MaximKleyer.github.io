/**
 * maps.js — Valorant map pool.
 *
 * Every map the game knows about lives in ALL_MAPS. At any moment
 * exactly POOL_SIZE (7) of them are "active" — that's the pool the veto
 * draws from, and 7 is what makes the ban/pick sequences divide evenly:
 *
 *   Bo3  ban ban pick pick ban ban → 1 decider   (2+2+2 = 6, +1 = 7)
 *   Bo5  ban ban pick pick pick pick → 1 decider (2+4   = 6, +1 = 7)
 *
 * After each completed stage one active map rotates out and one inactive
 * map rotates in, so the pool drifts over a career the way Riot's real
 * rotation does. The live pool is stored on gameState (not here) because
 * it changes during play and must survive a save/load — see
 * initMapPool() / rotateMapPool().
 *
 * `defaultBias` nudges initial team rating generation: maps that
 * historically favour one side start teams slightly higher there. It is
 * a starting tilt only — each team's ratings then diverge and drift.
 */

export const POOL_SIZE = 7;

export const ALL_MAPS = [
  { id: 'ascent',   name: 'Ascent',   defaultBias: { attack: -2, defense: +2 } },
  { id: 'bind',     name: 'Bind',     defaultBias: { attack: +2, defense: -2 } },
  { id: 'haven',    name: 'Haven',    defaultBias: { attack: +1, defense: -1 } },
  { id: 'icebox',   name: 'Icebox',   defaultBias: { attack: -2, defense: +2 } },
  { id: 'lotus',    name: 'Lotus',    defaultBias: { attack: +1, defense: -1 } },
  { id: 'split',    name: 'Split',    defaultBias: { attack: -3, defense: +3 } },
  { id: 'sunset',   name: 'Sunset',   defaultBias: { attack: 0,  defense: 0  } },
  { id: 'breeze',   name: 'Breeze',   defaultBias: { attack: +3, defense: -3 } },
  { id: 'fracture', name: 'Fracture', defaultBias: { attack: +2, defense: -2 } },
  { id: 'pearl',    name: 'Pearl',    defaultBias: { attack: -1, defense: +1 } },
  { id: 'abyss',    name: 'Abyss',    defaultBias: { attack: +1, defense: -1 } },
  { id: 'corrode',  name: 'Corrode',  defaultBias: { attack: 0,  defense: 0  } },
];

// The 7 that start active on a new save. The rest sit on the bench and
// rotate in one at a time as stages complete.
export const STARTING_ACTIVE = [
  'ascent', 'bind', 'haven', 'icebox', 'lotus', 'split', 'sunset',
];

export const MAP_BY_ID = {};
for (const m of ALL_MAPS) MAP_BY_ID[m.id] = m;

export function getMap(mapId) {
  return MAP_BY_ID[mapId] || null;
}

export function mapName(mapId) {
  return MAP_BY_ID[mapId]?.name || 'Unknown';
}

/**
 * Build the initial pool state stored on gameState.mapPool.
 * Shape: { active: [id...], inactive: [id...], history: [{out, in}] }
 */
export function initMapPool() {
  const active = STARTING_ACTIVE.filter(id => MAP_BY_ID[id]);
  const inactive = ALL_MAPS.map(m => m.id).filter(id => !active.includes(id));
  return { active, inactive, history: [] };
}

/**
 * Rotate the pool: retire one active map, promote one from the bench.
 *
 * Called once per completed stage. The retired map is the one that has
 * been active longest (front of the array), and the promoted map is the
 * one that has been benched longest — so the rotation is a fair queue
 * rather than random churn, and every map eventually gets play.
 *
 * No-ops when there is nothing benched to swap in, which keeps the pool
 * at exactly POOL_SIZE forever.
 */
export function rotateMapPool(pool) {
  if (!pool || !Array.isArray(pool.active) || !Array.isArray(pool.inactive)) return null;
  if (pool.inactive.length === 0) return null;

  const outgoing = pool.active[0];
  const incoming = pool.inactive[0];

  pool.active = [...pool.active.slice(1), incoming];
  pool.inactive = [...pool.inactive.slice(1), outgoing];
  pool.history = [...(pool.history || []), { out: outgoing, in: incoming }];

  return { out: outgoing, in: incoming };
}

/**
 * Read the active pool off a gameState, tolerating older saves that
 * predate map support (they get a freshly-built pool).
 */
export function getActivePool(gameState) {
  const pool = gameState?.mapPool;
  if (pool && Array.isArray(pool.active) && pool.active.length > 0) return pool.active;
  return initMapPool().active;
}

/* ─────────────── Team map ratings ─────────────── */

/**
 * Per-map Attack/Defense ratings are a TEAM attribute, not a roster
 * derivative — they model how much a team has practised and how
 * comfortable it is on each map. Roster churn does not move them
 * directly; they drift a few points each offseason instead.
 *
 * Generation is anchored to team strength so stronger orgs tend to be
 * better everywhere, but the per-map spread is wide enough that every
 * team ends up with genuine comfort picks and genuine weak maps — which
 * is what makes the veto a real decision.
 */

const RATING_MIN = 35;
const RATING_MAX = 99;

function clampRating(v) {
  return Math.max(RATING_MIN, Math.min(RATING_MAX, Math.round(v)));
}

/**
 * Build a full { mapId: { attack, defense } } table for one team.
 * `anchor` is the team's overall rating (roughly 60-90).
 */
export function generateMapRatings(anchor = 70) {
  const ratings = {};
  for (const m of ALL_MAPS) {
    // Per-map comfort offset: most maps land near the anchor, but each
    // team gets a couple of standouts and a couple of problem maps.
    const comfort = (Math.random() + Math.random() - 1) * 18; // ~-18..+18, bell
    const sideSplit = (Math.random() - 0.5) * 12;             // atk/def asymmetry
    ratings[m.id] = {
      attack:  clampRating(anchor + comfort + sideSplit + (m.defaultBias?.attack || 0)),
      defense: clampRating(anchor + comfort - sideSplit + (m.defaultBias?.defense || 0)),
    };
  }
  return ratings;
}

/**
 * Offseason drift. Each map/side wanders a few points so the map meta
 * shifts across seasons and a team's comfort picks are not permanent.
 * Mutates in place and backfills any map missing from an older save.
 */
export function driftMapRatings(ratings, anchor = 70, maxDrift = 4) {
  if (!ratings) return generateMapRatings(anchor);
  for (const m of ALL_MAPS) {
    if (!ratings[m.id]) {
      // New map added to the game since this save was created.
      ratings[m.id] = generateMapRatings(anchor)[m.id];
      continue;
    }
    const r = ratings[m.id];
    // Pull gently toward the team's current strength so a rebuilt roster
    // eventually shows up in map results, then add noise on top.
    r.attack  = clampRating(r.attack  + (anchor - r.attack)  * 0.15 + (Math.random() * 2 - 1) * maxDrift);
    r.defense = clampRating(r.defense + (anchor - r.defense) * 0.15 + (Math.random() * 2 - 1) * maxDrift);
  }
  return ratings;
}

/**
 * A team's rating for one map on one side. Falls back to a neutral 70
 * for saves or teams that somehow lack an entry, so the sim never NaNs.
 */
export function teamMapRating(team, mapId, side) {
  const entry = team?.mapRatings?.[mapId];
  if (!entry) return 70;
  return side === 'attack' ? (entry.attack ?? 70) : (entry.defense ?? 70);
}

/**
 * Overall comfort on a map, used by the AI when banning/picking and for
 * sorting the Roster map panel.
 */
export function teamMapOverall(team, mapId) {
  const entry = team?.mapRatings?.[mapId];
  if (!entry) return 70;
  return Math.round(((entry.attack ?? 70) + (entry.defense ?? 70)) / 2);
}

/* ─────────────── Current-pool singleton ─────────────── */

/**
 * The batch simulation paths (bracket.js, swiss.js, bracketWorlds.js …)
 * play whole series without gameState in scope, so they cannot read
 * gameState.mapPool directly. Threading gameState through all of them
 * would touch a lot of unrelated signatures, so instead the live active
 * pool is mirrored here whenever it changes.
 *
 * This is safe because exactly one gameState is live at a time in the
 * app. It is a mirror, never the source of truth — gameState.mapPool is
 * what persists, and syncCurrentPool() is called on init, on load, and
 * on every state change from App.jsx.
 */
let CURRENT_POOL = [...STARTING_ACTIVE];

export function syncCurrentPool(gameState) {
  const active = gameState?.mapPool?.active;
  if (Array.isArray(active) && active.length > 0) CURRENT_POOL = [...active];
  return CURRENT_POOL;
}

export function getCurrentPool() {
  return CURRENT_POOL;
}
