/**
 * generation.js — building a fresh VCT 2027 save.
 *
 * The 2027 mode is a different world from the franchise league: each
 * region holds exactly 8 PARTNER organizations (direct-seeded into
 * regional main events) and a deep OPEN SCENE — 32 clubs per sub-region
 * qualifier (~350 league-wide) fighting for the 8 open slots at every
 * Kickoff and Cup.
 *
 * Partners generate like franchise tier-1 sides: identity-anchored
 * rosters (the region's national-squad quotas apply to the eight), a
 * 70-overall floor, franchise-grade contracts. Open clubs generate like
 * a second division with a wider spread: seeded orgs land in the upper
 * bands, generated clubs range from "one round from a Cup" down to
 * "happy to be here", with the occasional standout worth a partner's
 * attention. Every club is language-coherent via the same identity
 * machinery as the franchise mode, drawing nationalities from its own
 * SUB-REGION pool — a Brazil-qualifier club is Brazilian, a South Asia
 * club Indian/Pakistani.
 *
 * The gameState shape deliberately mirrors the franchise save where it
 * can (regions[rk].teams = the partners, regions[rk].freeAgents), so
 * persistence and shared UI reuse just work; the open scene hangs off
 * regions[rk].subRegions[subKey].teams. `mode: 'vct2027'` is the switch
 * everything else keys on.
 */

import { Team } from '../../classes/Team.js';
import { generatePlayer, resetTagPool } from '../../classes/Player.js';
import { REGIONS, REGION_KEYS } from '../../data/regions.js';
import { SUB_REGIONS, OPEN_TEAMS_PER_SUBREGION } from '../../data/vct/subregions.js';
import { getPartnerDefs, PARTNERS_PER_REGION } from '../../data/vct/partners.js';
import { SEEDED_ORGS, generateClubDefs } from '../../data/vct/openOrgs.js';
import { rollTeamIdentities, commLanguage } from '../../data/languages.js';
import { assignRosterRoles, FLEX } from '../../data/roles.js';
import { COMPOSITIONS } from '../../data/strategy.js';
import {
  initMapPool, generateMapRatings, syncCurrentPool, tier1MapAnchor, TIER1_MAP_ANCHOR_FLOOR,
} from '../../data/maps.js';
import {
  calculateBaseSalary, DEFAULT_SALARY_CAP, syncSalaryCap,
} from '../../data/salary.js';

/* ─────────────── Tuning ─────────────── */

export const PARTNER_MIN_OVR = 70;

// Open-scene strength bands. Seeded orgs draw from the top bands only;
// generated clubs spread across all of them. The contender band tops
// out AT partner level deliberately: measured with a lower ceiling,
// open teams took 8% of bracket seats and won nothing across eight full
// seasons — the article's "a non-partner team can out-earn a bottom
// partner" promise never fired. A handful of genuine threats per
// qualifier keeps partners favored without making them safe.
// Chosen by a six-config parallel sweep at 12 full seasons each, not by
// feel. At these values (measured): open teams hold ~30% of regional
// bracket seats, win ~7% of Kickoffs/Cups, take ~17% of Champions
// points-top-4 seats, and produce roughly one open-team Masters title
// and one world title PER TWELVE SEASONS — the article's "extraordinary
// cases" made literal. The first cut (contender ceiling 70) gave opens
// 8% of bracket seats and zero trophies of any kind across eight
// seasons; the aggressive end of the sweep (a 67-79 elite pair) had
// opens winning 31% of regional events, which stops being an upset.
const DEFAULT_OPEN_TUNING = {
  bands: [
    { key: 'contender',  weight: 4, floor: 64, ceiling: 76 },
    { key: 'solid',      weight: 8, floor: 56, ceiling: 68 },
    { key: 'mid',        weight: 12, floor: 51, ceiling: 62 },
    { key: 'filler',     weight: 8, floor: 47, ceiling: 58 },
  ],
  standoutChance: 0.22,
  standoutFloor: 68,
  standoutCeiling: 84,
  seededBump: 3,
};

let openTuning = { ...DEFAULT_OPEN_TUNING };

/**
 * Balance-lab hook: override the open-scene tuning for measurement
 * sweeps (pass null to restore defaults). Same mirror pattern as
 * syncSalaryCap — production code never calls this with arguments.
 */
export function setOpenSceneTuning(overrides = null) {
  openTuning = overrides ? { ...DEFAULT_OPEN_TUNING, ...overrides } : { ...DEFAULT_OPEN_TUNING };
}

const FREE_AGENTS_PER_REGION = 40;
const FA_CEILING = 72;
const FA_ELITE_CHANCE = 0.05;

const INITIAL_CONTRACT_DISCOUNT = 0.90;

/* ─────────────── Helpers ─────────────── */

function partnerContract(player, seasonNumber) {
  const r = Math.random();
  const length = r < 0.3 ? 1 : r < 0.7 ? 2 : 3;
  const base = calculateBaseSalary(player.overall);
  return {
    salary: Math.round(base * INITIAL_CONTRACT_DISCOUNT / 5000) * 5000,
    yearsRemaining: length,
    signedYear: Math.max(2027, seasonNumber - (3 - length)),
  };
}

function openContract(player, seasonNumber) {
  const base = calculateBaseSalary(player.overall);
  const r = Math.random();
  return {
    salary: Math.max(40000, Math.round(base * 0.5 / 5000) * 5000),
    yearsRemaining: r < 0.5 ? 1 : 2,
    signedYear: seasonNumber,
  };
}

/** Expand weighted bands into one entry per club, shuffled. */
function assignOpenBands(count) {
  const src = openTuning.bands;
  const bands = [];
  for (const b of src) for (let i = 0; i < b.weight; i++) bands.push(b);
  while (bands.length < count) bands.push(src[2]);
  bands.length = count;
  for (let i = bands.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bands[i], bands[j]] = [bands[j], bands[i]];
  }
  return bands;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Ages: partners like tier-1; opens skew young with a grinder tail. */
function openAge() {
  const r = Math.random();
  if (r < 0.40) return 17 + Math.floor(Math.random() * 3);   // 17-19
  if (r < 0.75) return 20 + Math.floor(Math.random() * 3);   // 20-22
  if (r < 0.92) return 23 + Math.floor(Math.random() * 4);   // 23-26
  return 27 + Math.floor(Math.random() * 3);                 // 27-29
}

/* ─────────────── Partner generation ─────────────── */

function buildPartner(def, regionKey, identity, seasonNumber) {
  const team = new Team(def.name, def.abbr, def.color);
  const roles = assignRosterRoles(5);
  while (team.roster.length < 5) {
    team.roster.push(generatePlayer({
      regionKey,
      teamLanguage: identity.language,
      nationality: identity.nationality || undefined,
      ...roles[team.roster.length],
    }));
  }

  // Same floor discipline as franchise tier 1: re-roll the weakest
  // non-flex slot with an escalating floor until the side reads like a
  // professional roster.
  let guard = 0;
  while (team.overallRating < PARTNER_MIN_OVR && guard < 8) {
    const out = team.roster
      .filter(p => p.primaryRole !== FLEX)
      .sort((a, b) => a.overall - b.overall)[0];
    if (!out) break;
    const replacement = generatePlayer({
      regionKey,
      teamLanguage: identity.language,
      nationality: identity.nationality || undefined,
      primaryRole: out.primaryRole,
      secondaryRole: out.secondaryRole,
      ratingFloor: 50 + guard * 4,
    });
    if (replacement.overall > out.overall) {
      team.roster[team.roster.indexOf(out)] = replacement;
    }
    guard++;
  }

  for (const p of team.roster) p.contract = partnerContract(p, seasonNumber);
  team.mapRatings = generateMapRatings(tier1MapAnchor(team.overallRating));
  team.strategy.comp = team.bestCompFor(COMPOSITIONS) || team.strategy.comp;
  team.autoAssignStrategy();
  return team;
}

/* ─────────────── Open club generation ─────────────── */

function buildOpenClub(def, regionKey, subKey, band, seeded, seasonNumber) {
  const sub = SUB_REGIONS[regionKey][subKey];
  const team = new Team(def.name, def.abbr, def.color);
  team.tier = 2;
  team.subRegion = subKey;

  const teamLanguage = randomFrom(sub.langPool);
  const hasStandout = Math.random() < openTuning.standoutChance;
  const roles = assignRosterRoles(5);
  // Seeded orgs never draw the bottom band — an established name fields
  // an established roster.
  const floorBump = seeded ? openTuning.seededBump : 0;

  for (let i = 0; i < 5; i++) {
    const standout = hasStandout && i === 0;
    team.roster.push(generatePlayer({
      regionKey,
      nationalityPool: sub.pool,
      teamLanguage,
      ...roles[i],
      ageOverride: openAge(),
      ratingFloor:   standout ? openTuning.standoutFloor   : band.floor + floorBump,
      ratingCeiling: standout ? openTuning.standoutCeiling : band.ceiling + floorBump,
    }));
  }
  team.roster.sort((a, b) => b.overall - a.overall);

  for (const p of team.roster) p.contract = openContract(p, seasonNumber);
  team.mapRatings = generateMapRatings(team.overallRating || 58);
  team.strategy.comp = team.bestCompFor(COMPOSITIONS) || team.strategy.comp;
  team.autoAssignStrategy();
  return team;
}

/* ─────────────── Free agents ─────────────── */

function buildFreeAgents(regionKey) {
  const subKeys = Object.keys(SUB_REGIONS[regionKey]);
  const out = [];
  for (let i = 0; i < FREE_AGENTS_PER_REGION; i++) {
    const sub = SUB_REGIONS[regionKey][randomFrom(subKeys)];
    const elite = Math.random() < FA_ELITE_CHANCE;
    out.push(generatePlayer({
      regionKey,
      nationalityPool: sub.pool,
      ratingFloor: elite ? FA_CEILING + 1 : undefined,
      ratingCeiling: elite ? 85 : FA_CEILING,
    }));
  }
  return out;
}

/* ─────────────── Entry point ─────────────── */

/**
 * Build a fresh VCT 2027 gameState.
 *
 * humanChoice:
 *   { type: 'partner', regionKey, abbr }        — manage a partner org
 *   { type: 'open', regionKey, subKey, abbr }   — start in the open scene
 */
export function initVctGame(humanChoice) {
  resetTagPool();
  const seasonNumber = 2027;
  const regions = {};

  for (const regionKey of REGION_KEYS) {
    const regionDef = REGIONS[regionKey];

    // ── Partners: identity-anchored like franchise tier 1 ──
    const identities = rollTeamIdentities(regionKey, PARTNERS_PER_REGION);
    const partners = getPartnerDefs(regionKey).map((def, i) =>
      buildPartner(def, regionKey, identities[i], seasonNumber));

    // ── Open scene: 32 clubs per sub-region ──
    // Name/abbr uniqueness is region-wide so bracket views and save keys
    // can never confuse two clubs.
    const taken = {
      names: new Set(partners.map(t => t.name)),
      abbrs: new Set(partners.map(t => t.abbr)),
    };
    const subRegions = {};
    for (const subKey of Object.keys(SUB_REGIONS[regionKey])) {
      const seeds = (SEEDED_ORGS[subKey] || []).filter(d => !taken.abbrs.has(d.abbr));
      for (const d of seeds) { taken.names.add(d.name); taken.abbrs.add(d.abbr); }
      const generated = generateClubDefs(OPEN_TEAMS_PER_SUBREGION - seeds.length, taken);

      const bands = assignOpenBands(OPEN_TEAMS_PER_SUBREGION);
      const teams = [
        ...seeds.map((def, i) => buildOpenClub(def, regionKey, subKey, bands[i], true, seasonNumber)),
        ...generated.map((def, i) =>
          buildOpenClub(def, regionKey, subKey, bands[seeds.length + i], false, seasonNumber)),
      ];
      subRegions[subKey] = { teams };
    }

    regions[regionKey] = {
      name: regionDef.name,
      abbr: regionDef.abbr,
      color: regionDef.color,
      teams: partners,
      freeAgents: buildFreeAgents(regionKey),
      subRegions,
    };
  }

  // ── Human team ──
  let humanRegion = humanChoice?.regionKey || 'americas';
  let humanTeam = null;
  if (humanChoice?.type === 'open') {
    const subTeams = regions[humanRegion]?.subRegions?.[humanChoice.subKey]?.teams || [];
    humanTeam = subTeams.find(t => t.abbr === humanChoice.abbr) || subTeams[0] || null;
  } else {
    const partners = regions[humanRegion]?.teams || [];
    humanTeam = partners.find(t => t.abbr === humanChoice?.abbr) || partners[0] || null;
  }
  if (humanTeam) humanTeam.isHuman = true;

  const pool = initMapPool();
  syncCurrentPool({ mapPool: pool });

  const settings = {
    salaryCap: DEFAULT_SALARY_CAP,
    mapAnchorFloor: TIER1_MAP_ANCHOR_FLOOR,
  };
  syncSalaryCap({ settings });

  return {
    mode: 'vct2027',
    regions,
    humanRegion,
    humanTeamAbbr: humanTeam?.abbr || null,
    humanSubRegion: humanChoice?.type === 'open' ? humanChoice.subKey : null,
    seasonNumber,
    archive: [],
    mapPool: pool,
    settings,
  };
}

/** The human-controlled team in a VCT save (partner or open club). */
export function getVctHumanTeam(gameState) {
  const region = gameState.regions?.[gameState.humanRegion];
  if (!region) return null;
  const fromPartners = region.teams?.find(t => t.isHuman);
  if (fromPartners) return fromPartners;
  for (const sub of Object.values(region.subRegions || {})) {
    const t = sub.teams?.find(x => x.isHuman);
    if (t) return t;
  }
  return null;
}

/** Every team in one VCT region: partners first, then the open scene. */
export function allVctRegionTeams(region) {
  return [
    ...(region?.teams || []),
    ...Object.values(region?.subRegions || {}).flatMap(s => s.teams || []),
  ];
}

/** Convenience for tests and balance scripts. */
export function vctTeamCounts(gameState) {
  const counts = {};
  for (const rk of REGION_KEYS) {
    const region = gameState.regions[rk];
    counts[rk] = {
      partners: region.teams.length,
      open: Object.fromEntries(
        Object.entries(region.subRegions).map(([k, s]) => [k, s.teams.length])
      ),
    };
  }
  return counts;
}
