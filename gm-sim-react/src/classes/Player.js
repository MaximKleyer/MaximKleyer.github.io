import { ROLE_WEIGHTS, ROLE_FLOORS } from '../data/constants.js';
import { FIRST_NAMES, TAGS, LAST_NAMES } from '../data/names.js';

// ── Helpers ──

/** Pick a random element from an array */
function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** 
 * Bell-curve random between min and max.
 * Averages 3 random rolls so most values cluster in the middle,
 * with rare highs and lows. This keeps stars rare and busts common.
 */
function randRating(min, max) {
    const roll = Math.random();

    if (roll < 0.08) {
        // 8% chance: elite (top 15% of range)
        return Math.round(max - Math.random() * (max - min) * 0.15);
    } else if (roll < 0.18) {
        // 10% chance: bad (bottom 20% of range)
        return Math.round(min + Math.random() * (max - min) * 0.20);
    } else {
        // 82% chance: normal bell curve in the middle
        const r = (Math.random() + Math.random()) / 2;
        return Math.round(min + r * (max - min));
    }
}


// ── Player class ──

export class Player {
    constructor(name, tag, role, ratings) {
        this.id = crypto.randomUUID();  // guaranteed unique
        this.name = name;               // e.g. "Alex Kim"
        this.tag = tag;                 // e.g. "Blitz" (their IGN)
        this.role = role;               // "duelist" | "initiator" | "controller" | "sentinel" | "flex"
        this.ratings = ratings;         // { aim, positioning, utility, gamesense, clutch }
        this.overall = this.calcOverall();

        // Season stats — accumulate across all matches
        this.stats = {
            kills: 0,
            deaths: 0,
            assists: 0,
            acs: 0,        // average combat score (running total, divide by maps)
            maps: 0,       // maps played
        };
    }

    /** Weighted overall based on role */
    calcOverall() {
        const weights = ROLE_WEIGHTS[this.role];
        let sum = 0;
        for (const [stat, weight] of Object.entries(weights)) {
            sum += (this.ratings[stat] || 0) * weight;
        }
        return Math.round(sum);
    }

    /** Kills / Deaths ratio (safe division) */
    get kd() {
        if (this.stats.deaths === 0) return this.stats.kills;
        return +(this.stats.kills / this.stats.deaths).toFixed(2);
    }

    /** Average ACS per map */
    get avgAcs() {
        if (this.stats.maps === 0) return 0;
        return Math.round(this.stats.acs / this.stats.maps);
    }
}


// ── Player generator ────────────────────────────────────────────────────────

// ── Track used tags globally to prevent duplicates ──
const usedTags = new Set();

/** Create a unique tag, appending a number if needed */
function getUniqueTag() {
    const baseTags = [...TAGS]; // don't mutate the original
    // Shuffle to avoid always picking the same ones first
    baseTags.sort(() => Math.random() - 0.5);

    for (const tag of baseTags) {
        if (!usedTags.has(tag)) {
            usedTags.add(tag);
            return tag;
        }
    }

    // All base tags used — append random numbers until unique
    let tag;
    do {
        const base = baseTags[Math.floor(Math.random() * baseTags.length)];
        const num = Math.floor(Math.random() * 99) + 1;
        tag = `${base}${num}`;
    } while (usedTags.has(tag));

    usedTags.add(tag);
    return tag;
}

/** Create a random player for a given role */
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
