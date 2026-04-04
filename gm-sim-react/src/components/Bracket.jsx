/**
 * Bracket.jsx — Double elimination bracket.
 *
 * UPDATED:
 *   - Winner row uses team color + bright text, loser is dimmed
 *   - Clicking a completed match expands to show per-map stats
 */

import { useState } from 'react';
import { getStageName, getChampion } from '../engine/bracket.js';
import MatchCard from './MatchCard.jsx';

// /* ── Shared ──────────────────────────────────────────────────── */
// function formatMapScores(result) {
//   if (!result || !result.maps) return [];
//   return result.maps.map(m => `${Math.max(m.roundsA, m.roundsB)}-${Math.min(m.roundsA, m.roundsB)}`);
// }

// /* ── Match Card ──────────────────────────────────────────────── */
// function MatchCard({ match, bestOf = 'bo3', isExpanded, onToggle }) {
//   if (!match) return <div className="match-card empty" />;
//   const { teamA, teamB, result } = match;

//   let scoreA = null, scoreB = null, aWon = null, bWon = null;
//   if (result) {
//     if (result.winner === teamA) {
//       scoreA = Math.max(result.score[0], result.score[1]);
//       scoreB = Math.min(result.score[0], result.score[1]);
//       aWon = true; bWon = false;
//     } else {
//       scoreB = Math.max(result.score[0], result.score[1]);
//       scoreA = Math.min(result.score[0], result.score[1]);
//       aWon = false; bWon = true;
//     }
//   }

//   const TeamRow = ({ team, score, isWinner }) => (
//     <div className={`match-team ${isWinner === true ? 'bracket-winner' : ''} ${isWinner === false ? 'bracket-loser' : ''}`}>
//       <span className="team-color" style={{ background: team?.color || '#333' }} />
//       <span className="team-name">{team?.abbr || 'TBD'}</span>
//       <span className="team-score">{score ?? '-'}</span>
//     </div>
//   );

//   const mapScores = formatMapScores(result);

//   return (
//     <div className={`match-card ${result ? 'clickable' : ''}`} onClick={() => result && onToggle?.()}>
//       <TeamRow team={teamA} score={scoreA} isWinner={aWon} />
//       <TeamRow team={teamB} score={scoreB} isWinner={bWon} />
//       {mapScores.length > 0 && (
//         <div className="match-map-scores">
//           {mapScores.map((s, i) => (
//             <span key={i} className="map-score-pill">M{i + 1}: {s}</span>
//           ))}
//         </div>
//       )}
//       <span className="match-format">{bestOf}</span>
//     </div>
//   );
// }

/* ── Match Detail Popup (shows player stats per map) ─────────── */
function BracketMatchDetail({ match }) {
  const [selectedMap, setSelectedMap] = useState(0);
  if (!match?.result) return null;

  const { result, teamA, teamB } = match;
  const map = result.maps[selectedMap];

  const aIds = map.rosterAIds || [];
  const bIds = map.rosterBIds || [];
  const aStats = aIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  const bStats = bIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);

  return (
    <div className="bracket-detail-popup">
      <div className="bracket-detail-header">
        <strong>{teamA.abbr}</strong> vs <strong>{teamB.abbr}</strong>
        <span className="muted"> — {result.score[0]}-{result.score[1]}</span>
      </div>

      {/* Map pills */}
      <div className="map-score-row">
        {result.maps.map((m, i) => {
          const high = Math.max(m.roundsA, m.roundsB);
          const low = Math.min(m.roundsA, m.roundsB);
          return (
            <button key={i}
              className={`map-pill ${selectedMap === i ? 'active' : ''} ${m.winner === teamA ? 'team-a-won' : 'team-b-won'}`}
              onClick={(e) => { e.stopPropagation(); setSelectedMap(i); }}>
              <span className="map-pill-label">Map {i + 1}</span>
              <span className="map-pill-score">{high}-{low}</span>
              <span className="map-pill-winner">{m.winner.abbr}</span>
            </button>
          );
        })}
      </div>

      {/* Stats tables */}
      <div className="map-stats-grid">
        <StatsTable stats={aStats} teamName={teamA.name} teamColor={teamA.color} />
        <StatsTable stats={bStats} teamName={teamB.name} teamColor={teamB.color} />
      </div>
    </div>
  );
}

function StatsTable({ stats, teamName, teamColor }) {
  return (
    <div className="map-stats-team">
      <div className="map-stats-team-header">
        <span className="map-stats-color" style={{ background: teamColor }} />
        <span>{teamName}</span>
      </div>
      <table className="map-stats-table">
        <thead><tr><th>Player</th><th>Role</th><th>K</th><th>D</th><th>A</th><th>ACS</th></tr></thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.id || s.tag}>
              <td><strong>{s.tag}</strong></td><td>{s.role}</td>
              <td>{s.kills}</td><td>{s.deaths}</td><td>{s.assists}</td><td>{s.acs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── SVG Connectors ──────────────────────────────────────────── */
function Connector({ type = 'straight' }) {
  if (type === 'converge') {
    return (
      <div className="connector converge">
        <svg viewBox="0 0 32 100" preserveAspectRatio="none">
          <path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" />
          <path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }
  if (type === 'straight') {
    return (
      <div className="connector straight">
        <svg viewBox="0 0 32 10" preserveAspectRatio="none">
          <line x1="0" y1="5" x2="32" y2="5" stroke="var(--border-hover)" strokeWidth="2" />
        </svg>
      </div>
    );
  }
  return null;
}

/* ── Main Bracket ────────────────────────────────────────────── */
export default function Bracket({ gameState, bracket, onAdvanceBracket }) {
  // Track which match is expanded for detail view
  const [expandedMatch, setExpandedMatch] = useState(null);

  if (gameState.phase === 'group') {
    const remaining = gameState.schedule.filter(m => !m.result).length;
    return (
      <><h2>Bracket</h2>
        <div className="empty-state">
          <p>The bracket will be revealed after group play ends.</p>
          <p className="muted">{remaining} group match{remaining !== 1 ? 'es' : ''} remaining.</p>
        </div>
      </>
    );
  }
  if (!bracket) return <><h2>Bracket</h2><p className="muted">Generating bracket...</p></>;

  const champion = getChampion(bracket);
  const stageName = getStageName(bracket.stage);
  const isFinished = bracket.stage >= 7;

  // Build a flat list of all bracket matches with IDs for expand tracking
  const allMatches = [
    { id: 'ubqf0', match: bracket.ubQF[0] }, { id: 'ubqf1', match: bracket.ubQF[1] },
    { id: 'ubsf0', match: bracket.ubSF[0] }, { id: 'ubsf1', match: bracket.ubSF[1] },
    { id: 'ubf', match: bracket.ubFinal },
    { id: 'lbr0', match: bracket.lbR1[0] }, { id: 'lbr1', match: bracket.lbR1[1] },
    { id: 'lbqf0', match: bracket.lbQF[0] }, { id: 'lbqf1', match: bracket.lbQF[1] },
    { id: 'lbsf', match: bracket.lbSF },
    { id: 'lbf', match: bracket.lbFinal },
    { id: 'gf', match: bracket.grandFinal },
  ];

  function toggleMatch(id) {
    setExpandedMatch(prev => prev === id ? null : id);
  }

  function MC({ id, bestOf = 'bo3' }) {
    const entry = allMatches.find(m => m.id === id);
    return (
      <MatchCard
        match={entry?.match}
        bestOf={bestOf}
        clickable={true}
        onClick={() => setExpandedMatch(prev => prev === id ? null : id)}
      />
    );
  }

  // Find expanded match for detail view
  const expandedEntry = allMatches.find(m => m.id === expandedMatch);

  return (
    <div className="bracket-page">
      <h2>Playoffs — Double Elimination</h2>
      <div className="bracket-controls">
        <p className="muted">
          {isFinished ? `🏆 ${champion.name} wins Champions!` : `Next: ${stageName}`}
        </p>
        {!isFinished && (
          <button className="btn-advance-bracket" onClick={onAdvanceBracket}>Simulate {stageName}</button>
        )}
      </div>

      {/* Hint */}
      <p className="muted" style={{ marginBottom: '16px', fontSize: '0.75rem' }}>
        Click a completed match to view detailed stats
      </p>

      <div className="bracket-grid">
        {/* Col 1: UBQF + LBR1 */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">UB Quarterfinals</div>
            <div className="round-matches"><MC id="ubqf0" /><MC id="ubqf1" /></div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Round 1</div>
            <div className="round-matches"><MC id="lbr0" /><MC id="lbr1" /></div>
          </div>
        </div>

        <div className="bracket-connectors">
          <div className="bracket-half upper"><Connector type="converge" /></div>
          <div className="bracket-divider" />
          <div className="bracket-half lower"><Connector type="converge" /></div>
        </div>

        {/* Col 2: UBSF + LBQF */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">UB Semifinals</div>
            <div className="round-matches"><MC id="ubsf0" /><MC id="ubsf1" /></div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Quarterfinals</div>
            <div className="round-matches"><MC id="lbqf0" /><MC id="lbqf1" /></div>
          </div>
        </div>

        <div className="bracket-connectors">
          <div className="bracket-half upper"><Connector type="converge" /></div>
          <div className="bracket-divider" />
          <div className="bracket-half lower"><Connector type="converge" /></div>
        </div>

        {/* Col 3: empty + LBSF */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">&nbsp;</div>
            <div className="round-matches round-matches-center">
              <div className="bracket-through-line">→</div>
            </div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Semifinal</div>
            <div className="round-matches round-matches-center"><MC id="lbsf" /></div>
          </div>
        </div>

        <div className="bracket-connectors">
          <div className="bracket-half upper"><Connector type="straight" /></div>
          <div className="bracket-divider" />
          <div className="bracket-half lower"><Connector type="straight" /></div>
        </div>

        {/* Col 4: UBF + LBF */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">UB Final</div>
            <div className="round-matches round-matches-center"><MC id="ubf" /></div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Final</div>
            <div className="round-matches round-matches-center"><MC id="lbf" bestOf="bo5" /></div>
          </div>
        </div>

        <div className="bracket-connectors"><Connector type="converge" /></div>

        {/* Col 5: Grand Final */}
        <div className="bracket-col grand-final-col">
          <div className="round-label grand-label">Grand Final</div>
          <div className="round-matches round-matches-center"><MC id="gf" bestOf="bo5" /></div>
          {champion && (
            <div className="champion-banner">
              <span className="champion-icon">🏆</span>
              <span>{champion.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded match detail — shows below the bracket */}
      {expandedEntry?.match?.result && (
        <div className="bracket-detail-container">
          <BracketMatchDetail match={expandedEntry.match} />
        </div>
      )}

      {bracket.eliminated.length > 0 && (
        <div className="eliminated-list">
          <h3>Eliminated</h3>
          <p className="muted">{bracket.eliminated.map(t => t.abbr).join('  ·  ')}</p>
        </div>
      )}
    </div>
  );
}