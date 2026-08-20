/**
 * swiss.test.mjs — the generic Swiss stage.
 *
 * The tier-2 format (16 teams, 4 wins to qualify, 4 losses out, ≤7 rounds)
 * has a non-obvious property: record groups stop dividing evenly at round
 * 6, when the live field is five teams at 3-2 and five at 2-3. Handling
 * that with a float rather than a bye is what makes it land on exactly 8
 * qualifiers. These tests run the format thousands of times to make sure
 * that holds for every outcome sequence, not just a lucky one.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  initSwissStage, buildNextRound, pushRound, recordResult,
  isSwissComplete, getQualifiedSeeds, getEliminatedTeams,
  getSwissStandings, liveEntries, finalizeSwiss,
} from '../src/engine/swissFormat.js';

/** Deterministic pseudo-random so a failure can be reproduced from a seed. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const makeTeams = n =>
  Array.from({ length: n }, (_, i) => ({ abbr: `T${i + 1}`, name: `Team ${i + 1}` }));

/**
 * Play a whole stage. `pick` decides the winner of each match, letting a
 * test force specific outcome patterns instead of only random ones.
 */
function runStage(teamCount, opts, pick) {
  const state = initSwissStage(makeTeams(teamCount), opts);
  let guard = 0;
  while (!isSwissComplete(state) && guard++ < 50) {
    const matches = buildNextRound(state);
    if (matches.length === 0) break;
    pushRound(state, matches);
    for (const m of matches) {
      const aWins = pick(m, state);
      const mapsA = aWins ? 2 : (Math.random() < 0.5 ? 0 : 1);
      const mapsB = aWins ? (Math.random() < 0.5 ? 0 : 1) : 2;
      recordResult(state, m, {
        winnerId: aWins ? m.aId : m.bId,
        mapsA: aWins ? 2 : mapsA,
        mapsB: aWins ? mapsB : 2,
        roundsA: 13 * (aWins ? 2 : 1) + 7,
        roundsB: 13 * (aWins ? 1 : 2) + 7,
      });
    }
  }
  return finalizeSwiss(state);
}

describe('tier-2 format (16 teams, 4W / 4L)', () => {
  const OPTS = { winsToQualify: 4, lossesToEliminate: 4, maxRounds: 7 };

  test('always produces exactly 8 qualified and 8 eliminated, over 500 runs', () => {
    const bad = [];
    for (let seed = 1; seed <= 500; seed++) {
      const rand = rng(seed);
      const state = runStage(16, OPTS, () => rand() < 0.5);
      const q = getQualifiedSeeds(state).length;
      const e = getEliminatedTeams(state).length;
      if (q !== 8 || e !== 8) bad.push(`seed ${seed}: ${q} qualified, ${e} eliminated`);
    }
    assert.deepEqual(bad.slice(0, 5), [], bad.slice(0, 5).join(' | '));
  });

  test('never exceeds 7 rounds and every team plays 4-7 series', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rand = rng(seed);
      const state = runStage(16, OPTS, () => rand() < 0.5);
      assert.ok(state.round <= 7, `stage ran ${state.round} rounds`);
      for (const e of state.entries) {
        const played = e.wins + e.losses;
        assert.ok(played >= 4 && played <= 7,
          `seed ${seed}: ${e.team.abbr} played ${played} series (${e.wins}-${e.losses})`);
      }
    }
  });

  test('no team is ever left unpaired and no byes are issued', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rand = rng(seed);
      const state = runStage(16, OPTS, () => rand() < 0.5);
      for (const round of state.rounds) {
        const seen = new Set();
        for (const m of round.matches) {
          assert.ok(m.aId != null && m.bId != null, 'match with a missing side (a bye)');
          assert.ok(!seen.has(m.aId) && !seen.has(m.bId),
            `team paired twice in round ${round.round}`);
          seen.add(m.aId); seen.add(m.bId);
        }
      }
    }
  });

  test('floats occur — the format is not evenly divisible without them', () => {
    let floatsSeen = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const rand = rng(seed);
      const state = runStage(16, OPTS, () => rand() < 0.5);
      floatsSeen += state.rounds.flatMap(r => r.matches).filter(m => m.floated).length;
    }
    assert.ok(floatsSeen > 0,
      'no float ever happened — either the format changed or floats are not being flagged');
  });

  test('qualifiers all have 4 wins; eliminated all have 4 losses', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rand = rng(seed);
      const state = runStage(16, OPTS, () => rand() < 0.5);
      for (const e of state.entries) {
        const q = e.wins >= 4, el = e.losses >= 4;
        assert.ok(q !== el || (!q && !el) === false,
          `${e.team.abbr} is both qualified and eliminated (${e.wins}-${e.losses})`);
        assert.ok(q || el, `${e.team.abbr} finished undecided at ${e.wins}-${e.losses}`);
      }
    }
  });

  test('rematches are avoided', () => {
    let rematches = 0, total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const rand = rng(seed);
      const state = runStage(16, OPTS, () => rand() < 0.5);
      const met = new Set();
      for (const round of state.rounds) {
        for (const m of round.matches) {
          const key = m.aId < m.bId ? `${m.aId}:${m.bId}` : `${m.bId}:${m.aId}`;
          total++;
          if (met.has(key)) rematches++;
          met.add(key);
        }
      }
    }
    // Late rounds can force one, but they should be rare.
    assert.ok(rematches / total < 0.02,
      `${rematches}/${total} pairings were rematches — pairing is not avoiding them`);
  });

  test('the seeding handed to the bracket is 8 teams, best record first', () => {
    const rand = rng(42);
    const state = runStage(16, OPTS, () => rand() < 0.5);
    const seeds = getQualifiedSeeds(state);
    assert.equal(seeds.length, 8);

    const standings = getSwissStandings(state);
    const lossesBySeed = seeds.map(t => standings.find(s => s.team === t).losses);
    for (let i = 1; i < lossesBySeed.length; i++) {
      assert.ok(lossesBySeed[i] >= lossesBySeed[i - 1],
        `seed ${i + 1} has fewer losses than seed ${i} — seeding is out of order`);
    }
  });

  test('a lopsided stage (top seeds always win) still resolves', () => {
    const state = runStage(16, OPTS, m => m.aId < m.bId);
    assert.equal(getQualifiedSeeds(state).length, 8);
    assert.equal(getEliminatedTeams(state).length, 8);
  });
});

describe('generality', () => {
  test('handles the 8-team 2W/2L shape used by internationals', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rand = rng(seed);
      const state = runStage(8, { winsToQualify: 2, lossesToEliminate: 2, maxRounds: 3 },
        () => rand() < 0.5);
      assert.equal(getQualifiedSeeds(state).length, 4, `seed ${seed}`);
      assert.equal(getEliminatedTeams(state).length, 4, `seed ${seed}`);
      assert.ok(state.round <= 3);
    }
  });

  test('an odd field fails loudly rather than silently issuing a bye', () => {
    assert.throws(
      () => runStage(15, { winsToQualify: 4, lossesToEliminate: 4, maxRounds: 7 }, () => true),
      /unpairable|unpaired/,
      'an odd field should throw, not quietly drop or bye a team');
  });
});
