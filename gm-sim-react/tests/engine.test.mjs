/**
 * engine.test.mjs — simulation and veto rules.
 *
 * Each `regression:` test corresponds to a bug that actually shipped.
 * The rest pin down rules that are easy to break silently: a scoreline
 * that can't happen in Valorant, a side that doesn't swap, a banned map
 * that gets played anyway.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage, newGame, humanTeam, aiTeam } from './helpers.mjs';
import { TIER1_MIN_TEAM_OVR } from '../src/engine/league.js';
import { ROLES, FLEX } from '../src/data/roles.js';
import { simulateMap, simulateSeries, isTeamAAttacking } from '../src/classes/Match.js';
import { generatePlayer } from '../src/classes/Player.js';
import {
  createVeto, autoCompleteVeto, vetoToMapPlan, buildVetoSequence,
  applyMapAction, applySideChoice, runAIUntilHumanTurn, currentStep, isHumanTurn,
} from '../src/engine/veto.js';
import {
  seedActiveSeries, advanceOneMap, resolvePendingVeto, hasPendingVeto,
} from '../src/engine/activeSeries.js';
import { initMapPool, generateMapRatings, trainMap, teamMapRating } from '../src/data/maps.js';
import { ROUNDS_TO_WIN, HALF_LENGTH, REGULATION_ROUNDS } from '../src/data/constants.js';

before(() => { installLocalStorage(); });

const POOL = initMapPool().active;

/* ─────────────── Scorelines and sides ─────────────── */

describe('map simulation', () => {
  test('every scoreline is legal Valorant', () => {
    const gs = newGame();
    const A = humanTeam(gs), B = aiTeam(gs);
    const illegal = [];
    let overtimes = 0;

    for (let i = 0; i < 300; i++) {
      const m = simulateMap(A, B, { mapId: 'ascent', firstHalfAttacker: 'A' });
      const hi = Math.max(m.roundsA, m.roundsB);
      const lo = Math.min(m.roundsA, m.roundsB);
      if (m.wentToOvertime) {
        overtimes++;
        // OT ends on a 2-round lead, never before 14.
        if (hi - lo !== 2 || hi < ROUNDS_TO_WIN + 1) illegal.push(`OT ${hi}-${lo}`);
      } else {
        // Regulation: winner reaches exactly 13, loser at most 11.
        if (hi !== ROUNDS_TO_WIN || lo > HALF_LENGTH - 1) illegal.push(`REG ${hi}-${lo}`);
      }
    }
    assert.deepEqual(illegal.slice(0, 5), [], `illegal scorelines: ${illegal.slice(0, 5).join(', ')}`);
    assert.ok(overtimes > 0, 'overtime never occurred in 300 maps — the OT branch may be unreachable');
    assert.ok(overtimes < 150, `overtime in ${overtimes}/300 maps is implausibly often`);
  });

  test('sides swap at half and alternate in 2-round overtime blocks', () => {
    // First half: A attacks as picked.
    for (let r = 0; r < HALF_LENGTH; r++) {
      assert.equal(isTeamAAttacking(r, 'A'), true, `round ${r + 1} should be A attacking`);
    }
    // Second half: swapped.
    for (let r = HALF_LENGTH; r < REGULATION_ROUNDS; r++) {
      assert.equal(isTeamAAttacking(r, 'A'), false, `round ${r + 1} should be A defending`);
    }
    // Overtime: first round of each block uses second-half sides, then flips.
    assert.equal(isTeamAAttacking(24, 'A'), false, 'OT round 1 should match 2nd-half sides');
    assert.equal(isTeamAAttacking(25, 'A'), true,  'OT round 2 should flip');
    assert.equal(isTeamAAttacking(26, 'A'), false, 'OT round 3 should return to 2nd-half sides');
    assert.equal(isTeamAAttacking(27, 'A'), true,  'OT round 4 should flip');
  });

  test('the side pick is honoured', () => {
    assert.equal(isTeamAAttacking(0, 'A'), true);
    assert.equal(isTeamAAttacking(0, 'B'), false);
  });

  test('map strength shifts win rate in the right direction', () => {
    // NB: mutate real Team instances. Spreading a Team into a plain
    // object drops the startingFive getter (it lives on the prototype)
    // and the sim rightly blows up.
    const gs = newGame();
    const A = humanTeam(gs), B = aiTeam(gs);

    const setMap = (t, v) => { t.mapRatings.ascent = { attack: v, defense: v }; };
    const rateA = (n = 400) => {
      let w = 0;
      for (let i = 0; i < n; i++) {
        if (simulateMap(A, B, { mapId: 'ascent', firstHalfAttacker: 'A' }).winner === A) w++;
      }
      return w / n;
    };

    setMap(A, 70); setMap(B, 70);
    const even = rateA();

    // Boost whichever side is losing the even matchup. Boosting the side
    // that is ALREADY dominant can saturate at ~100% and leave nothing to
    // measure, which made an earlier version of this test flaky.
    if (even <= 0.5) {
      setMap(A, 95); setMap(B, 45);
      const boosted = rateA();
      assert.ok(boosted > even,
        `boosting the weaker side did not raise its win rate (even ${even}, boosted ${boosted})`);
    } else {
      setMap(A, 45); setMap(B, 95);
      const handicapped = rateA();
      assert.ok(handicapped < even,
        `handicapping the stronger side did not lower its win rate (even ${even}, after ${handicapped})`);
    }
  });

  test('regression: only the starting five play', () => {
    const gs = newGame();
    const A = humanTeam(gs), B = aiTeam(gs);
    while (A.roster.length < 8) A.roster.push(generatePlayer({ regionKey: 'americas' }));

    const m = simulateMap(A, B, { mapId: 'ascent', firstHalfAttacker: 'A' });
    assert.equal(m.rosterAIds.length, 5, 'more than five players appeared for team A');
    for (const sub of A.bench) {
      assert.ok(!m.playerStats[sub.id], `benched player ${sub.tag} recorded match stats`);
    }
  });

  test('a series never repeats a map', () => {
    const gs = newGame();
    const res = simulateSeries(humanTeam(gs), aiTeam(gs), 3);
    const ids = res.maps.map(m => m.mapId);
    assert.equal(new Set(ids).size, ids.length, `repeated map in a series: ${ids.join(', ')}`);
    assert.ok(ids.every(Boolean), 'a map was played with no map identity');
  });
});

/* ─────────────── Veto ─────────────── */

describe('map veto', () => {
  const teamA = { abbr: 'AAA', mapRatings: generateMapRatings(82) };
  const teamB = { abbr: 'BBB', mapRatings: generateMapRatings(74) };
  const tfs = side => (side === 'A' ? teamA : teamB);

  for (const [label, bestOf, grandFinal, expectMaps] of [
    ['Bo3', 3, false, 3],
    ['Bo5', 5, false, 5],
    ['Bo5 grand final', 5, true, 5],
  ]) {
    test(`${label}: consumes the 7-map pool and yields ${expectMaps} maps`, () => {
      const seq = buildVetoSequence(bestOf, { grandFinal });
      assert.equal(seq.length, 7, 'sequence must consume exactly the 7 active maps');

      const v = createVeto(POOL, bestOf, { grandFinal });
      autoCompleteVeto(v, tfs);
      const plan = vetoToMapPlan(v);
      assert.ok(v.complete, 'veto did not complete');
      assert.equal(plan.length, expectMaps);
      assert.equal(new Set(plan.map(p => p.mapId)).size, plan.length, 'duplicate map in plan');
    });
  }

  test('the picking team never chooses its own side; decider is a coin flip', () => {
    let violations = 0, deciders = 0, rounds = 300;
    for (let i = 0; i < rounds; i++) {
      const v = createVeto(POOL, 3, {});
      autoCompleteVeto(v, tfs);
      for (const p of vetoToMapPlan(v)) {
        if (p.pickedBy == null) { deciders++; continue; }
        if (p.sidePickedBy === p.pickedBy) violations++;
      }
    }
    assert.equal(violations, 0, 'a team chose the starting side on a map it picked');
    assert.equal(deciders, rounds, 'expected exactly one coin-flip decider per series');
  });

  test('grand final: winners bracket bans twice, losers bracket never bans and picks first', () => {
    const seq = buildVetoSequence(5, { grandFinal: true });
    assert.equal(seq.filter(s => s.type === 'ban' && s.actor === 'A').length, 2);
    assert.equal(seq.filter(s => s.type === 'ban' && s.actor === 'B').length, 0);
    assert.equal(seq.filter(s => s.type === 'pick' && s.actor === 'A').length, 2);
    assert.equal(seq.filter(s => s.type === 'pick' && s.actor === 'B').length, 2);
    assert.equal(seq.find(s => s.type === 'pick').actor, 'B', 'losers bracket should pick first');
  });

  test('every map carries a starting attacker', () => {
    const v = createVeto(POOL, 5, {});
    autoCompleteVeto(v, tfs);
    for (const p of vetoToMapPlan(v)) {
      assert.ok(p.firstHalfAttacker === 'A' || p.firstHalfAttacker === 'B',
        `map ${p.mapId} has no starting attacker`);
    }
  });
});

/* ─────────────── Veto ordering against the series ─────────────── */

describe('veto / series ordering', () => {
  test('regression: a banned map is never played, and no map runs before the veto resolves', () => {
    const gs = newGame();
    const human = humanTeam(gs), opp = aiTeam(gs);

    seedActiveSeries(gs, [{
      phase: 'group', regionKey: 'americas', week: 1, scheduleIdx: 0,
      teamA: human, teamB: opp, bestOf: 3,
    }]);
    assert.ok(hasPendingVeto(gs), 'seeding a human series should raise a veto');

    // The click that seeded must not also play a map.
    assert.equal(advanceOneMap(gs).playedCount, 0, 'a map was played while the veto was open');
    assert.equal(gs.season.activeSeries[0].series.maps.length, 0);

    // Drive the human side, recording the first map we ban.
    const veto = gs.season.pendingVeto.veto;
    const side = gs.season.pendingVeto.humanSide;
    const forSide = s => (s === side ? human : opp);
    let firstBan = null, guard = 0;
    while (!veto.complete && guard++ < 20) {
      if (!isHumanTurn(veto)) { runAIUntilHumanTurn(veto, forSide); continue; }
      if (veto.pendingSide) { applySideChoice(veto, 'attack'); runAIUntilHumanTurn(veto, forSide); continue; }
      const step = currentStep(veto);
      const target = veto.remaining[0];
      if (step.type === 'ban' && !firstBan) firstBan = target;
      applyMapAction(veto, target);
      runAIUntilHumanTurn(veto, forSide);
    }
    resolvePendingVeto(gs, vetoToMapPlan(veto));

    const plan = gs.season.activeSeries[0].series.mapPlan;
    assert.ok(!plan.some(p => p.mapId === firstBan),
      `banned map ${firstBan} still appears in the map plan`);

    // The next advance plays exactly the first map of the resolved plan.
    assert.equal(advanceOneMap(gs).playedCount, 1);
    const played = gs.season.activeSeries[0]?.series.maps[0];
    assert.equal(played.mapId, plan[0].mapId);
    assert.notEqual(played.mapId, firstBan);
  });

  test('fast-forward skips the prompt and does not deadlock', () => {
    const gs = newGame();
    gs.season._fastForward = true;
    seedActiveSeries(gs, [{
      phase: 'group', regionKey: 'americas', week: 1, scheduleIdx: 0,
      teamA: humanTeam(gs), teamB: aiTeam(gs), bestOf: 3,
    }]);
    assert.ok(!hasPendingVeto(gs), 'fast-forward should not raise a veto prompt');

    let played = 0, iterations = 0;
    while (gs.season.activeSeries.length && iterations++ < 20) {
      played += advanceOneMap(gs).playedCount;
    }
    assert.equal(gs.season.activeSeries.length, 0, 'fast-forward deadlocked');
    assert.ok(played >= 2 && played <= 3, `unexpected map count ${played}`);
  });
});

/* ─────────────── Fast-forward progress detection ─────────────── */

describe('sim-series progress snapshot', () => {
  // handleSimSeries loops until "nothing changed", comparing a snapshot
  // of season status / active-series count / week / bracket stage. None
  // of those move while a series is mid-flight, so playing map 2 of a
  // Bo5 looked identical to a stalled game and the loop bailed. Bo5s and
  // 2-1 Bo3s stopped early; 2-0 sweeps happened to work because the
  // series drained and the count hit 0.
  //
  // The snapshot now includes maps played across in-flight series. This
  // asserts that term actually distinguishes mid-series progress.
  function snapshotTerm(activeSeries) {
    return activeSeries.reduce((n, e) => n + (e.series?.maps?.length || 0), 0);
  }

  test('a series advancing one map changes the snapshot term', () => {
    const series = { bestOf: 5, maps: [], winsA: 0, winsB: 0, winner: null };
    const active = [{ series }];
    const before = snapshotTerm(active);

    series.maps.push({ mapId: 'ascent' });   // map 1 played, series unfinished
    const after = snapshotTerm(active);

    assert.notEqual(after, before,
      'mid-series progress is invisible to the snapshot — Sim Series will bail early');
  });

  test('every map of a Bo5 is distinguishable', () => {
    const series = { bestOf: 5, maps: [], winsA: 0, winsB: 0, winner: null };
    const active = [{ series }];
    const seen = new Set();
    for (let i = 0; i < 5; i++) {
      series.maps.push({ mapId: `m${i}` });
      seen.add(snapshotTerm(active));
    }
    assert.equal(seen.size, 5,
      'two different points in a Bo5 produce the same snapshot term');
  });
});

/* ─────────────── Roster integrity ─────────────── */

describe('roster integrity', () => {
  // A double submit — a second click before React re-rendered, or a
  // retried signing after raising the cap — used to push the same player
  // object onto the roster twice, giving duplicate ids and counting the
  // salary against the cap twice.
  test('the same player cannot be added twice', async () => {
    const { humanTeam: ht } = await import('./helpers.mjs');
    const gs = newGame();
    const team = ht(gs);
    const fa = gs.regions.americas.freeAgents[0];

    assert.equal(team.addPlayer(fa), true, 'first add should succeed');
    const size = team.roster.length;
    assert.equal(team.addPlayer(fa), false, 'second add must be refused');
    assert.equal(team.roster.length, size, 'roster grew on a duplicate add');
    assert.equal(team.roster.filter(p => p === fa).length, 1);
  });

  test('a player with a duplicate id is refused even if it is a different object', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    const existing = team.roster[0];
    const clone = { ...existing };          // same id, different object
    assert.equal(team.addPlayer(clone), false,
      'an id already on the roster must not be added again');
  });

  test('no roster in a fresh league holds a duplicate', () => {
    const gs = newGame();
    for (const rk of Object.keys(gs.regions)) {
      const all = [...gs.regions[rk].teams, ...gs.regions[rk].tier2.teams];
      for (const t of all) {
        const ids = t.roster.map(p => p.id);
        assert.equal(new Set(ids).size, ids.length, `${rk} ${t.abbr} has a duplicate player`);
      }
    }
  });

  test('a full season of AI signings never duplicates a player', async () => {
    const { runOffseasonAISignings } = await import('../src/engine/offseason.js');
    const { runMidseasonAISignings } = await import('../src/engine/midseason.js');
    const gs = newGame();

    // Exercise every AI path that moves a player from the pool onto a
    // roster. All of them now go through the guarded addPlayer.
    for (let i = 0; i < 3; i++) {
      runMidseasonAISignings(gs);
      runOffseasonAISignings(gs);
    }

    for (const rk of Object.keys(gs.regions)) {
      const all = [...gs.regions[rk].teams, ...gs.regions[rk].tier2.teams];
      for (const t of all) {
        const ids = t.roster.map(p => p.id);
        assert.equal(new Set(ids).size, ids.length,
          `${rk} ${t.abbr} ended with a duplicate player after AI signings`);
      }
    }
  });

  test('a player is never on two rosters at once', () => {
    const gs = newGame();
    const seen = new Map();
    for (const rk of Object.keys(gs.regions)) {
      const all = [...gs.regions[rk].teams, ...gs.regions[rk].tier2.teams];
      for (const t of all) {
        for (const p of t.roster) {
          assert.ok(!seen.has(p.id),
            `${p.tag} is on both ${seen.get(p.id)} and ${t.abbr}`);
          seen.set(p.id, t.abbr);
        }
      }
      for (const p of gs.regions[rk].freeAgents) {
        assert.ok(!seen.has(p.id),
          `${p.tag} is a free agent AND on ${seen.get(p.id)}`);
      }
    }
  });

  test('poaching a player already on the roster is refused', async () => {
    const { executePoach } = await import('../src/engine/poaching.js');
    const gs = newGame();
    const club = humanTeam(gs);
    const target = gs.regions.americas.tier2.teams[0].roster[0];

    const first = executePoach(gs, club, target, { force: true });
    assert.ok(first.ok, first.message);
    const size = club.roster.length;

    const second = executePoach(gs, club, target, { force: true });
    assert.equal(second.ok, false, 'a second poach of the same player must fail');
    assert.equal(club.roster.length, size, 'roster grew on a duplicate poach');
  });
});

/* ─────────────── Depth chart ─────────────── */

describe('depth chart', () => {
  test('top five start, the rest sit', () => {
    const gs = newGame();
    const t = humanTeam(gs);
    while (t.roster.length < 8) t.roster.push(generatePlayer({ regionKey: 'americas' }));
    assert.deepEqual(t.startingFive.map(p => p.id), t.roster.slice(0, 5).map(p => p.id));
    assert.deepEqual(t.bench.map(p => p.id), t.roster.slice(5).map(p => p.id));
  });

  test('moving across the line promotes and benches', () => {
    const gs = newGame();
    const t = humanTeam(gs);
    while (t.roster.length < 7) t.roster.push(generatePlayer({ regionKey: 'americas' }));
    const sub = t.roster[5];
    const starter = t.roster[0];

    t.movePlayer(5, 0);
    assert.ok(t.isStarter(sub), 'promoted player is not starting');
    assert.equal(t.roster.length, 7, 'roster size changed during a move');

    t.movePlayer(t.roster.indexOf(starter), 6);
    assert.ok(!t.isStarter(starter), 'demoted player is still starting');
  });

  test('AI teams field their best five regardless of roster order', () => {
    const gs = newGame();
    const t = aiTeam(gs);
    while (t.roster.length < 8) t.roster.push(generatePlayer({ regionKey: 'americas' }));
    t.roster.reverse();
    const best = [...t.roster].sort((a, b) => b.overall - a.overall).slice(0, 5).map(p => p.id).sort();
    assert.deepEqual(t.startingFive.map(p => p.id).sort(), best);
  });

  test('releasing a starter refills the lineup', () => {
    const gs = newGame();
    const t = humanTeam(gs);
    while (t.roster.length < 7) t.roster.push(generatePlayer({ regionKey: 'americas' }));
    t.removePlayer(t.startingFive[0]);
    assert.equal(t.startingFive.length, 5, 'lineup did not refill after a release');
  });
});

/* ─────────────── Map training ─────────────── */

describe('map training', () => {
  test('focused training moves one side only', () => {
    const t = { mapRatings: { ascent: { attack: 60, defense: 60 } } };
    const r = trainMap(t, 'ascent', 'attack');
    assert.ok(r.attack > 0);
    assert.equal(r.defense, 0);
    assert.equal(teamMapRating(t, 'ascent', 'defense'), 60);
  });

  test('gains shrink as a rating climbs and stop at the ceiling', () => {
    const low = trainMap({ mapRatings: { m: { attack: 40, defense: 40 } } }, 'm', 'attack');
    const high = trainMap({ mapRatings: { m: { attack: 92, defense: 92 } } }, 'm', 'attack');
    const capped = trainMap({ mapRatings: { m: { attack: 99, defense: 99 } } }, 'm', 'attack');
    assert.ok(low.attack > high.attack, 'weak maps should gain more than strong ones');
    assert.equal(capped.attack, 0, 'training past the ceiling should gain nothing');
  });

  test('balanced training splits the work', () => {
    const bal = trainMap({ mapRatings: { m: { attack: 60, defense: 60 } } }, 'm', 'balanced');
    const foc = trainMap({ mapRatings: { m: { attack: 60, defense: 60 } } }, 'm', 'attack');
    assert.ok(bal.attack > 0 && bal.defense > 0);
    assert.ok(foc.attack >= bal.attack, 'focused should beat balanced on its axis');
  });
});

test('no tier-1 team starts below the quality floor', () => {
  for (let run = 0; run < 3; run++) {
    const gs = newGame();
    for (const rk of Object.keys(gs.regions)) {
      for (const team of gs.regions[rk].teams) {
        assert.ok(team.overallRating >= TIER1_MIN_TEAM_OVR,
          `${team.abbr} generated at ${team.overallRating}, below the ${TIER1_MIN_TEAM_OVR} floor`);
        assert.equal(team.roster.length, 5, `${team.abbr} roster size after the upgrade pass`);
        const ids = new Set(team.roster.map(p => p.id));
        assert.equal(ids.size, 5, `${team.abbr} has a duplicated player after the upgrade pass`);
      }
      // Players displaced by upgrades go back to the pool, never vanish.
      const rostered = gs.regions[rk].teams.flatMap(t => t.roster.map(p => p.id));
      const fas = gs.regions[rk].freeAgents.map(p => p.id);
      assert.equal(new Set([...rostered, ...fas]).size, rostered.length + fas.length,
        `${rk}: a player is both rostered and a free agent`);
    }
  }
});

test('the upgrade pass leaves every tier-1 squad able to field all four roles', () => {
  const gs = newGame();
  for (const rk of Object.keys(gs.regions)) {
    for (const team of gs.regions[rk].teams) {
      const flexes = team.roster.filter(p => p.primaryRole === FLEX).length;
      const covered = new Set(team.roster.filter(p => p.primaryRole !== FLEX).map(p => p.primaryRole));
      assert.ok(covered.size + flexes >= ROLES.length,
        `${team.abbr} cannot field all four roles after the upgrade pass`);
    }
  }
});
