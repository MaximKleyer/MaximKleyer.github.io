/**
 * strategy.js — Composition types, role subtypes, and IGL mechanics.
 *
 * COMPOSITIONS define how many of each role a team runs.
 * SUBTYPES define specialized playstyles within a role,
 * each with stat weight overrides that change how a player's
 * overall/duel performance is calculated.
 */

// ── Composition definitions ──
// Each comp lists the exact role slots it requires.
export const COMPOSITIONS = {
  double_initiator: {
    label: 'Double Initiator',
    desc: '1 Duelist, 2 Initiators, 1 Controller, 1 Sentinel',
    slots: ['duelist', 'initiator', 'initiator', 'controller', 'sentinel'],
  },
  double_duelist: {
    label: 'Double Duelist',
    desc: '2 Duelists, 1 Initiator, 1 Controller, 1 Sentinel',
    slots: ['duelist', 'duelist', 'initiator', 'controller', 'sentinel'],
  },
  double_controller: {
    label: 'Double Controller',
    desc: '1 Duelist, 1 Initiator, 2 Controllers, 1 Sentinel',
    slots: ['duelist', 'initiator', 'controller', 'controller', 'sentinel'],
  },
  double_sentinel: {
    label: 'Double Sentinel',
    desc: '1 Duelist, 1 Initiator, 1 Controller, 2 Sentinels',
    slots: ['duelist', 'initiator', 'controller', 'sentinel', 'sentinel'],
  },
  iidcc: {
    label: 'IIDCC',
    desc: '1 Duelist, 2 Initiators, 2 Controllers, 0 Sentinels',
    slots: ['duelist', 'initiator', 'initiator', 'controller', 'controller'],
  },
  ddicc: {
    label: 'DDICC',
    desc: '2 Duelists, 1 Initiator, 2 Controllers, 0 Sentinels',
    slots: ['duelist', 'duelist', 'initiator', 'controller', 'controller'],
  },
};

// Default composition
export const DEFAULT_COMP = 'double_initiator';

// ── Role subtypes ──
// Each subtype has:
//   - label: display name
//   - desc: short description
//   - weights: stat weight overrides for duel rating calculation
//     (only the overridden stats are listed; others stay at base)
//
// Base duel weights (from Match.js): aim 0.50, positioning 0.20, gamesense 0.20, clutch 0.10
// Subtype weights REPLACE the base weights when assigned.

export const SUBTYPES = {
  duelist: [
    {
      id: 'duelist_1st_contact',
      label: '1st Contact',
      desc: 'Aggressive, takes first fights',
      weights: { aim: 0.45, positioning: 0.25, gamesense: 0.15, clutch: 0.10, utility: 0.05 },
    },
    {
      id: 'duelist_support',
      label: 'Support Cast',
      desc: 'Second in, trades and clutches',
      weights: { aim: 0.25, positioning: 0.15, gamesense: 0.15, clutch: 0.25, utility: 0.20 },
    },
    {
      id: 'duelist_default',
      label: 'Default',
      desc: 'Classic mix of aggression and support',
      weights: { aim: 0.40, positioning: 0.20, gamesense: 0.20, clutch: 0.15, utility: 0.05 },
    },
  ],
  initiator: [
    {
      id: 'initiator_aggressive',
      label: 'Aggressive',
      desc: 'Flash entry, fights first or second',
      weights: { aim: 0.30, positioning: 0.15, gamesense: 0.15, clutch: 0.10, utility: 0.30 },
    },
    {
      id: 'initiator_recon',
      label: 'Recon',
      desc: 'Info gathering, team player',
      weights: { aim: 0.15, positioning: 0.15, gamesense: 0.30, clutch: 0.10, utility: 0.30 },
    },
  ],
  controller: [
    {
      id: 'controller_standard',
      label: 'Standard',
      desc: 'Default smoke player, well-rounded',
      weights: { aim: 0.25, positioning: 0.20, gamesense: 0.25, clutch: 0.10, utility: 0.20 },
    },
    {
      id: 'controller_lurker',
      label: 'Lurker',
      desc: 'Finds timings, gets sneaky kills',
      weights: { aim: 0.20, positioning: 0.30, gamesense: 0.30, clutch: 0.10, utility: 0.10 },
    },
    {
      id: 'controller_anchor',
      label: 'Anchor',
      desc: 'Holds sites, plays with team',
      weights: { aim: 0.15, positioning: 0.15, gamesense: 0.15, clutch: 0.25, utility: 0.30 },
    },
  ],
  sentinel: [
    {
      id: 'sentinel_info_anchor',
      label: 'Info Anchor',
      desc: 'Gets info, holds sites, team-oriented',
      weights: { aim: 0.15, positioning: 0.15, gamesense: 0.15, clutch: 0.25, utility: 0.30 },
    },
    {
      id: 'sentinel_aggressive_lurk',
      label: 'Aggressive Lurk',
      desc: 'Fights a lot, finds timings',
      weights: { aim: 0.20, positioning: 0.30, gamesense: 0.30, clutch: 0.10, utility: 0.10 },
    },
  ],
};

// Get available subtypes for a role
export function getSubtypesForRole(role) {
  return SUBTYPES[role] || [];
}

// Get the default subtype for a role
export function getDefaultSubtype(role) {
  const subs = SUBTYPES[role];
  if (!subs || subs.length === 0) return null;
  return subs[0].id;
}

// ── IGL bonus ──
// An IGL with high gamesense gives the team a round-win bonus.
// This is applied in Match.js during round simulation.
// Formula: bonus = (igl.gamesense - 60) * 0.15
// A 90 IQ IGL gives +4.5 effective team rating per round.
// A 60 IQ IGL gives +0.
// This represents better mid-round calls, better reads, better economy.
export const IGL_BONUS_MULTIPLIER = 0.15;
export const IGL_BASELINE = 60; // no bonus below this IQ
