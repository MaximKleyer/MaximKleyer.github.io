/**
 * International.jsx — International tournament view.
 *
 * Reuses the same visual language as Schedule (MatchCard grid w/ series
 * score + per-map scores) and the regional Bracket (bracket-grid layout
 * w/ upper/lower halves and SVG connectors).
 *
 * Phases:
 *   swiss    → auto-bids row + Swiss standings + round-by-round matches
 *   bracket  → auto-bids row + compact Swiss summary + selection show + bracket-grid
 *   complete → same as bracket (champion banner appears in the GF column)
 *
 * Every match card is clickable — clicking expands a detail panel at the
 * bottom of the page showing per-map stats, matching the Schedule/Bracket
 * expansion behavior. State is a single `{ source, id }` tracker so only
 * one match is expanded at a time.
 */

import { useState } from 'react';
import MatchCard from './MatchCard.jsx';
import {
  getInternationalBracketStageName,
  getInternationalChampion,
} from '../engine/bracketInternational.js';
import { getCurrentSlot } from '../engine/season.js';
import { findActiveSeriesForMatch } from '../engine/activeSeries.js';

const REGION_ABBR = {
  americas: 'AMR',
  emea: 'EMEA',
  pacific: 'PAC',
  china: 'CN',
};

/* ─────────────── Shared: match stats popup ─────────────── */
/* Mirrors the Schedule.jsx MatchDetail component exactly, so the popup
   style matches what the user already sees on the Schedule tab. */

function MatchDetail({ result, teamA, teamB }) {
  const [selectedMap, setSelectedMap] = useState(0);
  if (!result?.maps?.length) return null;
  const map = result.maps[selectedMap];
  if (!map) return null;
  const aIds = map.rosterAIds || [];
  const bIds = map.rosterBIds || [];
  const aStats = aIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  const bStats = bIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  return (
    <div className="match-detail">
      <div className="map-score-row">
        {result.maps.map((m, i) => (
          <button
            key={i}
            className={`map-pill ${selectedMap === i ? 'active' : ''} ${m.winner === teamA ? 'team-a-won' : 'team-b-won'}`}
            onClick={(e) => { e.stopPropagation(); setSelectedMap(i); }}
          >
            <span className="map-pill-label">Map {i + 1}</span>
            <span className="map-pill-score">{Math.max(m.roundsA, m.roundsB)}-{Math.min(m.roundsA, m.roundsB)}</span>
            <span className="map-pill-winner">{m.winner?.abbr}</span>
          </button>
        ))}
      </div>
      <div className="map-stats-grid">
        <StatsTable stats={aStats} teamName={teamA?.name} teamColor={teamA?.color} />
        <StatsTable stats={bStats} teamName={teamB?.name} teamColor={teamB?.color} />
      </div>
    </div>
  );
}

function StatsTable({ stats, teamName, teamColor }) {
  return (
    <div className="map-stats-team">
      <div className="map-stats-team-header">
        <span className="map-stats-color" style={{ background: teamColor || '#333' }} />
        <span>{teamName || 'TBD'}</span>
      </div>
      <table className="map-stats-table">
        <thead><tr><th>Player</th><th>Role</th><th>K</th><th>D</th><th>A</th><th>ACS</th></tr></thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.id || s.tag}>
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
}

/* ─────────────── Empty state ─────────────── */

function EmptyState({ gameState }) {
  const season = gameState.season;
  const nextInternational = season.circuit
    .slice(season.slotIndex)
    .find(s => s.type === 'international');

  const lastCompleted = [...season.history]
    .reverse()
    .find(e => e.type === 'international' && !e.placeholder);

  return (
    <div>
      <h2>International</h2>
      <div className="empty-state" style={{ marginTop: 20 }}>
        <p>No international tournament is currently active.</p>
        {nextInternational && (
          <p className="muted">
            Next: <strong>{nextInternational.name}</strong> — unlocks after the
            preceding stage completes.
          </p>
        )}
        {lastCompleted && (
          <p className="muted" style={{ marginTop: 16 }}>
            Last completed: <strong>{lastCompleted.name}</strong>
            {lastCompleted.champion && (
              <>  — champion <span style={{ color: lastCompleted.champion.color }}>
                {lastCompleted.champion.name}
              </span></>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Auto-bid row ─────────────── */

function AutoBidRow({ autoBids }) {
  return (
    <div style={{
      display: 'flex', gap: 10, flexWrap: 'wrap',
      marginBottom: 24,
    }}>
      {autoBids.map(bid => (
        <div key={bid.team.abbr} style={{
          padding: '8px 14px',
          border: '1px solid rgba(255, 209, 102, 0.3)',
          background: 'rgba(255, 209, 102, 0.06)',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.82rem',
        }}>
          <span style={{
            fontSize: '0.6rem', color: '#ffd166',
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em',
          }}>
            {REGION_ABBR[bid.region] || bid.region.toUpperCase()} · AUTO-BID
          </span>
          <span style={{ color: bid.team.color, fontWeight: 600 }}>
            {bid.team.name}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Swiss standings ─────────────── */

function SwissStandings({ swiss, compact = false }) {
  const rows = [...swiss.teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.team.overallRating - a.team.overallRating;
  });

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? '0.78rem' : '0.86rem' }}>
        <thead>
          <tr style={{
            background: 'rgba(255,255,255,0.04)',
            textAlign: 'left',
            fontSize: '0.62rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#8a98b1',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <th style={{ padding: compact ? '6px 10px' : '9px 12px', width: 40 }}>#</th>
            <th style={{ padding: compact ? '6px 10px' : '9px 12px' }}>Team</th>
            <th style={{ padding: compact ? '6px 10px' : '9px 12px', width: 70 }}>Record</th>
            <th style={{ padding: compact ? '6px 10px' : '9px 12px', width: 110 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, i) => {
            let statusLabel = '';
            let statusColor = '#a8b5c9';
            if (entry.advanced) { statusLabel = 'Advanced'; statusColor = '#6fe8a8'; }
            else if (entry.eliminated) { statusLabel = 'Eliminated'; statusColor = '#7a8596'; }
            else if (entry.wins + entry.losses > 0) { statusLabel = 'In play'; statusColor = '#6aa9ff'; }
            return (
              <tr key={entry.team.abbr} style={{
                borderTop: '1px solid rgba(255,255,255,0.04)',
                fontWeight: entry.team.isHuman ? 600 : 400,
                opacity: entry.eliminated ? 0.6 : 1,
              }}>
                <td style={{ padding: compact ? '6px 10px' : '9px 12px', color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                  {i + 1}
                </td>
                <td style={{ padding: compact ? '6px 10px' : '9px 12px', color: entry.team.color }}>
                  {compact ? entry.team.abbr : entry.team.name}
                  {entry.team.isHuman && (
                    <span style={{ marginLeft: 6, fontSize: '0.6rem', color: '#6aa9ff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>You</span>
                  )}
                </td>
                <td style={{ padding: compact ? '6px 10px' : '9px 12px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {entry.wins}-{entry.losses}
                </td>
                <td style={{ padding: compact ? '6px 10px' : '9px 12px', color: statusColor, fontSize: compact ? '0.72rem' : '0.78rem' }}>
                  {statusLabel}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── Swiss matches (Schedule-style blocks) ─────────────── */

function SwissMatches({ swiss, onMatchClick, expandedId, compact = false, gameState }) {
  const rounds = [1, 2, 3];
  return (
    <div className="schedule-weeks-grid">
      {rounds.map(rn => {
        const matches = swiss.matches[`round${rn}`] || [];
        const isCurrent = rn === swiss.round;
        const isPast = rn < swiss.round;
        return (
          <div key={rn} className={`week-block ${isPast ? 'past' : isCurrent ? 'current' : 'future'}`}>
            <h3 style={{ fontSize: compact ? '0.8rem' : undefined }}>
              Round {rn}
              {isCurrent && <span className="muted"> ← current</span>}
            </h3>
            <div className="schedule-card-grid">
              {matches.length === 0 ? (
                <div className="muted" style={{ fontSize: '0.78rem', padding: '8px 4px' }}>
                  {isPast ? '—' : 'Awaiting pairings'}
                </div>
              ) : (
                matches.map((match, i) => {
                  const id = `swiss-r${rn}-${i}`;
                  const has = !!match.result;
                  const inProgress = findActiveSeriesForMatch(gameState, match);
                  return (
                    <div key={id} className="schedule-card-wrapper">
                      <div className="schedule-card-row">
                        <MatchCard
                          match={match}
                          bestOf="bo3"
                          clickable={has}
                          onClick={() => onMatchClick(id)}
                          inProgressSeries={inProgress}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Selection show summary ─────────────── */

/* ─────────────── Selection show ─────────────── */
/**
 * Single component that handles all selection-show display states:
 *
 *   1. IN PROGRESS — not your turn (AI or spectator):
 *        - Shows all 4 pick slots, revealed ones filled, current one highlighted
 *        - Shows a hint telling the user to press Advance to reveal the next pick
 *
 *   2. IN PROGRESS — your pick turn:
 *        - Same slot display, your slot highlighted in accent color
 *        - Shows a grid of remaining Swiss survivors; clicking one submits the pick
 *        - The pick grid replaces the "press advance" hint
 *
 *   3. COMPLETE (bracket or complete phase):
 *        - All 4 slots filled with a concise read-back
 *        - Collapsed styling, no interaction
 */

function SelectionShow({ intl, available, onHumanPick, compact = false }) {
  const show = intl?.selectionShow;
  if (!show) return null;

  const { pickOrder, picks, currentPickIndex, awaitingHuman } = show;
  const allDone = currentPickIndex >= pickOrder.length;

  // Build a row entry for each of the 4 slots (filled or empty)
  const slotRows = pickOrder.map((bid, idx) => {
    const pick = picks[idx] || null;
    const isCurrent = !allDone && idx === currentPickIndex;
    return { idx, bid, pick, isCurrent };
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: '0.66rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: awaitingHuman ? 'var(--accent, #ff4655)' : '#8a98b1',
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 10,
      }}>
        Selection Show
        {!allDone && !awaitingHuman && (
          <span style={{ marginLeft: 10, color: '#6f7d93', textTransform: 'none', letterSpacing: 0 }}>
            — Pick {currentPickIndex + 1} of 4
          </span>
        )}
        {awaitingHuman && (
          <span style={{ marginLeft: 10, textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
            — Your turn to pick
          </span>
        )}
      </div>

      {/* 4 slot cards in a row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        marginBottom: allDone ? 0 : 16,
      }}>
        {slotRows.map(({ idx, bid, pick, isCurrent }) => (
          <SlotCard
            key={idx}
            slotNumber={idx + 1}
            picker={bid.team}
            pickerRegion={bid.region}
            pick={pick}
            isCurrent={isCurrent}
            isYou={bid.team.isHuman}
          />
        ))}
      </div>

      {/* Active interaction below the row */}
      {!allDone && awaitingHuman && (
        <HumanPickGrid available={available} onPick={onHumanPick} />
      )}
      {!allDone && !awaitingHuman && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 6,
          fontSize: '0.78rem',
          color: '#8a98b1',
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          Press <strong style={{ color: '#e8ecf3' }}>Advance</strong> in the sidebar to reveal the next pick.
        </div>
      )}
    </div>
  );
}

function SlotCard({ slotNumber, picker, pickerRegion, pick, isCurrent, isYou }) {
  const borderColor = isCurrent
    ? (isYou ? 'var(--accent, #ff4655)' : '#6aa9ff')
    : 'rgba(255,255,255,0.08)';
  const bg = isCurrent
    ? (isYou ? 'rgba(255, 70, 85, 0.06)' : 'rgba(106, 169, 255, 0.05)')
    : 'rgba(255,255,255,0.015)';

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      background: bg,
      padding: 12,
      minHeight: 90,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.6rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#6f7d93',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span>Pick {slotNumber}</span>
        <span>{REGION_ABBR[pickerRegion] || pickerRegion.toUpperCase()}</span>
      </div>
      <div style={{
        fontSize: '0.9rem',
        fontWeight: 600,
        color: picker.color,
      }}>
        {picker.abbr}
        {isYou && (
          <span style={{
            marginLeft: 6, fontSize: '0.6rem', color: '#6aa9ff',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>You</span>
        )}
      </div>
      <div style={{
        marginTop: 'auto',
        paddingTop: 6,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.78rem',
      }}>
        {pick ? (
          <div>
            <span style={{ color: '#6f7d93' }}>vs </span>
            <span style={{ color: pick.picked.color, fontWeight: 600 }}>
              {pick.picked.abbr}
            </span>
          </div>
        ) : isCurrent ? (
          <span style={{ color: isYou ? 'var(--accent, #ff4655)' : '#6aa9ff', fontStyle: 'italic' }}>
            {isYou ? 'Awaiting your pick…' : 'On the clock…'}
          </span>
        ) : (
          <span style={{ color: '#5a6678', fontStyle: 'italic' }}>Waiting</span>
        )}
      </div>
    </div>
  );
}

function HumanPickGrid({ available, onPick }) {
  if (!available || available.length === 0) return null;
  return (
    <div>
      <div style={{
        fontSize: '0.74rem', color: '#a8b5c9', marginBottom: 10,
      }}>
        Click a team to select your Round 1 opponent:
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(available.length, 4)}, 1fr)`,
        gap: 10,
      }}>
        {available.map(team => (
          <button
            key={team.abbr}
            onClick={() => onPick(team)}
            style={{
              textAlign: 'left',
              padding: '12px 14px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              color: '#e8ecf3',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = team.color || '#6aa9ff';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            }}
          >
            <div style={{
              fontSize: '0.6rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#6f7d93',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 4,
            }}>
              OVR {team.overallRating}
            </div>
            <div style={{ color: team.color, fontSize: '0.95rem', fontWeight: 600 }}>
              {team.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── International bracket (custom layout) ─────────────── */
/*
 * Purpose-built grid for the 8-team no-byes double-elim format. Doesn't
 * share CSS with regional Bracket.jsx because the two formats have
 * different match counts per round and the regional flex-based layout
 * doesn't accommodate 4 UB R1 matches cleanly.
 *
 * Approach: absolute positioning inside a fixed-size relative container.
 * Every match, label, and connector line has an explicit (x, y) so the
 * layout is pixel-perfect regardless of flex quirks.
 *
 * Bracket structure (5 columns, left to right):
 *   Col 1: UB R1   (4 matches)  +  LB R1  (2 matches)
 *   Col 2: UB SF   (2 matches)  +  LB R2  (2 matches)
 *   Col 3: UB Final (1 match)    +  LB R3  (1 match)
 *   Col 4: (empty upper)         +  LB Final (1 match, BO5)
 *   Col 5: Grand Final (1 match, BO5)
 *
 * Vertical positioning is tournament-tree style: each round's match is
 * centered at the midpoint of its two feeder matches from the previous
 * round. Connector lines are drawn as an SVG overlay.
 */

const MATCH_WIDTH = 200;
const MATCH_HEIGHT = 78;
const COL_GAP = 40;
const COL_W = MATCH_WIDTH + COL_GAP;

// Column x-positions (left edge of each match)
const COL_X = [0, COL_W, COL_W * 2, COL_W * 3, COL_W * 4];

// UB R1: 4 matches, stacked with 24px vertical gap
const UB_R1_TOP = 50;
const UB_R1_GAP = 24;
const UB_R1_Y = [
  UB_R1_TOP,
  UB_R1_TOP + (MATCH_HEIGHT + UB_R1_GAP),
  UB_R1_TOP + (MATCH_HEIGHT + UB_R1_GAP) * 2,
  UB_R1_TOP + (MATCH_HEIGHT + UB_R1_GAP) * 3,
];
// UB R1 match centers (for pair midpoints)
const UB_R1_C = UB_R1_Y.map(y => y + MATCH_HEIGHT / 2);

// UB SF: 2 matches, each centered at the midpoint of its UB R1 pair
const UB_SF_C = [
  (UB_R1_C[0] + UB_R1_C[1]) / 2,
  (UB_R1_C[2] + UB_R1_C[3]) / 2,
];
const UB_SF_Y = UB_SF_C.map(c => c - MATCH_HEIGHT / 2);

// UB Final: 1 match, centered at midpoint of UB SF pair
const UB_FINAL_C = (UB_SF_C[0] + UB_SF_C[1]) / 2;
const UB_FINAL_Y = UB_FINAL_C - MATCH_HEIGHT / 2;

// LB section starts below the UB R1 last match with a visual gap
const LB_GAP_ABOVE = 60;
const LB_R1_TOP = UB_R1_Y[3] + MATCH_HEIGHT + LB_GAP_ABOVE;
const LB_R1_GAP = 24;
const LB_R1_Y = [
  LB_R1_TOP,
  LB_R1_TOP + (MATCH_HEIGHT + LB_R1_GAP),
];
const LB_R1_C = LB_R1_Y.map(y => y + MATCH_HEIGHT / 2);

// LB R2: same y as LB R1 (each LB R2 match pairs one LB R1 winner + one UB SF loser)
const LB_R2_Y = LB_R1_Y;
const LB_R2_C = LB_R1_C;

// LB R3: 1 match, centered at midpoint of LB R2 pair
const LB_R3_C = (LB_R2_C[0] + LB_R2_C[1]) / 2;
const LB_R3_Y = LB_R3_C - MATCH_HEIGHT / 2;

// LB Final: 1 match, aligned with LB R3 (same y) so the row reads cleanly
const LB_FINAL_C = LB_R3_C;
const LB_FINAL_Y = LB_R3_Y;

// Grand Final: 1 match, centered at midpoint of UB Final and LB Final
const GF_C = (UB_FINAL_C + LB_FINAL_C) / 2;
const GF_Y = GF_C - MATCH_HEIGHT / 2;

// Overall grid dimensions
const GRID_WIDTH = COL_X[4] + MATCH_WIDTH;
const GRID_HEIGHT = LB_R1_Y[1] + MATCH_HEIGHT + 40; // bottom padding

// Label positions — each label sits 28px above its first associated match
const LABEL_OFFSET = 28;

/* ─────────── Sub-components ─────────── */

function PositionedMatch({ x, y, id, match, bestOf = 'bo3', onClick, gameState }) {
  const has = !!match?.result;
  const inProgress = gameState ? findActiveSeriesForMatch(gameState, match) : null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: MATCH_WIDTH }}>
      <MatchCard
        match={match}
        bestOf={bestOf}
        clickable={has}
        onClick={() => onClick(id)}
        inProgressSeries={inProgress}
      />
    </div>
  );
}

function RoundLabel({ x, y, children, gold = false }) {
  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: MATCH_WIDTH,
      textAlign: 'center',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: gold ? '0.68rem' : '0.62rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: gold ? 'var(--gold, #ffd166)' : '#8a98b1',
      fontWeight: gold ? 600 : 400,
      pointerEvents: 'none',
    }}>
      {children}
    </div>
  );
}

/**
 * SVG overlay drawing connector lines between all relevant matches.
 * Lines are rendered behind the match cards via z-index on the container.
 */
function ConnectorOverlay() {
  const STROKE = 'rgba(255,255,255,0.15)';
  const SW = 1.5;

  // Helper: draw a converging-pair line from two source matches on the
  // left to one target match on the right. leftX = right edge of source
  // col, rightX = left edge of target col, midX = bend point between.
  function convergePair(p1CenterY, p2CenterY, targetCenterY, leftX, rightX) {
    const midX = leftX + (rightX - leftX) / 2;
    return (
      <g stroke={STROKE} strokeWidth={SW} fill="none">
        <path d={`M ${leftX} ${p1CenterY} H ${midX} V ${targetCenterY}`} />
        <path d={`M ${leftX} ${p2CenterY} H ${midX}`} />
        <path d={`M ${midX} ${targetCenterY} H ${rightX}`} />
      </g>
    );
  }

  // Helper: straight horizontal line
  function straight(y, leftX, rightX) {
    return (
      <path
        d={`M ${leftX} ${y} H ${rightX}`}
        stroke={STROKE}
        strokeWidth={SW}
        fill="none"
      />
    );
  }

  // Right edges / left edges of each col
  const col1R = COL_X[0] + MATCH_WIDTH;
  const col2L = COL_X[1];
  const col2R = COL_X[1] + MATCH_WIDTH;
  const col3L = COL_X[2];
  const col3R = COL_X[2] + MATCH_WIDTH;
  const col4L = COL_X[3];
  const col4R = COL_X[3] + MATCH_WIDTH;
  const col5L = COL_X[4];

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
        pointerEvents: 'none',
      }}
    >
      {/* UB R1 → UB SF (two pair converges) */}
      {convergePair(UB_R1_C[0], UB_R1_C[1], UB_SF_C[0], col1R, col2L)}
      {convergePair(UB_R1_C[2], UB_R1_C[3], UB_SF_C[1], col1R, col2L)}

      {/* UB SF → UB Final (one pair converge) */}
      {convergePair(UB_SF_C[0], UB_SF_C[1], UB_FINAL_C, col2R, col3L)}

      {/* LB R1 → LB R2 (straight, same y) */}
      {straight(LB_R1_C[0], col1R, col2L)}
      {straight(LB_R1_C[1], col1R, col2L)}

      {/* LB R2 → LB R3 (pair converge) */}
      {convergePair(LB_R2_C[0], LB_R2_C[1], LB_R3_C, col2R, col3L)}

      {/* LB R3 → LB Final (straight) */}
      {straight(LB_R3_C, col3R, col4L)}

      {/* UB Final → Grand Final (and LB Final → Grand Final) — converge */}
      {convergePair(UB_FINAL_C, LB_FINAL_C, GF_C, col4R, col5L)}
    </svg>
  );
}

function IntlBracketGrid({ bracket, onMatchClick, allMatches, gameState }) {
  // Resolve matches by id (cheaper than searching allMatches for each)
  const byId = Object.fromEntries(allMatches.map(m => [m.id, m.match]));
  const m = (id) => byId[id] || null;

  const champion = getInternationalChampion(bracket);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{
        position: 'relative',
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      }}>
        <ConnectorOverlay />

        {/* ── Round labels ── */}
        <RoundLabel x={COL_X[0]} y={UB_R1_Y[0] - LABEL_OFFSET}>UB Round 1</RoundLabel>
        <RoundLabel x={COL_X[1]} y={UB_SF_Y[0] - LABEL_OFFSET}>UB Semifinals</RoundLabel>
        <RoundLabel x={COL_X[2]} y={UB_FINAL_Y - LABEL_OFFSET}>UB Final</RoundLabel>
        <RoundLabel x={COL_X[4]} y={GF_Y - LABEL_OFFSET} gold>Grand Final</RoundLabel>

        <RoundLabel x={COL_X[0]} y={LB_R1_Y[0] - LABEL_OFFSET}>LB Round 1</RoundLabel>
        <RoundLabel x={COL_X[1]} y={LB_R2_Y[0] - LABEL_OFFSET}>LB Round 2</RoundLabel>
        <RoundLabel x={COL_X[2]} y={LB_R3_Y - LABEL_OFFSET}>LB Round 3</RoundLabel>
        <RoundLabel x={COL_X[3]} y={LB_FINAL_Y - LABEL_OFFSET}>LB Final</RoundLabel>

        {/* ── Upper Bracket matches ── */}
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[0]} id="ubr0" match={m('ubr0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[1]} id="ubr1" match={m('ubr1')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[2]} id="ubr2" match={m('ubr2')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[3]} id="ubr3" match={m('ubr3')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[1]} y={UB_SF_Y[0]} id="ubsf0" match={m('ubsf0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[1]} y={UB_SF_Y[1]} id="ubsf1" match={m('ubsf1')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[2]} y={UB_FINAL_Y} id="ubf" match={m('ubf')} onClick={onMatchClick} gameState={gameState} />

        {/* ── Lower Bracket matches ── */}
        <PositionedMatch x={COL_X[0]} y={LB_R1_Y[0]} id="lbr0" match={m('lbr0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={LB_R1_Y[1]} id="lbr1" match={m('lbr1')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[1]} y={LB_R2_Y[0]} id="lbr2-0" match={m('lbr2-0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[1]} y={LB_R2_Y[1]} id="lbr2-1" match={m('lbr2-1')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[2]} y={LB_R3_Y} id="lbr3" match={m('lbr3')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[3]} y={LB_FINAL_Y} id="lbf" match={m('lbf')} bestOf="bo5" onClick={onMatchClick} gameState={gameState} />

        {/* ── Grand Final ── */}
        <PositionedMatch x={COL_X[4]} y={GF_Y} id="gf" match={m('gf')} bestOf="bo5" onClick={onMatchClick} gameState={gameState} />

        {champion && (
          <div style={{
            position: 'absolute',
            left: COL_X[4],
            top: GF_Y + MATCH_HEIGHT + 16,
            width: MATCH_WIDTH,
            textAlign: 'center',
            padding: '10px 12px',
            background: 'rgba(255, 209, 102, 0.08)',
            border: '1px solid rgba(255, 209, 102, 0.35)',
            borderRadius: 8,
            color: 'var(--gold, #ffd166)',
            fontFamily: "'Sora', 'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: '0.9rem',
          }}>
            🏆 {champion.name}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Main component ─────────────── */

export default function International({ gameState, onHumanPick }) {
  const [expanded, setExpanded] = useState(null); // { source: 'swiss'|'bracket', id: string }

  const intl = gameState.international;
  const currentSlot = getCurrentSlot(gameState);
  const inInternationalSlot = currentSlot?.type === 'international';

  if (!inInternationalSlot || !intl) {
    return <EmptyState gameState={gameState} />;
  }

  // Build a single list of bracket matches keyed by id, used for lookups
  // when rendering the bracket grid and when resolving the expanded detail.
  const bracketMatches = [];
  if (intl.bracket) {
    const b = intl.bracket;
    if (b.ubR1?.[0]) bracketMatches.push({ id: 'ubr0',   match: b.ubR1[0] });
    if (b.ubR1?.[1]) bracketMatches.push({ id: 'ubr1',   match: b.ubR1[1] });
    if (b.ubR1?.[2]) bracketMatches.push({ id: 'ubr2',   match: b.ubR1[2] });
    if (b.ubR1?.[3]) bracketMatches.push({ id: 'ubr3',   match: b.ubR1[3] });
    if (b.ubSF?.[0]) bracketMatches.push({ id: 'ubsf0',  match: b.ubSF[0] });
    if (b.ubSF?.[1]) bracketMatches.push({ id: 'ubsf1',  match: b.ubSF[1] });
    if (b.ubFinal)   bracketMatches.push({ id: 'ubf',    match: b.ubFinal });
    if (b.lbR1?.[0]) bracketMatches.push({ id: 'lbr0',   match: b.lbR1[0] });
    if (b.lbR1?.[1]) bracketMatches.push({ id: 'lbr1',   match: b.lbR1[1] });
    if (b.lbR2?.[0]) bracketMatches.push({ id: 'lbr2-0', match: b.lbR2[0] });
    if (b.lbR2?.[1]) bracketMatches.push({ id: 'lbr2-1', match: b.lbR2[1] });
    if (b.lbR3)      bracketMatches.push({ id: 'lbr3',   match: b.lbR3 });
    if (b.lbFinal)   bracketMatches.push({ id: 'lbf',    match: b.lbFinal });
    if (b.grandFinal) bracketMatches.push({ id: 'gf',    match: b.grandFinal });
  }

  function handleClick(source, id) {
    setExpanded(prev =>
      prev?.source === source && prev?.id === id ? null : { source, id }
    );
  }

  // Resolve expanded match for rendering the detail panel
  let expandedMatch = null;
  if (expanded) {
    if (expanded.source === 'swiss') {
      const parts = expanded.id.match(/^swiss-r(\d+)-(\d+)$/);
      if (parts) {
        const rn = parseInt(parts[1], 10);
        const idx = parseInt(parts[2], 10);
        expandedMatch = intl.swiss?.matches?.[`round${rn}`]?.[idx] || null;
      }
    } else if (expanded.source === 'bracket') {
      const entry = bracketMatches.find(m => m.id === expanded.id);
      expandedMatch = entry?.match || null;
    }
  }

  const inSelection = intl.phase === 'selection';
  const showBracket = intl.phase === 'bracket' || intl.phase === 'complete';
  const swissCompact = inSelection || showBracket;

  // Compute available survivors for the pick grid (only when awaiting human).
  // We avoid importing gameState-bound helpers here and instead derive it
  // locally from the intl state.
  let availableForPick = [];
  if (inSelection && intl.selectionShow?.awaitingHuman) {
    const survivors = (intl.swiss?.teams || [])
      .filter(e => e.advanced)
      .map(e => e.team);
    const picked = new Set((intl.selectionShow.picks || []).map(p => p.picked));
    availableForPick = survivors.filter(t => !picked.has(t));
  }

  return (
    <div>
      <h2>{intl.name}</h2>
      <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 18 }}>
        {intl.phase === 'swiss' && 'Swiss stage in progress. Use Advance in the sidebar to play the next round. Click a completed match to view stats.'}
        {intl.phase === 'selection' && (
          intl.selectionShow?.awaitingHuman
            ? 'Selection show — your turn. Click a team below to choose your Round 1 opponent.'
            : 'Selection show in progress. Press Advance to reveal the next pick.'
        )}
        {intl.phase === 'bracket' && 'Playoffs in progress. Use Advance to play the next stage. Click a completed match to view stats.'}
        {intl.phase === 'complete' && 'Tournament complete. Continue to the next stage from the transition screen.'}
      </p>

      <AutoBidRow autoBids={intl.autoBids} />

      {/* Swiss section — compact during selection/bracket phases, full during swiss phase */}
      <div style={{ marginBottom: swissCompact ? 24 : 32 }}>
        <div style={{
          fontSize: swissCompact ? '0.62rem' : '0.68rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#8a98b1',
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          Swiss Stage {intl.phase === 'swiss' ? `— Round ${intl.swiss.round} of ${intl.swiss.maxRounds}` : '— Final Results'}
        </div>

        {swissCompact ? (
          // Compact: standings and matches side-by-side in a flex row
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 340px' }}>
              <SwissStandings swiss={intl.swiss} compact />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SwissMatches
                swiss={intl.swiss}
                onMatchClick={(id) => handleClick('swiss', id)}
                expandedId={expanded?.source === 'swiss' ? expanded.id : null}
                compact
                gameState={gameState}
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <SwissStandings swiss={intl.swiss} />
            </div>
            <SwissMatches
              swiss={intl.swiss}
              onMatchClick={(id) => handleClick('swiss', id)}
              expandedId={expanded?.source === 'swiss' ? expanded.id : null}
              gameState={gameState}
            />
          </>
        )}
      </div>

      {/* Selection show — visible during selection phase and as a read-back
          during bracket/complete phases. Hidden during swiss phase. */}
      {(inSelection || showBracket) && (
        <SelectionShow
          intl={intl}
          available={availableForPick}
          onHumanPick={onHumanPick}
        />
      )}

      {/* Bracket section — only in bracket and complete phases */}
      {showBracket && (
        <>
          <div style={{
            fontSize: '0.68rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#8a98b1',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 10,
            paddingBottom: 6,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            Playoffs {intl.bracket?.stage >= 7
              ? '— Complete'
              : intl.bracket ? `— Next: ${getInternationalBracketStageName(intl.bracket.stage)}` : ''}
          </div>

          <IntlBracketGrid
            bracket={intl.bracket}
            onMatchClick={(id) => handleClick('bracket', id)}
            allMatches={bracketMatches}
            gameState={gameState}
          />
        </>
      )}

      {/* Single expanded detail panel at the bottom */}
      {expandedMatch?.result && (
        <div style={{ marginTop: 20 }}>
          <MatchDetail
            result={expandedMatch.result}
            teamA={expandedMatch.teamA}
            teamB={expandedMatch.teamB}
          />
        </div>
      )}
    </div>
  );
}
