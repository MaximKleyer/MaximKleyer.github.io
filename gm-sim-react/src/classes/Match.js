/**
 * Match.js — Round-by-round simulation.
 *
 * FIXED: simulateMap now stores rosterA/rosterB (player ID arrays)
 * on the map result so the UI can show the correct players even
 * if the roster changes after the match.
 *
 * simulateSeries also stores roster snapshots.
 */

import { SIM, ROUNDS_TO_WIN, HALF_LENGTH, REGULATION_ROUNDS } from '../data/constants.js';
import { SUBTYPES, IGL_BONUS_MULTIPLIER, IGL_BASELINE } from '../data/strategy.js';
import { moralePerformanceModifier } from '../data/salary.js';
import { teamMapRating, getCurrentPool } from '../data/maps.js';
import { autoMapPlan } from '../engine/veto.js';

const ROLE_AGGRESSION = {
  duelist: 1.4, initiator: 1.1, flex: 1.0, controller: 0.8, sentinel: 0.7,
};

const SUBTYPE_WEIGHTS = {};
for (const role of Object.keys(SUBTYPES)) {
  for (const sub of SUBTYPES[role]) {
    SUBTYPE_WEIGHTS[sub.id] = sub.weights;
  }
}

/**
 * `sideMult` is the team's map/side strength modifier for the round
 * currently being played — 1.0 is neutral. It multiplies the duel
 * rating before randomness, exactly like morale does, so a team on its
 * best attacking map wins more duels on average without the round
 * becoming deterministic.
 */
function getDuelRating(player, assignment, sideMult = 1) {
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
  // Phase 7e: morale modifies effective performance, asymmetric and
  // bounded ±5%. -5% at morale=0, +3% at morale=100. Applied BEFORE
  // randomness so the noise window is the same regardless of morale —
  // the modifier shifts the mean, not the spread.
  base *= moralePerformanceModifier(player.morale);
  // Map/side comfort. Applied before the noise window for the same
  // reason as morale: it shifts the mean, not the spread.
  base *= sideMult;
  return base + (Math.random() * 16) - 8;
}

/**
 * Convert a 0-100 map/side rating into a duel multiplier centred on the
 * neutral baseline of 70. See SIM.MAP_IMPACT.
 */
export function mapSideModifier(rating) {
  const r = typeof rating === 'number' ? rating : 70;
  return 1 + ((r - 70) / 100) * SIM.MAP_IMPACT;
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

function simulateRound(teamAPlayers, teamBPlayers, roundStats, assignMapA, assignMapB, sideMultA = 1, sideMultB = 1) {
  const aliveA = [...teamAPlayers];
  const aliveB = [...teamBPlayers];
  const roundKills = {}, roundCS = {};
  for (const p of [...teamAPlayers, ...teamBPlayers]) {
    roundKills[p.id] = 0; roundCS[p.id] = 0;
  }

  while (aliveA.length > 0 && aliveB.length > 0) {
    const fA = pickFighter(aliveA, assignMapA);
    const fB = pickFighter(aliveB, assignMapB);
    const rA = getDuelRating(fA, assignMapA[fA.id], sideMultA);
    const rB = getDuelRating(fB, assignMapB[fB.id], sideMultB);
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

/**
 * Which team is attacking on a given 0-based round index?
 *
 *   rounds 0-11   first half   — as decided by the side pick
 *   rounds 12-23  second half  — sides swap
 *   rounds 24+    overtime     — played in 2-round blocks. The first
 *                                round of each block uses the SECOND
 *                                half's sides, the second round flips.
 *
 * Returns true when team A is on attack.
 */
export function isTeamAAttacking(roundIndex, firstHalfAttacker) {
  const aStartsAttack = firstHalfAttacker !== 'B';
  if (roundIndex < HALF_LENGTH) return aStartsAttack;            // 1st half
  if (roundIndex < REGULATION_ROUNDS) return !aStartsAttack;     // 2nd half
  // Overtime: block of 2. Even offset = second-half sides, odd = flipped.
  const otOffset = (roundIndex - REGULATION_ROUNDS) % 2;
  return otOffset === 0 ? !aStartsAttack : aStartsAttack;
}

/**
 * Simulate one map.
 *
 * `plan` describes what is being played and from which sides:
 *   { mapId, firstHalfAttacker: 'A' | 'B', pickedBy, sidePickedBy }
 * All fields are optional — with no plan the map is side-neutral, which
 * keeps older callers and older saves working.
 */
export function simulateMap(teamA, teamB, plan = null) {
  let roundsA = 0, roundsB = 0;
  const assignMapA = buildAssignmentMap(teamA);
  const assignMapB = buildAssignmentMap(teamB);
  const iglBonusA = getIglBonus(teamA);
  const iglBonusB = getIglBonus(teamB);

  const mapId = plan?.mapId || null;
  const firstHalfAttacker = plan?.firstHalfAttacker === 'B' ? 'B' : 'A';

  // Precompute both side multipliers per team so the per-round lookup is
  // just a branch. Neutral (1.0) when the map is unknown.
  const multA = mapId
    ? { attack: mapSideModifier(teamMapRating(teamA, mapId, 'attack')),
        defense: mapSideModifier(teamMapRating(teamA, mapId, 'defense')) }
    : { attack: 1, defense: 1 };
  const multB = mapId
    ? { attack: mapSideModifier(teamMapRating(teamB, mapId, 'attack')),
        defense: mapSideModifier(teamMapRating(teamB, mapId, 'defense')) }
    : { attack: 1, defense: 1 };

  const roundStats = {};
  for (const p of [...teamA.roster, ...teamB.roster]) {
    roundStats[p.id] = { kills: 0, deaths: 0, assists: 0, combatScore: 0 };
  }

  // Track which side each team played each round, so the UI can show
  // half-by-half scorelines.
  const roundSides = [];

  function playRound() {
    const roundIndex = roundsA + roundsB;
    const aAttacking = isTeamAAttacking(roundIndex, firstHalfAttacker);
    const sideMultA = aAttacking ? multA.attack : multA.defense;
    const sideMultB = aAttacking ? multB.defense : multB.attack;
    roundSides.push(aAttacking ? 'A-atk' : 'B-atk');

    const iglDiff = iglBonusA - iglBonusB;
    const iglSwing = iglDiff * 0.01;
    if (Math.random() < Math.abs(iglSwing)) {
      simulateRound(teamA.roster, teamB.roster, roundStats, assignMapA, assignMapB, sideMultA, sideMultB);
      return iglSwing > 0 ? 'A' : 'B';
    }
    return simulateRound(teamA.roster, teamB.roster, roundStats, assignMapA, assignMapB, sideMultA, sideMultB);
  }

  const OT_TRIGGER = ROUNDS_TO_WIN - 1; // 12

  while (roundsA < ROUNDS_TO_WIN && roundsB < ROUNDS_TO_WIN) {
    if (roundsA === OT_TRIGGER && roundsB === OT_TRIGGER) break;
    playRound() === 'A' ? roundsA++ : roundsB++;
  }
  if (roundsA === OT_TRIGGER && roundsB === OT_TRIGGER) {
    // Overtime in 2-round blocks until someone is up by 2.
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
    // Map identity + sides, so the UI can name the map and show who
    // started where instead of a positional "Map 1".
    mapId,
    firstHalfAttacker,
    pickedBy: plan?.pickedBy ?? null,
    sidePickedBy: plan?.sidePickedBy ?? null,
    wentToOvertime: totalRounds > REGULATION_ROUNDS,
    roundSides,
  };
}

export function simulateSeries(teamA, teamB, bestOf = 3, mapPlan = null, opts = {}) {
  const mapsNeeded = Math.ceil(bestOf / 2);
  const maps = [];
  let winsA = 0, winsB = 0;
  // Batch callers (brackets, swiss) don't run an interactive veto, so
  // resolve one automatically against the live pool.
  const plan = mapPlan || autoMapPlan(getCurrentPool(), bestOf, teamA, teamB, opts);
  while (winsA < mapsNeeded && winsB < mapsNeeded) {
    const result = simulateMap(teamA, teamB, plan?.[maps.length] || null);
    maps.push(result);
    result.winner === teamA ? winsA++ : winsB++;
  }
  const winner = winsA > winsB ? teamA : teamB;
  const loser = winner === teamA ? teamB : teamA;
  return { winner, loser, maps, score: [winsA, winsB], teamA, teamB };
}

/* ─────────────── Stateful per-map series API (Phase 6e+ Ask 3) ─────────────── */

/*
 * The original simulateSeries() plays a whole series atomically and
 * returns the final result. That's what drives the "batch" advance mode
 * and is kept intact for fast-forward buttons (Sim Series / Sim Group /
 * Sim Playoffs).
 *
 * These new functions let the engine play a series ONE MAP AT A TIME
 * across multiple Advance clicks. A series is a persistent object that
 * lives in gameState.season.activeSeries[] between clicks until it
 * resolves. Each click calls simulateNextMap() on every active series,
 * then completed ones are drained and processed via the normal
 * processSeriesResult() pipeline in App.jsx.
 *
 * Series objects:
 *   {
 *     teamA, teamB,       // live Team refs
 *     bestOf,             // 3 or 5
 *     maps: [...],        // simulateMap result objects, appended per map
 *     winsA, winsB,       // running map wins
 *     winner, loser,      // null until the series finishes
 *     score,              // [winsA, winsB] snapshot when finished
 *     // metadata used by the caller to know WHERE this series came from
 *     // (scheduleIdx for group stage, bracketMatchRef for brackets, etc.)
 *     origin,             // opaque payload set by caller
 *   }
 */

export function startSeries(teamA, teamB, bestOf = 3, origin = null, mapPlan = null) {
  return {
    teamA, teamB,
    bestOf,
    maps: [],
    winsA: 0, winsB: 0,
    winner: null,
    loser: null,
    score: null,
    origin,
    // Ordered veto result: one entry per map slot, in play order.
    // { mapId, firstHalfAttacker, pickedBy, sidePickedBy }
    mapPlan,
  };
}

export function isSeriesComplete(series) {
  if (!series) return false;
  if (series.winner) return true; // short-circuit
  const mapsNeeded = Math.ceil(series.bestOf / 2);
  return series.winsA >= mapsNeeded || series.winsB >= mapsNeeded;
}

/**
 * Play one map of this series, appending the result and updating win
 * counts. If the series is already complete (winner set) this is a no-op.
 * Returns the map result (or null if the series was already done).
 *
 * Finalization: if this map pushes either team to the required wins,
 * set winner/loser/score so downstream code can detect completion via
 * isSeriesComplete() or by checking series.winner.
 */
export function simulateNextMap(series) {
  if (isSeriesComplete(series)) return null;
  const { teamA, teamB } = series;
  // Play the map the veto assigned to this slot. Falls back to a
  // side-neutral map if the series has no plan (older saves).
  const plan = series.mapPlan?.[series.maps.length] || null;
  const mapResult = simulateMap(teamA, teamB, plan);
  series.maps.push(mapResult);
  if (mapResult.winner === teamA) series.winsA++;
  else series.winsB++;

  const mapsNeeded = Math.ceil(series.bestOf / 2);
  if (series.winsA >= mapsNeeded || series.winsB >= mapsNeeded) {
    series.winner = series.winsA > series.winsB ? teamA : teamB;
    series.loser  = series.winner === teamA ? teamB : teamA;
    series.score  = [series.winsA, series.winsB];
  }
  return mapResult;
}

/**
 * Adapter: builds the same shape that simulateSeries() returns, from a
 * completed series object. Lets existing callers process the result via
 * the same pipeline whether the series was batch-played or map-by-map.
 * Throws if the series isn't complete yet — caller should gate on
 * isSeriesComplete() first.
 */
export function seriesToResult(series) {
  if (!isSeriesComplete(series)) {
    throw new Error('seriesToResult: series not yet complete');
  }
  return {
    winner: series.winner,
    loser: series.loser,
    maps: series.maps,
    score: series.score,
    teamA: series.teamA,
    teamB: series.teamB,
  };
}

/**
 * Play a stateful series to completion in one call. Used by the fast-
 * forward "Sim Series" button and internally when batch-simulating a
 * whole group stage or bracket. Equivalent to repeatedly calling
 * simulateNextMap() until isSeriesComplete().
 */
export function finishSeries(series) {
  while (!isSeriesComplete(series)) {
    simulateNextMap(series);
  }
  return series;
}