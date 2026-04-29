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
import { GROUP_SIZE, ROSTER_MIN, FREE_AGENT_POOL_SIZE } from '../data/constants.js';
import { STAGE_POINTS, INTERNATIONAL_POINTS, GROUP_WIN_POINTS } from '../data/points.js';
import { generateSchedule } from './league.js';
import { generatePlayer } from '../classes/Player.js';
import { computeFinalStagePlacements } from './placements.js';
import { runOffseasonAISignings } from './offseason.js';
import { runMidseasonAISignings } from './midseason.js';
import {
  initInternational,
  computeInternationalResults,
} from './international.js';
import {
  initWorlds,
  isWorldsComplete,
  computeWorldsResults,
} from './worlds.js';
import {
  calculateBaseSalary, calculateBuyout, computeTeamSalary, resolveOffer,
  adjustMorale, SALARY_CAP,
} from '../data/salary.js';

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
/* ─────────────── Helpers ─────────────── */

/**
 * Deep-clone a stageStats object. Used by Phase 6h-B's archive snapshot
 * so mutations to live `player.stageStats` (cleared on new season) don't
 * leak into stored archive entries. Each per-stage stats blob is a flat
 * object of numbers, so a one-level spread per stage is sufficient.
 */
function cloneStageStats(src) {
  if (!src) return {};
  const out = {};
  for (const key of Object.keys(src)) {
    out[key] = { ...src[key] };
  }
  return out;
}

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

  // First-time init only — preserve existing values across resets
  if (typeof gameState.seasonNumber !== 'number') {
    // Year-based labeling. Season 1 = 2025; each new season is +1 year.
    // Stored as a number so it serializes cleanly and ordering works.
    gameState.seasonNumber = 2025;
  }
  if (!Array.isArray(gameState.archive)) {
    gameState.archive = [];
  }

  return {
    circuit: CIRCUIT,
    slotIndex: 0,
    // 'active'            — circuit running (group play, brackets, intl, worlds)
    // 'transition'        — between slots, transition overlay showing
    // 'season-complete'   — season done, awaiting "Start New Season" click
    // 'offseason-active'  — Phase 6e: between seasons, user reviews offseason
    //                       report and manages FA roster. Advance is blocked
    //                       until user clicks "Start Preseason" which flips
    //                       status back to 'active'.
    // 'mid-season-fa'     — Phase 6f: between stage 1↔2 and stage 2↔3, user
    //                       can sign/release within a 2-signing season cap.
    //                       Advance is blocked until user clicks "Start Stage"
    //                       which flips status back to 'active'.
    // (legacy 'complete' status no longer used; replaced by 'season-complete')
    status: 'active',
    points,
    history: [],
    currentStageGroupWins,
    // Log of AI team moves during the most recent offseason. Populated by
    // runOffseasonAISignings() and runReactiveAISignings() in offseason.js.
    // Displayed on the Offseason view. Cleared on new season init.
    aiOffseasonLog: [],
    // Phase 6f: same shape as aiOffseasonLog but for mid-season FA windows.
    // Persists across both windows in a season (entries from window 1 stay
    // visible during window 2). Cleared on new season init via this fresh
    // initSeason() call.
    aiMidseasonLog: [],
    // Phase 6e+ Ask 3: in-flight series played one map at a time.
    // Managed by engine/activeSeries.js. Populated when advance handlers
    // seed a week/round/stage, drained as series complete over successive
    // Advance clicks. Empty between ticks.
    activeSeries: [],
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

  // Phase 7e: morale from stage placement. Top 3 teams get +3, mid +1,
  // bottom -2. Affects all rostered players for that team.
  applyStageMorale(gameState, pointsAwarded);

  // Phase 6h: snapshot per-stage player stats before the stage rolls over
  // (or, for stage 3, before the season ends). Each player's CURRENT
  // stats represent only this stage; we copy them into player.stageStats[stageNum]
  // for the in-season Stats tab to surface. Future seasons will have these
  // same fields but live on the archive entry.
  //
  // Stat reset still happens later in rolloverRegionsForNewStage (or at
  // beginNewSeason for the final stage). This snapshot must happen FIRST.
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      for (const player of team.roster) {
        if (!player.stageStats) player.stageStats = {};
        player.stageStats[stageNum] = {
          kills: player.stats?.kills || 0,
          deaths: player.stats?.deaths || 0,
          assists: player.stats?.assists || 0,
          acs: player.stats?.acs || 0,
          maps: player.stats?.maps || 0,
        };
      }
    }
    // Free agents don't accumulate stats during a stage (they're not on
    // any team), so no snapshot needed for them.
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
  const intlEntry = {
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
  };
  gameState.season.history.push(intlEntry);

  // Phase 7e: morale from international placement. Champion +5, bracket
  // teams +2. Done after history snapshot so the bracket data is settled.
  applyInternationalMorale(gameState, intlEntry);

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

  const worldsEntry = {
    slotIndex: gameState.season.slotIndex,
    type: 'worlds',
    name: slot.name,
    qualified: qualifiedSummary,
    groups: groupsSummary,
    bracketPlacements: bracketSummary,
    champion: championEntry ? teamCard(championEntry.team) : null,
    runnerUp: runnerUpEntry ? teamCard(runnerUpEntry.team) : null,
    pointsAwarded: {}, // no circuit points from Worlds
    // Full state refs for History tab rendering. Same rationale as stage
    // and international: gameState.worlds gets nulled out below but the
    // underlying bracket/playoffSelection objects aren't mutated, so
    // these refs stay valid indefinitely.
    bracket: worlds.bracket,
    playoffSelection: worlds.playoffSelection,
  };
  gameState.season.history.push(worldsEntry);

  // Phase 7e: morale from worlds placement. Big numbers — championship
  // is the season-defining moment.
  applyWorldsMorale(gameState, worldsEntry);

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

  // Phase 6e+ Ask 3 hardening: clear any leftover activeSeries from the
  // slot that just ended. Series are scoped to a single slot (group week,
  // bracket stage, swiss round, etc.) — they should never leak across
  // a slot boundary. Defensive clear protects against half-drained state
  // from prior advance flows.
  s.activeSeries = [];

  while (true) {
    s.slotIndex++;
    if (s.slotIndex >= s.circuit.length) {
      // End of circuit → season is complete. User can browse freely until
      // they click "Start New Season" which calls beginNewSeason() below.
      s.status = 'season-complete';
      return;
    }

    const slot = s.circuit[s.slotIndex];

    if (slot.type === 'stage') {
      // Phase 6f: stages 2 and 3 are preceded by a mid-season FA window.
      // Stage 1 is the start of the season — no FA window before it (the
      // offseason already happened). We do the standard rollover (group
      // reset, schedule regen, records cleared) up front, then sit in
      // 'mid-season-fa' status until the user clicks Start Stage from
      // the sidebar.
      rolloverRegionsForNewStage(gameState);
      const isMidseasonStage = slot.stageNumber === 2 || slot.stageNumber === 3;
      if (isMidseasonStage) {
        // Run AI mid-season signings ONCE on entry to the FA window. AI
        // teams roll under their archetype-specific dice (15/35/50). Cap
        // is enforced inside runMidseasonAISignings — teams already at
        // the season cap from a prior window skip entirely.
        runMidseasonAISignings(gameState);
        s.status = 'mid-season-fa';
      } else {
        s.status = 'active';
      }
      return;
    }

    if (slot.type === 'international') {
      // Phase 6e+ hardening: try/catch protects against init throwing,
      // which would otherwise leave status='transition' and gray the UI
      // permanently. If init fails, we log + still flip status to active
      // — the user can navigate away and the international view will show
      // its empty state.
      try {
        gameState.international = initInternational(gameState, slot.internationalNumber);
      } catch (e) {
        console.error('[beginNextSlot] initInternational threw:', e);
        gameState.international = null;
      }
      s.status = 'active';
      return;
    }

    if (slot.type === 'worlds') {
      try {
        gameState.worlds = initWorlds(gameState);
      } catch (e) {
        console.error('[beginNextSlot] initWorlds threw:', e);
        gameState.worlds = null;
      }
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

/* ─────────────── New season ─────────────── */

/**
 * Exponential retirement curve. Returns probability (0–1) that a player
 * of the given age retires during the offseason.
 *
 * Design (from user spec):
 *   - Age < 25: 0% (no retirement)
 *   - Age 25–29: exponentially increasing
 *   - Age 30+: 100% (hard cutoff)
 *
 * Actual values (roughly doubling each year to feel "exponential"):
 *   25 →  2%
 *   26 →  5%
 *   27 → 11%
 *   28 → 22%
 *   29 → 42%
 *   30 → 100%
 *
 * Over a typical 5-year window (25→29) this retires roughly 60–70% of
 * players who reach age 25, with the rest hitting the hard 30 wall.
 */
function retirementChance(age) {
  if (age >= 30) return 1.0;
  if (age < 25) return 0.0;
  // Table lookup — simpler than a formula and easier to tune
  const curve = { 25: 0.02, 26: 0.05, 27: 0.11, 28: 0.22, 29: 0.42 };
  return curve[age] || 0;
}

/**
 * Check whether a player should retire this offseason. Age 30+ always
 * retires; ages 25–29 roll against the exponential curve.
 */
function shouldRetire(player) {
  return Math.random() < retirementChance(player.age);
}

/**
 * Generate an age for a rookie entering the FA pool. Most rookies are
 * 17–18 fresh prospects; some are 19–20 late entrants who took a longer
 * path to the scene. Deliberately skewed younger than initial roster
 * generation since these are specifically "new to the league".
 */
function randRookieAge() {
  const r = Math.random();
  if (r < 0.55) return 17;              // 55% — fresh 17
  if (r < 0.85) return 18;              // 30% — 18
  if (r < 0.97) return 19;              // 12% — 19 late entrant
  return 20;                            //  3% — 20 extreme late bloomer
}

/**
 * Inclusive random integer in [min, max].
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Age-based stat delta baseline. Applied per-stat independently so the
 * same player can gain aim and lose positioning in the same offseason.
 *
 * Uses the age the player JUST PLAYED (before the +1 aging tick), since
 * development represents what happened during the completed season.
 *
 * Design (from user spec):
 *   17–20: heavy growth skew, small downside risk
 *   21–22: moderate growth
 *   23–24: flat with noise
 *   25–26: declining
 *   27–29: steep decline (forced retirement at 30 handles the tail)
 */
function ageDelta(age) {
  if (age <= 20) return randInt(-1, 4);
  if (age <= 22) return randInt(-2, 3);
  if (age <= 24) return randInt(-2, 2);
  if (age <= 26) return randInt(-3, 1);
  return randInt(-4, 0); // 27–29
}

/**
 * Score a player's season into a performance tier 0–3 based on K/D and
 * average ACS. Only players with ≥3 maps are scored (smaller samples are
 * too noisy to trust). Players with <3 maps return null — no performance
 * modifier, they just get the age baseline.
 *
 * Tier 3 = elite season (K/D ≥ 1.3 AND ACS ≥ 230)
 * Tier 2 = strong season (K/D ≥ 1.1 AND ACS ≥ 200)
 * Tier 1 = average season (K/D ≥ 0.9 AND ACS ≥ 170)
 * Tier 0 = bad season (anything worse)
 */
function performanceTier(player) {
  const s = player.stats;
  if (!s || s.maps < 3) return null;
  const kd = s.kills / Math.max(1, s.deaths);
  const acs = s.acs / s.maps;
  if (kd >= 1.3 && acs >= 230) return 3;
  if (kd >= 1.1 && acs >= 200) return 2;
  if (kd >= 0.9 && acs >= 170) return 1;
  return 0;
}

/**
 * Performance-based delta added to each stat's age baseline.
 *
 * Tier 3 (elite):  +1 to +3 per stat — breakout season rewards growth
 * Tier 2 (strong): +0 to +1 per stat — solid work, small boost
 * Tier 1 (average): 0 — no change
 * Tier 0 (bad):    -2 to  0 per stat — dragged down
 * null (no data):  0 — unplayed or too-small sample, no modifier
 */
function performanceDelta(tier) {
  if (tier === null) return 0;
  if (tier === 3) return randInt(1, 3);
  if (tier === 2) return randInt(0, 1);
  if (tier === 1) return 0;
  return randInt(-2, 0); // tier 0
}

/**
 * Run the full rating development pass on a player. Mutates the player's
 * ratings, recomputes overall, and stashes a lastOffseasonDelta object
 * so the UI can show (+N)/(-N) indicators on roster/FA tables during the
 * new season.
 *
 * Clamping: ratings are clamped to [1, 99]. No artificial rating floor —
 * older players with bad seasons can genuinely drop below the rookie
 * generation floor of 45, creating "should I release this declining vet?"
 * decisions.
 *
 * Only called during the offseason, before aging and retirement rolls.
 * Rookies entering via generatePlayer don't get a delta stashed (no
 * previous state to diff against).
 */
function developPlayer(player) {
  // Snapshot pre-development state for the delta
  const oldRatings = { ...player.ratings };
  const oldOverall = player.overall;

  // Compute performance tier ONCE per player (same tier drives all 5
  // stat perf modifiers — but each stat still rolls its own random value
  // within the tier's range, so you can gain aim and not gain positioning)
  const tier = performanceTier(player);

  // Apply per-stat deltas
  const newRatings = {};
  for (const stat of ['aim', 'positioning', 'utility', 'gamesense', 'clutch']) {
    const age = player.age; // pre-aging, the age they just played at
    const base = ageDelta(age);
    const perf = performanceDelta(tier);
    const newVal = Math.max(1, Math.min(99, (oldRatings[stat] || 0) + base + perf));
    newRatings[stat] = newVal;
  }

  player.ratings = newRatings;
  player.overall = player.calcOverall();

  // Stash the delta for UI display. Includes per-stat deltas and the
  // overall delta (computed from new vs old). Only stats with non-zero
  // deltas are worth showing, but we store everything for completeness
  // — the UI can decide what to render.
  player.lastOffseasonDelta = {
    aim: newRatings.aim - oldRatings.aim,
    positioning: newRatings.positioning - oldRatings.positioning,
    utility: newRatings.utility - oldRatings.utility,
    gamesense: newRatings.gamesense - oldRatings.gamesense,
    clutch: newRatings.clutch - oldRatings.clutch,
    overall: player.overall - oldOverall,
    tier, // null or 0-3, useful for UI if we ever want to show "elite season" badges
  };
}

// ── Phase 7e: morale dynamics helpers ──

/**
 * Apply morale changes after a stage completes. Stage placement drives
 * direction:
 *   1st-3rd     →  +3 morale (winning vibe)
 *   4th-6th     →  +1 morale (positive but mild)
 *   7th-9th     →  0 (middling, no effect)
 *   10th-last   →  -2 morale (bottom of the standings is demoralizing)
 *
 * Per region, evaluated against that region's stage placements list.
 * Players on each team get the same delta. Only rostered players are
 * affected — FAs don't gain/lose morale from outcomes they didn't
 * participate in.
 */
function applyStageMorale(gameState, pointsAwarded) {
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    const placements = pointsAwarded[regionKey] || [];

    for (const placement of placements) {
      const team = region.teams.find(t => t.abbr === placement.abbr);
      if (!team) continue;

      let delta = 0;
      let reason = null;
      if (placement.placement <= 3) {
        delta = +3; reason = 'top_3_stage';
      } else if (placement.placement <= 6) {
        delta = +1; reason = 'mid_stage';
      } else if (placement.placement >= 10) {
        delta = -2; reason = 'bottom_stage';
      }
      // 7-9 → no change (no reason logged)

      if (delta !== 0) {
        for (const player of team.roster) {
          adjustMorale(player, delta, reason);
        }
      }
    }
  }
}

/**
 * Apply morale changes after an international event. Placement-based
 * but more impactful than a stage:
 *   Champion (top 1)              → +5 morale
 *   Made playoff bracket (top 8)  → +2 morale
 *   Eliminated in swiss (DNQ)     →  0 (didn't really play, no morale shift)
 *   Didn't qualify for international → 0 (handled implicitly — they're just not here)
 *
 * `entry` is the history entry for the international, pulled from
 * gameState.season.history[]. It has a bracket field with grandFinal +
 * eliminated players. We extract the champion + bracket teams from there.
 */
function applyInternationalMorale(gameState, intlEntry) {
  if (!intlEntry?.bracket) return;
  const champion = intlEntry.bracket.grandFinal?.result?.winner;
  // Bracket teams = the 8 that made the playoffs. We can derive them
  // from intlEntry.bracket — every grandFinal/semifinal/quarterfinal/elim
  // entry has a winner+loser; collect uniques.
  const bracketTeams = new Set();
  function addFromMatch(m) {
    if (!m?.result) return;
    if (m.result.winner) bracketTeams.add(m.result.winner.abbr);
    if (m.result.loser) bracketTeams.add(m.result.loser.abbr);
  }
  addFromMatch(intlEntry.bracket.grandFinal);
  for (const m of (intlEntry.bracket.upper || [])) addFromMatch(m);
  for (const m of (intlEntry.bracket.lower || [])) addFromMatch(m);
  for (const m of (intlEntry.bracket.swissBracketRound || [])) addFromMatch(m);

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      let delta = 0;
      let reason = null;
      if (champion && team.abbr === champion.abbr) {
        delta = +5; reason = 'won_international';
      } else if (bracketTeams.has(team.abbr)) {
        delta = +2; reason = 'intl_playoffs';
      }
      if (delta !== 0) {
        for (const player of team.roster) {
          adjustMorale(player, delta, reason);
        }
      }
    }
  }
}

/**
 * Apply morale changes after Worlds completes. Similar to international
 * but with bigger numbers — the season-defining moment.
 *   World Champion        → +15 morale (career highlight)
 *   Worlds Runner-up      → +8 morale
 *   Worlds top-4 semis    → +5 morale
 *   Worlds bracket (top 8) → +2 morale
 *
 * Worlds entry has the same bracket structure as international.
 */
function applyWorldsMorale(gameState, worldsEntry) {
  if (!worldsEntry?.bracket) return;
  const champion = worldsEntry.champion;
  const runnerUp = worldsEntry.runnerUp;

  // Top-4 = grand final teams + their losers' last opponents (semifinal losers)
  const top4 = new Set();
  if (champion) top4.add(champion.abbr);
  if (runnerUp) top4.add(runnerUp.abbr);
  // Find semifinal losers: teams that lost their final pre-grand-final match
  // Approximate: anyone who appears in upper bracket round 2 (semifinals)
  // is in top 4. Simpler: union of all upper-bracket loser teams that didn't
  // win the grand final.
  const bracketTeams = new Set();
  function addFromMatch(m) {
    if (!m?.result) return;
    if (m.result.winner) bracketTeams.add(m.result.winner.abbr);
    if (m.result.loser) bracketTeams.add(m.result.loser.abbr);
  }
  addFromMatch(worldsEntry.bracket.grandFinal);
  for (const m of (worldsEntry.bracket.upper || [])) addFromMatch(m);
  for (const m of (worldsEntry.bracket.lower || [])) addFromMatch(m);
  for (const m of (worldsEntry.bracket.swissBracketRound || [])) addFromMatch(m);

  // Try to identify top-4: semifinal losers. Walk upper bracket: matches
  // whose winner went on to play in the grand final = semifinals. Their
  // loser is in top 4. Approximation since we don't have explicit round
  // labels on every match.
  for (const m of (worldsEntry.bracket.upper || [])) {
    if (!m?.result) continue;
    const w = m.result.winner;
    if (w && (w.abbr === champion?.abbr || w.abbr === runnerUp?.abbr)) {
      const l = m.result.loser;
      if (l) top4.add(l.abbr);
    }
  }

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      let delta = 0;
      let reason = null;
      if (champion && team.abbr === champion.abbr) {
        delta = +15; reason = 'won_worlds';
      } else if (runnerUp && team.abbr === runnerUp.abbr) {
        delta = +8; reason = 'worlds_runner_up';
      } else if (top4.has(team.abbr)) {
        delta = +5; reason = 'worlds_top_4';
      } else if (bracketTeams.has(team.abbr)) {
        delta = +2; reason = 'worlds_playoffs';
      }
      if (delta !== 0) {
        for (const player of team.roster) {
          adjustMorale(player, delta, reason);
        }
      }
    }
  }
}

/**
 * Salary fairness pass — runs during offseason after AI re-signings.
 * For every rostered player, compare their current salary to their
 * fair market base salary:
 *   Significantly underpaid (<70% of base) → -5 morale ('underpaid')
 *   Significantly overpaid  (>130% of base) → +3 morale ('overpaid')
 *   Otherwise → 0
 *
 * This creates a long-term morale tension: signing a star to a bargain
 * deal might work short-term, but their morale will erode each offseason
 * until you renegotiate or they walk via "wants to leave" (morale<30).
 *
 * Symmetric in detection but asymmetric in magnitude — losing 5 morale
 * for being underpaid hurts more than gaining 3 morale for being
 * overpaid. Models real-world player psychology: fair pay is expected,
 * underpay is resented, overpay is appreciated but doesn't drive loyalty.
 */
function applyOffseasonSalaryFairness(gameState) {
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      for (const player of team.roster) {
        if (!player.contract) continue;
        const fairMarket = calculateBaseSalary(player.overall);
        const ratio = (player.contract.salary || 0) / fairMarket;
        if (ratio < 0.70) {
          adjustMorale(player, -5, 'underpaid');
        } else if (ratio > 1.30) {
          adjustMorale(player, +3, 'overpaid');
        }
      }
    }
  }
}

// ── Phase 7d: re-sign window helpers ──
/**
 * Compute an offer from an AI team to one of its expiring players.
 * Archetype-driven:
 *   BIG_SPENDER:    aggressive on stars (>=75 OVR), generous +5% on
 *                    base salary; lets <70 OVR walk
 *   TALENT_SEEKER:  re-signs young (<=25), lets aging vets (26+) walk
 *                    even if good
 *   BALANCED:       pragmatic — re-signs anyone whose base salary fits
 *                    the cap; small +0% bonus
 *
 * Returns null if the team chooses to let the player walk (skip
 * re-sign offer). Otherwise returns an offer object suitable for
 * resolveOffer: { salary, years, isResign: true }.
 *
 * Length is randomized 1-3 with a slight bias toward 2, matching the
 * normal AI signing behavior. Salary is the player's calculateBaseSalary
 * with archetype bonus applied. Cap fit is checked here so AIs don't
 * even attempt offers that would put them over the cap.
 */
function buildAIResignOffer(team, player, currentTeamSalary) {
  const archetype = team.archetype;

  // Archetype-specific "should we even try?" gate
  if (archetype === 'BIG_SPENDER' && player.overall < 70) return null;
  if (archetype === 'TALENT_SEEKER' && player.age >= 26) return null;
  // BALANCED has no gate — always tries

  // Base salary, with a small archetype premium
  let baseSalary = calculateBaseSalary(player.overall);
  if (archetype === 'BIG_SPENDER' && player.overall >= 75) {
    baseSalary = Math.round(baseSalary * 1.05); // +5% for stars
  }

  // Cap fit check — would this offer push the team over the cap?
  // currentTeamSalary already includes the player's prior salary (he's
  // still on the roster but at yearsRemaining=0 with $0 not actually
  // contributing... wait, his contract.salary is still the old number.
  // Recompute properly: subtract the player's expiring salary, add the
  // proposed new salary.
  const oldSalary = player.contract?.salary || 0;
  const projectedSalary = currentTeamSalary - oldSalary + baseSalary;
  if (projectedSalary > SALARY_CAP) return null; // can't afford

  // Length roll — slight bias toward 2yr
  const r = Math.random();
  const length = r < 0.3 ? 1 : r < 0.7 ? 2 : 3;

  return { salary: baseSalary, years: length, isResign: true };
}

/**
 * Run AI re-signing decisions for all non-human teams. Iterates each
 * team's roster looking for players with expired contracts (yearsRemaining=0)
 * and decides whether to extend per archetype. Resolved via resolveOffer
 * so morale<30 "wants to leave" overrides naturally apply.
 *
 * Successful re-signs update the player's contract in place (yearsRemaining
 * resets to the offered length, salary updates). Failed/skipped re-signs
 * leave the player at yearsRemaining=0 — they'll walk to FA when the
 * resign window closes.
 *
 * Logs to gameState.season.aiResignLog so the History/UI can surface
 * what each AI team did during the window.
 */
export function runAIResignings(gameState) {
  if (!gameState.season.aiResignLog) gameState.season.aiResignLog = [];
  const seasonNumber = gameState.seasonNumber || 2025;

  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      if (team.isHuman) continue;
      const expiring = team.roster.filter(p => p.contract && (p.contract.yearsRemaining ?? 1) <= 0);
      if (expiring.length === 0) continue;

      // Sort by overall desc — try to retain the best players first.
      // This matters when the team is cap-tight: highest-OVR retentions
      // get priority over depth pieces.
      expiring.sort((a, b) => b.overall - a.overall);

      for (const player of expiring) {
        const currentSalary = computeTeamSalary(team);
        const offer = buildAIResignOffer(team, player, currentSalary);

        if (!offer) {
          // AI declined to offer — log as walk
          gameState.season.aiResignLog.push({
            teamAbbr: team.abbr,
            teamName: team.name,
            teamColor: team.color,
            playerTag: player.tag,
            playerOverall: player.overall,
            outcome: 'walked',
            reason: 'team_declined',
          });
          continue;
        }

        const result = resolveOffer(player, offer, seasonNumber);
        if (result.accepted) {
          player.contract = result.contract;
          // Phase 7e: re-signing with current team is a positive morale event
          adjustMorale(player, +5, 'resigned_by_team');
          gameState.season.aiResignLog.push({
            teamAbbr: team.abbr,
            teamName: team.name,
            teamColor: team.color,
            playerTag: player.tag,
            playerOverall: player.overall,
            outcome: 'resigned',
            salary: result.contract.salary,
            years: result.contract.yearsRemaining,
          });
        } else {
          // Player rejected offer — could be wants_to_leave (morale<30)
          // or simply that the AI didn't offer enough. Either way, the
          // player stays at yearsRemaining=0 and walks at window close.
          gameState.season.aiResignLog.push({
            teamAbbr: team.abbr,
            teamName: team.name,
            teamColor: team.color,
            playerTag: player.tag,
            playerOverall: player.overall,
            outcome: 'walked',
            reason: result.reason || 'rejected_offer',
          });
        }
      }
    }
  }
}

/**
 * Begin a new season. Called from the dashboard/sidebar "Start New Season"
 * button when status === 'season-complete'.
 *
 * Phase 7d: this function now ENDS at the re-sign window (after step 2.5
 * contract decrement and step 2.6 AI re-signings). It sets status to
 * 'resign-window'. The user makes their re-sign decisions, then clicks
 * Continue which calls closeResignWindowAndBeginOffseason() — that runs
 * steps 3-7 and finishes the offseason transition.
 *
 * Original sequence (now split across two functions):
 *   ── beginNewSeason (this function) ──
 *   1. Archive the completed season
 *   2. Rating development
 *   2.5. Contract decrement + dead cap rolloff
 *   2.6. AI auto-resigning per archetype
 *   ── closeResignWindowAndBeginOffseason ──
 *   3. Force walk-aways (yearsRemaining=0 players → FA pool)
 *   4. Aging + retirement
 *   5. AI backfill
 *   6. Rookie generation
 *   7. Reset records, regen schedules, run offseason AI signings
 */
export function beginNewSeason(gameState) {
  if (gameState.season?.status !== 'season-complete') return;

  // Defensive: ensure top-level Phase 6c+ fields exist. Saves created
  // before these fields were added (or partially-migrated saves) might
  // have them missing, which would throw on .push() below and silently
  // break the click handler.
  if (typeof gameState.seasonNumber !== 'number') {
    gameState.seasonNumber = 2025;
  }
  if (!Array.isArray(gameState.archive)) {
    gameState.archive = [];
  }

  // ── 1. Archive the completed season ──
  const completedYear = gameState.seasonNumber;
  const completedHistory = gameState.season.history || [];
  const lastWorlds = [...completedHistory].reverse().find(e => e.type === 'worlds');

  // Offseason summary stub — populated as we go. Stored on the archive
  // entry for future surfacing (Phase 6g history selector can display it).
  const offseasonSummary = {
    retiredCount: 0,
    rookiesGenerated: 0,
    aiSigningsCount: 0,
    // Development tally — filled in during the development pass below.
    // Useful for the "top movers" view in a future offseason report.
    developedCount: 0,
    biggestGainers: [], // top 5 by overall delta
    biggestLosers: [],  // bottom 5 by overall delta
    // Phase 6g: capture lightweight cards for every retiring player so
    // the History tab can render a Hall of Fame across seasons. We
    // store the snapshot at retirement time (final age, final overall,
    // last team) since the live player object gets discarded after this
    // pass. Only the fields displayed in the UI are kept — keeps the
    // archive entry small even after many seasons.
    retirees: [],
  };

  // Phase 6h-B: snapshot per-season stats for every active player BEFORE
  // we clear stageStats / age / retire / develop. The shape mirrors what
  // the live Stats UI consumes:
  //   { regionKey: [
  //       {
  //         tag, name, age, overall, nationality, teamAbbr, teamColor,
  //         stageStats: { 1: {...}, 2: {...}, 3: {...} },
  //       },
  //       ...
  //     ]
  //   }
  // FAs are not included — they don't accumulate stage stats.
  //
  // Stored under archive.statsSnapshot so the History "Stats" detail can
  // render a per-archived-season leaderboard with the same per-stage
  // selector behavior as the live tab. Saves ~432 entries per season.
  const statsSnapshot = {};
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    statsSnapshot[regionKey] = [];
    for (const team of region.teams) {
      for (const player of team.roster) {
        statsSnapshot[regionKey].push({
          tag: player.tag,
          name: player.name,
          age: player.age, // current age (pre-aging — they played the season at this age)
          overall: player.overall,
          nationality: player.nationality,
          teamAbbr: team.abbr,
          teamName: team.name,
          teamColor: team.color,
          // Deep-clone the per-stage breakdowns so future mutation of
          // player.stageStats doesn't leak into the archive
          stageStats: cloneStageStats(player.stageStats || {}),
        });
      }
    }
  }

  gameState.archive.push({
    year: completedYear,
    history: completedHistory,
    worldChampion: lastWorlds?.champion || null,
    runnerUp: lastWorlds?.runnerUp || null,
    offseasonSummary,
    statsSnapshot,
  });

  // Increment year
  gameState.seasonNumber = completedYear + 1;

  // ── 2. Rating development ──
  // Run BEFORE aging so the age curve reads the age the player just
  // played at. Also MUST run before step 7 (stat reset) since performance
  // is computed from player.stats.
  //
  // After this pass, every non-rookie player has a lastOffseasonDelta
  // object attached for the UI to render (+N)/(-N) indicators.
  const allMovers = []; // for gainer/loser leaderboards
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      for (const player of team.roster) {
        developPlayer(player);
        offseasonSummary.developedCount++;
        allMovers.push(player);
      }
    }
    for (const player of region.freeAgents) {
      developPlayer(player);
      offseasonSummary.developedCount++;
      allMovers.push(player);
    }
  }

  // Top 5 gainers and losers by overall delta. Stored as lightweight
  // summaries (tag, team/FA, delta) so they survive across seasons
  // without holding live player references.
  const sorted = [...allMovers].sort(
    (a, b) => (b.lastOffseasonDelta?.overall || 0) - (a.lastOffseasonDelta?.overall || 0)
  );
  const moverCard = (p) => ({
    tag: p.tag,
    name: p.name,
    age: p.age, // this is still the pre-aging age — aging hasn't happened yet
    overall: p.overall,
    delta: p.lastOffseasonDelta?.overall || 0,
  });
  offseasonSummary.biggestGainers = sorted.slice(0, 5).map(moverCard);
  offseasonSummary.biggestLosers = sorted.slice(-5).reverse().map(moverCard);

  // ── 2.5. Contract decrement + dead cap rolloff (Phase 7c/7d) ──
  // Each contract's yearsRemaining ticks down by 1 here. Phase 7d:
  // contracts that hit 0 are NOT immediately cleared. Instead, the
  // player stays on the roster with yearsRemaining=0 as a flag meaning
  // "expiring this offseason — eligible for re-sign." The re-sign
  // window UI surfaces these. After the window closes, players still
  // at yearsRemaining=0 (not re-signed) move to the FA pool (handled
  // in closeResignWindowAndBeginOffseason below).
  //
  // Dead cap hits also roll off here. A buyout incurred during year N
  // applies for year N only and is cleared at the next season boundary.
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      // Roll off all dead cap hits — they were for the year that just ended.
      team.deadCapHits = [];

      for (const player of team.roster) {
        if (player.contract) {
          player.contract.yearsRemaining = Math.max(0, (player.contract.yearsRemaining || 0) - 1);
          // yearsRemaining=0 means expiring; Phase 7d's resign window
          // will offer the human a chance to extend before they walk.
          // AI teams resolve their own re-signs in runAIResignings.
        }
      }
    }
  }

  // ── 2.6. AI auto-resigning (Phase 7d) ──
  // Non-human teams immediately resolve their re-signing decisions:
  // for each player with yearsRemaining=0, the team's archetype dictates
  // whether to extend (and at what value). Logic is in runAIResignings.
  // Players the AI doesn't re-sign stay at yearsRemaining=0 and will
  // become UFA when the resign window closes.
  runAIResignings(gameState);

  // ── 2.65. Offseason salary fairness morale check (Phase 7e) ──
  // After AI re-signings (which let AIs correct underpaid stars on
  // their roster), check every rostered player's salary vs market.
  // Significantly underpaid → -5 morale, overpaid → +3 morale. Creates
  // long-term pressure: stars on bargain deals will eventually want out.
  applyOffseasonSalaryFairness(gameState);

  // ── 2.7. Stash partial offseason state on archive entry ──
  // The archive entry was already pushed (line above). Its offseasonSummary
  // is a live reference, so the second-half function can keep mutating it.
  // We just need to remember which archive entry "belongs to" the current
  // resign window so closeResignWindowAndBeginOffseason knows where to
  // route accumulating data (retiree count, AI signings count, etc.).
  // Stash on gameState.season as a back-pointer.
  gameState.season._offseasonSummaryRef = offseasonSummary;

  // Status flips to 'resign-window'. UI shows the ResignWindow component.
  // User makes their re-sign decisions for expiring human-team players,
  // then clicks "Continue to Offseason" which calls closeResignWindowAndBeginOffseason.
  gameState.season.status = 'resign-window';
  return;
}

/**
 * Phase 7d: close the re-sign window and run the rest of the offseason
 * (retirements, backfill, rookie generation, offseason AI signings).
 *
 * Called when the user clicks "Continue to Offseason" from the
 * ResignWindow UI. Validates the status before running so accidental
 * double-calls don't damage state.
 *
 * The first thing this does is FORCE non-resigned players (yearsRemaining=0)
 * off rosters and into FA pools. They become UFA at this moment. AI
 * re-signings already ran in step 2.6, so any AI player still at 0 is
 * one the AI explicitly chose not to extend — that's fine.
 *
 * For human teams: any expiring player the user didn't extend during
 * the window also walks here.
 */
export function closeResignWindowAndBeginOffseason(gameState) {
  if (gameState.season?.status !== 'resign-window') return;

  // Pull the offseasonSummary reference stashed during openResignWindow
  // (which is the upper half of beginNewSeason). All subsequent stat
  // accumulation (retiree count, AI signings count) lands in the same
  // archive entry's summary.
  const offseasonSummary = gameState.season._offseasonSummaryRef;
  if (!offseasonSummary) {
    // Defensive: if somehow the ref is missing, create a stub. The
    // archive entry won't get the per-pass counts but at least we
    // don't crash. Shouldn't happen in normal flow.
    console.warn('[closeResignWindow] missing _offseasonSummaryRef; counts will be lost');
  }
  const summary = offseasonSummary || { retiredCount: 0, rookiesGenerated: 0, aiSigningsCount: 0, retirees: [], biggestGainers: [], biggestLosers: [], developedCount: 0 };

  // Force walk-aways: any player still on a roster with yearsRemaining=0
  // didn't get re-signed (either user passed or AI archetype declined).
  // They become UFA now: contract cleared, moved to FA pool.
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      const continuing = [];
      const walking = [];
      for (const player of team.roster) {
        if (player.contract && (player.contract.yearsRemaining ?? 1) <= 0) {
          player.contract = null;
          walking.push(player);
        } else {
          continuing.push(player);
        }
      }
      team.roster = continuing;
      for (const p of walking) region.freeAgents.push(p);
      if (walking.length > 0) team.validateStrategy();
    }
  }

  // From here on out, the rest of the original beginNewSeason runs.
  // Inline-call into a private helper that does steps 3-7. Keeping it
  // separate makes the split readable.
  runOffseasonPhases3through7(gameState, summary);

  // Clean up the back-reference now that we're done with it
  delete gameState.season._offseasonSummaryRef;
}

/**
 * Steps 3-7 of the offseason: aging+retirement, AI backfill, rookie gen,
 * stat reset, AI offseason signings. Extracted from beginNewSeason so
 * Phase 7d can run them after the resign window closes.
 *
 * Mutates gameState in place. The summary parameter is the live
 * offseasonSummary on the archive entry — counts get incremented here.
 */
function runOffseasonPhases3through7(gameState, offseasonSummary) {
  // After beginNewSeason ran, gameState.seasonNumber was already
  // incremented to the new year (e.g. 2026). The "completedYear"
  // (e.g. 2025) is what gets stamped on retiree records and matches
  // the archive entry's year. Recover it here.
  const completedYear = (gameState.seasonNumber || 2026) - 1;

  // ── 3 + 4. Age everyone, then retire by age curve ──
  // Process per region. Rosters and free agent pools are handled together:
  //   - Increment age on every player
  //   - Roll retirement on every player
  //   - Rostered retirees are removed from their team (and strategy cleaned up)
  //   - FA retirees are just spliced out of the pool
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];

    // Roster aging + retirement
    for (const team of region.teams) {
      const survivors = [];
      for (const player of team.roster) {
        player.age += 1;
        if (shouldRetire(player)) {
          offseasonSummary.retiredCount++;
          // Phase 6g: snapshot retiree for Hall of Fame. Light shape —
          // tag/name/age/overall/team/region/nationality is plenty for
          // a roster-row-style display. We don't archive full stats or
          // ratings to keep the save size bounded across many seasons.
          offseasonSummary.retirees.push({
            tag: player.tag,
            name: player.name,
            age: player.age, // post-aging age (the age they retired AT)
            overall: player.overall,
            nationality: player.nationality,
            teamAbbr: team.abbr,
            teamName: team.name,
            teamColor: team.color,
            regionKey,
            year: completedYear,
            wasFA: false,
          });
        } else {
          survivors.push(player);
        }
      }
      team.roster = survivors;
      team.validateStrategy();
    }

    // Free agent aging + retirement
    const faSurvivors = [];
    for (const player of region.freeAgents) {
      player.age += 1;
      if (shouldRetire(player)) {
        offseasonSummary.retiredCount++;
        offseasonSummary.retirees.push({
          tag: player.tag,
          name: player.name,
          age: player.age,
          overall: player.overall,
          nationality: player.nationality,
          teamAbbr: null,
          teamName: null,
          teamColor: null,
          regionKey,
          year: completedYear,
          wasFA: true,
        });
      } else {
        faSurvivors.push(player);
      }
    }
    region.freeAgents = faSurvivors;
  }

  // ── 5. AI team backfill ──
  // Any non-human team below ROSTER_MIN auto-signs free agents until it
  // hits the minimum. Phase 7c: cap-aware. Tries to sign the best-OVR FA
  // that fits under the cap; if no FA fits (team is heavily over cap from
  // buyouts), falls back to the cheapest FA — better to be technically
  // over cap than to start a season with <5 players, which would brick
  // the schedule. The next offseason will give the team a chance to
  // re-balance.
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      if (team.isHuman) continue;
      while (team.roster.length < ROSTER_MIN && region.freeAgents.length > 0) {
        const currentSalary = computeTeamSalary(team);
        const headroom = SALARY_CAP - currentSalary;

        // Look for the best-OVR FA whose base salary fits headroom.
        let bestIdx = -1;
        let bestOvr = -1;
        for (let i = 0; i < region.freeAgents.length; i++) {
          const fa = region.freeAgents[i];
          const cost = calculateBaseSalary(fa.overall);
          if (cost <= headroom && fa.overall > bestOvr) {
            bestIdx = i;
            bestOvr = fa.overall;
          }
        }

        // Fallback: nothing fits → take the cheapest available so the
        // roster gets up to ROSTER_MIN. Team will start over cap; future
        // offseasons can fix it as contracts decay.
        if (bestIdx === -1) {
          let cheapestIdx = 0;
          let cheapestCost = Infinity;
          for (let i = 0; i < region.freeAgents.length; i++) {
            const cost = calculateBaseSalary(region.freeAgents[i].overall);
            if (cost < cheapestCost) {
              cheapestCost = cost;
              cheapestIdx = i;
            }
          }
          bestIdx = cheapestIdx;
        }

        const signed = region.freeAgents.splice(bestIdx, 1)[0];
        // Assign a contract at base salary, random 1-3yr length.
        const newLength = Math.random() < 0.3 ? 1 : Math.random() < 0.7 ? 2 : 3;
        signed.contract = {
          salary: calculateBaseSalary(signed.overall),
          yearsRemaining: newLength,
          signedYear: gameState.seasonNumber || 2025,
        };
        team.roster.push(signed);
        offseasonSummary.aiSigningsCount++;
      }
      team.validateStrategy();
    }
  }

  // ── 6. Rookie generation ──
  // Refill each region's FA pool back to FREE_AGENT_POOL_SIZE with fresh
  // rookies. Rookies use the standard rating floor so their overalls
  // follow the normal bimodal curve — most are average, a few are bad,
  // and a small percentage are generational talent (80+ overall at age 17).
  //
  // Rookies don't get a lastOffseasonDelta — they have no previous state.
  // The UI checks for the field's presence to decide whether to show a
  // delta indicator or a "NEW" badge.
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    const needed = FREE_AGENT_POOL_SIZE - region.freeAgents.length;
    for (let i = 0; i < needed; i++) {
      region.freeAgents.push(generatePlayer({
        regionKey,
        ageOverride: randRookieAge(),
      }));
      offseasonSummary.rookiesGenerated++;
    }
  }

  // ── 7. Reset records, clear transient state, reassign groups, regen schedule ──
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];

    region.bracket = null;
    region.frozenStandings = null;
    region.results = [];
    region.currentWeek = 0;
    region.phase = 'group';

    for (const team of region.teams) {
      team.record.wins = 0;
      team.record.losses = 0;
      team.record.mapWins = 0;
      team.record.mapLosses = 0;
      team.record.roundWins = 0;
      team.record.roundLosses = 0;
      team.group = null;

      // Phase 6f: reset the mid-season move counter at the season boundary.
      // The cap is "2 signings TOTAL across both mid-season FA windows in
      // the current season" — so it resets here just like _offseasonMoves
      // is reset in offseason.js's runOffseasonAISignings.
      team._midseasonMoves = 0;

      for (const player of team.roster) {
        if (player.stats) {
          player.stats.kills = 0;
          player.stats.deaths = 0;
          player.stats.assists = 0;
          player.stats.acs = 0;
          player.stats.maps = 0;
        }
        // Phase 6h: clear per-stage snapshots — they belonged to the
        // season we just archived. Phase 6h-B will archive the
        // aggregated season totals to the archive entry for History.
        player.stageStats = {};
      }
    }

    // Random shuffle into A/B groups + regenerate schedule
    const shuffled = [...region.teams].sort(() => Math.random() - 0.5);
    shuffled.forEach((team, i) => {
      team.group = i < GROUP_SIZE ? 'A' : 'B';
    });
    region.schedule = generateSchedule(region.teams);
  }

  // Clear any active tournament state (defensive — should already be null)
  gameState.international = null;
  gameState.worlds = null;

  // Fresh season object. initSeason preserves seasonNumber and archive
  // (already at the top level) and re-zeroes points/history.
  gameState.season = initSeason(gameState);

  // Phase 6e: land in the dedicated Offseason view, not straight into
  // preseason. User clicks "Start Preseason" from that view (which flips
  // status back to 'active') when they've finished roster moves.
  gameState.season.status = 'offseason-active';

  // Phase 6e: AI archetype-driven signings. Runs AFTER the season swap
  // so the log lands on the new season object. AI teams roll for signings
  // on the freshly-populated FA pool (includes rookies from step 6).
  // The user's subsequent releases can trigger additional reactive AI
  // moves via runReactiveAISignings() called from App.jsx.
  runOffseasonAISignings(gameState);
}


