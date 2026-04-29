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

import { useState } from 'react';
import Strategy from './Strategy.jsx';
import DeltaIndicator from './DeltaIndicator.jsx';
import EditableCell from './EditableCell.jsx';
import NationalitySelect from './NationalitySelect.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import {
  computeTeamSalary, computeCapRemaining, calculateBuyout,
  moraleTier, SALARY_CAP,
} from '../data/salary.js';

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
  godMode = false, onEditPlayer,
}) {
  const [, forceUpdate] = useState(0);
  const [confirmingRelease, setConfirmingRelease] = useState(null); // player or null

  function handleStrategyUpdate() {
    forceUpdate(n => n + 1);
    if (onUpdate) onUpdate();
  }

  const editStat = (player, stat) => (v) => onEditPlayer?.(player, stat, v);

  const usedSalary = computeTeamSalary(team);
  const capRemaining = computeCapRemaining(team);
  const utilization = Math.min(100, Math.round(100 * usedSalary / SALARY_CAP));
  const overCap = usedSalary > SALARY_CAP;
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
            {formatSalary(SALARY_CAP)}
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
            <th>Tag</th><th>Name</th><th>Nat</th><th>Age</th><th>OVR</th>
            <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
            <th>Salary</th><th>Yrs</th><th>Morale</th>
            <th>K/D</th><th>ACS</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {team.roster.map(player => {
            const d = player.lastOffseasonDelta;
            const c = player.contract;
            return (
            <tr key={player.id}>
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
                  {moraleTier(player.morale)}
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

      <Strategy team={team} onUpdate={handleStrategyUpdate} />
    </>
  );
}
