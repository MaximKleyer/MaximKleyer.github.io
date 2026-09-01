/**
 * VctQualifiers.jsx — an open qualifier, round by round.
 *
 * Shows one sub-region's bracket for the selected quals slot: every
 * round's line scores, the field still alive (when the qualifier is the
 * live one), and who punched their ticket. Data comes either from the
 * finished event store or the in-progress live cursor.
 */

import { useState } from 'react';
import { REGIONS, REGION_KEYS } from '../../data/regions.js';
import { SUB_REGIONS } from '../../data/vct/subregions.js';
import TeamLogo from '../TeamLogo.jsx';

export default function VctQualifiers({ gameState, slotKey }) {
  const [regionKey, setRegionKey] = useState(gameState.humanRegion);
  const [subKey, setSubKey] = useState(gameState.humanSubRegion || null);

  const circuit = gameState.circuit;
  const stored = circuit?.events?.[slotKey];
  const subKeys = Object.keys(SUB_REGIONS[regionKey] || {});
  const activeSub = subKey && subKeys.includes(subKey) ? subKey : subKeys[0];

  const live = circuit?.live;
  const isLiveHere = live?.type === 'quals'
    && live.slotKey === slotKey
    && live.quals.regionKey === regionKey
    && live.quals.subKey === activeSub;

  const rounds = isLiveHere
    ? [...live.quals.rounds, ...(live.quals.currentRound ? [live.quals.currentRound] : [])]
    : stored?.[regionKey]?.[activeSub]?.rounds || [];
  const qualified = isLiveHere ? null : stored?.[regionKey]?.[activeSub]?.qualified || null;

  const roundName = (idx, total) => {
    const teamsIn = 32 / Math.pow(2, idx);
    return `Round of ${teamsIn}`;
  };

  return (
    <div>
      <h2>Open Qualifier</h2>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        {REGION_KEYS.map(rk => (
          <button key={rk} onClick={() => { setRegionKey(rk); setSubKey(null); }} style={{
            padding: '5px 12px', cursor: 'pointer', borderRadius: 4, fontWeight: 600, color: 'inherit',
            background: rk === regionKey ? `${REGIONS[rk].color}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${rk === regionKey ? REGIONS[rk].color : 'rgba(255,255,255,0.14)'}`,
          }}>{REGIONS[rk].name}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {subKeys.map(sk => (
          <button key={sk} onClick={() => setSubKey(sk)} style={{
            padding: '4px 10px', cursor: 'pointer', borderRadius: 4, fontSize: '0.78rem',
            fontWeight: 600, color: 'inherit',
            background: sk === activeSub ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}>
            {SUB_REGIONS[regionKey][sk].name}
            <span style={{ opacity: 0.5, marginLeft: 5 }}>{SUB_REGIONS[regionKey][sk].slots} slots</span>
          </button>
        ))}
      </div>

      {rounds.length === 0 ? (
        <p style={{ opacity: 0.6 }}>This qualifier hasn't started yet.</p>
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', alignItems: 'flex-start' }}>
          {rounds.map((round, ri) => (
            <div key={ri} style={{ minWidth: 230, flex: 'none' }}>
              <h3 style={{
                fontSize: '0.68rem', letterSpacing: '0.12em', opacity: 0.6,
                margin: '0 0 8px', textTransform: 'uppercase',
              }}>{roundName(ri, rounds.length)}</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {round.map((m, mi) => {
                  const isHumanMatch = m.a?.isHuman || m.b?.isHuman;
                  return (
                    <div key={mi} style={{
                      padding: '6px 9px', borderRadius: 5, fontSize: '0.78rem',
                      background: isHumanMatch ? 'rgba(255,70,85,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isHumanMatch ? 'rgba(255,70,85,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      {[m.a, m.b].map((t, side) => {
                        const won = m.winner === t;
                        const lost = m.winner && !won;
                        return (
                          <div key={side} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            opacity: lost ? 0.45 : 1, fontWeight: won ? 700 : 500,
                          }}>
                            <TeamLogo team={t} size={15} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t?.abbr}
                            </span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {m.score ? m.score[side === 0 ? 0 : 1] : '–'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {qualified && (
            <div style={{ minWidth: 200, flex: 'none' }}>
              <h3 style={{
                fontSize: '0.68rem', letterSpacing: '0.12em', color: '#3ec488',
                margin: '0 0 8px', textTransform: 'uppercase',
              }}>Qualified</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {qualified.map(t => (
                  <div key={t.abbr} style={{
                    padding: '6px 9px', borderRadius: 5, fontSize: '0.8rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(62,196,136,0.1)', border: '1px solid rgba(62,196,136,0.4)',
                  }}>
                    <TeamLogo team={t} size={16} /> {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
