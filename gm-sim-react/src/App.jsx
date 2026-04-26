/**
 * App.jsx — Multi-region. Sidebar "Advance Week" handles everything:
 *   - Group stage: advances all regions' weeks
 *   - Bracket stage: advances all regions' brackets one stage
 */

import { useState, useEffect, useCallback } from 'react';

// Flag-icons provides offline SVG country flags via CSS sprites.
// Imported once here so every component can use <span className="fi fi-xx" />
// without each one needing its own stylesheet import.
import 'flag-icons/css/flag-icons.min.css';

import { initGame, getHumanTeam } from './engine/league.js';
import { saveGameState, loadGameState, clearSave, hasSave } from './engine/persistence.js';
import { generatePlayer } from './classes/Player.js';
import { simulateSeries } from './classes/Match.js';
import { runCpuMoves } from './engine/ai.js';
import { runReactiveAISignings } from './engine/offseason.js';
import {
  runMidseasonReactiveSignings,
  midseasonMovesRemaining,
  MAX_MIDSEASON_MOVES_PER_SEASON,
} from './engine/midseason.js';
import {
  ensureActiveSeries,
  hasActiveSeries,
  seedActiveSeries,
  advanceOneMap,
  drainCompleted,
} from './engine/activeSeries.js';
import { isSeriesComplete, seriesToResult, finishSeries } from './classes/Match.js';
import {
  generateBracket,
  advanceBracketStage as runBracketStage,
  getStageName,
  getStageMatches,
  routeBracketStage,
} from './engine/bracket.js';
import {
  initSeason,
  getCurrentStageName,
  getCurrentSlot,
  isStageSlotComplete,
  completeCurrentStage,
  isInternationalSlotComplete,
  completeCurrentInternational,
  isWorldsSlotComplete,
  completeCurrentWorlds,
  beginNextSlot,
  beginNewSeason,
  awardGroupStageWin,
} from './engine/season.js';
import {
  advanceInternational,
  isInternationalComplete,
  isAwaitingHumanPick,
  submitHumanPick,
} from './engine/international.js';
import { getRoundMatches as getSwissRoundMatches, routeSwissRound } from './engine/swiss.js';
import {
  getStageMatches as getIntlStageMatches,
  routeBracketStage as routeIntlBracketStage,
  isInternationalBracketComplete,
} from './engine/bracketInternational.js';
import {
  getStageMatches as getWorldsStageMatches,
  routeBracketStage as routeWorldsBracketStage,
  isWorldsBracketComplete,
} from './engine/bracketWorlds.js';
import {
  advanceWorlds,
  isWorldsComplete,
  isWorldsAwaitingHumanPick,
  submitWorldsPlayoffPick,
} from './engine/worlds.js';
import { REGION_KEYS } from './data/regions.js';

import TeamSelect from './components/TeamSelect.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Schedule from './components/Schedule.jsx';
import Roster from './components/Roster.jsx';
import FreeAgents from './components/FreeAgents.jsx';
import Standings from './components/Standings.jsx';
import Bracket from './components/Bracket.jsx';
import Stats from './components/Stats.jsx';
import Points from './components/Points.jsx';
import International from './components/International.jsx';
import Worlds from './components/Worlds.jsx';
import History from './components/History.jsx';
import Offseason from './components/Offseason.jsx';
import Toast from './components/Toast.jsx';
import StageTransition from './components/StageTransition.jsx';

function processSeriesResult(result) {
  const { winner, loser, maps, score } = result;
  winner.record.wins++;
  loser.record.losses++;
  const wm = Math.max(score[0], score[1]);
  const lm = Math.min(score[0], score[1]);
  winner.record.mapWins += wm;
  winner.record.mapLosses += lm;
  loser.record.mapWins += lm;
  loser.record.mapLosses += wm;
  for (const map of maps) {
    const teamAIsWinner = result.teamA === winner;
    if (teamAIsWinner) {
      winner.record.roundWins += map.roundsA;
      winner.record.roundLosses += map.roundsB;
      loser.record.roundWins += map.roundsB;
      loser.record.roundLosses += map.roundsA;
    } else {
      winner.record.roundWins += map.roundsB;
      winner.record.roundLosses += map.roundsA;
      loser.record.roundWins += map.roundsA;
      loser.record.roundLosses += map.roundsB;
    }
  }
}

function freezeStandings(teams) {
  const frozen = {};
  for (const group of ['A', 'B']) {
    const sorted = teams
      .filter(t => t.group === group)
      .sort((a, b) => {
        if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
        const mdB = b.record.mapWins - b.record.mapLosses;
        const mdA = a.record.mapWins - a.record.mapLosses;
        if (mdB !== mdA) return mdB - mdA;
        const rdB = (b.record.roundWins || 0) - (b.record.roundLosses || 0);
        const rdA = (a.record.roundWins || 0) - (a.record.roundLosses || 0);
        if (rdB !== rdA) return rdB - rdA;
        return b.overallRating - a.overallRating;
      });
    frozen[group] = sorted.map(t => ({
      abbr: t.abbr, name: t.name, color: t.color,
      isHuman: t.isHuman, overallRating: t.overallRating,
      record: { ...t.record },
    }));
  }
  return frozen;
}

export default function App() {
  // Hydrate from save if one exists. If no save, we start on TeamSelect.
  // Lazy initializer ensures loadGameState only runs once on mount.
  const [gameState, setGameState] = useState(() => loadGameState());
  const [started, setStarted] = useState(() => gameState !== null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [, forceRender] = useState(0);
  const [viewRegion, setViewRegion] = useState(() =>
    gameState ? gameState.humanRegion : null
  );

  const clearToast = useCallback(() => setToast(null), []);

  // Auto-save whenever the gameState reference changes. Every advance,
  // transition, roster edit, etc. produces a new reference via setGameState,
  // so this fires on every meaningful mutation. localStorage writes are
  // fast enough that we don't bother debouncing.
  useEffect(() => {
    if (gameState) saveGameState(gameState);
  }, [gameState]);

  function handleTeamSelect(regionKey, teamIndex) {
    const gs = initGame(regionKey, teamIndex);
    gs.season = initSeason(gs);
    setGameState(gs);
    setViewRegion(regionKey);
    setStarted(true);
  }

  // Called from the "Delete Save" button in the sidebar. Wipes the
  // localStorage save and returns the app to the TeamSelect screen so
  // the user can start a fresh game.
  function handleDeleteSave() {
    clearSave();
    setGameState(null);
    setStarted(false);
    setViewRegion(null);
    setCurrentView('dashboard');
  }

  // ── God Mode ──
  // Power-user toggle for editing any player's stats across the league.
  // Scope: every player, every team, every FA pool. Persists to localStorage
  // via the normal gameState save loop, so it survives refresh but requires
  // a deliberate toggle to turn off.
  //
  // Not meant for normal play — for testing match-sim calculations, debugging
  // edge cases, and QoL edits. When ON, a purple "GOD MODE" badge shows in
  // the sidebar and rating/age/name cells become editable inputs.
  function handleToggleGodMode() {
    const nextValue = !gameState.godMode;
    if (nextValue) {
      // Warn on first activation so nobody accidentally flips it mid-playthrough
      const ok = typeof window !== 'undefined' && window.confirm(
        'Enable God Mode?\n\n' +
        'You\'ll be able to edit any player\'s ratings, age, name, and tag from the Roster, Free Agents, and Standings views. ' +
        'This is intended for testing and QoL edits, not normal gameplay.\n\n' +
        'You can turn it off again anytime from the sidebar.'
      );
      if (!ok) return;
    }
    gameState.godMode = nextValue;
    setGameState(prev => ({ ...prev }));
  }

  // Single entry point for all player edits from the UI. Mutates the
  // player in-place, recomputes overall from ratings, triggers re-render.
  //
  // field: 'name' | 'tag' | 'age' | 'aim' | 'positioning' | 'utility' | 'gamesense' | 'clutch'
  // value: string or number (caller ensures correct type)
  function handleEditPlayer(player, field, value) {
    if (!gameState.godMode) return; // defensive guard

    if (field === 'name' || field === 'tag') {
      player[field] = String(value);
    } else if (field === 'nationality') {
      // Validate against the known nationality map so bad codes don't
      // break the flag rendering. If invalid, silently drop the edit.
      const code = String(value).toUpperCase();
      // Lazy import avoided — we already have the map via the dropdown's
      // generated options, so we just accept any non-empty string and
      // rely on the UI to only offer valid codes. The flag helpers fall
      // back to a placeholder emoji for unknown codes anyway.
      if (code) player.nationality = code;
    } else if (field === 'age') {
      const n = Math.max(16, Math.min(40, parseInt(value, 10) || player.age));
      player.age = n;
    } else if (['aim', 'positioning', 'utility', 'gamesense', 'clutch'].includes(field)) {
      const n = Math.max(1, Math.min(99, parseInt(value, 10) || 0));
      player.ratings[field] = n;
      player.overall = player.calcOverall();
    } else {
      return; // unknown field, ignore
    }
    setGameState(prev => ({ ...prev }));
  }

  if (!started || !gameState) {
    return <TeamSelect onSelect={handleTeamSelect} />;
  }

  const humanTeam = getHumanTeam(gameState);
  const humanRegionData = gameState.regions[gameState.humanRegion];
  const vr = viewRegion || gameState.humanRegion;

  const seasonStatus = gameState.season?.status || 'active';
  const inTransition = seasonStatus === 'transition';
  // circuitComplete is true when the season has ended and the user is
  // browsing the season-complete state. Kept the old name to minimize
  // ripple — semantics are now "season is over, awaiting new-season click"
  // rather than "game is over forever".
  const circuitComplete = seasonStatus === 'season-complete';
  // Phase 6e: the offseason view is active. User is reviewing retirees,
  // managing roster, and will click "Start Preseason" when ready.
  const offseasonActive = seasonStatus === 'offseason-active';
  // Phase 6f: a mid-season FA window is open. User can sign/release within
  // a 2-signing season cap, then clicks "Start Stage" to flip to active.
  const midseasonActive = seasonStatus === 'mid-season-fa';

  // Determine overall phase: if human region is in bracket, we're in bracket mode
  const isGroupPhase = humanRegionData.phase === 'group';
  // Stage slot is "done" when every region has finished its bracket.
  const allBracketsDone = isStageSlotComplete(gameState) || circuitComplete;

  function getMapScoreStrings(result) {
    if (!result?.maps) return [];
    return result.maps.map(m =>
      `${Math.max(m.roundsA, m.roundsB)}-${Math.min(m.roundsA, m.roundsB)}`
    );
  }

  function showMatchToast(result, team) {
    const won = result.winner === team;
    const opponent = result.teamA === team ? result.teamB : result.teamA;
    const score = result.score;
    setToast({
      message: won
        ? `W ${Math.max(...score)}-${Math.min(...score)} vs ${opponent.name}`
        : `L ${Math.min(...score)}-${Math.max(...score)} vs ${opponent.name}`,
      type: won ? 'win' : 'loss',
      mapScores: getMapScoreStrings(result),
    });
  }

  // ── Main advance function — handles both group + bracket ──
  function advanceAll() {
    // Block advancement while the transition screen is up or circuit is done.
    // Phase 6e: also block during offseason-active — user must click
    // "Start Preseason" from the Offseason view to progress.
    if (inTransition || circuitComplete || offseasonActive || midseasonActive) return;

    // During international selection show, block advance while waiting for human
    if (isAwaitingHumanPick(gameState)) return;
    // During worlds group selection show, same deal
    if (isWorldsAwaitingHumanPick(gameState)) return;

    const currentSlot = getCurrentSlot(gameState);
    if (currentSlot?.type === 'international') {
      advanceInternationalPhase();
      return;
    }
    if (currentSlot?.type === 'worlds') {
      advanceWorldsPhase();
      return;
    }

    // Check if any region still has group stage games
    const anyInGroup = REGION_KEYS.some(k => gameState.regions[k].phase === 'group');

    if (anyInGroup) {
      advanceGroupWeek();
    } else {
      advanceBracketAll();
    }
  }

  // ── Advance the currently active international tournament ──
  function advanceInternationalPhase() {
    const intl = gameState.international;
    if (!intl || intl.phase === 'complete') {
      // Defensive — shouldn't be called in this state
      setGameState(prev => ({ ...prev }));
      return;
    }

    // Selection phase isn't series-based — defer to the existing engine
    // function, which atomically reveals one pick (or no-ops if waiting
    // on the human).
    if (intl.phase === 'selection') {
      advanceInternational(gameState);
      if (isInternationalComplete(gameState)) {
        completeCurrentInternational(gameState);
      }
      setGameState(prev => ({ ...prev }));
      return;
    }

    ensureActiveSeries(gameState);

    // ── Swiss phase per-map ──
    if (intl.phase === 'swiss') {
      // Seed if no active intl-swiss series exist
      if (!hasActiveSeries(gameState, 'international-swiss')) {
        const matches = getSwissRoundMatches(intl.swiss);
        const seeded = matches.map((entry, i) => ({
          seriesId: `intl:swiss:r${intl.swiss.round}:${i}`,
          phase: 'international-swiss',
          intlRoundRef: { round: intl.swiss.round, idx: i },
          intlMatchRef: entry.match, matchRef: entry.match,
          teamA: entry.match.teamA,
          teamB: entry.match.teamB,
          bestOf: entry.bestOf,
        }));
        if (seeded.length > 0) seedActiveSeries(gameState, seeded);
      }

      // Play one map
      const { completed } = advanceOneMap(gameState);

      // Drain completions: copy results into the swiss match objects.
      // Don't call updateSwissRecord here — routeSwissRound handles that
      // (it walks all matches with results and processes ones not yet
      // marked _swissProcessed, idempotent).
      let toastResult = null;
      for (const entry of completed) {
        if (entry.phase !== 'international-swiss') continue;
        const result = seriesToResult(entry.series);
        entry.intlMatchRef.result = result;
        // Toast for human team
        if (entry.teamA === humanTeam || entry.teamB === humanTeam) {
          toastResult = result;
        }
      }

      // If all current-round matches are resolved, route to the next round.
      // Use the same predicate as getRoundMatches: any match that needs
      // playing AND doesn't have a result yet. If empty → round done.
      const stillToPlay = getSwissRoundMatches(intl.swiss);
      if (stillToPlay.length === 0) {
        intl.swiss = routeSwissRound(intl.swiss);
        if (intl.swiss.status === 'complete') {
          // Let the existing engine transition swiss → selection
          advanceInternational(gameState);
        }
      }

      if (toastResult) showMatchToast(toastResult, humanTeam);
      setGameState(prev => ({ ...prev }));
      return;
    }

    // ── Bracket phase per-map ──
    if (intl.phase === 'bracket') {
      if (!hasActiveSeries(gameState, 'international-bracket')) {
        const matches = getIntlStageMatches(intl.bracket);
        const seeded = matches
          .filter(({ match }) => !match.result && match.teamA && match.teamB)
          .map((entry, i) => ({
            seriesId: `intl:bracket:s${intl.bracket.stage}:${i}`,
            phase: 'international-bracket',
            intlBracketStage: intl.bracket.stage,
            intlMatchRef: entry.match, matchRef: entry.match,
            teamA: entry.match.teamA,
            teamB: entry.match.teamB,
            bestOf: entry.bestOf,
          }));
        if (seeded.length > 0) seedActiveSeries(gameState, seeded);
      }

      const { completed } = advanceOneMap(gameState);

      let toastResult = null;
      for (const entry of completed) {
        if (entry.phase !== 'international-bracket') continue;
        const result = seriesToResult(entry.series);
        entry.intlMatchRef.result = result;
        processSeriesResult(result);
        if (entry.teamA === humanTeam || entry.teamB === humanTeam) {
          toastResult = result;
        }
      }

      // All current stage matches resolved? Route to next stage.
      const stageMatches = getIntlStageMatches(intl.bracket);
      const allDone = stageMatches.length > 0 && stageMatches.every(({ match }) => match.result);
      if (allDone) {
        intl.bracket = routeIntlBracketStage(intl.bracket);
        if (isInternationalBracketComplete(intl.bracket)) {
          intl.phase = 'complete';
        }
      }

      if (toastResult) showMatchToast(toastResult, humanTeam);
      if (isInternationalComplete(gameState)) {
        completeCurrentInternational(gameState);
      }
      setGameState(prev => ({ ...prev }));
      return;
    }

    // Unknown phase — defensive
    setGameState(prev => ({ ...prev }));
  }

  // ── Advance Worlds ──
  // Per-map version mirroring advanceInternationalPhase. Phases:
  //   - groupSelection: passthrough (atomic — reveals next pick or waits)
  //   - groups: 4 parallel Swiss tournaments, per-map across all groups' current rounds
  //   - playoffSelection: passthrough (atomic — reveals next pick or waits)
  //   - bracket: per-map across the current bracket stage (with first-time
  //     records-reset handled inline)
  function advanceWorldsPhase() {
    const w = gameState.worlds;
    if (!w || w.phase === 'complete') {
      setGameState(prev => ({ ...prev }));
      return;
    }

    // Selection phases — defer to existing engine. Each call either reveals
    // one pick or no-ops (waiting on human).
    if (w.phase === 'groupSelection' || w.phase === 'playoffSelection') {
      advanceWorlds(gameState);
      if (isWorldsComplete(gameState)) {
        completeCurrentWorlds(gameState);
      }
      setGameState(prev => ({ ...prev }));
      return;
    }

    ensureActiveSeries(gameState);

    // ── Groups phase per-map ──
    if (w.phase === 'groups') {
      const WORLDS_GROUP_KEYS = ['A', 'B', 'C', 'D'];

      if (!hasActiveSeries(gameState, 'worlds-groups')) {
        const seeded = [];
        for (const gk of WORLDS_GROUP_KEYS) {
          const swiss = w.groups[gk];
          if (!swiss || swiss.status === 'complete') continue;
          const matches = getSwissRoundMatches(swiss);
          for (let i = 0; i < matches.length; i++) {
            const entry = matches[i];
            seeded.push({
              seriesId: `worlds:groups:${gk}:r${swiss.round}:${i}`,
              phase: 'worlds-groups',
              worldsGroupKey: gk,
              intlMatchRef: entry.match,
              matchRef: entry.match,
              teamA: entry.match.teamA,
              teamB: entry.match.teamB,
              bestOf: entry.bestOf,
            });
          }
        }
        if (seeded.length > 0) seedActiveSeries(gameState, seeded);
      }

      const { completed } = advanceOneMap(gameState);

      let toastResult = null;
      for (const entry of completed) {
        if (entry.phase !== 'worlds-groups') continue;
        const result = seriesToResult(entry.series);
        entry.intlMatchRef.result = result;
        if (entry.teamA === humanTeam || entry.teamB === humanTeam) {
          toastResult = result;
        }
      }

      // For each group whose round has fully resolved, route Swiss forward.
      // (routeSwissRound is idempotent, but only call when there are no
      // active series for that group so we don't mid-round-trigger.)
      for (const gk of WORLDS_GROUP_KEYS) {
        const swiss = w.groups[gk];
        if (!swiss || swiss.status === 'complete') continue;
        const stillActive = (gameState.season.activeSeries || [])
          .some(a => a.phase === 'worlds-groups' && a.worldsGroupKey === gk);
        if (stillActive) continue;
        const stillToPlay = getSwissRoundMatches(swiss);
        if (stillToPlay.length > 0) continue;
        // This group's round is complete — route to next round
        w.groups[gk] = routeSwissRound(swiss);
      }

      // If all groups done, defer to existing engine for the groups → playoff selection transition
      const allGroupsDone = WORLDS_GROUP_KEYS.every(gk => w.groups[gk]?.status === 'complete');
      if (allGroupsDone && w.phase === 'groups') {
        advanceWorlds(gameState);
      }

      if (toastResult) showMatchToast(toastResult, humanTeam);
      setGameState(prev => ({ ...prev }));
      return;
    }

    // ── Bracket phase per-map ──
    if (w.phase === 'bracket') {
      // First-time records reset — inlined from the engine so we don't
      // need to defer to the batch advance just to get this side effect.
      if (!w._bracketRecordsReset) {
        const bracketTeams = new Set();
        for (const gk of ['A', 'B', 'C', 'D']) {
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

      if (!hasActiveSeries(gameState, 'worlds-bracket')) {
        const matches = getWorldsStageMatches(w.bracket);
        const seeded = matches
          .filter(({ match }) => !match.result && match.teamA && match.teamB)
          .map((entry, i) => ({
            seriesId: `worlds:bracket:s${w.bracket.stage}:${i}`,
            phase: 'worlds-bracket',
            worldsBracketStage: w.bracket.stage,
            intlMatchRef: entry.match,
            matchRef: entry.match,
            teamA: entry.match.teamA,
            teamB: entry.match.teamB,
            bestOf: entry.bestOf,
          }));
        if (seeded.length > 0) seedActiveSeries(gameState, seeded);
      }

      const { completed } = advanceOneMap(gameState);

      let toastResult = null;
      for (const entry of completed) {
        if (entry.phase !== 'worlds-bracket') continue;
        const result = seriesToResult(entry.series);
        entry.intlMatchRef.result = result;
        processSeriesResult(result);
        if (entry.teamA === humanTeam || entry.teamB === humanTeam) {
          toastResult = result;
        }
      }

      // All current-stage matches done? Route to next stage.
      const stageMatches = getWorldsStageMatches(w.bracket);
      const allDone = stageMatches.length > 0 && stageMatches.every(({ match }) => match.result);
      if (allDone) {
        w.bracket = routeWorldsBracketStage(w.bracket);
        if (isWorldsBracketComplete(w.bracket)) {
          w.phase = 'complete';
        }
      }

      if (toastResult) showMatchToast(toastResult, humanTeam);
      if (isWorldsComplete(gameState)) {
        completeCurrentWorlds(gameState);
      }
      setGameState(prev => ({ ...prev }));
      return;
    }

    // Unknown phase
    setGameState(prev => ({ ...prev }));
  }

  // ── Called from the International component during a human pick turn ──
  function handleHumanSelectionPick(pickedTeam) {
    submitHumanPick(gameState, pickedTeam);
    setGameState(prev => ({ ...prev }));
  }

  // ── Called from the Worlds component when the human submits a playoff pick ──
  function handleWorldsPlayoffPick(pickedTeam) {
    const ok = submitWorldsPlayoffPick(gameState, pickedTeam);
    if (ok) setGameState(prev => ({ ...prev }));
  }

  // ── Called from the StageTransition "Continue" button ──
  function handleTransitionContinue() {
    // Phase 6e+ hardening: defend against beginNextSlot throwing partway
    // through. Without this, an exception inside slot init left the
    // overlay onscreen forever (status stuck on 'transition'). beginNextSlot
    // now itself catches inner throws and always flips status, but belt-
    // and-suspenders.
    try {
      beginNextSlot(gameState);
    } catch (e) {
      console.error('[handleTransitionContinue] beginNextSlot threw:', e);
      // Force-flip out of transition so the overlay closes. User lands on
      // dashboard and we surface the error in console for debugging.
      if (gameState.season) gameState.season.status = 'active';
    }
    const nextSlot = getCurrentSlot(gameState);
    if (nextSlot?.type === 'international') {
      setCurrentView('international');
    } else if (nextSlot?.type === 'worlds') {
      setCurrentView('worlds');
    } else {
      setCurrentView('dashboard');
    }
    setGameState(prev => ({ ...prev }));
  }

  // ── Called from the dashboard / sidebar "Start New Season" button ──
  // Phase 6c: stub. Resets records, keeps rosters intact, increments
  // gameState.seasonNumber. Phase 6d will hook in offseason logic
  // (aging, retirements, rookies, archive push) before the reset.
  function handleStartNewSeason() {
    beginNewSeason(gameState);
    setCurrentView('dashboard');
    setGameState(prev => ({ ...prev }));
  }

  // ── Called from the Offseason view "Start Preseason" button ──
  // Phase 6e: flips status from 'offseason-active' to 'active' so the
  // normal dashboard/advance flow takes over. User's roster must be ≥5
  // (the button is disabled in the Offseason view otherwise), so this
  // handler assumes a valid roster and doesn't re-check.
  function handleStartPreseason() {
    if (gameState.season?.status !== 'offseason-active') return;
    if (humanTeam.roster.length < 5) return; // defensive
    gameState.season.status = 'active';
    setCurrentView('dashboard');
    setGameState(prev => ({ ...prev }));
  }

  // Phase 6f: closes the mid-season FA window. Mirror of handleStartPreseason.
  // Only valid in 'mid-season-fa' status. Requires roster ≥ 5 (same guard as
  // start-preseason). Flips status back to 'active' so advance works again.
  function handleStartStage() {
    if (gameState.season?.status !== 'mid-season-fa') return;
    if (humanTeam.roster.length < 5) return; // defensive
    gameState.season.status = 'active';
    setCurrentView('dashboard');
    setGameState(prev => ({ ...prev }));
  }

  // ── Fast-forward handlers (Phase 6e+ Ask 3) ──
  // Sim Series — finishes the current round (group week / bracket stage /
  // intl Swiss round / intl bracket stage / worlds groups round / worlds
  // bracket stage) to completion.
  //
  // The trick: every per-map advance handler seeds a fresh batch of
  // active series whenever the list is empty AND there's still work in
  // the round. So we can detect "round finished" by the transition from
  // non-empty → empty active series. As long as the next click would
  // SEED new series (i.e., there's another round to start), we'd pump
  // forever — but that's where activeSeries.length === 0 right after a
  // call combined with a watchdog ensures we exit.
  //
  // Algorithm: loop calling advance handler. After each call, if
  // activeSeries is empty AND was empty before the call AND no observable
  // state changed (week/stage/swiss-round/etc.), we've hit a no-op — break.
  // Otherwise if activeSeries became empty, we just resolved the current
  // round → break to stop before seeding the next one.
  function handleSimSeries() {
    if (inTransition || circuitComplete || offseasonActive || midseasonActive) return;
    if (isAwaitingHumanPick(gameState) || isWorldsAwaitingHumanPick(gameState)) return;

    // Snapshot used to detect "did anything change?" between iterations.
    // If two consecutive calls produce the same snapshot AND activeSeries
    // is empty both times, we're stuck and need to bail.
    function snapshot() {
      const w = gameState.worlds;
      const intl = gameState.international;
      return [
        gameState.season?.status,
        gameState.season?.activeSeries?.length || 0,
        ...REGION_KEYS.map(k => gameState.regions[k].currentWeek),
        ...REGION_KEYS.map(k => gameState.regions[k].phase),
        ...REGION_KEYS.map(k => gameState.regions[k].bracket?.stage ?? -1),
        intl?.phase || '-',
        intl?.swiss?.round || -1,
        intl?.swiss?.status || '-',
        intl?.bracket?.stage ?? -1,
        w?.phase || '-',
        w?.bracket?.stage ?? -1,
        ...['A', 'B', 'C', 'D'].map(gk => w?.groups?.[gk]?.round ?? -1),
        ...['A', 'B', 'C', 'D'].map(gk => w?.groups?.[gk]?.status ?? '-'),
      ].join('|');
    }

    let prevSnap = snapshot();
    let safety = 500;

    while (safety-- > 0) {
      const s = gameState.season?.status;
      if (s === 'transition' || s === 'season-complete' || s === 'offseason-active') break;
      if (isAwaitingHumanPick(gameState) || isWorldsAwaitingHumanPick(gameState)) break;

      const activeBefore = (gameState.season?.activeSeries || []).length;

      // Dispatch to the right per-phase handler. Same logic as advanceAll.
      const cur = getCurrentSlot(gameState);
      if (cur?.type === 'international') {
        advanceInternationalPhase();
      } else if (cur?.type === 'worlds') {
        advanceWorldsPhase();
      } else if (REGION_KEYS.some(k => gameState.regions[k].phase === 'group')) {
        advanceGroupWeek();
      } else {
        advanceBracketAll();
      }

      const activeAfter = (gameState.season?.activeSeries || []).length;
      const newSnap = snapshot();

      // Boundary 1: we had active series and now we don't → round just
      // resolved. Stop before the next round seeds.
      if (activeBefore > 0 && activeAfter === 0) break;

      // Boundary 2: state didn't change at all (nothing seeded, nothing
      // played). Probably hit a passthrough phase that's waiting for
      // input or finished. Bail to avoid infinite loop.
      if (newSnap === prevSnap) break;

      prevSnap = newSnap;
    }
  }

  // Sim Group Stage: keeps clicking advance until all 4 regions exit
  // group phase. Confirmation prompt because this skips a lot of content.
  function handleSimGroupStage() {
    const anyInGroup = REGION_KEYS.some(k => gameState.regions[k].phase === 'group');
    if (!anyInGroup) return;

    const ok = typeof window !== 'undefined' && window.confirm(
      'Sim to end of regular season?\n\n' +
      'All 4 regions will play through every remaining group stage week. ' +
      'You\'ll land at the start of the regional brackets.\n\n' +
      'This action cannot be undone.'
    );
    if (!ok) return;

    let safety = 1000;
    while (safety-- > 0 && REGION_KEYS.some(k => gameState.regions[k].phase === 'group')) {
      advanceGroupWeek();
    }
  }

  // Sim Playoffs: depending on the current slot, sims either the regional
  // bracket OR the international tournament OR worlds to completion.
  function handleSimPlayoffs() {
    const slot = getCurrentSlot(gameState);
    let label = 'this stage';
    if (slot?.type === 'international') label = 'this international tournament';
    else if (slot?.type === 'worlds') label = 'Worlds';
    else label = 'all regional brackets';

    const ok = typeof window !== 'undefined' && window.confirm(
      `Sim ${label} to completion?\n\n` +
      'Every remaining match will be played. You\'ll land at the next stage transition.\n\n' +
      'This action cannot be undone.'
    );
    if (!ok) return;

    let safety = 200;
    while (safety-- > 0) {
      const s = gameState.season?.status;
      if (s === 'transition' || s === 'season-complete' || s === 'offseason-active') break;

      const cur = getCurrentSlot(gameState);
      if (cur?.type === 'international') {
        if (isInternationalComplete(gameState)) break;
        advanceInternationalPhase();
        continue;
      }
      if (cur?.type === 'worlds') {
        if (isWorldsComplete(gameState)) break;
        advanceWorldsPhase();
        continue;
      }
      // Stage slot — group or bracket
      if (REGION_KEYS.some(k => gameState.regions[k].phase === 'group')) break; // not in playoffs
      if (allBracketsDone) break;
      advanceBracketAll();
    }
  }

  // ── Advance group stage for all regions ──
  // Per-map version: each click plays exactly one map across every active
  // series in the league. If no series are active (between weeks), this
  // first seeds the next week's series across all 4 regions, then plays
  // the opening map. So every click does something visible.
  //
  // Bracket transition (after final week) still happens here: when a
  // region runs out of matches AND has no active series, we freeze its
  // standings and generate the bracket. The next click will then enter
  // bracket-advance mode (still batch — Ask 3 message 3 will convert
  // brackets to per-map too).
  function advanceGroupWeek() {
    let toastResult = null;

    // ── Preseason → Week 1 transition (one-time per season) ──
    // Triggered when ALL regions are at week 0. Auto-fills AI rosters.
    // Does NOT play any maps — the very next click starts week 1's series.
    if (REGION_KEYS.every(k => gameState.regions[k].currentWeek === 0)) {
      for (const regionKey of REGION_KEYS) {
        const region = gameState.regions[regionKey];
        if (region.phase === 'bracket') continue;
        for (const team of region.teams) {
          if (team.isHuman) continue;
          while (team.roster.length < 5) {
            const bestFA = [...region.freeAgents].sort((a, b) => b.overall - a.overall)[0];
            if (bestFA) {
              team.roster.push(bestFA);
              region.freeAgents.splice(region.freeAgents.indexOf(bestFA), 1);
            } else {
              team.roster.push(generatePlayer({ regionKey }));
            }
          }
          team.validateStrategy();
        }
        region.currentWeek = 1;
      }
      setToast({ message: 'Season started across all regions!', type: 'win', mapScores: null });
      setGameState(prev => ({ ...prev }));
      return;
    }

    ensureActiveSeries(gameState);

    // ── If nothing is active, seed the next week of series ──
    if (!hasActiveSeries(gameState, 'group')) {
      const seeded = [];
      for (const regionKey of REGION_KEYS) {
        const region = gameState.regions[regionKey];
        if (region.phase === 'bracket') continue;

        const weekMatches = region.schedule.filter(
          m => m.week === region.currentWeek && !m.result
        );

        if (weekMatches.length === 0) {
          // This region has no more matches in its current week. Either
          // we need to advance to the next week (handled at end of this
          // function) or the season is done and we transition to bracket.
          const remaining = region.schedule.filter(m => !m.result);
          if (remaining.length === 0 && region.phase !== 'bracket') {
            region.frozenStandings = freezeStandings(region.teams);
            region.bracket = generateBracket(region.teams);
            region.phase = 'bracket';
          }
          continue;
        }

        for (const m of weekMatches) {
          // scheduleIdx lookup: we need the actual index into region.schedule
          // so the completion handler can locate the match and set match.result.
          const scheduleIdx = region.schedule.indexOf(m);
          seeded.push({
            seriesId: `${regionKey}:w${region.currentWeek}:${scheduleIdx}`,
            phase: 'group',
            regionKey,
            week: region.currentWeek,
            scheduleIdx,
            matchRef: m, // direct ref so UI can find this in-progress series
            teamA: m.teamA,
            teamB: m.teamB,
            bestOf: 3,
          });
        }
      }

      if (seeded.length === 0) {
        // No region has matches AND no series got seeded. Could mean every
        // region is in bracket phase, or we're in a degenerate state. The
        // outer advanceAll() loop should re-route to advanceBracketAll on
        // the next click.
        setGameState(prev => ({ ...prev }));
        return;
      }

      seedActiveSeries(gameState, seeded);
    }

    // ── Play one map across all active group series ──
    const { completed } = advanceOneMap(gameState);

    // ── Process any series that just finished this tick ──
    for (const entry of completed) {
      if (entry.phase !== 'group') continue;
      const region = gameState.regions[entry.regionKey];
      const match = region.schedule[entry.scheduleIdx];
      if (!match) continue; // safety

      const result = seriesToResult(entry.series);
      match.result = result;
      processSeriesResult(result);
      awardGroupStageWin(gameState, entry.regionKey, result.winner);
      region.results.push({
        week: entry.week,
        teamA: match.teamA.abbr, teamB: match.teamB.abbr,
        winner: result.winner.abbr, score: result.score,
      });

      // Toast only for human team — Ask 3 option (a)
      if (entry.regionKey === gameState.humanRegion) {
        if (match.teamA === humanTeam || match.teamB === humanTeam) {
          toastResult = result;
        }
      }
    }

    // ── Per-region week advance: if a region has no more active series
    // AND no more unplayed matches in the current week, increment its week.
    for (const regionKey of REGION_KEYS) {
      const region = gameState.regions[regionKey];
      if (region.phase === 'bracket') continue;

      const stillActiveInRegion = (gameState.season.activeSeries || [])
        .some(a => a.phase === 'group' && a.regionKey === regionKey);
      if (stillActiveInRegion) continue;

      const unplayedThisWeek = region.schedule.some(
        m => m.week === region.currentWeek && !m.result
      );
      if (unplayedThisWeek) continue;

      // Week complete for this region — bump to next week + run AI roster moves
      const remaining = region.schedule.some(m => !m.result);
      if (remaining) {
        runCpuMoves({ teams: region.teams, freeAgents: region.freeAgents });
        region.currentWeek++;
      }
    }

    if (toastResult) {
      showMatchToast(toastResult, humanTeam);
    }
    setGameState(prev => ({ ...prev }));
  }

  // ── Advance bracket for ALL regions simultaneously ──
  function advanceBracketAll() {
    if (allBracketsDone) return;

    ensureActiveSeries(gameState);

    // ── If no active bracket series, seed the current stage across all regions ──
    if (!hasActiveSeries(gameState, 'bracket')) {
      const seeded = [];
      for (const regionKey of REGION_KEYS) {
        const region = gameState.regions[regionKey];
        if (!region.bracket || region.bracket.stage >= 7) continue;

        const stageMatches = getStageMatches(region.bracket);
        for (let i = 0; i < stageMatches.length; i++) {
          const { match, bestOf } = stageMatches[i];
          if (match.result) continue; // defensive — already played

          seeded.push({
            seriesId: `${regionKey}:bracket:s${region.bracket.stage}:${i}`,
            phase: 'bracket',
            regionKey,
            bracketStage: region.bracket.stage,
            bracketMatchRef: match, matchRef: match, // direct ref for completion + UI lookup
            teamA: match.teamA,
            teamB: match.teamB,
            bestOf,
          });
        }
      }

      if (seeded.length > 0) {
        seedActiveSeries(gameState, seeded);
      }
    }

    // ── Play one map across active bracket series ──
    const { completed } = advanceOneMap(gameState);

    // ── Process completed series ──
    let toastResult = null;
    for (const entry of completed) {
      if (entry.phase !== 'bracket') continue;
      const result = seriesToResult(entry.series);
      entry.bracketMatchRef.result = result;
      processSeriesResult(result);

      // Toast only for human team's match
      if (entry.regionKey === gameState.humanRegion) {
        if (entry.teamA === humanTeam || entry.teamB === humanTeam) {
          toastResult = result;
        }
      }
    }

    // ── For each region whose stage is fully resolved, route the bracket
    // (sets up next-stage matchups + bumps stage indexer)
    for (const regionKey of REGION_KEYS) {
      const region = gameState.regions[regionKey];
      if (!region.bracket || region.bracket.stage >= 7) continue;

      // Are there any active series for this region's bracket?
      const stillActive = (gameState.season.activeSeries || [])
        .some(a => a.phase === 'bracket' && a.regionKey === regionKey);
      if (stillActive) continue;

      // All matches this stage have results — route to next stage
      const stageMatches = getStageMatches(region.bracket);
      const allDone = stageMatches.every(({ match }) => match.result);
      if (!allDone) continue;

      region.bracket = routeBracketStage(region.bracket);
    }

    if (toastResult) showMatchToast(toastResult, humanTeam);

    // Stage completion check
    if (isStageSlotComplete(gameState) && gameState.season.status === 'active') {
      completeCurrentStage(gameState);
    }

    setGameState(prev => ({ ...prev }));
  }

  function findHumanBracketMatch(b, team) {
    if (!b) return null;
    const stageMatches = {
      2: b.ubQF,
      3: [...(b.lbR1 || []), ...(b.ubSF || [])],
      4: [...(b.lbQF || []), [b.ubFinal]],
      5: [b.lbSF],
      6: [b.lbFinal],
      7: [b.grandFinal],
    };
    const matches = stageMatches[b.stage];
    if (!matches) return null;
    return matches.flat().find(
      m => m && m.result && (m.teamA === team || m.teamB === team)
    ) || null;
  }

  // ── Roster ──
  function signPlayer(player) {
    if (humanTeam.rosterFull) return;
    // Phase 6f: during a mid-season FA window, enforce the season-wide
    // 2-signing cap on the user. Offseason has unlimited signings (the
    // cap only applies mid-season for now — future cap-space work will
    // generalize this).
    if (midseasonActive) {
      const used = humanTeam._midseasonMoves || 0;
      if (used >= MAX_MIDSEASON_MOVES_PER_SEASON) {
        setToast({
          type: 'info',
          message: `Mid-season cap reached (${used}/${MAX_MIDSEASON_MOVES_PER_SEASON} signings).`,
        });
        return;
      }
    }
    humanTeam.addPlayer(player);
    humanTeam.validateStrategy();
    const region = gameState.regions[gameState.humanRegion];
    region.freeAgents = region.freeAgents.filter(p => p !== player);
    if (midseasonActive) {
      humanTeam._midseasonMoves = (humanTeam._midseasonMoves || 0) + 1;
    }
    setGameState(prev => ({ ...prev }));
  }

  function releasePlayer(player) {
    // During regular season, enforce the 5-player minimum to prevent the
    // user from accidentally going understrength mid-year. During the
    // offseason OR a mid-season FA window, allow going below 5 — the user
    // might want to release then sign, and the Start Preseason / Start
    // Stage buttons are the safeguard that prevent starting with <5.
    if (!offseasonActive && !midseasonActive && humanTeam.atMinRoster) return;
    humanTeam.removePlayer(player);
    humanTeam.validateStrategy();
    gameState.regions[gameState.humanRegion].freeAgents.push(player);

    // Phase 6e: during the offseason, user releases are market events.
    // AI teams that haven't hit their per-offseason move cap yet get ONE
    // reactive opportunity each, BUT scoped only to the newly-released
    // player. Keeps the cascade bounded — a release triggers interest
    // in that specific player, not a league-wide free-for-all.
    if (offseasonActive) {
      const newMoves = runReactiveAISignings(gameState, player);
      if (newMoves.length > 0) {
        // Small toast so the user knows AI teams moved in response
        const first = newMoves[0];
        const extra = newMoves.length > 1 ? ` (+${newMoves.length - 1} more move${newMoves.length > 2 ? 's' : ''})` : '';
        setToast({
          type: 'info',
          message: `${first.teamAbbr} signed ${first.signed.tag}${extra}`,
        });
      }
    }

    // Phase 6f: same reactive flow during mid-season FA windows. Different
    // engine entry point (uses _midseasonMoves cap, writes to aiMidseasonLog).
    if (midseasonActive) {
      const newMoves = runMidseasonReactiveSignings(gameState, player);
      if (newMoves.length > 0) {
        const first = newMoves[0];
        const extra = newMoves.length > 1 ? ` (+${newMoves.length - 1} more move${newMoves.length > 2 ? 's' : ''})` : '';
        setToast({
          type: 'info',
          message: `${first.teamAbbr} signed ${first.signed.tag}${extra}`,
        });
      }
    }

    setGameState(prev => ({ ...prev }));
  }

  function handleStrategyUpdate() { forceRender(n => n + 1); }

  // ── Sidebar display ──
  const currentSlotForSidebar = getCurrentSlot(gameState);
  const inInternational = currentSlotForSidebar?.type === 'international';
  const inWorlds = currentSlotForSidebar?.type === 'worlds';

  let sidebarPhase, sidebarWeek, sidebarLabel;
  if (circuitComplete) {
    sidebarPhase = 'finished';
    sidebarWeek = 0;
    sidebarLabel = null;
  } else if (inTransition) {
    sidebarPhase = 'bracket';
    sidebarWeek = 0;
    if (inWorlds) sidebarLabel = 'Worlds Complete';
    else if (inInternational) sidebarLabel = 'International Complete';
    else sidebarLabel = 'Stage Complete';
  } else if (inWorlds) {
    sidebarPhase = 'bracket';
    sidebarWeek = 0;
    const w = gameState.worlds;
    if (!w) {
      sidebarLabel = 'Loading...';
    } else if (w.phase === 'groupSelection') {
      sidebarLabel = isWorldsAwaitingHumanPick(gameState)
        ? 'Your Placement'
        : `Group Draw · ${w.groupSelection.currentRegionIndex + 1}/4`;
    } else if (w.phase === 'groups') {
      const round = w.groups?.A?.round || 1;
      sidebarLabel = `Groups · Round ${round}`;
    } else if (w.phase === 'playoffSelection') {
      sidebarLabel = isWorldsAwaitingHumanPick(gameState)
        ? 'Your Pick'
        : `Playoff Draw · ${(w.playoffSelection?.currentPickIndex || 0) + 1}/4`;
    } else if (w.phase === 'bracket') {
      sidebarLabel = `Playoffs · Stage ${w.bracket?.stage || 1}`;
    } else {
      sidebarLabel = 'Advancing...';
    }
  } else if (inInternational) {
    sidebarPhase = 'bracket';
    sidebarWeek = 0;
    const intl = gameState.international;
    if (!intl) {
      sidebarLabel = 'Loading...';
    } else if (intl.phase === 'swiss') {
      sidebarLabel = `Swiss · Round ${intl.swiss.round}`;
    } else if (intl.phase === 'selection') {
      sidebarLabel = isAwaitingHumanPick(gameState)
        ? 'Your Pick'
        : `Selection Show · ${(intl.selectionShow?.currentPickIndex || 0) + 1}/4`;
    } else if (intl.phase === 'bracket') {
      sidebarLabel = `Playoffs · Stage ${intl.bracket.stage}`;
    } else {
      sidebarLabel = 'Advancing...';
    }
  } else if (isGroupPhase) {
    sidebarPhase = 'group';
    sidebarWeek = humanRegionData.currentWeek;
    sidebarLabel = null;
  } else {
    sidebarPhase = 'bracket';
    sidebarWeek = 0;
    const hb = humanRegionData.bracket;
    sidebarLabel = hb && hb.stage < 7 ? getStageName(hb.stage) : 'Advancing...';
  }

  const stageName = getCurrentStageName(gameState);

  // ── Views ──
  function renderView() {
    const regionData = gameState.regions[vr];

    // Phase 6e: during the offseason, take over the Dashboard slot with
    // the Offseason view. All other tabs remain navigable — the user can
    // check Stats/History/Standings etc. while deciding on roster moves.
    if (offseasonActive && (currentView === 'dashboard' || !currentView)) {
      return (
        <Offseason
          gameState={gameState}
          humanTeam={humanTeam}
          humanRegionData={humanRegionData}
          onSign={signPlayer}
          onRelease={releasePlayer}
          onStartPreseason={handleStartPreseason}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard gameState={gameState} humanTeam={humanTeam} onStartNewSeason={circuitComplete ? handleStartNewSeason : null} />;
      case 'schedule':
        return <Schedule regionData={regionData} viewRegion={vr} onChangeRegion={setViewRegion} gameState={gameState} />;
      case 'roster':
        return <Roster team={humanTeam} onRelease={releasePlayer} onUpdate={handleStrategyUpdate} allowMinRelease={offseasonActive || midseasonActive} godMode={!!gameState.godMode} onEditPlayer={handleEditPlayer} />;
      case 'freeagents':
        return <FreeAgents
          freeAgents={humanRegionData.freeAgents}
          canSign={!humanTeam.rosterFull && !(midseasonActive && (humanTeam._midseasonMoves || 0) >= MAX_MIDSEASON_MOVES_PER_SEASON)}
          onSign={signPlayer}
          godMode={!!gameState.godMode}
          onEditPlayer={handleEditPlayer}
          midseasonInfo={midseasonActive ? {
            used: humanTeam._midseasonMoves || 0,
            max: MAX_MIDSEASON_MOVES_PER_SEASON,
          } : null}
        />;
      case 'standings':
        return <Standings regionData={regionData} viewRegion={vr} onChangeRegion={setViewRegion} godMode={!!gameState.godMode} onEditPlayer={handleEditPlayer} />;
      case 'bracket':
        return <Bracket regionData={regionData} viewRegion={vr} onChangeRegion={setViewRegion} gameState={gameState} />;
      case 'stats':
        return <Stats regions={gameState.regions} viewRegion={vr} onChangeRegion={setViewRegion} gameState={gameState} />;
      case 'points':
        return <Points gameState={gameState} viewRegion={vr} onChangeRegion={setViewRegion} />;
      case 'history':
        return <History gameState={gameState} />;
      case 'international':
        return <International gameState={gameState} onHumanPick={handleHumanSelectionPick} />;
      case 'worlds':
        return <Worlds
          gameState={gameState}
          onPlayoffPick={handleWorldsPlayoffPick}
        />;
      default:
        return <Dashboard gameState={gameState} humanTeam={humanTeam} onStartNewSeason={circuitComplete ? handleStartNewSeason : null} />;
    }
  }

  // Phase 6d: block Advance when the human team is below ROSTER_MIN during
  // preseason. Applies only when the user is in preseason (week 0, group
  // phase) — once the season is underway, the user can't drop below 5 via
  // normal UI anyway (Release button respects atMinRoster).
  const humanUnderstrength =
    humanRegionData.phase === 'group' &&
    humanRegionData.currentWeek === 0 &&
    humanTeam.roster.length < 5;

  return (
    <div className="app">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentWeek={sidebarWeek}
        onAdvanceWeek={advanceAll}
        phase={sidebarPhase}
        bracketLabel={sidebarLabel}
        allDone={circuitComplete}
        stageName={stageName}
        advanceDisabled={
          isAwaitingHumanPick(gameState) ||
          isWorldsAwaitingHumanPick(gameState) ||
          humanUnderstrength
        }
        advanceBlockReason={humanUnderstrength
          ? `Sign ${5 - humanTeam.roster.length} more player${5 - humanTeam.roster.length > 1 ? 's' : ''} to start the season`
          : null}
        onDeleteSave={handleDeleteSave}
        onStartNewSeason={circuitComplete ? handleStartNewSeason : null}
        seasonNumber={gameState.seasonNumber}
        isOffseason={offseasonActive}
        onStartPreseason={handleStartPreseason}
        humanRosterSize={humanTeam.roster.length}
        isMidseason={midseasonActive}
        onStartStage={handleStartStage}
        midseasonMovesUsed={humanTeam._midseasonMoves || 0}
        midseasonMovesMax={MAX_MIDSEASON_MOVES_PER_SEASON}
        godMode={!!gameState.godMode}
        onToggleGodMode={handleToggleGodMode}
        hasActiveSeries={(() => {
          // Sim Series available any time games are playable — not just
          // when series are mid-flight. Same conditions as the regular
          // Advance button being enabled.
          if (inTransition || circuitComplete || offseasonActive || midseasonActive) return false;
          if (isAwaitingHumanPick(gameState) || isWorldsAwaitingHumanPick(gameState)) return false;
          const slot = getCurrentSlot(gameState);
          if (slot?.type === 'international' || slot?.type === 'worlds') return true;
          // Stage slot — playable if any region still has unfinished work
          if (REGION_KEYS.some(k => gameState.regions[k].phase === 'group')) return true;
          return !allBracketsDone;
        })()}
        canSimGroup={REGION_KEYS.some(k => gameState.regions[k].phase === 'group') && !inTransition && !circuitComplete && !offseasonActive}
        canSimPlayoffs={(() => {
          if (inTransition || circuitComplete || offseasonActive || midseasonActive) return false;
          const slot = getCurrentSlot(gameState);
          if (slot?.type === 'international' || slot?.type === 'worlds') return true;
          // Stage slot — only show "Sim Playoffs" when in bracket phase
          return REGION_KEYS.every(k => gameState.regions[k].phase !== 'group') && !allBracketsDone;
        })()}
        onSimSeries={handleSimSeries}
        onSimGroupStage={handleSimGroupStage}
        onSimPlayoffs={handleSimPlayoffs}
      />
      <main id="content">{renderView()}</main>
      {toast && <Toast message={toast.message} type={toast.type} mapScores={toast.mapScores} onClose={clearToast} />}
      {inTransition && (
        <StageTransition gameState={gameState} onContinue={handleTransitionContinue} />
      )}
    </div>
  );
}