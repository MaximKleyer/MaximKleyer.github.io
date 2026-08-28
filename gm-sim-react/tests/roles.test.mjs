/**
 * roles.test.mjs — player roles, role fit, and the misfit penalty.
 *
 * The two things most worth pinning down here:
 *
 *   Every roster must cover all four roles. Compositions need all four,
 *   and several need two of one, so a squad missing a role would be
 *   permanently stuck eating an off-role penalty through no decision of
 *   the manager's.
 *
 *   Flex must never be strictly better than a specialist. It carries a
 *   token penalty everywhere AND generates weak, so it is a development
 *   project rather than a jackpot.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage, newGame, humanTeam, aiTeam } from './helpers.mjs';
import { generatePlayer } from '../src/classes/Player.js';
import { simulateMap } from '../src/classes/Match.js';
import {
  ROLES, FLEX, ALL_ROLES, roleFit, roleFitPenalty, effectiveOverall,
  roleFitMultiplier, assignRosterRoles, rollRole, inferRoleFromStats,
  FLEX_CHANCE, FLEX_RATING_CEILING, ROLE_IQ_BIAS,
} from '../src/data/roles.js';

before(() => { installLocalStorage(); });

describe('role fit', () => {
  const mk = (primaryRole, secondaryRole, overall) => ({ primaryRole, secondaryRole, overall });

  test('classifies primary, secondary, off and flex', () => {
    assert.equal(roleFit(mk('duelist', null, 80), 'duelist'), 'primary');
    assert.equal(roleFit(mk('initiator', 'duelist', 80), 'duelist'), 'secondary');
    assert.equal(roleFit(mk('sentinel', 'controller', 80), 'duelist'), 'off');
    assert.equal(roleFit(mk(FLEX, null, 80), 'sentinel'), 'flex');
  });

  test('an 80 plays off-role like a 70, a 90 like an 80', () => {
    assert.equal(effectiveOverall(mk('sentinel', null, 80), 'duelist'), 70);
    assert.equal(effectiveOverall(mk('sentinel', null, 90), 'duelist'), 80);
    assert.equal(effectiveOverall(mk('sentinel', null, 70), 'duelist'), 60);
  });

  test('secondary costs a little, primary costs nothing', () => {
    assert.equal(effectiveOverall(mk('duelist', null, 80), 'duelist'), 80);
    assert.equal(effectiveOverall(mk('initiator', 'duelist', 80), 'duelist'), 77);
  });

  test('penalties are ordered primary > flex > secondary > off', () => {
    assert.ok(roleFitPenalty(mk('duelist', null, 80), 'duelist') >
              roleFitPenalty(mk(FLEX, null, 80), 'duelist'));
    assert.ok(roleFitPenalty(mk(FLEX, null, 80), 'duelist') >
              roleFitPenalty(mk('initiator', 'duelist', 80), 'duelist'));
    assert.ok(roleFitPenalty(mk('initiator', 'duelist', 80), 'duelist') >
              roleFitPenalty(mk('sentinel', null, 80), 'duelist'));
  });

  test('the multiplier never goes negative or explodes', () => {
    for (const ovr of [1, 5, 30, 99]) {
      const m = roleFitMultiplier(mk('sentinel', null, ovr), 'duelist');
      assert.ok(m > 0 && m <= 1, `multiplier ${m} out of range at ${ovr} OVR`);
    }
  });
});

describe('generation', () => {
  test('flex is roughly 1 in 50', () => {
    let flex = 0;
    const n = 8000;
    for (let i = 0; i < n; i++) if (rollRole().primaryRole === FLEX) flex++;
    const rate = flex / n;
    assert.ok(rate > FLEX_CHANCE * 0.5 && rate < FLEX_CHANCE * 1.8,
      `flex rate ${(rate * 100).toFixed(2)}% is far from the ${(FLEX_CHANCE * 100).toFixed(1)}% target`);
  });

  test('flex players never generate strong', () => {
    let checked = 0;
    for (let i = 0; i < 4000 && checked < 40; i++) {
      const p = generatePlayer({ regionKey: 'americas' });
      if (p.primaryRole !== FLEX) continue;
      checked++;
      assert.ok(p.overall <= FLEX_RATING_CEILING + 4,
        `a flex player generated at ${p.overall} OVR — flex must start weak or it dominates`);
      assert.equal(p.secondaryRole, null, 'flex should not carry a secondary role');
    }
    assert.ok(checked > 0, 'no flex players generated to check');
  });

  test('game sense skews by role: initiator highest, duelist lowest', () => {
    const iq = {};
    for (let i = 0; i < 4000; i++) {
      const p = generatePlayer({ regionKey: 'americas' });
      (iq[p.primaryRole] ||= []).push(p.ratings.gamesense);
    }
    const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
    assert.ok(avg(iq.initiator) > avg(iq.duelist) + 3,
      'initiators should out-think duelists — IGL selection reads this');
    assert.ok(avg(iq.initiator) >= avg(iq.controller),
      'initiators should lead controllers');
    assert.ok(avg(iq.controller) > avg(iq.duelist),
      'controllers should out-think duelists');
    assert.ok(avg(iq.sentinel) > avg(iq.duelist),
      'sentinels should out-think duelists');
  });

  test('every player has a valid primary, and a secondary that differs', () => {
    for (let i = 0; i < 500; i++) {
      const p = generatePlayer({ regionKey: 'americas' });
      assert.ok(ALL_ROLES.includes(p.primaryRole), `bad primary ${p.primaryRole}`);
      if (p.secondaryRole) {
        assert.ok(ROLES.includes(p.secondaryRole), `bad secondary ${p.secondaryRole}`);
        assert.notEqual(p.secondaryRole, p.primaryRole,
          'secondary must differ from primary or it means nothing');
      }
    }
  });
});

describe('roster spread', () => {
  test('a five-man roster always covers all four roles', () => {
    const gaps = [];
    for (let i = 0; i < 2000; i++) {
      const roles = assignRosterRoles(5).map(r => r.primaryRole);
      const flexes = roles.filter(r => r === FLEX).length;
      const covered = new Set(roles.filter(r => r !== FLEX));
      // Flex covers anything, so it counts toward coverage.
      if (covered.size + flexes < ROLES.length) gaps.push(roles.join(','));
    }
    assert.deepEqual(gaps.slice(0, 3), [],
      `rosters missing a role would be permanently stuck off-role: ${gaps.slice(0, 3).join(' | ')}`);
  });

  test('generated league teams all have a workable spread', () => {
    const gs = newGame();
    for (const rk of Object.keys(gs.regions)) {
      const all = [...gs.regions[rk].teams, ...gs.regions[rk].tier2.teams];
      for (const team of all) {
        const roles = team.roster.map(p => p.primaryRole);
        const flexes = roles.filter(r => r === FLEX).length;
        const covered = new Set(roles.filter(r => r !== FLEX));
        assert.ok(covered.size + flexes >= ROLES.length,
          `${rk} ${team.abbr} cannot field every role: ${roles.join(', ')}`);
      }
    }
  });
});

describe('effect on the simulation', () => {
  test('being on-role beats being off-role, controlling for roster quality', () => {
    // Comparing one team on-role against another off-role conflates the
    // role effect with whatever random rating gap the two rosters happen
    // to have — measured flaky at roughly 1 run in 5. So run the SAME
    // matchup twice with the roles reversed: the swing between the two
    // isolates the role effect and cancels the quality difference.
    const gs = newGame();
    const A = humanTeam(gs), B = aiTeam(gs);
    const slots = ['duelist', 'initiator', 'controller', 'sentinel', 'initiator'];

    const setFit = (team, onRole) => {
      team.strategy.assignments = team.startingFive.map((p, i) => {
        if (onRole) {
          p.primaryRole = slots[i];
        } else {
          p.primaryRole = slots[i] === 'duelist' ? 'sentinel' : 'duelist';
          p.secondaryRole = null;
        }
        return { playerId: p.id, role: slots[i], subtypeId: null };
      });
    };

    const rateA = (n = 300) => {
      let w = 0;
      for (let i = 0; i < n; i++) {
        if (simulateMap(A, B, { mapId: 'ascent', firstHalfAttacker: 'A' }).winner === A) w++;
      }
      return w / n;
    };

    setFit(A, true); setFit(B, false);
    const aFavoured = rateA();

    setFit(A, false); setFit(B, true);
    const aHandicapped = rateA();

    assert.ok(aFavoured > aHandicapped,
      `role fit did not move the result (A on-role ${aFavoured}, A off-role ${aHandicapped})`);
  });

  test('flex is never strictly better than a specialist in that role', () => {
    const mk = (primaryRole, secondaryRole, overall) => ({ primaryRole, secondaryRole, overall });
    const specialist = roleFitMultiplier(mk('duelist', null, 80), 'duelist');
    const flex = roleFitMultiplier(mk(FLEX, null, 80), 'duelist');
    assert.ok(flex < specialist,
      'an equal-rated flex must not match a specialist on their own role');
  });
});

describe('migration from stats', () => {
  test('infers a plausible role for a player that has none', () => {
    const aimer = { ratings: { aim: 95, positioning: 40, utility: 40, gamesense: 40, clutch: 90 } };
    assert.equal(inferRoleFromStats(aimer).primaryRole, 'duelist');

    const anchor = { ratings: { aim: 40, positioning: 95, utility: 45, gamesense: 90, clutch: 40 } };
    assert.equal(inferRoleFromStats(anchor).primaryRole, 'sentinel');

    const util = { ratings: { aim: 40, positioning: 50, utility: 95, gamesense: 88, clutch: 40 } };
    assert.equal(inferRoleFromStats(util).primaryRole, 'initiator');
  });

  test('always returns a valid role, even for empty stats', () => {
    const r = inferRoleFromStats({ ratings: {} });
    assert.ok(ROLES.includes(r.primaryRole));
  });
});
