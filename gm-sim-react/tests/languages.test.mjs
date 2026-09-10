/**
 * languages.test.mjs — spoken languages, team communication, and the
 * nationality a team flies.
 *
 * The invariants that matter:
 *   1. Every player speaks their nationality's language, always.
 *   2. Every generated club (tier 1 and tier 2) shares a language across
 *      its whole roster — no melting pots out of the box.
 *   3. Every AI signing path preserves full coverage, so the invariant
 *      holds forever, not just on day one.
 *   4. Saves round-trip languages verbatim, and saves that predate them
 *      are backfilled with their rosters grandfathered into coherence.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage, newGame, roundTrip, humanTeam } from './helpers.mjs';
import {
  LANGUAGES, NATIVE_LANGUAGE, EXTRA_LANGUAGE_CHANCES, TEAM_LANGUAGE_POOL,
  nativeLanguageOf, rollLanguages, speaks, playerLanguages,
  commLanguage, commUncovered, fitsTeamLanguage, addLanguage,
} from '../src/data/languages.js';
import {
  NATIONALITIES, REGION_NATIONALITY_POOL, teamNationality,
} from '../src/data/nationalities.js';
import { generatePlayer } from '../src/classes/Player.js';
import { clearFreeAgentMarket } from '../src/engine/league.js';
import { runOffseasonAISignings } from '../src/engine/offseason.js';
import { runMidseasonReactiveSignings } from '../src/engine/midseason.js';
import { runTier2AISignings } from '../src/engine/tier2.js';
import { backfillTier2Team } from '../src/engine/poaching.js';
import { runLanguageLearning } from '../src/engine/season.js';
import { communicationMultiplier } from '../src/classes/Match.js';
import { COMM_PENALTY_PER_UNCOVERED } from '../src/data/strategy.js';
import { REGION_KEYS } from '../src/data/regions.js';

before(() => { installLocalStorage(); });

const ALL_TIER1 = gs => REGION_KEYS.flatMap(rk => gs.regions[rk].teams);
const ALL_TIER2 = gs => REGION_KEYS.flatMap(rk => gs.regions[rk].tier2.teams);

/* ─────────────── Data tables ─────────────── */

describe('language data', () => {
  test('every nationality has a native language, and it is a known language', () => {
    for (const nat of Object.keys(NATIONALITIES)) {
      const lang = NATIVE_LANGUAGE[nat];
      assert.ok(lang, `${nat} has no native language`);
      assert.ok(LANGUAGES[lang], `${nat} native '${lang}' is not in LANGUAGES`);
    }
  });

  test('extra-language tables and team pools only reference known languages', () => {
    for (const [nat, extras] of Object.entries(EXTRA_LANGUAGE_CHANCES)) {
      assert.ok(NATIVE_LANGUAGE[nat], `extras listed for unknown nationality ${nat}`);
      for (const [lang, chance] of extras) {
        assert.ok(LANGUAGES[lang], `${nat} extra '${lang}' is not in LANGUAGES`);
        assert.ok(chance > 0 && chance <= 1, `${nat}→${lang} chance out of range`);
        assert.notEqual(lang, NATIVE_LANGUAGE[nat], `${nat} lists its native as an extra`);
      }
    }
    for (const [region, pool] of Object.entries(TEAM_LANGUAGE_POOL)) {
      for (const lang of pool) {
        assert.ok(LANGUAGES[lang], `${region} team pool holds unknown '${lang}'`);
      }
    }
  });

  test('every region team language is speakable by someone in that region pool', () => {
    for (const [region, pool] of Object.entries(TEAM_LANGUAGE_POOL)) {
      const natPool = REGION_NATIONALITY_POOL[region];
      for (const lang of new Set(pool)) {
        const anyNative = natPool.some(nat => nativeLanguageOf(nat) === lang);
        assert.ok(anyNative,
          `${region} can form a '${lang}' club but no nationality in its pool is native`);
      }
    }
  });
});

/* ─────────────── Generation invariants ─────────────── */

describe('player generation', () => {
  test('a player always speaks their nationality\'s language', () => {
    for (let i = 0; i < 200; i++) {
      const region = REGION_KEYS[i % REGION_KEYS.length];
      const p = generatePlayer({ regionKey: region });
      assert.ok(speaks(p, nativeLanguageOf(p.nationality)),
        `${p.tag} (${p.nationality}) does not speak their own language`);
      assert.ok(Array.isArray(p.languages) && p.languages.length >= 1);
    }
  });

  test('teamLanguage is guaranteed on the generated player', () => {
    for (let i = 0; i < 100; i++) {
      const p = generatePlayer({ regionKey: 'americas', teamLanguage: 'pt' });
      assert.ok(speaks(p, 'pt'), `${p.tag} (${p.nationality}) can't speak the club language`);
    }
  });

  test('a Portuguese-comms Americas club comes out overwhelmingly Brazilian', () => {
    let br = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      if (generatePlayer({ regionKey: 'americas', teamLanguage: 'pt' }).nationality === 'BR') br++;
    }
    assert.ok(br / N > 0.8, `only ${br}/${N} were Brazilian on a pt club`);
  });
});

describe('fresh league coherence', () => {
  test('every tier-1 and tier-2 roster shares a language across all players', () => {
    const gs = newGame();
    for (const team of [...ALL_TIER1(gs), ...ALL_TIER2(gs)]) {
      assert.equal(commUncovered(team.roster), 0,
        `${team.abbr} (tier ${team.tier}) has players outside the comms loop`);
    }
  });
});

/* ─────────────── Regional identity quotas ─────────────── */

describe('regional identity quotas', () => {
  const fullOf = (gs, rk, nat) => gs.regions[rk].teams
    .filter(t => t.startingFive.every(p => p.nationality === nat));

  test('a fresh league honors every guaranteed national squad', () => {
    const gs = newGame();
    const counts = {
      'americas US': fullOf(gs, 'americas', 'US').length,
      'americas BR': fullOf(gs, 'americas', 'BR').length,
      'emea TR':     fullOf(gs, 'emea', 'TR').length,
      'pacific KR':  fullOf(gs, 'pacific', 'KR').length,
      'pacific TH':  fullOf(gs, 'pacific', 'TH').length,
      'pacific JP':  fullOf(gs, 'pacific', 'JP').length,
      'china CN':    fullOf(gs, 'china', 'CN').length,
    };
    assert.ok(counts['americas US'] >= 2, `full-US teams: ${counts['americas US']}`);
    assert.ok(counts['americas BR'] >= 1, `full-BR teams: ${counts['americas BR']}`);
    assert.ok(counts['emea TR'] >= 2,     `full-TR teams: ${counts['emea TR']}`);
    assert.ok(counts['pacific KR'] >= 4,  `full-KR teams: ${counts['pacific KR']}`);
    assert.ok(counts['pacific TH'] >= 2,  `full-TH teams: ${counts['pacific TH']}`);
    assert.ok(counts['pacific JP'] >= 1,  `full-JP teams: ${counts['pacific JP']}`);
    assert.ok(counts['china CN'] >= 7,    `full-CN teams: ${counts['china CN']}`);
  });

  test('china is majority Chinese-dominated (3+ CN in every counted five)', () => {
    const gs = newGame();
    const dominated = gs.regions.china.teams.filter(t =>
      t.startingFive.filter(p => p.nationality === 'CN').length >= 3).length;
    assert.ok(dominated >= 7, `only ${dominated}/12 china teams are CN-dominated`);
  });

  test('EMEA mixed rosters all run English comms', () => {
    const gs = newGame();
    for (const t of gs.regions.emea.teams) {
      if (teamNationality(t).mixed) {
        assert.equal(commLanguage(t.startingFive).lang, 'en',
          `${t.abbr} is mixed but does not run English`);
      }
    }
  });

  test('the preseason market never breaks a full national squad', () => {
    const gs = newGame();
    const monoBefore = new Map();
    for (const rk of REGION_KEYS) {
      for (const t of gs.regions[rk].teams) {
        const nats = new Set(t.roster.map(p => p.nationality));
        if (nats.size === 1) monoBefore.set(t, [...nats][0]);
      }
    }
    assert.ok(monoBefore.size > 0, 'no mono-national teams generated at all');
    clearFreeAgentMarket(gs);
    for (const [t, nat] of monoBefore) {
      assert.ok(t.roster.every(p => p.nationality === nat),
        `${t.abbr} lost its full-${nat} identity in the preseason market`);
    }
  });
});

/* ─────────────── Team nationality ─────────────── */

describe('team nationality', () => {
  const fakeTeam = nats => ({ roster: nats.map(n => ({ nationality: n })) });

  test('a strict majority classifies the team', () => {
    const { code, mixed } = teamNationality(fakeTeam(['US', 'US', 'US', 'BR', 'BR']));
    assert.equal(code, 'US');
    assert.equal(mixed, false);
  });

  test('no majority means a mixed international team', () => {
    const { code, mixed } = teamNationality(fakeTeam(['US', 'US', 'CA', 'CL', 'BR']));
    assert.equal(code, null);
    assert.equal(mixed, true);
  });

  test('empty roster is neither a country nor mixed', () => {
    const { code, mixed } = teamNationality(fakeTeam([]));
    assert.equal(code, null);
    assert.equal(mixed, false);
  });
});

/* ─────────────── AI signings preserve coverage ─────────────── */

describe('AI signing windows', () => {
  test('preseason market clearing never breaks a roster\'s shared language', () => {
    const gs = newGame();
    clearFreeAgentMarket(gs);
    for (const team of ALL_TIER1(gs)) {
      assert.equal(commUncovered(team.roster), 0, `${team.abbr} broken by market clearing`);
    }
  });

  test('offseason and tier-2 signings never break it either', () => {
    const gs = newGame();
    runOffseasonAISignings(gs);
    for (const rk of REGION_KEYS) runTier2AISignings(gs, rk);
    for (const team of [...ALL_TIER1(gs), ...ALL_TIER2(gs)]) {
      if (team.isHuman) continue;   // the human may do as they please
      assert.equal(commUncovered(team.roster), 0,
        `${team.abbr} (tier ${team.tier}) broken by a signing window`);
    }
  });

  test('midseason reactive signings refuse a player who can\'t talk to the room', () => {
    // Regression: this path inlines its own loop instead of sharing
    // attemptSigning, and shipped without the language filter — an
    // 85-OVR release was signed by English-comms clubs ~35% of the time.
    const gs = newGame();
    const outsider = generatePlayer({ regionKey: 'pacific' });
    outsider.nationality = 'KR';
    outsider.languages = ['ko'];
    outsider.overall = 90;
    outsider.age = 20;
    outsider.contract = null;
    gs.regions.americas.freeAgents.push(outsider);

    // No americas club runs Korean comms, so nobody may bite — however
    // many times the 35% inner roll is offered.
    assert.ok(ALL_TIER1(gs)
      .filter(t => gs.regions.americas.teams.includes(t))
      .every(t => commLanguage(t.roster).lang !== 'ko'), 'test setup broken');
    for (let i = 0; i < 50; i++) {
      for (const t of gs.regions.americas.teams) t._midseasonMoves = 0;
      runMidseasonReactiveSignings(gs, outsider);
    }
    assert.ok(gs.regions.americas.freeAgents.includes(outsider),
      'a club signed a player nobody on the roster can talk to');
    for (const team of gs.regions.americas.teams) {
      assert.equal(commUncovered(team.roster), 0, `${team.abbr} went incoherent`);
    }
  });

  test('a poach backfill speaks the bereaved club\'s language', () => {
    const gs = newGame();
    for (let i = 0; i < 10; i++) {
      const team = gs.regions.americas.tier2.teams[i];
      const departed = team.roster[0];
      team.roster.splice(0, 1);
      const { player: replacement } = backfillTier2Team(gs, 'americas', team, departed);
      assert.equal(commUncovered(team.roster), 0,
        `${team.abbr} backfill left the club unable to talk`);
      assert.ok(team.roster.includes(replacement));
    }
  });
});

/* ─────────────── Learning ─────────────── */

describe('language learning', () => {
  test('an import learns the room\'s language within bounded windows', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    const { lang } = commLanguage(team.roster);
    // Drop in an import who cannot speak it (Korean speaker on a
    // non-Korean side; if the team somehow runs Korean comms, use Thai).
    const importNat = lang === 'ko' ? 'TH' : 'KR';
    const outsider = generatePlayer({ regionKey: 'pacific' });
    outsider.nationality = importNat;
    outsider.languages = [nativeLanguageOf(importNat)];
    team.roster.push(outsider);

    assert.ok(!speaks(outsider, lang));
    let windows = 0;
    while (!speaks(outsider, lang) && windows < 60) {
      runLanguageLearning(team);
      windows++;
    }
    assert.ok(speaks(outsider, lang), 'never learned the comms language in 60 windows');
    assert.ok(speaks(outsider, nativeLanguageOf(importNat)), 'learning must not drop the native');
  });

  test('learning is additive — nobody already covered changes', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    const before = team.roster.map(p => [...playerLanguages(p)]);
    runLanguageLearning(team);
    team.roster.forEach((p, i) => {
      assert.deepEqual(playerLanguages(p), before[i], `${p.tag} changed with nothing to learn`);
    });
  });
});

/* ─────────────── The match penalty ─────────────── */

describe('communication multiplier', () => {
  const speaker = langs => ({ nationality: 'US', languages: langs });

  test('a five with a shared language plays at full strength', () => {
    const five = Array.from({ length: 5 }, () => speaker(['en']));
    assert.equal(communicationMultiplier(five), 1);
  });

  test('each player outside the loop costs the flat per-player penalty', () => {
    const five = [
      speaker(['en']), speaker(['en']), speaker(['en']),
      { nationality: 'KR', languages: ['ko'] },
      { nationality: 'JP', languages: ['ja'] },
    ];
    assert.equal(commUncovered(five), 2);
    assert.equal(communicationMultiplier(five), 1 - 2 * COMM_PENALTY_PER_UNCOVERED);
  });

  test('an exact coverage tie resolves the same way in any roster order', () => {
    // Regression: the tiebreak used to fall through to iteration order,
    // so dragging the depth chart flipped the comms label on tied fives.
    const five = [
      { nationality: 'US', languages: ['en'] }, { nationality: 'US', languages: ['en'] },
      { nationality: 'BR', languages: ['pt'] }, { nationality: 'BR', languages: ['pt'] },
      { nationality: 'KR', languages: ['ko'] },
    ];
    const forward = commLanguage(five).lang;
    const backward = commLanguage([...five].reverse()).lang;
    assert.equal(forward, backward, 'tie flipped with roster order');
  });

  test('an interpreter-free room still anchors on the largest group', () => {
    // 2 en / 2 ko / 1 ja: largest shared group is 2, so 3 are uncovered.
    const five = [
      speaker(['en']), speaker(['en']),
      { nationality: 'KR', languages: ['ko'] }, { nationality: 'KR', languages: ['ko'] },
      { nationality: 'JP', languages: ['ja'] },
    ];
    assert.equal(commUncovered(five), 3);
  });
});

/* ─────────────── Persistence ─────────────── */

describe('persistence', () => {
  test('languages round-trip verbatim', () => {
    const gs = newGame();
    const team = humanTeam(gs);
    addLanguage(team.roster[0], 'ja');
    const expected = team.roster.map(p => [...p.languages]);
    const loaded = humanTeam(roundTrip(gs));
    assert.deepEqual(loaded.roster.map(p => p.languages), expected);
  });

  test('a save that predates languages is backfilled and grandfathered coherent', async () => {
    const gs = newGame();
    roundTrip(gs);   // writes the save

    // Simulate the legacy save: strip `languages` from every serialized
    // player, exactly as a pre-feature save would look.
    const raw = JSON.parse(globalThis.localStorage.getItem('gm-sim-save-v2'));
    (function strip(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(strip); return; }
      if (node.__type === 'player') delete node.languages;
      Object.values(node).forEach(strip);
    })(raw);
    globalThis.localStorage.setItem('gm-sim-save-v2', JSON.stringify(raw));

    // roundTrip saves first, which would overwrite the doctored save —
    // load directly instead.
    const { loadGameState } = await import('../src/engine/persistence.js');
    const migrated = loadGameState();
    assert.ok(migrated, 'doctored save failed to load');

    // The backfill roll is seeded by player id: loading the same save
    // again (autosave failed, say) must roll the exact same languages,
    // never silently reshuffle which rosters read as coherent.
    const langsOf = gs2 => REGION_KEYS.flatMap(rk =>
      gs2.regions[rk].teams.flatMap(t => t.roster.map(p => `${p.id}:${p.languages.join('/')}`)));
    const again = loadGameState();
    assert.deepEqual(langsOf(again), langsOf(migrated),
      'language backfill differs between loads of the same save');
    for (const rk of REGION_KEYS) {
      for (const team of [...migrated.regions[rk].teams, ...migrated.regions[rk].tier2.teams]) {
        for (const p of team.roster) {
          assert.ok(Array.isArray(p.languages) && p.languages.length >= 1,
            `${p.tag} was not backfilled`);
          assert.ok(speaks(p, nativeLanguageOf(p.nationality)),
            `${p.tag} lost the native-language invariant`);
          assert.equal(p._langBackfilled, undefined, 'migration marker leaked');
        }
        assert.equal(commUncovered(team.roster), 0,
          `${team.abbr} was not grandfathered into coherence`);
      }
      for (const p of migrated.regions[rk].freeAgents) {
        assert.ok(speaks(p, nativeLanguageOf(p.nationality)), `FA ${p.tag} not backfilled`);
      }
    }
  });
});

/* ─────────────── fitsTeamLanguage semantics ─────────────── */

describe('fitsTeamLanguage', () => {
  test('accepts a speaker of the comms language, rejects a non-speaker', () => {
    const roster = Array.from({ length: 5 }, () => ({ nationality: 'BR', languages: ['pt'] }));
    assert.ok(fitsTeamLanguage(roster, { nationality: 'PT', languages: ['pt', 'en'] }));
    assert.ok(!fitsTeamLanguage(roster, { nationality: 'US', languages: ['en'] }));
  });

  test('an empty roster accepts anyone', () => {
    assert.ok(fitsTeamLanguage([], { nationality: 'KR', languages: ['ko'] }));
  });
});
