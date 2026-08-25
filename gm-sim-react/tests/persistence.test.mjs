/**
 * persistence.test.mjs — the save boundary.
 *
 * WHY THIS FILE EXISTS
 *
 * Four separate bugs in this codebase have had the same shape: state
 * that was correct in memory but did not survive save → load. None of
 * them threw. All were invisible without deliberately reloading and
 * diffing:
 *
 *   - seasonNumber / archive were never serialized, so season history
 *     was wiped on every refresh.
 *   - player.contract was never serialized, so ensureContracts() saw a
 *     missing contract, assumed the player needed one, and RE-ROLLED A
 *     RANDOM SALARY for every player in the league on every load.
 *   - season._offseasonSummaryRef aliased an archive entry in memory;
 *     JSON split them into two objects, so the archived offseason
 *     report silently read zeros.
 *   - handleStrategyUpdate mutated a Team in place without changing the
 *     gameState reference, so the auto-save effect never fired.
 *
 * The FIELD REGISTRY below is the guard against a fifth. Every own
 * property of Team, Player and gameState must be listed with an
 * explicit decision about whether it is persisted. Add a field to a
 * class without updating the registry and this file fails, forcing the
 * decision to be made rather than forgotten.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { seedActiveSeries, findActiveSeriesForMatch } from '../src/engine/activeSeries.js';
import { installLocalStorage, newGame, roundTrip, humanTeam } from './helpers.mjs';
import { Team } from '../src/classes/Team.js';
import { Player, generatePlayer } from '../src/classes/Player.js';
import { DEFAULT_SALARY_CAP } from '../src/data/salary.js';

before(() => { installLocalStorage(); });

/* ─────────────── Field registry ─────────────── */
//
// persisted:true  → must survive a round trip with its value intact.
// persisted:false → deliberately not saved; `why` documents the reason.

const TEAM_FIELDS = {
  name:         { persisted: true },
  abbr:         { persisted: true },
  color:        { persisted: true },
  roster:       { persisted: true },
  isHuman:      { persisted: true },
  record:       { persisted: true },
  group:        { persisted: true },
  strategy:     { persisted: true },
  deadCapHits:  { persisted: true },
  mapRatings:   { persisted: true },
  // Added lazily by the signing engines, not the constructor. Both are
  // consumed across multiple ticks, so both must persist or a reload
  // refunds the team's signing allowance.
  _midseasonMoves: { persisted: true, lazy: true },
  _offseasonMoves: { persisted: true, lazy: true },
  archetype:    { persisted: false, why: 'recomputed from abbr by the Team constructor' },
  // 1 = franchised top flight, 2 = the open second division.
  tier:         { persisted: true },
  parentAbbr:   { persisted: true },
};

const PLAYER_FIELDS = {
  id:            { persisted: true },
  name:          { persisted: true },
  tag:           { persisted: true },
  ratings:       { persisted: true },
  overall:       { persisted: true },
  age:           { persisted: true },
  nationality:   { persisted: true },
  stats:         { persisted: true },
  stageStats:    { persisted: true },
  morale:        { persisted: true },
  moraleHistory: { persisted: true },
  contract:      { persisted: true },
  // Where the player belongs. Slotting them elsewhere costs rating, so
  // losing these would silently change match performance.
  primaryRole:   { persisted: true },
  secondaryRole: { persisted: true },
  // Set by the offseason development pass; drives the Roster deltas.
  lastOffseasonDelta: { persisted: true, lazy: true },
};

const GAMESTATE_FIELDS = {
  regions:         { persisted: true },
  season:          { persisted: true },
  // Created lazily when the circuit reaches those slots, so a fresh
  // gameState has neither. Still serialized once they exist.
  international:   { persisted: true, lazy: true },
  worlds:          { persisted: true, lazy: true },
  archive:         { persisted: true },
  seasonNumber:    { persisted: true },
  mapPool:         { persisted: true },
  settings:        { persisted: true },
  humanRegion:     { persisted: true },
  humanTeamIndex:  { persisted: true },
};

function assertRegistryCovers(label, instance, registry) {
  const actual = Object.keys(instance).sort();
  const known = Object.keys(registry).sort();
  const unregistered = actual.filter(k => !known.includes(k));
  // Lazily-created fields are legitimately absent from a fresh instance.
  const stale = known.filter(k => !actual.includes(k) && !registry[k].lazy);

  assert.deepEqual(unregistered, [],
    `${label} has field(s) no one has decided about: ${unregistered.join(', ')}.\n` +
    `  Add each to the registry in tests/persistence.test.mjs.\n` +
    `  If it holds state, ALSO add it to serialize() and the rehydrate\n` +
    `  function in src/engine/persistence.js — four bugs have come from\n` +
    `  exactly this omission.`);

  assert.deepEqual(stale, [],
    `${label} registry lists field(s) that no longer exist: ${stale.join(', ')}. Remove them.`);
}

describe('field registry', () => {
  // Checking a freshly-constructed instance is not enough: three fields
  // (_midseasonMoves, _offseasonMoves, lastOffseasonDelta) are attached
  // later by the signing and development engines, and all three were
  // unserialized precisely because a constructor-only check never saw
  // them. Exercise the engine first, then look again.
  test('no unregistered fields appear after gameplay', async () => {
    const { runOffseasonAISignings } = await import('../src/engine/offseason.js');
    const { runMidseasonAISignings } = await import('../src/engine/midseason.js');
    const gs = newGame();
    runMidseasonAISignings(gs);
    runOffseasonAISignings(gs);

    for (const rk of Object.keys(gs.regions)) {
      for (const team of gs.regions[rk].teams) {
        assertRegistryCovers('Team (after gameplay)', team, TEAM_FIELDS);
        for (const player of team.roster) {
          assertRegistryCovers('Player (after gameplay)', player, PLAYER_FIELDS);
        }
      }
    }
  });

  test('Team has no unregistered fields', () => {
    assertRegistryCovers('Team', new Team('Test', 'TST', '#fff'), TEAM_FIELDS);
  });

  test('Player has no unregistered fields', () => {
    assertRegistryCovers('Player', generatePlayer({ regionKey: 'americas' }), PLAYER_FIELDS);
  });

  test('gameState has no unregistered top-level fields', () => {
    assertRegistryCovers('gameState', newGame(), GAMESTATE_FIELDS);
  });

  test('every field the registry marks persisted survives a round trip', () => {
    const gs = newGame();
    // Populate the lazy fields so they are actually exercised rather than
    // skipped — an unserialized lazy field is exactly the bug we hit.
    gs.international = { phase: 'swiss', swiss: { round: 2 } };
    gs.worlds = { phase: 'groups', groups: { A: { round: 1 } } };

    const loaded = roundTrip(gs);
    for (const [field, spec] of Object.entries(GAMESTATE_FIELDS)) {
      if (!spec.persisted) continue;
      assert.ok(field in loaded,
        `gameState.${field} is marked persisted but is missing after a round trip — ` +
        `add it to the ordered wrapper in serialize()`);
    }
    // and that the lazy ones kept their contents, not just their keys
    assert.equal(loaded.international.phase, 'swiss');
    assert.equal(loaded.international.swiss.round, 2);
    assert.equal(loaded.worlds.phase, 'groups');
  });
});

/* ─────────────── Round trip preserves values ─────────────── */

describe('round trip preserves state', () => {
  test('every persisted Team field keeps its value', () => {
    const gs = newGame();
    const team = humanTeam(gs);

    // Dirty each persisted field with a distinctive value so a field that
    // silently resets to its constructor default is caught, not just one
    // that vanishes entirely.
    team.record = { wins: 7, losses: 3, mapWins: 15, mapLosses: 9, roundWins: 200, roundLosses: 180 };
    team.group = 'B';
    team.deadCapHits = [{ year: 2026, amount: 250000, fromPlayerTag: 'cut1' }];
    team.mapRatings.ascent = { attack: 91, defense: 44 };
    team.strategy = { ...team.strategy, comp: team.strategy.comp, iglId: team.roster[1].id };

    const loaded = humanTeam(roundTrip(gs));

    assert.equal(loaded.record.wins, 7);
    assert.equal(loaded.record.roundWins, 200);
    assert.equal(loaded.group, 'B');
    assert.equal(loaded.deadCapHits.length, 1);
    assert.equal(loaded.deadCapHits[0].amount, 250000);
    assert.deepEqual(loaded.mapRatings.ascent, { attack: 91, defense: 44 });
    assert.equal(loaded.strategy.iglId, team.roster[1].id);
  });

  test('every persisted Player field keeps its value', () => {
    const gs = newGame();
    const p = humanTeam(gs).roster[0];

    p.stats = { kills: 111, deaths: 22, assists: 33, acs: 4400, maps: 20 };
    p.stageStats = { 1: { kills: 50, deaths: 10, assists: 5, acs: 2000, maps: 9 } };
    p.morale = 91;
    p.moraleHistory = [{ delta: 12, reason: 'won championship' }];
    p.contract = { salary: 987654, yearsRemaining: 3, signedYear: 2026 };
    p.age = 27;

    const loaded = humanTeam(roundTrip(gs)).roster.find(x => x.id === p.id);

    assert.ok(loaded, 'player disappeared across the round trip');
    assert.equal(loaded.stats.kills, 111);
    assert.equal(loaded.stageStats[1].kills, 50);
    assert.equal(loaded.morale, 91);
    assert.equal(loaded.moraleHistory.length, 1);
    assert.deepEqual(loaded.contract, { salary: 987654, yearsRemaining: 3, signedYear: 2026 });
    assert.equal(loaded.age, 27);
  });

  test('classes rehydrate as instances, not plain objects', () => {
    const loaded = roundTrip(newGame());
    const team = humanTeam(loaded);
    assert.ok(team instanceof Team, 'team is not a Team instance');
    assert.ok(team.roster[0] instanceof Player, 'player is not a Player instance');
    // Getters only exist on real instances.
    assert.equal(typeof team.overallRating, 'number');
    assert.equal(typeof team.startingFive, 'object');
  });

  test('team references resolve to the same instance, not copies', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    gs.archive = [{ year: 2025, history: [], worldChampion: team, runnerUp: null,
                    offseasonSummary: {}, statsSnapshot: {} }];

    const loaded = roundTrip(gs);
    assert.equal(loaded.archive[0].worldChampion, humanTeam(loaded),
      'archived team ref deserialized as a copy — identity comparisons will silently fail');
  });

  test('a second round trip is stable', () => {
    const once = roundTrip(newGame());
    const twice = roundTrip(once);
    assert.equal(twice.seasonNumber, once.seasonNumber);
    assert.equal(
      JSON.stringify(humanTeam(twice).roster.map(p => p.contract)),
      JSON.stringify(humanTeam(once).roster.map(p => p.contract)));
  });
});

/* ─────────────── Regressions ─────────────── */

describe('regressions', () => {
  test('seasonNumber and archive survive (were dropped entirely)', () => {
    const gs = newGame();
    gs.seasonNumber = 2031;
    gs.archive = [{ year: 2025, history: [], worldChampion: null, runnerUp: null,
                    offseasonSummary: { retirees: [{ tag: 'old' }] }, statsSnapshot: {} }];
    const loaded = roundTrip(gs);
    assert.equal(loaded.seasonNumber, 2031);
    assert.equal(loaded.archive.length, 1);
    assert.equal(loaded.archive[0].offseasonSummary.retirees.length, 1);
  });

  test('NO contract is re-randomized on load (the salary-cap wipe)', () => {
    const gs = newGame();
    const before = gs.regions.americas.teams
      .flatMap(t => t.roster.map(p => `${p.tag}:${p.contract.salary}:${p.contract.yearsRemaining}`));
    const loaded = roundTrip(gs);
    const after = loaded.regions.americas.teams
      .flatMap(t => t.roster.map(p => `${p.tag}:${p.contract.salary}:${p.contract.yearsRemaining}`));
    assert.deepEqual(after, before,
      'contracts changed across a save/load — ensureContracts is re-rolling them again');
  });

  test('salary cap setting survives and re-syncs the engine mirror', async () => {
    const { getSalaryCap, syncSalaryCap } = await import('../src/data/salary.js');
    const gs = newGame();
    gs.settings.salaryCap = 3150000;
    syncSalaryCap(gs);
    const loaded = roundTrip(gs);
    assert.equal(loaded.settings.salaryCap, 3150000);
    assert.equal(getSalaryCap(), 3150000,
      'load did not re-sync the module mirror engine code reads through');
  });

  test('signing-window budgets survive (reloading must not refund moves)', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    team._midseasonMoves = 2;      // both mid-season signings spent
    team._offseasonMoves = 3;
    const loaded = humanTeam(roundTrip(gs));
    assert.equal(loaded._midseasonMoves, 2,
      'reloading refunded the mid-season signing limit');
    assert.equal(loaded._offseasonMoves, 3,
      'reloading refunded the offseason move budget');
  });

  test('map pool survives with exactly 7 active', () => {
    const gs = newGame();
    gs.mapPool.active = ['bind', 'haven', 'abyss', 'pearl', 'breeze', 'lotus', 'split'];
    const loaded = roundTrip(gs);
    assert.deepEqual(loaded.mapPool.active,
      ['bind', 'haven', 'abyss', 'pearl', 'breeze', 'lotus', 'split']);
    assert.equal(loaded.mapPool.active.length, 7);
  });

  test('tier-2 teams rehydrate as Team instances with their rosters', async () => {
    const { REGION_KEYS } = await import('../src/data/regions.js');
    const gs = newGame();
    const before = gs.regions.americas.tier2.teams;
    assert.equal(before.length, 16, 'expected 16 tier-2 teams per region');

    const loaded = roundTrip(gs);
    let checked = 0;
    for (const rk of REGION_KEYS) {
      const t2 = loaded.regions[rk].tier2.teams;
      assert.equal(t2.length, 16, `${rk} lost tier-2 teams`);
      for (const team of t2) {
        assert.ok(team instanceof Team,
          `${rk} ${team.abbr} deserialized as a plain object, not a Team`);
        assert.equal(team.tier, 2, `${rk} ${team.abbr} lost its tier`);
        assert.equal(team.roster.length, 5, `${rk} ${team.abbr} lost roster players`);
        assert.ok(team.roster[0] instanceof Player, 'tier-2 player is not a Player');
        assert.equal(typeof team.overallRating, 'number', 'getter missing after rehydrate');
        checked++;
      }
    }
    assert.equal(checked, 64, 'expected 64 tier-2 teams across all regions');
  });

  test('an academy keeps its link to its tier-1 parent', () => {
    const loaded = roundTrip(newGame());
    const academies = loaded.regions.americas.tier2.teams.filter(t => t.parentAbbr);
    assert.ok(academies.length > 0, 'no academy teams generated');
    for (const a of academies) {
      assert.ok(loaded.regions.americas.teams.some(t => t.abbr === a.parentAbbr),
        `${a.abbr} points at parent ${a.parentAbbr}, which is not in tier 1`);
    }
  });

  test('a tier-2 abbr never collides with a tier-1 team on load', () => {
    const loaded = roundTrip(newGame());
    for (const t of loaded.regions.americas.tier2.teams) {
      const clash = loaded.regions.americas.teams.find(x => x.abbr === t.abbr);
      assert.ok(!clash, `${t.abbr} exists in both tiers — refs would resolve to the wrong team`);
    }
  });

  test('roles survive, and a pre-role save infers them from stats', async () => {
    const { saveGameState, loadGameState } = await import('../src/engine/persistence.js');
    const gs = newGame();
    const p = humanTeam(gs).roster[0];
    p.primaryRole = 'sentinel';
    p.secondaryRole = 'controller';

    const loaded = humanTeam(roundTrip(gs)).roster.find(x => x.id === p.id);
    assert.equal(loaded.primaryRole, 'sentinel');
    assert.equal(loaded.secondaryRole, 'controller');

    // Strip roles to simulate a save written before they existed.
    saveGameState(gs);
    const raw = JSON.parse(globalThis.localStorage.getItem('gm-sim-save-v2'));
    for (const t of raw.regions.americas.teams) {
      for (const pl of t.roster) { delete pl.primaryRole; delete pl.secondaryRole; }
    }
    globalThis.localStorage.setItem('gm-sim-save-v2', JSON.stringify(raw));

    const migrated = loadGameState();
    const ROLES = ['duelist', 'initiator', 'controller', 'sentinel', 'flex'];
    for (const t of migrated.regions.americas.teams) {
      for (const pl of t.roster) {
        assert.ok(ROLES.includes(pl.primaryRole),
          `pre-role save left ${pl.tag} with primaryRole ${pl.primaryRole}`);
      }
    }
  });

  test('depth chart order survives (drives who actually plays)', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    team.roster.push(generatePlayer({ regionKey: 'americas' }));
    team.movePlayer(5, 0);
    const order = team.roster.map(p => p.id);
    const loaded = humanTeam(roundTrip(gs));
    assert.deepEqual(loaded.roster.map(p => p.id), order);
    assert.deepEqual(loaded.startingFive.map(p => p.id), order.slice(0, 5));
  });
});

/* ─────────────── Defaults for legacy saves ─────────────── */

describe('legacy saves', () => {
  test('a save missing settings/mapPool/seasonNumber loads with defaults', async () => {
    const { loadGameState, saveGameState } = await import('../src/engine/persistence.js');
    const gs = newGame();
    saveGameState(gs);
    const raw = JSON.parse(globalThis.localStorage.getItem('gm-sim-save-v2'));
    delete raw.settings;
    delete raw.mapPool;
    delete raw.seasonNumber;
    delete raw.archive;
    globalThis.localStorage.setItem('gm-sim-save-v2', JSON.stringify(raw));

    const loaded = loadGameState();
    assert.ok(loaded, 'stripped save failed to load');
    assert.equal(loaded.settings.salaryCap, DEFAULT_SALARY_CAP);
    assert.equal(loaded.mapPool.active.length, 7);
    assert.equal(typeof loaded.seasonNumber, 'number');
    assert.ok(Array.isArray(loaded.archive));
  });
});

/* ─────────────── Match identity across save/load ─────────────── */
/*
 * In-flight series hold direct references to match objects that also live
 * in canonical containers. Losing that identity on reload made finished
 * series write results to orphaned copies — the canonical match stayed
 * unplayed, the stage re-seeded, and the same series replayed with stats
 * double-counted. These tests pin the identity, the write path, and the
 * legacy-save repair.
 */
describe('match identity across save/load', () => {
  function seedGroupSeries(gs) {
    const rk = gs.humanRegion;
    const region = gs.regions[rk];
    const match = region.schedule.find(m => !m.teamA.isHuman && !m.teamB.isHuman);
    const scheduleIdx = region.schedule.indexOf(match);
    seedActiveSeries(gs, [{
      seriesId: `${rk}:w${match.week}:${scheduleIdx}`,
      phase: 'group',
      regionKey: rk,
      week: match.week,
      scheduleIdx,
      matchRef: match,
      teamA: match.teamA,
      teamB: match.teamB,
      bestOf: 3,
    }]);
    return { rk, scheduleIdx };
  }

  test('a mid-series save keeps matchRef pointing at the canonical match', () => {
    const gs = newGame();
    const { rk, scheduleIdx } = seedGroupSeries(gs);

    const loaded = roundTrip(gs);
    const entry = loaded.season.activeSeries[0];
    const canonical = loaded.regions[rk].schedule[scheduleIdx];

    assert.ok(entry, 'active series entry survived the round trip');
    assert.equal(entry.matchRef, canonical,
      'matchRef must BE the schedule match, not a detached copy');

    // The write path that corrupted saves: a result set through the ref
    // must be visible on the canonical match, or the stage replays it.
    entry.matchRef.result = { winner: canonical.teamA, score: '2-0' };
    assert.ok(canonical.result, 'result written through the ref reaches the schedule');

    // And the UI lookup that goes the other way must still resolve.
    assert.equal(findActiveSeriesForMatch(loaded, canonical), entry,
      'findActiveSeriesForMatch identity lookup survives a reload');
  });

  test('bracket-style refs shared under two keys come back as ONE object', () => {
    const gs = newGame();
    const rk = gs.humanRegion;
    const region = gs.regions[rk];
    const [a, b] = region.teams.filter(t => !t.isHuman);
    const match = { teamA: a, teamB: b, result: null };
    region.bracket = { stage: 5, matches: [match] };

    seedActiveSeries(gs, [{
      seriesId: `${rk}:bracket:s5:0`,
      phase: 'bracket',
      regionKey: rk,
      bracketStage: 5,
      bracketMatchRef: match,
      matchRef: match,
      teamA: a,
      teamB: b,
      bestOf: 5,
    }]);

    const loaded = roundTrip(gs);
    const entry = loaded.season.activeSeries[0];
    const canonical = loaded.regions[rk].bracket.matches[0];

    assert.equal(entry.bracketMatchRef, canonical, 'bracketMatchRef identity');
    assert.equal(entry.matchRef, canonical, 'matchRef identity');
    assert.equal(entry.bracketMatchRef, entry.matchRef,
      'both ref keys must resolve to the same object');
  });

  test('legacy saves with already-detached refs are structurally re-linked', () => {
    const gs = newGame();
    const { rk, scheduleIdx } = seedGroupSeries(gs);

    // First round trip is healthy; now simulate a save written before
    // match identity existed by detaching the ref into a copy.
    const loaded = roundTrip(gs);
    const entry = loaded.season.activeSeries[0];
    entry.matchRef = { ...entry.matchRef };
    assert.notEqual(entry.matchRef, loaded.regions[rk].schedule[scheduleIdx],
      'precondition: ref is detached');

    const reloaded = roundTrip(loaded);
    assert.equal(
      reloaded.season.activeSeries[0].matchRef,
      reloaded.regions[rk].schedule[scheduleIdx],
      'relink pass must repair a detached group-phase ref');
  });

  test('legacy bracket refs re-link by team pair', () => {
    const gs = newGame();
    const rk = gs.humanRegion;
    const region = gs.regions[rk];
    const [a, b] = region.teams.filter(t => !t.isHuman);
    const match = { teamA: a, teamB: b, result: null };
    region.bracket = { stage: 5, matches: [match] };
    seedActiveSeries(gs, [{
      seriesId: `${rk}:bracket:s5:0`, phase: 'bracket', regionKey: rk,
      bracketStage: 5, bracketMatchRef: match, matchRef: match,
      teamA: a, teamB: b, bestOf: 5,
    }]);

    const loaded = roundTrip(gs);
    const entry = loaded.season.activeSeries[0];
    entry.bracketMatchRef = { ...entry.bracketMatchRef };
    entry.matchRef = entry.bracketMatchRef;

    const reloaded = roundTrip(loaded);
    const canonical = reloaded.regions[rk].bracket.matches[0];
    assert.equal(reloaded.season.activeSeries[0].bracketMatchRef, canonical);
    assert.equal(reloaded.season.activeSeries[0].matchRef, canonical);
  });
});
