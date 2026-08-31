/**
 * livematch.test.mjs — the live viewer's replay state machine.
 *
 * The one component test in the suite, and it exists because the
 * adversarial review found (and reproduced) a whole-app white-screen:
 * when a new map landed, one render still carried the PREVIOUS map's
 * reveal count, and a shorter next map read past its round log. The
 * suite's engine tests could never catch a React render crash, so the
 * component is driven here directly with react-test-renderer, in
 * StrictMode like production.
 */

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '.livematch.bundle.cjs');

let React, TestRenderer, LiveMatch;
before(async () => {
  await build({
    entryPoints: [join(here, '../src/components/LiveMatch.jsx')],
    bundle: true, format: 'cjs', outfile: bundle,
    jsx: 'automatic', external: ['react', 'react-dom'],
    logLevel: 'silent',
  });
  const req = createRequire(import.meta.url);
  React = req('react');
  TestRenderer = req('react-test-renderer');
  LiveMatch = req(bundle).default;
});

function mkMap(rounds, winner) {
  const ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5'];
  return {
    mapId: 'ascent', totalRounds: rounds,
    roundsA: 13, roundsB: rounds - 13, winner, pickedBy: 'A',
    rosterAIds: ids.slice(0, 5), rosterBIds: ids.slice(5),
    playerStats: Object.fromEntries(ids.map(id => [id, {
      id, tag: id, teamAbbr: id[0] === 'a' ? 'AAA' : 'BBB',
      kills: 10, deaths: 10, assists: 2, acs: 200, fk: 1, fd: 1, kast: 70,
    }])),
    roundLog: Array.from({ length: rounds }, (_, i) => ({
      w: i % 2 ? 'A' : 'B', atk: 'A', t: 'elim',
      ev: [{ k: 0, d: 5, a: null }], cs: Array(10).fill(10), survivors: [0, 1, 2, 3],
    })),
  };
}

function harness(extraProps = {}) {
  const teamA = { abbr: 'AAA', name: 'Team A', roster: [], isHuman: true };
  const teamB = { abbr: 'BBB', name: 'Team B', roster: [] };
  const series = { teamA, teamB, bestOf: 3, maps: [], winsA: 0, winsB: 0, winner: null, score: null, mapPlan: [] };
  const gs = { season: { activeSeries: [{ seriesId: 's1', series, teamA, teamB }] } };
  const el = () => React.createElement(React.StrictMode, null,
    React.createElement(LiveMatch, {
      gameState: gs, seriesId: 's1',
      onAdvanceMap: () => {}, onSimSeries: () => {}, onClose: () => {},
      ...extraProps,
    }));
  let r;
  TestRenderer.act(() => { r = TestRenderer.create(el()); });
  const update = () => TestRenderer.act(() => r.update(el()));
  const btn = label => r.root.findAllByType('button')
    .find(b => (b.children || []).join('').includes(label));
  const text = () => JSON.stringify(r.toJSON());
  const drain = () => { gs.season.activeSeries = []; };
  return { series, teamA, teamB, update, btn, text, drain };
}

test('a shorter next map neither crashes the render nor skips its animation', () => {
  const h = harness();
  const m1 = mkMap(24, null); m1.winner = h.teamA;
  h.series.maps.push(m1); h.update();

  TestRenderer.act(() => { h.btn('Skip to map result').props.onClick(); });
  assert.ok(h.btn('Play next map'), 'fully revealed map exposes the next-map control');

  // The crash shape: previous map fully revealed at 24, next map is 18.
  const m2 = mkMap(18, null); m2.winner = h.teamB;
  h.series.maps.push(m2);
  h.series.winner = h.teamB; h.series.score = [1, 1];
  assert.doesNotThrow(h.update, 'shorter follow-up map must not throw during render');

  assert.ok(h.btn('Skip to map result'), 'the new map starts animating from round zero');
  assert.ok(!h.text().includes('wins the series'),
    'the series banner must wait for the reveal to finish');
});

test('browsing another tab mid-animation neither spoils nor un-gates the flow', () => {
  const h = harness();
  const m1 = mkMap(20, null); m1.winner = h.teamA;
  h.series.maps.push(m1); h.update();
  TestRenderer.act(() => { h.btn('Skip to map result').props.onClick(); });
  const m2 = mkMap(22, null); m2.winner = h.teamA;
  h.series.maps.push(m2); h.update();

  // Mid-animation, open All Maps: score must not count the animating map.
  TestRenderer.act(() => { h.btn('All Maps').props.onClick(); });
  assert.ok(!h.btn('Play next map'),
    'browsing a different tab must not un-gate the next-map control');
  const snapshot = h.text();
  assert.ok(!snapshot.includes('wins the series'), 'no banner while the latest map is unrevealed');
});

test('a 1-1 series animates its decider instead of auto-completing', () => {
  // The user-reported shape: two maps split, map 3 arrives WITH the
  // series winner set and the active entry drained. The decider must
  // animate from round zero — not snap in fully revealed.
  const h = harness();
  const m1 = mkMap(24, null); m1.winner = h.teamA;
  h.series.maps.push(m1); h.update();
  TestRenderer.act(() => { h.btn('Skip to map result').props.onClick(); });

  const m2 = mkMap(20, null); m2.winner = h.teamB;
  h.series.maps.push(m2); h.update();
  assert.ok(h.btn('Skip to map result'), 'map 2 animates');
  TestRenderer.act(() => { h.btn('Skip to map result').props.onClick(); });
  assert.ok(h.btn('Play next map'), 'decider is offered at 1-1');

  const m3 = mkMap(19, null); m3.winner = h.teamB;
  h.series.maps.push(m3);
  h.series.winner = h.teamB; h.series.score = [1, 2];
  h.drain();                       // entry leaves activeSeries on completion
  h.update();

  assert.ok(h.btn('Skip to map result'), 'map 3 must animate from round zero');
  assert.ok(!h.text().includes('wins the series'),
    'the banner must wait for the decider reveal');
});


test('the reveal-complete signal waits for the final map animation', () => {
  // The result toast is held back while watching — it must release only
  // once the last map's reveal finishes, never while the engine-complete
  // series is still animating.
  let revealed = 0;
  const h = harness({ onSeriesRevealed: () => { revealed++; } });

  const m1 = mkMap(22, null); m1.winner = h.teamA;
  h.series.maps.push(m1); h.update();
  assert.equal(revealed, 0, 'nothing to reveal while the series is live');

  const m2 = mkMap(20, null); m2.winner = h.teamA;
  h.series.maps.push(m2);
  h.series.winner = h.teamA; h.series.score = [2, 0];
  h.drain();
  h.update();
  assert.equal(revealed, 0,
    'series is engine-complete but the final map is still animating — hold the toast');

  TestRenderer.act(() => { h.btn('Skip to map result').props.onClick(); });
  assert.equal(revealed, 1, 'reveal finished — release exactly once');

  h.update();
  assert.equal(revealed, 1, 'later renders must not re-fire the signal');
});
