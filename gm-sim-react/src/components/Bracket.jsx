/**
 * Bracket.jsx — View only (no simulate button). Advancement via sidebar.
 * Added null guards on all bracket data access to prevent crashes.
 */

import { useState } from 'react';
import { getStageName, getChampion } from '../engine/bracket.js';
import { computeLivePlacements } from '../engine/placements.js';
import { findActiveSeriesForMatch } from '../engine/activeSeries.js';
import MatchCard from './MatchCard.jsx';
import RegionSelector from './RegionSelector.jsx';

function BracketMatchDetail({ match }) {
  const [selectedMap, setSelectedMap] = useState(0);
  if (!match?.result?.maps?.length) return null;
  const { result, teamA, teamB } = match;
  const map = result.maps[selectedMap];
  if (!map) return null;
  const aIds = map.rosterAIds || [], bIds = map.rosterBIds || [];
  const aStats = aIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  const bStats = bIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  return (
    <div className="bracket-detail-popup">
      <div className="bracket-detail-header"><strong>{teamA?.abbr}</strong> vs <strong>{teamB?.abbr}</strong><span className="muted"> — {result.score[0]}-{result.score[1]}</span></div>
      <div className="map-score-row">
        {result.maps.map((m, i) => (<button key={i} className={`map-pill ${selectedMap === i ? 'active' : ''} ${m.winner === teamA ? 'team-a-won' : 'team-b-won'}`} onClick={(e) => { e.stopPropagation(); setSelectedMap(i); }}><span className="map-pill-label">Map {i+1}</span><span className="map-pill-score">{Math.max(m.roundsA,m.roundsB)}-{Math.min(m.roundsA,m.roundsB)}</span><span className="map-pill-winner">{m.winner?.abbr}</span></button>))}
      </div>
      <div className="map-stats-grid">
        <ST stats={aStats} name={teamA?.name} color={teamA?.color} />
        <ST stats={bStats} name={teamB?.name} color={teamB?.color} />
      </div>
    </div>
  );
}

function ST({ stats, name, color }) {
  return (
    <div className="map-stats-team">
      <div className="map-stats-team-header"><span className="map-stats-color" style={{ background: color || '#333' }} /><span>{name || 'TBD'}</span></div>
      <table className="map-stats-table"><thead><tr><th>Player</th><th>Role</th><th>K</th><th>D</th><th>A</th><th>ACS</th></tr></thead>
        <tbody>{stats.map(s => (<tr key={s.id||s.tag}><td><strong>{s.tag}</strong></td><td>{s.role}</td><td>{s.kills}</td><td>{s.deaths}</td><td>{s.assists}</td><td>{s.acs}</td></tr>))}</tbody>
      </table>
    </div>
  );
}

function Connector({ type }) {
  if (type === 'converge') return (<div className="connector converge"><svg viewBox="0 0 32 100" preserveAspectRatio="none"><path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /><path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /></svg></div>);
  if (type === 'straight') return (<div className="connector straight"><svg viewBox="0 0 32 10" preserveAspectRatio="none"><line x1="0" y1="5" x2="32" y2="5" stroke="var(--border-hover)" strokeWidth="2" /></svg></div>);
  return null;
}

/**
 * StandingsPanel — right-rail live placement tracker.
 * Shows all 12 teams with current placement, updating as group-stage
 * matches resolve and as bracket teams get eliminated.
 */
function StandingsPanel({ regionData }) {
  if (!regionData) return null;
  const rows = computeLivePlacements(regionData);

  const stateColor = {
    final: '#e8ecf3',
    alive: '#6fe8a8',
    group: '#a8b5c9',
  };
  const stateBg = {
    final: 'transparent',
    alive: 'rgba(111, 232, 168, 0.06)',
    group: 'transparent',
  };

  return (
    <aside style={{
      flex: '0 0 310px',
      alignSelf: 'flex-start',
      marginTop: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      position: 'sticky',
      top: 16,
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.66rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#8a98b1',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        Region Standings
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.team.abbr} style={{
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
              background: stateBg[row.state],
              fontWeight: row.team.isHuman ? 600 : 400,
            }}>
              <td style={{
                padding: '9px 12px',
                width: '96px',
                color: stateColor[row.state],
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
              }}>
                {row.label}
              </td>
              <td style={{
                padding: '9px 10px',
                color: row.team.color,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {row.team.abbr}
              </td>
              <td style={{
                padding: '9px 12px',
                textAlign: 'right',
                color: '#6f7d93',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
              }}>
                {row.record}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  );
}

export default function Bracket({ regionData, viewRegion, onChangeRegion, gameState }) {
  const [expandedMatch, setExpandedMatch] = useState(null);
  const bracket = regionData?.bracket;

  // Group stage — bracket not generated yet
  if (!regionData || regionData.phase === 'group') {
    const remaining = regionData?.schedule?.filter(m => !m.result)?.length ?? 0;
    return (
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>Bracket — {regionData?.name || 'Loading'}</h2>
          <RegionSelector current={viewRegion} onChange={(r) => { onChangeRegion(r); setExpandedMatch(null); }} />
          <div className="empty-state"><p>The bracket will be revealed after group play ends.</p><p className="muted">{remaining} match{remaining !== 1 ? 'es' : ''} remaining.</p></div>
        </div>
        <StandingsPanel regionData={regionData} />
      </div>
    );
  }

  // Bracket exists but might not be fully populated yet — guard everything
  if (!bracket || !bracket.ubQF) {
    return (
      <>
        <h2>Bracket — {regionData.name}</h2>
        <RegionSelector current={viewRegion} onChange={(r) => { onChangeRegion(r); setExpandedMatch(null); }} />
        <p className="muted">Generating bracket...</p>
      </>
    );
  }

  const champion = getChampion(bracket);
  const stageName = getStageName(bracket.stage);
  const isFinished = bracket.stage >= 7;

  // Safely build match list with null checks
  const allMatches = [];
  try {
    if (bracket.ubQF?.[0]) allMatches.push({ id: 'ubqf0', match: bracket.ubQF[0] });
    if (bracket.ubQF?.[1]) allMatches.push({ id: 'ubqf1', match: bracket.ubQF[1] });
    if (bracket.ubSF?.[0]) allMatches.push({ id: 'ubsf0', match: bracket.ubSF[0] });
    if (bracket.ubSF?.[1]) allMatches.push({ id: 'ubsf1', match: bracket.ubSF[1] });
    if (bracket.ubFinal) allMatches.push({ id: 'ubf', match: bracket.ubFinal });
    if (bracket.lbR1?.[0]) allMatches.push({ id: 'lbr0', match: bracket.lbR1[0] });
    if (bracket.lbR1?.[1]) allMatches.push({ id: 'lbr1', match: bracket.lbR1[1] });
    if (bracket.lbQF?.[0]) allMatches.push({ id: 'lbqf0', match: bracket.lbQF[0] });
    if (bracket.lbQF?.[1]) allMatches.push({ id: 'lbqf1', match: bracket.lbQF[1] });
    if (bracket.lbSF) allMatches.push({ id: 'lbsf', match: bracket.lbSF });
    if (bracket.lbFinal) allMatches.push({ id: 'lbf', match: bracket.lbFinal });
    if (bracket.grandFinal) allMatches.push({ id: 'gf', match: bracket.grandFinal });
  } catch (e) {
    console.error('Error building bracket match list:', e);
  }

  function MC({ id, bestOf = 'bo3' }) {
    const entry = allMatches.find(m => m.id === id);
    if (!entry) return <div className="mc-card mc-empty" />;
    const inProgress = gameState ? findActiveSeriesForMatch(gameState, entry.match) : null;
    return <MatchCard
      match={entry.match}
      bestOf={bestOf}
      clickable={true}
      onClick={() => setExpandedMatch(prev => prev === id ? null : id)}
      inProgressSeries={inProgress}
    />;
  }

  const expandedEntry = allMatches.find(m => m.id === expandedMatch);

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      <div className="bracket-page" style={{ flex: 1, minWidth: 0 }}>
        <h2>Playoffs — {regionData.name}</h2>
        <RegionSelector current={viewRegion} onChange={(r) => { onChangeRegion(r); setExpandedMatch(null); }} />

        <div className="bracket-controls" style={{ marginTop: 16 }}>
          <p className="muted">
            {isFinished ? `🏆 ${champion?.name} wins Champions!` : `Next: ${stageName}`}
          </p>
        </div>
        <p className="muted" style={{ marginBottom: 16, fontSize: '0.75rem' }}>
          Click a completed match to view stats · Use Advance Bracket in sidebar
        </p>

        <div className="bracket-grid">
          <div className="bracket-col"><div className="bracket-half upper"><div className="round-label">UB Quarterfinals</div><div className="round-matches"><MC id="ubqf0" /><MC id="ubqf1" /></div></div><div className="bracket-divider" /><div className="bracket-half lower"><div className="round-label">LB Round 1</div><div className="round-matches"><MC id="lbr0" /><MC id="lbr1" /></div></div></div>
          <div className="bracket-connectors"><div className="bracket-half upper"><Connector type="converge" /></div><div className="bracket-divider" /><div className="bracket-half lower"><Connector type="converge" /></div></div>
          <div className="bracket-col"><div className="bracket-half upper"><div className="round-label">UB Semifinals</div><div className="round-matches"><MC id="ubsf0" /><MC id="ubsf1" /></div></div><div className="bracket-divider" /><div className="bracket-half lower"><div className="round-label">LB Quarterfinals</div><div className="round-matches"><MC id="lbqf0" /><MC id="lbqf1" /></div></div></div>
          <div className="bracket-connectors"><div className="bracket-half upper"><Connector type="converge" /></div><div className="bracket-divider" /><div className="bracket-half lower"><Connector type="converge" /></div></div>
          <div className="bracket-col"><div className="bracket-half upper"><div className="round-label">&nbsp;</div><div className="round-matches round-matches-center"><div className="bracket-through-line">→</div></div></div><div className="bracket-divider" /><div className="bracket-half lower"><div className="round-label">LB Semifinal</div><div className="round-matches round-matches-center"><MC id="lbsf" /></div></div></div>
          <div className="bracket-connectors"><div className="bracket-half upper"><Connector type="straight" /></div><div className="bracket-divider" /><div className="bracket-half lower"><Connector type="straight" /></div></div>
          <div className="bracket-col"><div className="bracket-half upper"><div className="round-label">UB Final</div><div className="round-matches round-matches-center"><MC id="ubf" /></div></div><div className="bracket-divider" /><div className="bracket-half lower"><div className="round-label">LB Final</div><div className="round-matches round-matches-center"><MC id="lbf" bestOf="bo5" /></div></div></div>
          <div className="bracket-connectors"><Connector type="converge" /></div>
          <div className="bracket-col grand-final-col"><div className="round-label grand-label">Grand Final</div><div className="round-matches round-matches-center"><MC id="gf" bestOf="bo5" /></div>{champion && <div className="champion-banner"><span className="champion-icon">🏆</span><span>{champion.name}</span></div>}</div>
        </div>

        {expandedEntry?.match?.result && <div className="bracket-detail-container"><BracketMatchDetail match={expandedEntry.match} /></div>}
      </div>
      <StandingsPanel regionData={regionData} />
    </div>
  );
}
