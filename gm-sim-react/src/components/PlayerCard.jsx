/**
 * PlayerCard.jsx — one player's full sheet in a modal.
 *
 * The Roster table shows game stats and pay; everything about the player
 * as a PERSON — attributes, per-stage history, contract, morale — lives
 * here, opened by clicking their name. God Mode edits attributes here
 * too, since the table no longer carries attribute columns.
 */

import EditableCell from './EditableCell.jsx';
import { RoleTag } from './RoleTag.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import { moraleTier, getSalaryCap } from '../data/salary.js';

const ATTRS = [
  ['aim', 'Aim'], ['positioning', 'Positioning'], ['utility', 'Utility'],
  ['gamesense', 'Game sense'], ['clutch', 'Clutch'],
];

function attrColor(v) {
  if (v >= 85) return '#4ade80';
  if (v >= 72) return '#a3e635';
  if (v >= 60) return '#facc15';
  if (v >= 48) return '#fb923c';
  return '#ff5460';
}

function moraleColor(m) {
  const v = m ?? 65;
  if (v >= 80) return '#a3d977';
  if (v >= 60) return '#cdd5e5';
  if (v >= 40) return '#cdb6f2';
  if (v >= 20) return '#ffb070';
  return '#ff8c95';
}

function fmtSalary(n) {
  if (n == null) return '—';
  return '$' + Math.round(n / 1000) + 'K';
}

function statLine(s) {
  if (!s || !s.maps) return null;
  const kd = (s.kills / Math.max(1, s.deaths)).toFixed(2);
  const acs = Math.round(s.acs / s.maps);
  return { maps: s.maps, k: s.kills, d: s.deaths, a: s.assists, kd, acs };
}

export default function PlayerCard({ player, team, isIgl = false, godMode = false, onEditPlayer, onClose }) {
  if (!player) return null;
  const c = player.contract;
  const cap = getSalaryCap();
  const current = statLine(player.stats);
  // Between a stage ending and the next one starting (internationals,
  // Worlds, the re-sign window), live stats still hold the finished
  // stage that stageStats just snapshotted — showing both read as
  // double-counted. Hide any snapshot identical to the live line.
  const dupOfCurrent = line => current
    && line.maps === current.maps && line.k === current.k
    && line.d === current.d && line.a === current.a;
  const stages = Object.entries(player.stageStats || {})
    .map(([n, s]) => ({ n, line: statLine(s) }))
    .filter(x => x.line && !dupOfCurrent(x.line));
  const history = (player.moraleHistory || []).slice(-4).reverse();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(560px, 95vw)', maxHeight: '92vh', overflowY: 'auto', border: '1px solid rgba(255,70,85,0.35)' }}
      >
        {/* ── Identity ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, letterSpacing: '0.02em' }}>{player.tag}</h2>
              {isIgl && <span className="igl-badge">IGL</span>}
              <RoleTag player={player} />
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.75, marginTop: 4 }}>
              {player.name}
              <span
                className={flagClass(player.nationality)}
                title={nationalityName(player.nationality)}
                style={{ margin: '0 6px' }}
              />
              · {player.age} years · {team?.name || '—'}
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: 'none' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: 700, color: attrColor(player.overall) }}>
              {player.overall}
            </div>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', opacity: 0.55 }}>OVERALL</div>
          </div>
        </div>

        {/* ── Attributes ── */}
        <h3 style={{ margin: '18px 0 8px', fontSize: '0.72rem', letterSpacing: '0.12em', opacity: 0.6 }}>ATTRIBUTES</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {ATTRS.map(([key, label]) => {
            const v = player.ratings[key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 92, fontSize: '0.78rem', opacity: 0.8 }}>{label}</span>
                <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${v}%`, height: '100%', background: attrColor(v) }} />
                </div>
                <span style={{ width: 44, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: attrColor(v) }}>
                  {godMode ? (
                    <EditableCell value={v} type="number" editable min={1} max={99} width={44}
                      onCommit={val => onEditPlayer?.(player, key, val)} />
                  ) : v}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Stats ── */}
        <h3 style={{ margin: '18px 0 8px', fontSize: '0.72rem', letterSpacing: '0.12em', opacity: 0.6 }}>STATS</h3>
        {current || stages.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ fontSize: '0.62rem', opacity: 0.55 }}>
                <th style={{ textAlign: 'left', padding: '3px 6px' }}></th>
                <th>Maps</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
              </tr>
            </thead>
            <tbody>
              {current && (
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <td style={{ textAlign: 'left', padding: '5px 6px', fontWeight: 600 }}>This stage</td>
                  <td style={{ textAlign: 'center' }}>{current.maps}</td>
                  <td style={{ textAlign: 'center' }}>{current.k}</td>
                  <td style={{ textAlign: 'center' }}>{current.d}</td>
                  <td style={{ textAlign: 'center' }}>{current.a}</td>
                  <td style={{ textAlign: 'center' }}>{current.kd}</td>
                  <td style={{ textAlign: 'center' }}>{current.acs}</td>
                </tr>
              )}
              {stages.map(({ n, line }) => (
                <tr key={n} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', opacity: 0.75 }}>
                  <td style={{ textAlign: 'left', padding: '5px 6px' }}>Stage {n}</td>
                  <td style={{ textAlign: 'center' }}>{line.maps}</td>
                  <td style={{ textAlign: 'center' }}>{line.k}</td>
                  <td style={{ textAlign: 'center' }}>{line.d}</td>
                  <td style={{ textAlign: 'center' }}>{line.a}</td>
                  <td style={{ textAlign: 'center' }}>{line.kd}</td>
                  <td style={{ textAlign: 'center' }}>{line.acs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: 0 }}>No maps played yet.</p>
        )}

        {/* ── Contract + morale ── */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.72rem', letterSpacing: '0.12em', opacity: 0.6 }}>CONTRACT</h3>
            {c ? (
              <div style={{ fontSize: '0.84rem', lineHeight: 1.8 }}>
                <div><span style={{ opacity: 0.6 }}>Salary</span> — <strong>{fmtSalary(c.salary)}/yr</strong>
                  <span style={{ opacity: 0.5, fontSize: '0.85em' }}> ({(100 * (c.salary || 0) / cap).toFixed(1)}% of cap)</span>
                </div>
                <div><span style={{ opacity: 0.6 }}>Length</span> — <strong style={{ color: c.yearsRemaining <= 1 ? '#ffb070' : 'inherit' }}>
                  {c.yearsRemaining} year{c.yearsRemaining === 1 ? '' : 's'} remaining
                </strong></div>
                <div><span style={{ opacity: 0.6 }}>Signed</span> — {c.signedYear}</div>
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', opacity: 0.55, margin: 0 }}>Unsigned.</p>
            )}
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.72rem', letterSpacing: '0.12em', opacity: 0.6 }}>MORALE</h3>
            <div style={{ fontSize: '0.84rem' }}>
              <strong style={{ color: moraleColor(player.morale), fontSize: '1.05rem' }}>{player.morale ?? 65}</strong>
              <span style={{ opacity: 0.7 }}> — {moraleTier(player.morale)}</span>
            </div>
            {history.length > 0 && (
              <div style={{ fontSize: '0.72rem', opacity: 0.65, marginTop: 6, lineHeight: 1.7 }}>
                {history.map((h, i) => (
                  <div key={i}>
                    <span style={{ color: h.delta > 0 ? '#7ed957' : '#ff8c95', fontWeight: 600 }}>
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </span>{' '}
                    {String(h.reason || '').replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button onClick={onClose} style={{
            padding: '7px 16px', cursor: 'pointer', borderRadius: 4,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'inherit', fontWeight: 600,
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}
