/**
 * points.js — Circuit points distribution (Phase 2 spec).
 *
 * Teams accumulate circuit points across the whole season. Top 2 point
 * earners (excluding auto-bids) per region qualify for Worlds alongside
 * the Stage 3 auto-bids.
 *
 * Schema:
 *   STAGE_POINTS[stageNumber][placement] → points
 *   INTERNATIONAL_POINTS[internationalNumber][placement] → points
 *   GROUP_WIN_POINTS — flat award per group-stage series win
 *
 * Tuning knobs live here. Only this file should define point values.
 */

// ── Group-stage wins ──
// 1 pt per series win during the group stage of any regional stage.
// Applies to Stages 1, 2, and 3 equally.
export const GROUP_WIN_POINTS = 1;

// ── Stage bracket placement points (by stage number) ──
// 12 teams per region, positions 1–12. Only the top 4 earn placement points.
export const STAGE_POINTS = {
  1: {
    1: 4, 2: 3, 3: 2, 4: 1,
    5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  },
  2: {
    1: 6, 2: 4, 3: 3, 4: 2,
    5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  },
  3: {
    1: 8, 2: 6, 3: 5, 4: 4,
    5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  },
};

// ── International tournament placement points (Phase 3) ──
// 8 teams total. Placements 1–6 from double-elim bracket; Swiss exits 7/8.
export const INTERNATIONAL_POINTS = {
  1: {
    1: 6, 2: 4, 3: 3, 4: 2, 5: 1, 6: 1, 7: 0, 8: 0,
  },
  2: {
    1: 8, 2: 6, 3: 5, 4: 4, 5: 3, 6: 3, 7: 0, 8: 0,
  },
};

// ── Worlds ──
// Worlds is prestige-only in this spec — no circuit points awarded.
export const WORLDS_POINTS = {};

// ── Stage 3 auto-bid placements (for qualification logic) ──
// Teams finishing at these placements in Stage 3 auto-qualify for Worlds
// regardless of their point total.
export const STAGE3_AUTOBID_PLACEMENTS = [1, 2];

// ── Worlds per-region slots ──
export const WORLDS_SLOTS_PER_REGION = 4;
export const WORLDS_AUTOBID_SLOTS_PER_REGION = 2; // filled from Stage 3 1st/2nd
export const WORLDS_POINTS_SLOTS_PER_REGION = 2;  // next 2 highest by points
