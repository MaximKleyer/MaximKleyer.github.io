/**
 * tier2.test.mjs — the second division: generation, the stage, poaching.
 *
 * The cap/roster rules around poaching are the sharp edge here. A club may
 * go over the cap only when it still has somebody it is allowed to cut;
 * at the five-player floor there is nobody, so the signing must be
 * blocked outright rather than leaving the club stranded over the cap.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage, newGame, roundTrip, humanTeam } from './helpers.mjs';
import { runTier2Stage, initTier2Bracket, applyTier2Morale, runTier2AISignings, TIER2_SIGNING_CEILING
} from '../src/engine/tier2.js';
import {
  evaluatePoach, executePoach, refusalChance, scoutTier2,
  findTier2Team, backfillTier2Team, REFUSAL_MORALE, POACH_RESET_MORALE, BACKFILL_CEILING,
} from '../src/engine/poaching.js';
import { getSwissStandings, getQualifiedSeeds } from '../src/engine/swissFormat.js';
import { getSalaryCap, computeTeamSalary } from '../src/data/salary.js';
import { ROSTER_MIN } from '../src/data/constants.js';
import { ROLES, FLEX } from '../src/data/roles.js';

before(() => { installLocalStorage(); });

describe('generation', () => {
  test('16 teams per region, all tier 2, five players each', () => {
    const gs = newGame();
    for (const rk of ['americas', 'emea', 'pacific', 'china']) {
      const t2 = gs.regions[rk].tier2.teams;
      assert.equal(t2.length, 16, `${rk} team count`);
      for (const t of t2) {
        assert.equal(t.tier, 2);
        assert.equal(t.roster.length, 5, `${t.abbr} roster`);
        assert.ok(t.roster.every(p => p.contract), `${t.abbr} missing contracts`);
      }
    }
  });

  test('tier 2 is weaker than tier 1 and skews younger', () => {
    const gs = newGame();
    const t1 = gs.regions.americas.teams;
    const t2 = gs.regions.americas.tier2.teams;
    const avg = a => a.reduce((s, v) => s + v, 0) / a.length;

    assert.ok(avg(t2.map(t => t.overallRating)) < avg(t1.map(t => t.overallRating)) - 5,
      'tier 2 should be clearly weaker than tier 1');
    assert.ok(avg(t2.flatMap(t => t.roster.map(p => p.age))) <
              avg(t1.flatMap(t => t.roster.map(p => p.age))),
      'tier 2 should skew younger');
  });

  test('academies link to a real tier-1 parent', () => {
    const gs = newGame();
    const t2 = gs.regions.americas.tier2.teams;
    const academies = t2.filter(t => t.parentAbbr);
    assert.ok(academies.length > 0);
    for (const a of academies) {
      assert.ok(gs.regions.americas.teams.some(t => t.abbr === a.parentAbbr),
        `${a.abbr} parent ${a.parentAbbr} is not a tier-1 team`);
    }
  });
});

describe('save size and migration', () => {
  test('a pre-tier-2 save gains a tier-2 scene on load', async () => {
    const { saveGameState, loadGameState } = await import('../src/engine/persistence.js');
    const gs = newGame();
    saveGameState(gs);
    const raw = JSON.parse(globalThis.localStorage.getItem('gm-sim-save-v2'));
    for (const rk of Object.keys(raw.regions)) delete raw.regions[rk].tier2;
    globalThis.localStorage.setItem('gm-sim-save-v2', JSON.stringify(raw));

    const loaded = loadGameState();
    for (const rk of Object.keys(loaded.regions)) {
      assert.equal(loaded.regions[rk].tier2?.teams?.length, 16,
        `${rk} did not get a tier-2 scene — an existing save would never see one`);
    }
  });

  test('a finished tier-2 bracket carries no per-map player stats', () => {
    const gs = newGame();
    const t2 = runTier2Stage(gs, 'americas');
    let withStats = 0;
    for (const value of Object.values(t2.bracket)) {
      for (const m of (Array.isArray(value) ? value : [value])) {
        for (const map of m?.result?.maps || []) if (map.playerStats) withStats++;
      }
    }
    assert.equal(withStats, 0,
      'tier-2 maps still carry playerStats — never rendered, and they dominated save size');
  });
});

describe('the stage', () => {
  test('resolves to 8 qualifiers and a champion', () => {
    const gs = newGame();
    const t2 = runTier2Stage(gs, 'americas');
    const standings = getSwissStandings(t2.swiss);
    assert.equal(standings.filter(s => s.qualified).length, 8);
    assert.equal(standings.filter(s => s.eliminated).length, 8);
    assert.ok(t2.champion, 'no champion crowned');
    assert.equal(t2.phase, 'complete');
  });

  test('bracket seeds 1v8, 3v6, 4v5, 2v7 and splits the halves correctly', () => {
    const gs = newGame();
    const seeds = gs.regions.americas.tier2.teams.slice(0, 8);
    const b = initTier2Bracket(seeds);
    const pair = m => [m.teamA, m.teamB];
    assert.deepEqual(pair(b.ubR1[0]), [seeds[0], seeds[7]], 'slot 0 should be 1v8');
    assert.deepEqual(pair(b.ubR1[1]), [seeds[2], seeds[5]], 'slot 1 should be 3v6');
    assert.deepEqual(pair(b.ubR1[2]), [seeds[3], seeds[4]], 'slot 2 should be 4v5');
    assert.deepEqual(pair(b.ubR1[3]), [seeds[1], seeds[6]], 'slot 3 should be 2v7');
  });

  test('every upper-bracket loser lands in the lower bracket', () => {
    const gs = newGame();
    const t2 = runTier2Stage(gs, 'americas');
    const b = t2.bracket;
    const ubR1Losers = b.ubR1.map(m => m.result.loser);
    const lbR1Teams = b.lbR1.flatMap(m => [m.teamA, m.teamB]);
    for (const loser of ubR1Losers) {
      assert.ok(lbR1Teams.includes(loser),
        `${loser.abbr} lost in UB R1 but never appeared in LB R1`);
    }
    // Semifinal losers drop into LB R2, crossed against LB R1 winners.
    const sfLosers = b.ubSF.map(m => m.result.loser);
    const lbR2Teams = b.lbR2.flatMap(m => [m.teamA, m.teamB]);
    for (const loser of sfLosers) {
      assert.ok(lbR2Teams.includes(loser), `${loser.abbr} lost in UB SF but skipped LB R2`);
    }
    // The upper-bracket final loser gets the lower-bracket final.
    assert.equal(b.lbFinal.teamB, b.ubFinal.result.loser);
  });

  test('a completed stage survives save/load with team identity intact', () => {
    const gs = newGame();
    runTier2Stage(gs, 'americas');
    const championAbbr = gs.regions.americas.tier2.champion.abbr;

    const loaded = roundTrip(gs);
    const t2 = loaded.regions.americas.tier2;
    assert.equal(t2.champion?.abbr, championAbbr, 'champion lost across reload');
    assert.ok(t2.teams.includes(t2.champion),
      'champion deserialized as a copy rather than the canonical team');
    assert.equal(t2.swiss.entries.length, 16);
    assert.ok(t2.swiss.entries.every(e => t2.teams.includes(e.team)),
      'a Swiss entry points at a team that is not in the league');
  });
});

describe('morale', () => {
  test('stage results move morale off the default', () => {
    const gs = newGame();
    runTier2Stage(gs, 'americas');
    const morale = gs.regions.americas.tier2.teams.flatMap(t => t.roster.map(p => p.morale));
    assert.ok(new Set(morale).size > 1, 'every tier-2 player still sits on the default');
  });

  test('90+ stays rare across many stages', () => {
    const gs = newGame();
    for (let i = 0; i < 12; i++) runTier2Stage(gs, 'americas');
    const morale = gs.regions.americas.tier2.teams.flatMap(t => t.roster.map(p => p.morale));
    const high = morale.filter(m => m >= REFUSAL_MORALE).length;
    assert.ok(high / morale.length < 0.25,
      `${high}/${morale.length} players reached ${REFUSAL_MORALE}+ — refusal should be uncommon`);
    assert.ok(morale.every(m => m >= 0 && m <= 100), 'morale escaped 0-100');
  });
});

describe('poaching rules', () => {
  function setup() {
    const gs = newGame();
    runTier2Stage(gs, 'americas');
    const club = humanTeam(gs);
    const target = gs.regions.americas.tier2.teams[0].roster[0];
    return { gs, club, target };
  }

  test('under the cap, a poach is allowed', () => {
    const { gs, club, target } = setup();
    target.contract.salary = 50000;
    // Make room.
    for (const p of club.roster) p.contract.salary = 100000;
    const evaluation = evaluatePoach(gs, club, target);
    assert.ok(evaluation.allowed, evaluation.reason);
    assert.equal(evaluation.requiresRelease, false);
  });

  test('over the cap at 6+ players is allowed but demands a release', () => {
    const { gs, club, target } = setup();
    const cap = getSalaryCap();
    // Five players already at the cap, so any addition goes over.
    for (const p of club.roster) p.contract.salary = Math.round(cap / 5);
    assert.equal(club.roster.length, ROSTER_MIN);

    // Adding a 6th puts the club over — allowed, with a release required.
    const evaluation = evaluatePoach(gs, club, target);
    assert.ok(evaluation.allowed, `should be allowed at 6 players: ${evaluation.reason}`);
    assert.ok(evaluation.requiresRelease, 'a release should be required');
    assert.ok(evaluation.overBy > 0);
  });

  test('over the cap when it would leave exactly five players is refused', () => {
    const { gs, club, target } = setup();
    const cap = getSalaryCap();
    // Four players, so the signing makes five — the floor, nobody to cut.
    club.roster.splice(4);
    assert.equal(club.roster.length, 4);
    for (const p of club.roster) p.contract.salary = Math.round(cap / 3);
    target.contract.salary = 500000;

    const evaluation = evaluatePoach(gs, club, target);
    assert.equal(evaluation.allowed, false, 'must be blocked at the roster floor');
    assert.match(evaluation.reason, /cannot release below/);
  });

  test('a spent signing budget blocks the poach', () => {
    const { gs, club, target } = setup();
    const evaluation = evaluatePoach(gs, club, target, { movesRemaining: 0 });
    assert.equal(evaluation.allowed, false);
    assert.match(evaluation.reason, /No signings left/);
  });

  test('executing a poach moves the player and backfills the tier-2 club', () => {
    const { gs, club, target } = setup();
    const source = findTier2Team(gs, target);
    const sizeBefore = source.team.roster.length;
    const clubBefore = club.roster.length;

    const result = executePoach(gs, club, target, { force: true });
    assert.ok(result.ok, result.message);
    assert.ok(club.roster.includes(target), 'player did not arrive');
    assert.ok(!source.team.roster.includes(target), 'player did not leave');
    assert.equal(source.team.roster.length, sizeBefore, 'tier-2 club was not backfilled');
    assert.equal(club.roster.length, clubBefore + 1);
    assert.ok(result.replacement.player, 'no replacement recorded');
  });

  test('the poached player arrives as a sub, not a starter', () => {
    const { gs, club, target } = setup();
    executePoach(gs, club, target, { force: true });
    assert.ok(!club.isStarter(target),
      'a signing should arrive on the bench and be promoted deliberately');
  });

  test('morale resets on arrival', () => {
    const { gs, club, target } = setup();
    target.morale = 95;
    executePoach(gs, club, target, { force: true });
    assert.equal(target.morale, POACH_RESET_MORALE);
  });

  test('backfill always generates, and never hands the club an equal player', () => {
    const { gs } = setup();
    const region = gs.regions.americas;
    const poolBefore = region.freeAgents.length;
    const club = region.tier2.teams[0];

    // Run it many times: the old version pulled the best free agent, so a
    // club could lose its standout and get someone just as good back.
    for (let i = 0; i < 40; i++) {
      const departed = club.roster[0];
      club.roster.splice(0, 1);
      const { player, generated } = backfillTier2Team(gs, 'americas', club, departed);

      assert.ok(generated, 'replacement should be generated, not signed from the pool');
      assert.ok(player.overall < departed.overall,
        `replacement (${player.overall}) must be worse than the departed player (${departed.overall})`);
      assert.ok(player.overall <= BACKFILL_CEILING,
        `replacement (${player.overall}) is above the backfill band`);
      assert.ok(player.contract, 'replacement has no contract');
    }

    assert.equal(region.freeAgents.length, poolBefore,
      'backfill must not touch the free agent pool — tier 1 gets first refusal');
  });

  test('only a 90+ player can refuse', () => {
    const gs = newGame();
    const players = gs.regions.americas.tier2.teams.flatMap(t => t.roster);
    for (const p of players) {
      p.morale = 70;
      assert.equal(refusalChance(p), 0, 'a contented player should never refuse');
    }
    const p = players[0];
    p.morale = 90;
    assert.ok(refusalChance(p) > 0, '90 should carry some chance of refusal');
    p.morale = 100;
    assert.ok(refusalChance(p) > refusalChance({ morale: 92 }),
      'refusal should rise with morale');
    assert.ok(refusalChance(p) <= 0.5, 'refusal should never be a certainty');
  });
});

describe('scouting', () => {
  test('ranks by rating and form, and flags who resists', () => {
    const gs = newGame();
    runTier2Stage(gs, 'americas');
    const board = scoutTier2(gs, 'americas');
    assert.equal(board.length, 80, 'expected every tier-2 player in the region');
    for (let i = 1; i < board.length; i++) {
      const prev = board[i - 1].player.overall + board[i - 1].form * 0.4;
      const cur = board[i].player.overall + board[i].form * 0.4;
      assert.ok(cur <= prev + 0.001, 'scouting board is not sorted');
    }
    assert.ok(board.every(r => typeof r.form === 'number'), 'form not computed');
    assert.ok(board.some(r => r.acs > 0), 'no player recorded any combat score');
  });
});

/* ─────────────── Tier-2 free agency ─────────────── */

test('tier-2 clubs sign free agents, and only ones tier 1 passed over', () => {
  const gs = newGame();
  const rk = gs.humanRegion;
  const before = gs.regions[rk].tier2.teams.map(t => t.overallRating);
  const poolBefore = gs.regions[rk].freeAgents.length;

  let signings = 0;
  for (let i = 0; i < 6; i++) signings += runTier2AISignings(gs, rk);

  assert.ok(signings > 0, 'tier-2 clubs should sign somebody across six windows');

  // Pool size is conserved — every signing swaps a player back in.
  assert.equal(gs.regions[rk].freeAgents.length, poolBefore,
    'a signing must release a player back to the pool, not conjure one');

  const after = gs.regions[rk].tier2.teams.map(t => t.overallRating);
  const improved = after.filter((v, i) => v > before[i]).length;
  const worse = after.filter((v, i) => v < before[i]).length;
  assert.ok(improved > 0, 'signings should make some clubs better');
  assert.equal(worse, 0, 'a club should never sign itself weaker');
});

test('tier-2 signings respect the quality ceiling', () => {
  const gs = newGame();
  const rk = gs.humanRegion;
  const idsBefore = new Set(gs.regions[rk].tier2.teams.flatMap(t => t.roster.map(p => p.id)));

  for (let i = 0; i < 8; i++) runTier2AISignings(gs, rk);

  const arrivals = gs.regions[rk].tier2.teams
    .flatMap(t => t.roster)
    .filter(p => !idsBefore.has(p.id));

  for (const p of arrivals) {
    assert.ok(p.overall <= TIER2_SIGNING_CEILING,
      `${p.tag} (${p.overall}) is above the tier-2 ceiling — should hold out for tier 1`);
    assert.ok(p.contract, `${p.tag} arrived without a contract`);
  }
});

test('tier-2 signings keep every squad able to field all four roles', () => {
  const gs = newGame();
  const rk = gs.humanRegion;
  for (let i = 0; i < 8; i++) runTier2AISignings(gs, rk);

  for (const team of gs.regions[rk].tier2.teams) {
    const flexes = team.roster.filter(p => p.primaryRole === FLEX).length;
    const covered = new Set(team.roster.filter(p => p.primaryRole !== FLEX).map(p => p.primaryRole));
    assert.ok(covered.size + flexes >= ROLES.length,
      `${team.abbr} lost role coverage after signing`);
  }
});

test('arrivals from free agency are poachable like anyone else', () => {
  const gs = newGame();
  const rk = gs.humanRegion;
  const idsBefore = new Set(gs.regions[rk].tier2.teams.flatMap(t => t.roster.map(p => p.id)));
  for (let i = 0; i < 8; i++) runTier2AISignings(gs, rk);

  const scouted = scoutTier2(gs, rk);
  const arrivals = scouted.filter(e => !idsBefore.has(e.player.id));
  assert.ok(arrivals.length > 0, 'newly signed tier-2 players should appear on the scouting board');
});

test('no tier-2 club generates as unwatchable filler', () => {
  // The bottom of the division was landing in the mid-40s, which is not a
  // team anybody would scout. The top should still stay clear of tier 1.
  const seen = [];
  for (let run = 0; run < 3; run++) {
    const gs = newGame();
    for (const rk of Object.keys(gs.regions)) {
      for (const team of gs.regions[rk].tier2.teams) {
        seen.push(team.overallRating);
        assert.ok(team.overallRating > 55,
          `${team.abbr} generated at ${team.overallRating} — below the tier-2 floor`);
      }
    }
  }
  const max = Math.max(...seen);
  assert.ok(max <= 72, `a tier-2 club reached ${max}, which encroaches on tier 1`);
});
