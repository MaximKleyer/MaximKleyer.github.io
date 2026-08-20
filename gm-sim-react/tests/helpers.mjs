/**
 * Shared test helpers.
 *
 * The engine is plain ES modules with no DOM dependency apart from
 * localStorage, so tests run under `node --test` with no framework and
 * no build step. Only persistence touches a browser API, and it goes
 * through the stub below.
 */

import { initGame, ensureContracts } from '../src/engine/league.js';
import { initSeason } from '../src/engine/season.js';
import { saveGameState, loadGameState } from '../src/engine/persistence.js';

/** Install an in-memory localStorage. Returns the backing store. */
export function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
  return store;
}

/**
 * A fully initialised game, in the same shape App.jsx produces on
 * "start as <team>": init, season, contracts.
 */
export function newGame(regionKey = 'americas', teamIndex = 0) {
  const gs = initGame(regionKey, teamIndex);
  gs.season = initSeason(gs);
  ensureContracts(gs);
  return gs;
}

/** Save then load, returning the rehydrated state. Mimics a page refresh. */
export function roundTrip(gs) {
  saveGameState(gs);
  const loaded = loadGameState();
  if (!loaded) throw new Error('roundTrip: loadGameState returned null');
  return loaded;
}

export function humanTeam(gs) {
  return gs.regions[gs.humanRegion].teams.find(t => t.isHuman);
}

export function aiTeam(gs) {
  return gs.regions[gs.humanRegion].teams.find(t => !t.isHuman);
}

/** Deterministic-ish deep equality for plain data. */
export function sameJSON(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
