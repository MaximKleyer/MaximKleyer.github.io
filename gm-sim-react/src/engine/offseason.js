/**
 * offseason.js — AI offseason FA logic driven by team archetypes.
 *
 * Two entry points:
 *   runOffseasonAISignings(gameState)
 *     Called ONCE from beginNewSeason() after aging/retirement/rookies.
 *     Every AI team rolls its move count and attempts signings.
 *
 *   runReactiveAISignings(gameState, triggeringPlayer)
 *     Called from App.jsx whenever the user releases a player to the FA pool.
 *     Each AI team that hasn't hit its reactive cap yet gets ONE extra move
 *     opportunity. The newly-released player is already in the pool at this
 *     point; AI teams may or may not grab them (archetype criteria apply).
 *
 * Both entry points populate `gameState.season.aiOffseasonLog` with per-move
 * descriptions for the Offseason view to display ("G2 signed Hydr4, released
 * Vale").
 *
 * Archetype criteria (match check — does the FA interest this team?):
 *   BIG_SPENDER    FA.overall > weakestStarter.overall + 2
 *   TALENT_SEEKER  FA.age ≤ 22 AND FA.overall ≥ 70
 *   BALANCED       FA.overall > weakestStarter.overall + 4
 *
 * Release rules (which player gets dropped when a signing executes):
 *   BIG_SPENDER    Lowest-overall starter
 *   TALENT_SEEKER  Oldest starter, UNLESS they are the IGL with highest
 *                  gamesense on the team (veteran captain is protected)
 *   BALANCED       Lowest-overall starter
 */

import { ARCHETYPES, archetypeFor } from '../data/archetypes.js';
import { REGION_KEYS } from '../data/regions.js';

// Probability tables for the per-team offseason dice roll.
// The outer roll determines HOW MANY signings this team will attempt.
// For each attempt, the inner 35% chance decides whether the candidate
// actually gets signed (35%) or skipped (65%).
const OUTER_ROLL = [
  { chance: 0.15, moves: 2 }, // 15% → try 2 moves
  { chance: 0.35, moves: 1 }, // 35% → try 1 move
  { chance: 0.50, moves: 0 }, //   else (50%) do nothing
];
const INNER_SIGN_CHANCE = 0.35;

// Maximum moves any AI team can make per offseason (including reactive).
// Cap protects against runaway cascades when the user rapidly releases players.
const MAX_MOVES_PER_OFFSEASON = 2;

/**
 * Top-level call from beginNewSeason. Every AI team rolls its offseason
 * move count and attempts signings. Results are logged to
 * gameState.season.aiOffseasonLog.
 */
export function runOffseasonAISignings(gameState) {
  // Init/reset the per-offseason tracker. Every AI team gets a fresh move
  // counter; moves accumulated during this offseason are tracked on the
  // team instance as team._offseasonMoves (underscore-prefixed to signal
  // "engine-internal, don't rely on this in UI").
  if (!gameState.season.aiOffseasonLog) {
    gameState.season.aiOffseasonLog = [];
  }

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      team._offseasonMoves = 0; // reset at start
      if (team.isHuman) continue;

      // Roll to determine target number of moves this offseason
      const targetMoves = rollMoveCount();
      for (let i = 0; i < targetMoves; i++) {
        if (team._offseasonMoves >= MAX_MOVES_PER_OFFSEASON) break;
        const executed = attemptSigning(team, region, gameState);
        if (executed) team._offseasonMoves++;
        // If no candidate was found or all candidates got skipped, the
        // move slot is wasted — we don't re-roll.
      }
    }
  }
}

/**
 * Reactive signing — triggered when the user releases a player during
 * the offseason. Only considers the SPECIFIC player just released: each
 * AI team under the 2-move cap whose archetype criteria match THIS player
 * gets a re-roll opportunity. 35% chance per match.
 *
 * This is deliberately narrow. Without this scoping, releasing any player
 * would trigger a league-wide signing cascade because every team has
 * SOMETHING interesting in the FA pool to chase. Keeping reactive moves
 * tied to the triggering player makes user releases feel like real market
 * events — "I dropped this guy, who's interested?" — instead of random
 * churn.
 *
 * Returns an array of log entries describing what happened (empty if
 * nothing changed), so App.jsx can surface toast notifications.
 */
export function runReactiveAISignings(gameState, releasedPlayer) {
  const newEntries = [];
  if (!releasedPlayer) return newEntries;

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];

    // Reactive moves only happen in the SAME region as the released player.
    // Cross-region signings don't exist in the game's current model (each
    // region has its own FA pool), so if the released player isn't in this
    // region's pool, skip the whole region.
    if (!region.freeAgents.includes(releasedPlayer)) continue;

    for (const team of region.teams) {
      if (team.isHuman) continue;
      if ((team._offseasonMoves || 0) >= MAX_MOVES_PER_OFFSEASON) continue;
      if (team.roster.length === 0) continue;

      // Weakest starter — needed for the criteria check
      const weakest = team.roster.reduce(
        (w, p) => (p.overall < w.overall ? p : w),
        team.roster[0]
      );

      // Does this team's archetype even want this specific player?
      if (!matchesCriteria(releasedPlayer, weakest, team.archetype)) continue;

      // 35/65 inner roll — same probability as the normal offseason pass
      if (Math.random() > INNER_SIGN_CHANCE) continue;

      // Pick who to release and execute the swap
      const toRelease = chooseReleaseTarget(team, team.archetype);
      if (!toRelease) continue;

      const beforeLogLen = gameState.season.aiOffseasonLog.length;
      executeSwap(team, region, toRelease, releasedPlayer, gameState);
      team._offseasonMoves = (team._offseasonMoves || 0) + 1;
      newEntries.push(...gameState.season.aiOffseasonLog.slice(beforeLogLen));

      // Player is now on a team — no other team can grab them
      break;
    }
  }

  return newEntries;
}

/**
 * The shared probability tables + internal helpers, exposed so the
 * midseason engine can reuse the exact same dice rolls and execution
 * logic. Keeping these in one place means archetype balance changes
 * only need to happen here.
 *
 * Underscore-prefixed to flag "engine-internal, not for general
 * consumption." They were originally private to this file; midseason
 * needed the same logic so they're now shared.
 */
export { OUTER_ROLL as _OUTER_ROLL, INNER_SIGN_CHANCE as _INNER_SIGN_CHANCE };
export {
  rollMoveCount as _rollMoveCount,
  attemptSigning as _attemptSigning,
  matchesCriteria as _matchesCriteria,
  chooseReleaseTarget as _chooseReleaseTarget,
  executeSwap as _executeSwap,
};

/**
 * Roll against OUTER_ROLL to determine how many signings this team will
 * attempt this offseason. Returns 0, 1, or 2.
 */
function rollMoveCount() {
  const roll = Math.random();
  let cumulative = 0;
  for (const { chance, moves } of OUTER_ROLL) {
    cumulative += chance;
    if (roll < cumulative) return moves;
  }
  return 0; // safety fallback (shouldn't reach)
}

/**
 * Try to make one signing for this team.
 *   1. Find weakest starter (for threshold comparisons + default release target)
 *   2. Walk FA pool sorted by archetype fit, highest-first
 *   3. For each candidate matching archetype criteria:
 *        roll 35% — if passes, execute sign+release atomically
 *        if 65% skip, move to next candidate
 *   4. Return true if a signing was executed, false otherwise.
 *
 * Atomic execution means: identify FA + target-to-release FIRST, then swap
 * them in one go. Never leaves roster below ROSTER_MIN.
 */
function attemptSigning(team, region, gameState, logKey = 'aiOffseasonLog') {
  const archetype = archetypeFor(team);
  if (team.roster.length === 0) return false;

  // Weakest starter — used both for threshold checks and default release
  const weakest = team.roster.reduce(
    (w, p) => (p.overall < w.overall ? p : w),
    team.roster[0]
  );

  // Sort FAs by archetype-appropriate fit score (highest first)
  const scoredFAs = region.freeAgents
    .map(fa => ({ fa, score: faFitScore(fa, archetype) }))
    .sort((a, b) => b.score - a.score);

  for (const { fa } of scoredFAs) {
    if (!matchesCriteria(fa, weakest, archetype)) continue;

    // 35/65 inner roll
    if (Math.random() > INNER_SIGN_CHANCE) continue;

    // Determine who to release. For big spender and balanced that's the
    // weakest starter. For talent seeker it's the oldest non-protected player.
    const toRelease = chooseReleaseTarget(team, archetype);
    if (!toRelease) continue; // all roster members protected → can't release

    // Atomic swap — release first (so addPlayer doesn't blow past roster max),
    // then sign. If anything failed mid-swap we'd want to roll back, but
    // both operations are in-memory array ops that can't fail.
    executeSwap(team, region, toRelease, fa, gameState, logKey);
    return true;
  }

  return false;
}

/**
 * Archetype-specific FA scoring. Higher score = this team wants the player more.
 * Used for SORTING the FA pool, not for criteria checks (see matchesCriteria).
 */
function faFitScore(fa, archetype) {
  switch (archetype) {
    case ARCHETYPES.TALENT_SEEKER:
      // Young high-overall players scored higher. 22-year-old with 80 OVR
      // scores 86 vs a 28-year-old with 85 OVR scoring 79.
      return fa.overall + Math.max(0, (25 - fa.age)) * 2;
    case ARCHETYPES.BIG_SPENDER:
    case ARCHETYPES.BALANCED:
    default:
      // Pure overall — higher is better
      return fa.overall;
  }
}

/**
 * Does this FA clear the archetype's minimum bar for a potential signing?
 * This is the hard criteria check. Candidates that fail get skipped entirely;
 * only candidates that pass enter the 35/65 execute-or-skip roll.
 */
function matchesCriteria(fa, weakestStarter, archetype) {
  switch (archetype) {
    case ARCHETYPES.BIG_SPENDER:
      return fa.overall > weakestStarter.overall + 2;
    case ARCHETYPES.TALENT_SEEKER:
      return fa.age <= 22 && fa.overall >= 70;
    case ARCHETYPES.BALANCED:
      return fa.overall > weakestStarter.overall + 4;
    default:
      return false;
  }
}

/**
 * Pick which player to release when a signing is about to execute.
 *
 * Big spender / balanced: lowest-overall starter.
 * Talent seeker: oldest starter, UNLESS they are the protected veteran IGL
 *   (oldest on team AND highest gamesense AND currently IGL). If the oldest
 *   IS the protected IGL, fall through to the second-oldest player.
 *   If the team has no IGL set, use oldest.
 *
 * Returns null if there's no valid release target (extreme edge case,
 * should not happen in practice since rosters are always ≥ 5).
 */
function chooseReleaseTarget(team, archetype) {
  if (team.roster.length === 0) return null;

  if (archetype === ARCHETYPES.TALENT_SEEKER) {
    // Protected IGL check: is the oldest player the IGL with highest gamesense?
    const sortedByAge = [...team.roster].sort((a, b) => b.age - a.age);
    const oldest = sortedByAge[0];
    const isIGL = team.strategy.iglId === oldest.id;
    const maxIQ = Math.max(...team.roster.map(p => p.ratings.gamesense));
    const hasMaxIQ = oldest.ratings.gamesense === maxIQ;

    if (isIGL && hasMaxIQ) {
      // Protected — release second-oldest instead
      return sortedByAge[1] || null;
    }
    return oldest;
  }

  // BIG_SPENDER and BALANCED: release lowest-overall
  return team.roster.reduce(
    (worst, p) => (p.overall < worst.overall ? p : worst),
    team.roster[0]
  );
}

/**
 * Execute the atomic release + sign. Mutates team.roster, region.freeAgents,
 * and appends a log entry. The log target is parameterized via `logKey`
 * so the same executor can be used for offseason (logKey='aiOffseasonLog')
 * and mid-season (logKey='aiMidseasonLog') without duplicating the swap
 * logic. Defaults to the offseason log for backward compat.
 */
function executeSwap(team, region, releasePlayer, signPlayer, gameState, logKey = 'aiOffseasonLog') {
  // Remove release player from roster, add to FA pool
  const rIdx = team.roster.indexOf(releasePlayer);
  if (rIdx === -1) return; // defensive
  team.roster.splice(rIdx, 1);
  region.freeAgents.push(releasePlayer);

  // Remove sign player from FA pool, add to roster
  const sIdx = region.freeAgents.indexOf(signPlayer);
  if (sIdx === -1) {
    // Rollback the release — shouldn't happen but defensive
    team.roster.push(releasePlayer);
    region.freeAgents.pop();
    return;
  }
  region.freeAgents.splice(sIdx, 1);
  team.roster.push(signPlayer);

  // Clean up any stale strategy assignment for the released player
  team.validateStrategy();

  // Ensure log array exists, then append entry. Same shape regardless of
  // which log we're appending to — UI displays both identically.
  if (!Array.isArray(gameState.season[logKey])) {
    gameState.season[logKey] = [];
  }
  gameState.season[logKey].push({
    teamAbbr: team.abbr,
    teamName: team.name,
    teamColor: team.color,
    archetype: team.archetype,
    signed: {
      tag: signPlayer.tag,
      name: signPlayer.name,
      age: signPlayer.age,
      overall: signPlayer.overall,
      nationality: signPlayer.nationality,
    },
    released: {
      tag: releasePlayer.tag,
      name: releasePlayer.name,
      age: releasePlayer.age,
      overall: releasePlayer.overall,
      nationality: releasePlayer.nationality,
    },
  });
}
