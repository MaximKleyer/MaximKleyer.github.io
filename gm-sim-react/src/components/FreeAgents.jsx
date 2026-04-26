/**
 * FreeAgents.jsx — Lists unsigned players with a contract negotiation flow.
 *
 * Phase 7b adds:
 *   - Morale tier column for each FA
 *   - Sign flow: clicking "Sign" opens a modal with salary + years inputs.
 *     User submits offer; if it meets the player's hidden ask, the
 *     signing succeeds; otherwise the modal stays open with a tier hint
 *     ("market" / "premium" / "demanding") so the user can adjust.
 *   - Cap awareness: signings that would exceed the team's cap are
 *     blocked at the offer stage, before the ask check.
 *
 * The modal collects an offer object and passes it to App.jsx via the
 * onSign callback. Phase 7a's resolveOffer handles the actual logic.
 */

import { useState } from 'react';
import DeltaIndicator from './DeltaIndicator.jsx';
import EditableCell from './EditableCell.jsx';
import NationalitySelect from './NationalitySelect.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import {
  calculateBaseSalary, moraleTier,
} from '../data/salary.js';

function formatSalary(n) {
  if (n == null) return '—';
  return '$' + Math.round(n / 1000) + 'K';
}

function moraleColor(morale) {
  const m = morale ?? 65;
  if (m >= 80) return '#a3d977';
  if (m >= 60) return '#cdd5e5';
  if (m >= 40) return '#cdb6f2';
  if (m >= 20) return '#ffb070';
  return '#ff8c95';
}

// Tier hint colors and labels for the rejection feedback in the modal.
// The KEY here is the gap tier (offer-vs-ask), NOT the ask classification.
// Tells the user how close their offer was so they can adjust intelligently.
const GAP_HINT = {
  way_under:  { label: 'WAY UNDER MARKET — they want a lot more',     color: '#ff8c95' },
  far_under:  { label: 'FAR BELOW their asking price',                 color: '#ffb070' },
  close:      { label: 'CLOSE — just bump the offer slightly',         color: '#6aa9ff' },
};

export default function FreeAgents({
  freeAgents, canSign, onSign,
  godMode = false, onEditPlayer,
  midseasonInfo = null,
  capRemaining = null, // Phase 7b: how much cap the human team has left
}) {
  const [sortKey, setSortKey] = useState('overall');
  const [signTarget, setSignTarget] = useState(null);   // player being negotiated with
  const [offerSalary, setOfferSalary] = useState(0);    // salary input ($K)
  const [offerYears, setOfferYears] = useState(1);
  const [lastReject, setLastReject] = useState(null);   // {askTier, capExceeded, reason} from previous attempt
  const [, forceUpdate] = useState(0);

  const sorted = [...freeAgents].sort((a, b) => {
    if (sortKey === 'overall') return b.overall - a.overall;
    if (sortKey === 'morale') return (b.morale ?? 65) - (a.morale ?? 65);
    return (b.ratings[sortKey] || 0) - (a.ratings[sortKey] || 0);
  });

  const SortBtn = ({ label, value }) => (
    <button
      className={sortKey === value ? 'active' : ''}
      onClick={() => setSortKey(value)}
    >
      {label}
    </button>
  );

  const editStat = (player, stat) => (v) => onEditPlayer?.(player, stat, v);

  // Open the sign modal with sensible defaults: salary = base for that
  // OVR, years = 1. User can tweak both.
  function startNegotiation(player) {
    if (!canSign) return;
    const baseK = Math.round(calculateBaseSalary(player.overall) / 1000);
    setSignTarget(player);
    setOfferSalary(baseK);
    setOfferYears(1);
    setLastReject(null);
  }

  // Submit the current offer. Calls onSign with the offer; App.jsx's
  // signPlayer resolves it and reports back via window state. If the
  // call returns a result object (accepted/rejected), we react here.
  function submitOffer() {
    if (!signTarget) return;
    const offer = {
      salary: offerSalary * 1000,
      years: offerYears,
    };
    const result = onSign(signTarget, offer);
    if (result?.accepted) {
      // Modal closes; signTarget will be removed from the FA list on
      // next render via the parent's state update
      setSignTarget(null);
      setLastReject(null);
    } else if (result?.capExceeded) {
      setLastReject({ capExceeded: true });
      forceUpdate(n => n + 1);
    } else if (result) {
      // Rejected — show the gap tier so user can adjust intelligently.
      // The hint describes how close the offer was to the ask, NOT the
      // market position of the ask itself.
      setLastReject({
        gapTier: result.gapTier,
        reason: result.reason,
      });
      forceUpdate(n => n + 1);
    }
  }

  // Total commitment if the current offer is accepted
  const totalCommit = (offerSalary * 1000) * offerYears;
  const exceedsCap = capRemaining != null && (offerSalary * 1000) > capRemaining;

  return (
    <>
      <h2>Free Agents</h2>
      <p className="muted">{sorted.length} available players</p>

      {midseasonInfo && (
        <div style={{
          marginBottom: 12,
          padding: '10px 14px',
          background: midseasonInfo.used >= midseasonInfo.max
            ? 'rgba(255, 70, 85, 0.10)'
            : 'rgba(106, 169, 255, 0.12)',
          border: midseasonInfo.used >= midseasonInfo.max
            ? '1px solid rgba(255, 70, 85, 0.40)'
            : '1px solid rgba(106, 169, 255, 0.40)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.85rem',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.66rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: midseasonInfo.used >= midseasonInfo.max ? '#ff8c95' : '#8ab8ff',
            fontWeight: 700,
          }}>
            💼 Mid-Season FA Window
          </span>
          <span style={{ color: '#cdd5e5' }}>
            <strong style={{ color: '#fff' }}>{midseasonInfo.used} / {midseasonInfo.max}</strong> signings used
          </span>
          {midseasonInfo.used >= midseasonInfo.max && (
            <span style={{ color: '#ff8c95', fontStyle: 'italic' }}>
              Cap reached — releases still allowed
            </span>
          )}
        </div>
      )}

      <div className="sort-buttons">
        <SortBtn label="Overall" value="overall" />
        <SortBtn label="Morale" value="morale" />
        <SortBtn label="Aim" value="aim" />
        <SortBtn label="Positioning" value="positioning" />
        <SortBtn label="Utility" value="utility" />
        <SortBtn label="Game Sense" value="gamesense" />
        <SortBtn label="Clutch" value="clutch" />
      </div>

      <table>
        <thead>
          <tr>
            <th>Tag</th><th>Name</th><th>Nat</th><th>Age</th><th>OVR</th>
            <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
            <th>Morale</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(player => {
            const d = player.lastOffseasonDelta;
            return (
            <tr key={player.id}>
              <td>
                {godMode ? (
                  <EditableCell value={player.tag} editable width={80}
                    onCommit={v => onEditPlayer(player, 'tag', v)} />
                ) : (
                  <strong>{player.tag}</strong>
                )}
              </td>
              <td>
                <EditableCell value={player.name} editable={godMode} width={130}
                  onCommit={v => onEditPlayer(player, 'name', v)} />
              </td>
              <td title={nationalityName(player.nationality)}>
                <NationalitySelect
                  value={player.nationality}
                  editable={godMode}
                  onCommit={v => onEditPlayer(player, 'nationality', v)}
                />
              </td>
              <td>
                <EditableCell value={player.age} type="number" editable={godMode} min={16} max={40}
                  onCommit={v => onEditPlayer(player, 'age', v)} />
              </td>
              <td>{player.overall}<DeltaIndicator delta={d?.overall} /></td>
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
              <td>
                <span
                  title={`Morale ${player.morale ?? 65}`}
                  style={{ color: moraleColor(player.morale), fontWeight: 500 }}
                >
                  {moraleTier(player.morale)}
                </span>
              </td>
              <td>
                <button
                  className="btn-small"
                  disabled={!canSign}
                  onClick={() => startNegotiation(player)}
                >
                  {canSign ? 'Sign' : 'Full'}
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {/* Sign / negotiate modal */}
      {signTarget && (
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
            border: '1px solid rgba(106, 169, 255, 0.4)',
            borderRadius: 12,
            padding: 24,
            maxWidth: 520,
            width: '90%',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}>
              <h3 style={{ margin: 0, color: '#fff' }}>
                Sign {signTarget.tag}
              </h3>
              <span style={{
                fontSize: '0.78rem',
                color: '#8a98b1',
              }}>
                OVR {signTarget.overall} · Age {signTarget.age}
              </span>
            </div>
            <p style={{
              color: moraleColor(signTarget.morale),
              fontSize: '0.85rem',
              marginTop: 0,
              marginBottom: 18,
            }}>
              Morale: {moraleTier(signTarget.morale)} ({signTarget.morale ?? 65})
            </p>

            {/* Salary input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block',
                fontSize: '0.66rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#8a98b1',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 6,
              }}>
                Salary (per year)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#cdd5e5', fontFamily: "'JetBrains Mono', monospace" }}>$</span>
                <input
                  type="number"
                  value={offerSalary}
                  min={0}
                  max={2000}
                  step={5}
                  onChange={e => setOfferSalary(Number(e.target.value) || 0)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '1rem',
                    width: 100,
                  }}
                />
                <span style={{ color: '#cdd5e5', fontFamily: "'JetBrains Mono', monospace" }}>K</span>
                <span style={{ color: '#8a98b1', fontSize: '0.78rem', marginLeft: 12 }}>
                  Total: {formatSalary(totalCommit)} over {offerYears}yr
                </span>
              </div>
            </div>

            {/* Years dropdown */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block',
                fontSize: '0.66rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#8a98b1',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 6,
              }}>
                Contract Length
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3].map(y => (
                  <button
                    key={y}
                    onClick={() => setOfferYears(y)}
                    style={{
                      padding: '6px 14px',
                      background: offerYears === y ? '#3461d4' : 'rgba(255,255,255,0.04)',
                      border: offerYears === y ? '1px solid #3461d4' : '1px solid rgba(255,255,255,0.15)',
                      color: offerYears === y ? '#fff' : '#cdd5e5',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                    }}
                  >
                    {y} year{y > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Cap warning if applicable */}
            {exceedsCap && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255, 84, 96, 0.10)',
                border: '1px solid rgba(255, 84, 96, 0.4)',
                borderRadius: 6,
                marginBottom: 14,
                fontSize: '0.85rem',
                color: '#ff8c95',
              }}>
                ⚠ Salary exceeds remaining cap ({formatSalary(capRemaining)} available)
              </div>
            )}

            {/* Last reject hint */}
            {lastReject && !lastReject.capExceeded && (
              <div style={{
                padding: '10px 12px',
                background: `${GAP_HINT[lastReject.gapTier]?.color || '#ff8c95'}15`,
                border: `1px solid ${GAP_HINT[lastReject.gapTier]?.color || '#ff8c95'}66`,
                borderRadius: 6,
                marginBottom: 14,
                fontSize: '0.85rem',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.66rem',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: GAP_HINT[lastReject.gapTier]?.color,
                  marginBottom: 2,
                }}>
                  Offer Rejected
                </div>
                <div style={{ color: '#cdd5e5' }}>
                  {lastReject.reason === 'wants_to_leave'
                    ? 'This player has decided to leave regardless of offer.'
                    : (GAP_HINT[lastReject.gapTier]?.label || 'They want more.')}
                </div>
              </div>
            )}

            {lastReject?.capExceeded && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(255, 84, 96, 0.10)',
                border: '1px solid rgba(255, 84, 96, 0.4)',
                borderRadius: 6,
                marginBottom: 14,
                fontSize: '0.85rem',
                color: '#ff8c95',
              }}>
                Offer would put your team over the salary cap.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-small"
                onClick={() => { setSignTarget(null); setLastReject(null); }}
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
                className="btn-small"
                disabled={
                  exceedsCap ||
                  (lastReject?.reason === 'wants_to_leave')
                }
                onClick={submitOffer}
                style={{
                  background: exceedsCap || lastReject?.reason === 'wants_to_leave'
                    ? '#3a4152'
                    : '#3461d4',
                  border: '1px solid #3461d4',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 4,
                  cursor: exceedsCap || lastReject?.reason === 'wants_to_leave'
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: 600,
                }}
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
