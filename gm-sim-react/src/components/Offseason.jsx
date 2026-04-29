/**
 * Offseason.jsx — Dedicated view shown while season.status === 'offseason-active'.
 *
 * Replaces the Dashboard as the main view during the offseason. Shows:
 *   1. Header with year transition (Season 2025 Complete → 2026)
 *   2. World champion recap card
 *   3. Offseason report cards:
 *      - Retirements (your team's retirees called out + league-wide count)
 *      - Development gainers/losers (from offseasonSummary)
 *      - AI offseason log (every signing/release done by AI teams)
 *   4. Your current roster card with understaffed warning if < 5
 *   5. Embedded FreeAgents list for signing (reuses existing component)
 *   6. Start Preseason button (disabled when roster < 5)
 *
 * The user can freely browse other tabs (Roster, Standings, Stats, History)
 * while in the offseason. The Sidebar's Advance button is blocked for the
 * duration — they can only progress by clicking "Start Preseason" here.
 *
 * User actions that matter:
 *   - Signing an FA → removes from pool, adds to roster (existing signPlayer)
 *   - Releasing a player → existing release handler + NEW: triggers
 *     runReactiveAISignings() so AI teams react to the fresh FA availability
 *   - Start Preseason → handleStartPreseason in App.jsx, flips status to 'active'
 *
 * NOTE: this view is ONLY mounted while status === 'offseason-active'. Once
 * the user clicks Start Preseason, status flips to 'active' and the normal
 * Dashboard takes over.
 */

import { useState } from 'react';
import FreeAgents from './FreeAgents.jsx';
import DeltaIndicator from './DeltaIndicator.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import { ARCHETYPE_INFO } from '../data/archetypes.js';

export default function Offseason({
  gameState,
  humanTeam,
  humanRegionData,
  onSign,
  onRelease,
  onStartPreseason,
}) {
  const seasonNumber = gameState.seasonNumber || 2025;
  const prevYear = seasonNumber - 1;

  // Latest archive entry holds the completed season's summary
  const archive = gameState.archive || [];
  const lastArchive = archive[archive.length - 1];
  const lastWorlds = lastArchive
    ? [...(lastArchive.history || [])].reverse().find(e => e.type === 'worlds')
    : null;
  const summary = lastArchive?.offseasonSummary || {};
  const aiLog = gameState.season?.aiOffseasonLog || [];

  const rosterSize = humanTeam.roster.length;
  const understaffed = rosterSize < 5;
  const slotsOpen = Math.max(0, 5 - rosterSize);

  const canSign = !humanTeam.rosterFull;

  return (
    <div>
      {/* ── HEADER ── */}
      <h2 style={{ marginBottom: 4 }}>Offseason</h2>
      <p className="muted" style={{ marginBottom: 16, fontSize: '0.82rem' }}>
        Season {prevYear} → Season {seasonNumber} · Manage your roster before the new season begins
      </p>

      {/* ── START PRESEASON (TOP) ── */}
      <StartPreseasonBlock
        seasonNumber={seasonNumber}
        understaffed={understaffed}
        onStartPreseason={onStartPreseason}
      />

      {/* ── CHAMPION CARD ── */}
      {lastWorlds?.champion && (
        <div style={{
          marginBottom: 20,
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(255, 209, 102, 0.10), rgba(255, 70, 85, 0.06))',
          border: '1px solid rgba(255, 209, 102, 0.35)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <span style={{ fontSize: '2rem' }}>🏆</span>
          <div>
            <div style={{
              fontSize: '0.64rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#8a98b1',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 2,
            }}>
              Season {prevYear} World Champion
            </div>
            <div style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: lastWorlds.champion.color,
            }}>
              {lastWorlds.champion.name}
            </div>
            {lastWorlds.runnerUp && (
              <div style={{ fontSize: '0.76rem', color: '#8a98b1', marginTop: 2 }}>
                over <span style={{ color: lastWorlds.runnerUp.color, fontWeight: 600 }}>
                  {lastWorlds.runnerUp.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── UNDERSTAFFED WARNING ── */}
      {understaffed && (
        <div style={{
          marginBottom: 20,
          padding: '14px 18px',
          background: 'rgba(255, 70, 85, 0.10)',
          border: '1px solid rgba(255, 70, 85, 0.40)',
          borderRadius: 10,
        }}>
          <div style={{
            fontSize: '0.72rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent, #ff4655)',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            marginBottom: 4,
          }}>
            ⚠ Roster Understaffed — {rosterSize}/5
          </div>
          <div style={{ fontSize: '0.84rem', color: '#c5cbd6' }}>
            Sign {slotsOpen} more player{slotsOpen > 1 ? 's' : ''} from free agency before the season can begin.
            Retirements in the offseason left your roster short.
          </div>
        </div>
      )}

      {/* ── REPORT CARDS (3-column grid) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}>
        <RetirementsCard summary={summary} humanTeam={humanTeam} archive={lastArchive} />
        <DevelopmentCard summary={summary} />
        <AISigningsCard aiLog={aiLog} humanTeam={humanTeam} />
      </div>

      {/* ── YOUR ROSTER ── */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>
          Your Roster ({rosterSize}/5)
          {' '}
          <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#8a98b1' }}>
            — {humanTeam.name}
          </span>
        </h3>
        {humanTeam.roster.length === 0 ? (
          <p className="muted">No players on roster. Sign free agents below.</p>
        ) : (
          <table className="mini-table" style={{ width: '100%', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#8a98b1' }}>
                <th style={{ padding: '4px 8px' }}>Tag</th>
                <th style={{ padding: '4px 8px' }}>Name</th>
                <th style={{ padding: '4px 8px' }}>Nat</th>
                <th style={{ padding: '4px 8px' }}>Age</th>
                <th style={{ padding: '4px 8px' }}>OVR</th>
                <th style={{ padding: '4px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {humanTeam.roster.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 8px' }}><strong>{p.tag}</strong></td>
                  <td style={{ padding: '6px 8px' }}>{p.name}</td>
                  <td style={{ padding: '6px 8px' }} title={nationalityName(p.nationality)}>
                    <span className={flagClass(p.nationality)} />
                  </td>
                  <td style={{ padding: '6px 8px' }}>{p.age}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {p.overall}
                    <DeltaIndicator delta={p.lastOffseasonDelta?.overall} size="small" />
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                    <button
                      className="btn-small btn-danger"
                      onClick={() => onRelease(p)}
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FREE AGENTS (reused component) ── */}
      <div style={{ marginTop: 20 }}>
        <FreeAgents
          freeAgents={humanRegionData.freeAgents}
          canSign={canSign}
          onSign={onSign}
        />
      </div>

      {/* ── START PRESEASON (BOTTOM, redundant with top for UX) ── */}
      <div style={{ marginTop: 24 }}>
        <StartPreseasonBlock
          seasonNumber={seasonNumber}
          understaffed={understaffed}
          onStartPreseason={onStartPreseason}
        />
      </div>
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

/**
 * Reusable Start Preseason button block. Rendered twice in the Offseason
 * view — once at the top (so the user doesn't need to scroll) and once at
 * the bottom (after they've finished reviewing + roster moves). Both call
 * the same onStartPreseason handler passed down from App.jsx.
 *
 * Visually styled to look action-ready when the roster is set, and
 * clearly disabled when understaffed.
 */
function StartPreseasonBlock({ seasonNumber, understaffed, onStartPreseason }) {
  return (
    <div style={{
      padding: '14px 18px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      background: understaffed
        ? 'rgba(255, 70, 85, 0.04)'
        : 'rgba(106, 169, 255, 0.05)',
      border: understaffed
        ? '1px solid rgba(255, 70, 85, 0.20)'
        : '1px solid rgba(106, 169, 255, 0.20)',
      borderRadius: 10,
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.96rem', marginBottom: 2 }}>
          Ready to start Season {seasonNumber}?
        </div>
        <div style={{ fontSize: '0.76rem', color: '#8a98b1' }}>
          {understaffed
            ? `Your roster must have 5 players before the season can begin.`
            : `Your roster is set. Stage 1 will begin immediately after clicking below.`}
        </div>
      </div>
      <button
        onClick={onStartPreseason}
        disabled={understaffed}
        style={{
          padding: '12px 24px',
          background: understaffed ? '#3a4152' : 'var(--accent, #ff4655)',
          border: understaffed
            ? '1px solid #3a4152'
            : '1px solid var(--accent, #ff4655)',
          color: understaffed ? '#6f7d93' : '#fff',
          borderRadius: 6,
          cursor: understaffed ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.92rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        ▶ Start Preseason
      </button>
    </div>
  );
}

function RetirementsCard({ summary, humanTeam, archive }) {
  const retiredCount = summary.retiredCount || 0;

  // Retirements aren't preserved per-player (Phase 6d deletes them) so we
  // can only show the aggregate count. Future phase could stash retiree
  // data on the archive entry for Hall of Fame display.
  return (
    <div style={cardStyle}>
      <div style={subHeaderStyle}>Retirements</div>
      {retiredCount > 0 ? (
        <>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c5cbd6' }}>
            {retiredCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#8a98b1' }}>
            player{retiredCount > 1 ? 's' : ''} retired league-wide
          </div>
        </>
      ) : (
        <div style={{ fontSize: '0.84rem', color: '#8a98b1' }}>
          No retirements this offseason.
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#6f7d93', lineHeight: 1.5 }}>
        Players reaching age 30 retire automatically. Ages 25–29 have
        exponentially increasing odds of retirement each offseason.
      </div>
    </div>
  );
}

function DevelopmentCard({ summary }) {
  const gainers = summary.biggestGainers || [];
  const losers = summary.biggestLosers || [];

  return (
    <div style={cardStyle}>
      <div style={subHeaderStyle}>Development</div>
      {gainers.length === 0 && losers.length === 0 ? (
        <div style={{ fontSize: '0.84rem', color: '#8a98b1' }}>
          No rating changes logged.
        </div>
      ) : (
        <>
          {gainers.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontSize: '0.66rem',
                color: '#4ade80',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 4,
              }}>
                Top Risers
              </div>
              {gainers.slice(0, 3).map((p, i) => (
                <MoverLine key={`g-${i}`} mover={p} positive />
              ))}
            </div>
          )}
          {losers.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.66rem',
                color: '#f87171',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 4,
              }}>
                Top Declines
              </div>
              {losers.slice(0, 3).map((p, i) => (
                <MoverLine key={`l-${i}`} mover={p} positive={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MoverLine({ mover, positive }) {
  const color = positive ? '#4ade80' : '#f87171';
  const sign = mover.delta >= 0 ? '+' : '';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      fontSize: '0.8rem',
      padding: '2px 0',
    }}>
      <strong style={{ color: '#e8ecf3' }}>{mover.tag}</strong>
      <span style={{ color: '#8a98b1', fontSize: '0.72rem' }}>age {mover.age}</span>
      <span style={{ color: '#8a98b1', fontSize: '0.72rem' }}>· {mover.overall} OVR</span>
      <span style={{
        color,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.76rem',
        marginLeft: 'auto',
      }}>
        ({sign}{mover.delta})
      </span>
    </div>
  );
}

function AISigningsCard({ aiLog, humanTeam }) {
  const total = aiLog.length;
  // Highlight moves affecting rivals in the same region as the user
  const userRegionAbbrs = new Set(
    humanTeam
      ? [] // we'd need humanRegionData passed down; keep simple for now
      : []
  );

  return (
    <div style={cardStyle}>
      <div style={subHeaderStyle}>AI Signings</div>
      {total === 0 ? (
        <div style={{ fontSize: '0.84rem', color: '#8a98b1' }}>
          Quiet offseason — no AI teams made moves yet.
        </div>
      ) : (
        <>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c5cbd6', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#8a98b1', marginBottom: 10 }}>
            signing{total > 1 ? 's' : ''} across the league
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {aiLog.slice(-8).reverse().map((move, i) => (
              <AIMoveLine key={i} move={move} />
            ))}
          </div>
          {aiLog.length > 8 && (
            <div style={{ fontSize: '0.68rem', color: '#6f7d93', marginTop: 4, textAlign: 'center' }}>
              showing most recent 8 of {aiLog.length}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AIMoveLine({ move }) {
  const archInfo = ARCHETYPE_INFO[move.archetype] || ARCHETYPE_INFO.BALANCED;
  return (
    <div style={{
      fontSize: '0.74rem',
      padding: '4px 0',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      lineHeight: 1.4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ color: move.teamColor, fontWeight: 700 }}>{move.teamAbbr}</span>
        <span style={{ fontSize: '0.64rem' }} title={archInfo.label}>
          {archInfo.emoji}
        </span>
      </div>
      <div style={{ color: '#c5cbd6', fontSize: '0.72rem' }}>
        signed <strong>{move.signed.tag}</strong> ({move.signed.overall} OVR, age {move.signed.age})
      </div>
      <div style={{ color: '#8a98b1', fontSize: '0.7rem' }}>
        released {move.released.tag} ({move.released.overall} OVR, age {move.released.age})
      </div>
    </div>
  );
}

/* ─────────────── Shared styles ─────────────── */

const cardStyle = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.02)',
};

const subHeaderStyle = {
  fontSize: '0.62rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#8a98b1',
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: 8,
};
