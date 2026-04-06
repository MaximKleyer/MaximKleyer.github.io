import { getGroupStandings } from '../engine/standings.js';
import { REGIONS } from '../data/regions.js';

export default function Dashboard({ gameState, humanTeam }) {
  const region = gameState.regions[gameState.humanRegion];
  const regionDef = REGIONS[gameState.humanRegion];
  const isPreseason = region.currentWeek === 0;
  const isBracket = !!region.frozenStandings;

  let groupStandings;
  if (isBracket && region.frozenStandings[humanTeam.group]) {
    groupStandings = region.frozenStandings[humanTeam.group];
  } else {
    groupStandings = getGroupStandings(region.teams, humanTeam.group);
  }

  const nextMatch = region.schedule.find(
    m => !m.result && (m.teamA === humanTeam || m.teamB === humanTeam)
  );

  return (
    <>
      <h2>Dashboard</h2>
      <p className="muted">
        {isPreseason
          ? `Preseason — ${regionDef.name} · Make roster moves, then start the season`
          : isBracket
            ? `Playoffs — ${regionDef.name}`
            : `Week ${region.currentWeek} · ${regionDef.name} · ${region.phase} stage`
        }
      </p>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Your Team</h3>
          <p><strong>{humanTeam.name}</strong> ({humanTeam.abbr})</p>
          <p>Region: {regionDef.name}</p>
          <p>Group {humanTeam.group}</p>
          <p>Record: {humanTeam.recordStr}</p>
          <p>Map Diff: {humanTeam.mapDiff > 0 ? '+' : ''}{humanTeam.mapDiff}</p>
          <p>Team OVR: {humanTeam.overallRating}</p>
        </div>

        <div className="card">
          <h3>{isPreseason ? 'Season Preview' : isBracket ? 'Playoffs' : 'Next Match'}</h3>
          {isPreseason ? (
            <div>
              <p>Review your roster and sign free agents.</p>
              <p className="muted" style={{ marginTop: 8 }}>Click <strong>▶ Start Season</strong> when ready.</p>
            </div>
          ) : isBracket ? (
            <p className="muted">Check the Bracket tab for playoff matchups.</p>
          ) : nextMatch ? (
            <p>Week {nextMatch.week}: <strong>{nextMatch.teamA.abbr}</strong> vs <strong>{nextMatch.teamB.abbr}</strong></p>
          ) : (
            <p className="muted">No upcoming matches</p>
          )}
        </div>

        <div className="card">
          <h3>Roster ({humanTeam.roster.length}/5)</h3>
          {humanTeam.roster.map(p => (
            <p key={p.id}><strong>{p.tag}</strong><span className="muted"> — {p.role} — {p.overall} OVR</span></p>
          ))}
          {humanTeam.roster.length < 5 && (
            <p style={{ color: 'var(--accent)', marginTop: 8, fontWeight: 600 }}>
              ⚠ Need {5 - humanTeam.roster.length} more player{5 - humanTeam.roster.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="card">
          <h3>Group {humanTeam.group}{isBracket && <span className="muted" style={{ fontSize: '0.7rem' }}> (final)</span>}</h3>
          <table>
            <thead><tr><th>#</th><th>Team</th><th>W-L</th></tr></thead>
            <tbody>
              {groupStandings.map((entry, i) => (
                <tr key={entry.abbr} className={entry.isHuman ? 'highlight' : ''}>
                  <td>{i + 1}</td>
                  <td>{entry.abbr}</td>
                  <td>{entry.record ? `${entry.record.wins}-${entry.record.losses}` : entry.recordStr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
