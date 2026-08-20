/**
 * persistence.js — localStorage save/load for the game state.
 *
 * The gameState contains live Team and Player class instances. Naive
 * JSON.stringify would strip their getters/methods, and naive JSON.parse
 * would give back plain objects with no class identity. We handle this
 * with a two-phase approach:
 *
 * ── Serialization ──
 * JSON.stringify is called with a replacer that:
 *   1. Tracks team instances via a WeakSet ("seen").
 *   2. On first visit to a team (which, by object key iteration order,
 *      is always inside regions[rk].teams), serializes full team data
 *      as { __type: 'team', region, abbr, ...fields }.
 *   3. On subsequent visits (schedule, brackets, intl, worlds, etc.),
 *      serializes a reference marker { __ref: 'team', region, abbr }.
 *   4. Players are always serialized as data since they're only ever
 *      held inside team rosters or region.freeAgents (no cross-refs).
 *
 * For this to work, the output object passed to stringify must visit
 * regions BEFORE anything else that references teams. We enforce this
 * by constructing an explicit ordered wrapper in saveGameState().
 *
 * ── Deserialization ──
 * Pass 1: JSON.parse into plain data. Then walk regions[rk].teams and
 * freeAgents, rehydrating each into Team/Player class instances. Build
 * a lookup map of "region:abbr" → Team instance.
 *
 * Pass 2: Walk the entire tree, and anywhere we find a { __ref: 'team' }
 * marker, replace it in-place with the actual Team instance from the map.
 * After this pass, every team reference in the gameState points to the
 * canonical instance, preserving identity-comparison semantics.
 *
 * ── Circuit safety ──
 * Match results, brackets, and intl/worlds state all contain team refs
 * across many fields (teamA, teamB, winner, loser, eliminated[], etc.).
 * The generic walker handles all of them without needing to know the
 * schema of each container.
 */

import { Team } from '../classes/Team.js';
import { Player } from '../classes/Player.js';
import { REGION_KEYS } from '../data/regions.js';
import { initMapPool, generateMapRatings, syncCurrentPool } from '../data/maps.js';
import { DEFAULT_SALARY_CAP, syncSalaryCap } from '../data/salary.js';
import { ensureContracts } from './league.js';

const SAVE_KEY = 'gm-sim-save-v2';

/**
 * Check whether a save exists in localStorage.
 */
export function hasSave() {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Delete the save. Called from the "Delete Save" button.
 * Also clears any older-version saves so a fresh start is truly fresh.
 */
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    // Legacy cleanup — remove any known prior save keys so they can't
    // shadow a fresh game if the schema gets rolled back in dev.
    localStorage.removeItem('gm-sim-save-v1');
  } catch (e) {
    console.error('Failed to clear save:', e);
  }
}

/**
 * Serialize and write the current gameState to localStorage.
 * Safe to call on every state change — localStorage writes are fast.
 */
export function saveGameState(gameState) {
  if (!gameState) return;
  try {
    const json = serialize(gameState);
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.error('Save failed:', e);
  }
}

/**
 * Load and rehydrate the gameState from localStorage.
 * Returns null if no save exists or if the save is corrupted.
 */
export function loadGameState() {
  let json;
  try {
    json = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!json) return null;

  try {
    return deserialize(json);
  } catch (e) {
    console.error('Load failed — save may be corrupted:', e);
    return null;
  }
}

/* ─────────────── Internal: serialize ─────────────── */

function serialize(gameState) {
  // Build team identity map: team instance → { region, abbr }
  // This is used to emit ref markers for non-canonical team visits.
  const teamIdMap = new Map();
  for (const rk of REGION_KEYS) {
    const region = gameState.regions?.[rk];
    if (!region?.teams) continue;
    for (const t of region.teams) {
      teamIdMap.set(t, { region: rk, abbr: t.abbr });
    }
  }

  const seen = new WeakSet();

  // Force key iteration order: regions FIRST so teams get seen before
  // any reference in season/international/worlds/archive.
  //
  // `archive` MUST stay after `regions` — archived seasons hold team
  // references (worldChampion, runnerUp), which only serialize correctly
  // as __ref markers once the canonical teams have been visited.
  const ordered = {
    regions: gameState.regions,
    season: gameState.season,
    international: gameState.international,
    worlds: gameState.worlds,
    archive: gameState.archive,
    seasonNumber: gameState.seasonNumber,
    mapPool: gameState.mapPool,
    settings: gameState.settings,
    humanRegion: gameState.humanRegion,
    humanTeamIndex: gameState.humanTeamIndex,
  };

  return JSON.stringify(ordered, (key, value) => {
    // Team detection via the identity map
    if (value && typeof value === 'object' && teamIdMap.has(value)) {
      const ident = teamIdMap.get(value);
      if (seen.has(value)) {
        return { __ref: 'team', region: ident.region, abbr: ident.abbr };
      }
      seen.add(value);
      // First visit → serialize full team data. Note: we cannot return
      // `value` itself because it's a class instance and JSON would skip
      // getters. Return a plain object with the own properties explicitly
      // enumerated, plus the region key so the loader knows where to
      // place the rehydrated instance.
      return {
        __type: 'team',
        region: ident.region,
        name: value.name,
        abbr: value.abbr,
        color: value.color,
        isHuman: value.isHuman,
        record: value.record,
        group: value.group,
        strategy: value.strategy,
        // Phase 7 cap state — without this, buyout dead cap silently
        // resets to empty on every load.
        deadCapHits: value.deadCapHits,
        // Per-map Attack/Defense strengths.
        mapRatings: value.mapRatings,
        // Signing-window budgets. These are consumed across MULTIPLE ticks
        // (the mid-season window spans stages; reactive offseason signings
        // fire when the user releases someone later), so losing them on
        // reload would silently refund a team's signing allowance.
        _midseasonMoves: value._midseasonMoves,
        _offseasonMoves: value._offseasonMoves,
        roster: value.roster,
      };
    }

    // Player detection — check for class identity.
    if (
      value && typeof value === 'object' &&
      value instanceof Player
    ) {
      return {
        __type: 'player',
        id: value.id,
        name: value.name,
        tag: value.tag,
        age: value.age,
        nationality: value.nationality,
        ratings: value.ratings,
        overall: value.overall,
        stats: value.stats,
        // Phase 6h per-stage stat snapshots.
        stageStats: value.stageStats,
        // Phase 7 morale + contract. `contract` in particular MUST be
        // saved: ensureContracts() treats a missing contract as "needs
        // one" and rolls a fresh random deal, so omitting it silently
        // re-randomizes every salary in the league on every load.
        morale: value.morale,
        moraleHistory: value.moraleHistory,
        contract: value.contract,
        // Drives the Roster delta indicators after an offseason.
        lastOffseasonDelta: value.lastOffseasonDelta,
      };
    }

    return value;
  });
}

/* ─────────────── Internal: deserialize ─────────────── */

function deserialize(json) {
  const data = JSON.parse(json);

  // Pass 1: rehydrate canonical teams and players inside regions[rk].
  // Build a lookup so refs can be resolved in pass 2.
  const teamMap = new Map(); // "region:abbr" → Team instance

  for (const rk of REGION_KEYS) {
    const region = data.regions?.[rk];
    if (!region) continue;

    if (Array.isArray(region.teams)) {
      region.teams = region.teams.map(td => rehydrateTeam(td, rk, teamMap));
    }

    if (Array.isArray(region.freeAgents)) {
      region.freeAgents = region.freeAgents.map(pd => rehydratePlayer(pd));
    }
  }

  // Pass 2: walk the entire tree and replace __ref markers with actual
  // Team instances from teamMap. Also catches any Player markers that
  // may be reached from outside the canonical roster arrays (e.g. inside
  // schedule match result objects — though currently there shouldn't be
  // any, this is defensive).
  walkAndReplace(data, teamMap, new Set());

  // Pass 3: schema migration. Older saves predate Phase 6c's seasonNumber
  // and archive fields; if we don't fill them in here, the first call to
  // beginNewSeason() will throw (cannot push to undefined) and the user
  // will see "Start Season button does nothing." Idempotent — only adds
  // missing fields, never overwrites existing values.
  if (typeof data.seasonNumber !== 'number') {
    data.seasonNumber = 2025;
  }
  if (!Array.isArray(data.archive)) {
    data.archive = [];
  }
  // Saves predating map support get a fresh pool, and any team missing
  // map ratings gets a generated set anchored to its current strength.
  if (!data.mapPool || !Array.isArray(data.mapPool.active) || data.mapPool.active.length === 0) {
    data.mapPool = initMapPool();
  }
  // Keep the batch-sim mirror in step with the pool we just loaded.
  syncCurrentPool(data);

  // Settings. Saves predating them get the defaults.
  if (!data.settings || typeof data.settings !== 'object') data.settings = {};
  if (typeof data.settings.salaryCap !== 'number' || data.settings.salaryCap <= 0) {
    data.settings.salaryCap = DEFAULT_SALARY_CAP;
  }
  syncSalaryCap(data);
  for (const rk of REGION_KEYS) {
    for (const team of data.regions?.[rk]?.teams || []) {
      if (!team.mapRatings || Object.keys(team.mapRatings).length === 0) {
        team.mapRatings = generateMapRatings(team.overallRating || 70);
      }
    }
  }
  // Legacy status migration: very old saves used 'complete' for end-of-season,
  // Phase 6c renamed it to 'season-complete'. Translate so the new flow works.
  if (data.season?.status === 'complete') {
    data.season.status = 'season-complete';
  }

  // Pass 4: Phase 7 contract/morale migration. Idempotent — adds
  // contracts and morale fields to any rostered player that lacks
  // them, leaves anyone already-migrated alone. Backfills team-level
  // deadCapHits arrays. Free agents get morale but no contract.
  ensureContracts(data);

  return data;
}

/**
 * Rehydrate a serialized team data object into a Team class instance.
 * The roster is rehydrated recursively (players into Player instances).
 */
function rehydrateTeam(td, regionKey, teamMap) {
  if (td instanceof Team) return td; // already rehydrated (defensive)
  const team = new Team(td.name, td.abbr, td.color);
  team.isHuman = td.isHuman === true;
  if (td.record) team.record = { ...td.record };
  if (td.group !== undefined) team.group = td.group;
  if (td.strategy) team.strategy = td.strategy;
  // Restore cap state. Left as the constructor's [] for pre-Phase-7
  // saves, which ensureContracts() then backfills.
  if (Array.isArray(td.deadCapHits)) team.deadCapHits = td.deadCapHits;
  if (td.mapRatings && typeof td.mapRatings === 'object') team.mapRatings = td.mapRatings;
  if (typeof td._midseasonMoves === 'number') team._midseasonMoves = td._midseasonMoves;
  if (typeof td._offseasonMoves === 'number') team._offseasonMoves = td._offseasonMoves;
  // Migration: `starters` used to be a separate id list. The depth chart
  // now IS the roster order, so lift those players to the top and drop
  // the field. Saves written after this keep their order naturally.
  if (Array.isArray(td.starters) && td.starters.length > 0) {
    const rank = new Map(td.starters.map((id, i) => [id, i]));
    team.roster.sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
      const rb = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });
  }

  // Roster: each entry is a serialized player
  if (Array.isArray(td.roster)) {
    team.roster = td.roster.map(pd => rehydratePlayer(pd));
  }

  teamMap.set(`${regionKey}:${team.abbr}`, team);
  return team;
}

/**
 * Rehydrate a serialized player data object into a Player class instance.
 * Note: Player's constructor recomputes `overall` from ratings via
 * calcOverall(), so we pass ratings through the constructor then overwrite
 * the id and stats from the saved data to preserve identity and progress.
 */
function rehydratePlayer(pd) {
  if (pd instanceof Player) return pd;
  if (!pd) return null;

  const player = new Player(
    pd.name,
    pd.tag,
    pd.ratings || {},
    { age: pd.age, nationality: pd.nationality }
  );
  player.id = pd.id;
  if (pd.stats) player.stats = { ...pd.stats };
  if (pd.stageStats) player.stageStats = { ...pd.stageStats };

  // Phase 7 fields. Each is only applied when actually present, so
  // older saves fall through to the constructor defaults and get
  // backfilled by ensureContracts() — the real migration path.
  if (typeof pd.morale === 'number') player.morale = pd.morale;
  if (Array.isArray(pd.moraleHistory)) player.moraleHistory = pd.moraleHistory;
  if (pd.contract) player.contract = { ...pd.contract };
  if (pd.lastOffseasonDelta) player.lastOffseasonDelta = pd.lastOffseasonDelta;

  return player;
}

/**
 * Recursively walk every object/array in the tree, replacing any
 * { __ref: 'team', region, abbr } markers with the canonical Team instance
 * from teamMap. Mutates the input.
 *
 * Guards against cycles via a visited WeakSet — shouldn't happen with
 * refs-not-instances, but defensive.
 */
function walkAndReplace(node, teamMap, visited) {
  if (node === null || typeof node !== 'object') return;
  if (node instanceof Team || node instanceof Player) return;
  if (visited.has(node)) return;
  visited.add(node);

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (isRefMarker(v)) {
        node[i] = teamMap.get(`${v.region}:${v.abbr}`) || null;
      } else {
        walkAndReplace(v, teamMap, visited);
      }
    }
  } else {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (isRefMarker(v)) {
        node[k] = teamMap.get(`${v.region}:${v.abbr}`) || null;
      } else {
        walkAndReplace(v, teamMap, visited);
      }
    }
  }
}

function isRefMarker(v) {
  return v && typeof v === 'object' && v.__ref === 'team';
}
