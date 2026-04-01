/**
 * bracket.js — Double elimination bracket engine.
 *
 * ═══════════════════════════════════════════════════════════════
 * BRACKET STRUCTURE (matches the VCT Americas format)
 * ═══════════════════════════════════════════════════════════════
 *
 * UPPER BRACKET:
 *   UB Quarterfinals:  B#2 vs A#3,  A#2 vs B#3         (bo3)
 *   UB Semifinals:     A#1 vs winner(UBQF1),            (bo3)
 *                      B#1 vs winner(UBQF2)
 *   UB Final:          winner(UBSF1) vs winner(UBSF2)   (bo3)
 *
 * LOWER BRACKET:
 *   LB Round 1:        loser(UBQF1) vs B#4,             (bo3)
 *                      loser(UBQF2) vs A#4
 *   LB Quarterfinals:  loser(UBSF2) vs winner(LBR1-1),  (bo3)
 *                      loser(UBSF1) vs winner(LBR1-2)
 *   LB Semifinal:      winner(LBQF1) vs winner(LBQF2)   (bo3)
 *   LB Final:          loser(UBF) vs winner(LBSF)        (bo5)
 *
 * GRAND FINAL:
 *   winner(UBF) vs winner(LBF)                           (bo5)
 *
 * ═══════════════════════════════════════════════════════════════
 *
 * HOW PROGRESSION WORKS:
 *
 * The bracket advances one "stage" at a time. Each stage has a set
 * of matches that can all be played simultaneously. After simulating,
 * winners/losers feed into the next stage's slots.
 *
 * Stages in order:
 *   1. UB Quarterfinals + LB Round 1 can partially run (UBQF first)
 *      Actually, UBQF must run first because LBR1 needs UBQF losers.
 *   2. So: UBQF → LBR1 (needs UBQF losers) → UBSF → LBQF (needs UBSF losers)
 *      → UBFINAL + LBSF → LB Final (needs UBF loser) → Grand Final
 *
 * We define stages as:
 *   Stage 1: ubQF
 *   Stage 2: lbR1 + ubSF (LBR1 gets UBQF losers, UBSF gets UBQF winners)
 *   Stage 3: lbQF + ubFinal (LBQF gets UBSF losers + LBR1 winners)
 *   Stage 4: lbSF (gets LBQF winners)
 *   Stage 5: lbFinal (gets UBF loser + LBSF winner)
 *   Stage 6: grandFinal (gets UBF winner + LBF winner)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { getGroupStandings } from './standings.js';
import { simulateSeries } from '../classes/Match.js';

/**
 * Create an empty match slot.
 * @param {Team|null} teamA — pre-seeded team or null (filled later)
 * @param {Team|null} teamB — pre-seeded team or null (filled later)
 */
function createMatch(teamA = null, teamB = null) {
  return { teamA, teamB, result: null };
}

/**
 * Generate the bracket from group standings.
 * Seeds teams into their starting positions.
 * Only UB Quarterfinals and some LB Round 1 slots are pre-filled;
 * the rest get filled as stages advance.
 *
 * @param {Array} teams — all 12 teams (only top 4 per group qualify)
 * @returns {object} bracket — the full bracket structure
 */
export function generateBracket(teams) {
  const groupA = getGroupStandings(teams, 'A');
  const groupB = getGroupStandings(teams, 'B');

  // Extract seeds (top 4 from each group)
  const a1 = groupA[0], a2 = groupA[1], a3 = groupA[2], a4 = groupA[3];
  const b1 = groupB[0], b2 = groupB[1], b3 = groupB[2], b4 = groupB[3];

  return {
    // Current stage (1-6, or 7 = finished)
    stage: 1,

    // ── Upper Bracket ──
    ubQF: [
      createMatch(b2, a3),     // UBQF-1: B#2 vs A#3
      createMatch(a2, b3),     // UBQF-2: A#2 vs B#3
    ],
    ubSF: [
      createMatch(a1, null),   // UBSF-1: A#1 vs winner of UBQF-1
      createMatch(b1, null),   // UBSF-2: B#1 vs winner of UBQF-2
    ],
    ubFinal: createMatch(),    // Winner UBSF-1 vs Winner UBSF-2

    // ── Lower Bracket ──
    lbR1: [
      createMatch(null, b4),   // LBR1-1: loser of UBQF-1 vs B#4
      createMatch(null, a4),   // LBR1-2: loser of UBQF-2 vs A#4
    ],
    lbQF: [
      createMatch(null, null), // LBQF-1: loser of UBSF-2 vs winner of LBR1-1
      createMatch(null, null), // LBQF-2: loser of UBSF-1 vs winner of LBR1-2
    ],
    lbSF: createMatch(),       // Winner LBQF-1 vs Winner LBQF-2
    lbFinal: createMatch(),    // Loser of UB Final vs Winner of LB SF (bo5)

    // ── Grand Final ──
    grandFinal: createMatch(), // Winner of UB Final vs Winner of LB Final (bo5)

    // Track eliminated teams for display
    eliminated: [],
  };
}


/**
 * Simulate the next stage of the bracket.
 * Each call advances one stage, simulates its matches,
 * and feeds winners/losers into the next stage's slots.
 *
 * @param {object} bracket — the bracket state object
 * @returns {object} — updated bracket (new object for React state)
 */
export function advanceBracketStage(bracket) {
  // Clone to avoid mutating state directly
  // (shallow clone is fine — match objects are updated in place
  // then the outer bracket reference changes for React)
  const b = { ...bracket };

  switch (b.stage) {

    // ── Stage 1: Upper Bracket Quarterfinals ──────────────
    case 1: {
      for (const match of b.ubQF) {
        match.result = simulateSeries(match.teamA, match.teamB, 3);
      }
      // Feed winners into UB Semifinals
      b.ubSF[0].teamB = b.ubQF[0].result.winner; // UBSF-1 gets UBQF-1 winner
      b.ubSF[1].teamB = b.ubQF[1].result.winner; // UBSF-2 gets UBQF-2 winner

      // Feed losers into LB Round 1
      b.lbR1[0].teamA = b.ubQF[0].result.loser;  // LBR1-1 gets UBQF-1 loser
      b.lbR1[1].teamA = b.ubQF[1].result.loser;  // LBR1-2 gets UBQF-2 loser

      b.stage = 2;
      break;
    }

    // ── Stage 2: LB Round 1 + UB Semifinals ──────────────
    case 2: {
      // LB Round 1
      for (const match of b.lbR1) {
        match.result = simulateSeries(match.teamA, match.teamB, 3);
      }
      // UB Semifinals
      for (const match of b.ubSF) {
        match.result = simulateSeries(match.teamA, match.teamB, 3);
      }

      // Feed UB SF winners into UB Final
      b.ubFinal.teamA = b.ubSF[0].result.winner;
      b.ubFinal.teamB = b.ubSF[1].result.winner;

      // Feed into LB Quarterfinals:
      // LBQF-1: loser of UBSF-2 vs winner of LBR1-1 (cross-bracket)
      // LBQF-2: loser of UBSF-1 vs winner of LBR1-2 (cross-bracket)
      b.lbQF[0].teamA = b.ubSF[1].result.loser;
      b.lbQF[0].teamB = b.lbR1[0].result.winner;
      b.lbQF[1].teamA = b.ubSF[0].result.loser;
      b.lbQF[1].teamB = b.lbR1[1].result.winner;

      // Eliminated: LB R1 losers
      b.eliminated = [
        ...b.eliminated,
        b.lbR1[0].result.loser,
        b.lbR1[1].result.loser,
      ];

      b.stage = 3;
      break;
    }

    // ── Stage 3: LB Quarterfinals + UB Final ─────────────
    case 3: {
      // LB Quarterfinals
      for (const match of b.lbQF) {
        match.result = simulateSeries(match.teamA, match.teamB, 3);
      }
      // UB Final
      b.ubFinal.result = simulateSeries(b.ubFinal.teamA, b.ubFinal.teamB, 3);

      // Feed LBQF winners into LB Semifinal
      b.lbSF.teamA = b.lbQF[0].result.winner;
      b.lbSF.teamB = b.lbQF[1].result.winner;

      // UB Final loser goes to LB Final (will be filled after LBSF)
      // UB Final winner waits for Grand Final

      // Eliminated: LBQF losers
      b.eliminated = [
        ...b.eliminated,
        b.lbQF[0].result.loser,
        b.lbQF[1].result.loser,
      ];

      b.stage = 4;
      break;
    }

    // ── Stage 4: LB Semifinal ────────────────────────────
    case 4: {
      b.lbSF.result = simulateSeries(b.lbSF.teamA, b.lbSF.teamB, 3);

      // LB Final: UB Final loser vs LB SF winner (bo5)
      b.lbFinal.teamA = b.ubFinal.result.loser;
      b.lbFinal.teamB = b.lbSF.result.winner;

      // Eliminated: LBSF loser
      b.eliminated = [...b.eliminated, b.lbSF.result.loser];

      b.stage = 5;
      break;
    }

    // ── Stage 5: LB Final (Best of 5) ───────────────────
    case 5: {
      b.lbFinal.result = simulateSeries(b.lbFinal.teamA, b.lbFinal.teamB, 5);

      // Grand Final: UB Final winner vs LB Final winner (bo5)
      b.grandFinal.teamA = b.ubFinal.result.winner;
      b.grandFinal.teamB = b.lbFinal.result.winner;

      // Eliminated: LB Final loser
      b.eliminated = [...b.eliminated, b.lbFinal.result.loser];

      b.stage = 6;
      break;
    }

    // ── Stage 6: Grand Final (Best of 5) ─────────────────
    case 6: {
      b.grandFinal.result = simulateSeries(
        b.grandFinal.teamA, b.grandFinal.teamB, 5
      );

      // Eliminated: Grand Final loser
      b.eliminated = [...b.eliminated, b.grandFinal.result.loser];

      b.stage = 7; // bracket complete
      break;
    }

    default:
      break;
  }

  return b;
}


/**
 * Get the name of the current bracket stage for display.
 */
export function getStageName(stage) {
  const names = {
    1: 'UB Quarterfinals',
    2: 'UB Semifinals + LB Round 1',
    3: 'UB Final + LB Quarterfinals',
    4: 'LB Semifinal',
    5: 'LB Final',
    6: 'Grand Final',
    7: 'Tournament Complete',
  };
  return names[stage] || '';
}


/**
 * Get the champion (or null if bracket isn't finished).
 */
export function getChampion(bracket) {
  if (bracket.stage < 7 || !bracket.grandFinal.result) return null;
  return bracket.grandFinal.result.winner;
}
