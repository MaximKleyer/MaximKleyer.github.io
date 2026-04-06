/**
 * season.js — Circuit engine (Phase 1).
 *
 * Manages the full season circuit:
 *   Stage 1 → International 1 → Stage 2 → International 2 → Stage 3 → Worlds
 *
 * Responsibilities:
 *   - Track circuit position
 *   - Detect when the current stage slot is complete
 *   - Award circuit points based on final bracket placements
 *   - Snapshot stage state into history before resetting
 *   - Roll every region over for the next stage (reset records, reshuffle
 *     groups, regenerate schedule, reset player stats)
 *
 * Phase 1 scope:
 *   - Stage slots fully implemented.
 *   - International / Worlds slots auto-skip with a stub history entry.
 *     Phases 2–4 replace the skip with real Swiss + bracket handling.
 */

import { REGION_KEYS } from '../data/regions.js';
import { GROUP_SIZE } from '../data/constants.js';
import { STAGE_POINTS, INTERNATIONAL_POINTS, GROUP_WIN_POINTS } from '../data/points.js';
import { generateSchedule } from './league.js';
import { computeFinalStagePlacements } from './placements.js';
import {
  initInternational,
  computeInternationalResults,
} from './international.js';
import {
  initWorlds,
  isWorldsComplete,
  computeWorldsResults,
} from './worlds.js';

/* ─────────────── Circuit definition ─────────────── */

// Order matters. Add/remove/rename here and the engine follows.
export const CIRCUIT = [
  { type: 'stage',         name: 'Stage 1',         stageNumber: 1 },
  { type: 'international', name: 'International 1', internationalNumber: 1 },
  { type: 'stage',         name: 'Stage 2',         stageNumber: 2 },
  { type: 'international', name: 'International 2', internationalNumber: 2 },
  { type: 'stage',         name: 'Stage 3',         stageNumber: 3 },
  { type: 'worlds',        name: 'World Championship' },
];

/* ─────────────── Init ─────────────── */

/**
 * Build the season blob. Called by App.jsx right after initGame.
 * Points map is keyed `${regionKey}:${teamAbbr}` to avoid collisions
 * between regions sharing an abbreviation.
 */
export function initSeason(gameState) {
  const points = {};
  const currentStageGroupWins = {};
  for (const regionKey of REGION_KEYS) {
    currentStageGroupWins[regionKey] = {};
    for (const team of gameState.regions[regionKey].teams) {
      points[pointsKey(regionKey, team.abbr)] = 0;
      currentStageGroupWins[regionKey][team.abbr] = 0;
    }
  }

  return {
    circuit: CIRCUIT,
    slotIndex: 0,                  // index into CIRCUIT
    status: 'active',              // 'active' | 'transition' | 'complete'
    points,                        // { 'americas:SEN': 6, ... }
    history: [],                   // one entry per completed slot
    currentStageGroupWins,         // { regionKey: { abbr: count } } — reset on stage rollover
  };
}

export function pointsKey(regionKey, abbr) {
  return `${regionKey}:${abbr}`;
}

/* ─────────────── Queries ─────────────── */

export function getCurrentSlot(gameState) {
  const s = gameState.season;
  if (!s || s.slotIndex >= s.circuit.length) return null;
  return s.circuit[s.slotIndex];
}

export function getCurrentStageName(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot) return 'Offseason';
  return slot.name;
}

/** A stage slot is complete when every region has finished its bracket. */
export function isStageSlotComplete(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'stage') return false;
  return REGION_KEYS.every(k => {
    const r = gameState.regions[k];
    return r.bracket && r.bracket.stage >= 7;
  });
}

export function getTeamPoints(gameState, regionKey, abbr) {
  return gameState.season.points[pointsKey(regionKey, abbr)] || 0;
}

/**
 * Award a group-stage series win to a team. Called from App.jsx after each
 * group-stage series resolves. No-op if we're not currently in a stage slot.
 */
export function awardGroupStageWin(gameState, regionKey, team) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'stage') return;
  const season = gameState.season;
  season.points[pointsKey(regionKey, team.abbr)] += GROUP_WIN_POINTS;
  if (!season.currentStageGroupWins[regionKey]) {
    season.currentStageGroupWins[regionKey] = {};
  }
  season.currentStageGroupWins[regionKey][team.abbr] =
    (season.currentStageGroupWins[regionKey][team.abbr] || 0) + 1;
}

/* ─────────────── Stage completion ─────────────── */

/**
 * Finalize the current stage slot:
 *   1. Compute 1–12 placements per region
 *   2. Award circuit points
 *   3. Push a history snapshot
 *   4. Set season.status = 'transition' (UI shows the transition screen)
 *
 * Does NOT advance slotIndex — that happens in beginNextSlot() when the
 * user clicks Continue.
 */
export function completeCurrentStage(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'stage') return;

  const stageNum = slot.stageNumber;
  const stageTable = STAGE_POINTS[stageNum] || {};
  const pointsAwarded = {}; // { regionKey: [{ abbr, name, color, placement, points }] }
  const groupWinsAwarded = {}; // { regionKey: { abbr: count } } — snapshot for history

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    const placements = computeFinalStagePlacements(region);
    pointsAwarded[regionKey] = [];

    for (const { team, placement } of placements) {
      const pts = stageTable[placement] || 0;
      gameState.season.points[pointsKey(regionKey, team.abbr)] += pts;
      pointsAwarded[regionKey].push({
        abbr: team.abbr,
        name: team.name,
        color: team.color,
        placement,
        points: pts,
      });
    }

    // Snapshot the group-wins tally for this region (already in season.points)
    groupWinsAwarded[regionKey] = {
      ...(gameState.season.currentStageGroupWins[regionKey] || {}),
    };
  }

  gameState.season.history.push({
    slotIndex: gameState.season.slotIndex,
    type: 'stage',
    name: slot.name,
    stageNumber: stageNum,
    frozenStandings: snapshotAllStandings(gameState),
    bracketResults: snapshotAllBrackets(gameState),
    pointsAwarded,
    groupWinsAwarded,
  });

  gameState.season.status = 'transition';
}

/* ─────────────── International completion ─────────────── */

/**
 * True when the current international slot's tournament is fully complete
 * (Swiss done, bracket done, winner crowned).
 */
export function isInternationalSlotComplete(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'international') return false;
  return gameState.international?.phase === 'complete';
}

/**
 * Finalize the current international slot:
 *   1. Read final results from gameState.international
 *   2. Award international points per INTERNATIONAL_POINTS table
 *   3. Push a history snapshot
 *   4. Clear gameState.international
 *   5. Set season.status = 'transition'
 */
export function completeCurrentInternational(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'international') return;
  const intl = gameState.international;
  if (!intl || intl.phase !== 'complete') return;

  const intlNum = slot.internationalNumber;
  const pointsTable = INTERNATIONAL_POINTS[intlNum] || {};
  const results = computeInternationalResults(intl);

  // Build pointsAwarded per region. Each bracket team gets their placement
  // points; Swiss-eliminated teams are recorded as 9th with 0 pts so the
  // history knows who participated even though they earned nothing.
  const pointsAwarded = {};
  for (const regionKey of REGION_KEYS) pointsAwarded[regionKey] = [];

  // Map team → region (auto-bids + Swiss teams)
  const teamRegion = new Map();
  for (const { team, region } of intl.autoBids) teamRegion.set(team, region);
  for (const { team, region } of intl.swissTeams) teamRegion.set(team, region);

  // Bracket placements (1–8)
  for (const { team, placement } of results.bracketPlacements) {
    const regionKey = teamRegion.get(team);
    if (!regionKey) continue;
    const pts = pointsTable[placement] || 0;
    gameState.season.points[pointsKey(regionKey, team.abbr)] += pts;
    pointsAwarded[regionKey].push({
      abbr: team.abbr,
      name: team.name,
      color: team.color,
      placement,
      points: pts,
    });
  }

  // Swiss-eliminated (treated as tied 9th, 0 pts)
  for (const team of results.swissEliminated) {
    const regionKey = teamRegion.get(team);
    if (!regionKey) continue;
    pointsAwarded[regionKey].push({
      abbr: team.abbr,
      name: team.name,
      color: team.color,
      placement: 9,
      points: 0,
    });
  }

  // Snapshot to history
  gameState.season.history.push({
    slotIndex: gameState.season.slotIndex,
    type: 'international',
    name: slot.name,
    internationalNumber: intlNum,
    pointsAwarded,
    champion: results.bracketPlacements.find(p => p.placement === 1)
      ? teamCard(results.bracketPlacements.find(p => p.placement === 1).team)
      : null,
    runnerUp: results.bracketPlacements.find(p => p.placement === 2)
      ? teamCard(results.bracketPlacements.find(p => p.placement === 2).team)
      : null,
    // Full state refs for History tab rendering. Same rationale as stage
    // brackets: gameState.international is nulled out but the underlying
    // swiss/selection/bracket objects aren't mutated, so these stay valid.
    swiss: intl.swiss,
    selectionShow: intl.selectionShow,
    bracket: intl.bracket,
  });

  // Clear active international state
  gameState.international = null;
  gameState.season.status = 'transition';
}

/* ─────────────── Worlds completion ─────────────── */

/**
 * True when the Worlds tournament is fully complete (champion crowned).
 */
export function isWorldsSlotComplete(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'worlds') return false;
  return isWorldsComplete(gameState);
}

/**
 * Finalize the Worlds slot. Snapshots qualification, group results, and
 * bracket placements to history. Worlds is prestige-only — no circuit
 * points awarded.
 */
export function completeCurrentWorlds(gameState) {
  const slot = getCurrentSlot(gameState);
  if (!slot || slot.type !== 'worlds') return;
  const worlds = gameState.worlds;
  if (!worlds || !isWorldsComplete(gameState)) return;

  const results = computeWorldsResults(gameState);

  // Qualified summary
  const qualifiedSummary = {};
  for (const regionKey of REGION_KEYS) {
    qualifiedSummary[regionKey] = (worlds.qualified[regionKey] || []).map(teamCard);
  }

  // Group summary
  const groupsSummary = {};
  for (const gk of Object.keys(results.groupResults || {})) {
    groupsSummary[gk] = {
      advanced: results.groupResults[gk].advanced.map(teamCard),
      eliminated: results.groupResults[gk].eliminated.map(teamCard),
    };
  }

  // Bracket placements (1–8)
  const bracketSummary = results.bracketPlacements.map(p => ({
    ...teamCard(p.team),
    placement: p.placement,
  }));

  const championEntry = results.bracketPlacements.find(p => p.placement === 1);
  const runnerUpEntry = results.bracketPlacements.find(p => p.placement === 2);

  gameState.season.history.push({
    slotIndex: gameState.season.slotIndex,
    type: 'worlds',
    name: slot.name,
    qualified: qualifiedSummary,
    groups: groupsSummary,
    bracketPlacements: bracketSummary,
    champion: championEntry ? teamCard(championEntry.team) : null,
    runnerUp: runnerUpEntry ? teamCard(runnerUpEntry.team) : null,
    pointsAwarded: {}, // no circuit points from Worlds
  });

  gameState.worlds = null;
  gameState.season.status = 'transition';
}

/* ─────────────── Snapshots (feeds the Phase 5 History tab) ─────────────── */

function snapshotAllStandings(gameState) {
  const out = {};
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    out[regionKey] = region.frozenStandings
      ? JSON.parse(JSON.stringify(region.frozenStandings))
      : null;
  }
  return out;
}

function snapshotAllBrackets(gameState) {
  const out = {};
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    const b = region.bracket;
    if (!b || !b.grandFinal?.result) { out[regionKey] = null; continue; }

    const elim = [...(b.eliminated || [])].reverse();
    const championCard = teamCard(b.grandFinal.result.winner);
    out[regionKey] = {
      champion: championCard,
      runnerUp: teamCard(elim[0]),
      top4: [championCard, ...elim.slice(0, 3).map(teamCard)],
      top8: [championCard, ...elim.slice(0, 7).map(teamCard)],
      // Full bracket reference for History tab rendering. Safe to store —
      // rolloverRegionsForNewStage drops the region.bracket pointer rather
      // than mutating its matches, so these refs stay valid indefinitely.
      // The matches already carry their own result objects with frozen
      // series scores, maps, and player stats.
      fullBracket: b,
    };
  }
  return out;
}

function teamCard(team) {
  if (!team) return null;
  return {
    abbr: team.abbr,
    name: team.name,
    color: team.color,
    record: { ...team.record },
  };
}

/* ─────────────── Advance to next slot ─────────────── */

/**
 * Called when the user clicks Continue on the transition screen.
 * Advances slotIndex; for stage slots performs full region rollover.
 * International/Worlds slots are placeholder-skipped for Phase 1 — they
 * drop a stub history entry and the loop continues to the next stage.
 *
 * Phases 3 and 4 will intercept the placeholder branches and implement
 * real Swiss + bracket handling.
 */
export function beginNextSlot(gameState) {
  const s = gameState.season;

  while (true) {
    s.slotIndex++;
    if (s.slotIndex >= s.circuit.length) {
      s.status = 'complete';
      return;
    }

    const slot = s.circuit[s.slotIndex];

    if (slot.type === 'stage') {
      rolloverRegionsForNewStage(gameState);
      s.status = 'active';
      return;
    }

    if (slot.type === 'international') {
      // Phase 3: real international tournament. Initialize state and hand
      // control to the advance loop via status='active'. App.jsx will route
      // the advance button to advanceInternational() while this slot runs.
      gameState.international = initInternational(gameState, slot.internationalNumber);
      s.status = 'active';
      return;
    }

    if (slot.type === 'worlds') {
      // Phase 4a: initialize Worlds qualification + group selection show.
      // Phase 4b will extend this to run the full playoff bracket.
      gameState.worlds = initWorlds(gameState);
      s.status = 'active';
      return;
    }

    // Unknown slot type — placeholder-skip (shouldn't happen in current circuit)
    s.history.push({
      slotIndex: s.slotIndex,
      type: slot.type,
      name: slot.name,
      placeholder: true,
      note: 'Unknown slot type.',
      pointsAwarded: {},
    });
  }
}

/**
 * Reset every region for a new stage.
 * Wipes records, resets player stats, seeds groups (snake draft if prior
 * stage history exists, random for the very first stage), regenerates
 * schedule. Free agents are left alone.
 */
function rolloverRegionsForNewStage(gameState) {
  // Find the most recent completed stage in history — this is what seeds
  // the new stage's groups. On the very first stage of a save, history is
  // empty and this returns undefined → falls back to random shuffle.
  const priorStageEntry = [...gameState.season.history]
    .reverse()
    .find(e => e.type === 'stage' && !e.placeholder);

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];

    // Reset the group-wins counter for the new stage
    gameState.season.currentStageGroupWins[regionKey] = {};

    for (const team of region.teams) {
      team.record.wins = 0;
      team.record.losses = 0;
      team.record.mapWins = 0;
      team.record.mapLosses = 0;
      team.record.roundWins = 0;
      team.record.roundLosses = 0;

      gameState.season.currentStageGroupWins[regionKey][team.abbr] = 0;

      for (const player of team.roster) {
        if (player.stats) {
          player.stats.kills = 0;
          player.stats.deaths = 0;
          player.stats.assists = 0;
          player.stats.acs = 0;
          player.stats.maps = 0;
        }
      }
    }

    // Assign groups — snake draft from prior placements, or random if none
    const priorPlacements = priorStageEntry?.pointsAwarded?.[regionKey];
    if (priorPlacements && priorPlacements.length > 0) {
      assignGroupsBySnakeDraft(region.teams, priorPlacements);
    } else {
      const shuffled = [...region.teams].sort(() => Math.random() - 0.5);
      shuffled.forEach((team, i) => {
        team.group = i < GROUP_SIZE ? 'A' : 'B';
      });
    }

    region.schedule = generateSchedule(region.teams);
    region.currentWeek = 0;
    region.phase = 'group';
    region.results = [];
    region.bracket = null;
    region.frozenStandings = null;
  }
}

/**
 * Assign teams to groups A and B via snake draft based on prior stage
 * placements. For 12 teams seeded 1–12:
 *
 *   Group A: seeds 1, 4, 5, 8, 9, 12
 *   Group B: seeds 2, 3, 6, 7, 10, 11
 *
 * This mirrors the standard VCT snake-draft pattern: each pair of seeds
 * alternates assignment direction, so both groups get exactly one team
 * from each seed tier (top 2, next 2, etc.) while ensuring the #1 and #2
 * seeds are split apart.
 *
 * `priorPlacements` is the pointsAwarded array from the previous stage's
 * history entry: `[{ abbr, placement, ... }, ...]`.
 *
 * Any team in `teams` that doesn't appear in `priorPlacements` (shouldn't
 * happen in normal play, but defensive) gets appended after the seeded
 * teams and assigned to whichever group has room.
 */
function assignGroupsBySnakeDraft(teams, priorPlacements) {
  // Sort prior placements by placement ascending → rank 0 = 1st, rank 1 = 2nd, ...
  const ranked = [...priorPlacements].sort((a, b) => a.placement - b.placement);

  const abbrToTeam = new Map(teams.map(t => [t.abbr, t]));
  const groupA = [];
  const groupB = [];

  // Snake pattern: seeds 0, 3, 4, 7, 8, 11 → A; seeds 1, 2, 5, 6, 9, 10 → B.
  // This generalizes as: if floor(seedIndex / 2) is even → A, else → B.
  //   seed 0 (pair 0, even) → A
  //   seed 1 (pair 0, even) → B
  //   seed 2 (pair 1, odd)  → B
  //   seed 3 (pair 1, odd)  → A
  //   seed 4 (pair 2, even) → A
  //   seed 5 (pair 2, even) → B
  //   ...
  ranked.forEach((entry, seedIdx) => {
    const team = abbrToTeam.get(entry.abbr);
    if (!team) return;
    const pairIdx = Math.floor(seedIdx / 2);
    const isEvenPair = pairIdx % 2 === 0;
    const withinPair = seedIdx % 2; // 0 or 1
    // Even pair: 0→A, 1→B.   Odd pair: 0→B, 1→A.
    const goesToA = isEvenPair ? withinPair === 0 : withinPair === 1;
    if (goesToA && groupA.length < GROUP_SIZE) groupA.push(team);
    else if (!goesToA && groupB.length < GROUP_SIZE) groupB.push(team);
    else if (groupA.length < GROUP_SIZE) groupA.push(team);
    else groupB.push(team);
  });

  // Defensive: any unseeded teams fill remaining slots
  for (const team of teams) {
    if (groupA.includes(team) || groupB.includes(team)) continue;
    if (groupA.length < GROUP_SIZE) groupA.push(team);
    else groupB.push(team);
  }

  for (const t of groupA) t.group = 'A';
  for (const t of groupB) t.group = 'B';
}

