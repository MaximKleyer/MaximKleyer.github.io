/**
 * live.js — the VCT 2027 season as the HUMAN experiences it.
 *
 * circuit.js can sim any slot in one call; this layer makes the slots
 * the human is actually competing in play out interactively, through
 * the SAME activeSeries machinery the franchise mode uses — so the map
 * veto, per-map advance, the live viewer, and toasts all work unchanged.
 *
 * The rule: only the competition the human is IN steps match by match.
 *   - An open-team human plays their sub-region qualifier round by
 *     round; the other ten qualifiers bulk-sim.
 *   - Whoever reaches a Kickoff/Cup plays its Swiss and bracket match
 *     by match; the other regions' events bulk-sim.
 *   - Masters/Champions step only if the human made the field.
 *   - The human eliminated → the rest of that competition bulk-sims on
 *     the next advance. A slot the human isn't part of at all resolves
 *     in a single advance.
 *
 * State lives in circuit.live (the cursor for the competition being
 * stepped) plus the standard season.activeSeries entries. Both
 * round-trip through saves: teams serialize as refs, and every match
 * object an active entry points at is ALSO reachable from the cursor,
 * which is exactly the shared-object case the save's match-identity
 * markers exist for.
 */

import { REGION_KEYS } from '../../data/regions.js';
import { SUB_REGIONS } from '../../data/vct/subregions.js';
import { CUP_POINTS } from '../../data/vct/points.js';
import { seriesToResult, simulateSeries } from '../../classes/Match.js';
import {
  ensureActiveSeries, seedActiveSeries, advanceOneMap, hasPendingVeto,
} from '../activeSeries.js';
import {
  initSwissStage, buildNextRound, pushRound, recordResult,
  isSwissComplete, finalizeSwiss, getQualifiedSeeds, getEliminatedTeams,
} from '../swissFormat.js';
import {
  getStageMatches, routeBracketStage, isInternationalBracketComplete,
} from '../bracketInternational.js';
import { initTier2Bracket } from '../tier2.js';
import { runSixteenTeamEvent, runMastersEvent, bracketPlacements, stripEventDetail } from './formats.js';
import {
  VCT_SLOTS, initVctCircuit,
  runQualsSlot, runRegionalSlot,
  regionalField, storeRegionalEvent,
  mastersField, storeMastersEvent,
  championsField, storeChampionsEvent,
} from './circuit.js';
import { getVctHumanTeam } from './generation.js';

/** The slim season bag the shared match machinery needs. */
export function ensureVctSeason(gameState) {
  if (!gameState.season) {
    gameState.season = {
      activeSeries: [],
      pendingVeto: null,
      skipVetoThisSeason: false,
      trainingUsed: false,
    };
  }
  return gameState.season;
}

const humanIn = (teams, human) => !!human && teams.includes(human);

/**
 * Mirror of the bracket engines' private processMatchResult: bracket
 * matches update team records on the bulk path (playMatch), so the live
 * path must too, or a season's records depend on which path resolved
 * each event. Swiss and qualifier matches update records on neither
 * path — that asymmetry is deliberate and shared.
 */
function applyRecord(result) {
  if (!result) return;
  const { winner, loser, maps, score } = result;
  winner.record.wins++;
  loser.record.losses++;
  const wm = Math.max(score[0], score[1]);
  const lm = Math.min(score[0], score[1]);
  winner.record.mapWins += wm;
  winner.record.mapLosses += lm;
  loser.record.mapWins += lm;
  loser.record.mapLosses += wm;
  for (const map of maps) {
    const aWon = result.teamA === winner;
    winner.record.roundWins += aWon ? map.roundsA : map.roundsB;
    winner.record.roundLosses += aWon ? map.roundsB : map.roundsA;
    loser.record.roundWins += aWon ? map.roundsB : map.roundsA;
    loser.record.roundLosses += aWon ? map.roundsA : map.roundsB;
  }
}

/* ─────────────── Completion routing ─────────────── */

/**
 * A drained human-relevant series writes its result back into the
 * cursor's structures. AI series never come through here — the live
 * layer only ever seeds the human's own match.
 */
function routeVctCompletion(gameState, entry) {
  const live = gameState.circuit?.live;
  const result = seriesToResult(entry.series);
  const m = entry.matchRef;

  if (entry.vctKind === 'quals' && m) {
    m.winner = result.winner;
    m.score = [...result.score];
    // Full detail kept on the human's own qualifier match so the match
    // report can open it later.
    m.result = result;
  } else if (entry.vctKind === 'swiss' && m && live?.event?.swiss) {
    const swiss = live.event.swiss;
    const aWon = result.winner === swiss.entries[m.aId].team;
    // recordResult writes its own compact match.result shape; the full
    // series detail rides alongside for the match report.
    recordResult(swiss, m, {
      winnerId: aWon ? m.aId : m.bId,
      mapsA: result.score[0],
      mapsB: result.score[1],
      roundsA: result.maps.reduce((s, mp) => s + mp.roundsA, 0),
      roundsB: result.maps.reduce((s, mp) => s + mp.roundsB, 0),
    });
    m.seriesResult = result;
  } else if (entry.vctKind === 'bracket' && m) {
    // routeBracketStage reads match.result directly — same contract as
    // the franchise international flow.
    m.result = result;
    applyRecord(result);
  }
}

/* ─────────────── Cursor construction ─────────────── */

/** Strip per-map player detail from one stored series result. */
function stripResultDetail(result) {
  for (const map of result?.maps || []) { delete map.playerStats; delete map.roundLog; }
}

/**
 * Prune the HUMAN's full match detail from every slot before the one
 * being opened. The live path keeps human matches un-stripped so the
 * match report works during an event — but a whole season of Bo3 round
 * logs measured ~1.7MB of pure save weight. One slot of detail is the
 * budget, same spirit as the franchise archives.
 */
function pruneOldSlotDetail(circuit, beforeIndex) {
  for (let i = 0; i < beforeIndex; i++) {
    const slot = VCT_SLOTS[i];
    const stored = circuit.events[slot.key];
    if (!stored) continue;
    if (slot.type === 'quals') {
      for (const region of Object.values(stored)) {
        for (const sub of Object.values(region)) {
          for (const round of sub.rounds || []) {
            for (const m of round) stripResultDetail(m.result);
          }
        }
      }
    } else {
      const events = slot.type === 'regional' ? Object.values(stored) : [stored];
      for (const event of events) {
        for (const round of event?.swiss?.rounds || []) {
          for (const m of round.matches || []) stripResultDetail(m.seriesResult);
        }
        stripEventDetail(event?.bracket);
      }
    }
  }
}

function openSlot(gameState) {
  const circuit = gameState.circuit;
  const slot = VCT_SLOTS[circuit.slotIndex + 1];
  if (!slot) { circuit.status = 'season-complete'; return null; }
  circuit.slotIndex += 1;
  pruneOldSlotDetail(circuit, circuit.slotIndex);
  const human = getVctHumanTeam(gameState);

  if (slot.type === 'quals') {
    const sk = gameState.humanSubRegion;
    const rk = gameState.humanRegion;
    if (human && sk) {
      // Everyone else's qualifiers resolve now; the human's steps.
      runQualsSlot(gameState, slot, { skip: { regionKey: rk, subKey: sk } });
      const teams = gameState.regions[rk].subRegions[sk].teams;
      circuit.live = {
        slotKey: slot.key,
        type: 'quals',
        quals: {
          regionKey: rk, subKey: sk,
          slots: SUB_REGIONS[rk][sk].slots,
          alive: [...teams].sort((a, b) => b.overallRating - a.overallRating),
          rounds: [],
          currentRound: null,
        },
      };
    } else {
      runQualsSlot(gameState, slot);
    }
    return slot;
  }

  if (slot.type === 'regional') {
    const rk = gameState.humanRegion;
    const field = regionalField(gameState, slot, rk);
    if (humanIn(field, human)) {
      runRegionalSlot(gameState, slot, { skipRegion: rk });
      circuit.live = {
        slotKey: slot.key,
        type: 'event',
        eventKind: 'regional',
        regionKey: rk,
        event: newLiveEvent(field),
      };
    } else {
      runRegionalSlot(gameState, slot);
    }
    return slot;
  }

  if (slot.type === 'masters') {
    const field = mastersField(gameState, slot);
    if (humanIn(field, human)) {
      circuit.live = {
        slotKey: slot.key,
        type: 'event',
        eventKind: 'masters',
        event: {
          phase: 'bracket',
          field,
          swiss: null,
          bracket: initTier2Bracket([...field].sort((a, b) => b.overallRating - a.overallRating)),
        },
      };
    } else {
      storeMastersEvent(gameState, slot, runMastersEvent(field));
    }
    return slot;
  }

  // champions
  const field = championsField(gameState);
  if (humanIn(field, human)) {
    circuit.live = {
      slotKey: slot.key,
      type: 'event',
      eventKind: 'champions',
      event: newLiveEvent(field),
    };
  } else {
    storeChampionsEvent(gameState, slot, runSixteenTeamEvent(field));
  }
  return slot;
}

function newLiveEvent(field) {
  const seeded = [...field].sort((a, b) => b.overallRating - a.overallRating);
  return {
    phase: 'swiss',
    field,
    swiss: initSwissStage(seeded, {
      winsToQualify: 4, lossesToEliminate: 4, maxRounds: 7, bestOf: 3,
    }),
    bracket: null,
  };
}

/* ─────────────── Cursor progression ─────────────── */

const foldPairs = alive => {
  const pairs = [];
  for (let i = 0; i < alive.length / 2; i++) {
    pairs.push([alive[i], alive[alive.length - 1 - i]]);
  }
  return pairs;
};

function seedHumanSeries(gameState, spec) {
  seedActiveSeries(gameState, [spec]);
}

/** One step of a live qualifier. Returns true when the cursor closed. */
function stepQuals(gameState) {
  const circuit = gameState.circuit;
  const q = circuit.live.quals;
  const human = getVctHumanTeam(gameState);

  // Round in flight? Then we're only here because the human's series
  // just drained — close out the round.
  if (q.currentRound) {
    if (q.currentRound.some(m => !m.winner)) return false;   // still waiting
    q.rounds.push(q.currentRound);
    q.alive = q.currentRound.map(m => m.winner)
      .sort((a, b) => b.overallRating - a.overallRating);
    q.currentRound = null;
  }

  while (q.alive.length > q.slots) {
    const round = foldPairs(q.alive).map(([a, b]) => ({ a, b, winner: null, score: null }));
    const humanMatch = round.find(m => m.a === human || m.b === human);

    for (const m of round) {
      if (m === humanMatch) continue;
      const result = simulateSeries(m.a, m.b, 3);
      m.winner = result.winner;
      m.score = [...result.score];
    }

    if (humanMatch) {
      q.currentRound = round;
      seedHumanSeries(gameState, {
        seriesId: `vct:${circuit.live.slotKey}:${q.subKey}:r${q.rounds.length}`,
        phase: 'vct-quals',
        vctKind: 'quals',
        matchRef: humanMatch,
        teamA: humanMatch.a,
        teamB: humanMatch.b,
        bestOf: 3,
      });
      return false;   // wait for the series to play out
    }

    // Human eliminated (or was never here) → resolve rounds silently.
    q.rounds.push(round);
    q.alive = round.map(m => m.winner).sort((a, b) => b.overallRating - a.overallRating);
  }

  // Qualifier finished.
  const events = circuit.events[circuit.live.slotKey];
  events[q.regionKey][q.subKey] = { rounds: q.rounds, qualified: q.alive };
  circuit.live = null;
  return true;
}

/** One step of a live 16-team event or Masters. True when closed. */
function stepEvent(gameState) {
  const circuit = gameState.circuit;
  const live = circuit.live;
  const e = live.event;
  const human = getVctHumanTeam(gameState);
  const slot = VCT_SLOTS[circuit.slotIndex];

  if (e.phase === 'swiss') {
    // Waiting state is DERIVED, never stored: the last pushed round is
    // open while any of its matches lacks a result. (Storing the round
    // separately would duplicate the shared match objects in the save.)
    const lastRound = e.swiss.rounds[e.swiss.rounds.length - 1];
    if (lastRound && lastRound.matches.some(m => !m.result)) return false;

    while (!isSwissComplete(e.swiss)) {
      const matches = buildNextRound(e.swiss);
      if (matches.length === 0) break;
      pushRound(e.swiss, matches);
      const humanMatch = matches.find(m =>
        e.swiss.entries[m.aId].team === human || e.swiss.entries[m.bId].team === human);

      for (const m of matches) {
        if (m === humanMatch) continue;
        const a = e.swiss.entries[m.aId], b = e.swiss.entries[m.bId];
        const result = simulateSeries(a.team, b.team, e.swiss.config.bestOf);
        const aWon = result.winner === a.team;
        recordResult(e.swiss, m, {
          winnerId: aWon ? m.aId : m.bId,
          mapsA: result.score[0],
          mapsB: result.score[1],
          roundsA: result.maps.reduce((s, mp) => s + mp.roundsA, 0),
          roundsB: result.maps.reduce((s, mp) => s + mp.roundsB, 0),
        });
      }

      if (humanMatch) {
        const a = e.swiss.entries[humanMatch.aId], b = e.swiss.entries[humanMatch.bId];
        seedHumanSeries(gameState, {
          seriesId: `vct:${live.slotKey}:swiss:r${e.swiss.rounds.length}`,
          phase: 'vct-swiss',
          vctKind: 'swiss',
          matchRef: humanMatch,
          teamA: a.team,
          teamB: b.team,
          bestOf: e.swiss.config.bestOf,
        });
        return false;
      }
    }

    finalizeSwiss(e.swiss);
    e.bracket = initTier2Bracket(getQualifiedSeeds(e.swiss));
    e.phase = 'bracket';
    // Fall through into the bracket the same tick, so a human knocked
    // out of the Swiss doesn't need extra clicks per bracket stage.
  }

  // ── Bracket ──
  while (e.bracket && !isInternationalBracketComplete(e.bracket)) {
    const unplayed = getStageMatches(e.bracket)
      .filter(({ match }) => !match.result && match.teamA && match.teamB);
    const humanEntry = unplayed.find(({ match }) =>
      match.teamA === human || match.teamB === human);

    for (const s of unplayed) {
      if (s === humanEntry) continue;
      // grandFinal rides through to the auto-veto: the UB finalist gets
      // the format's double ban, exactly as the bulk path's playMatch
      // resolves the same match.
      s.match.result = simulateSeries(
        s.match.teamA, s.match.teamB, s.bestOf, null, { grandFinal: !!s.grandFinal });
      applyRecord(s.match.result);
    }

    if (humanEntry) {
      seedHumanSeries(gameState, {
        seriesId: `vct:${live.slotKey}:bracket:s${e.bracket.stage}`,
        phase: 'vct-bracket',
        vctKind: 'bracket',
        matchRef: humanEntry.match,
        teamA: humanEntry.match.teamA,
        teamB: humanEntry.match.teamB,
        bestOf: humanEntry.bestOf,
        grandFinal: !!humanEntry.grandFinal,
      });
      return false;
    }

    e.bracket = routeBracketStage(e.bracket);
  }

  // ── Event complete ──
  stripEventDetail(e.bracket, human);
  const event = {
    swiss: e.swiss,
    bracket: e.bracket,
    seeds: e.bracket ? undefined : [],
    swissEliminated: e.swiss ? getEliminatedTeams(e.swiss) : [],
    placements: bracketPlacements(e.bracket),
  };
  if (e.swiss) event.seeds = getQualifiedSeeds(e.swiss);
  else event.seeds = [...e.field].sort((a, b) => b.overallRating - a.overallRating);

  if (live.eventKind === 'regional') {
    storeRegionalEvent(gameState, slot, live.regionKey, event);
  } else if (live.eventKind === 'masters') {
    storeMastersEvent(gameState, slot, event);
  } else {
    storeChampionsEvent(gameState, slot, event);
  }
  circuit.live = null;
  return true;
}

/* ─────────────── The tick ─────────────── */

/**
 * Advance the VCT season by one tick — the Advance-button semantics:
 * plays one map on any in-flight series; otherwise progresses (or
 * opens) the current slot. Returns a small status object.
 */
export function advanceVct(gameState) {
  const circuit = gameState.circuit || initVctCircuit(gameState);
  ensureVctSeason(gameState);
  if (circuit.status === 'season-complete') return { done: true };
  if (hasPendingVeto(gameState)) return { blocked: 'veto' };

  const list = ensureActiveSeries(gameState);
  if (list.length > 0) {
    const { completed } = advanceOneMap(gameState);
    const drained = [];
    for (const entry of completed) {
      if (typeof entry.phase === 'string' && entry.phase.startsWith('vct')) {
        routeVctCompletion(gameState, entry);
        drained.push(entry);
      }
    }
    if (gameState.season.activeSeries.length > 0) return { playing: true };
    // The human's series just finished — let the cursor absorb it and
    // carry on to the next seeding in this same tick.
    if (circuit.live) {
      const closed = circuit.live.type === 'quals' ? stepQuals(gameState) : stepEvent(gameState);
      return { playing: true, slotClosed: closed, completedSeries: drained };
    }
    return { playing: true, completedSeries: drained };
  }

  if (circuit.live) {
    const closed = circuit.live.type === 'quals' ? stepQuals(gameState) : stepEvent(gameState);
    return { stepped: true, slotClosed: closed };
  }

  const slot = openSlot(gameState);
  if (!slot) return { done: true };
  return { openedSlot: slot.key, live: !!circuit.live };
}

/**
 * Fast-forward the current slot (or the next one, if none is open) to
 * completion, auto-resolving the human's vetoes. Mirrors the franchise
 * fast-forward semantics: _fastForward skips veto prompts and the
 * one-tick seeding hold.
 */
export function simVctSlot(gameState) {
  ensureVctSeason(gameState);
  const circuit = gameState.circuit || initVctCircuit(gameState);
  if (circuit.status === 'season-complete') return;
  const startIndex = circuit.slotIndex + (circuit.live || gameState.season.activeSeries.length ? 0 : 1);
  gameState.season._fastForward = true;
  try {
    let safety = 2000;
    while (safety-- > 0) {
      const r = advanceVct(gameState);
      if (r.done) break;
      const slotDone = !circuit.live && gameState.season.activeSeries.length === 0
        && circuit.slotIndex >= startIndex;
      if (slotDone) break;
    }
  } finally {
    gameState.season._fastForward = false;
  }
}

/** Fast-forward the whole season (tests, "sim season"). */
export function simVctSeason(gameState) {
  let safety = VCT_SLOTS.length + 2;
  while (safety-- > 0 && gameState.circuit?.status !== 'season-complete') {
    simVctSlot(gameState);
  }
}
