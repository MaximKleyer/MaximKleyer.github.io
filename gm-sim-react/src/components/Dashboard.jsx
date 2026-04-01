/**
 * Dashboard.jsx — The "home" view showing a summary of everything.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Declarative Rendering
 * ═══════════════════════════════════════════════════════════════
 *
 * VANILLA:
 *   function renderDashboard() {
 *     const el = document.getElementById('content');
 *     el.innerHTML = `<h2>Dashboard</h2><p>${team.name}</p>`;
 *   }
 *   // Must be called manually whenever data changes.
 *
 * REACT:
 *   function Dashboard({ humanTeam }) {
 *     return <h2>Dashboard</h2><p>{humanTeam.name}</p>;
 *   }
 *   // Re-renders automatically when humanTeam changes.
 *
 * The key insight: you describe the UI as a function of data.
 * Same data → same output, every time. React handles the when.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { getGroupStandings } from '../engine/standings.js';

export default function Dashboard({ gameState, humanTeam }) {
  // Get standings for the human team's group
  const groupStandings = getGroupStandings(gameState.teams, humanTeam.group);

  // Find the next upcoming match for the human team
  const nextMatch = gameState.schedule.find(
    m => !m.result && (m.teamA === humanTeam || m.teamB === humanTeam)
  );

  return (
    <>
      {/*
        <> and </> are "fragments" — they let you return multiple
        elements without adding an extra <div> wrapper to the DOM.
        In vanilla, you'd just concatenate strings. In React, every
        component must return a single root element, and fragments
        give you that without polluting the HTML structure.
      */}
      <h2>Dashboard</h2>
      <p className="muted">
        Week {gameState.currentWeek} &middot; {gameState.phase} stage
      </p>

      <div className="dashboard-grid">
        {/* Team info card */}
        <div className="card">
          <h3>Your Team</h3>
          <p><strong>{humanTeam.name}</strong> ({humanTeam.abbr})</p>
          <p>Group {humanTeam.group}</p>
          <p>Record: {humanTeam.recordStr}</p>
          <p>Map Diff: {humanTeam.mapDiff > 0 ? '+' : ''}{humanTeam.mapDiff}</p>
          <p>Team OVR: {humanTeam.overallRating}</p>
        </div>

        {/* Next match card */}
        <div className="card">
          <h3>Next Match</h3>
          {nextMatch ? (
            // Ternary in JSX — React's version of if/else for rendering.
            // {condition ? <ShowThis /> : <ShowThat />}
            <p>
              Week {nextMatch.week}:&nbsp;
              <strong>{nextMatch.teamA.abbr}</strong> vs&nbsp;
              <strong>{nextMatch.teamB.abbr}</strong>
            </p>
          ) : (
            <p className="muted">No upcoming matches</p>
          )}
        </div>

        {/* Roster summary card */}
        <div className="card">
          <h3>Roster ({humanTeam.roster.length}/5)</h3>
          {humanTeam.roster.map(player => (
            <p key={player.id}>
              <strong>{player.tag}</strong>
              <span className="muted"> — {player.role} — {player.overall} OVR</span>
            </p>
          ))}
        </div>

        {/* Group standings card */}
        <div className="card">
          <h3>Group {humanTeam.group} Standings</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Team</th><th>W-L</th></tr>
            </thead>
            <tbody>
              {groupStandings.map((team, i) => (
                <tr key={team.abbr} className={team.isHuman ? 'highlight' : ''}>
                  <td>{i + 1}</td>
                  <td>{team.abbr}</td>
                  <td>{team.recordStr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
