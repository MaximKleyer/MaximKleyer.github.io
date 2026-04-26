/**
 * midseason.js — AI mid-season FA window logic.
 *
 * Mid-season FA windows open between Stage 1 → Stage 2 and between
 * Stage 2 → Stage 3 (NOT before Stage 1, since that's the start of the
 * season, and NOT after Stage 3 since Worlds + offseason follow).
 *
 * Cap: each AI team gets up to 2 signings TOTAL across both mid-season
 * windows in a single season. Tracked on team._midseasonMoves (reset to
 * 0 in beginNewSeason). Same cap applies to the user.
 *
 * Behavior is otherwise identical to the offseason engine — same archetype
 * rolls (15/35/50 outer, 35/65 inner), same matching criteria, same release
 * target selection, same atomic swap semantics. The internal helpers are
 * imported from offseason.js to avoid divergence; only the cap counter
 * and log target differ.
 *
 * Two entry points:
 *   runMidseasonAISignings(gameState)
 *     Called once when entering a 'mid-season-fa' status. Each AI team
 *     rolls — but if they're already at the season cap from offseason
 *     and prior mid-season activity, they skip.
 *
 *   runMidseasonReactiveSignings(gameState, releasedPlayer)
 *     Called from App.jsx whenever the user releases a player during
 *     a mid-season FA window. Same scoping as the offseason version —
 *     only AI teams whose archetype wants THIS specific player get
 *     a re-roll. Cap still applies.
 *
 * Logs go to gameState.season.aiMidseasonLog (array of move entries),
 * separate from the offseason log so the UI can display them under
 * different headers.
 */

import { REGION_KEYS } from '../data/regions.js';
import { archetypeFor } from '../data/archetypes.js';
import {
  _OUTER_ROLL,
  _INNER_SIGN_CHANCE,
  _rollMoveCount,
  _attemptSigning,
  _matchesCriteria,
  _chooseReleaseTarget,
  _executeSwap,
} from './offseason.js';

// Maximum signings any team can make per SEASON across both mid-season
// windows combined. Independent of the offseason cap.
const MAX_MIDSEASON_MOVES_PER_SEASON = 2;

const LOG_KEY = 'aiMidseasonLog';

/**
 * Top-level entry: run AI mid-season signings ONCE when entering a
 * mid-season FA window. Iterates every AI team in every region; each
 * team rolls move count (15/35/50 → 2/1/0 attempts) and tries to sign
 * within its remaining budget.
 *
 * Important: the budget is SEASON-WIDE across both mid-season windows.
 * A team that signed twice in the previous mid-season window has 0
 * remaining and will skip entirely. A team that did 1 has 1 left.
 */
export function runMidseasonAISignings(gameState) {
  if (!gameState.season.aiMidseasonLog) {
    gameState.season.aiMidseasonLog = [];
  }

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      // Don't reset _midseasonMoves here — it persists across both
      // mid-season windows in the same season. Reset happens in
      // beginNewSeason.
      if (typeof team._midseasonMoves !== 'number') team._midseasonMoves = 0;
      if (team.isHuman) continue;

      // Already capped → skip
      if (team._midseasonMoves >= MAX_MIDSEASON_MOVES_PER_SEASON) continue;

      // Roll target moves but clamp to remaining budget
      const remaining = MAX_MIDSEASON_MOVES_PER_SEASON - team._midseasonMoves;
      const targetMoves = Math.min(_rollMoveCount(), remaining);

      for (let i = 0; i < targetMoves; i++) {
        if (team._midseasonMoves >= MAX_MIDSEASON_MOVES_PER_SEASON) break;
        const executed = _attemptSigning(team, region, gameState, LOG_KEY);
        if (executed) team._midseasonMoves++;
      }
    }
  }
}

/**
 * Reactive signing — triggered when the user releases a player during
 * a mid-season FA window. Same scoping as the offseason reactive: only
 * AI teams in the same region whose archetype matches THIS player get
 * a re-roll. Cap applies.
 *
 * Returns an array of new log entries appended this call (for toast
 * display in the UI).
 */
export function runMidseasonReactiveSignings(gameState, releasedPlayer) {
  const newEntries = [];
  if (!releasedPlayer) return newEntries;

  if (!gameState.season.aiMidseasonLog) {
    gameState.season.aiMidseasonLog = [];
  }

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];

    // Only AI teams in the released player's region can react. The FA
    // pool is region-scoped.
    if (!region.freeAgents.includes(releasedPlayer)) continue;

    for (const team of region.teams) {
      if (team.isHuman) continue;
      if ((team._midseasonMoves || 0) >= MAX_MIDSEASON_MOVES_PER_SEASON) continue;
      if (team.roster.length === 0) continue;

      const weakest = team.roster.reduce(
        (w, p) => (p.overall < w.overall ? p : w),
        team.roster[0]
      );

      const archetype = archetypeFor(team);
      if (!_matchesCriteria(releasedPlayer, weakest, archetype)) continue;

      // Inner roll — same probability as offseason
      if (Math.random() > _INNER_SIGN_CHANCE) continue;

      const toRelease = _chooseReleaseTarget(team, archetype);
      if (!toRelease) continue;

      const beforeLogLen = gameState.season.aiMidseasonLog.length;
      _executeSwap(team, region, toRelease, releasedPlayer, gameState, LOG_KEY);
      team._midseasonMoves = (team._midseasonMoves || 0) + 1;
      newEntries.push(...gameState.season.aiMidseasonLog.slice(beforeLogLen));

      // Player has been signed — no other team can grab them
      break;
    }
  }

  return newEntries;
}

/**
 * Helper for UI: how many signings does this team have remaining
 * across the season's mid-season windows? Returns a number 0..MAX.
 */
export function midseasonMovesRemaining(team) {
  const used = team._midseasonMoves || 0;
  return Math.max(0, MAX_MIDSEASON_MOVES_PER_SEASON - used);
}

export { MAX_MIDSEASON_MOVES_PER_SEASON };
