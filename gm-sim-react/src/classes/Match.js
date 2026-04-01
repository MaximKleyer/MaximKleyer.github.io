/**
 * Match.js — Round-by-round Valorant match simulation.
 *
 * UPDATED: simulateMap now returns per-player stats for each map
 * so the UI can show individual map stat lines, not just season totals.
 */

import { SIM } from '../data/constants.js';

// Role aggression weights for duel selection
const ROLE_AGGRESSION = {
  duelist:    1.4,
  initiator:  1.1,
  flex:       1.0,
  controller: 0.8,
  sentinel:   0.7,
};

/** Player's effective combat rating for a single duel */
function getDuelRating(player) {
  const r = player.ratings;
  const base = (r.aim * 0.50) + (r.positioning * 0.20)
             + (r.gamesense * 0.20) + (r.clutch * 0.10);
  const variance = (Math.random() * 16) - 8;
  return base + variance;
}

/** Pick which player takes the next fight (weighted by role aggression) */
function pickFighter(alivePlayers) {
  const weights = alivePlayers.map(p => ROLE_AGGRESSION[p.role] || 1.0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < alivePlayers.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return alivePlayers[i];
  }
  return alivePlayers[alivePlayers.length - 1];
}

/** Check if a teammate gets an assist on a kill */
function checkAssist(killer, aliveAllies) {
  const teammates = aliveAllies.filter(p => p !== killer);
  if (teammates.length === 0) return null;
  const avgUtil = teammates.reduce((s, p) => s + p.ratings.utility, 0) / teammates.length;
  const assistChance = 0.20 + (avgUtil / 100) * 0.25;
  if (Math.random() < assistChance) {
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

/** Kill bonus lookup — more enemies alive = more points */
const KILL_BONUS = { 5: 150, 4: 130, 3: 110, 2: 90, 1: 70 };

/** Simulate one round of 5v5 */
function simulateRound(teamAPlayers, teamBPlayers, roundStats) {
  const aliveA = [...teamAPlayers];
  const aliveB = [...teamBPlayers];
  const roundKills = {};
  const roundCombatScore = {};

  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    roundKills[p.id] = 0;
    roundCombatScore[p.id] = 0;
  }

  while (aliveA.length > 0 && aliveB.length > 0) {
    const fighterA = pickFighter(aliveA);
    const fighterB = pickFighter(aliveB);
    const ratingA = getDuelRating(fighterA);
    const ratingB = getDuelRating(fighterB);
    const powA = ratingA ** 3;
    const powB = ratingB ** 3;
    const probAWins = powA / (powA + powB);

    let killer, victim, killerAlive, victimAlive;
    if (Math.random() < probAWins) {
      killer = fighterA; victim = fighterB;
      killerAlive = aliveA; victimAlive = aliveB;
    } else {
      killer = fighterB; victim = fighterA;
      killerAlive = aliveB; victimAlive = aliveA;
    }

    roundStats[killer.id].kills += 1;
    roundStats[victim.id].deaths += 1;
    roundKills[killer.id] += 1;

    const damageDealt = 100 + Math.round(Math.random() * 50);
    const enemiesAlive = victimAlive.length;
    const killBonus = KILL_BONUS[Math.min(enemiesAlive, 5)] || 70;
    roundCombatScore[killer.id] += damageDealt + killBonus;

    const assister = checkAssist(killer, killerAlive);
    if (assister) {
      roundStats[assister.id].assists += 1;
      roundCombatScore[assister.id] += 25;
    }

    const victimIdx = victimAlive.indexOf(victim);
    victimAlive.splice(victimIdx, 1);

    // Trade kill mechanic
    if (victimAlive.length > 0 && killerAlive.length > 0) {
      if (Math.random() < 0.15) {
        const trader = pickFighter(victimAlive);
        roundStats[trader.id].kills += 1;
        roundStats[killer.id].deaths += 1;
        roundKills[trader.id] += 1;

        const tradeDamage = 100 + Math.round(Math.random() * 50);
        const tradeEnemies = killerAlive.length;
        const tradeBonus = KILL_BONUS[Math.min(tradeEnemies, 5)] || 70;
        roundCombatScore[trader.id] += tradeDamage + tradeBonus;

        const tradeAssister = checkAssist(trader, victimAlive);
        if (tradeAssister) {
          roundStats[tradeAssister.id].assists += 1;
          roundCombatScore[tradeAssister.id] += 25;
        }

        const killerIdx = killerAlive.indexOf(killer);
        killerAlive.splice(killerIdx, 1);
      }
    }
  }

  // Multikill bonuses
  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    if (roundKills[p.id] >= 2) {
      roundCombatScore[p.id] += (roundKills[p.id] - 1) * 50;
    }
  }

  // Chip damage for non-killers
  const survivors = aliveA.length > 0 ? aliveA : aliveB;
  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    if (roundKills[p.id] === 0) {
      const isSurvivor = survivors.includes(p);
      roundCombatScore[p.id] += Math.round(Math.random() * (isSurvivor ? 40 : 20));
    }
  }

  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    roundStats[p.id].combatScore += roundCombatScore[p.id];
  }

  return aliveA.length > 0 ? 'A' : 'B';
}


/**
 * Simulate one map. Returns score AND per-player stats for this map.
 *
 * NEW: returns a `playerStats` object keyed by player.id containing
 * { kills, deaths, assists, acs } for this specific map.
 */
export function simulateMap(teamA, teamB) {
  let roundsA = 0;
  let roundsB = 0;

  const roundStats = {};
  for (const p of [...teamA.roster, ...teamB.roster]) {
    roundStats[p.id] = { kills: 0, deaths: 0, assists: 0, combatScore: 0 };
  }

  // Regulation
  while (roundsA < 13 && roundsB < 13) {
    if (roundsA === 12 && roundsB === 12) break;
    const winner = simulateRound(teamA.roster, teamB.roster, roundStats);
    if (winner === 'A') roundsA++; else roundsB++;
  }

  // Overtime
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

  // Build per-player map stats AND accumulate into season totals
  const playerStats = {};

  for (const player of [...teamA.roster, ...teamB.roster]) {
    const rs = roundStats[player.id];
    const acs = Math.round(rs.combatScore / totalRounds);

    // Per-map stats (stored on the map result for UI display)
    playerStats[player.id] = {
      name: player.name,
      tag: player.tag,
      role: player.role,
      teamAbbr: teamA.roster.includes(player) ? teamA.abbr : teamB.abbr,
      kills: rs.kills,
      deaths: rs.deaths,
      assists: rs.assists,
      acs: acs,
    };

    // Accumulate into season totals
    player.stats.kills += rs.kills;
    player.stats.deaths += rs.deaths;
    player.stats.assists += rs.assists;
    player.stats.acs += acs;
    player.stats.maps += 1;
  }

  return { roundsA, roundsB, winner, loser, totalRounds, playerStats };
}


/** Simulate a best-of-N series */
export function simulateSeries(teamA, teamB, bestOf = 3) {
  const mapsNeeded = Math.ceil(bestOf / 2);
  const maps = [];
  let winsA = 0;
  let winsB = 0;

  while (winsA < mapsNeeded && winsB < mapsNeeded) {
    const result = simulateMap(teamA, teamB);
    maps.push(result);
    if (result.winner === teamA) winsA++; else winsB++;
  }

  const winner = winsA > winsB ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;

  return { winner, loser, maps, score: [winsA, winsB], teamA, teamB };
}
