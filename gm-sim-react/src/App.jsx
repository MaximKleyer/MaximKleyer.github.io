/**
 * App.jsx — The root component of the entire application.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT vs VANILLA JS — THE BIG PICTURE
 * ═══════════════════════════════════════════════════════════════
 *
 * VANILLA (what we had):
 *   let gameState = initLeague();          // global variable
 *   function renderRoster() {
 *     document.getElementById('content').innerHTML = `...`;  // wipe & rebuild
 *   }
 *   button.addEventListener('click', () => { ... renderRoster(); });
 *
 * REACT (what we have now):
 *   const [gameState, setGameState] = useState(initLeague);   // tracked state
 *   return <Roster team={humanTeam} />;   // React updates only what changed
 *
 * The key difference: in vanilla, YOU decide when and what to re-render.
 * In React, you just update the data, and React figures out the minimum
 * DOM changes needed. This is called "declarative" rendering.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';

// Game logic (100% unchanged from vanilla)
import { initLeague, getHumanTeam } from './engine/league.js';
import { simulateSeries } from './classes/Match.js';
import { runCpuMoves } from './engine/ai.js';
import { generateBracket, advanceBracketStage } from './engine/bracket.js';

// UI components (these replace the old renderXxx() functions)
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
  // ═══════════════════════════════════════════════════════════
  // STATE — React's replacement for global variables.
  //
  // useState() gives you two things:
  //   1. The current value (gameState, currentView)
  //   2. A setter function to update it (setGameState, setCurrentView)
  //
  // CRITICAL RULE: Never modify state directly.
  //   WRONG:  gameState.currentWeek++
  //   RIGHT:  setGameState({ ...gameState, currentWeek: gameState.currentWeek + 1 })
  //
  // The spread operator ({ ...gameState }) creates a copy.
  // React compares old vs new to know what changed.
  // If you mutate the original, React thinks nothing changed
  // and won't re-render. This is the #1 React beginner mistake.
  // ═══════════════════════════════════════════════════════════

  /**
   * useState(initLeague) — note we pass the FUNCTION, not initLeague().
   * This is called "lazy initialization." React only calls initLeague()
   * once on the very first render, not on every re-render.
   * If we wrote useState(initLeague()), it would regenerate the entire
   * league every time any state changes — wasteful and buggy.
   */
  const [gameState, setGameState] = useState(() => initLeague(0));

  /**
   * Which view/tab is active. This replaces the old `currentView` global
   * and the manual classList.toggle('active') logic in main.js.
   */
  const [currentView, setCurrentView] = useState('dashboard');

  const [toast, setToast] = useState(null);

  const [bracket, setBracket] = useState(null);

  // Derived data — computed from state, not stored separately.
  // In vanilla, you'd call getHumanTeam() inside each render function.
  // In React, you compute it once here and pass it as a "prop" to children.
  const humanTeam = getHumanTeam(gameState);

  // ═══════════════════════════════════════════════════════════
  // GAME ACTIONS — functions that update state.
  //
  // In vanilla JS, these directly mutated the global gameState
  // and then called a render function. In React, they create
  // a NEW state object and call setGameState(), which triggers
  // React to re-render everything that depends on the changed data.
  // ═══════════════════════════════════════════════════════════

  /**
   * Advance the simulation by one week.
   * This is the same logic as the vanilla advanceWeek() in main.js.
   */
  function advanceWeek() {
    // We work on the existing gameState directly for the simulation,
    // then tell React about the changes at the end.
    const { schedule, currentWeek } = gameState;
    const weekMatches = schedule.filter(m => m.week === currentWeek && !m.result);

    if (weekMatches.length === 0) {
      const remaining = schedule.filter(m => !m.result);
      if (remaining.length === 0 && gameState.phase !== 'bracket') {
        // Group stage complete — generate the bracket from standings
        const newBracket = generateBracket(gameState.teams);
        setBracket(newBracket);
        setGameState(prev => ({ ...prev, phase: 'bracket' }));
      }
      return;
    }

    // Simulate each match this week
    for (const match of weekMatches) {
      const result = simulateSeries(match.teamA, match.teamB, 3);
      match.result = result;

      // Update win/loss records
      result.winner.record.wins++;
      result.loser.record.losses++;

      // Figure out map wins for each side
      const winnerMaps = result.score[0] > result.score[1] ? result.score[0] : result.score[1];
      const loserMaps  = result.score[0] > result.score[1] ? result.score[1] : result.score[0];
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

    // CPU teams consider roster moves between weeks
    runCpuMoves(gameState);

    // Check if the human team played this week and show result
    const humanMatch = weekMatches.find(
      m => m.teamA === humanTeam || m.teamB === humanTeam
    );
    if (humanMatch && humanMatch.result) {
      const won = humanMatch.result.winner === humanTeam;
      const opponent = humanMatch.teamA === humanTeam
        ? humanMatch.teamB : humanMatch.teamA;
      const score = humanMatch.result.score;

      setToast({
        message: won
          ? `W ${score[0]}-${score[1]} vs ${opponent.name}`
          : `L ${score[0]}-${score[1]} vs ${opponent.name}`,
        type: won ? 'win' : 'loss',
      });
    }

    // Update state
    setGameState(prev => ({
      ...prev,
      currentWeek: prev.currentWeek + 1,
    }));
  }

  /**
   * Sign a free agent to the human player's team.
   *
   * REACT PATTERN: When you need to update a nested part of state
   * (like removing an element from an array), you create a new array
   * via .filter() rather than using .splice(). This is "immutable updates."
   *
   * VANILLA:  gameState.freeAgents.splice(idx, 1);  // mutates in place
   * REACT:    setGameState(prev => ({
   *             ...prev,
   *             freeAgents: prev.freeAgents.filter(p => p !== player)
   *           }));
   */
  function signPlayer(player) {
    if (humanTeam.rosterFull) return;
    humanTeam.addPlayer(player);
    setGameState(prev => ({
      ...prev,
      freeAgents: prev.freeAgents.filter(p => p !== player),
    }));
  }

  /**
   * Release a player from the human team back to free agency.
   */
  function releasePlayer(player) {
    humanTeam.removePlayer(player);
    setGameState(prev => ({
      ...prev,
      freeAgents: [...prev.freeAgents, player],
    }));
  }

  /**
   * Advance the bracket by one stage.
   * Each click simulates the next round of playoff matches.
   */
  function advanceBracketStageHandler() {
    if (!bracket || bracket.stage >= 7) return;
    const updated = advanceBracketStage(bracket);
    setBracket(updated);

    // Check if human team played and show toast
    const humanMatches = findHumanBracketMatch(updated, humanTeam);
    if (humanMatches) {
      const won = humanMatches.result?.winner === humanTeam;
      const opponent = humanMatches.teamA === humanTeam
        ? humanMatches.teamB : humanMatches.teamA;
      const score = humanMatches.result?.score;
      if (score) {
        setToast({
          message: won
            ? `W ${Math.max(...score)}-${Math.min(...score)} vs ${opponent.name}`
            : `L ${Math.min(...score)}-${Math.max(...score)} vs ${opponent.name}`,
          type: won ? 'win' : 'loss',
        });
      }
    }
  }

   /**
   * Find the human team's match in the matches that just played this stage.
   */
  function findHumanBracketMatch(b, team) {
    // Get the matches from the stage that just completed (b.stage was already incremented)
    const stageMatches = {
      2: b.ubQF,                          // stage 1 just played
      3: [...b.lbR1, ...b.ubSF],          // stage 2 just played
      4: [...b.lbQF, b.ubFinal],          // stage 3 just played
      5: [b.lbSF],                        // stage 4 just played
      6: [b.lbFinal],                     // stage 5 just played
      7: [b.grandFinal],                  // stage 6 just played
    };

    const matches = stageMatches[b.stage] || [];
    const flat = matches.flat();
    return flat.find(m =>
      m.result && (m.teamA === team || m.teamB === team)
    ) || null;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — This is the JSX that React turns into HTML.
  //
  // JSX looks like HTML but it's actually JavaScript.
  // Key differences from HTML:
  //   - className instead of class (because "class" is reserved in JS)
  //   - onClick instead of onclick
  //   - {expressions} for dynamic values instead of string concatenation
  //   - Components are capitalized: <Sidebar /> not <sidebar />
  //
  // VANILLA EQUIVALENT:
  //   This entire return block replaces the index.html <body> content
  //   plus all the innerHTML assignments in every render function.
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="app">
      {/*
        Sidebar component — receives the current view and a way to change it.
        These are called "props" (short for properties). They're how parent
        components pass data DOWN to children. Think of them like function
        arguments.

        VANILLA EQUIVALENT:
          In vanilla, the sidebar buttons had addEventListener('click', ...).
          In React, we pass the setter function as a prop, and the child
          component calls it. Data flows DOWN (props), actions flow UP (callbacks).
      */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentWeek={gameState.currentWeek}
        onAdvanceWeek={advanceWeek}
      />

      {/*
        Main content area — renders the active view.
        renderView() returns a different component based on currentView.

        VANILLA EQUIVALENT:
          This replaces the views{} object lookup + renderFn() call in main.js.
          Instead of wiping innerHTML and rebuilding, React swaps components
          and only updates the DOM nodes that actually changed.
      */}
      <main id="content">
        {renderView()}
      </main>

      {/* Toast notification — only renders when toast state is not null */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
    </div>
  );

  /**
   * Returns the correct component for the active tab.
   *
   * Each component receives only the data it needs as props.
   * Dashboard gets everything; Roster only gets the human team.
   * This is intentional — components should know as little as possible
   * about the rest of the app. It makes them easier to test and reuse.
   */
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
}
