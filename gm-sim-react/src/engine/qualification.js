/**
 * qualification.js — Per-team points breakdown + Worlds qualification logic.
 *
 * Used by the Points tab. Provides:
 *   - getPointsBreakdown(team, region, season) → detailed line-items
 *   - getQualificationStatus(team, region, season) → 'qualified_autobid' |
 *       'qualified_points' | 'in_contention' | 'eliminated' | 'not_yet_relevant'
 *
 * "Not yet relevant" = before Stage 3 is underway, nothing is locked in, so
 * qualification status is just hidden. Once Stage 3 begins, we start computing
 * mathematical locks/eliminations based on max remaining points.
 */

import {
  STAGE_POINTS,
  INTERNATIONAL_POINTS,
  GROUP_WIN_POINTS,
  STAGE3_AUTOBID_PLACEMENTS,
  WORLDS_AUTOBID_SLOTS_PER_REGION,
  WORLDS_POINTS_SLOTS_PER_REGION,
} from '../data/points.js';
import { REGULAR_SEASON_WEEKS } from '../data/constants.js';
import { computeLivePlacements } from './placements.js';
import { pointsKey } from './season.js';

/* ─────────────── Points breakdown ─────────────── */

/**
 * Build a line-item breakdown of where a team's points came from.
 * Returns { lines: [{ label, points }], total }
 *
 * Lines from completed stages come straight from season.history.
 * Lines for the CURRENTLY active stage are computed live from the region's
 * current state so the tab updates as matches resolve.
 */
export function getPointsBreakdown(team, regionKey, gameState) {
  const season = gameState.season;
  const lines = [];

  // ── Historical (completed) slots ──
  for (const entry of season.history) {
    if (entry.placeholder) continue;

    if (entry.type === 'stage') {
      const placementRow = (entry.pointsAwarded?.[regionKey] || [])
        .find(r => r.abbr === team.abbr);
      if (placementRow && placementRow.points > 0) {
        lines.push({
          label: `${entry.name} — ${ordinal(placementRow.placement)}`,
          points: placementRow.points,
        });
      }
      const groupWins = entry.groupWinsAwarded?.[regionKey]?.[team.abbr] || 0;
      if (groupWins > 0) {
        lines.push({
          label: `${entry.name} — Group wins (${groupWins})`,
          points: groupWins * GROUP_WIN_POINTS,
        });
      }
    } else if (entry.type === 'international') {
      const placementRow = (entry.pointsAwarded?.[regionKey] || [])
        .find(r => r.abbr === team.abbr);
      if (placementRow && placementRow.points > 0) {
        lines.push({
          label: `${entry.name} — ${ordinal(placementRow.placement)}`,
          points: placementRow.points,
        });
      }
    }
  }

  // ── Current live stage (if we're inside one) ──
  const currentSlot = season.circuit[season.slotIndex];
  if (currentSlot?.type === 'stage' && season.status === 'active') {
    const region = gameState.regions[regionKey];
    const stageNum = currentSlot.stageNumber;

    // Group wins already banked this stage
    const liveGroupWins = season.currentStageGroupWins?.[regionKey]?.[team.abbr] || 0;
    if (liveGroupWins > 0) {
      lines.push({
        label: `${currentSlot.name} — Group wins (${liveGroupWins}) · live`,
        points: liveGroupWins * GROUP_WIN_POINTS,
      });
    }

    // Projected placement from live standings (only show if top 4 alive/locked)
    if (region.phase === 'bracket' && region.bracket) {
      const live = computeLivePlacements(region);
      const entry = live.find(e => e.team === team);
      if (entry?.state === 'final' && entry.placement <= 4) {
        const pts = STAGE_POINTS[stageNum]?.[entry.placement] || 0;
        if (pts > 0) {
          lines.push({
            label: `${currentSlot.name} — ${ordinal(entry.placement)} · locked`,
            points: pts,
          });
        }
      }
    }
  }

  const fromTotals = season.points[pointsKey(regionKey, team.abbr)] || 0;
  const liveTotal = lines.reduce((s, l) => s + l.points, 0);

  // Use the max of the two — history lines should already match `fromTotals`
  // for completed stages, plus we add live group-win/locked-placement lines
  // that aren't yet in season.points until the stage completes. We trust
  // season.points for completed awards and add live unbooked points on top.
  // Easier: compute total as banked + unbooked-live.
  const unbooked = lines
    .filter(l => l.label.includes('· live') || l.label.includes('· locked'))
    .reduce((s, l) => s + l.points, 0);

  return {
    lines,
    total: fromTotals + unbooked,
    banked: fromTotals,
    projected: fromTotals + unbooked,
  };
}

/* ─────────────── Tiebreakers ─────────────── */

/**
 * Look up a team's finishing placement in a specific completed stage.
 * Returns 999 if the stage hasn't been played yet or the team has no entry.
 */
function getStagePlacement(team, regionKey, season, stageNumber) {
  const entry = season.history.find(
    e => e.type === 'stage' && e.stageNumber === stageNumber && !e.placeholder
  );
  if (!entry) return 999;
  const row = (entry.pointsAwarded?.[regionKey] || [])
    .find(r => r.abbr === team.abbr);
  return row ? row.placement : 999;
}

/**
 * Tiebreaker comparator: Stage 3 placement → Stage 2 → Stage 1 → name.
 * Lower placement (better finish) wins. Returns <0 if a is "above" b.
 */
function tiebreakerCompare(a, b, regionKey, gameState) {
  const season = gameState.season;
  for (const stageNum of [3, 2, 1]) {
    const pa = getStagePlacement(a, regionKey, season, stageNum);
    const pb = getStagePlacement(b, regionKey, season, stageNum);
    if (pa !== pb) return pa - pb;
  }
  return a.name.localeCompare(b.name);
}

/**
 * Full ranking comparator: projected points desc, then tiebreaker.
 * Exported for Points.jsx leaderboard sorting.
 */
export function compareCircuitRank(a, b, regionKey, gameState) {
  const pa = getPointsBreakdown(a, regionKey, gameState).projected;
  const pb = getPointsBreakdown(b, regionKey, gameState).projected;
  if (pa !== pb) return pb - pa;
  return tiebreakerCompare(a, b, regionKey, gameState);
}

/**
 * Rank teams by a hypothetical point snapshot (for worst/best case checks).
 * Uses tiebreakers to resolve ties in the snapshot.
 */
function rankBySnapshot(teams, snapshot, regionKey, gameState) {
  return [...teams].sort((a, b) => {
    const pa = snapshot[a.abbr] || 0;
    const pb = snapshot[b.abbr] || 0;
    if (pa !== pb) return pb - pa;
    return tiebreakerCompare(a, b, regionKey, gameState);
  });
}

/* ─────────────── Qualification status ─────────────── */

/**
 * Has Stage 3 begun? We only compute qualification once Stage 3 is underway.
 */
function isStage3OrLater(gameState) {
  const slot = gameState.season.circuit[gameState.season.slotIndex];
  if (!slot) return gameState.season.status === 'complete';
  if (slot.type === 'stage' && slot.stageNumber >= 3) return true;
  for (let i = 0; i <= gameState.season.slotIndex; i++) {
    const s = gameState.season.circuit[i];
    if (s.type === 'stage' && s.stageNumber === 3) return true;
  }
  return false;
}

/**
 * Is this team a Stage 3 auto-bid? True only after Stage 3 has completed
 * and the team placed 1st or 2nd.
 */
export function isStage3AutoBid(team, regionKey, gameState) {
  const season = gameState.season;
  const stage3Entry = season.history.find(
    e => e.type === 'stage' && e.stageNumber === 3 && !e.placeholder
  );
  if (!stage3Entry) return false;
  const row = (stage3Entry.pointsAwarded?.[regionKey] || [])
    .find(r => r.abbr === team.abbr);
  return row && STAGE3_AUTOBID_PLACEMENTS.includes(row.placement);
}

/**
 * Main qualification status function.
 *
 * Uses a worst-case / best-case analysis:
 *   - Worst case for team: team stays at current, everyone else reaches ceiling
 *     → if team still finishes in top `pointsSlots`, they're LOCKED IN
 *   - Best case for team: team reaches ceiling, everyone else stays at current
 *     → if team still doesn't make top `pointsSlots`, they're ELIMINATED
 *   - Otherwise: in contention
 *
 * Ties at any point are resolved by the tiebreaker chain (Stage 3 → 2 → 1).
 */
export function getQualificationStatus(team, regionKey, gameState) {
  if (!isStage3OrLater(gameState)) return 'not_yet_relevant';
  if (isStage3AutoBid(team, regionKey, gameState)) return 'qualified_autobid';

  const season = gameState.season;
  const region = gameState.regions[regionKey];

  const autoBidAbbrs = new Set();
  for (const t of region.teams) {
    if (isStage3AutoBid(t, regionKey, gameState)) autoBidAbbrs.add(t.abbr);
  }

  // Total Worlds slots a non-autobid can claim. Until Stage 3 finishes, no
  // autobids exist yet, so we optimistically treat all 4 Worlds slots as
  // points-accessible (this avoids prematurely declaring anyone locked in
  // while Stage 3 bracket play might still create autobids).
  const pointsSlots = WORLDS_POINTS_SLOTS_PER_REGION +
    (WORLDS_AUTOBID_SLOTS_PER_REGION - autoBidAbbrs.size);

  const contenders = region.teams.filter(t => !autoBidAbbrs.has(t.abbr));

  const floor = {};
  const ceiling = {};
  for (const t of contenders) {
    floor[t.abbr] = getPointsBreakdown(t, regionKey, gameState).projected;
    ceiling[t.abbr] = floor[t.abbr] + getMaxRemainingPoints(t, regionKey, gameState);
  }

  // Worst case for the team — team at floor, every other contender at ceiling.
  const worstCase = { [team.abbr]: floor[team.abbr] };
  for (const other of contenders) {
    if (other !== team) worstCase[other.abbr] = ceiling[other.abbr];
  }
  const worstRanked = rankBySnapshot(contenders, worstCase, regionKey, gameState);
  const worstRank = worstRanked.indexOf(team);
  if (worstRank >= 0 && worstRank < pointsSlots) return 'qualified_points';

  // Best case for the team — team at ceiling, every other contender at floor.
  const bestCase = { [team.abbr]: ceiling[team.abbr] };
  for (const other of contenders) {
    if (other !== team) bestCase[other.abbr] = floor[other.abbr];
  }
  const bestRanked = rankBySnapshot(contenders, bestCase, regionKey, gameState);
  const bestRank = bestRanked.indexOf(team);
  if (bestRank >= pointsSlots) return 'eliminated';

  return 'in_contention';
}

/* ─────────────── Max remaining points ─────────────── */

/**
 * Max additional points a team could theoretically earn from now until Worlds.
 * Used by the worst/best case qualification analysis.
 */
export function getMaxRemainingPoints(team, regionKey, gameState) {
  const season = gameState.season;
  let maxPts = 0;

  const currentSlot = season.circuit[season.slotIndex];
  const currentSlotIdx = season.slotIndex;

  // ── Points still available in the current slot ──
  if (currentSlot?.type === 'stage' && season.status === 'active') {
    const region = gameState.regions[regionKey];
    const stageNum = currentSlot.stageNumber;

    if (region.phase === 'group') {
      // Group wins remaining this stage
      const remainingWeeks = Math.max(0, REGULAR_SEASON_WEEKS - Math.max(0, region.currentWeek - 1));
      // Plus best-case placement in the upcoming bracket
      maxPts += remainingWeeks * GROUP_WIN_POINTS;
      maxPts += STAGE_POINTS[stageNum]?.[1] || 0;
    } else if (region.phase === 'bracket') {
      // Group wins are banked; only bracket placement remains
      const live = computeLivePlacements(region);
      const entry = live.find(e => e.team === team);
      if (entry?.state === 'alive') {
        maxPts += STAGE_POINTS[stageNum]?.[1] || 0; // assume they win it all
      }
      // Final-state teams get 0 more from this stage
    }
  }

  // ── Future circuit slots ──
  for (let i = currentSlotIdx + 1; i < season.circuit.length; i++) {
    const slot = season.circuit[i];
    if (slot.type === 'stage') {
      maxPts += (STAGE_POINTS[slot.stageNumber]?.[1] || 0);
      maxPts += REGULAR_SEASON_WEEKS * GROUP_WIN_POINTS;
    } else if (slot.type === 'international') {
      maxPts += (INTERNATIONAL_POINTS[slot.internationalNumber]?.[1] || 0);
    }
    // Worlds awards 0 circuit points
  }

  return maxPts;
}

/* ─────────────── Helpers ─────────────── */

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
