/**
 * Points.jsx — Circuit points leaderboard per region.
 *
 * Shows each team's accumulated circuit points with:
 *   - Total (banked + live unbooked)
 *   - Per-stage breakdown (expandable row)
 *   - Worlds qualification status (once Stage 3 begins)
 *
 * Reads from season.points, season.history, and live stage state.
 */

import { useState, Fragment } from 'react';
import RegionSelector from './RegionSelector.jsx';
import { getPointsBreakdown, getQualificationStatus, compareCircuitRank } from '../engine/qualification.js';

const QUAL_STYLES = {
  qualified_autobid: { label: 'Qualified · Auto-Bid', color: '#ffd166', bg: 'rgba(255, 209, 102, 0.12)' },
  qualified_points: { label: 'Qualified · Points',   color: '#6fe8a8', bg: 'rgba(111, 232, 168, 0.12)' },
  in_contention:    { label: 'In Contention',        color: '#6aa9ff', bg: 'rgba(106, 169, 255, 0.12)' },
  eliminated:       { label: 'Eliminated',           color: '#7a8596', bg: 'rgba(122, 133, 150, 0.1)' },
  not_yet_relevant: { label: '—',                    color: '#6f7d93', bg: 'transparent' },
};

export default function Points({ gameState, viewRegion, onChangeRegion }) {
  const [expanded, setExpanded] = useState(null);
  const regionKey = viewRegion;
  const region = gameState.regions[regionKey];

  const rows = region.teams
    .map(team => {
      const breakdown = getPointsBreakdown(team, regionKey, gameState);
      const status = getQualificationStatus(team, regionKey, gameState);
      return { team, breakdown, status };
    })
    .sort((a, b) => compareCircuitRank(a.team, b.team, regionKey, gameState));

  const showQualColumn = rows.some(r => r.status !== 'not_yet_relevant');

  return (
    <div className="points-page">
      <h2>Circuit Points — {region.name}</h2>
      <RegionSelector current={viewRegion} onChange={(r) => { onChangeRegion(r); setExpanded(null); }} />

      <p className="muted" style={{ fontSize: '0.78rem', margin: '10px 0 18px' }}>
        Accumulated across Stage 1 → International 1 → Stage 2 → International 2 → Stage 3.
        Top 2 auto-bids from Stage 3 + top 2 remaining by points qualify for Worlds.
        Click a row to see point breakdown.
      </p>

      <div style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{
              background: 'rgba(255,255,255,0.04)',
              textAlign: 'left',
              fontSize: '0.68rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#8a98b1',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <th style={{ padding: '10px 12px', width: '44px' }}>#</th>
              <th style={{ padding: '10px 12px' }}>Team</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '80px' }}>Banked</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: '90px' }}>Projected</th>
              {showQualColumn && (
                <th style={{ padding: '10px 12px', width: '170px' }}>Worlds Status</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ team, breakdown, status }, idx) => {
              const isExpanded = expanded === team.abbr;
              const qual = QUAL_STYLES[status];
              return (
                <Fragment key={team.abbr}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : team.abbr)}
                    style={{
                      cursor: 'pointer',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                      fontWeight: team.isHuman ? 600 : 400,
                    }}
                  >
                    <td style={{ padding: '12px', color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px', color: team.color }}>
                      {team.name}
                      {team.isHuman && (
                        <span style={{
                          marginLeft: 8, fontSize: '0.64rem',
                          color: '#6aa9ff', letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}>You</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                      {breakdown.banked}
                    </td>
                    <td style={{
                      padding: '12px', textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: breakdown.projected > breakdown.banked ? '#6fe8a8' : '#e8ecf3',
                    }}>
                      {breakdown.projected}
                      {breakdown.projected > breakdown.banked && (
                        <span style={{ fontSize: '0.68rem', marginLeft: 4, color: '#6fe8a8' }}>
                          (+{breakdown.projected - breakdown.banked})
                        </span>
                      )}
                    </td>
                    {showQualColumn && (
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: qual.color,
                          background: qual.bg,
                          border: `1px solid ${qual.color}33`,
                        }}>
                          {qual.label}
                        </span>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={showQualColumn ? 5 : 4} style={{
                        padding: '0 12px 14px 56px',
                        background: 'rgba(255,255,255,0.03)',
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        {breakdown.lines.length === 0 ? (
                          <div className="muted" style={{ fontSize: '0.78rem', padding: '10px 0' }}>
                            No points earned yet this circuit.
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <tbody>
                              {breakdown.lines.map((line, i) => (
                                <tr key={i}>
                                  <td style={{ padding: '4px 0', color: '#a8b5c9' }}>
                                    {line.label}
                                  </td>
                                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#6fe8a8', fontFamily: "'JetBrains Mono', monospace" }}>
                                    +{line.points}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
