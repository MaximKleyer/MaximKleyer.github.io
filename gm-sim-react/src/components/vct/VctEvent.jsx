/**
 * VctEvent.jsx — a Kickoff / Cup / Masters / Champions page.
 *
 * Swiss standings (when the event has a Swiss) plus the double-elim
 * bracket, reading either the finished event from the store or the live
 * cursor mid-event. The bracket renderer understands the
 * bracketInternational shape directly: UB R1 → UB SF → UB Final,
 * LB R1 → LB R2 → LB R3 → LB Final, Grand Final.
 */

import { useState } from 'react';
import { REGIONS, REGION_KEYS } from '../../data/regions.js';
import { getSwissStandings } from '../../engine/swissFormat.js';
import TeamLogo from '../TeamLogo.jsx';

function MatchBox({ match, bestOf, label }) {
  const r = match?.result;
  // Bracket results come in two shapes: full series results (winner is
  // a team, score array) or nothing yet.
  const winner = r?.winner || null;
  const score = r?.score || null;
  const isHuman = match?.teamA?.isHuman || match?.teamB?.isHuman;
  return (
    <div style={{
      padding: '6px 9px', borderRadius: 5, fontSize: '0.78rem', minWidth: 170,
      background: isHuman ? 'rgba(255,70,85,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isHuman ? 'rgba(255,70,85,0.4)' : 'rgba(255,255,255,0.1)'}`,
    }}>
      {label && (
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.1em', opacity: 0.5, marginBottom: 3 }}>
          {label}{bestOf === 5 ? ' · BO5' : ''}
        </div>
      )}
      {[match?.teamA, match?.teamB].map((t, i) => {
        const won = winner && winner === t;
        const lost = winner && !won;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: lost ? 0.45 : 1, fontWeight: won ? 700 : 500,
          }}>
            {t ? <TeamLogo team={t} size={15} /> : null}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t?.abbr || 'TBD'}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {score ? score[t === match.teamA ? 0 : 1] : '–'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BracketView({ bracket }) {
  if (!bracket) return <p style={{ opacity: 0.6 }}>Bracket forms when the Swiss resolves.</p>;
  const col = { display: 'grid', gap: 10, alignContent: 'start' };
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 6 }}>
      <div style={col}>
        {bracket.ubR1.map((m, i) => <MatchBox key={i} match={m} label={`UB QF ${i + 1}`} />)}
      </div>
      <div style={col}>
        {bracket.ubSF.map((m, i) => <MatchBox key={i} match={m} label={`UB SF ${i + 1}`} />)}
        {bracket.lbR1.map((m, i) => <MatchBox key={`l${i}`} match={m} label={`LB R1 ${i + 1}`} />)}
      </div>
      <div style={col}>
        <MatchBox match={bracket.ubFinal} label="UB FINAL" />
        {bracket.lbR2.map((m, i) => <MatchBox key={i} match={m} label={`LB R2 ${i + 1}`} />)}
      </div>
      <div style={col}>
        <MatchBox match={bracket.lbR3} label="LB R3" />
        <MatchBox match={bracket.lbFinal} bestOf={5} label="LB FINAL" />
      </div>
      <div style={col}>
        <MatchBox match={bracket.grandFinal} bestOf={5} label="GRAND FINAL" />
      </div>
    </div>
  );
}

export default function VctEvent({ gameState, slotKey, global = false }) {
  const [regionKey, setRegionKey] = useState(gameState.humanRegion);
  const circuit = gameState.circuit;
  const live = circuit?.live;

  // Live cursor takes precedence for whatever it is mid-playing.
  let event = null;
  if (live?.type === 'event' && live.slotKey === slotKey
      && (global || live.regionKey === regionKey)) {
    event = live.event;
  } else {
    const stored = circuit?.events?.[slotKey];
    event = global ? stored : stored?.[regionKey];
  }

  const standings = event?.swiss ? getSwissStandings(event.swiss) : null;

  return (
    <div>
      {!global && (
        <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
          {REGION_KEYS.map(rk => (
            <button key={rk} onClick={() => setRegionKey(rk)} style={{
              padding: '5px 12px', cursor: 'pointer', borderRadius: 4, fontWeight: 600, color: 'inherit',
              background: rk === regionKey ? `${REGIONS[rk].color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${rk === regionKey ? REGIONS[rk].color : 'rgba(255,255,255,0.14)'}`,
            }}>{REGIONS[rk].name}</button>
          ))}
        </div>
      )}

      {!event ? (
        <p style={{ opacity: 0.6 }}>This event hasn't started yet.</p>
      ) : (
        <>
          {standings && (
            <>
              <h3 style={{ fontSize: '0.72rem', letterSpacing: '0.12em', opacity: 0.6 }}>SWISS · first to 4 wins</h3>
              <table style={{ marginBottom: 18 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Team</th>
                    <th>W</th><th>L</th><th>RD</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(s => (
                    <tr key={s.team.abbr} className={s.team.isHuman ? 'highlight' : ''}>
                      <td style={{ textAlign: 'left' }}>
                        <TeamLogo team={s.team} size={16} /> {s.team.name}
                        {s.team.subRegion && (
                          <span style={{
                            marginLeft: 6, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em',
                            padding: '1px 5px', borderRadius: 3,
                            background: 'rgba(62,196,136,0.15)', color: '#3ec488',
                          }}>QUALIFIER</span>
                        )}
                      </td>
                      <td>{s.wins}</td>
                      <td>{s.losses}</td>
                      <td>{s.roundDiff > 0 ? '+' : ''}{s.roundDiff}</td>
                      <td style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        {s.qualified
                          ? <span style={{ color: '#3ec488' }}>BRACKET</span>
                          : s.eliminated
                            ? <span style={{ color: '#ff5460' }}>OUT</span>
                            : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <h3 style={{ fontSize: '0.72rem', letterSpacing: '0.12em', opacity: 0.6 }}>PLAYOFF BRACKET</h3>
          <BracketView bracket={event.bracket} />
          {event.placements?.champion && (
            <p style={{ marginTop: 14, fontWeight: 700, color: '#f0c54a' }}>
              🏆 {event.placements.champion.name} — champions
            </p>
          )}
        </>
      )}
    </div>
  );
}
