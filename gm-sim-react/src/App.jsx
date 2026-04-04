/**
 * App.jsx — Root component (complete, clean version).
 */

import { useState, useCallback } from 'react';

import { initLeague, getHumanTeam } from './engine/league.js';
import { generatePlayer } from './classes/Player.js';
import { simulateSeries } from './classes/Match.js';
import { runCpuMoves } from './engine/ai.js';
import { generateBracket, advanceBracketStage } from './engine/bracket.js';
import { REQUIRED_ROLES } from './data/constants.js';

import TeamSelect from './components/TeamSelect.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Schedule from './components/Schedule.jsx';
import Roster from './components/Roster.jsx';
import FreeAgents from './components/FreeAgents.jsx';
import Standings from './components/Standings.jsx';
import Bracket from './components/Bracket.jsx';
import Stats from './components/Stats.jsx';
import Toast from './components/Toast.jsx';

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
    const teamAIsWinner = (result.teamA === winner);
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

export default function App() {
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [bracket, setBracket] = useState(null);
  const [toast, setToast] = useState(null);
  const [, forceRender] = useState(0);

  const clearToast = useCallback(() => setToast(null), []);

  function handleTeamSelect(teamIndex) {
    setGameState(initLeague(teamIndex));
    setStarted(true);
  }

  if (!started || !gameState) {
    return <TeamSelect onSelect={handleTeamSelect} />;
  }

  const humanTeam = getHumanTeam(gameState);

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

  // ── Advance Week ──
  function advanceWeek() {
    const { schedule, currentWeek } = gameState;

    // Preseason
    if (currentWeek === 0) {
      for (const team of gameState.teams) {
        while (team.roster.length < 5) {
          const role = REQUIRED_ROLES[team.roster.length % REQUIRED_ROLES.length];
          const fa = gameState.freeAgents.find(p => p.role === role);
          if (fa) {
            team.roster.push(fa);
            gameState.freeAgents.splice(gameState.freeAgents.indexOf(fa), 1);
          } else {
            team.roster.push(generatePlayer(role));
          }
        }
        team.validateStrategy();
      }
      setGameState(prev => ({ ...prev, currentWeek: 1 }));
      setToast({ message: 'Season started!', type: 'win', mapScores: null });
      return;
    }

    // Get this week's matches
    const weekMatches = schedule.filter(m => m.week === currentWeek && !m.result);

    // No matches left — check if group stage is done
    if (weekMatches.length === 0) {
      const remaining = schedule.filter(m => !m.result);
      if (remaining.length === 0 && gameState.phase !== 'bracket') {
        // Freeze standings: sort order + records locked permanently
        const frozenStandings = {};
        for (const group of ['A', 'B']) {
          const sorted = gameState.teams
            .filter(t => t.group === group)
            .sort((a, b) => {
              if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
              const mdA = a.record.mapWins - a.record.mapLosses;
              const mdB = b.record.mapWins - b.record.mapLosses;
              if (mdB !== mdA) return mdB - mdA;
              const rdA = (a.record.roundWins || 0) - (a.record.roundLosses || 0);
              const rdB = (b.record.roundWins || 0) - (b.record.roundLosses || 0);
              if (rdB !== rdA) return rdB - rdA;
              return b.overallRating - a.overallRating;
            });
          frozenStandings[group] = sorted.map(t => ({
            abbr: t.abbr,
            name: t.name,
            color: t.color,
            isHuman: t.isHuman,
            overallRating: t.overallRating,
            record: { ...t.record },
          }));
        }

        setBracket(generateBracket(gameState.teams));
        setGameState(prev => ({
          ...prev,
          phase: 'bracket',
          frozenStandings,
        }));
        setCurrentView('bracket');
      }
      return;
    }

    // Simulate matches
    for (const match of weekMatches) {
      const result = simulateSeries(match.teamA, match.teamB, 3);
      match.result = result;
      processSeriesResult(result);
      gameState.results.push({
        week: currentWeek,
        teamA: match.teamA.abbr,
        teamB: match.teamB.abbr,
        winner: result.winner.abbr,
        score: result.score,
      });
    }

    runCpuMoves(gameState);

    const humanMatch = weekMatches.find(m => m.teamA === humanTeam || m.teamB === humanTeam);
    if (humanMatch?.result) showMatchToast(humanMatch.result, humanTeam);

    setGameState(prev => ({
      ...prev,
      currentWeek: prev.currentWeek + 1,
    }));
  }

  // ── Bracket ──
  function advanceBracketStageHandler() {
    if (!bracket || bracket.stage >= 7) return;
    const updated = advanceBracketStage(bracket);
    setBracket(updated);
    const hm = findHumanBracketMatch(updated, humanTeam);
    if (hm?.result) showMatchToast(hm.result, humanTeam);
  }

  function findHumanBracketMatch(b, team) {
    const stageMatches = {
      2: b.ubQF,
      3: [...b.lbR1, ...b.ubSF],
      4: [...b.lbQF, [b.ubFinal]],
      5: [b.lbSF],
      6: [b.lbFinal],
      7: [b.grandFinal],
    };
    return (stageMatches[b.stage] || []).flat().find(
      m => m.result && (m.teamA === team || m.teamB === team)
    ) || null;
  }

  // ── Roster ──
  function signPlayer(player) {
    if (humanTeam.rosterFull) return;
    humanTeam.addPlayer(player);
    humanTeam.validateStrategy();
    setGameState(prev => ({
      ...prev,
      freeAgents: prev.freeAgents.filter(p => p !== player),
    }));
  }

  function releasePlayer(player) {
    if (humanTeam.atMinRoster) return;
    humanTeam.removePlayer(player);
    humanTeam.validateStrategy();
    setGameState(prev => ({
      ...prev,
      freeAgents: [...prev.freeAgents, player],
    }));
  }

  function handleStrategyUpdate() {
    forceRender(n => n + 1);
  }

  // ── Views ──
  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard gameState={gameState} humanTeam={humanTeam} />;
      case 'schedule':
        return <Schedule gameState={gameState} />;
      case 'roster':
        return (
          <Roster
            team={humanTeam}
            onRelease={releasePlayer}
            onUpdate={handleStrategyUpdate}
          />
        );
      case 'freeagents':
        return (
          <FreeAgents
            freeAgents={gameState.freeAgents}
            canSign={!humanTeam.rosterFull}
            onSign={signPlayer}
          />
        );
      case 'standings':
        return (
          <Standings
            teams={gameState.teams}
            frozenStandings={gameState.frozenStandings}
          />
        );
      case 'bracket':
        return (
          <Bracket
            gameState={gameState}
            bracket={bracket}
            onAdvanceBracket={advanceBracketStageHandler}
          />
        );
      case 'stats':
        return <Stats teams={gameState.teams} />;
      default:
        return <Dashboard gameState={gameState} humanTeam={humanTeam} />;
    }
  }

  return (
    <div className="app">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentWeek={gameState.currentWeek}
        onAdvanceWeek={advanceWeek}
        phase={gameState.phase}
      />
      <main id="content">
        {renderView()}
      </main>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          mapScores={toast.mapScores}
          onClose={clearToast}
        />
      )}
    </div>
  );
}
