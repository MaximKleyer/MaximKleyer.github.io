/**
 * Roster.jsx — Player table with cap usage, contracts, morale, strategy.
 *
 * Phase 7b adds:
 *   - Cap meter strip at top (used / cap, colored bar, dead cap if any)
 *   - Salary column (editable in God Mode)
 *   - Years remaining column (editable in God Mode)
 *   - Morale column (label + numeric, color-coded)
 *   - Release button shows the buyout cap hit if releasing mid-contract
 *
 * Stats columns (Maps, K, D, A) removed to make room — full stat detail
 * available on the Stats tab. K/D and ACS retained as quick reference.
 */

import { useState, useRef, Fragment } from 'react';
import Strategy from './Strategy.jsx';
import DeltaIndicator from './DeltaIndicator.jsx';
import EditableCell from './EditableCell.jsx';
import NationalitySelect from './NationalitySelect.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import { mapName, getActivePool } from '../data/maps.js';
import { RoleTag } from './RoleTag.jsx';
import { ROSTER_MIN } from '../data/constants.js';
import {
  computeTeamSalary, computeCapRemaining, calculateBuyout,
  moraleTier, getSalaryCap,
} from '../data/salary.js';

// The depth chart's starter line sits after this many rows.
const STARTER_COUNT = ROSTER_MIN;

// Convert a number like 432500 → "$432K". Used wherever we want a
// compact dollar display. Players' salary widgets show K-rounded values.
function formatSalary(n) {
  if (n == null) return '—';
  return '$' + Math.round(n / 1000) + 'K';
}

// Color for morale based on tier. Used in the cell + label.
function moraleColor(morale) {
  const m = morale ?? 65;
  if (m >= 80) return '#a3d977'; // Loyal — green
  if (m >= 60) return '#cdd5e5'; // Content — neutral light
  if (m >= 40) return '#cdb6f2'; // Neutral — soft purple
  if (m >= 20) return '#ffb070'; // Restless — orange
  return '#ff8c95';              // Unhappy — red
}

export default function Roster({
  team, onRelease, onUpdate, allowMinRelease = false,
  godMode = false, onEditPlayer, mapPool = null,
  onTrainMap = null, trainingUsed = false,
}) {
  const [, forceUpdate] = useState(0);
  const [confirmingRelease, setConfirmingRelease] = useState(null); // player or null
  // Depth-chart drag state. Row order IS the depth chart: the top
  // STARTER_COUNT rows start, everything under the line is a sub.
  //
  // The source index lives in a ref, not state: handlers close over the
  // render they were created in, so if React has not re-rendered between
  // dragstart and drop the state value would still read null and the drop
  // would silently do nothing. A ref is always current.
  const dragIdxRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);   // for the drag styling only
  const [overIdx, setOverIdx] = useState(null);

  function beginDrag(idx) {
    dragIdxRef.current = idx;
    setDragIdx(idx);
  }

  function endDrag() {
    dragIdxRef.current = null;
    setDragIdx(null);
    setOverIdx(null);
  }

  function handleDrop(toIdx) {
    const fromIdx = dragIdxRef.current;
    if (fromIdx === null || fromIdx === toIdx) { endDrag(); return; }
    team.movePlayer(fromIdx, toIdx);
    team.validateStrategy();   // comp slots follow whoever is now starting
    endDrag();
    forceUpdate(n => n + 1);
    onUpdate?.();
  }

  function autoSortRoster() {
    team.sortRosterByOverall();
    team.validateStrategy();
    forceUpdate(n => n + 1);
    onUpdate?.();
  }

  function handleStrategyUpdate() {
    forceUpdate(n => n + 1);
    if (onUpdate) onUpdate();
  }

  const editStat = (player, stat) => (v) => onEditPlayer?.(player, stat, v);

  const usedSalary = computeTeamSalary(team);
  const capRemaining = computeCapRemaining(team);
  const utilization = Math.min(100, Math.round(100 * usedSalary / getSalaryCap()));
  const overCap = usedSalary > getSalaryCap();
  const deadCap = (team.deadCapHits || []).reduce((s, h) => s + (h?.amount || 0), 0);

  // Cap meter color tracks utilization
  const meterColor = overCap
    ? '#ff5460'
    : utilization >= 95
      ? '#ffb070'
      : utilization >= 80
        ? '#a3d977'
        : '#6aa9ff';

  // Initiate release. If the player is mid-contract (yearsRemaining > 0
  // AND signedYear was earlier or this season — i.e. not just signed),
  // we route through a confirmation modal showing the buyout cap hit.
  // Players without a contract (shouldn't happen post-7a but defensive)
  // release without confirmation.
  function handleReleaseClick(player) {
    if (team.atMinRoster && !allowMinRelease) return;
    const buyout = calculateBuyout(player.contract);
    if (buyout > 0) {
      setConfirmingRelease(player);
    } else {
      onRelease(player);
    }
  }

  function confirmRelease() {
    if (confirmingRelease) {
      onRelease(confirmingRelease);
      setConfirmingRelease(null);
    }
  }

  return (
    <>
      <h2>{team.name} Roster</h2>
      <p className="muted">{team.roster.length} players · Team OVR: {team.overallRating}</p>

      {/* Cap meter strip */}
      <div style={{
        marginBottom: 16,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: overCap ? '1px solid rgba(255, 84, 96, 0.5)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{
            fontSize: '0.66rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#8a98b1',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Salary Cap
          </span>
          <span style={{ fontSize: '0.85rem', color: '#cdd5e5' }}>
            <strong style={{ color: overCap ? '#ff5460' : '#fff' }}>{formatSalary(usedSalary)}</strong>
            {' / '}
            {formatSalary(getSalaryCap())}
            {' · '}
            <span style={{ color: capRemaining < 0 ? '#ff5460' : '#a3d977' }}>
              {capRemaining < 0 ? `${formatSalary(-capRemaining)} OVER` : `${formatSalary(capRemaining)} headroom`}
            </span>
            {deadCap > 0 && (
              <span style={{ color: '#ffb070', marginLeft: 12 }}>
                · Dead cap: {formatSalary(deadCap)}
              </span>
            )}
          </span>
        </div>
        <div style={{
          height: 6,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${utilization}%`,
            height: '100%',
            background: meterColor,
            transition: 'width 200ms',
          }} />
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: 24 }}></th>
            <th>Tag</th><th>Name</th><th>Nat</th><th>Age</th><th>OVR</th>
            <th title="Primary role, and secondary if they have one. Playing off-role costs about 10 overall.">Role</th>
            <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
            <th>Salary</th><th>Yrs</th><th>Morale</th>
            <th>K/D</th><th>ACS</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {team.roster.map((player, idx) => {
            const d = player.lastOffseasonDelta;
            const c = player.contract;
            const isStarter = idx < STARTER_COUNT;
            return (
            <Fragment key={player.id}>
            {idx === STARTER_COUNT && (
              <tr className="starter-divider">
                <td colSpan={18} style={{
                  padding: 0, height: 0, borderTop: '2px solid #ff4655',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', left: 8, top: -8,
                    background: 'var(--bg, #0d0f14)', padding: '0 8px',
                    fontSize: '0.58rem', letterSpacing: '0.14em',
                    color: '#ff4655', fontFamily: "'JetBrains Mono', monospace",
                  }}>SUBS</span>
                </td>
              </tr>
            )}
            <tr
              draggable
              onDragStart={() => beginDrag(idx)}
              onDragEnd={endDrag}
              onDragOver={e => { e.preventDefault(); setOverIdx(idx); }}
              onDragLeave={() => setOverIdx(o => (o === idx ? null : o))}
              onDrop={e => { e.preventDefault(); handleDrop(idx); }}
              style={{
                cursor: 'grab',
                opacity: dragIdx === idx ? 0.35 : 1,
                background: overIdx === idx && dragIdx !== null && dragIdx !== idx
                  ? 'rgba(255,70,85,0.14)' : undefined,
                boxShadow: overIdx === idx && dragIdx !== null && dragIdx !== idx
                  ? 'inset 0 2px 0 #ff4655' : undefined,
              }}
              title={isStarter ? 'Starter — drag below the line to bench' : 'Sub — drag above the line to start'}
            >
              <td style={{ textAlign: 'center', opacity: 0.35, cursor: 'grab', userSelect: 'none' }}>⠿</td>
              <td>
                {godMode ? (
                  <EditableCell
                    value={player.tag}
                    editable
                    width={80}
                    onCommit={v => onEditPlayer(player, 'tag', v)}
                  />
                ) : (
                  <strong>{player.tag}</strong>
                )}
                {player.id === team.strategy.iglId && <span className="igl-badge">IGL</span>}
              </td>
              <td>
                <EditableCell
                  value={player.name}
                  editable={godMode}
                  width={130}
                  onCommit={v => onEditPlayer(player, 'name', v)}
                />
              </td>
              <td title={nationalityName(player.nationality)}>
                <NationalitySelect
                  value={player.nationality}
                  editable={godMode}
                  onCommit={v => onEditPlayer(player, 'nationality', v)}
                />
              </td>
              <td>
                <EditableCell
                  value={player.age}
                  type="number"
                  editable={godMode}
                  min={16} max={40}
                  onCommit={v => onEditPlayer(player, 'age', v)}
                />
              </td>
              <td>
                {player.overall}
                <DeltaIndicator delta={d?.overall} />
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <RoleTag player={player} />
              </td>
              <td>
                <EditableCell value={player.ratings.aim} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'aim')} />
                <DeltaIndicator delta={d?.aim} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.positioning} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'positioning')} />
                <DeltaIndicator delta={d?.positioning} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.utility} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'utility')} />
                <DeltaIndicator delta={d?.utility} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.gamesense} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'gamesense')} />
                <DeltaIndicator delta={d?.gamesense} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.clutch} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'clutch')} />
                <DeltaIndicator delta={d?.clutch} size="small" />
              </td>

              {/* ── Phase 7: contract + morale columns ── */}
              <td>
                {c ? (
                  godMode ? (
                    <EditableCell
                      value={Math.round((c.salary || 0) / 1000)}
                      type="number"
                      editable
                      min={0} max={5000}
                      width={70}
                      onCommit={v => onEditPlayer(player, 'salary', Number(v) * 1000)}
                    />
                  ) : (
                    <span style={{ color: '#cdd5e5' }}>{formatSalary(c.salary)}</span>
                  )
                ) : (
                  <span style={{ color: '#6f7d93' }}>—</span>
                )}
              </td>
              <td>
                {c ? (
                  godMode ? (
                    <EditableCell
                      value={c.yearsRemaining}
                      type="number"
                      editable
                      min={0} max={3}
                      width={40}
                      onCommit={v => onEditPlayer(player, 'yearsRemaining', Number(v))}
                    />
                  ) : (
                    <span style={{ color: c.yearsRemaining <= 1 ? '#ffb070' : '#cdd5e5' }}>
                      {c.yearsRemaining}
                    </span>
                  )
                ) : (
                  <span style={{ color: '#6f7d93' }}>—</span>
                )}
              </td>
              <td>
                <span
                  title={(() => {
                    const m = player.morale ?? 65;
                    const tier = moraleTier(player.morale);
                    const hist = (player.moraleHistory || []).slice(-3).reverse();
                    if (hist.length === 0) return `Morale ${m} — ${tier}`;
                    const events = hist.map(h => {
                      const sign = h.delta > 0 ? '+' : '';
                      return `${sign}${h.delta} ${h.reason}`;
                    }).join('\n');
                    return `Morale ${m} — ${tier}\n\nRecent:\n${events}`;
                  })()}
                  style={{
                    color: moraleColor(player.morale),
                    fontSize: '0.85em',
                    fontWeight: 500,
                  }}
                >
                  {player.morale ?? 65}
                </span>
              </td>

              <td>{player.kd}</td>
              <td>{player.avgAcs}</td>
              <td>
                <button
                  className="btn-small btn-danger"
                  disabled={team.atMinRoster && !allowMinRelease}
                  onClick={() => handleReleaseClick(player)}
                  title={c?.yearsRemaining > 0
                    ? `Buyout: ${formatSalary(calculateBuyout(c))} dead cap`
                    : ''}
                >
                  {team.atMinRoster && !allowMinRelease ? 'Min 5' : 'Release'}
                </button>
              </td>
            </tr>
            </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Buyout confirmation modal */}
      {confirmingRelease && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 15, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1a1f2e',
            border: '1px solid rgba(255, 84, 96, 0.4)',
            borderRadius: 12,
            padding: 24,
            maxWidth: 480,
            width: '90%',
          }}>
            <h3 style={{ marginTop: 0, color: '#ff8c95' }}>
              Release {confirmingRelease.tag}?
            </h3>
            <p style={{ color: '#cdd5e5', lineHeight: 1.5 }}>
              This player has{' '}
              <strong>{confirmingRelease.contract.yearsRemaining} year{confirmingRelease.contract.yearsRemaining === 1 ? '' : 's'}</strong>
              {' remaining at '}
              <strong>{formatSalary(confirmingRelease.contract.salary)}/yr</strong>.
              Releasing now incurs a buyout cap hit.
            </p>
            <div style={{
              padding: '12px 14px',
              background: 'rgba(255, 84, 96, 0.10)',
              border: '1px solid rgba(255, 84, 96, 0.3)',
              borderRadius: 8,
              marginBottom: 18,
            }}>
              <div style={{
                fontSize: '0.66rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#ff8c95',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 4,
              }}>
                Dead Cap Hit
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                {formatSalary(calculateBuyout(confirmingRelease.contract))}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#cdd5e5', marginTop: 4 }}>
                25% × {confirmingRelease.contract.yearsRemaining}yr × {formatSalary(confirmingRelease.contract.salary)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-small"
                onClick={() => setConfirmingRelease(null)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#cdd5e5',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                className="btn-small btn-danger"
                onClick={confirmRelease}
                style={{
                  background: 'rgba(255, 84, 96, 0.85)',
                  border: '1px solid rgba(255, 84, 96, 1)',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Release with buyout
              </button>
            </div>
          </div>
        </div>
      )}

      <MapStrengths team={team} pool={mapPool}
                    onTrain={onTrainMap} trainingUsed={trainingUsed} />

      <Strategy team={team} onUpdate={handleStrategyUpdate} />
    </>
  );
}

/**
 * MapStrengths — per-map Attack/Defense comfort for the active pool.
 *
 * These are TEAM attributes: they represent how well-drilled the org is
 * on each map, drift a few points each offseason, and drive both the
 * veto AI and round performance (see data/maps.js and SIM.MAP_IMPACT).
 * Sorted strongest-first so your comfort picks and problem maps are
 * obvious at a glance when you go into a veto.
 */
function ratingColor(v) {
  if (v >= 85) return '#4ade80';
  if (v >= 72) return '#a3e635';
  if (v >= 60) return '#facc15';
  if (v >= 48) return '#fb923c';
  return '#ff5460';
}

function RatingBar({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
      <span style={{ width: 26, fontSize: '0.7em', opacity: 0.65, letterSpacing: '0.04em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: ratingColor(value) }} />
      </div>
      <span style={{ width: 22, textAlign: 'right', fontSize: '0.78em', fontWeight: 600, color: ratingColor(value) }}>
        {value}
      </span>
    </div>
  );
}

function MapStrengths({ team, pool, onTrain = null, trainingUsed = false }) {
  const active = (pool && pool.length ? pool : getActivePool(null)) || [];
  const ratings = team?.mapRatings || {};

  const rows = active
    .map(id => {
      const r = ratings[id] || { attack: 70, defense: 70 };
      return { id, attack: r.attack ?? 70, defense: r.defense ?? 70,
               overall: Math.round(((r.attack ?? 70) + (r.defense ?? 70)) / 2) };
    })
    .sort((a, b) => b.overall - a.overall);

  if (rows.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Map Strengths</h3>
        <span style={{ fontSize: '0.75em', opacity: 0.6 }}>
          active pool · strongest first
        </span>
      </div>
      {onTrain && (
        <p style={{ margin: '0 0 12px', fontSize: '0.78em',
                    color: trainingUsed ? undefined : '#4ade80',
                    opacity: trainingUsed ? 0.55 : 1 }}>
          {trainingUsed
            ? 'Practice used — the squad can run another block before the next series.'
            : 'Practice available: pick one map to drill before this series. Gains shrink the stronger a map already is.'}
        </p>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 14,
      }}>
        {rows.map(r => (
          <div key={r.id} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '0.92em' }}>{mapName(r.id)}</strong>
              <span style={{ fontSize: '0.8em', fontWeight: 700, color: ratingColor(r.overall) }}>
                {r.overall}
              </span>
            </div>
            <RatingBar label="ATK" value={r.attack} />
            <RatingBar label="DEF" value={r.defense} />
            {onTrain && (
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[['attack', 'ATK'], ['balanced', 'BOTH'], ['defense', 'DEF']].map(([focus, label]) => (
                  <button
                    key={focus}
                    disabled={trainingUsed}
                    onClick={() => onTrain(r.id, focus)}
                    title={trainingUsed
                      ? 'Already practised before this series'
                      : `Drill ${mapName(r.id)} — ${label === 'BOTH' ? 'both sides' : label}`}
                    style={{
                      flex: 1, padding: '3px 0', fontSize: '0.62rem', fontWeight: 700,
                      letterSpacing: '0.06em', borderRadius: 3, color: 'inherit',
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.18)',
                      cursor: trainingUsed ? 'not-allowed' : 'pointer',
                      opacity: trainingUsed ? 0.3 : 0.85,
                    }}
                  >{label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
