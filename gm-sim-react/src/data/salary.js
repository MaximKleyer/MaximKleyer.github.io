/**
 * salary.js — Salary calculation and contract negotiation math (Phase 7).
 *
 * Pure functions that take a player + context and return numbers. No
 * mutation, no I/O. The engine and UI layers wrap these to drive the
 * sign/release/negotiation flows.
 *
 * Two main concepts:
 *
 *   BASE SALARY — what a player is "worth" given their overall rating.
 *   This is the league-wide reference point. A piecewise-linear table
 *   mapping OVR → annual $. Tuned so a balanced roster of mostly 60-70
 *   OVR players fits under the $1.5M cap with room to upgrade.
 *
 *   ASK — what a player will demand in negotiation. Base salary scaled
 *   by morale, age, and contract length. The "hidden ask" presented in
 *   the FA UI: user offers salary; if offer >= ask, signing succeeds.
 *
 * The cap value is exported here too so all consumers reference the
 * same constant.
 */

// ─── League-wide constants ────────────────────────────────────────────

/**
 * Hard salary cap per team. Hard means a team cannot exceed this — no
 * luxury tax, no overage penalty. Fixed across all teams and seasons.
 *
 * Calibration note: $2.5M chosen to fit a typical league at equilibrium.
 * Phase 7c smoke testing showed that with all contracts at base salary
 * (which is the steady-state once initial discounted contracts cycle out),
 * an avg-72-OVR roster runs ~$2.0-2.1M. $2.5M gives ~25% slack for
 * roster upgrades and absorbs RNG variance from rookie generation.
 *
 * 90+ OVR superstars cost $750K+ each, so 2 superstars consume $1.5M
 * leaving $1M for 3 more = ~$330K average = about 67 OVR. That's still
 * a real depth tradeoff: a two-superstar team has below-average depth.
 */
export const SALARY_CAP = 2500000;

/**
 * Mid-contract release penalty. When a team releases a player whose
 * contract has years remaining, they pay this fraction of the remaining
 * years' salary as a buyout cap hit. E.g., releasing a player with 2
 * years × $300K remaining at 25% = $150K cap hit during the release year.
 */
export const RELEASE_BUYOUT_FRACTION = 0.25;

/**
 * Smallest unit we round salaries to. Avoids ugly numbers like $437,283.
 */
const SALARY_GRANULARITY = 5000;

// ─── Base salary table (Phase 7 design) ───────────────────────────────

/**
 * Piecewise-linear map from OVR to annual salary.
 *
 * Anchors (per Maxim's design):
 *   40 OVR → $50K (extrapolated; floor)
 *   50 OVR → $100K
 *   60 OVR → $200K
 *   70 OVR → $350K
 *   80 OVR → $500K
 *   90 OVR → $750K
 *   99 OVR → $1.11M (extrapolated)
 *
 * Between anchors we linearly interpolate.
 *
 * Designed so an average team of mostly 60-70s fits under the cap with
 * room to splash on one 80+. Two superstars (90+ each) is out of reach,
 * forcing real roster compromises.
 */
const SALARY_ANCHORS = [
  { ovr: 40, salary: 50000 },
  { ovr: 50, salary: 100000 },
  { ovr: 60, salary: 200000 },
  { ovr: 70, salary: 350000 },
  { ovr: 80, salary: 500000 },
  { ovr: 90, salary: 750000 },
  { ovr: 99, salary: 1110000 },
];

/**
 * Round to the nearest $SALARY_GRANULARITY.
 */
function roundSalary(n) {
  return Math.round(n / SALARY_GRANULARITY) * SALARY_GRANULARITY;
}

/**
 * Linear interpolation between two anchor points.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Look up the base salary for a given overall rating using piecewise
 * linear interpolation across the anchor table. Clamps to the bottom
 * anchor for very low OVRs and the top anchor for very high OVRs.
 *
 * Used as the reference point. Not the actual ask — that gets adjusted
 * by morale/age/length modifiers in calculateAsk().
 */
export function calculateBaseSalary(overall) {
  const ovr = Math.max(1, Math.min(99, Math.round(overall || 0)));

  // Below floor → flat at the lowest anchor (sub-40 OVR is essentially
  // unsignable; just return the floor)
  if (ovr <= SALARY_ANCHORS[0].ovr) return SALARY_ANCHORS[0].salary;

  // Above ceiling → flat at the top anchor
  const top = SALARY_ANCHORS[SALARY_ANCHORS.length - 1];
  if (ovr >= top.ovr) return top.salary;

  // Find the segment ovr falls into
  for (let i = 0; i < SALARY_ANCHORS.length - 1; i++) {
    const a = SALARY_ANCHORS[i];
    const b = SALARY_ANCHORS[i + 1];
    if (ovr >= a.ovr && ovr <= b.ovr) {
      const t = (ovr - a.ovr) / (b.ovr - a.ovr);
      return roundSalary(lerp(a.salary, b.salary, t));
    }
  }

  // Unreachable
  return SALARY_ANCHORS[0].salary;
}

// ─── Modifiers ────────────────────────────────────────────────────────

/**
 * Morale modifier applied to the ask. Happy players accept less,
 * unhappy players demand more. Asymmetric: low morale punishes harder
 * than high morale rewards (intentional — happy players overperforming
 * forever leads to runaway leaders).
 */
function moraleModifier(morale) {
  const m = morale ?? 65; // default neutral if missing
  if (m >= 80) return 0.85; // -15% for happy (Loyal)
  if (m >= 60) return 0.95; // -5%  for content
  if (m >= 30) return 1.00; //  0%  for neutral / restless
  return 1.25;              // +25% for unhappy
}

/**
 * Age modifier. Peak players (23-26) command a premium because they're
 * at their best and proven. Young players are cheaper because they're
 * unproven. Vets are slightly cheaper because they're declining.
 */
function ageModifier(age) {
  const a = age ?? 22;
  if (a >= 23 && a <= 26) return 1.10; // peak premium
  if (a <= 22) return 0.90;            // young discount
  return 0.95;                          // vet slight discount
}

/**
 * Contract length modifier. Longer contracts = lower yearly salary
 * (player accepts less per year for security). 1yr = 100%, 2yr = 95%,
 * 3yr = 90% per year.
 */
function lengthModifier(years) {
  const y = Math.max(1, Math.min(3, years || 1));
  if (y === 1) return 1.00;
  if (y === 2) return 0.95;
  return 0.90;
}

/**
 * Tier classification of an ask. Used by the UI's "hidden ask" hint
 * system — the user sees a tier label, not the exact number. Lets
 * the user gauge fairness without knowing the precise threshold.
 *
 * The tier compares the ask to the base salary (modifier-free
 * reference point):
 *   bargain    — ask < 90% base   (someone you can lowball)
 *   market     — ask 90-110% base (fair price)
 *   premium    — ask 110-130% base (paying up for length/intangibles)
 *   demanding  — ask > 130% base  (unhappy, hard to sign)
 */
export function classifyAsk(ask, baseSalary) {
  const ratio = ask / baseSalary;
  if (ratio < 0.90) return 'bargain';
  if (ratio <= 1.10) return 'market';
  if (ratio <= 1.30) return 'premium';
  return 'demanding';
}

/**
 * Tier classification of an OFFER vs the player's ASK — used as the
 * rejection hint when an offer falls short. Tells the user how close
 * they were so they can adjust intelligently.
 *
 *   way_under   — offer < 60% of ask   (laughable)
 *   far_under   — offer 60-85% of ask  (significant gap)
 *   close       — offer 85-99% of ask  (just need a bump)
 *   accepted    — offer >= ask         (would have been accepted; not used in rejection path)
 */
export function classifyGap(offer, ask) {
  if (ask <= 0) return 'accepted';
  const ratio = offer / ask;
  if (ratio >= 1.0) return 'accepted';
  if (ratio >= 0.85) return 'close';
  if (ratio >= 0.60) return 'far_under';
  return 'way_under';
}

/**
 * Tier label for morale (0-100). Used for display.
 */
export function moraleTier(morale) {
  const m = morale ?? 65;
  if (m >= 80) return 'Loyal';     // 80-100
  if (m >= 60) return 'Content';   // 60-79
  if (m >= 40) return 'Neutral';   // 40-59
  if (m >= 20) return 'Restless';  // 20-39
  return 'Unhappy';                 // 0-19
}

/**
 * Morale → in-match performance multiplier (Phase 7e).
 *
 * Returns a number around 1.0 that scales effective ratings during
 * match simulation. Asymmetric design (per Maxim's Phase 7 decisions):
 *   - At morale 0:   0.95   (-5% — unhappy players underperform meaningfully)
 *   - At morale 50:  1.00   (neutral baseline)
 *   - At morale 100: 1.03   (+3% — happy players overperform a little)
 *
 * Intentionally asymmetric: low morale punishes harder than high morale
 * rewards. This prevents runaway leaders — if happy → win → happier
 * loops indefinitely amplified, the league snowballs into one team
 * dominating. The asymmetry adds a self-correcting damping force.
 *
 * Linear interpolation between the two halves of the curve:
 *   morale ≤ 50: 0.95 + (morale/50) * 0.05  → spans 0.95 to 1.00
 *   morale > 50: 1.00 + ((morale-50)/50) * 0.03 → spans 1.00 to 1.03
 */
export function moralePerformanceModifier(morale) {
  const m = Math.max(0, Math.min(100, morale ?? 65));
  if (m <= 50) {
    return 0.95 + (m / 50) * 0.05;
  }
  return 1.00 + ((m - 50) / 50) * 0.03;
}

/**
 * Apply a morale change to a player and (optionally) record it in
 * their morale history for UI display. Clamps to 0-100. Idempotent
 * for zero-delta calls.
 *
 * Phase 7e: morale history is a recent-events log (last 5 entries)
 * that surfaces "why did my morale drop?" in tooltips. Each entry
 * records the delta and a reason string. Older entries roll off so
 * save size stays bounded.
 *
 * Example reasons: 'won_stage', 'lost_stage', 'won_worlds',
 *   'underpaid', 'released_by_team', 'resigned_by_team',
 *   'wages_below_market', etc.
 */
export function adjustMorale(player, delta, reason = null) {
  if (!player) return;
  const before = player.morale ?? 65;
  const after = Math.max(0, Math.min(100, before + delta));
  if (after === before) return; // clamped — no change
  player.morale = after;

  if (reason) {
    if (!Array.isArray(player.moraleHistory)) player.moraleHistory = [];
    player.moraleHistory.push({
      delta: after - before,
      reason,
      // Don't bother with timestamps — the order in the array is the
      // chronology, and "season X" timing is implicit (history is
      // shown as recent events, not a long log).
    });
    // Bound the history at the most recent 5 entries
    if (player.moraleHistory.length > 5) {
      player.moraleHistory = player.moraleHistory.slice(-5);
    }
  }
}

// ─── Negotiation ─────────────────────────────────────────────────────

/**
 * Calculate a player's ask for a contract of `years` years. Returns
 * an annual salary number. The total commitment is `salary × years`.
 *
 * morale, age, and length all stack multiplicatively on top of the
 * base salary. Output is rounded to $SALARY_GRANULARITY.
 *
 * marketContext is reserved for Phase 7c+ when AI signing logic might
 * push asks higher in scarce talent markets. Currently unused but kept
 * in the signature so consumers don't need to update later.
 */
export function calculateAsk(player, years, marketContext = null) {
  if (!player) return 0;
  const base = calculateBaseSalary(player.overall);
  const mMod = moraleModifier(player.morale);
  const aMod = ageModifier(player.age);
  const lMod = lengthModifier(years);
  return roundSalary(base * mMod * aMod * lMod);
}

/**
 * Resolve a contract offer. Returns:
 *   { accepted: true,  contract: { salary, yearsRemaining, signedYear } }
 *   { accepted: false, ask, askTier }
 *
 * Phase 7 design (decision 9: "single offer, hidden ask"):
 *   - If offer.salary >= ask → accepted, contract created
 *   - If offer.salary <  ask → rejected, hint returned about how close
 *
 * "Want to leave regardless" override: very unhappy players (morale < 30)
 * reject ANY offer from their current team during the re-sign window.
 * Caller signals this by passing `isResign: true` in offer.
 */
export function resolveOffer(player, offer, currentSeasonNumber) {
  const { salary, years, isResign = false } = offer;

  // Validation
  const validYears = Math.max(1, Math.min(3, Math.round(years || 1)));
  const offerSalary = Math.max(0, Math.round(salary || 0));

  // "Want to leave regardless" override on re-sign window
  if (isResign && (player.morale ?? 65) < 30) {
    return {
      accepted: false,
      ask: calculateAsk(player, validYears),
      gapTier: 'way_under', // any offer is meaningless when wanting to leave
      reason: 'wants_to_leave',
    };
  }

  const ask = calculateAsk(player, validYears);

  if (offerSalary >= ask) {
    return {
      accepted: true,
      contract: {
        salary: offerSalary,
        yearsRemaining: validYears,
        signedYear: currentSeasonNumber,
      },
    };
  }

  return {
    accepted: false,
    ask,
    // Gap-based tier — describes how far the OFFER was from the ASK,
    // which is the actionable info for the user. The market position
    // of the ask itself (classifyAsk) is a separate concept used for
    // pre-negotiation hints, not for rejection feedback.
    gapTier: classifyGap(offerSalary, ask),
  };
}

/**
 * Compute the buyout cap hit for releasing a player mid-contract.
 * Returns 0 if the player has no contract or no years remaining.
 *
 * The cap hit is RELEASE_BUYOUT_FRACTION × (remaining years) × salary.
 * E.g., releasing a player with 2 years × $300K remaining at 25%:
 *   0.25 × 2 × $300K = $150K
 *
 * Phase 7 design notes: the cap hit applies in the year of release.
 * Multi-year amortization is more realistic but adds complexity that's
 * not worth it for v1. Keep it simple: 25% × remaining_total in one shot.
 */
export function calculateBuyout(contract) {
  if (!contract) return 0;
  const years = contract.yearsRemaining ?? 0;
  const salary = contract.salary ?? 0;
  if (years <= 0 || salary <= 0) return 0;
  return roundSalary(years * salary * RELEASE_BUYOUT_FRACTION);
}

// ─── Helpers for consumers ───────────────────────────────────────────

/**
 * Compute a team's total committed salary for the current season.
 * Sums the annual salary of every rostered player's contract. Players
 * without contracts (shouldn't happen post-migration but defensive)
 * count as 0.
 *
 * Doesn't include buyout cap hits from past releases — those are tracked
 * separately on team.deadCapHits when Phase 7c rolls.
 */
export function computeTeamSalary(team) {
  if (!team || !team.roster) return 0;
  let total = 0;
  for (const player of team.roster) {
    total += player?.contract?.salary || 0;
  }
  // Phase 7 forward-compat: when buyouts get applied, they live on
  // team.deadCapHits (an array of {year, amount}). Sum any active ones.
  if (Array.isArray(team.deadCapHits)) {
    for (const hit of team.deadCapHits) {
      total += hit?.amount || 0;
    }
  }
  return total;
}

/**
 * Cap headroom: SALARY_CAP - currentSalary. Negative means over cap
 * (shouldn't happen with hard cap enforcement but defensive).
 */
export function computeCapRemaining(team) {
  return SALARY_CAP - computeTeamSalary(team);
}

/**
 * Quick check: would adding `additionalSalary` to this team push them
 * over the cap? Used by sign flows before committing.
 */
export function fitsCap(team, additionalSalary) {
  return computeCapRemaining(team) >= (additionalSalary || 0);
}
