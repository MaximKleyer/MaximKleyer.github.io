/**
 * Schedule.jsx — Match schedule with expandable results.
 *
 * Clicking a completed match's score expands it to show:
 *   - Individual map scores (13-7, 13-10, etc.)
 *   - Per-map player stats (K/D/A/ACS for each player on each map)
 *
 * REACT CONCEPT: Local state for UI-only concerns
 *
 * The "which match is expanded" state lives here, not in App.jsx,
 * because no other component cares about it. This keeps the global
 * state lean and the component self-contained.
 */

import { useState } from 'react';

export default function Schedule({ gameState }) {
  const { schedule, currentWeek } = gameState;

  // Track which match is expanded (by index in the schedule array)
  const [expanded, setExpanded] = useState(null);

  const weeks = [...new Set(schedule.map(m => m.week))].sort((a, b) => a - b);

  function toggleExpand(matchIndex) {
    setExpanded(prev => prev === matchIndex ? null : matchIndex);
  }

  return (
    <>
      <h2>Schedule</h2>

      {weeks.map(week => (
        <div
          key={week}
          className={`week-block ${week < currentWeek ? 'past' : week === currentWeek ? 'current' : 'future'}`}
        >
          <h3>
            Week {week}
            {week === currentWeek && <span className="muted"> ← current</span>}
          </h3>

          <table>
            <thead>
              <tr><th>Grp</th><th>Home</th><th>Away</th><th>Result</th></tr>
            </thead>
            <tbody>
              {schedule
                .filter(m => m.week === week)
                .map((match) => {
                  // Find global index for expand tracking
                  const matchIdx = schedule.indexOf(match);
                  const isExpanded = expanded === matchIdx;
                  const hasResult = !!match.result;

                  return (
                    <>
                      {/* Main row */}
                      <tr key={matchIdx}>
                        <td>{match.group}</td>
                        <td className={hasResult && match.result.winner === match.teamA ? 'match-winner-cell' : ''}>
                          {match.teamA.abbr}
                        </td>
                        <td className={hasResult && match.result.winner === match.teamB ? 'match-winner-cell' : ''}>
                          {match.teamB.abbr}
                        </td>
                        <td>
                          {hasResult ? (
                            <button
                              className="score-expand-btn"
                              onClick={() => toggleExpand(matchIdx)}
                              title="Click to show map details"
                            >
                              {match.result.score[0]}-{match.result.score[1]}
                              <span className="expand-arrow">{isExpanded ? ' ▲' : ' ▼'}</span>
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && hasResult && (
                        <tr key={`${matchIdx}-detail`} className="match-detail-row">
                          <td colSpan="4">
                            <MatchDetail
                              result={match.result}
                              teamA={match.teamA}
                              teamB={match.teamB}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}


/**
 * MatchDetail — Expanded view showing per-map scores and player stats.
 */
function MatchDetail({ result, teamA, teamB }) {
  const [selectedMap, setSelectedMap] = useState(0);

  return (
    <div className="match-detail">
      {/* Map score pills */}
      <div className="map-score-row">
        {result.maps.map((map, i) => {
          const scoreHigh = Math.max(map.roundsA, map.roundsB);
          const scoreLow = Math.min(map.roundsA, map.roundsB);
          const aWon = map.winner === teamA;

          return (
            <button
              key={i}
              className={`map-pill ${selectedMap === i ? 'active' : ''} ${aWon ? 'team-a-won' : 'team-b-won'}`}
              onClick={() => setSelectedMap(i)}
            >
              <span className="map-pill-label">Map {i + 1}</span>
              <span className="map-pill-score">{scoreHigh}-{scoreLow}</span>
              <span className="map-pill-winner">{map.winner.abbr}</span>
            </button>
          );
        })}
      </div>

      {/* Player stats for selected map */}
      <div className="map-stats-container">
        <MapPlayerStats
          map={result.maps[selectedMap]}
          teamA={teamA}
          teamB={teamB}
        />
      </div>
    </div>
  );
}


/**
 * MapPlayerStats — Table of player stats for a single map.
 */
function MapPlayerStats({ map, teamA, teamB }) {
  if (!map.playerStats) return <p className="muted">No player stats available</p>;

  // Group stats by team
  const teamAStats = teamA.roster
    .map(p => map.playerStats[p.id])
    .filter(Boolean)
    .sort((a, b) => b.acs - a.acs);

  const teamBStats = teamB.roster
    .map(p => map.playerStats[p.id])
    .filter(Boolean)
    .sort((a, b) => b.acs - a.acs);

  const StatsTable = ({ stats, teamName, teamColor }) => (
    <div className="map-stats-team">
      <div className="map-stats-team-header">
        <span className="map-stats-color" style={{ background: teamColor }} />
        <span>{teamName}</span>
      </div>
      <table className="map-stats-table">
        <thead>
          <tr>
            <th>Player</th><th>Role</th>
            <th>K</th><th>D</th><th>A</th><th>ACS</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.tag}>
              <td><strong>{s.tag}</strong></td>
              <td>{s.role}</td>
              <td>{s.kills}</td>
              <td>{s.deaths}</td>
              <td>{s.assists}</td>
              <td>{s.acs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="map-stats-grid">
      <StatsTable stats={teamAStats} teamName={teamA.name} teamColor={teamA.color} />
      <StatsTable stats={teamBStats} teamName={teamB.name} teamColor={teamB.color} />
    </div>
  );
}
