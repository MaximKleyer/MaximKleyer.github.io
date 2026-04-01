import { ROSTER_MIN, ROSTER_MAX } from '../data/constants.js';

export class Team {
    constructor(name, abbr, color) {
        this.name = name;
        this.abbr = abbr;
        this.color = color;       // brand color for UI
        this.roster = [];         // Array of Player objects
        this.isHuman = false;     // true for the player-controlled team

        // Season record
        this.record = {
            wins: 0,
            losses: 0,
            mapWins: 0,
            mapLosses: 0,
        };

        // Group assignment (set during league init)
        this.group = null;        // 'A' or 'B'
    }

    /** Average overall of all rostered players */
    get overallRating() {
        if (this.roster.length === 0) return 0;
        const sum = this.roster.reduce((s, p) => s + p.overall, 0);
        return Math.round(sum / this.roster.length);
    }

    /** Map win/loss differential */
    get mapDiff() {
        return this.record.mapWins - this.record.mapLosses;
    }

    /** Formatted record string like "3-2" */
    get recordStr() {
        return `${this.record.wins}-${this.record.losses}`;
    }

    /** Is the roster full? */
    get rosterFull() {
        return this.roster.length >= ROSTER_MAX;
    }

    /** Would dropping a player go below minimum? */
    get atMinRoster() {
        return this.roster.length <= ROSTER_MIN;
    }

    addPlayer(player) {
        if (this.roster.length >= ROSTER_MAX) {
            console.warn(`${this.abbr} roster is full`);
            return false;
        }
        this.roster.push(player);
        return true;
    }

    removePlayer(player) {
        const idx = this.roster.indexOf(player);
        if (idx === -1) return false;
        this.roster.splice(idx, 1);
        return true;
    }

    /** Get player at a specific role (or null) */
    getPlayerByRole(role) {
        return this.roster.find(p => p.role === role) || null;
    }
}
