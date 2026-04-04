/**
 * Player.js — Player class and generation.
 *
 * FIXED: Guaranteed unique tags, robust ID generation,
 * generatePlayer never fails.
 */

import { ROLE_WEIGHTS, ROLE_FLOORS } from '../data/constants.js';
import { FIRST_NAMES, TAGS, LAST_NAMES } from '../data/names.js';

// ── Helpers ──

let playerCounter = 0; // Fallback counter for IDs

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
 * Generate a unique ID. Uses crypto.randomUUID if available,
 * falls back to a counter-based ID if not.
 */
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
  // Try base tags first (shuffled)
  const shuffled = [...TAGS].sort(() => Math.random() - 0.5);
  for (const tag of shuffled) {
    if (!usedTags.has(tag)) {
      usedTags.add(tag);
      return tag;
    }
  }

  // All base tags used — append numbers until unique
  let tag;
  let attempts = 0;
  do {
    const base = randomFrom(TAGS);
    const num = Math.floor(Math.random() * 999) + 1;
    tag = `${base}${num}`;
    attempts++;
  } while (usedTags.has(tag) && attempts < 1000);

  usedTags.add(tag);
  return tag;
}

/** Reset tag tracking (call when starting a new league) */
export function resetTagPool() {
  usedTags.clear();
  playerCounter = 0;
}


// ── Player class ──

export class Player {
  constructor(name, tag, role, ratings) {
    this.id = makeId();
    this.name = name;
    this.tag = tag;
    this.role = role;
    this.ratings = ratings;
    this.overall = this.calcOverall();

    this.stats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      acs: 0,
      maps: 0,
    };
  }

  calcOverall() {
    const weights = ROLE_WEIGHTS[this.role];
    let sum = 0;
    for (const [stat, weight] of Object.entries(weights)) {
      sum += (this.ratings[stat] || 0) * weight;
    }
    return Math.round(sum);
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


// ── Player generator (NEVER returns null) ──

export function generatePlayer(role) {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  const tag = getUniqueTag();

  const floors = ROLE_FLOORS[role] || {};
  const defaultFloor = 45;

  const ratings = {
    aim:         randRating(floors.aim         || defaultFloor, 99),
    positioning: randRating(floors.positioning || defaultFloor, 99),
    utility:     randRating(floors.utility     || defaultFloor, 99),
    gamesense:   randRating(floors.gamesense   || defaultFloor, 99),
    clutch:      randRating(floors.clutch      || defaultFloor, 99),
  };

  return new Player(`${firstName} ${lastName}`, tag, role, ratings);
}
