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
    // (legacy 'complete' status no longer used; replaced by 'season-complete')
    status: 'active',
    points,
    history: [],
    currentStageGroupWins,
    // Log of AI team moves during the most recent offseason. Populated by
    // runOffseasonAISignings() and runReactiveAISignings() in offseason.js.
    // Displayed on the Offseason view. Cleared on new season init.
    aiOffseasonLog: [],
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
    // Full state refs for History tab rendering. Same rationale as stage
    // and international: gameState.worlds gets nulled out below but the
    // underlying bracket/playoffSelection objects aren't mutated, so
    // these refs stay valid indefinitely.
    bracket: worlds.bracket,
    playoffSelection: worlds.playoffSelection,
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
      // End of circuit → season is complete. User can browse freely until
      // they click "Start New Season" which calls beginNewSeason() below.
      s.status = 'season-complete';
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

/**
 * Begin a new season. Called from the dashboard/sidebar "Start New Season"
 * button when status === 'season-complete'.
 *
 * Phase 6d offseason sequence:
 *   1. Archive the completed season (history + champion)
 *   2. Rating development — per-player age curve + performance modifier
 *      (reads player.stats BEFORE they get reset in step 6)
 *   3. Age all players +1 (rosters + free agents)
 *   4. Retirement pass — exponential curve age 25–29, hard cutoff at 30
 *   5. AI team backfill — auto-sign best FAs to reach ROSTER_MIN (skips human team)
 *   6. Rookie generation — refill each region's FA pool to FREE_AGENT_POOL_SIZE
 *   7. Reset records, clear state, reassign groups, regen schedules
 *
 * Human teams are NOT auto-filled — if the user's team is below 5 after
 * retirements, they'll see the gap on the dashboard and the Advance button
 * will be blocked until they manually sign players. This preserves user
 * agency over roster decisions.
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
  };

  gameState.archive.push({
    year: completedYear,
    history: completedHistory,
    worldChampion: lastWorlds?.champion || null,
    runnerUp: lastWorlds?.runnerUp || null,
    offseasonSummary,
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

  // ── 3 + 4. Age everyone, then retire by age curve ──
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
      } else {
        faSurvivors.push(player);
      }
    }
    region.freeAgents = faSurvivors;
  }

  // ── 5. AI team backfill ──
  // Any non-human team below ROSTER_MIN auto-signs the best available
  // free agents until it hits the minimum. Human teams are left short so
  // the user can make deliberate preseason FA moves. If the user's team
  // is under 5 when they try to advance, the Advance button will be
  // blocked in the UI layer until they sign manually.
  for (const regionKey of REGION_KEYS) {
    const region = gameState.regions[regionKey];
    for (const team of region.teams) {
      if (team.isHuman) continue;
      while (team.roster.length < ROSTER_MIN && region.freeAgents.length > 0) {
        // Pick the best-overall FA. Sorted fresh each iteration since the
        // pool shrinks as we sign.
        const bestIdx = region.freeAgents.reduce(
          (bi, p, i, arr) => (p.overall > arr[bi].overall ? i : bi),
          0
        );
        const signed = region.freeAgents.splice(bestIdx, 1)[0];
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


