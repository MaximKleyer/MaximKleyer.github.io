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
import {
  initVctCircuit, advanceVctSlot, runFullVctSeason, VCT_SLOTS, regionPointsTable,
} from '../src/engine/vct/circuit.js';
import { PARTNERS_PER_REGION as PPR } from '../src/data/vct/partners.js';

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

describe('circuit', () => {
  test('the full calendar runs: nine slots, a world champion, season-complete', () => {
    const gs = newVct();
    initVctCircuit(gs);
    const played = [];
    let slot;
    while ((slot = advanceVctSlot(gs))) played.push(slot.key);
    assert.deepEqual(played, VCT_SLOTS.map(s => s.key));
    assert.equal(gs.circuit.status, 'season-complete');
    assert.ok(gs.circuit.worldChampion, 'no world champion crowned');
    assert.ok(advanceVctSlot(gs) === null, 'advance past season end must no-op');
  });

  test('each qualifier sends exactly its slots, all from its own sub-region', () => {
    const gs = newVct();
    initVctCircuit(gs);
    advanceVctSlot(gs);   // kickoffQuals
    const quals = gs.circuit.events.kickoffQuals;
    for (const rk of REGION_KEYS) {
      for (const [sk, def] of Object.entries(SUB_REGIONS[rk])) {
        const q = quals[rk][sk];
        assert.equal(q.qualified.length, def.slots, `${rk}/${sk} qualified count`);
        for (const t of q.qualified) {
          assert.equal(t.subRegion, sk, `${t.abbr} qualified out of the wrong bracket`);
        }
        // 32 → slots means log2(32/slots) rounds.
        assert.equal(q.rounds.length, Math.log2(OPEN_TEAMS_PER_SUBREGION / def.slots),
          `${rk}/${sk} round count`);
      }
    }
  });

  test('every regional event is 8 partners + 8 qualified opens', () => {
    const gs = newVct();
    initVctCircuit(gs);
    advanceVctSlot(gs);   // kickoffQuals
    advanceVctSlot(gs);   // kickoff
    for (const rk of REGION_KEYS) {
      const event = gs.circuit.events.kickoff[rk];
      const field = event.swiss.entries.map(e => e.team);
      assert.equal(field.length, PPR + 8, `${rk} field size`);
      const partners = new Set(gs.regions[rk].teams);
      assert.equal(field.filter(t => partners.has(t)).length, PPR, `${rk} partner count`);
      assert.equal(field.filter(t => t.subRegion).length, 8, `${rk} open count`);
      assert.ok(event.placements.champion, `${rk} kickoff has no champion`);
    }
  });

  test('Masters fields the top 2 of each region, and points flow home', () => {
    const gs = newVct();
    initVctCircuit(gs);
    advanceVctSlot(gs); advanceVctSlot(gs); advanceVctSlot(gs);   // → masters1
    const m = gs.circuit.events.masters1;
    assert.equal(m.seeds.length, 8, 'masters field size');
    for (const rk of REGION_KEYS) {
      const p = gs.circuit.events.kickoff[rk].placements;
      assert.ok(m.seeds.includes(p.champion), `${rk} kickoff champion missing from Masters`);
      assert.ok(m.seeds.includes(p.runnerUp), `${rk} kickoff runner-up missing from Masters`);
    }
    const totalPoints = Object.values(gs.circuit.points).reduce((s, n) => s + n, 0);
    assert.ok(totalPoints > 0, 'no championship points awarded');
  });

  test('Champions seeds each region\'s points top 4', () => {
    const gs = newVct();
    runFullVctSeason(gs);
    const field = gs.circuit.events.champions.swiss.entries.map(e => e.team);
    assert.equal(field.length, 16);
    for (const rk of REGION_KEYS) {
      const top4 = regionPointsTable(gs, rk).slice(0, 4).map(r => r.team);
      for (const t of top4) {
        assert.ok(field.includes(t), `${rk} points-top-4 ${t.abbr} missing from Champions`);
      }
    }
  });

  test('a completed season survives a save round trip', () => {
    const gs = newVct();
    runFullVctSeason(gs);
    const championAbbr = gs.circuit.worldChampion.abbr;
    saveGameState(gs);
    const loaded = loadGameState();
    assert.ok(loaded, 'load failed');
    assert.equal(loaded.circuit.status, 'season-complete');
    assert.ok(loaded.circuit.worldChampion instanceof Team, 'world champion lost identity');
    assert.equal(loaded.circuit.worldChampion.abbr, championAbbr);
    // The champion reference must resolve to the SAME instance as the
    // canonical team in its region, not a detached copy.
    const rk = REGION_KEYS.find(k =>
      loaded.regions[k].teams.includes(loaded.circuit.worldChampion)
      || Object.values(loaded.regions[k].subRegions)
        .some(s => s.teams.includes(loaded.circuit.worldChampion)));
    assert.ok(rk, 'world champion is a detached copy, not the canonical team');
    const raw = globalThis.localStorage.getItem('gm-sim-save-v2');
    assert.ok(raw.length / 1024 < 3500,
      `post-season save is ${Math.round(raw.length / 1024)}KB`);
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
