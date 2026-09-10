/**
 * VctDashboard.jsx — the season at a glance.
 *
 * The nine-slot calendar with the season's position, the human team
 * card, what's happening right now, and the world champion banner once
 * Champions resolves.
 */

import { VCT_SLOTS, regionPointsTable } from '../../engine/vct/circuit.js';
import { SUB_REGIONS } from '../../data/vct/subregions.js';
import { commLanguage, languageName } from '../../data/languages.js';
import { getVctHumanTeam } from '../../engine/vct/generation.js';
import TeamLogo from '../TeamLogo.jsx';
import TeamFlag from '../TeamFlag.jsx';

const SLOT_ICON = { quals: '🎟', regional: '🏟', masters: '🌍', champions: '🏆' };

export default function VctDashboard({ gameState }) {
  const circuit = gameState.circuit || { slotIndex: -1, events: {}, points: {} };
  const human = getVctHumanTeam(gameState);
  const comm = human ? commLanguage(human.roster).lang : null;
  const seasonDone = circuit.status === 'season-complete';

  const humanRank = human
    ? regionPointsTable(gameState, gameState.humanRegion).findIndex(r => r.team === human) + 1
    : 0;
  const humanPoints = human
    ? (circuit.points[`${gameState.humanRegion}:${human.abbr}`] || 0)
    : 0;

  const live = circuit.live;
  let nowLine = null;
  if (seasonDone) {
    nowLine = 'Season complete.';
  } else if (live?.type === 'quals') {
    const def = SUB_REGIONS[live.quals.regionKey][live.quals.subKey];
    const alive = live.quals.currentRound ? live.quals.currentRound.length * 2 : live.quals.alive.length;
    nowLine = `${def.name} qualifier — ${alive} teams left, ${def.slots} tickets.`;
  } else if (live?.type === 'event') {
    nowLine = live.event.phase === 'swiss'
      ? 'Swiss stage in progress — first to 4 wins makes the bracket.'
      : 'Playoff bracket in progress.';
  } else {
    const next = VCT_SLOTS[circuit.slotIndex + 1];
    nowLine = next ? `Next up: ${next.label}. Hit Advance to begin.` : 'Season complete.';
  }

  return (
    <div>
      <h2>VCT {gameState.seasonNumber}</h2>

      {seasonDone && circuit.worldChampion && (
        <div style={{
          margin: '12px 0', padding: '14px 16px', borderRadius: 8,
          background: 'rgba(240,197,74,0.08)', border: '1px solid rgba(240,197,74,0.5)',
          fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          🏆 <TeamLogo team={circuit.worldChampion} size={26} />
          {circuit.worldChampion.name} are your VALORANT Champions
          {circuit.worldChampion.subRegion && (
            <span style={{ color: '#3ec488', fontSize: '0.8rem' }}>
              — an open-qualifier team won it all
            </span>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0' }}>
        {VCT_SLOTS.map((slot, i) => {
          const done = i <= circuit.slotIndex && !(i === circuit.slotIndex && circuit.live);
          const current = i === circuit.slotIndex && !!circuit.live;
          const next = i === circuit.slotIndex + 1 && !circuit.live;
          return (
            <div key={slot.key} style={{
              flex: '1 1 100px', minWidth: 96, padding: '8px 6px', textAlign: 'center',
              borderRadius: 5, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em',
              background: current ? 'rgba(255,70,85,0.14)' : done ? 'rgba(62,196,136,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${current ? '#ff4655' : next ? 'rgba(255,255,255,0.35)' : done ? 'rgba(62,196,136,0.4)' : 'rgba(255,255,255,0.1)'}`,
              opacity: done || current || next ? 1 : 0.55,
            }}>
              <div style={{ fontSize: '1rem' }}>{SLOT_ICON[slot.type]}</div>
              {slot.label}
              {done && <div style={{ color: '#3ec488', marginTop: 2 }}>✓</div>}
              {current && <div style={{ color: '#ff4655', marginTop: 2 }}>LIVE</div>}
            </div>
          );
        })}
      </div>

      <p style={{ fontWeight: 600 }}>{nowLine}</p>

      {/* ── Team card ── */}
      {human && (
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '1.05rem' }}>
            <TeamLogo team={human} size={26} /> {human.name}
            <TeamFlag team={human} style={{ fontSize: '0.8em' }} />
            {!human.subRegion ? (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 7px', borderRadius: 3,
                background: 'rgba(255,70,85,0.16)', color: '#ff8c95',
              }}>PARTNER</span>
            ) : (
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 7px', borderRadius: 3,
                background: 'rgba(62,196,136,0.16)', color: '#3ec488',
              }}>
                OPEN · {SUB_REGIONS[gameState.humanRegion][human.subRegion]?.name}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: 6 }}>
            OVR {human.overallRating} · Comms {languageName(comm)} ·
            {' '}Championship points: <strong>{humanPoints}</strong>
            {humanRank > 0 && <> · #{humanRank} in region{humanRank <= 4 ? ' — Champions seat' : ''}</>}
          </div>
          <div style={{ fontSize: '0.74rem', opacity: 0.6, marginTop: 4 }}>
            {human.roster.map(p => p.tag).join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
}
