/**
 * StageTransition.jsx — Full-screen overlay shown when a stage completes.
 *
 * Shows:
 *   - Which stage just ended
 *   - Regional champions
 *   - Points awarded this stage for the human region, with running totals
 *   - A note about any placeholder slots being skipped (Phase 1 only)
 *   - A Continue button that begins the next stage's preseason
 *
 * Styles are inline to avoid touching App.css in Phase 1.
 */

import { CIRCUIT } from '../engine/season.js';
import { REGION_KEYS } from '../data/regions.js';

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(5, 8, 15, 0.92)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(6px)',
  fontFamily: "'Sora', 'DM Sans', sans-serif",
};

const card = {
  width: 'min(780px, 92vw)',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: 'linear-gradient(180deg, #111926 0%, #0b121c 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
  padding: '32px 36px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
  color: '#e8ecf3',
};

const eyebrow = {
  fontSize: '0.7rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#6f7d93',
  marginBottom: '6px',
  fontFamily: "'JetBrains Mono', monospace",
};

const h1 = {
  fontSize: '2.2rem',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '-0.01em',
};

const sectionHeader = {
  fontSize: '0.72rem',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: '#8a98b1',
  fontFamily: "'JetBrains Mono', monospace",
  margin: '28px 0 12px',
  paddingBottom: '6px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const championsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
};

const championCell = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '8px',
  padding: '12px 14px',
};

const championRegion = {
  fontSize: '0.65rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6f7d93',
  marginBottom: '4px',
  fontFamily: "'JetBrains Mono', monospace",
};

const championTeam = {
  fontSize: '1.05rem',
  fontWeight: 600,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
};

const th = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  fontSize: '0.68rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#8a98b1',
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 500,
};

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const skipNote = {
  marginTop: '20px',
  padding: '12px 14px',
  background: 'rgba(138, 152, 177, 0.08)',
  border: '1px dashed rgba(138, 152, 177, 0.3)',
  borderRadius: '8px',
  fontSize: '0.82rem',
  color: '#a8b5c9',
  fontStyle: 'italic',
};

const continueBtn = {
  marginTop: '26px',
  width: '100%',
  padding: '14px 20px',
  fontSize: '0.95rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: '#05080f',
  background: 'linear-gradient(180deg, #ff4655 0%, #e53546 100%)',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

export default function StageTransition({ gameState, onContinue }) {
  const season = gameState.season;
  const lastEntry = season.history[season.history.length - 1];
  if (!lastEntry) return null;

  const isInternational = lastEntry.type === 'international';

  // Determine what comes next in the circuit. If the next slot is a real
  // stage or international it runs immediately; if it's a placeholder
  // (Worlds in Phase 3), note that we'll be skipping past it.
  const nextSlotIdx = season.slotIndex + 1;
  let nextRealSlot = null;
  const skippedSlots = [];
  for (let i = nextSlotIdx; i < CIRCUIT.length; i++) {
    const slot = CIRCUIT[i];
    // Worlds still a placeholder in Phase 3
    if (slot.type === 'worlds') { skippedSlots.push(slot); continue; }
    nextRealSlot = slot;
    break;
  }

  const humanRegion = gameState.humanRegion;
  const humanPointsRows = (lastEntry.pointsAwarded?.[humanRegion] || [])
    .slice()
    .sort((a, b) => a.placement - b.placement);

  let continueLabel;
  if (!nextRealSlot) {
    continueLabel = '🏆 Finish Circuit';
  } else if (nextRealSlot.type === 'stage') {
    continueLabel = `▶ Begin ${nextRealSlot.name} Preseason`;
  } else if (nextRealSlot.type === 'international') {
    continueLabel = `▶ Begin ${nextRealSlot.name}`;
  } else {
    continueLabel = '▶ Continue';
  }

  const eyebrowLabel = isInternational ? 'International Complete' : 'Stage Complete';
  const pointsHeader = isInternational
    ? `International Points Awarded — ${gameState.regions[humanRegion].name}`
    : `Circuit Points — ${gameState.regions[humanRegion].name}`;

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={eyebrow}>{eyebrowLabel}</div>
        <h1 style={h1}>{lastEntry.name}</h1>

        {isInternational ? (
          <>
            <h2 style={sectionHeader}>Champion</h2>
            {lastEntry.champion ? (
              <div style={{
                padding: '14px 18px',
                background: 'rgba(255, 209, 102, 0.08)',
                border: '1px solid rgba(255, 209, 102, 0.3)',
                borderRadius: 8,
                fontSize: '1.05rem',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: '1.4rem' }}>🏆</span>
                <span style={{ color: lastEntry.champion.color, fontWeight: 700 }}>
                  {lastEntry.champion.name}
                </span>
                {lastEntry.runnerUp && (
                  <span style={{ marginLeft: 'auto', color: '#8a98b1', fontSize: '0.82rem' }}>
                    over <span style={{ color: lastEntry.runnerUp.color }}>
                      {lastEntry.runnerUp.name}
                    </span>
                  </span>
                )}
              </div>
            ) : (
              <div className="muted">No champion data.</div>
            )}
          </>
        ) : (
          <>
            <h2 style={sectionHeader}>Regional Champions</h2>
            <div style={championsGrid}>
              {REGION_KEYS.map(rk => {
                const br = lastEntry.bracketResults?.[rk];
                if (!br) return null;
                return (
                  <div key={rk} style={championCell}>
                    <div style={championRegion}>{gameState.regions[rk].name}</div>
                    <div style={{ ...championTeam, color: br.champion.color }}>
                      {br.champion.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <h2 style={sectionHeader}>{pointsHeader}</h2>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: '40px' }}>#</th>
              <th style={th}>Team</th>
              <th style={{ ...th, textAlign: 'right', width: '70px' }}>Earned</th>
              <th style={{ ...th, textAlign: 'right', width: '70px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {humanPointsRows.length === 0 && (
              <tr><td colSpan={4} style={{ ...td, color: '#6f7d93', fontStyle: 'italic' }}>
                No teams from your region participated.
              </td></tr>
            )}
            {humanPointsRows.map(row => {
              const total = season.points[`${humanRegion}:${row.abbr}`];
              return (
                <tr key={row.abbr}>
                  <td style={{ ...td, color: '#6f7d93', fontFamily: "'JetBrains Mono', monospace" }}>
                    {row.placement}
                  </td>
                  <td style={{ ...td, color: row.color, fontWeight: 600 }}>
                    {row.name}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: row.points > 0 ? '#6fe8a8' : '#6f7d93' }}>
                    {row.points > 0 ? `+${row.points}` : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                    {total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {skippedSlots.length > 0 && (
          <div style={skipNote}>
            Next up: <strong>{skippedSlots.map(s => s.name).join(' + ')}</strong> —
            coming in a future build. Skipping straight to{' '}
            {nextRealSlot ? nextRealSlot.name : 'circuit completion'}.
          </div>
        )}

        <button style={continueBtn} onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
