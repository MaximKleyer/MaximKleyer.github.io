/**
 * Team.js — Team class with round win/loss tracking.
 *
 * ADDED: record.roundWins, record.roundLosses
 */

import { ROSTER_MIN, ROSTER_MAX, ROLE_WEIGHTS } from '../data/constants.js';
import { DEFAULT_COMP, COMPOSITIONS, getDefaultSubtype } from '../data/strategy.js';
import { archetypeFor } from '../data/archetypes.js';

export class Team {
  constructor(name, abbr, color) {
    this.name = name;
    this.abbr = abbr;
    this.color = color;
    this.roster = [];
    this.isHuman = false;

    // Archetype governs AI offseason behavior (see data/archetypes.js).
    // Resolved from the hardcoded abbr map; defaults to BALANCED.
    // Human team's archetype is unused by the engine but kept for
    // consistency (the Standings UI can still display it as flavor).
    this.archetype = archetypeFor({ abbr });

    this.record = {
      wins: 0,
      losses: 0,
      mapWins: 0,
      mapLosses: 0,
      roundWins: 0,
      roundLosses: 0,
    };

    this.group = null;

    this.strategy = {
      comp: DEFAULT_COMP,
      assignments: [],
      iglId: null,
    };
  }

  get overallRating() {
    if (this.roster.length === 0) return 0;
    return Math.round(this.roster.reduce((s, p) => s + p.overall, 0) / this.roster.length);
  }

  get mapDiff() { return this.record.mapWins - this.record.mapLosses; }
  get roundDiff() { return this.record.roundWins - this.record.roundLosses; }
  get recordStr() { return `${this.record.wins}-${this.record.losses}`; }
  get rosterFull() { return this.roster.length >= ROSTER_MAX; }
  get atMinRoster() { return this.roster.length <= ROSTER_MIN; }

  get igl() {
    if (!this.strategy.iglId) return null;
    return this.roster.find(p => p.id === this.strategy.iglId) || null;
  }

  addPlayer(player) {
    if (this.roster.length >= ROSTER_MAX) return false;
    this.roster.push(player);
    return true;
  }

  removePlayer(player) {
    const idx = this.roster.indexOf(player);
    if (idx === -1) return false;
    this.roster.splice(idx, 1);
    this.strategy.assignments = this.strategy.assignments.filter(a => a.playerId !== player.id);
    if (this.strategy.iglId === player.id) this.strategy.iglId = null;
    return true;
  }

  autoAssignStrategy() {
    const comp = COMPOSITIONS[this.strategy.comp];
    if (!comp) return;

    const slots = [...comp.slots];
    const assignments = new Array(slots.length).fill(null);
    const used = new Set();

    // For each slot, pick the unused player whose rating profile best
    // matches the role's weighted profile. This replaces the old
    // "player.role === slot.role" matching now that players are
    // role-agnostic. Greedy — assign slot-by-slot in order, taking the
    // best remaining fit each time.
    for (let i = 0; i < slots.length; i++) {
      const role = slots[i];
      const weights = ROLE_WEIGHTS[role] || null;
      let bestPlayer = null;
      let bestScore = -Infinity;
      for (const p of this.roster) {
        if (used.has(p.id)) continue;
        // Score = sum of (player.ratings[stat] * role weight for stat).
        // Falls back to overall if no weights defined for this role.
        let score = 0;
        if (weights) {
          for (const [stat, w] of Object.entries(weights)) {
            score += (p.ratings[stat] || 0) * w;
          }
        } else {
          score = p.overall;
        }
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = p;
        }
      }
      if (bestPlayer) {
        used.add(bestPlayer.id);
        assignments[i] = {
          playerId: bestPlayer.id,
          role,
          subtypeId: getDefaultSubtype(role),
        };
      }
    }

    // Fill any remaining slots with unassigned players sorted by overall
    // (should only trigger if roster is smaller than the comp's slot count)
    const unassigned = this.roster
      .filter(p => !used.has(p.id))
      .sort((a, b) => b.overall - a.overall);
    let ui = 0;
    for (let i = 0; i < slots.length; i++) {
      if (assignments[i] === null && ui < unassigned.length) {
        const player = unassigned[ui++];
        used.add(player.id);
        assignments[i] = {
          playerId: player.id,
          role: slots[i],
          subtypeId: getDefaultSubtype(slots[i]),
        };
      }
    }

    this.strategy.assignments = assignments.filter(a => a !== null);

    const currentIgl = this.roster.find(p => p.id === this.strategy.iglId);
    if (!currentIgl) {
      const best = [...this.roster].sort((a, b) => b.ratings.gamesense - a.ratings.gamesense);
      this.strategy.iglId = best.length > 0 ? best[0].id : null;
    }
  }

  validateStrategy() {
    const rosterIds = new Set(this.roster.map(p => p.id));
    this.strategy.assignments = this.strategy.assignments.filter(a => rosterIds.has(a.playerId));
    if (this.strategy.iglId && !rosterIds.has(this.strategy.iglId)) this.strategy.iglId = null;
    const comp = COMPOSITIONS[this.strategy.comp];
    if (comp && this.strategy.assignments.length < comp.slots.length) {
      this.autoAssignStrategy();
    }
  }
}
