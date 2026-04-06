/**
 * App.jsx — Multi-region. Sidebar "Advance Week" handles everything:
 *   - Group stage: advances all regions' weeks
 *   - Bracket stage: advances all regions' brackets one stage
 */

import { useState, useCallback } from 'react';

import { initGame, getHumanTeam } from './engine/league.js';
import { generatePlayer } from './classes/Player.js';
import { simulateSeries } from './classes/Match.js';
import { runCpuMoves } from './engine/ai.js';
import {
  generateBracket,
  advanceBracketStage as runBracketStage,
  getStageName,
} from './engine/bracket.js';
import {
  initSeason,
  getCurrentStageName,
  getCurrentSlot,
  isStageSlotComplete,
  completeCurrentStage,
  isInternationalSlotComplete,
  completeCurrentInternational,
  beginNextSlot,
  awardGroupStageWin,
} from './engine/season.js';
import {
  advanceInternational,
  isInternationalComplete,
} from './engine/international.js';
import { REQUIRED_ROLES } from './data/constants.js';
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
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [, forceRender] = useState(0);
  const [viewRegion, setViewRegion] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  function handleTeamSelect(regionKey, teamIndex) {
    const gs = initGame(regionKey, teamIndex);
    gs.season = initSeason(gs);
    setGameState(gs);
    setViewRegion(regionKey);
    setStarted(true);
  }

  if (!started || !gameState) {
    return <TeamSelect onSelect={handleTeamSelect} />;
  }

  const humanTeam = getHumanTeam(gameState);
  const humanRegionData = gameState.regions[gameState.humanRegion];
  const vr = viewRegion || gameState.humanRegion;

  const seasonStatus = gameState.season?.status || 'active';
  const inTransition = seasonStatus === 'transition';
  const circuitComplete = seasonStatus === 'complete';

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
    if (inTransition || circuitComplete) return;

    // If we're inside an international slot, route to the international engine
    const currentSlot = getCurrentSlot(gameState);
    if (currentSlot?.type === 'international') {
      advanceInternationalPhase();
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
    advanceInternational(gameState);
    // If the international finished during that tick, finalize it:
    // award points, snapshot history, flip to 'transition'.
    if (isInternationalComplete(gameState)) {
      completeCurrentInternational(gameState);
    }
    setGameState(prev => ({ ...prev }));
  }

  // ── Called from the StageTransition "Continue" button ──
  function handleTransitionContinue() {
    beginNextSlot(gameState);
    // Jump the view back to the dashboard so the user lands somewhere sensible
    // after rollover (old bracket/standings views would show fresh-empty state).
    setCurrentView('dashboard');
    setGameState(prev => ({ ...prev }));
  }

  // ── Advance group stage for all regions ──
  function advanceGroupWeek() {
    let toastResult = null;
    let wasPreseason = humanRegionData.currentWeek === 0;

    for (const regionKey of REGION_KEYS) {
      const region = gameState.regions[regionKey];
      if (region.phase === 'bracket') continue;

      if (region.currentWeek === 0) {
        for (const team of region.teams) {
          while (team.roster.length < 5) {
            const role = REQUIRED_ROLES[team.roster.length % REQUIRED_ROLES.length];
            const fa = region.freeAgents.find(p => p.role === role);
            if (fa) {
              team.roster.push(fa);
              region.freeAgents.splice(region.freeAgents.indexOf(fa), 1);
            } else {
              team.roster.push(generatePlayer(role));
            }
          }
          team.validateStrategy();
        }
        region.currentWeek = 1;
        continue;
      }

      const weekMatches = region.schedule.filter(
        m => m.week === region.currentWeek && !m.result
      );

      if (weekMatches.length === 0) {
        const remaining = region.schedule.filter(m => !m.result);
        if (remaining.length === 0 && region.phase !== 'bracket') {
          region.frozenStandings = freezeStandings(region.teams);
          region.bracket = generateBracket(region.teams);
          region.phase = 'bracket';
        }
        continue;
      }

      for (const match of weekMatches) {
        const result = simulateSeries(match.teamA, match.teamB, 3);
        match.result = result;
        processSeriesResult(result);
        awardGroupStageWin(gameState, regionKey, result.winner);
        region.results.push({
          week: region.currentWeek,
          teamA: match.teamA.abbr, teamB: match.teamB.abbr,
          winner: result.winner.abbr, score: result.score,
        });

        if (regionKey === gameState.humanRegion) {
          if (match.teamA === humanTeam || match.teamB === humanTeam) {
            toastResult = result;
          }
        }
      }

      runCpuMoves({ teams: region.teams, freeAgents: region.freeAgents });
      region.currentWeek++;
    }

    if (toastResult) {
      showMatchToast(toastResult, humanTeam);
    } else if (wasPreseason) {
      setToast({ message: 'Season started across all regions!', type: 'win', mapScores: null });
    }

    setGameState(prev => ({ ...prev }));
  }

  // ── Advance bracket for ALL regions simultaneously ──
  function advanceBracketAll() {
    if (allBracketsDone) return;

    for (const regionKey of REGION_KEYS) {
      const region = gameState.regions[regionKey];
      if (!region.bracket || region.bracket.stage >= 7) continue;
      region.bracket = runBracketStage(region.bracket);
    }

    // Toast for human team
    const humanBracket = humanRegionData.bracket;
    if (humanBracket) {
      const hm = findHumanBracketMatch(humanBracket, humanTeam);
      if (hm?.result) showMatchToast(hm.result, humanTeam);
    }

    // If this bracket advance finished the stage across all regions,
    // finalize it (award points, snapshot history, flip to 'transition').
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
    humanTeam.addPlayer(player);
    humanTeam.validateStrategy();
    const region = gameState.regions[gameState.humanRegion];
    region.freeAgents = region.freeAgents.filter(p => p !== player);
    setGameState(prev => ({ ...prev }));
  }

  function releasePlayer(player) {
    if (humanTeam.atMinRoster) return;
    humanTeam.removePlayer(player);
    humanTeam.validateStrategy();
    gameState.regions[gameState.humanRegion].freeAgents.push(player);
    setGameState(prev => ({ ...prev }));
  }

  function handleStrategyUpdate() { forceRender(n => n + 1); }

  // ── Sidebar display ──
  const currentSlotForSidebar = getCurrentSlot(gameState);
  const inInternational = currentSlotForSidebar?.type === 'international';

  let sidebarPhase, sidebarWeek, sidebarLabel;
  if (circuitComplete) {
    sidebarPhase = 'finished';
    sidebarWeek = 0;
    sidebarLabel = null;
  } else if (inTransition) {
    sidebarPhase = 'bracket';
    sidebarWeek = 0;
    sidebarLabel = inInternational ? 'International Complete' : 'Stage Complete';
  } else if (inInternational) {
    // Dedicated international sidebar state — label describes current phase
    sidebarPhase = 'bracket';
    sidebarWeek = 0;
    const intl = gameState.international;
    if (!intl) {
      sidebarLabel = 'Loading...';
    } else if (intl.phase === 'swiss') {
      sidebarLabel = `Swiss · Round ${intl.swiss.round}`;
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

    switch (currentView) {
      case 'dashboard':
        return <Dashboard gameState={gameState} humanTeam={humanTeam} />;
      case 'schedule':
        return <Schedule regionData={regionData} viewRegion={vr} onChangeRegion={setViewRegion} />;
      case 'roster':
        return <Roster team={humanTeam} onRelease={releasePlayer} onUpdate={handleStrategyUpdate} />;
      case 'freeagents':
        return <FreeAgents freeAgents={humanRegionData.freeAgents} canSign={!humanTeam.rosterFull} onSign={signPlayer} />;
      case 'standings':
        return <Standings regionData={regionData} viewRegion={vr} onChangeRegion={setViewRegion} />;
      case 'bracket':
        return <Bracket regionData={regionData} viewRegion={vr} onChangeRegion={setViewRegion} />;
      case 'stats':
        return <Stats regions={gameState.regions} viewRegion={vr} onChangeRegion={setViewRegion} />;
      case 'points':
        return <Points gameState={gameState} viewRegion={vr} onChangeRegion={setViewRegion} />;
      case 'international':
        return <International gameState={gameState} />;
      default:
        return <Dashboard gameState={gameState} humanTeam={humanTeam} />;
    }
  }

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
      />
      <main id="content">{renderView()}</main>
      {toast && <Toast message={toast.message} type={toast.type} mapScores={toast.mapScores} onClose={clearToast} />}
      {inTransition && (
        <StageTransition gameState={gameState} onContinue={handleTransitionContinue} />
      )}
    </div>
  );
}