/**
 * Match.js — Round-by-round simulation.
 *
 * FIXED: simulateMap now stores rosterA/rosterB (player ID arrays)
 * on the map result so the UI can show the correct players even
 * if the roster changes after the match.
 *
 * simulateSeries also stores roster snapshots.
 */

import { SIM } from '../data/constants.js';
import { SUBTYPES, IGL_BONUS_MULTIPLIER, IGL_BASELINE } from '../data/strategy.js';

const ROLE_AGGRESSION = {
  duelist: 1.4, initiator: 1.1, flex: 1.0, controller: 0.8, sentinel: 0.7,
};

const SUBTYPE_WEIGHTS = {};
for (const role of Object.keys(SUBTYPES)) {
  for (const sub of SUBTYPES[role]) {
    SUBTYPE_WEIGHTS[sub.id] = sub.weights;
  }
}

function getDuelRating(player, assignment) {
  const r = player.ratings;
  let weights = null;
  if (assignment && assignment.subtypeId) {
    weights = SUBTYPE_WEIGHTS[assignment.subtypeId];
  }
  let base;
  if (weights) {
    base = (r.aim * (weights.aim || 0)) + (r.positioning * (weights.positioning || 0))
         + (r.gamesense * (weights.gamesense || 0)) + (r.clutch * (weights.clutch || 0))
         + (r.utility * (weights.utility || 0));
  } else {
    base = (r.aim * 0.50) + (r.positioning * 0.20) + (r.gamesense * 0.20) + (r.clutch * 0.10);
  }
  return base + (Math.random() * 16) - 8;
}

function getIglBonus(team) {
  const igl = team.igl;
  if (!igl) return 0;
  const iq = igl.ratings.gamesense;
  return iq <= IGL_BASELINE ? 0 : (iq - IGL_BASELINE) * IGL_BONUS_MULTIPLIER;
}

function buildAssignmentMap(team) {
  const map = {};
  if (team.strategy?.assignments) {
    for (const a of team.strategy.assignments) map[a.playerId] = a;
  }
  return map;
}

function pickFighter(alivePlayers, assignmentMap) {
  const weights = alivePlayers.map(p => {
    const a = assignmentMap[p.id];
    // Role-based aggression comes from the strategy assignment only.
    // Players without an assignment get a neutral 1.0 weight.
    return a ? (ROLE_AGGRESSION[a.role] || 1.0) : 1.0;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < alivePlayers.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return alivePlayers[i];
  }
  return alivePlayers[alivePlayers.length - 1];
}

function checkAssist(killer, aliveAllies) {
  const teammates = aliveAllies.filter(p => p !== killer);
  if (teammates.length === 0) return null;
  const avgUtil = teammates.reduce((s, p) => s + p.ratings.utility, 0) / teammates.length;
  if (Math.random() < 0.20 + (avgUtil / 100) * 0.25) {
    const utilWeights = teammates.map(p => p.ratings.utility);
    const total = utilWeights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < teammates.length; i++) {
      roll -= utilWeights[i];
      if (roll <= 0) return teammates[i];
    }
    return teammates[teammates.length - 1];
  }
  return null;
}

const KILL_BONUS = { 5: 150, 4: 130, 3: 110, 2: 90, 1: 70 };

function simulateRound(teamAPlayers, teamBPlayers, roundStats, assignMapA, assignMapB) {
  const aliveA = [...teamAPlayers];
  const aliveB = [...teamBPlayers];
  const roundKills = {}, roundCS = {};
  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    roundKills[p.id] = 0; roundCS[p.id] = 0;
  }

  while (aliveA.length > 0 && aliveB.length > 0) {
    const fA = pickFighter(aliveA, assignMapA);
    const fB = pickFighter(aliveB, assignMapB);
    const rA = getDuelRating(fA, assignMapA[fA.id]);
    const rB = getDuelRating(fB, assignMapB[fB.id]);
    const pA = rA ** 3, pB = rB ** 3;
    const prob = pA / (pA + pB);

    let killer, victim, kAlive, vAlive;
    if (Math.random() < prob) {
      killer = fA; victim = fB; kAlive = aliveA; vAlive = aliveB;
    } else {
      killer = fB; victim = fA; kAlive = aliveB; vAlive = aliveA;
    }

    roundStats[killer.id].kills++; roundStats[victim.id].deaths++;
    roundKills[killer.id]++;
    const dmg = 100 + Math.round(Math.random() * 50);
    const kb = KILL_BONUS[Math.min(vAlive.length, 5)] || 70;
    roundCS[killer.id] += dmg + kb;

    const asst = checkAssist(killer, kAlive);
    if (asst) { roundStats[asst.id].assists++; roundCS[asst.id] += 25; }

    vAlive.splice(vAlive.indexOf(victim), 1);

    if (vAlive.length > 0 && kAlive.length > 0 && Math.random() < 0.15) {
      const trader = pickFighter(vAlive, kAlive === aliveA ? assignMapB : assignMapA);
      roundStats[trader.id].kills++; roundStats[killer.id].deaths++;
      roundKills[trader.id]++;
      const td = 100 + Math.round(Math.random() * 50);
      const tb = KILL_BONUS[Math.min(kAlive.length, 5)] || 70;
      roundCS[trader.id] += td + tb;
      const ta = checkAssist(trader, vAlive);
      if (ta) { roundStats[ta.id].assists++; roundCS[ta.id] += 25; }
      kAlive.splice(kAlive.indexOf(killer), 1);
    }
  }

  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    if (roundKills[p.id] >= 2) roundCS[p.id] += (roundKills[p.id] - 1) * 50;
  }
  const survivors = aliveA.length > 0 ? aliveA : aliveB;
  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    if (roundKills[p.id] === 0) {
      roundCS[p.id] += Math.round(Math.random() * (survivors.includes(p) ? 40 : 20));
    }
  }
  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    roundStats[p.id].combatScore += roundCS[p.id];
  }
  return aliveA.length > 0 ? 'A' : 'B';
}

export function simulateMap(teamA, teamB) {
  let roundsA = 0, roundsB = 0;
  const assignMapA = buildAssignmentMap(teamA);
  const assignMapB = buildAssignmentMap(teamB);
  const iglBonusA = getIglBonus(teamA);
  const iglBonusB = getIglBonus(teamB);

  const roundStats = {};
  for (const p of [...teamA.roster, ...teamB.roster]) {
    roundStats[p.id] = { kills: 0, deaths: 0, assists: 0, combatScore: 0 };
  }

  function playRound() {
    const iglDiff = iglBonusA - iglBonusB;
    const iglSwing = iglDiff * 0.01;
    if (Math.random() < Math.abs(iglSwing)) {
      simulateRound(teamA.roster, teamB.roster, roundStats, assignMapA, assignMapB);
      return iglSwing > 0 ? 'A' : 'B';
    }
    return simulateRound(teamA.roster, teamB.roster, roundStats, assignMapA, assignMapB);
  }

  while (roundsA < 13 && roundsB < 13) {
    if (roundsA === 12 && roundsB === 12) break;
    playRound() === 'A' ? roundsA++ : roundsB++;
  }
  if (roundsA === 12 && roundsB === 12) {
    while (Math.abs(roundsA - roundsB) < 2) {
      playRound() === 'A' ? roundsA++ : roundsB++;
      playRound() === 'A' ? roundsA++ : roundsB++;
    }
  }

  const totalRounds = roundsA + roundsB;
  const winner = roundsA > roundsB ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;

  // Build per-player stats AND snapshot roster IDs at match time
  const playerStats = {};
  const rosterAIds = teamA.roster.map(p => p.id);
  const rosterBIds = teamB.roster.map(p => p.id);

  // Build assignment → role lookup so each player's match stats can
  // record the role they played. Assignment is authoritative — the
  // player itself no longer carries a role field.
  const roleByPlayerId = {};
  for (const t of [teamA, teamB]) {
    for (const a of (t.strategy?.assignments || [])) {
      if (a.playerId && a.role) roleByPlayerId[a.playerId] = a.role;
    }
  }

  for (const player of [...teamA.roster, ...teamB.roster]) {
    const rs = roundStats[player.id];
    const acs = Math.round(rs.combatScore / totalRounds);
    playerStats[player.id] = {
      id: player.id,
      name: player.name,
      tag: player.tag,
      role: roleByPlayerId[player.id] || '—',
      teamAbbr: rosterAIds.includes(player.id) ? teamA.abbr : teamB.abbr,
      kills: rs.kills, deaths: rs.deaths, assists: rs.assists, acs,
    };
    player.stats.kills += rs.kills;
    player.stats.deaths += rs.deaths;
    player.stats.assists += rs.assists;
    player.stats.acs += acs;
    player.stats.maps += 1;
  }

  return {
    roundsA, roundsB, winner, loser, totalRounds, playerStats,
    // Roster snapshots — these IDs won't change even if roster moves happen later
    rosterAIds,
    rosterBIds,
  };
}

export function simulateSeries(teamA, teamB, bestOf = 3) {
  const mapsNeeded = Math.ceil(bestOf / 2);
  const maps = [];
  let winsA = 0, winsB = 0;
  while (winsA < mapsNeeded && winsB < mapsNeeded) {
    const result = simulateMap(teamA, teamB);
    maps.push(result);
    result.winner === teamA ? winsA++ : winsB++;
  }
  const winner = winsA > winsB ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;
  return { winner, loser, maps, score: [winsA, winsB], teamA, teamB };
}