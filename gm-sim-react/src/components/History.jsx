/**
 * History.jsx — Browsable archive of the current season's events.
 *
 * Reads from gameState.season.history (populated incrementally as stages,
 * internationals, and worlds complete) and gameState.season.points for the
 * current circuit standings.
 *
 * Layout:
 *   Left rail  — list of events + Season Overview entry
 *   Right pane — detail for the selected entry
 *
 * Detail views by entry type:
 *   'overview'       → circuit-points leaderboard per region (switcher)
 *   'stage'          → per-region standings + bracket top-8 + points awarded
 *   'international'  → champion/runner-up + full 1–8 + points awarded per region
 *   'worlds'         → qualified teams + groups + bracket 1–8 + champion card
 *
 * History is per-save. When a new save begins the history resets.
 */

import { useState } from 'react';
import { REGION_KEYS } from '../data/regions.js';
import RegionSelector from './RegionSelector.jsx';
import MatchCard from './MatchCard.jsx';

/* ─────────────── Shared styles ─────────────── */

const sectionHeader = {
  fontSize: '0.68rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#8a98b1',
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const subHeader = {
  fontSize: '0.62rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#6f7d93',
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: 8,
  marginTop: 16,
};

const card = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.015)',
  overflow: 'hidden',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.86rem',
};

const th = {
  padding: '9px 12px',
  textAlign: 'left',
  fontSize: '0.62rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#8a98b1',
  fontFamily: "'JetBrains Mono', monospace",
  background: 'rgba(255,255,255,0.04)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const td = {
  padding: '9px 12px',
  borderTop: '1px solid rgba(255,255,255,0.04)',
};

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

/* ─────────────── Bracket renderers (read-only, no interactivity) ─────────────── */

/**
 * Regional stage bracket grid. Mirrors the layout in Bracket.jsx but as a
 * read-only view — no match expansion, no click handlers. Reuses the same
 * CSS classes (bracket-grid, bracket-col, bracket-half, round-label, etc.)
 * so it renders identically to the live view.
 *
 * `bracket` is the fullBracket reference stashed in the history entry by
 * snapshotAllBrackets. It carries match objects whose .result fields are
 * frozen after the stage completes.
 */
function StageBracketGrid({ bracket }) {
  if (!bracket) {
    return <div className="muted" style={{ fontSize: '0.82rem' }}>No bracket data.</div>;
  }

  const MC = ({ m, bestOf = 'bo3' }) => {
    if (!m) return <div className="mc-card mc-empty" />;
    return <MatchCard match={m} bestOf={bestOf} clickable={false} />;
  };

  const champion = bracket.grandFinal?.result?.winner || null;

  return (
    <div className="bracket-grid">
      <div className="bracket-col">
        <div className="bracket-half upper">
          <div className="round-label">UB Quarterfinals</div>
          <div className="round-matches">
            <MC m={bracket.ubQF?.[0]} />
            <MC m={bracket.ubQF?.[1]} />
          </div>
        </div>
        <div className="bracket-divider" />
        <div className="bracket-half lower">
          <div className="round-label">LB Round 1</div>
          <div className="round-matches">
            <MC m={bracket.lbR1?.[0]} />
            <MC m={bracket.lbR1?.[1]} />
          </div>
        </div>
      </div>

      <div className="bracket-connectors">
        <div className="bracket-half upper"><div className="connector converge"><svg viewBox="0 0 32 100" preserveAspectRatio="none"><path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /><path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /></svg></div></div>
        <div className="bracket-divider" />
        <div className="bracket-half lower"><div className="connector converge"><svg viewBox="0 0 32 100" preserveAspectRatio="none"><path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /><path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /></svg></div></div>
      </div>

      <div className="bracket-col">
        <div className="bracket-half upper">
          <div className="round-label">UB Semifinals</div>
          <div className="round-matches">
            <MC m={bracket.ubSF?.[0]} />
            <MC m={bracket.ubSF?.[1]} />
          </div>
        </div>
        <div className="bracket-divider" />
        <div className="bracket-half lower">
          <div className="round-label">LB Quarterfinals</div>
          <div className="round-matches">
            <MC m={bracket.lbQF?.[0]} />
            <MC m={bracket.lbQF?.[1]} />
          </div>
        </div>
      </div>

      <div className="bracket-connectors">
        <div className="bracket-half upper"><div className="connector converge"><svg viewBox="0 0 32 100" preserveAspectRatio="none"><path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /><path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /></svg></div></div>
        <div className="bracket-divider" />
        <div className="bracket-half lower"><div className="connector converge"><svg viewBox="0 0 32 100" preserveAspectRatio="none"><path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /><path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /></svg></div></div>
      </div>

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
          <div className="round-matches round-matches-center">
            <MC m={bracket.lbSF} />
          </div>
        </div>
      </div>

      <div className="bracket-connectors">
        <div className="bracket-half upper"><div className="connector straight"><svg viewBox="0 0 32 10" preserveAspectRatio="none"><line x1="0" y1="5" x2="32" y2="5" stroke="var(--border-hover)" strokeWidth="2" /></svg></div></div>
        <div className="bracket-divider" />
        <div className="bracket-half lower"><div className="connector straight"><svg viewBox="0 0 32 10" preserveAspectRatio="none"><line x1="0" y1="5" x2="32" y2="5" stroke="var(--border-hover)" strokeWidth="2" /></svg></div></div>
      </div>

      <div className="bracket-col">
        <div className="bracket-half upper">
          <div className="round-label">UB Final</div>
          <div className="round-matches round-matches-center">
            <MC m={bracket.ubFinal} />
          </div>
        </div>
        <div className="bracket-divider" />
        <div className="bracket-half lower">
          <div className="round-label">LB Final</div>
          <div className="round-matches round-matches-center">
            <MC m={bracket.lbFinal} bestOf="bo5" />
          </div>
        </div>
      </div>

      <div className="bracket-connectors">
        <div className="connector converge"><svg viewBox="0 0 32 100" preserveAspectRatio="none"><path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /><path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" /></svg></div>
      </div>

      <div className="bracket-col grand-final-col">
        <div className="round-label grand-label">Grand Final</div>
        <div className="round-matches round-matches-center">
          <MC m={bracket.grandFinal} bestOf="bo5" />
        </div>
        {champion && (
          <div className="champion-banner">
            <span className="champion-icon">🏆</span>
            <span>{champion.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * International bracket grid — absolute-positioned 5-column layout mirroring
 * International.jsx's IntlBracketGrid. Read-only. Same constants so the
 * layout is pixel-identical.
 */
const I_MW = 200, I_MH = 78, I_GAP = 40;
const I_COL_X = [0, (I_MW + I_GAP), (I_MW + I_GAP) * 2, (I_MW + I_GAP) * 3, (I_MW + I_GAP) * 4];
const I_UB1_TOP = 50, I_UB1_GAP = 24;
const I_UB1_Y = [I_UB1_TOP, I_UB1_TOP + I_MH + I_UB1_GAP, I_UB1_TOP + (I_MH + I_UB1_GAP) * 2, I_UB1_TOP + (I_MH + I_UB1_GAP) * 3];
const I_UB1_C = I_UB1_Y.map(y => y + I_MH / 2);
const I_UBSF_C = [(I_UB1_C[0] + I_UB1_C[1]) / 2, (I_UB1_C[2] + I_UB1_C[3]) / 2];
const I_UBSF_Y = I_UBSF_C.map(c => c - I_MH / 2);
const I_UBF_C = (I_UBSF_C[0] + I_UBSF_C[1]) / 2;
const I_UBF_Y = I_UBF_C - I_MH / 2;
const I_LB1_TOP = I_UB1_Y[3] + I_MH + 60;
const I_LB1_Y = [I_LB1_TOP, I_LB1_TOP + I_MH + 24];
const I_LB1_C = I_LB1_Y.map(y => y + I_MH / 2);
const I_LB3_C = (I_LB1_C[0] + I_LB1_C[1]) / 2;
const I_LB3_Y = I_LB3_C - I_MH / 2;
const I_LBF_Y = I_LB3_Y;
const I_LBF_C = I_LB3_C;
const I_GF_C = (I_UBF_C + I_LBF_C) / 2;
const I_GF_Y = I_GF_C - I_MH / 2;
const I_GRID_W = I_COL_X[4] + I_MW;
const I_GRID_H = I_LB1_Y[1] + I_MH + 40;

function IntlPositionedMatch({ x, y, match, bestOf = 'bo3' }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: I_MW }}>
      <MatchCard match={match} bestOf={bestOf} clickable={false} />
    </div>
  );
}

function IntlRoundLabel({ x, y, children, gold }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: I_MW,
      textAlign: 'center',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: gold ? '0.68rem' : '0.62rem',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: gold ? 'var(--gold, #ffd166)' : '#8a98b1',
      fontWeight: gold ? 600 : 400,
      pointerEvents: 'none',
    }}>{children}</div>
  );
}

function IntlConnectorOverlay() {
  const S = 'rgba(255,255,255,0.15)', SW = 1.5;
  const pair = (y1, y2, ty, lx, rx) => {
    const mx = lx + (rx - lx) / 2;
    return (
      <g stroke={S} strokeWidth={SW} fill="none">
        <path d={`M ${lx} ${y1} H ${mx} V ${ty}`} />
        <path d={`M ${lx} ${y2} H ${mx}`} />
        <path d={`M ${mx} ${ty} H ${rx}`} />
      </g>
    );
  };
  const st = (y, lx, rx) => <path d={`M ${lx} ${y} H ${rx}`} stroke={S} strokeWidth={SW} fill="none" />;
  const c1R = I_COL_X[0] + I_MW, c2L = I_COL_X[1], c2R = I_COL_X[1] + I_MW;
  const c3L = I_COL_X[2], c3R = I_COL_X[2] + I_MW;
  const c4L = I_COL_X[3], c4R = I_COL_X[3] + I_MW, c5L = I_COL_X[4];
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: I_GRID_W, height: I_GRID_H, pointerEvents: 'none' }}>
      {pair(I_UB1_C[0], I_UB1_C[1], I_UBSF_C[0], c1R, c2L)}
      {pair(I_UB1_C[2], I_UB1_C[3], I_UBSF_C[1], c1R, c2L)}
      {pair(I_UBSF_C[0], I_UBSF_C[1], I_UBF_C, c2R, c3L)}
      {st(I_LB1_C[0], c1R, c2L)}
      {st(I_LB1_C[1], c1R, c2L)}
      {pair(I_LB1_C[0], I_LB1_C[1], I_LB3_C, c2R, c3L)}
      {st(I_LB3_C, c3R, c4L)}
      {pair(I_UBF_C, I_LBF_C, I_GF_C, c4R, c5L)}
    </svg>
  );
}

function InternationalBracketGrid({ bracket }) {
  if (!bracket) {
    return <div className="muted" style={{ fontSize: '0.82rem' }}>No bracket data.</div>;
  }
  const champion = bracket.grandFinal?.result?.winner || null;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ position: 'relative', width: I_GRID_W, height: I_GRID_H }}>
        <IntlConnectorOverlay />

        <IntlRoundLabel x={I_COL_X[0]} y={I_UB1_Y[0] - 28}>UB Round 1</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[1]} y={I_UBSF_Y[0] - 28}>UB Semifinals</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[2]} y={I_UBF_Y - 28}>UB Final</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[4]} y={I_GF_Y - 28} gold>Grand Final</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[0]} y={I_LB1_Y[0] - 28}>LB Round 1</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[1]} y={I_LB1_Y[0] - 28}>LB Round 2</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[2]} y={I_LB3_Y - 28}>LB Round 3</IntlRoundLabel>
        <IntlRoundLabel x={I_COL_X[3]} y={I_LBF_Y - 28}>LB Final</IntlRoundLabel>

        <IntlPositionedMatch x={I_COL_X[0]} y={I_UB1_Y[0]} match={bracket.ubR1?.[0]} />
        <IntlPositionedMatch x={I_COL_X[0]} y={I_UB1_Y[1]} match={bracket.ubR1?.[1]} />
        <IntlPositionedMatch x={I_COL_X[0]} y={I_UB1_Y[2]} match={bracket.ubR1?.[2]} />
        <IntlPositionedMatch x={I_COL_X[0]} y={I_UB1_Y[3]} match={bracket.ubR1?.[3]} />
        <IntlPositionedMatch x={I_COL_X[1]} y={I_UBSF_Y[0]} match={bracket.ubSF?.[0]} />
        <IntlPositionedMatch x={I_COL_X[1]} y={I_UBSF_Y[1]} match={bracket.ubSF?.[1]} />
        <IntlPositionedMatch x={I_COL_X[2]} y={I_UBF_Y} match={bracket.ubFinal} />
        <IntlPositionedMatch x={I_COL_X[0]} y={I_LB1_Y[0]} match={bracket.lbR1?.[0]} />
        <IntlPositionedMatch x={I_COL_X[0]} y={I_LB1_Y[1]} match={bracket.lbR1?.[1]} />
        <IntlPositionedMatch x={I_COL_X[1]} y={I_LB1_Y[0]} match={bracket.lbR2?.[0]} />
        <IntlPositionedMatch x={I_COL_X[1]} y={I_LB1_Y[1]} match={bracket.lbR2?.[1]} />
        <IntlPositionedMatch x={I_COL_X[2]} y={I_LB3_Y} match={bracket.lbR3} />
        <IntlPositionedMatch x={I_COL_X[3]} y={I_LBF_Y} match={bracket.lbFinal} bestOf="bo5" />
        <IntlPositionedMatch x={I_COL_X[4]} y={I_GF_Y} match={bracket.grandFinal} bestOf="bo5" />

        {champion && (
          <div style={{
            position: 'absolute', left: I_COL_X[4], top: I_GF_Y + I_MH + 16,
            width: I_MW, textAlign: 'center',
            padding: '10px 12px',
            background: 'rgba(255, 209, 102, 0.08)',
            border: '1px solid rgba(255, 209, 102, 0.35)',
            borderRadius: 8,
            color: 'var(--gold, #ffd166)',
            fontFamily: "'Sora', 'DM Sans', sans-serif",
            fontWeight: 700, fontSize: '0.9rem',
          }}>
            🏆 {champion.name}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Left rail ─────────────── */

function EventList({ history, selectedKey, onSelect, circuitComplete }) {
  // Build entries in chronological order (history is already chronological)
  const entries = [
    { key: 'overview', label: 'Season Overview', type: 'overview' },
    ...history
      .filter(e => !e.placeholder)
      .map((e, i) => ({
        key: `${e.type}-${e.slotIndex}`,
        label: e.name,
        type: e.type,
        entry: e,
      })),
  ];

  return (
    <nav style={{
      ...card,
      width: 220,
      flexShrink: 0,
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        fontSize: '0.66rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#8a98b1',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        Events
      </div>
      {entries.map(e => {
        const isSelected = e.key === selectedKey;
        return (
          <button
            key={e.key}
            onClick={() => onSelect(e.key)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              border: 'none',
              background: isSelected ? 'rgba(106, 169, 255, 0.08)' : 'transparent',
              color: isSelected ? '#e8ecf3' : '#a8b5c9',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              borderLeft: isSelected ? '2px solid #6aa9ff' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.84rem',
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            {e.label}
            {e.type !== 'overview' && (
              <div style={{
                fontSize: '0.6rem',
                color: '#6f7d93',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: 2,
              }}>
                {e.type}
              </div>
            )}
          </button>
        );
      })}
      {circuitComplete && (
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: '0.68rem',
          color: 'var(--gold, #ffd166)',
          textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em',
        }}>
          🏆 CIRCUIT COMPLETE
        </div>
      )}
    </nav>
  );
}

/* ─────────────── Detail: Season Overview ─────────────── */

function SeasonOverview({ gameState }) {
  const [viewRegion, setViewRegion] = useState(gameState.humanRegion);
  const region = gameState.regions[viewRegion];

  const rows = region.teams.map(team => {
    const total = gameState.season.points[`${viewRegion}:${team.abbr}`] || 0;
    return { team, total };
  }).sort((a, b) => b.total - a.total);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Circuit Points — {region.name}</h3>
      <RegionSelector current={viewRegion} onChange={setViewRegion} />

      <div style={{ marginTop: 14, ...card }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 44 }}>#</th>
              <th style={th}>Team</th>
              <th style={{ ...th, textAlign: 'right', width: 80 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ team, total }, idx) => (
              <tr key={team.abbr} style={{
                fontWeight: team.isHuman ? 600 : 400,
              }}>
                <td style={{ ...td, color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                  {idx + 1}
                </td>
                <td style={{ ...td, color: team.color }}>
                  {team.name}
                  {team.isHuman && (
                    <span style={{
                      marginLeft: 6, fontSize: '0.6rem', color: '#6aa9ff',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>You</span>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  {total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────── Detail: Stage ─────────────── */

function StageDetail({ entry, gameState }) {
  const [viewRegion, setViewRegion] = useState(gameState.humanRegion);
  const frozen = entry.frozenStandings?.[viewRegion];
  const bracket = entry.bracketResults?.[viewRegion];
  const points = entry.pointsAwarded?.[viewRegion] || [];

  const pointsSorted = [...points].sort((a, b) => a.placement - b.placement);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{entry.name}</h3>
      <RegionSelector current={viewRegion} onChange={setViewRegion} />

      {bracket?.champion && (
        <>
          <div style={subHeader}>Champion</div>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255, 209, 102, 0.08)',
            border: '1px solid rgba(255, 209, 102, 0.3)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <span style={{ color: bracket.champion.color, fontWeight: 700, fontSize: '1rem' }}>
              {bracket.champion.name}
            </span>
            {bracket.runnerUp && (
              <span style={{ marginLeft: 'auto', color: '#8a98b1', fontSize: '0.82rem' }}>
                over <span style={{ color: bracket.runnerUp.color }}>{bracket.runnerUp.name}</span>
              </span>
            )}
          </div>
        </>
      )}

      <div style={subHeader}>Final Placements + Points Earned</div>
      <div style={card}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 44 }}>#</th>
              <th style={th}>Team</th>
              <th style={{ ...th, textAlign: 'right', width: 80 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {pointsSorted.map(row => (
              <tr key={row.abbr}>
                <td style={{ ...td, color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                  {row.placement}
                </td>
                <td style={{ ...td, color: row.color, fontWeight: 600 }}>{row.name}</td>
                <td style={{
                  ...td, textAlign: 'right',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: row.points > 0 ? '#6fe8a8' : '#6f7d93',
                }}>
                  {row.points > 0 ? `+${row.points}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bracket?.fullBracket && (
        <>
          <div style={subHeader}>Playoff Bracket</div>
          <StageBracketGrid bracket={bracket.fullBracket} />
        </>
      )}

      {frozen && (
        <>
          <div style={subHeader}>Group Stage Final Standings</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['A', 'B'].map(grp => (
              <div key={grp} style={card}>
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  fontSize: '0.64rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#8a98b1',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Group {grp}
                </div>
                <table style={table}>
                  <tbody>
                    {(frozen[grp] || []).map((team, i) => (
                      <tr key={team.abbr}>
                        <td style={{ ...td, color: '#6f7d93', width: 32, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
                          {i + 1}
                        </td>
                        <td style={{ ...td, color: team.color, fontWeight: team.isHuman ? 600 : 400 }}>
                          {team.name}
                        </td>
                        <td style={{ ...td, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.74rem', color: '#a8b5c9' }}>
                          {team.record.wins}-{team.record.losses}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────── Detail: International ─────────────── */

function InternationalDetail({ entry, gameState }) {
  const [viewRegion, setViewRegion] = useState(gameState.humanRegion);
  const points = entry.pointsAwarded?.[viewRegion] || [];
  const pointsSorted = [...points].sort((a, b) => a.placement - b.placement);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{entry.name}</h3>

      {entry.champion && (
        <>
          <div style={subHeader}>Champion</div>
          <div style={{
            padding: '14px 18px',
            background: 'rgba(255, 209, 102, 0.1)',
            border: '1px solid rgba(255, 209, 102, 0.35)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <span style={{ color: entry.champion.color, fontWeight: 700, fontSize: '1.1rem' }}>
              {entry.champion.name}
            </span>
            {entry.runnerUp && (
              <span style={{ marginLeft: 'auto', color: '#8a98b1', fontSize: '0.85rem' }}>
                over <span style={{ color: entry.runnerUp.color }}>{entry.runnerUp.name}</span>
              </span>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <div style={{ ...subHeader, margin: 0 }}>Points Awarded</div>
          <RegionSelector current={viewRegion} onChange={setViewRegion} />
        </div>
        {pointsSorted.length === 0 ? (
          <div style={{ color: '#6f7d93', fontSize: '0.82rem', fontStyle: 'italic' }}>
            No teams from {gameState.regions[viewRegion].name} participated.
          </div>
        ) : (
          <div style={card}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 44 }}>#</th>
                  <th style={th}>Team</th>
                  <th style={{ ...th, textAlign: 'right', width: 80 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {pointsSorted.map(row => (
                  <tr key={row.abbr}>
                    <td style={{ ...td, color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                      {row.placement}
                    </td>
                    <td style={{ ...td, color: row.color, fontWeight: 600 }}>{row.name}</td>
                    <td style={{
                      ...td, textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: row.points > 0 ? '#6fe8a8' : '#6f7d93',
                    }}>
                      {row.points > 0 ? `+${row.points}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {entry.selectionShow && entry.selectionShow.picks?.length > 0 && (
        <>
          <div style={subHeader}>Selection Show</div>
          <div style={card}>
            <table style={table}>
              <tbody>
                {entry.selectionShow.picks.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...td, color: '#6f7d93', width: 36, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
                      #{p.order}
                    </td>
                    <td style={{ ...td, color: p.picker.color, fontWeight: 600 }}>
                      {p.picker.name}
                    </td>
                    <td style={{ ...td, color: '#6f7d93', width: 60 }}>picked</td>
                    <td style={{ ...td, color: p.picked.color, fontWeight: 600 }}>
                      {p.picked.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {entry.bracket && (
        <>
          <div style={subHeader}>Playoff Bracket</div>
          <InternationalBracketGrid bracket={entry.bracket} />
        </>
      )}
    </div>
  );
}

/* ─────────────── Detail: Worlds ─────────────── */

function WorldsDetail({ entry, gameState }) {
  const finalPlacements = [...(entry.bracketPlacements || [])]
    .sort((a, b) => a.placement - b.placement);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{entry.name}</h3>

      {entry.champion && (
        <>
          <div style={subHeader}>World Champion</div>
          <div style={{
            padding: '18px 22px',
            background: 'rgba(255, 209, 102, 0.12)',
            border: '1px solid rgba(255, 209, 102, 0.45)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: '1.8rem' }}>🏆</span>
            <span style={{ color: entry.champion.color, fontWeight: 700, fontSize: '1.3rem' }}>
              {entry.champion.name}
            </span>
            {entry.runnerUp && (
              <span style={{ marginLeft: 'auto', color: '#8a98b1', fontSize: '0.9rem' }}>
                over <span style={{ color: entry.runnerUp.color, fontWeight: 600 }}>
                  {entry.runnerUp.name}
                </span>
              </span>
            )}
          </div>
        </>
      )}

      {finalPlacements.length > 0 && (
        <>
          <div style={subHeader}>Final Standings (1–8)</div>
          <div style={card}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 44 }}>#</th>
                  <th style={th}>Team</th>
                </tr>
              </thead>
              <tbody>
                {finalPlacements.map(p => (
                  <tr key={p.abbr}>
                    <td style={{ ...td, color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.placement}
                    </td>
                    <td style={{ ...td, color: p.color, fontWeight: 600 }}>{p.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {entry.groups && (
        <>
          <div style={subHeader}>Group Stage Results</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {Object.keys(entry.groups).map(gk => {
              const g = entry.groups[gk];
              return (
                <div key={gk} style={{ ...card, padding: '10px 14px' }}>
                  <div style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#8a98b1',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 6,
                  }}>
                    Group {gk}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: '#6fe8a8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Advanced
                  </div>
                  {(g.advanced || []).map(c => (
                    <div key={c.abbr} style={{ color: c.color, fontSize: '0.84rem', fontWeight: 600, padding: '1px 0' }}>
                      {c.name}
                    </div>
                  ))}
                  <div style={{ fontSize: '0.58rem', color: '#7a8596', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>
                    Eliminated
                  </div>
                  {(g.eliminated || []).map(c => (
                    <div key={c.abbr} style={{ color: '#7a8596', fontSize: '0.78rem', padding: '1px 0' }}>
                      {c.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {entry.qualified && (
        <>
          <div style={subHeader}>Qualified Teams by Region</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
            {REGION_KEYS.map(rk => {
              const seeds = entry.qualified[rk] || [];
              if (seeds.length === 0) return null;
              return (
                <div key={rk} style={{ ...card, padding: '8px 12px' }}>
                  <div style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#8a98b1',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: 6,
                  }}>
                    {gameState.regions[rk].name}
                  </div>
                  {seeds.map((c, i) => (
                    <div key={c.abbr} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '2px 0',
                      fontSize: '0.78rem',
                    }}>
                      <span style={{ color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.66rem', width: 14 }}>
                        {i + 1}
                      </span>
                      <span style={{ color: c.color, fontWeight: 600 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────── Main component ─────────────── */

export default function History({ gameState }) {
  const history = gameState.season.history || [];
  const circuitComplete = gameState.season.status === 'complete';

  // Default selection: most recent event if any, else overview
  const mostRecent = history.filter(e => !e.placeholder).slice(-1)[0];
  const defaultKey = mostRecent
    ? `${mostRecent.type}-${mostRecent.slotIndex}`
    : 'overview';

  const [selectedKey, setSelectedKey] = useState(defaultKey);

  // Resolve selected entry
  let detail = null;
  if (selectedKey === 'overview') {
    detail = <SeasonOverview gameState={gameState} />;
  } else {
    const found = history.find(e => `${e.type}-${e.slotIndex}` === selectedKey);
    if (found) {
      if (found.type === 'stage') detail = <StageDetail entry={found} gameState={gameState} />;
      else if (found.type === 'international') detail = <InternationalDetail entry={found} gameState={gameState} />;
      else if (found.type === 'worlds') detail = <WorldsDetail entry={found} gameState={gameState} />;
    }
  }

  return (
    <div>
      <h2>History</h2>
      <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 18 }}>
        Browse completed events from this circuit. Data persists until you
        start a new save.
      </p>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <EventList
          history={history}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          circuitComplete={circuitComplete}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {detail || (
            <div className="empty-state">
              <p>Nothing to show yet — play through some events first.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
