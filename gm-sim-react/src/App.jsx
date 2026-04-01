/**
 * App.jsx — Root component.
 *
 * UPDATED: Toast now receives mapScores for display.
 * simulateSeries now stores teamA/teamB on result for Schedule detail view.
 */

import { useState, useCallback } from 'react';

import { initLeague, getHumanTeam } from './engine/league.js';
import { simulateSeries } from './classes/Match.js';
import { runCpuMoves } from './engine/ai.js';
import { generateBracket, advanceBracketStage } from './engine/bracket.js';

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

export default function App() {
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [bracket, setBracket] = useState(null);
  const [toast, setToast] = useState(null);

  const clearToast = useCallback(() => setToast(null), []);

  function handleTeamSelect(teamIndex) {
    const state = initLeague(teamIndex);
    setGameState(state);
    setStarted(true);
  }

  if (!started || !gameState) {
    return <TeamSelect onSelect={handleTeamSelect} />;
  }

  const humanTeam = getHumanTeam(gameState);

  // ── Helper: build map score strings from a result ──
  function getMapScoreStrings(result) {
    if (!result || !result.maps) return [];
    return result.maps.map(m => {
      const high = Math.max(m.roundsA, m.roundsB);
      const low = Math.min(m.roundsA, m.roundsB);
      return `${high}-${low}`;
    });
  }

  // ── Helper: show toast for a match involving human team ──
  function showMatchToast(result, team) {
    const won = result.winner === team;
    const opponent = result.teamA === team ? result.teamB : result.teamA;
    const score = result.score;
    const mapScores = getMapScoreStrings(result);

    setToast({
      message: won
        ? `W ${Math.max(...score)}-${Math.min(...score)} vs ${opponent.name}`
        : `L ${Math.min(...score)}-${Math.max(...score)} vs ${opponent.name}`,
      type: won ? 'win' : 'loss',
      mapScores,
    });
  }

  // ── Advance Week ──
  function advanceWeek() {
    const { schedule, currentWeek } = gameState;
    const weekMatches = schedule.filter(m => m.week === currentWeek && !m.result);

    if (weekMatches.length === 0) {
      const remaining = schedule.filter(m => !m.result);
      if (remaining.length === 0 && gameState.phase !== 'bracket') {
        const newBracket = generateBracket(gameState.teams);
        setBracket(newBracket);
        setGameState(prev => ({ ...prev, phase: 'bracket' }));
        setCurrentView('bracket');
      }
      return;
    }

    for (const match of weekMatches) {
      const result = simulateSeries(match.teamA, match.teamB, 3);
      match.result = result;

      result.winner.record.wins++;
      result.loser.record.losses++;
      const winnerMaps = Math.max(result.score[0], result.score[1]);
      const loserMaps  = Math.min(result.score[0], result.score[1]);
      result.winner.record.mapWins += winnerMaps;
      result.winner.record.mapLosses += loserMaps;
      result.loser.record.mapWins += loserMaps;
      result.loser.record.mapLosses += winnerMaps;

      gameState.results.push({
        week: currentWeek,
        teamA: match.teamA.abbr,
        teamB: match.teamB.abbr,
        winner: result.winner.abbr,
        score: result.score,
      });
    }

    runCpuMoves(gameState);

    const humanMatch = weekMatches.find(
      m => m.teamA === humanTeam || m.teamB === humanTeam
    );
    if (humanMatch && humanMatch.result) {
      showMatchToast(humanMatch.result, humanTeam);
    }

    setGameState(prev => ({
      ...prev,
      currentWeek: prev.currentWeek + 1,
    }));
  }

  // ── Bracket advancement ──
  function advanceBracketStageHandler() {
    if (!bracket || bracket.stage >= 7) return;
    const updated = advanceBracketStage(bracket);
    setBracket(updated);

    const humanMatch = findHumanBracketMatch(updated, humanTeam);
    if (humanMatch && humanMatch.result) {
      showMatchToast(humanMatch.result, humanTeam);
    }
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
    const matches = (stageMatches[b.stage] || []).flat();
    return matches.find(m =>
      m.result && (m.teamA === team || m.teamB === team)
    ) || null;
  }

  // ── Roster actions ──
  function signPlayer(player) {
    if (humanTeam.rosterFull) return;
    humanTeam.addPlayer(player);
    setGameState(prev => ({
      ...prev,
      freeAgents: prev.freeAgents.filter(p => p !== player),
    }));
  }

  function releasePlayer(player) {
    humanTeam.removePlayer(player);
    setGameState(prev => ({
      ...prev,
      freeAgents: [...prev.freeAgents, player],
    }));
  }

  // ── View rendering ──
  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard gameState={gameState} humanTeam={humanTeam} />;
      case 'schedule':
        return <Schedule gameState={gameState} />;
      case 'roster':
        return <Roster team={humanTeam} onRelease={releasePlayer} />;
      case 'freeagents':
        return (
          <FreeAgents
            freeAgents={gameState.freeAgents}
            canSign={!humanTeam.rosterFull}
            onSign={signPlayer}
          />
        );
      case 'standings':
        return <Standings teams={gameState.teams} />;
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
