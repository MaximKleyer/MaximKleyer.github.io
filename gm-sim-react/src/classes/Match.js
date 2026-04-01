/**
 * Match.js — Round-by-round Valorant match simulation.
 *
 * ═══════════════════════════════════════════════════════════════
 * HOW THIS WORKS (and why it's realistic)
 * ═══════════════════════════════════════════════════════════════
 *
 * OLD APPROACH (what we had):
 *   - Flip a coin per round to decide winner
 *   - Generate fake stats with formulas after the map
 *   - Kills and deaths were independent → more kills than deaths
 *
 * NEW APPROACH:
 *   - Each round simulates a series of 1v1 duels
 *   - When Player A kills Player B, A gets +1 kill, B gets +1 death
 *   - Kills ALWAYS equal deaths globally (because every death IS a kill)
 *   - Player ratings determine duel win probability
 *   - Round ends when one team is eliminated (all 5 dead)
 *   - Surviving players on the winning team don't die that round
 *
 * VALORANT REALISM:
 *   - Each round is 5v5. Engagements happen sequentially.
 *   - Better players win more duels → more kills, fewer deaths
 *   - Duelists take more fights (more kills AND more deaths)
 *   - Sentinels/controllers take fewer fights but die less
 *   - Assists come from utility usage (flashes, recon, smokes)
 *   - ACS is calculated from kills + damage + assists per round
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { SIM } from '../data/constants.js';

// ── Role-based engagement behavior ──────────────────────────
// How likely each role is to be the one taking a fight.
// Duelists entry first (high aggression), sentinels hold angles (low).
// These are relative weights, not percentages.
const ROLE_AGGRESSION = {
  duelist:    1.4,    // entries, takes early duels
  initiator:  1.1,    // follows up after util
  flex:       1.0,    // average
  controller: 0.8,    // plays around smokes, fewer raw duels
  sentinel:   0.7,    // holds angles, last alive situations
};

/**
 * Calculate a player's "duel rating" — how likely they are to win a 1v1.
 * Combines multiple stats with some randomness per round.
 *
 * @param {Player} player — the player in the duel
 * @returns {number} — effective combat rating for this engagement
 */
function getDuelRating(player) {
  const r = player.ratings;

  // Aim is king in duels, but positioning and game sense help you
  // take favorable angles. Clutch factor adds consistency under pressure.
  const base = (r.aim * 0.50) + (r.positioning * 0.20)
             + (r.gamesense * 0.20) + (r.clutch * 0.10);

  // Per-duel variance: ±8 points. Simulates peeking at the wrong time,
  // getting a lucky headshot, whiffing an easy spray, etc.
  const variance = (Math.random() * 16) - 8;

  return base + variance;
}

/**
 * Pick which player from a team takes the next fight.
 * Higher aggression roles are more likely to be selected.
 * Dead players are skipped.
 *
 * @param {Array} alivePlayers — players still alive this round
 * @returns {Player} — the player who takes the next duel
 */
function pickFighter(alivePlayers) {
  // Weight each alive player by their role's aggression
  const weights = alivePlayers.map(p => ROLE_AGGRESSION[p.role] || 1.0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Weighted random selection
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < alivePlayers.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return alivePlayers[i];
  }
  return alivePlayers[alivePlayers.length - 1]; // fallback
}

/**
 * Determine if an assist is given when a kill happens.
 * Initiator flashes, controller smokes, sentinel utility
 * all contribute to assists. Higher team utility = more assists.
 *
 * @param {Player}  killer       — the player who got the kill
 * @param {Array}   aliveAllies  — killer's alive teammates
 * @returns {Player|null}        — the assisting player, or null
 */
function checkAssist(killer, aliveAllies) {
  // Need at least one alive teammate to get an assist
  const teammates = aliveAllies.filter(p => p !== killer);
  if (teammates.length === 0) return null;

  // Base 30% assist chance, boosted by teammates' utility ratings
  const avgUtil = teammates.reduce((s, p) => s + p.ratings.utility, 0) / teammates.length;
  const assistChance = 0.20 + (avgUtil / 100) * 0.25; // 20% to 45%

  if (Math.random() < assistChance) {
    // The teammate with the highest utility is most likely to assist
    // (they're the ones throwing flashes, smokes, recon darts)
    const utilWeights = teammates.map(p => p.ratings.utility);
    const totalUtil = utilWeights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalUtil;
    for (let i = 0; i < teammates.length; i++) {
      roll -= utilWeights[i];
      if (roll <= 0) return teammates[i];
    }
    return teammates[teammates.length - 1];
  }

  return null;
}


/**
 * Simulate one round of 5v5 Valorant.
 *
 * Tracks detailed per-kill info so we can calculate ACS using
 * the real Valorant combat score formula:
 *   - Damage dealt (~110-150 per kill depending on overkill/chip)
 *   - Kill bonus based on enemies alive: 150/130/110/90/70
 *   - Multikill bonus: +50 per additional kill in the round
 *   - Non-damaging assist: 25 points
 *
 * @param {Array}  teamAPlayers — team A roster
 * @param {Array}  teamBPlayers — team B roster
 * @param {object} roundStats   — per-map stats accumulator
 * @returns {string} — 'A' or 'B' (round winner)
 */
function simulateRound(teamAPlayers, teamBPlayers, roundStats) {
    const aliveA = [...teamAPlayers];
    const aliveB = [...teamBPlayers];
  
    // Track per-round kills for each player (for multikill bonus)
    const roundKills = {};
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      roundKills[p.id] = 0;
    }
  
    // Track per-round combat score (accumulated during the round,
    // then added to the map-level roundStats at the end)
    const roundCombatScore = {};
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      roundCombatScore[p.id] = 0;
    }
  
    // ── Kill bonus lookup ──
    // In Valorant, you get more points for killing when more enemies are alive.
    // 5 alive = 150, 4 = 130, 3 = 110, 2 = 90, 1 = 70
    const KILL_BONUS = { 5: 150, 4: 130, 3: 110, 2: 90, 1: 70 };
  
    while (aliveA.length > 0 && aliveB.length > 0) {
      const fighterA = pickFighter(aliveA);
      const fighterB = pickFighter(aliveB);
  
      const ratingA = getDuelRating(fighterA);
      const ratingB = getDuelRating(fighterB);
      const powA = ratingA ** 3;
      const powB = ratingB ** 3;
      const probAWins = powA / (powA + powB);
  
      let killer, victim, killerTeamAlive, victimTeamAlive;
  
      if (Math.random() < probAWins) {
        killer = fighterA;
        victim = fighterB;
        killerTeamAlive = aliveA;
        victimTeamAlive = aliveB;
      } else {
        killer = fighterB;
        victim = fighterA;
        killerTeamAlive = aliveB;
        victimTeamAlive = aliveA;
      }
  
      // ── Record kill and death ──
      roundStats[killer.id].kills += 1;
      roundStats[victim.id].deaths += 1;
      roundKills[killer.id] += 1;
  
      // ── Damage dealt for this kill ──
      // In Valorant, players have 150 HP (with full shields).
      // Not every kill does exactly 150 damage — sometimes a teammate
      // chipped them, sometimes you overkill with a headshot.
      // Average damage per kill is roughly 110-140.
      const damageDealt = 100 + Math.round(Math.random() * 50);
      roundCombatScore[killer.id] += damageDealt;
  
      // ── Kill bonus based on enemies alive at time of kill ──
      const enemiesAlive = victimTeamAlive.length; // before removing victim
      const killBonus = KILL_BONUS[Math.min(enemiesAlive, 5)] || 70;
      roundCombatScore[killer.id] += killBonus;
  
      // ── Assist check ──
      const assister = checkAssist(killer, killerTeamAlive);
      if (assister) {
        roundStats[assister.id].assists += 1;
        // Non-damaging assist = 25 points in Valorant
        roundCombatScore[assister.id] += 25;
      }
  
      // Remove the dead player
      const victimIdx = victimTeamAlive.indexOf(victim);
      victimTeamAlive.splice(victimIdx, 1);
  
      // ── Trade kill mechanic ──
      if (victimTeamAlive.length > 0 && killerTeamAlive.length > 0) {
        if (Math.random() < 0.15) {
          const trader = pickFighter(victimTeamAlive);
  
          roundStats[trader.id].kills += 1;
          roundStats[killer.id].deaths += 1;
          roundKills[trader.id] += 1;
  
          // Damage for the trade kill
          const tradeDamage = 100 + Math.round(Math.random() * 50);
          // Enemies alive for the trade = killerTeamAlive.length before removing
          const tradeEnemiesAlive = killerTeamAlive.length;
          const tradeKillBonus = KILL_BONUS[Math.min(tradeEnemiesAlive, 5)] || 70;
          roundCombatScore[trader.id] += tradeDamage + tradeKillBonus;
  
          const tradeAssister = checkAssist(trader, victimTeamAlive);
          if (tradeAssister) {
            roundStats[tradeAssister.id].assists += 1;
            roundCombatScore[tradeAssister.id] += 25;
          }
  
          const killerIdx = killerTeamAlive.indexOf(killer);
          killerTeamAlive.splice(killerIdx, 1);
        }
      }
    }
  
    // ── Multikill bonuses ──
    // +50 for each additional kill beyond the first in a single round.
    // 2k = +50, 3k = +100, 4k = +150, ace = +200
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      const kills = roundKills[p.id];
      if (kills >= 2) {
        roundCombatScore[p.id] += (kills - 1) * 50;
      }
    }
  
    // ── Chip damage for surviving players who didn't get a kill ──
    // Even players who didn't kill anyone might have dealt some chip damage.
    // Survivors on the winning team especially tend to have some contribution.
    const survivors = aliveA.length > 0 ? aliveA : aliveB;
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      if (roundKills[p.id] === 0) {
        // Small chip damage: 0-40 points for players who didn't kill
        // Survivors get more (they were shooting but didn't finish anyone)
        const isSurvivor = survivors.includes(p);
        roundCombatScore[p.id] += Math.round(Math.random() * (isSurvivor ? 40 : 20));
      }
    }
  
    // ── Commit round combat scores to the map-level accumulator ──
    for (const p of [...teamAPlayers, ...teamBPlayers]) {
      roundStats[p.id].combatScore += roundCombatScore[p.id];
    }
  
    return aliveA.length > 0 ? 'A' : 'B';
  }


/**
 * ═══════════════════════════════════════════════════════════════
 * SIMULATE ONE MAP (first to 13, OT at 12-12)
 *
 * Plays round by round, accumulating individual player stats.
 * Returns the score and detailed stats for every player.
 * ═══════════════════════════════════════════════════════════════
 */
export function simulateMap(teamA, teamB) {
  // Team strength modifier — adds a slight global edge to the better team.
  // This is ON TOP of individual player duels. It represents teamwork,
  // coordination, calling, economy management — the stuff that doesn't
  // show up in individual ratings.
  const teamModA = (teamA.overallRating / 100) * SIM.VARIANCE;
  const teamModB = (teamB.overallRating / 100) * SIM.VARIANCE;

  let roundsA = 0;
  let roundsB = 0;

  // Initialize per-player round stats tracker
  // We track stats per map, then add to season totals at the end.
  const roundStats = {};
    for (const p of [...teamA.roster, ...teamB.roster]) {
        roundStats[p.id] = { kills: 0, deaths: 0, assists: 0, combatScore: 0 };
    }

  // Play regulation rounds (first to 13, but not past 12-12)
  while (roundsA < 13 && roundsB < 13) {
    if (roundsA === 12 && roundsB === 12) break; // go to OT

    const winner = simulateRound(teamA.roster, teamB.roster, roundStats);
    if (winner === 'A') roundsA++;
    else roundsB++;
  }

  // Overtime: play pairs until 2-round lead
  if (roundsA === 12 && roundsB === 12) {
    while (Math.abs(roundsA - roundsB) < 2) {
      const w1 = simulateRound(teamA.roster, teamB.roster, roundStats);
      if (w1 === 'A') roundsA++; else roundsB++;

      const w2 = simulateRound(teamA.roster, teamB.roster, roundStats);
      if (w2 === 'A') roundsA++; else roundsB++;
    }
  }

  const totalRounds = roundsA + roundsB;
  const winner = roundsA > roundsB ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;

  // ── Commit per-player stats to season totals ──
  for (const player of [...teamA.roster, ...teamB.roster]) {
    const rs = roundStats[player.id];
    player.stats.kills += rs.kills;
    player.stats.deaths += rs.deaths;
    player.stats.assists += rs.assists;

    // ACS = total combat score / rounds played
    // This is the real Valorant formula. combatScore was accumulated
    // round-by-round using actual kill bonuses, damage, multikills,
    // and non-damaging assists — no estimation needed.
    const acs = Math.round(rs.combatScore / totalRounds);
    player.stats.acs += acs;
    player.stats.maps += 1;
  }

  return { roundsA, roundsB, winner, loser, totalRounds };
}


/**
 * ═══════════════════════════════════════════════════════════════
 * SIMULATE A SERIES (best of N maps)
 * ═══════════════════════════════════════════════════════════════
 */
export function simulateSeries(teamA, teamB, bestOf = 3) {
  const mapsNeeded = Math.ceil(bestOf / 2);
  const maps = [];
  let winsA = 0;
  let winsB = 0;

  while (winsA < mapsNeeded && winsB < mapsNeeded) {
    const result = simulateMap(teamA, teamB);
    maps.push(result);
    if (result.winner === teamA) winsA++;
    else winsB++;
  }

  const winner = winsA > winsB ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;

  return { winner, loser, maps, score: [winsA, winsB] };
}