import { useState } from 'react';
import { getGroupStandings } from '../engine/standings.js';
import { COMPOSITIONS, SUBTYPES } from '../data/strategy.js';
import RegionSelector from './RegionSelector.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import DeltaIndicator from './DeltaIndicator.jsx';

export default function Standings({ regionData, viewRegion, onChangeRegion }) {
  const [expanded, setExpanded] = useState(null);
  const frozen = regionData.frozenStandings;

  function toggleExpand(abbr) { setExpanded(prev => prev === abbr ? null : abbr); }

  function getSubtypeLabel(subtypeId) {
    for (const role of Object.keys(SUBTYPES)) {
      const found = SUBTYPES[role].find(s => s.id === subtypeId);
      if (found) return found.label;
    }
    return '—';
  }

  function renderGroup(group) {
    let standings;
    if (frozen && frozen[group]) {
      standings = frozen[group];
    } else {
      standings = getGroupStandings(regionData.teams, group);
    }
    const rows = [];
    standings.forEach((entry, i) => {
      const isFrozen = !!frozen;
      const team = isFrozen ? regionData.teams.find(t => t.abbr === entry.abbr) : entry;
      const rec = isFrozen ? entry.record : team.record;
      const isExpanded = expanded === entry.abbr;
      const comp = COMPOSITIONS[team?.strategy?.comp];
      const rw = rec.roundWins || 0, rl = rec.roundLosses || 0, rd = rw - rl;
      const md = rec.mapWins - rec.mapLosses;
      const abbr = entry.abbr;

      rows.push(
        <tr key={abbr} className={`standings-row clickable ${(isFrozen ? entry.isHuman : team.isHuman) ? 'highlight' : ''}`} onClick={() => toggleExpand(abbr)}>
          <td>{i + 1}</td>
          <td className="standings-team-col">
            <span className="standings-team-color" style={{ background: isFrozen ? entry.color : team.color }} />
            {isFrozen ? entry.name : team.name} ({abbr})
            <span className="expand-arrow">{isExpanded ? ' ▲' : ' ▼'}</span>
          </td>
          <td>{rec.wins}</td><td>{rec.losses}</td>
          <td>{rec.mapWins}</td><td>{rec.mapLosses}</td>
          <td>{md > 0 ? '+' : ''}{md}</td>
          <td>{rw}</td><td>{rl}</td>
          <td className={rd > 0 ? 'stat-positive' : rd < 0 ? 'stat-negative' : ''}>{rd > 0 ? '+' : ''}{rd}</td>
          <td>{isFrozen ? entry.overallRating : team.overallRating}</td>
        </tr>
      );

      if (isExpanded && team) {
        rows.push(
          <tr key={`${abbr}-detail`} className="team-detail-row">
            <td colSpan="11">
              <div className="team-detail">
                <div className="team-detail-header">
                  <span><strong>Comp:</strong> {comp?.label || 'Default'}</span>
                  {team.igl && <span><strong>IGL:</strong> {team.igl.tag} (IQ: {team.igl.ratings.gamesense})</span>}
                </div>
                <table className="team-detail-table">
                  <thead><tr><th>Player</th><th>Nat</th><th>Age</th><th>Assigned</th><th>Subtype</th><th>OVR</th><th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th><th>Maps</th><th>K</th><th>D</th><th>K/D</th><th>ACS</th></tr></thead>
                  <tbody>
                    {team.roster.map(player => {
                      const a = team.strategy.assignments.find(a => a.playerId === player.id);
                      const d = player.lastOffseasonDelta;
                      return (
                        <tr key={player.id}>
                          <td><strong>{player.tag}</strong>{player.id === team.strategy.iglId && <span className="igl-badge">IGL</span>}</td>
                          <td title={nationalityName(player.nationality)}>
                            <span className={flagClass(player.nationality)} />
                          </td>
                          <td>{player.age}</td>
                          <td>{a?.role || '—'}</td>
                          <td>{a ? getSubtypeLabel(a.subtypeId) : '—'}</td>
                          <td>{player.overall}<DeltaIndicator delta={d?.overall} size="small" /></td>
                          <td>{player.ratings.aim}<DeltaIndicator delta={d?.aim} size="small" /></td>
                          <td>{player.ratings.positioning}<DeltaIndicator delta={d?.positioning} size="small" /></td>
                          <td>{player.ratings.utility}<DeltaIndicator delta={d?.utility} size="small" /></td>
                          <td>{player.ratings.gamesense}<DeltaIndicator delta={d?.gamesense} size="small" /></td>
                          <td>{player.ratings.clutch}<DeltaIndicator delta={d?.clutch} size="small" /></td>
                          <td>{player.stats.maps}</td><td>{player.stats.kills}</td><td>{player.stats.deaths}</td><td>{player.kd}</td><td>{player.avgAcs}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        );
      }
    });
    return rows;
  }

  return (
    <>
      <h2>Standings — {regionData.name}</h2>
      <RegionSelector current={viewRegion} onChange={onChangeRegion} />
      <p className="muted" style={{ marginTop: 12 }}>
        {frozen ? 'Final group stage standings (frozen)' : 'Click a team to view their roster'}
      </p>
      {['A', 'B'].map(group => (
        <div key={group}>
          <h3>Group {group}</h3>
          <div className="standings-table-wrap">
            <table className="standings-table">
              <thead><tr><th>#</th><th className="standings-team-col">Team</th><th>W</th><th>L</th><th>MW</th><th>ML</th><th>M±</th><th>RW</th><th>RL</th><th>R±</th><th>OVR</th></tr></thead>
              <tbody>{renderGroup(group)}</tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
