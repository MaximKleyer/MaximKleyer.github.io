/**
 * veto.js — Map ban/pick, side selection, and the resulting map plan.
 *
 * ── Sequences (7-map active pool) ──
 *
 *   Bo3        ban A · ban B · pick A · pick B · ban A · ban B · decider
 *   Bo5        ban A · ban B · pick A · pick B · pick A · pick B · decider
 *   Bo5 (GF)   ban A · ban A · pick B · pick A · pick B · pick A · decider
 *
 * In the grand final the winners-bracket team (always side 'A' here)
 * bans twice and the losers-bracket team does not ban at all; both still
 * pick twice, with the losers-bracket team picking first as partial
 * compensation. Every sequence consumes exactly 6 maps and leaves 1
 * decider, which is why the active pool is pinned at 7.
 *
 * ── Side selection ──
 * Whenever one team PICKS a map, the other team chooses which side it
 * starts on. The decider belongs to neither team, so its sides are
 * decided by a coin flip (recorded as sidePickedBy: null).
 *
 * ── State shape ──
 * Deliberately plain, serializable data: teams are referenced as the
 * strings 'A' / 'B' and maps as ids, never as live object references.
 * That means an in-progress veto survives a save/load without any of
 * the identity-rehydration machinery persistence.js needs for teams.
 */

import { teamMapOverall, teamMapRating } from '../data/maps.js';

/**
 * Build the ordered step list for a series.
 * Each step is { type: 'ban' | 'pick' | 'decider', actor: 'A' | 'B' | null }.
 */
export function buildVetoSequence(bestOf = 3, { grandFinal = false } = {}) {
  if (bestOf >= 5) {
    if (grandFinal) {
      return [
        { type: 'ban',  actor: 'A' },
        { type: 'ban',  actor: 'A' },
        { type: 'pick', actor: 'B' },
        { type: 'pick', actor: 'A' },
        { type: 'pick', actor: 'B' },
        { type: 'pick', actor: 'A' },
        { type: 'decider', actor: null },
      ];
    }
    return [
      { type: 'ban',  actor: 'A' },
      { type: 'ban',  actor: 'B' },
      { type: 'pick', actor: 'A' },
      { type: 'pick', actor: 'B' },
      { type: 'pick', actor: 'A' },
      { type: 'pick', actor: 'B' },
      { type: 'decider', actor: null },
    ];
  }
  // Bo3 (and anything smaller falls back to it)
  return [
    { type: 'ban',  actor: 'A' },
    { type: 'ban',  actor: 'B' },
    { type: 'pick', actor: 'A' },
    { type: 'pick', actor: 'B' },
    { type: 'ban',  actor: 'A' },
    { type: 'ban',  actor: 'B' },
    { type: 'decider', actor: null },
  ];
}

/**
 * Start a veto. `pool` is the active map id list (7 entries).
 * `humanSide` is 'A', 'B', or null when neither team is human.
 */
export function createVeto(pool, bestOf = 3, { grandFinal = false, humanSide = null } = {}) {
  return {
    steps: buildVetoSequence(bestOf, { grandFinal }),
    stepIndex: 0,
    remaining: [...pool],
    bans: [],                 // [{ mapId, by }]
    picks: [],                // [{ mapId, by, firstHalfAttacker, sidePickedBy }]
    pendingSide: null,        // { mapId, chooser } while awaiting a side choice
    humanSide,
    grandFinal,
    bestOf,
    complete: false,
  };
}

/** The step awaiting an action, or null when the veto is finished. */
export function currentStep(veto) {
  if (!veto || veto.complete) return null;
  return veto.steps[veto.stepIndex] || null;
}

/**
 * Is it the human's turn to act right now? Covers both map actions and
 * the side choice that follows an opponent's pick.
 */
export function isHumanTurn(veto) {
  if (!veto || veto.complete || !veto.humanSide) return false;
  if (veto.pendingSide) return veto.pendingSide.chooser === veto.humanSide;
  const step = currentStep(veto);
  return !!step && step.actor === veto.humanSide;
}

function otherSide(side) {
  return side === 'A' ? 'B' : 'A';
}

/**
 * Apply a ban or pick of `mapId` by the current actor.
 * Returns the mutated veto (same object) for convenience.
 */
export function applyMapAction(veto, mapId) {
  if (!veto || veto.complete || veto.pendingSide) return veto;
  const step = currentStep(veto);
  if (!step || step.type === 'decider') return veto;
  if (!veto.remaining.includes(mapId)) return veto;

  veto.remaining = veto.remaining.filter(id => id !== mapId);

  if (step.type === 'ban') {
    veto.bans.push({ mapId, by: step.actor });
    veto.stepIndex++;
  } else {
    // A pick hands the side choice to the opposing team before the
    // sequence advances.
    veto.picks.push({ mapId, by: step.actor, firstHalfAttacker: null, sidePickedBy: null });
    veto.pendingSide = { mapId, chooser: otherSide(step.actor) };
    veto.stepIndex++;
  }

  settleDecider(veto);
  return veto;
}

/**
 * Resolve the side choice that a pick left pending.
 * `side` is the side the CHOOSING team wants to start on.
 */
export function applySideChoice(veto, side) {
  if (!veto || !veto.pendingSide) return veto;
  const { mapId, chooser } = veto.pendingSide;
  const entry = veto.picks.find(p => p.mapId === mapId);
  if (entry) {
    // Store who attacks first in A/B terms so the sim needs no lookup.
    const chooserAttacks = side === 'attack';
    entry.firstHalfAttacker = chooserAttacks ? chooser : otherSide(chooser);
    entry.sidePickedBy = chooser;
  }
  veto.pendingSide = null;
  settleDecider(veto);
  return veto;
}

/**
 * Once every ban/pick step is consumed, the single remaining map becomes
 * the decider with coin-flipped sides, and the veto closes.
 */
function settleDecider(veto) {
  if (veto.complete || veto.pendingSide) return;
  const step = currentStep(veto);
  if (!step || step.type !== 'decider') return;

  const mapId = veto.remaining[0];
  if (mapId) {
    veto.picks.push({
      mapId,
      by: null,                                        // neither team picked it
      firstHalfAttacker: Math.random() < 0.5 ? 'A' : 'B', // coin flip
      sidePickedBy: null,
    });
    veto.remaining = veto.remaining.filter(id => id !== mapId);
  }
  veto.stepIndex++;
  veto.complete = true;
}

/* ─────────────── AI ─────────────── */

/**
 * AI ban: take away the map the OPPONENT is best on.
 *
 * AI pick: choose where the AI itself is strongest, only lightly
 * discounting how good the opponent is there. That is deliberate — real
 * teams over-weight their own comfort picks, so the CPU will sometimes
 * pick into a map the opponent is even better at, which is exactly the
 * failure mode that makes manual veto worth doing.
 */
const OPPONENT_WEIGHT = 0.35;

function aiChooseMap(veto, teamForSide, step) {
  const self = teamForSide(step.actor);
  const opp = teamForSide(otherSide(step.actor));

  let best = null, bestScore = -Infinity;
  for (const mapId of veto.remaining) {
    const selfR = teamMapOverall(self, mapId);
    const oppR = teamMapOverall(opp, mapId);
    const score = step.type === 'ban'
      ? oppR - selfR * 0.25            // ban their strength, discounted by ours
      : selfR - oppR * OPPONENT_WEIGHT; // pick our comfort, lightly checked
    if (score > bestScore) { bestScore = score; best = mapId; }
  }
  return best ?? veto.remaining[0];
}

function aiChooseSide(veto, teamForSide) {
  const { mapId, chooser } = veto.pendingSide;
  const team = teamForSide(chooser);
  const atk = teamMapRating(team, mapId, 'attack');
  const def = teamMapRating(team, mapId, 'defense');
  return atk >= def ? 'attack' : 'defense';
}

/**
 * Advance the veto by exactly one AI action (map or side).
 * Returns true if it acted, false if it was not the AI's turn.
 */
export function stepAI(veto, teamForSide) {
  if (!veto || veto.complete) return false;
  if (veto.pendingSide) {
    if (veto.humanSide && veto.pendingSide.chooser === veto.humanSide) return false;
    applySideChoice(veto, aiChooseSide(veto, teamForSide));
    return true;
  }
  const step = currentStep(veto);
  if (!step || step.type === 'decider') return false;
  if (veto.humanSide && step.actor === veto.humanSide) return false;
  applyMapAction(veto, aiChooseMap(veto, teamForSide, step));
  return true;
}

/**
 * Run AI actions until the veto completes or it is the human's turn.
 */
export function runAIUntilHumanTurn(veto, teamForSide) {
  let guard = 0;
  while (!veto.complete && guard++ < 32) {
    if (!stepAI(veto, teamForSide)) break;
  }
  return veto;
}

/**
 * Finish the whole veto with AI decisions for BOTH teams — used for
 * AI-vs-AI series and for the human's "Auto-pick & Sim" button.
 */
export function autoCompleteVeto(veto, teamForSide) {
  const saved = veto.humanSide;
  veto.humanSide = null;          // let the AI act for both seats
  let guard = 0;
  while (!veto.complete && guard++ < 32) {
    if (!stepAI(veto, teamForSide)) break;
  }
  veto.humanSide = saved;
  return veto;
}

/**
 * Convert a completed veto into the ordered map plan simulateNextMap()
 * consumes. Picks are already stored in play order.
 */
export function vetoToMapPlan(veto) {
  if (!veto) return null;
  return veto.picks.map(p => ({
    mapId: p.mapId,
    firstHalfAttacker: p.firstHalfAttacker || 'A',
    pickedBy: p.by,
    sidePickedBy: p.sidePickedBy,
  }));
}

/**
 * One-shot helper: build and fully auto-resolve a veto. Used everywhere
 * a series starts without human involvement.
 */
export function autoMapPlan(pool, bestOf, teamA, teamB, { grandFinal = false } = {}) {
  const veto = createVeto(pool, bestOf, { grandFinal, humanSide: null });
  autoCompleteVeto(veto, side => (side === 'A' ? teamA : teamB));
  return vetoToMapPlan(veto);
}
