/**
 * poaching.js — signing a tier-2 player mid-season.
 *
 * Opens during the mid-season window between stages, alongside ordinary
 * free agency, and spends the SAME budget: a poach is one of the two
 * signings a team gets per season.
 *
 * ── Cap and roster rules ──
 * A poached player counts against the cap immediately. Going over is
 * allowed only when the club can dig itself out:
 *
 *   final roster ≥ 6 and over cap → allowed, but a release is REQUIRED
 *                                   before the next stage starts. The
 *                                   window between stages is the grace
 *                                   period.
 *   final roster = 5 and over cap → refused. Five is the floor, so there
 *                                   is nobody left to cut and the club
 *                                   would be stuck over the cap.
 *   under cap                     → always allowed, up to ROSTER_MAX.
 *
 * ── Refusal ──
 * A tier-2 player who is happy where they are may say no. That needs
 * morale at 90+, which only happens to players on a side that keeps
 * going deep (see applyTier2Morale) — so it is uncommon and legible when
 * it does happen.
 *
 * ── Compensation ──
 * The tier-2 club replaces the player: first from the region's free
 * agents, and if nobody is available a replacement is generated at a
 * slightly lower standard so the club is weakened but not crippled.
 * The poached player's morale resets to neutral — a new room, new
 * expectations.
 */

import { ROSTER_MIN, ROSTER_MAX } from '../data/constants.js';
import { computeTeamSalary, getSalaryCap, adjustMorale } from '../data/salary.js';
import { generatePlayer } from '../classes/Player.js';
import { REGION_KEYS } from '../data/regions.js';

/**
 * Expected combat score for a player of a given rating.
 *
 * Measured, not guessed: fitted by least squares over 960 tier-2 player
 * seasons as acs = -92 + 5.26 * overall. An earlier hand-picked baseline
 * (140 + 0.6 * overall) was far too flat and marked 80% of the league as
 * "outperforming", which made the scouting signal meaningless.
 *
 * With this, form centres near zero, roughly 40% of players are positive,
 * and only ~8% clear +40 — so a big number genuinely means something.
 */
export function expectedAcs(overall) {
  return -92 + 5.26 * (overall || 0);
}

/** Morale at or above which a player may refuse to move. */
export const REFUSAL_MORALE = 90;

/** Morale a poached player starts on at their new club. */
export const POACH_RESET_MORALE = 65;

/**
 * Probability a player turns the move down. Zero below the threshold,
 * rising to a coin flip for someone completely elated.
 */
export function refusalChance(player) {
  const m = player?.morale ?? 65;
  if (m < REFUSAL_MORALE) return 0;
  return Math.min(0.5, (m - (REFUSAL_MORALE - 1)) / 22);
}

/** Locate a tier-2 player's club. Returns { regionKey, team } or null. */
export function findTier2Team(gameState, player) {
  for (const rk of REGION_KEYS) {
    for (const team of gameState.regions?.[rk]?.tier2?.teams || []) {
      if (team.roster.includes(player)) return { regionKey: rk, team };
    }
  }
  return null;
}

/**
 * Can `team` sign `player` right now? Pure check — mutates nothing.
 *
 * Returns { allowed, reason, requiresRelease, capAfter, overBy }.
 * `requiresRelease` means the signing is legal but the club must cut
 * someone before the next stage.
 */
export function evaluatePoach(gameState, team, player, { movesRemaining = null } = {}) {
  const base = { allowed: false, requiresRelease: false, capAfter: 0, overBy: 0, reason: '' };

  if (!team || !player) return { ...base, reason: 'No player selected.' };
  if (team.roster.includes(player)) return { ...base, reason: 'Already on your roster.' };
  if (team.roster.length >= ROSTER_MAX) {
    return { ...base, reason: `Roster is full (${ROSTER_MAX}).` };
  }
  if (movesRemaining !== null && movesRemaining <= 0) {
    return { ...base, reason: 'No signings left this season.' };
  }

  const salary = player.contract?.salary || 0;
  const capAfter = computeTeamSalary(team) + salary;
  const cap = getSalaryCap();
  const overBy = capAfter - cap;
  const finalSize = team.roster.length + 1;

  if (overBy <= 0) {
    return { ...base, allowed: true, capAfter, overBy: 0, reason: '' };
  }

  // Over the cap. Legal only if there is somebody to cut afterwards.
  if (finalSize <= ROSTER_MIN) {
    return {
      ...base, capAfter, overBy,
      reason: `Signing would put you $${Math.round(overBy / 1000)}K over the cap with only ` +
              `${finalSize} players. You cannot release below ${ROSTER_MIN}, so this is blocked.`,
    };
  }

  return {
    ...base, allowed: true, requiresRelease: true, capAfter, overBy,
    reason: `Allowed, but you will be $${Math.round(overBy / 1000)}K over the cap and must ` +
            `release a player before the next stage.`,
  };
}

/**
 * Replace a poached player at their old club.
 *
 * Prefers the best free agent left in the region — tier-1 clubs pick over
 * that pool first, so tier 2 gets what remains. When nothing is left, a
 * replacement is generated a little below the departed player so the club
 * is meaningfully weaker without collapsing.
 */
export function backfillTier2Team(gameState, regionKey, team, departed) {
  const region = gameState.regions[regionKey];
  const pool = region?.freeAgents || [];

  if (pool.length > 0) {
    const best = pool.reduce((a, b) => (b.overall > a.overall ? b : a));
    pool.splice(pool.indexOf(best), 1);
    best.contract = {
      salary: Math.max(50000, Math.round((departed.contract?.salary || 80000) * 0.9 / 5000) * 5000),
      yearsRemaining: 1,
      signedYear: gameState.seasonNumber || 2025,
    };
    best.morale = POACH_RESET_MORALE;
    team.roster.push(best);
    team.validateStrategy();
    return { player: best, generated: false };
  }

  const target = Math.max(35, (departed.overall || 60) - 6);
  const replacement = generatePlayer({
    regionKey,
    ageOverride: 17 + Math.floor(Math.random() * 4),
    ratingFloor: Math.max(35, target - 8),
    ratingCeiling: target + 4,
  });
  replacement.contract = {
    salary: Math.max(50000, Math.round((departed.contract?.salary || 80000) * 0.75 / 5000) * 5000),
    yearsRemaining: 1,
    signedYear: gameState.seasonNumber || 2025,
  };
  team.roster.push(replacement);
  team.validateStrategy();
  return { player: replacement, generated: true };
}

/**
 * Execute a poach. Assumes evaluatePoach() already allowed it.
 *
 * Returns { ok, refused, player, replacement, requiresRelease, message }.
 * A refusal still consumes nothing — the approach simply failed.
 */
export function executePoach(gameState, team, player, { force = false } = {}) {
  const source = findTier2Team(gameState, player);
  if (!source) {
    return { ok: false, refused: false, message: 'That player is no longer in tier 2.' };
  }

  if (!force && Math.random() < refusalChance(player)) {
    return {
      ok: false,
      refused: true,
      player,
      message: `${player.tag} turned you down — happy at ${source.team.abbr}.`,
    };
  }

  const evaluation = evaluatePoach(gameState, team, player);

  // Move the player.
  source.team.roster.splice(source.team.roster.indexOf(player), 1);
  source.team.validateStrategy();
  team.roster.push(player);          // arrives as a sub; promote deliberately
  team.validateStrategy();

  // New room, new expectations.
  adjustMorale(player, POACH_RESET_MORALE - (player.morale ?? 65), 'poached_to_tier1');
  player.morale = POACH_RESET_MORALE;

  const replacement = backfillTier2Team(gameState, source.regionKey, source.team, player);

  return {
    ok: true,
    refused: false,
    player,
    fromTeam: source.team,
    replacement,
    requiresRelease: evaluation.requiresRelease,
    message: `Signed ${player.tag} from ${source.team.abbr}` +
      (evaluation.requiresRelease ? ' — you are over the cap and must release a player.' : '.'),
  };
}

/**
 * Every tier-2 player, ranked as a poaching prospect.
 *
 * `form` is average combat score against what the player's rating would
 * predict. A high number is someone outperforming their rating — the
 * signal worth acting on, and the reason to watch the tier-2 stage rather
 * than just sorting by overall.
 */
export function scoutTier2(gameState, regionKey = null) {
  const keys = regionKey ? [regionKey] : REGION_KEYS;
  const out = [];
  for (const rk of keys) {
    for (const team of gameState.regions?.[rk]?.tier2?.teams || []) {
      for (const player of team.roster) {
        const acs = player.avgAcs;
        const expected = expectedAcs(player.overall);
        out.push({
          player,
          team,
          regionKey: rk,
          acs,
          form: acs > 0 ? Math.round(acs - expected) : 0,
          salary: player.contract?.salary || 0,
          resists: (player.morale ?? 65) >= REFUSAL_MORALE,
        });
      }
    }
  }
  return out.sort((a, b) => (b.player.overall + b.form * 0.4) - (a.player.overall + a.form * 0.4));
}
