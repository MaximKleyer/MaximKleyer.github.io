/**
 * ResignWindow.jsx — Phase 7d UI.
 *
 * Shown when gameState.season.status === 'resign-window'. Lists the
 * human team's expiring players (those with contract.yearsRemaining=0)
 * and lets the user offer extensions before they walk to UFA.
 *
 * Per-player flow mirrors the FA modal:
 *   - Inline row showing player + their morale (the key intel for
 *     re-signing — high morale means cheap, low means expensive or
 *     unsignable)
 *   - Salary input (defaults to base salary)
 *   - Years buttons (1/2/3)
 *   - Submit Offer button → resolveOffer with isResign:true
 *   - Rejection shows gap-tier hint or "wants to leave" override
 *
 * Bulk actions:
 *   - "Re-sign all at base / 1yr" — convenience button to keep the
 *     whole roster intact at fair value (most common case)
 *   - "Let all walk" — release all expiring players (skip the window)
 *
 * AI re-signings have already happened by the time this screen renders
 * — the user only sees their own team's expiring players. The Continue
 * to Offseason button (in Sidebar) is the gate to close the window.
 *
 * Players already re-signed during the window get visually demoted from
 * the list (state changes, expiration check fails, row disappears).
 */

import { useState } from 'react';
import {
  calculateBaseSalary, calculateAsk, moraleTier, resolveOffer,
  computeTeamSalary, computeCapRemaining, SALARY_CAP,
} from '../data/salary.js';
import { flagClass, nationalityName } from '../data/nationalities.js';

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

const GAP_HINT = {
  way_under:  { label: 'WAY UNDER MARKET — they want a lot more',     color: '#ff8c95' },
  far_under:  { label: 'FAR BELOW their asking price',                 color: '#ffb070' },
  close:      { label: 'CLOSE — just bump the offer slightly',         color: '#6aa9ff' },
};

export default function ResignWindow({
  team, gameState, onResign, onWalk, onForceUpdate,
}) {
  // Per-player offer state. Map of playerId → { salary, years, lastReject? }
  const [offers, setOffers] = useState({});

  // Find expiring players (contract.yearsRemaining === 0). Filtered
  // dynamically each render so resigned players drop off naturally.
  const expiring = team.roster.filter(
    p => p.contract && (p.contract.yearsRemaining ?? 1) <= 0
  );

  // Players already locked in (yearsRemaining > 0) — shown for context
  // so user sees "here's who's coming back regardless"
  const locked = team.roster.filter(
    p => p.contract && (p.contract.yearsRemaining ?? 0) > 0
  );

  const capUsed = computeTeamSalary(team);
  const capRemaining = computeCapRemaining(team);

  function getOfferState(player) {
    return offers[player.id] || {
      salary: Math.round(calculateBaseSalary(player.overall) / 1000),
      years: 1,
      lastReject: null,
    };
  }

  function setOfferState(player, partial) {
    setOffers(prev => ({
      ...prev,
      [player.id]: { ...getOfferState(player), ...partial },
    }));
  }

  function submitOffer(player) {
    const state = getOfferState(player);
    const offer = {
      salary: state.salary * 1000,
      years: state.years,
      isResign: true,
    };
    const result = onResign(player, offer);
    if (result?.accepted) {
      // Clear this player's draft state since they're no longer expiring
      setOffers(prev => {
        const next = { ...prev };
        delete next[player.id];
        return next;
      });
    } else if (result?.capExceeded) {
      setOfferState(player, { lastReject: { capExceeded: true } });
    } else if (result) {
      setOfferState(player, {
        lastReject: { gapTier: result.gapTier, reason: result.reason },
      });
    }
  }

  function bulkResignAtBase() {
    // Re-sign everyone at base salary, 1yr. Most expiring players will
    // accept this since base is fair value (morale modifiers might still
    // reject content/loyal players who want even less... but base will
    // be enough since base salary > content-tier ask). Some unhappy
    // players will reject regardless.
    for (const player of expiring) {
      const offer = {
        salary: calculateBaseSalary(player.overall),
        years: 1,
        isResign: true,
      };
      const result = onResign(player, offer);
      if (!result?.accepted && result) {
        // Surface rejection in the per-player offer state
        setOfferState(player, {
          salary: Math.round(calculateBaseSalary(player.overall) / 1000),
          years: 1,
          lastReject: result.capExceeded
            ? { capExceeded: true }
            : { gapTier: result.gapTier, reason: result.reason },
        });
      }
    }
  }

  function bulkWalkAll() {
    // Mark all expiring as walking. They stay at yearsRemaining=0 and
    // will hit the FA pool when the window closes — same as default
    // behavior, just shorthand for "let all walk."
    if (typeof onWalk === 'function') {
      for (const player of expiring) onWalk(player);
    }
    if (typeof onForceUpdate === 'function') onForceUpdate();
  }

  // Helpers for individual row rendering
  const stageBtnStyle = (active) => ({
    padding: '4px 10px',
    background: active ? '#3461d4' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid #3461d4' : '1px solid rgba(255,255,255,0.15)',
    color: active ? '#fff' : '#cdd5e5',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.78rem',
    marginRight: 4,
  });

  return (
    <>
      <h2>Re-Sign Window — {team.name}</h2>

      <div style={{
        marginBottom: 18,
        padding: '14px 16px',
        background: 'rgba(106, 169, 255, 0.06)',
        border: '1px solid rgba(106, 169, 255, 0.25)',
        borderRadius: 8,
      }}>
        <div style={{
          fontSize: '0.66rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#8ab8ff',
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 4,
        }}>
          Phase: Re-sign Window
        </div>
        <div style={{ color: '#cdd5e5', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Players whose contracts ended this season are eligible for re-signing
          before free agency opens. Make offers below to keep them, or let them
          walk to UFA. Use the Sidebar button to continue when done.
        </div>
      </div>

      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        <strong style={{ color: capUsed > SALARY_CAP ? '#ff5460' : '#fff' }}>
          {formatSalary(capUsed)}
        </strong>
        {' / '}
        {formatSalary(SALARY_CAP)}
        {' · '}
        <span style={{ color: capRemaining < 0 ? '#ff5460' : '#a3d977' }}>
          {capRemaining < 0 ? `${formatSalary(-capRemaining)} OVER` : `${formatSalary(capRemaining)} headroom`}
        </span>
      </p>

      {expiring.length === 0 ? (
        <div style={{
          padding: 24,
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          color: '#8a98b1',
        }}>
          No players have expiring contracts this offseason.
          {' '}You're free to continue to the offseason via the sidebar.
        </div>
      ) : (
        <>
          {/* Bulk action row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={bulkResignAtBase}
              style={{
                padding: '8px 14px',
                background: '#3461d4',
                border: '1px solid #3461d4',
                color: '#fff',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Re-sign all at base salary, 1yr
            </button>
            <button
              onClick={bulkWalkAll}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#cdd5e5',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
              }}
            >
              Let all walk to UFA
            </button>
          </div>

          {/* Per-player rows */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 24,
          }}>
            {expiring.map(player => {
              const state = getOfferState(player);
              const totalCommit = state.salary * 1000 * state.years;
              const exceedsCap = (state.salary * 1000) > capRemaining;
              return (
                <div
                  key={player.id}
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                  }}
                >
                  {/* Player header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 12,
                  }}>
                    <div>
                      <strong style={{ fontSize: '1rem' }}>{player.tag}</strong>
                      {player.nationality && (
                        <span
                          className={`fi ${flagClass(player.nationality)}`}
                          title={nationalityName(player.nationality)}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                      <span style={{ marginLeft: 10, color: '#8a98b1', fontSize: '0.85rem' }}>
                        OVR {player.overall} · Age {player.age}
                      </span>
                    </div>
                    <span style={{
                      color: moraleColor(player.morale),
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}>
                      {moraleTier(player.morale)} ({player.morale ?? 65})
                    </span>
                  </div>

                  {/* Offer inputs row */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div>
                      <label style={{
                        fontSize: '0.6rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: '#8a98b1',
                        fontFamily: "'JetBrains Mono', monospace",
                        marginRight: 6,
                      }}>$</label>
                      <input
                        type="number"
                        value={state.salary}
                        min={0}
                        max={2500}
                        step={5}
                        onChange={e => setOfferState(player, { salary: Number(e.target.value) || 0, lastReject: null })}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          padding: '5px 8px',
                          borderRadius: 4,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.9rem',
                          width: 80,
                        }}
                      />
                      <span style={{ color: '#cdd5e5', fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>K</span>
                    </div>

                    <div>
                      {[1, 2, 3].map(y => (
                        <button
                          key={y}
                          onClick={() => setOfferState(player, { years: y, lastReject: null })}
                          style={stageBtnStyle(state.years === y)}
                        >
                          {y}yr
                        </button>
                      ))}
                    </div>

                    <span style={{ color: '#8a98b1', fontSize: '0.78rem' }}>
                      Total: {formatSalary(totalCommit)}
                    </span>

                    <button
                      onClick={() => submitOffer(player)}
                      disabled={exceedsCap}
                      style={{
                        marginLeft: 'auto',
                        padding: '6px 14px',
                        background: exceedsCap ? '#3a4152' : '#3461d4',
                        border: '1px solid #3461d4',
                        color: '#fff',
                        borderRadius: 4,
                        cursor: exceedsCap ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      Submit Offer
                    </button>
                  </div>

                  {/* Per-player rejection / cap warnings */}
                  {state.lastReject?.capExceeded && (
                    <div style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      background: 'rgba(255, 84, 96, 0.10)',
                      border: '1px solid rgba(255, 84, 96, 0.4)',
                      borderRadius: 4,
                      fontSize: '0.82rem',
                      color: '#ff8c95',
                    }}>
                      Offer would exceed your salary cap.
                    </div>
                  )}
                  {state.lastReject && !state.lastReject.capExceeded && (
                    <div style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      background: `${GAP_HINT[state.lastReject.gapTier]?.color || '#ff8c95'}15`,
                      border: `1px solid ${GAP_HINT[state.lastReject.gapTier]?.color || '#ff8c95'}66`,
                      borderRadius: 4,
                      fontSize: '0.82rem',
                      color: '#cdd5e5',
                    }}>
                      <strong style={{ color: GAP_HINT[state.lastReject.gapTier]?.color }}>
                        REJECTED:
                      </strong>{' '}
                      {state.lastReject.reason === 'wants_to_leave'
                        ? 'This player has decided to leave regardless of offer.'
                        : (GAP_HINT[state.lastReject.gapTier]?.label || 'They want more.')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Locked-in players for context */}
      {locked.length > 0 && (
        <>
          <h3 style={{ marginTop: 20, fontSize: '1rem' }}>Locked in for next season</h3>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 0, marginBottom: 8 }}>
            These players have remaining contract years — they're returning regardless.
          </p>
          <table style={{ marginBottom: 18 }}>
            <thead>
              <tr>
                <th>Tag</th><th>OVR</th><th>Age</th><th>Salary</th><th>Yrs Left</th><th>Morale</th>
              </tr>
            </thead>
            <tbody>
              {locked.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.tag}</strong></td>
                  <td>{p.overall}</td>
                  <td>{p.age}</td>
                  <td>{formatSalary(p.contract.salary)}</td>
                  <td>{p.contract.yearsRemaining}</td>
                  <td style={{ color: moraleColor(p.morale) }}>
                    {moraleTier(p.morale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
