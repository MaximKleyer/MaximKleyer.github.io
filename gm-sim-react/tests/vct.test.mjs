/**
 * vct.test.mjs — the VCT 2027 mode's foundation.
 *
 * Phase 1 covers the world itself: 8 partners per region, 32 open clubs
 * per sub-region qualifier, sub-region-true nationalities and coherent
 * comms languages, both human start paths, and a full save round trip
 * that neither loses the open scene nor invents a tier-2 division.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.mjs';
import { initVctGame, getVctHumanTeam, allVctRegionTeams, PARTNER_MIN_OVR } from '../src/engine/vct/generation.js';
import { SUB_REGIONS, OPEN_TEAMS_PER_SUBREGION, openSlotsForRegion } from '../src/data/vct/subregions.js';
import { getPartnerDefs, PARTNERS_PER_REGION } from '../src/data/vct/partners.js';
import { commUncovered, speaks, nativeLanguageOf } from '../src/data/languages.js';
import { REGION_KEYS } from '../src/data/regions.js';
import { Team } from '../src/classes/Team.js';
import { Player } from '../src/classes/Player.js';
import { saveGameState, loadGameState } from '../src/engine/persistence.js';

before(() => { installLocalStorage(); });

const newVct = (choice = { type: 'partner', regionKey: 'americas', abbr: 'SEN' }) =>
  initVctGame(choice);

describe('world shape', () => {
  test('8 partners per region, 32 clubs per sub-region, slots sum to 8', () => {
    const gs = newVct();
    for (const rk of REGION_KEYS) {
      const region = gs.regions[rk];
      assert.equal(region.teams.length, PARTNERS_PER_REGION, `${rk} partner count`);
      assert.equal(openSlotsForRegion(rk), 8, `${rk} qualifier slots`);
      const subKeys = Object.keys(SUB_REGIONS[rk]);
      assert.deepEqual(Object.keys(region.subRegions), subKeys, `${rk} sub-region keys`);
      for (const sk of subKeys) {
        assert.equal(region.subRegions[sk].teams.length, OPEN_TEAMS_PER_SUBREGION,
          `${rk}/${sk} open club count`);
      }
    }
  });

  test('partner defs resolve for every region', () => {
    for (const rk of REGION_KEYS) {
      assert.equal(getPartnerDefs(rk).length, PARTNERS_PER_REGION, rk);
    }
  });

  test('every partner side meets the professional floor', () => {
    const gs = newVct();
    for (const rk of REGION_KEYS) {
      for (const t of gs.regions[rk].teams) {
        assert.ok(t.overallRating >= PARTNER_MIN_OVR - 1,
          `${t.abbr} is ${t.overallRating} — below the partner floor`);
        assert.equal(t.roster.length, 5, `${t.abbr} roster size`);
        assert.ok(t.roster.every(p => p.contract), `${t.abbr} missing contracts`);
      }
    }
  });

  test('abbreviations are unique region-wide, partners included', () => {
    const gs = newVct();
    for (const rk of REGION_KEYS) {
      const abbrs = allVctRegionTeams(gs.regions[rk]).map(t => t.abbr);
      assert.equal(new Set(abbrs).size, abbrs.length, `${rk} has duplicate abbrs`);
    }
  });

  test('no duplicate player tags across the whole league', () => {
    const gs = newVct();
    const tags = REGION_KEYS.flatMap(rk => [
      ...allVctRegionTeams(gs.regions[rk]).flatMap(t => t.roster.map(p => p.tag)),
      ...gs.regions[rk].freeAgents.map(p => p.tag),
    ]);
    assert.equal(new Set(tags).size, tags.length,
      `${tags.length - new Set(tags).size} duplicate tags in ${tags.length} players`);
  });
});

describe('open-scene identity', () => {
  test('every open club is sub-region-true and language-coherent', () => {
    const gs = newVct();
    for (const rk of REGION_KEYS) {
      for (const [sk, sub] of Object.entries(gs.regions[rk].subRegions)) {
        const allowed = new Set(SUB_REGIONS[rk][sk].pool);
        for (const t of sub.teams) {
          assert.equal(t.subRegion, sk, `${t.abbr} wrong subRegion tag`);
          assert.equal(t.tier, 2, `${t.abbr} tier`);
          assert.equal(commUncovered(t.roster), 0, `${t.abbr} (${rk}/${sk}) can't talk`);
          for (const p of t.roster) {
            assert.ok(allowed.has(p.nationality),
              `${p.tag} (${p.nationality}) is not from ${rk}/${sk}`);
            assert.ok(speaks(p, nativeLanguageOf(p.nationality)),
              `${p.tag} lost the native-language invariant`);
          }
        }
      }
    }
  });

  test('South Asia fields Indians and Pakistanis, and they can communicate', () => {
    const gs = newVct();
    const sas = gs.regions.pacific.subRegions.sas.teams;
    const nats = new Set(sas.flatMap(t => t.roster.map(p => p.nationality)));
    assert.ok([...nats].every(n => n === 'IN' || n === 'PK'), `unexpected: ${[...nats]}`);
    assert.ok(nats.has('IN'), 'no Indian players generated at all');
  });

  test('open clubs sit below partner strength on average, with reachable standouts', () => {
    const gs = newVct();
    for (const rk of REGION_KEYS) {
      const partnerAvg = gs.regions[rk].teams.reduce((s, t) => s + t.overallRating, 0)
        / gs.regions[rk].teams.length;
      const opens = Object.values(gs.regions[rk].subRegions).flatMap(s => s.teams);
      const openAvg = opens.reduce((s, t) => s + t.overallRating, 0) / opens.length;
      assert.ok(openAvg < partnerAvg - 5,
        `${rk}: open avg ${openAvg.toFixed(1)} too close to partner avg ${partnerAvg.toFixed(1)}`);
    }
  });
});

describe('human start', () => {
  test('partner path marks the chosen org', () => {
    const gs = newVct({ type: 'partner', regionKey: 'emea', abbr: 'NAVI' });
    const human = getVctHumanTeam(gs);
    assert.equal(human?.abbr, 'NAVI');
    assert.equal(gs.humanRegion, 'emea');
    assert.equal(gs.humanSubRegion, null);
  });

  test('open path marks a club inside the chosen qualifier', () => {
    const first = initVctGame({ type: 'partner', regionKey: 'americas', abbr: 'SEN' });
    const target = first.regions.pacific.subRegions.sas.teams[0].abbr;
    const gs = newVct({ type: 'open', regionKey: 'pacific', subKey: 'sas', abbr: target });
    const human = getVctHumanTeam(gs);
    assert.ok(human, 'no human team found');
    assert.equal(human.subRegion, 'sas');
    assert.equal(gs.humanSubRegion, 'sas');
    assert.equal(gs.humanTeamAbbr, human.abbr);
  });
});

describe('persistence', () => {
  test('a VCT save round-trips: mode, partners, full open scene, human identity', () => {
    const gs = newVct({ type: 'partner', regionKey: 'americas', abbr: 'SEN' });
    saveGameState(gs);
    const loaded = loadGameState();
    assert.ok(loaded, 'load failed');
    assert.equal(loaded.mode, 'vct2027');
    assert.equal(loaded.humanTeamAbbr, 'SEN');
    for (const rk of REGION_KEYS) {
      const region = loaded.regions[rk];
      assert.equal(region.teams.length, PARTNERS_PER_REGION);
      for (const [sk, sub] of Object.entries(region.subRegions)) {
        assert.equal(sub.teams.length, OPEN_TEAMS_PER_SUBREGION, `${rk}/${sk}`);
        for (const t of sub.teams) {
          assert.ok(t instanceof Team, `${t.abbr} lost class identity`);
          assert.equal(t.subRegion, sk, `${t.abbr} lost its sub-region`);
          assert.ok(t.roster.every(p => p instanceof Player), `${t.abbr} roster`);
          assert.ok(t.roster.every(p => Array.isArray(p.languages) && p.languages.length),
            `${t.abbr} lost languages`);
        }
      }
      assert.ok(!region.tier2, `${rk}: a tier-2 division was invented on load`);
    }
    const human = getVctHumanTeam(loaded);
    assert.equal(human?.abbr, 'SEN');
  });

  test('the save stays within a sane localStorage budget', () => {
    const gs = newVct();
    saveGameState(gs);
    const raw = globalThis.localStorage.getItem('gm-sim-save-v2');
    const kb = Math.round(raw.length / 1024);
    assert.ok(kb < 3000, `VCT save is ${kb}KB — too close to localStorage limits`);
  });
});
