/**
 * roles.js — player roles, role fit, and how badly a misfit hurts.
 *
 * Players carry a PRIMARY role, usually a SECONDARY, and rarely are FLEX
 * (equally at home anywhere). Where a player is slotted decides how much
 * of their rating actually shows up:
 *
 *   primary    full rating
 *   flex       a token penalty in every role — never bad, never optimal,
 *              so collecting flex players is not a dominant strategy
 *   secondary  a small penalty: a real fallback, not a trap
 *   off-role   a heavy penalty. An 80 plays like a 70, a 90 like an 80.
 *
 * The penalty is expressed in POINTS OF OVERALL rather than a percentage
 * because that is how it reads to a manager looking at a roster, and it
 * keeps the "80 becomes 70" intuition exact at every rating.
 *
 * Flex players are also generated WEAK. An 80-rated flex would be
 * strictly better than an 80-rated specialist in every composition, so
 * flex is a development project: cheap, versatile, and only valuable
 * once it has been trained up.
 */

export const ROLES = ['duelist', 'initiator', 'controller', 'sentinel'];
export const FLEX = 'flex';

/** Every value `primaryRole` may take. */
export const ALL_ROLES = [...ROLES, FLEX];

/** Rating penalty, in points of overall, for playing a given fit. */
export const ROLE_FIT_PENALTY = {
  primary: 0,
  flex: -2,
  secondary: -3,
  off: -10,
};

/** How rare a flex player is at generation. */
export const FLEX_CHANCE = 1 / 50;

/** Flex players start weak — see the module comment. */
export const FLEX_RATING_CEILING = 62;

/** Chance a non-flex player also has a secondary role. */
export const SECONDARY_CHANCE = 0.65;

/**
 * Game-sense bias by role, in rating points.
 *
 * Initiators call the most, so they skew highest; controllers and
 * sentinels follow; duelists are usually the ones NOT calling. This
 * feeds IGL selection, which reads game sense — but the bias is small
 * enough that a sharp controller still beats a dull initiator, so the
 * IGL is not simply "whoever is the initiator".
 */
export const ROLE_IQ_BIAS = {
  initiator: +6,
  controller: +4,
  sentinel: +3,
  duelist: -2,
  flex: +2,
};

/**
 * How a player fits a role: 'primary' | 'secondary' | 'flex' | 'off'.
 */
export function roleFit(player, role) {
  if (!player || !role) return 'off';
  if (player.primaryRole === FLEX) return 'flex';
  if (player.primaryRole === role) return 'primary';
  if (player.secondaryRole === role) return 'secondary';
  return 'off';
}

/** Penalty in points of overall for slotting `player` at `role`. */
export function roleFitPenalty(player, role) {
  return ROLE_FIT_PENALTY[roleFit(player, role)] ?? ROLE_FIT_PENALTY.off;
}

/**
 * The rating a player actually performs at in a given role.
 * Never drops below 1 so downstream maths cannot divide by zero.
 */
export function effectiveOverall(player, role) {
  const base = player?.overall ?? 0;
  return Math.max(1, base + roleFitPenalty(player, role));
}

/**
 * Multiplier applied to a player's duel rating for the role they are
 * playing. Expressed as effective/base so a flat "-10 overall" scales
 * correctly regardless of how the duel rating is composed.
 */
export function roleFitMultiplier(player, role) {
  const base = player?.overall ?? 0;
  if (base <= 0) return 1;
  return effectiveOverall(player, role) / base;
}

/* ─────────────── Generation ─────────────── */

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Roll a role for a single player with no team context — used for free
 * agents and generated replacements.
 */
export function rollRole() {
  if (Math.random() < FLEX_CHANCE) {
    return { primaryRole: FLEX, secondaryRole: null };
  }
  const primaryRole = pick(ROLES);
  const secondaryRole = Math.random() < SECONDARY_CHANCE
    ? pick(ROLES.filter(r => r !== primaryRole))
    : null;
  return { primaryRole, secondaryRole };
}

/**
 * Roles for a whole roster, guaranteeing a workable spread.
 *
 * Every composition needs all four roles, several needing two of one.
 * Rolling five roles independently regularly produced squads missing a
 * role entirely, which would leave a team permanently forced into an
 * off-role penalty through no decision of the manager's. So a five-man
 * roster gets one of each role plus one duplicate: that guarantees at
 * least one composition is playable entirely on primaries, while still
 * leaving the others as genuine trade-offs.
 *
 * Rosters larger than four are covered; anything smaller just takes a
 * prefix of the shuffled roles.
 */
export function assignRosterRoles(count) {
  const base = shuffle(ROLES);
  const assignments = [];

  for (let i = 0; i < count; i++) {
    const primaryRole = i < base.length ? base[i] : pick(ROLES);
    assignments.push(primaryRole);
  }

  return assignments.map(primaryRole => {
    // A rare flex slots in anywhere; it covers every role, so it never
    // breaks the guaranteed spread.
    if (Math.random() < FLEX_CHANCE) {
      return { primaryRole: FLEX, secondaryRole: null };
    }
    const secondaryRole = Math.random() < SECONDARY_CHANCE
      ? pick(ROLES.filter(r => r !== primaryRole))
      : null;
    return { primaryRole, secondaryRole };
  });
}

/**
 * Best-fit role for a player from their stats alone. Used to migrate
 * saves written before roles existed, so an existing player's tag agrees
 * with the profile they already have rather than being random.
 */
export function inferRoleFromStats(player) {
  const r = player?.ratings || {};
  const scores = {
    duelist:    (r.aim || 0) * 0.6 + (r.clutch || 0) * 0.4,
    initiator:  (r.utility || 0) * 0.5 + (r.gamesense || 0) * 0.5,
    controller: (r.utility || 0) * 0.6 + (r.positioning || 0) * 0.4,
    sentinel:   (r.positioning || 0) * 0.6 + (r.gamesense || 0) * 0.4,
  };
  let best = ROLES[0];
  for (const role of ROLES) if (scores[role] > scores[best]) best = role;

  // Second best becomes the secondary, provided it is genuinely close;
  // a distant second is not a role this player can actually cover.
  const rest = ROLES.filter(x => x !== best).sort((a, b) => scores[b] - scores[a]);
  const runnerUp = rest[0];
  const secondaryRole = scores[runnerUp] >= scores[best] * 0.9 ? runnerUp : null;

  return { primaryRole: best, secondaryRole };
}

export function roleLabel(role) {
  if (!role) return '—';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
