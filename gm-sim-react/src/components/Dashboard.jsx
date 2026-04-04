/**
 * Dashboard.jsx — Uses frozen standings when in bracket phase.
 */

import { getGroupStandings } from '../engine/standings.js';

export default function Dashboard({ gameState, humanTeam }) {
  const isPreseason = gameState.currentWeek === 0;
  const isBracket = !!gameState.frozenStandings;

  // Use frozen standings if available, otherwise compute live
  let groupStandings;
  if (isBracket && gameState.frozenStandings[humanTeam.group]) {
    groupStandings = gameState.frozenStandings[humanTeam.group];
  } else {
    groupStandings = getGroupStandings(gameState.teams, humanTeam.group);
  }

  const nextMatch = gameState.schedule.find(
    m => !m.result && (m.teamA === humanTeam || m.teamB === humanTeam)
  );

  return (
    <>
      <h2>Dashboard</h2>
      <p className="muted">
        {isPreseason
          ? 'Preseason — Make roster moves, then start the season'
          : isBracket
            ? 'Playoffs — Double Elimination'
            : `Week ${gameState.currentWeek} · ${gameState.phase} stage`
        }
      </p>

      <div className="dashboard-grid">
        {/* Team info */}
        <div className="card">
          <h3>Your Team</h3>
          <p><strong>{humanTeam.name}</strong> ({humanTeam.abbr})</p>
          <p>Group {humanTeam.group}</p>
          <p>Record: {humanTeam.recordStr}</p>
          <p>Map Diff: {humanTeam.mapDiff > 0 ? '+' : ''}{humanTeam.mapDiff}</p>
          <p>Team OVR: {humanTeam.overallRating}</p>
        </div>

        {/* Next match / phase info */}
        <div className="card">
          <h3>{isPreseason ? 'Season Preview' : isBracket ? 'Playoffs' : 'Next Match'}</h3>
          {isPreseason ? (
            <div>
              <p>Review your roster and sign free agents.</p>
              <p className="muted" style={{ marginTop: '8px' }}>
                Click <strong>▶ Start Season</strong> when ready.
              </p>
            </div>
          ) : isBracket ? (
            <p className="muted">Check the Bracket tab for playoff matchups.</p>
          ) : nextMatch ? (
            <p>
              Week {nextMatch.week}:&nbsp;
              <strong>{nextMatch.teamA.abbr}</strong> vs&nbsp;
              <strong>{nextMatch.teamB.abbr}</strong>
            </p>
          ) : (
            <p className="muted">No upcoming matches</p>
          )}
        </div>

        {/* Roster */}
        <div className="card">
          <h3>Roster ({humanTeam.roster.length}/5)</h3>
          {humanTeam.roster.map(player => (
            <p key={player.id}>
              <strong>{player.tag}</strong>
              <span className="muted"> — {player.role} — {player.overall} OVR</span>
            </p>
          ))}
          {humanTeam.roster.length < 5 && (
            <p style={{ color: 'var(--accent)', marginTop: '8px', fontWeight: 600 }}>
              ⚠ Need {5 - humanTeam.roster.length} more player{5 - humanTeam.roster.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Standings */}
        <div className="card">
          <h3>
            Group {humanTeam.group} Standings
            {isBracket && <span className="muted" style={{ fontSize: '0.7rem' }}> (final)</span>}
          </h3>
          <table>
            <thead>
              <tr><th>#</th><th>Team</th><th>W-L</th></tr>
            </thead>
            <tbody>
              {groupStandings.map((entry, i) => {
                // Frozen entries have abbr/name/record; live entries are team objects
                const abbr = entry.abbr;
                const isHuman = entry.isHuman ?? entry.isHuman;
                const rec = entry.record ?? entry.record;

                return (
                  <tr key={abbr} className={isHuman ? 'highlight' : ''}>
                    <td>{i + 1}</td>
                    <td>{abbr}</td>
                    <td>{rec.wins}-{rec.losses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
