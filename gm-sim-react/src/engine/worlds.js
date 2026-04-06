/**
 * worlds.js — World Championship orchestrator.
 *
 * Manages the end-of-season championship.
 *
 * Flow:
 *   1. Qualification — 4 teams per region by circuit points:
 *        - Stage 3 top 2 finishers get auto-bids
 *        - Next 2 highest by circuit points qualify
 *        - Seeding 1–4 is by total circuit points (compareCircuitRank)
 *   2. Group selection show — region-at-a-time interactive placement.
 *        Random region order. Each region's turn: place all 4 seeds into
 *        groups A/B/C/D (one per group, trivially satisfying "no two
 *        teams from same region in same group").
 *        Human-interactive for the human's region.
 *   3. Group Swiss — 4 groups × 4 teams × 3-round Swiss. Lockstep advance.
 *        Top 2 per group advance (8 playoff teams total).
 *   4. Playoff selection show — the four 2-0 group winners pick R1
 *        opponents from the four 2-1 runners-up. Random pick order.
 *        Constraint: can't pick your own group's 2-1 team.
 *        Human-interactive if the human has a 2-0 team.
 *   5. Bracket — 8-team no-byes double-elim, UB/LB/Grand finals all BO5.
 *   6. Complete — champion crowned, season snapshot.
 *
 * State shape (gameState.worlds):
 *   {
 *     phase: 'groupSelection' | 'groups' | 'playoffSelection' | 'bracket' | 'complete',
 *     qualified: { [regionKey]: [team1..team4] },  // seeded 1→4
 *     groupSelection: {
 *       regionOrder, currentRegionIndex, placements, awaitingHuman,
 *     },
 *     groups: { A, B, C, D } of swissStates,
 *     playoffSeeds: { A: [seed1, seed2], B: ..., C: ..., D: ... },  // filled after groups
 *     playoffSelection: {
 *       pickOrder, picks, currentPickIndex, awaitingHuman,
 *     },
 *     bracket: bracketWorldsState,
 *   }
 */

import { REGION_KEYS } from '../data/regions.js';
import {
  WORLDS_SLOTS_PER_REGION,
  STAGE3_AUTOBID_PLACEMENTS,
} from '../data/points.js';
import { initSwiss, advanceSwissRound, getSwissSurvivors } from './swiss.js';
import { compareCircuitRank } from './qualification.js';
import {
  initWorldsBracket,
  advanceWorldsBracket,
  isWorldsBracketComplete,
  computeWorldsBracketPlacements,
} from './bracketWorlds.js';

const GROUP_KEYS = ['A', 'B', 'C', 'D'];

/* ─────────────── Init ─────────────── */

export function initWorlds(gameState) {
  const qualified = {};

  for (const regionKey of REGION_KEYS) {
    qualified[regionKey] = selectQualifiedForRegion(gameState, regionKey);
    for (const team of qualified[regionKey]) {
      team.record.wins = 0;
      team.record.losses = 0;
      team.record.mapWins = 0;
      team.record.mapLosses = 0;
      team.record.roundWins = 0;
      team.record.roundLosses = 0;
    }
  }

  return {
    phase: 'groupSelection',
    qualified,
    groupSelection: beginGroupSelection(qualified),
    groups: null,
    playoffSeeds: null,
    playoffSelection: null,
    bracket: null,
  };
}

function selectQualifiedForRegion(gameState, regionKey) {
  const region = gameState.regions[regionKey];
  const season = gameState.season;

  const stage3Entry = season.history.find(
    e => e.type === 'stage' && e.stageNumber === 3 && !e.placeholder
  );

  const autoBidAbbrs = new Set();
  if (stage3Entry) {
    for (const row of stage3Entry.pointsAwarded?.[regionKey] || []) {
      if (STAGE3_AUTOBID_PLACEMENTS.includes(row.placement)) {
        autoBidAbbrs.add(row.abbr);
      }
    }
  }

  const autoBidTeams = region.teams.filter(t => autoBidAbbrs.has(t.abbr));

  const candidates = region.teams.filter(t => !autoBidAbbrs.has(t.abbr));
  candidates.sort((a, b) => compareCircuitRank(a, b, regionKey, gameState));
  const pointsQualified = candidates.slice(
    0,
    WORLDS_SLOTS_PER_REGION - autoBidTeams.length
  );

  const allQualified = [...autoBidTeams, ...pointsQualified];
  allQualified.sort((a, b) => compareCircuitRank(a, b, regionKey, gameState));

  return allQualified;
}

/* ─────────────── Group selection show ─────────────── */

function beginGroupSelection(qualified) {
  const regionOrder = [...REGION_KEYS];
  for (let i = regionOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [regionOrder[i], regionOrder[j]] = [regionOrder[j], regionOrder[i]];
  }

  const placements = {};
  for (const rk of REGION_KEYS) placements[rk] = { A: null, B: null, C: null, D: null };

  // Pre-compute a 4×4 Latin square that assigns, for each (region, group)
  // pair, which seed number (1–4) goes there. This guarantees:
  //   - Each group has exactly one team from each region (trivial, since
  //     every region places one team per group)
  //   - Each group has no duplicate seed tiers (so no group ends up with
  //     two #1 seeds or two #2 seeds, etc.)
  //
  // latinSquare[rowIdx][colIdx] = seedNumber
  //   rowIdx corresponds to regionOrder (0 = first picking region)
  //   colIdx corresponds to GROUP_KEYS ordinal (0 = Group A)
  const latinSquare = generateLatinSquare();

  return {
    regionOrder,
    currentRegionIndex: 0,
    placements,
    latinSquare,
    // Group selection is fully AI-controlled — no human interaction needed.
    awaitingHuman: false,
  };
}

/**
 * Generate a random 4×4 Latin square of seed numbers (1–4).
 * Starts from the cyclic base, then shuffles both rows and columns.
 */
function generateLatinSquare() {
  // Cyclic base: row i = [i+1, i+2, i+3, i+4] mod 4, 1-indexed
  //   row 0: [1,2,3,4]
  //   row 1: [2,3,4,1]
  //   row 2: [3,4,1,2]
  //   row 3: [4,1,2,3]
  const base = [];
  for (let r = 0; r < 4; r++) {
    const row = [];
    for (let c = 0; c < 4; c++) {
      row.push(((r + c) % 4) + 1);
    }
    base.push(row);
  }

  // Shuffle row order
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  // Shuffle column order (pick a permutation and apply to every row)
  const colPerm = [0, 1, 2, 3];
  for (let i = colPerm.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colPerm[i], colPerm[j]] = [colPerm[j], colPerm[i]];
  }
  return base.map(row => colPerm.map(ci => row[ci]));
}

export function isWorldsAwaitingHumanPick(gameState) {
  const w = gameState.worlds;
  if (!w) return false;
  if (w.phase === 'playoffSelection') return w.playoffSelection?.awaitingHuman === true;
  return false;
}

/* ─────────────── Advance ─────────────── */

export function advanceWorlds(gameState) {
  const w = gameState.worlds;
  if (!w) return;

  if (w.phase === 'groupSelection') {
    if (w.groupSelection.awaitingHuman) return;
    const idx = w.groupSelection.currentRegionIndex;
    const regionKey = w.groupSelection.regionOrder[idx];
    autoPlaceRegionForAI(w, regionKey);
    advanceGroupSelectionRegion(w);
    return;
  }

  if (w.phase === 'groups') {
    for (const gk of GROUP_KEYS) {
      w.groups[gk] = advanceSwissRound(w.groups[gk]);
    }
    const allDone = GROUP_KEYS.every(gk => w.groups[gk].status === 'complete');
    if (allDone) {
      // Groups complete → begin playoff selection show
      w.playoffSeeds = computePlayoffSeeds(w);
      w.playoffSelection = beginPlayoffSelection(w);
      w.phase = 'playoffSelection';
    }
    return;
  }

  if (w.phase === 'playoffSelection') {
    if (w.playoffSelection.awaitingHuman) return;
    revealNextPlayoffPick(w);
    return;
  }

  if (w.phase === 'bracket') {
    // Reset records for bracket teams the first time we enter this phase
    // so the bracket record display is clean and separate from Swiss.
    if (!w._bracketRecordsReset) {
      const bracketTeams = new Set();
      for (const gk of GROUP_KEYS) {
        for (const seed of (w.playoffSeeds[gk] || [])) bracketTeams.add(seed);
      }
      for (const t of bracketTeams) {
        t.record.wins = 0;
        t.record.losses = 0;
        t.record.mapWins = 0;
        t.record.mapLosses = 0;
        t.record.roundWins = 0;
        t.record.roundLosses = 0;
      }
      w._bracketRecordsReset = true;
    }

    w.bracket = advanceWorldsBracket(w.bracket);
    if (isWorldsBracketComplete(w.bracket)) {
      w.phase = 'complete';
    }
    return;
  }
}

/* ─────────────── Group selection — AI placement ─────────────── */

function autoPlaceRegionForAI(worlds, regionKey) {
  const rowIdx = worlds.groupSelection.regionOrder.indexOf(regionKey);
  if (rowIdx < 0) return;
  const latinRow = worlds.groupSelection.latinSquare[rowIdx];
  const seeds = worlds.qualified[regionKey];
  // latinRow[colIdx] = seed number (1..4). seeds[seedNum-1] is the team.
  GROUP_KEYS.forEach((gk, colIdx) => {
    const seedNum = latinRow[colIdx];
    const team = seeds[seedNum - 1];
    if (team) worlds.groupSelection.placements[regionKey][gk] = team;
  });
}

function advanceGroupSelectionRegion(worlds) {
  worlds.groupSelection.currentRegionIndex++;
  const idx = worlds.groupSelection.currentRegionIndex;

  if (idx >= worlds.groupSelection.regionOrder.length) {
    worlds.groups = buildGroupsFromPlacements(worlds);
    worlds.phase = 'groups';
    worlds.groupSelection.awaitingHuman = false;
    return;
  }

  // Group selection is fully AI — no human interaction possible here.
  worlds.groupSelection.awaitingHuman = false;
}

function buildGroupsFromPlacements(worlds) {
  const groups = {};
  for (const gk of GROUP_KEYS) {
    const teams = [];
    for (const rk of REGION_KEYS) {
      const team = worlds.groupSelection.placements[rk][gk];
      if (team) teams.push(team);
    }
    groups[gk] = initSwiss(teams);
  }
  return groups;
}

/* ─────────────── Playoff seeding + selection show ─────────────── */

/**
 * After all 4 groups finish, compute the playoff seeds.
 * Per spec: "2-0 gets you the 1st seed, 2-1 gets you the 2nd seed."
 * Returns { [groupKey]: [seed1Team, seed2Team] }
 */
function computePlayoffSeeds(worlds) {
  const out = {};
  for (const gk of GROUP_KEYS) {
    const swiss = worlds.groups[gk];
    const advanced = swiss.teams.filter(e => e.advanced);

    // Sort advanced teams: 2-0 first, 2-1 second. Tie-break by overall rating.
    advanced.sort((a, b) => {
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.team.overallRating - a.team.overallRating;
    });

    out[gk] = advanced.slice(0, 2).map(e => e.team);
  }
  return out;
}

/**
 * Initialize the playoff selection show.
 * The four 1st-seeds pick from the four 2nd-seeds in random order.
 * Constraint: 1st seed of group X cannot pick 2nd seed of group X.
 */
function beginPlayoffSelection(worlds) {
  // Build the picker list: one entry per 1st seed, tagged with their group
  const pickOrder = GROUP_KEYS.map(gk => ({
    group: gk,
    team: worlds.playoffSeeds[gk][0],
  }));

  // Shuffle pick order
  for (let i = pickOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pickOrder[i], pickOrder[j]] = [pickOrder[j], pickOrder[i]];
  }

  const firstPicker = pickOrder[0];
  const awaitingHuman = firstPicker?.team?.isHuman === true;

  return {
    pickOrder,
    picks: [],
    currentPickIndex: 0,
    awaitingHuman,
  };
}

/**
 * Get the list of 2nd seeds the current picker is allowed to choose from.
 * Excludes already-picked teams AND the picker's own group's 2nd seed.
 */
export function getWorldsPlayoffAvailable(gameState) {
  const w = gameState.worlds;
  if (!w || w.phase !== 'playoffSelection') return [];
  const sel = w.playoffSelection;
  const current = sel.pickOrder[sel.currentPickIndex];
  if (!current) return [];

  const pickedSet = new Set(sel.picks.map(p => p.picked));

  const out = [];
  for (const gk of GROUP_KEYS) {
    if (gk === current.group) continue; // can't pick own group's 2nd seed
    const seed2 = w.playoffSeeds[gk][1];
    if (!seed2 || pickedSet.has(seed2)) continue;
    out.push(seed2);
  }
  return out;
}

/**
 * Reveal the next playoff pick (AI or non-human spectator).
 * AI picks the weakest available opponent.
 */
function revealNextPlayoffPick(worlds) {
  const sel = worlds.playoffSelection;
  if (sel.currentPickIndex >= sel.pickOrder.length) return;

  const current = sel.pickOrder[sel.currentPickIndex];
  const available = computeAvailableForPlayoffPick(worlds);

  available.sort((a, b) => a.overallRating - b.overallRating);
  const picked = available[0];
  if (!picked) return;

  commitPlayoffPick(worlds, current, picked);
}

function computeAvailableForPlayoffPick(worlds) {
  const sel = worlds.playoffSelection;
  const current = sel.pickOrder[sel.currentPickIndex];
  if (!current) return [];

  const pickedSet = new Set(sel.picks.map(p => p.picked));
  const out = [];
  for (const gk of GROUP_KEYS) {
    if (gk === current.group) continue;
    const seed2 = worlds.playoffSeeds[gk][1];
    if (!seed2 || pickedSet.has(seed2)) continue;
    out.push(seed2);
  }
  return out;
}

/**
 * Commit a playoff pick (from AI or human submission).
 */
function commitPlayoffPick(worlds, current, pickedTeam) {
  const sel = worlds.playoffSelection;

  sel.picks.push({
    order: sel.currentPickIndex + 1,
    picker: current.team,
    pickerGroup: current.group,
    picked: pickedTeam,
    pickedGroup: findPickedGroup(worlds, pickedTeam),
  });
  sel.currentPickIndex++;
  sel.awaitingHuman = false;

  // All 4 picks done → init bracket and flip phase
  if (sel.currentPickIndex >= sel.pickOrder.length) {
    worlds.bracket = initWorldsBracket(
      sel.picks.map(p => ({ picker: p.picker, picked: p.picked }))
    );
    worlds.phase = 'bracket';
    return;
  }

  // Otherwise check if the next picker is human
  const next = sel.pickOrder[sel.currentPickIndex];
  sel.awaitingHuman = next?.team?.isHuman === true;
}

function findPickedGroup(worlds, team) {
  for (const gk of GROUP_KEYS) {
    if (worlds.playoffSeeds[gk][1] === team) return gk;
  }
  return null;
}

/**
 * Submit a human playoff pick.
 */
export function submitWorldsPlayoffPick(gameState, pickedTeam) {
  const w = gameState.worlds;
  if (!w || w.phase !== 'playoffSelection') return false;
  const sel = w.playoffSelection;
  if (!sel.awaitingHuman) return false;

  const available = computeAvailableForPlayoffPick(w);
  if (!available.includes(pickedTeam)) return false;

  const current = sel.pickOrder[sel.currentPickIndex];
  commitPlayoffPick(w, current, pickedTeam);
  return true;
}

/* ─────────────── Status queries ─────────────── */

export function isWorldsComplete(gameState) {
  return gameState.worlds?.phase === 'complete';
}

/* ─────────────── Results & history ─────────────── */

export function computeWorldsGroupResults(gameState) {
  const w = gameState.worlds;
  if (!w?.groups) return null;

  const out = {};
  for (const gk of GROUP_KEYS) {
    const swiss = w.groups[gk];
    out[gk] = {
      advanced: getSwissSurvivors(swiss),
      eliminated: swiss.teams.filter(e => e.eliminated).map(e => e.team),
    };
  }
  return out;
}

/**
 * Compute the full Worlds result for history snapshot (called after the
 * bracket completes).
 */
export function computeWorldsResults(gameState) {
  const w = gameState.worlds;
  if (!w) return null;
  return {
    groupResults: computeWorldsGroupResults(gameState),
    bracketPlacements: w.bracket ? computeWorldsBracketPlacements(w.bracket) : [],
  };
}
