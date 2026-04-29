import { getGroupStandings } from '../engine/standings.js';
import { getCurrentSlot } from '../engine/season.js';
import { REGIONS } from '../data/regions.js';
import { flagClass } from '../data/nationalities.js';
import DeltaIndicator from './DeltaIndicator.jsx';

export default function Dashboard({ gameState, humanTeam, onStartNewSeason }) {
  const region = gameState.regions[gameState.humanRegion];
  const regionDef = REGIONS[gameState.humanRegion];
  const isPreseason = region.currentWeek === 0;
  const isBracket = !!region.frozenStandings;
  const seasonComplete = gameState.season?.status === 'season-complete';
  const seasonNumber = gameState.seasonNumber || 2025;

  // Phase 6f: mid-season FA window banner. Shown when status='mid-season-fa'
  // with the cap counter, an explanation of which stage starts after, and
  // a hint to navigate to Free Agents to make moves.
  const midseasonActive = gameState.season?.status === 'mid-season-fa';
  const midseasonSlot = midseasonActive ? getCurrentSlot(gameState) : null;
  const midseasonStageNumber = midseasonSlot?.stageNumber;
  const midseasonUsed = humanTeam._midseasonMoves || 0;
  const midseasonMax = 2; // mirror MAX_MIDSEASON_MOVES_PER_SEASON; kept inline to avoid extra import

  // Find the most recent worlds entry to celebrate the world champion.
  // Falls back gracefully if no worlds entry exists yet.
  const lastWorlds = seasonComplete
    ? [...(gameState.season.history || [])].reverse().find(e => e.type === 'worlds')
    : null;

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
        {seasonComplete
          ? `Season ${seasonNumber} complete — start a new season when you're ready`
          : midseasonActive
            ? `Mid-Season FA Window · Stage ${midseasonStageNumber} begins after this`
            : isPreseason
              ? `Preseason — ${regionDef.name} · Make roster moves, then start the season`
              : isBracket
                ? `Playoffs — ${regionDef.name}`
                : `Week ${region.currentWeek} · ${regionDef.name} · ${region.phase} stage`
        }
      </p>

      {midseasonActive && (
        <div style={{
          marginBottom: 24,
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(106, 169, 255, 0.10), rgba(64, 130, 220, 0.05))',
          border: '1px solid rgba(106, 169, 255, 0.35)',
          borderRadius: 12,
        }}>
          <div style={{
            fontSize: '0.66rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#8ab8ff',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8,
          }}>
            💼 Free Agency Window Open
          </div>
          <div style={{
            fontSize: '1rem',
            color: '#e8ecf3',
            marginBottom: 10,
            lineHeight: 1.4,
          }}>
            Stage {midseasonStageNumber} begins after this. You can sign and release players
            before the next stage starts. Mid-season cap: <strong>{midseasonUsed} / {midseasonMax}</strong> signings used.
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: '#8a98b1',
            fontStyle: 'italic',
          }}>
            Visit the Free Agents tab to make signings, or click <strong>Start Stage</strong> in the sidebar when ready.
          </div>
        </div>
      )}

      {seasonComplete && (
        <div style={{
          marginBottom: 24,
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(255, 209, 102, 0.10), rgba(255, 70, 85, 0.06))',
          border: '1px solid rgba(255, 209, 102, 0.35)',
          borderRadius: 12,
        }}>
          <div style={{
            fontSize: '0.66rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--gold, #ffd166)',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 8,
          }}>
            Season {seasonNumber} Complete
          </div>

          {lastWorlds?.champion ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              marginBottom: 18,
            }}>
              <span style={{ fontSize: '2rem' }}>🏆</span>
              <div>
                <div style={{
                  fontSize: '0.66rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#8a98b1',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 2,
                }}>
                  World Champion
                </div>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: lastWorlds.champion.color,
                }}>
                  {lastWorlds.champion.name}
                </div>
                {lastWorlds.runnerUp && (
                  <div style={{ fontSize: '0.78rem', color: '#8a98b1', marginTop: 2 }}>
                    over <span style={{ color: lastWorlds.runnerUp.color, fontWeight: 600 }}>
                      {lastWorlds.runnerUp.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 18, color: '#8a98b1', fontSize: '0.88rem' }}>
              The season has ended.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {onStartNewSeason && (
              <button
                onClick={onStartNewSeason}
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent, #ff4655)',
                  border: '1px solid var(--accent, #ff4655)',
                  color: '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                ▶ Enter Offseason
              </button>
            )}
            <span style={{ fontSize: '0.78rem', color: '#8a98b1', fontStyle: 'italic' }}>
              Browse the History tab to revisit this season's events.
            </span>
          </div>
        </div>
      )}

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
            <p key={p.id}>
              <strong>{p.tag}</strong>
              <span className="muted"> — </span>
              <span className={flagClass(p.nationality)} style={{ marginRight: 4 }} />
              <span className="muted">age {p.age} — {p.overall} OVR</span>
              <DeltaIndicator delta={p.lastOffseasonDelta?.overall} />
            </p>
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
