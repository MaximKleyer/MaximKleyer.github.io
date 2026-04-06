/**
 * Player.js — Player class and generation.
 *
 * Players are role-agnostic: roles live on strategy assignments (where a
 * player is slotted into a composition), not on the player itself. This
 * lets rosters be flexible and lets a player move between roles between
 * maps without changing their stored identity.
 *
 * Stored fields:
 *   id, name, tag       — identity
 *   ratings             — { aim, positioning, utility, gamesense, clutch }
 *   overall             — computed from ratings via a neutral weighting
 *   age                 — 17–30 in fresh generation; aged +1 each offseason
 *   nationality         — ISO 3166-1 alpha-2 code (e.g. 'US', 'KR')
 *   stats               — { kills, deaths, assists, acs, maps } (per-season)
 */

import { TAGS, getNamePool } from '../data/names.js';
import { randomNationalityForRegion } from '../data/nationalities.js';

// ── Helpers ──

let playerCounter = 0;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Bimodal rating distribution:
 * 8% elite, 10% bad, 82% normal bell curve.
 */
function randRating(min, max) {
  const roll = Math.random();
  if (roll < 0.08) {
    return Math.round(max - Math.random() * (max - min) * 0.15);
  } else if (roll < 0.18) {
    return Math.round(min + Math.random() * (max - min) * 0.20);
  } else {
    const r = (Math.random() + Math.random()) / 2;
    return Math.round(min + r * (max - min));
  }
}

/**
 * Age distribution for initial roster generation:
 * most players 19–24, some 17–18 rookies, some 25–29 vets.
 * Retirement kicks in at 30 so nobody is generated older than 29.
 */
function randAge() {
  const r = Math.random();
  if (r < 0.10) return 17 + Math.floor(Math.random() * 2);   // 17–18 rookie
  if (r < 0.70) return 19 + Math.floor(Math.random() * 4);   // 19–22 prime
  if (r < 0.92) return 23 + Math.floor(Math.random() * 3);   // 23–25 experienced
  return 26 + Math.floor(Math.random() * 4);                 // 26–29 vet
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  playerCounter++;
  return `player-${playerCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Unique tag tracking ──
const usedTags = new Set();

function getUniqueTag() {
  const shuffled = [...TAGS].sort(() => Math.random() - 0.5);
  for (const tag of shuffled) {
    if (!usedTags.has(tag)) {
      usedTags.add(tag);
      return tag;
    }
  }
  // Fallback: numeric suffix if all base tags exhausted
  let suffix = 2;
  while (true) {
    const candidate = `${randomFrom(TAGS)}${suffix}`;
    if (!usedTags.has(candidate)) {
      usedTags.add(candidate);
      return candidate;
    }
    suffix++;
    if (suffix > 9999) break;
  }
  return `player${Math.floor(Math.random() * 100000)}`;
}

export function resetTagPool() {
  usedTags.clear();
}

// ── Neutral overall weighting (no role dependency) ──
//
// Slightly favors aim as the "foundational" skill while keeping all 5
// ratings meaningful. Sums to exactly 1.0.
const NEUTRAL_WEIGHTS = {
  aim:         0.25,
  positioning: 0.20,
  utility:     0.20,
  gamesense:   0.20,
  clutch:      0.15,
};

function calcNeutralOverall(ratings) {
  let sum = 0;
  for (const [stat, weight] of Object.entries(NEUTRAL_WEIGHTS)) {
    sum += (ratings[stat] || 0) * weight;
  }
  return Math.round(sum);
}

// ── Player class ──

export class Player {
  constructor(name, tag, ratings, { age, nationality } = {}) {
    this.id = makeId();
    this.name = name;
    this.tag = tag;
    this.ratings = ratings;
    this.overall = calcNeutralOverall(ratings);
    this.age = age ?? 20;
    this.nationality = nationality || 'US';

    this.stats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      acs: 0,
      maps: 0,
    };
  }

  calcOverall() {
    return calcNeutralOverall(this.ratings);
  }

  get kd() {
    if (this.stats.deaths === 0) return this.stats.kills;
    return +(this.stats.kills / this.stats.deaths).toFixed(2);
  }

  get avgAcs() {
    if (this.stats.maps === 0) return 0;
    return Math.round(this.stats.acs / this.stats.maps);
  }
}

// ── Player generator ──

/**
 * Generate a new player. Used both for initial roster creation and for
 * rookie generation during the offseason.
 *
 * Accepts an options object:
 *   regionKey     — used to pick a region-appropriate nationality
 *   ageOverride   — explicit age (for rookies, set to 17 or 18)
 *   ratingFloor   — minimum rating on all 5 stats
 *
 * No `role` parameter — players are role-agnostic.
 *
 * Backward-compat: if called with a string (the old role arg), the string
 * is silently ignored so legacy callers don't crash during migration.
 */
export function generatePlayer(options = {}) {
  if (typeof options === 'string') options = {};

  // Pick nationality first, since the name pool depends on it.
  // If no region is provided, default to 'US' so the name pool lookup
  // still finds a valid pool.
  const nationality = options.regionKey
    ? randomNationalityForRegion(options.regionKey)
    : 'US';

  // Derive first + last name from the nationality-specific pool so the
  // name feels authentic to the player's country.
  const pool = getNamePool(nationality);
  const firstName = randomFrom(pool.first);
  const lastName = randomFrom(pool.last);
  const tag = getUniqueTag();

  const floor = options.ratingFloor ?? 45;
  const ratings = {
    aim:         randRating(floor, 99),
    positioning: randRating(floor, 99),
    utility:     randRating(floor, 99),
    gamesense:   randRating(floor, 99),
    clutch:      randRating(floor, 99),
  };

  const age = options.ageOverride ?? randAge();

  return new Player(
    `${firstName} ${lastName}`,
    tag,
    ratings,
    { age, nationality },
  );
}
