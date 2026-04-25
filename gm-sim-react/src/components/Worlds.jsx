/**
 * Worlds.jsx — World Championship view (Phase 4a scope).
 *
 * Three sub-views based on the current worlds.phase:
 *   groupSelection  → qualified teams + group draw in progress
 *   groups          → 4 group panels each with standings + Swiss matches
 *   groupsComplete  → summary of who advanced (until user continues past
 *                     the transition overlay; Phase 4b adds the bracket)
 *
 * Reuses the MatchCard + stats detail pattern from International.jsx —
 * every group match is clickable and expands the same stats panel at
 * the bottom of the page.
 */

import { useState } from 'react';
import MatchCard from './MatchCard.jsx';
import { getCurrentSlot } from '../engine/season.js';
import { findActiveSeriesForMatch } from '../engine/activeSeries.js';
import {
  getWorldsBracketStageName,
  getWorldsBracketChampion,
} from '../engine/bracketWorlds.js';
import { getWorldsPlayoffAvailable } from '../engine/worlds.js';

const REGION_ABBR = {
  americas: 'AMR',
  emea: 'EMEA',
  pacific: 'PAC',
  china: 'CN',
};

const GROUP_KEYS = ['A', 'B', 'C', 'D'];

/* ─────────────── Shared stats detail (mirrors Schedule/International) ─────────────── */

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
  const nextWorlds = season.circuit
    .slice(season.slotIndex)
    .find(s => s.type === 'worlds');

  const lastCompleted = [...season.history]
    .reverse()
    .find(e => e.type === 'worlds' && !e.placeholder);

  return (
    <div>
      <h2>World Championship</h2>
      <div className="empty-state" style={{ marginTop: 20 }}>
        <p>The World Championship isn't active right now.</p>
        {nextWorlds && (
          <p className="muted">
            Unlocks after Stage 3 completes. Top 4 teams per region qualify
            (Stage 3 top 2 auto-bids + next 2 by circuit points).
          </p>
        )}
        {lastCompleted && (
          <p className="muted" style={{ marginTop: 16 }}>
            Last completed: <strong>{lastCompleted.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Section helpers ─────────────── */

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

const card = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.015)',
  overflow: 'hidden',
};

/* ─────────────── Qualification row ─────────────── */

function QualifiedTable({ worlds, gameState }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
    }}>
      {Object.keys(REGION_ABBR).map(regionKey => {
        const regionData = gameState.regions[regionKey];
        const seeds = worlds.qualified[regionKey] || [];
        return (
          <div key={regionKey} style={card}>
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              fontSize: '0.66rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8a98b1',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {regionData.name}
            </div>
            {seeds.map((team, i) => (
              <div key={team.abbr} style={{
                padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                fontSize: '0.82rem',
                fontWeight: team.isHuman ? 600 : 400,
              }}>
                <span style={{
                  width: 18, textAlign: 'center',
                  color: '#6f7d93',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.68rem',
                }}>
                  {i + 1}
                </span>
                <span style={{ color: team.color, flex: 1 }}>{team.name}</span>
                {team.isHuman && (
                  <span style={{
                    fontSize: '0.58rem', color: '#6aa9ff',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>You</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Group selection show ─────────────── */

function GroupSelectionView({ worlds, gameState }) {
  const sel = worlds.groupSelection;
  const regions = gameState.regions;

  return (
    <div>
      <div style={sectionHeader}>
        Group Draw {sel.currentRegionIndex < sel.regionOrder.length
          ? `— Region ${sel.currentRegionIndex + 1} of 4`
          : '— Complete'}
      </div>

      <div style={{ ...card, padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
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
              <th style={{ padding: '10px 14px', width: 140 }}>Region</th>
              {GROUP_KEYS.map(gk => (
                <th key={gk} style={{ padding: '10px 14px' }}>Group {gk}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sel.regionOrder.map((rk, idx) => {
              const placed = sel.placements[rk];
              const hasAny = GROUP_KEYS.some(gk => placed[gk] !== null);
              const isCurrent = idx === sel.currentRegionIndex;
              return (
                <tr key={rk} style={{
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  background: isCurrent ? 'rgba(106, 169, 255, 0.05)' : 'transparent',
                }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 20, textAlign: 'center',
                        color: '#6f7d93',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ color: regions[rk].color, fontWeight: 600 }}>
                        {regions[rk].name}
                      </span>
                      {isCurrent && (
                        <span style={{
                          fontSize: '0.58rem',
                          color: '#6aa9ff',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}>Now</span>
                      )}
                    </div>
                  </td>
                  {GROUP_KEYS.map(gk => {
                    const team = placed[gk];
                    return (
                      <td key={gk} style={{
                        padding: '10px 14px',
                        color: team ? team.color : '#5a6678',
                        fontWeight: team ? 600 : 400,
                      }}>
                        {team ? team.name : (hasAny ? '—' : '')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sel.currentRegionIndex < sel.regionOrder.length && (
        <div style={{
          marginTop: 14,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 6,
          fontSize: '0.78rem',
          color: '#8a98b1',
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          Press <strong style={{ color: '#e8ecf3' }}>Advance</strong> in the sidebar
          to reveal the next region's group placement.
        </div>
      )}
    </div>
  );
}

// (HumanGroupPlacementUI removed — group draw is now fully AI-controlled
// with Latin-square seed distribution enforced at the engine level.)

/* ─────────────── Group stage view ─────────────── */

function GroupPanel({ groupKey, swiss, onMatchClick, gameState }) {
  const sorted = [...swiss.teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.team.overallRating - a.team.overallRating;
  });

  return (
    <div style={card}>
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '0.7rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#e8ecf3',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
        }}>
          Group {groupKey}
        </span>
        <span style={{ fontSize: '0.6rem', color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
          R{swiss.round}/{swiss.maxRounds}
        </span>
      </div>

      {/* Standings */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <tbody>
          {sorted.map((entry, i) => {
            let statusColor = '#a8b5c9';
            if (entry.advanced) statusColor = '#6fe8a8';
            else if (entry.eliminated) statusColor = '#7a8596';
            return (
              <tr key={entry.team.abbr} style={{
                borderTop: '1px solid rgba(255,255,255,0.04)',
                fontWeight: entry.team.isHuman ? 600 : 400,
                opacity: entry.eliminated ? 0.55 : 1,
              }}>
                <td style={{ padding: '6px 12px', width: 24, color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem' }}>
                  {i + 1}
                </td>
                <td style={{ padding: '6px 12px', color: entry.team.color }}>
                  {entry.team.abbr}
                  {entry.team.isHuman && (
                    <span style={{ marginLeft: 4, fontSize: '0.56rem', color: '#6aa9ff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>You</span>
                  )}
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: statusColor, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}>
                  {entry.wins}-{entry.losses}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Round-by-round matches */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[1, 2, 3].map(rn => {
          const matches = swiss.matches[`round${rn}`] || [];
          if (matches.length === 0 && rn > swiss.round) return null;
          return (
            <div key={rn} style={{ marginBottom: rn === 3 ? 0 : 10 }}>
              <div style={{
                fontSize: '0.58rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#6f7d93',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 4,
              }}>
                Round {rn}
              </div>
              {matches.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: '#5a6678', fontStyle: 'italic' }}>
                  Awaiting pairings
                </div>
              ) : (
                matches.map((match, i) => {
                  const id = `${groupKey}-r${rn}-${i}`;
                  const has = !!match.result;
                  const inProgress = gameState ? findActiveSeriesForMatch(gameState, match) : null;
                  return (
                    <div key={id} style={{ marginBottom: i === matches.length - 1 ? 0 : 6 }}>
                      <MatchCard
                        match={match}
                        bestOf="bo3"
                        clickable={has}
                        onClick={() => onMatchClick(id)}
                        inProgressSeries={inProgress}
                      />
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupsView({ worlds, onMatchClick, gameState }) {
  return (
    <div>
      <div style={sectionHeader}>Group Stage</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14,
      }}>
        {GROUP_KEYS.map(gk => (
          <GroupPanel
            key={gk}
            groupKey={gk}
            swiss={worlds.groups[gk]}
            onMatchClick={onMatchClick}
            gameState={gameState}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Playoff selection show ─────────────── */
/*
 * Displays the 4 picker slots (1st seeds) and their picks (2nd seeds).
 * When it's the human's turn, shows an interactive grid of eligible
 * opponents (filtered by the engine's own-group constraint).
 */

function PlayoffSelectionView({ worlds, gameState, onPlayoffPick }) {
  const sel = worlds.playoffSelection;
  const { pickOrder, picks, currentPickIndex, awaitingHuman } = sel;
  const allDone = currentPickIndex >= pickOrder.length;

  const slotRows = pickOrder.map((entry, idx) => {
    const pick = picks[idx] || null;
    const isCurrent = !allDone && idx === currentPickIndex;
    return { idx, entry, pick, isCurrent };
  });

  // Available 2nd seeds for the human pick grid
  const availableForHuman = awaitingHuman
    ? getWorldsPlayoffAvailable(gameState)
    : [];

  return (
    <div>
      <div style={sectionHeader}>
        Playoff Selection Show
        {!allDone && !awaitingHuman && (
          <span style={{ marginLeft: 10, color: '#6f7d93', textTransform: 'none', letterSpacing: 0 }}>
            — Pick {currentPickIndex + 1} of 4
          </span>
        )}
        {awaitingHuman && (
          <span style={{
            marginLeft: 10, textTransform: 'none', letterSpacing: 0,
            fontWeight: 600, color: 'var(--accent, #ff4655)',
          }}>
            — Your pick
          </span>
        )}
      </div>

      {/* 4 slot cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        marginBottom: 14,
      }}>
        {slotRows.map(({ idx, entry, pick, isCurrent }) => {
          const isYou = entry.team.isHuman;
          const borderColor = isCurrent
            ? (isYou ? 'var(--accent, #ff4655)' : '#6aa9ff')
            : 'rgba(255,255,255,0.08)';
          const bg = isCurrent
            ? (isYou ? 'rgba(255, 70, 85, 0.06)' : 'rgba(106, 169, 255, 0.05)')
            : 'rgba(255,255,255,0.015)';
          return (
            <div key={idx} style={{
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              background: bg,
              padding: 12,
              minHeight: 92,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.6rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#6f7d93',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span>Pick {idx + 1}</span>
                <span>Group {entry.group} · 1st</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: entry.team.color }}>
                {entry.team.abbr}
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
                    <span style={{ color: '#6f7d93', marginLeft: 4 }}>
                      (Grp {pick.pickedGroup})
                    </span>
                  </div>
                ) : isCurrent ? (
                  <span style={{
                    color: isYou ? 'var(--accent, #ff4655)' : '#6aa9ff',
                    fontStyle: 'italic',
                  }}>
                    {isYou ? 'Awaiting your pick…' : 'On the clock…'}
                  </span>
                ) : (
                  <span style={{ color: '#5a6678', fontStyle: 'italic' }}>Waiting</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active interaction */}
      {!allDone && awaitingHuman && (
        <div>
          <div style={{ fontSize: '0.74rem', color: '#a8b5c9', marginBottom: 10 }}>
            Click a 2nd-seed team to lock in your Round 1 opponent. You can't
            pick your own group's 2nd seed.
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(availableForHuman.length, 3)}, 1fr)`,
            gap: 10,
          }}>
            {availableForHuman.map(team => (
              <button
                key={team.abbr}
                onClick={() => onPlayoffPick(team)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  color: '#e8ecf3',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
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
          Press <strong style={{ color: '#e8ecf3' }}>Advance</strong> in the sidebar
          to reveal the next pick.
        </div>
      )}
    </div>
  );
}

/* ─────────────── Worlds bracket grid ─────────────── */
/*
 * Reuses the same absolute-positioned layout as International's bracket
 * grid (5 columns, fixed positions, SVG connector overlay). Kept inline
 * here instead of extracting because the two brackets may diverge further
 * and the code is dense but not complicated.
 */

const MATCH_WIDTH = 200;
const MATCH_HEIGHT = 78;
const COL_GAP = 40;
const COL_W = MATCH_WIDTH + COL_GAP;
const COL_X = [0, COL_W, COL_W * 2, COL_W * 3, COL_W * 4];

const UB_R1_TOP = 50;
const UB_R1_GAP = 24;
const UB_R1_Y = [
  UB_R1_TOP,
  UB_R1_TOP + (MATCH_HEIGHT + UB_R1_GAP),
  UB_R1_TOP + (MATCH_HEIGHT + UB_R1_GAP) * 2,
  UB_R1_TOP + (MATCH_HEIGHT + UB_R1_GAP) * 3,
];
const UB_R1_C = UB_R1_Y.map(y => y + MATCH_HEIGHT / 2);

const UB_SF_C = [
  (UB_R1_C[0] + UB_R1_C[1]) / 2,
  (UB_R1_C[2] + UB_R1_C[3]) / 2,
];
const UB_SF_Y = UB_SF_C.map(c => c - MATCH_HEIGHT / 2);

const UB_FINAL_C = (UB_SF_C[0] + UB_SF_C[1]) / 2;
const UB_FINAL_Y = UB_FINAL_C - MATCH_HEIGHT / 2;

const LB_GAP_ABOVE = 60;
const LB_R1_TOP = UB_R1_Y[3] + MATCH_HEIGHT + LB_GAP_ABOVE;
const LB_R1_GAP = 24;
const LB_R1_Y = [
  LB_R1_TOP,
  LB_R1_TOP + (MATCH_HEIGHT + LB_R1_GAP),
];
const LB_R1_C = LB_R1_Y.map(y => y + MATCH_HEIGHT / 2);

const LB_R2_Y = LB_R1_Y;
const LB_R2_C = LB_R1_C;

const LB_R3_C = (LB_R2_C[0] + LB_R2_C[1]) / 2;
const LB_R3_Y = LB_R3_C - MATCH_HEIGHT / 2;

const LB_FINAL_C = LB_R3_C;
const LB_FINAL_Y = LB_R3_Y;

const GF_C = (UB_FINAL_C + LB_FINAL_C) / 2;
const GF_Y = GF_C - MATCH_HEIGHT / 2;

const GRID_WIDTH = COL_X[4] + MATCH_WIDTH;
const GRID_HEIGHT = LB_R1_Y[1] + MATCH_HEIGHT + 40;
const LABEL_OFFSET = 28;

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

function ConnectorOverlay() {
  const STROKE = 'rgba(255,255,255,0.15)';
  const SW = 1.5;

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
      {convergePair(UB_R1_C[0], UB_R1_C[1], UB_SF_C[0], col1R, col2L)}
      {convergePair(UB_R1_C[2], UB_R1_C[3], UB_SF_C[1], col1R, col2L)}
      {convergePair(UB_SF_C[0], UB_SF_C[1], UB_FINAL_C, col2R, col3L)}
      {straight(LB_R1_C[0], col1R, col2L)}
      {straight(LB_R1_C[1], col1R, col2L)}
      {convergePair(LB_R2_C[0], LB_R2_C[1], LB_R3_C, col2R, col3L)}
      {straight(LB_R3_C, col3R, col4L)}
      {convergePair(UB_FINAL_C, LB_FINAL_C, GF_C, col4R, col5L)}
    </svg>
  );
}

function WorldsBracketGrid({ bracket, onMatchClick, allMatches, gameState }) {
  const byId = Object.fromEntries(allMatches.map(m => [m.id, m.match]));
  const m = (id) => byId[id] || null;

  const champion = getWorldsBracketChampion(bracket);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{
        position: 'relative',
        width: GRID_WIDTH,
        height: GRID_HEIGHT,
      }}>
        <ConnectorOverlay />

        <RoundLabel x={COL_X[0]} y={UB_R1_Y[0] - LABEL_OFFSET}>UB Round 1</RoundLabel>
        <RoundLabel x={COL_X[1]} y={UB_SF_Y[0] - LABEL_OFFSET}>UB Semifinals</RoundLabel>
        <RoundLabel x={COL_X[2]} y={UB_FINAL_Y - LABEL_OFFSET}>UB Final · BO5</RoundLabel>
        <RoundLabel x={COL_X[4]} y={GF_Y - LABEL_OFFSET} gold>Grand Final · BO5</RoundLabel>

        <RoundLabel x={COL_X[0]} y={LB_R1_Y[0] - LABEL_OFFSET}>LB Round 1</RoundLabel>
        <RoundLabel x={COL_X[1]} y={LB_R2_Y[0] - LABEL_OFFSET}>LB Round 2</RoundLabel>
        <RoundLabel x={COL_X[2]} y={LB_R3_Y - LABEL_OFFSET}>LB Round 3</RoundLabel>
        <RoundLabel x={COL_X[3]} y={LB_FINAL_Y - LABEL_OFFSET}>LB Final · BO5</RoundLabel>

        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[0]} id="ubr0" match={m('ubr0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[1]} id="ubr1" match={m('ubr1')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[2]} id="ubr2" match={m('ubr2')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={UB_R1_Y[3]} id="ubr3" match={m('ubr3')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[1]} y={UB_SF_Y[0]} id="ubsf0" match={m('ubsf0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[1]} y={UB_SF_Y[1]} id="ubsf1" match={m('ubsf1')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[2]} y={UB_FINAL_Y} id="ubf" match={m('ubf')} bestOf="bo5" onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[0]} y={LB_R1_Y[0]} id="lbr0" match={m('lbr0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[0]} y={LB_R1_Y[1]} id="lbr1" match={m('lbr1')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[1]} y={LB_R2_Y[0]} id="lbr2-0" match={m('lbr2-0')} onClick={onMatchClick} gameState={gameState} />
        <PositionedMatch x={COL_X[1]} y={LB_R2_Y[1]} id="lbr2-1" match={m('lbr2-1')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[2]} y={LB_R3_Y} id="lbr3" match={m('lbr3')} onClick={onMatchClick} gameState={gameState} />

        <PositionedMatch x={COL_X[3]} y={LB_FINAL_Y} id="lbf" match={m('lbf')} bestOf="bo5" onClick={onMatchClick} gameState={gameState} />

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

export default function Worlds({ gameState, onPlayoffPick }) {
  const [expandedId, setExpandedId] = useState(null);

  const worlds = gameState.worlds;
  const currentSlot = getCurrentSlot(gameState);
  const inWorldsSlot = currentSlot?.type === 'worlds';

  if (!inWorldsSlot || !worlds) {
    return <EmptyState gameState={gameState} />;
  }

  // Build bracket match list for the bracket grid
  const bracketMatches = [];
  if (worlds.bracket) {
    const b = worlds.bracket;
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

  // Resolve expanded match. IDs:
  //   Group matches: "{A-D}-r{round}-{idx}"
  //   Bracket matches: one of the bracket ids above
  let expandedMatch = null;
  if (expandedId) {
    const groupParts = expandedId.match(/^([A-D])-r(\d+)-(\d+)$/);
    if (groupParts && worlds.groups) {
      const gk = groupParts[1];
      const rn = parseInt(groupParts[2], 10);
      const idx = parseInt(groupParts[3], 10);
      expandedMatch = worlds.groups[gk]?.matches?.[`round${rn}`]?.[idx] || null;
    } else {
      const entry = bracketMatches.find(m => m.id === expandedId);
      expandedMatch = entry?.match || null;
    }
  }

  function handleClick(id) {
    setExpandedId(prev => prev === id ? null : id);
  }

  const showGroups = worlds.phase === 'groups'
    || worlds.phase === 'playoffSelection'
    || worlds.phase === 'bracket'
    || worlds.phase === 'complete';
  const showBracket = worlds.phase === 'bracket' || worlds.phase === 'complete';
  const showPlayoffSelection = worlds.phase === 'playoffSelection'
    || worlds.phase === 'bracket'
    || worlds.phase === 'complete';

  return (
    <div>
      <h2>World Championship</h2>
      <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 18 }}>
        {worlds.phase === 'groupSelection' && 'Group draw in progress.'}
        {worlds.phase === 'groups' && 'Group stage in progress. All 4 groups play in lockstep.'}
        {worlds.phase === 'playoffSelection' && 'Playoff selection show — 1st seeds pick opponents from the 2nd seeds.'}
        {worlds.phase === 'bracket' && 'Playoff bracket in progress. UB Final, LB Final, and Grand Final are BO5.'}
        {worlds.phase === 'complete' && 'World Championship complete. Continue from the transition screen.'}
      </p>

      {/* Qualified teams — always visible */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionHeader}>Qualified Teams (Seeded 1–4 by Circuit Points)</div>
        <QualifiedTable worlds={worlds} gameState={gameState} />
      </div>

      {/* Group selection (fully AI-driven) */}
      {worlds.phase === 'groupSelection' && (
        <div style={{ marginBottom: 24 }}>
          <GroupSelectionView
            worlds={worlds}
            gameState={gameState}
          />
        </div>
      )}

      {/* Group stage (visible once groups phase starts, stays visible through bracket) */}
      {showGroups && (
        <div style={{ marginBottom: 24 }}>
          <GroupsView worlds={worlds} onMatchClick={handleClick} gameState={gameState} />
        </div>
      )}

      {/* Playoff selection show */}
      {showPlayoffSelection && (
        <div style={{ marginBottom: 24 }}>
          <PlayoffSelectionView
            worlds={worlds}
            gameState={gameState}
            onPlayoffPick={onPlayoffPick}
          />
        </div>
      )}

      {/* Playoff bracket */}
      {showBracket && worlds.bracket && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionHeader}>
            Playoff Bracket {worlds.bracket.stage >= 7
              ? '— Complete'
              : `— Next: ${getWorldsBracketStageName(worlds.bracket.stage)}`}
          </div>
          <WorldsBracketGrid
            bracket={worlds.bracket}
            onMatchClick={handleClick}
            allMatches={bracketMatches}
            gameState={gameState}
          />
        </div>
      )}

      {/* Match detail popup */}
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
