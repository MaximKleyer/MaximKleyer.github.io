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
import { Player, registerTag } from '../classes/Player.js';
import { REGION_KEYS } from '../data/regions.js';
import { initMapPool, generateMapRatings, syncCurrentPool, tier1MapAnchor } from '../data/maps.js';
import { DEFAULT_SALARY_CAP, syncSalaryCap } from '../data/salary.js';
import { initTier2Region } from './tier2.js';
import { inferRoleFromStats } from '../data/roles.js';
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
  if (!gameState) return false;
  try {
    const json = serialize(gameState);
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch (e) {
    // Usually QuotaExceededError. The caller must surface this — playing
    // on against a stale save and discovering the loss at tab close is
    // strictly worse than being told now.
    console.error('Save failed:', e);
    return false;
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
    if (!region) continue;
    for (const t of region.teams || []) {
      teamIdMap.set(t, { region: rk, abbr: t.abbr, tier: 1 });
    }
    // Tier-2 teams are canonical too. Without them here they would fall
    // through the replacer as ordinary objects, deserialize as plain data
    // with no class identity, and lose every getter the sim relies on.
    for (const t of region.tier2?.teams || []) {
      teamIdMap.set(t, { region: rk, abbr: t.abbr, tier: 2 });
    }
  }

  // Match identity map. In-flight series entries hold DIRECT references
  // to match objects that also live in their canonical containers
  // (region.schedule, region.bracket, international, worlds). Without
  // identity, JSON.stringify writes the shared object twice and a reload
  // resurrects two independent copies — the finished series then writes
  // its result to the orphan, the canonical match still reads unplayed,
  // and the stage re-seeds and REPLAYS the series with stats and records
  // double-counted. Same disease the team __ref markers cure, so same
  // cure: first visit serializes the body plus a __matchId, every later
  // visit emits a { __ref:'match' } marker the loader resolves back to
  // one object.
  const matchIdMap = new Map();
  let nextMatchId = 1;
  for (const entry of gameState.season?.activeSeries || []) {
    for (const key of ['matchRef', 'bracketMatchRef', 'intlMatchRef']) {
      const m = entry[key];
      if (m && typeof m === 'object' && !matchIdMap.has(m)) {
        matchIdMap.set(m, nextMatchId++);
      }
    }
  }

  const seen = new WeakSet();
  const seenMatches = new WeakSet();

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
    // The toggle promises it survives refresh; the explicit field list
    // was silently dropping it.
    godMode: gameState.godMode === true,
  };

  return JSON.stringify(ordered, (key, value) => {
    // Shared match objects — see matchIdMap above.
    if (value && typeof value === 'object' && matchIdMap.has(value)) {
      const id = matchIdMap.get(value);
      if (seenMatches.has(value)) {
        return { __ref: 'match', id };
      }
      seenMatches.add(value);
      // Shallow copy so the id rides along without mutating live state.
      return { ...value, __matchId: id };
    }

    // Team detection via the identity map
    if (value && typeof value === 'object' && teamIdMap.has(value)) {
      const ident = teamIdMap.get(value);
      if (seen.has(value)) {
        return { __ref: 'team', region: ident.region, abbr: ident.abbr, tier: ident.tier };
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
        tier: ident.tier,
        parentAbbr: value.parentAbbr,
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
        // Where this player belongs. Slotting them elsewhere costs
        // rating, so losing this would silently change performance.
        primaryRole: value.primaryRole,
        secondaryRole: value.secondaryRole,
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
      region.teams = region.teams.map(td => rehydrateTeam(td, rk, teamMap, 1));
    }

    if (Array.isArray(region.tier2?.teams)) {
      region.tier2.teams = region.tier2.teams.map(td => rehydrateTeam(td, rk, teamMap, 2));
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
  // Pass 1.5: restore match identity — collect __matchId bodies, then
  // point every { __ref:'match' } marker back at the one real object.
  // Must run before the team walk so the shared body's team refs are
  // resolved exactly once.
  resolveMatchRefs(data);

  walkAndReplace(data, teamMap, new Set());

  // Reseed the tag-uniqueness pool from every living player. Same
  // mirror-resync pattern as syncCurrentPool/syncSalaryCap below — and
  // it must run before any migration that generates players.
  for (const rk of REGION_KEYS) {
    const region = data.regions?.[rk];
    if (!region) continue;
    for (const t of region.teams || []) for (const pl of t.roster) registerTag(pl.tag);
    for (const t of region.tier2?.teams || []) for (const pl of t.roster) registerTag(pl.tag);
    for (const pl of region.freeAgents || []) registerTag(pl.tag);
  }

  // Pass 2.5: saves written before match identity existed already contain
  // detached copies. Re-link them structurally so an old mid-series save
  // doesn't replay its bracket games. No-op for new saves.
  relinkActiveSeriesRefs(data);

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

  // Saves written before tier 2 existed have no second division. Generate
  // one rather than leaving the region permanently empty — without this
  // an existing save can never see the tier-2 scene at all.
  for (const rk of REGION_KEYS) {
    const region = data.regions?.[rk];
    if (!region) continue;
    if (!region.tier2?.teams?.length) {
      region.tier2 = initTier2Region(rk, data.seasonNumber || 2025);
    }
  }
  for (const rk of REGION_KEYS) {
    for (const team of data.regions?.[rk]?.teams || []) {
      if (!team.mapRatings || Object.keys(team.mapRatings).length === 0) {
        team.mapRatings = generateMapRatings(tier1MapAnchor(team.overallRating));
        continue;
      }
      // Saves written before the 75 anchor carry ratings centred on the
      // old anchor (raw team overall). Re-centre them ONCE: shift every
      // side by the same amount, so the team's relative spread — its
      // standout maps, its problem maps, everything training earned —
      // is preserved exactly. Only ever shifts UP (a mean above target
      // is left alone), and the 2-point tolerance makes reloads no-ops.
      liftMapRatingsToAnchor(team);
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
function rehydrateTeam(td, regionKey, teamMap, tier = 1) {
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

  team.tier = td.tier ?? tier;
  team.parentAbbr = td.parentAbbr ?? null;
  // Key by tier as well as abbr: a tier-2 academy could otherwise be
  // confused with its tier-1 parent when refs are resolved.
  teamMap.set(`${regionKey}:${team.tier}:${team.abbr}`, team);
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
  if (pd.primaryRole) {
    player.primaryRole = pd.primaryRole;
    player.secondaryRole = pd.secondaryRole ?? null;
  } else {
    // Save predates roles. Infer from the stats the player already has
    // so their tag agrees with their profile rather than being random.
    const inferred = inferRoleFromStats(player);
    player.primaryRole = inferred.primaryRole;
    player.secondaryRole = inferred.secondaryRole;
  }

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
        node[i] = resolveTeamRef(teamMap, v);
      } else {
        walkAndReplace(v, teamMap, visited);
      }
    }
  } else {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (isRefMarker(v)) {
        node[k] = resolveTeamRef(teamMap, v);
      } else {
        walkAndReplace(v, teamMap, visited);
      }
    }
  }
}

/**
 * One-time upward re-centre of a tier-1 team's map ratings onto the
 * current anchor. See the migration site above for the rationale.
 */
function liftMapRatingsToAnchor(team) {
  const entries = Object.values(team.mapRatings);
  if (entries.length === 0) return;
  const mean = entries.reduce((s, r) => s + ((r.attack ?? 70) + (r.defense ?? 70)) / 2, 0)
    / entries.length;
  const target = tier1MapAnchor(team.overallRating);
  const shift = target - mean;
  if (shift <= 2) return;   // already there (or above) — leave alone
  for (const r of entries) {
    r.attack = Math.max(1, Math.min(99, Math.round((r.attack ?? 70) + shift)));
    r.defense = Math.max(1, Math.min(99, Math.round((r.defense ?? 70) + shift)));
  }
}

/**
 * Restore match identity after JSON.parse. Two walks: collect every
 * object carrying a __matchId (stripping the marker), then replace every
 * { __ref:'match', id } with the collected object. See serialize().
 */
function resolveMatchRefs(root) {
  const byId = new Map();

  const collect = (node, visited) => {
    if (node === null || typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);
    if (!Array.isArray(node) && typeof node.__matchId === 'number') {
      byId.set(node.__matchId, node);
      delete node.__matchId;
    }
    for (const k of Array.isArray(node) ? node.keys() : Object.keys(node)) {
      collect(node[k], visited);
    }
  };

  const replace = (node, visited) => {
    if (node === null || typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);
    for (const k of Array.isArray(node) ? node.keys() : Object.keys(node)) {
      const v = node[k];
      if (v && typeof v === 'object' && v.__ref === 'match') {
        // An unresolvable id keeps the marker replaced by null rather
        // than a dangling pseudo-match; relink below can still repair it.
        node[k] = byId.get(v.id) || null;
      } else {
        replace(v, visited);
      }
    }
  };

  collect(root, new Set());
  replace(root, new Set());
}

/**
 * Legacy repair: for saves written before match identity, re-point each
 * active-series entry's match refs at the canonical match object by
 * structure — the group phase by schedule index, every bracket phase by
 * its (still canonical, thanks to team __refs) team pair among the
 * container's unresolved matches. Idempotent on healthy saves.
 */
function relinkActiveSeriesRefs(data) {
  const entries = data.season?.activeSeries || [];
  if (entries.length === 0) return;

  const collectMatches = (node, out, visited) => {
    if (node === null || typeof node !== 'object') return;
    if (node instanceof Team || node instanceof Player) return;
    if (visited.has(node)) return;
    visited.add(node);
    if (!Array.isArray(node)
        && 'teamA' in node && 'teamB' in node && 'result' in node) {
      out.push(node);
    }
    for (const k of Array.isArray(node) ? node.keys() : Object.keys(node)) {
      collectMatches(node[k], out, visited);
    }
  };

  for (const entry of entries) {
    let canonical = null;

    if (entry.phase === 'group' && typeof entry.scheduleIdx === 'number') {
      const m = data.regions?.[entry.regionKey]?.schedule?.[entry.scheduleIdx];
      if (m && m.teamA === entry.teamA && m.teamB === entry.teamB) canonical = m;
    } else {
      const container =
        entry.phase === 'bracket' ? data.regions?.[entry.regionKey]?.bracket
        : entry.phase?.startsWith('international') ? data.international
        : entry.phase?.startsWith('worlds') ? data.worlds
        : null;
      if (container) {
        const candidates = [];
        collectMatches(container, candidates, new Set());
        canonical = candidates.find(m =>
          !m.result && m.teamA === entry.teamA && m.teamB === entry.teamB
        ) || null;
      }
    }

    if (!canonical) continue;
    if ('matchRef' in entry) entry.matchRef = canonical;
    if ('bracketMatchRef' in entry) entry.bracketMatchRef = canonical;
    if ('intlMatchRef' in entry) entry.intlMatchRef = canonical;
  }
}

/**
 * Resolve a { __ref:'team' } marker. Saves written before tier 2 carry no
 * `tier`, so fall back to tier 1 and then to a bare abbr lookup.
 */
function resolveTeamRef(teamMap, v) {
  const tier = v.tier ?? 1;
  return teamMap.get(`${v.region}:${tier}:${v.abbr}`)
      || teamMap.get(`${v.region}:1:${v.abbr}`)
      || null;
}

function isRefMarker(v) {
  return v && typeof v === 'object' && v.__ref === 'team';
}
