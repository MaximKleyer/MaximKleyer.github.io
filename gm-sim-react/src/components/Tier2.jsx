/**
 * Tier2.jsx — the region's second division.
 *
 * For now this is a scouting view: the 16 orgs, their strength, and their
 * rosters. Once the Swiss stage and playoff bracket land it gains
 * standings and a bracket; once poaching lands, the interesting column is
 * the one flagging players worth taking.
 *
 * Sorted by team overall so the scene reads top-to-bottom, and rows
 * expand to the full roster rather than opening a separate screen —
 * scouting means comparing several teams quickly.
 */

import { useState } from 'react';
import RegionSelector from './RegionSelector.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';
import { evaluatePoach, refusalChance, REFUSAL_MORALE, expectedAcs } from '../engine/poaching.js';
import { getSwissStandings } from '../engine/swissFormat.js';
import { RoleTag } from './RoleTag.jsx';

// A tier-2 player at or above this is worth a tier-1 team's attention.
const NOTABLE_OVR = 72;

function ovrColor(v) {
  if (v >= 78) return '#4ade80';
  if (v >= 70) return '#a3e635';
  if (v >= 60) return '#facc15';
  if (v >= 52) return '#fb923c';
  return '#ff5460';
}

function formatSalary(n) {
  if (n == null) return '—';
  return '$' + Math.round(n / 1000) + 'K';
}

function RosterRow({ player, scouting }) {
  const notable = player.overall >= NOTABLE_OVR;
  const form = scouting?.form ?? 0;
  const resists = (player.morale ?? 65) >= REFUSAL_MORALE;
  return (
    <tr style={notable ? { background: 'rgba(74,222,128,0.07)' } : undefined}>
      <td style={{ fontWeight: 600 }}>
        {player.tag}
        {notable && (
          <span
            title={`${player.overall} OVR at ${player.age} — a tier-1 side would look at this player`}
            style={{
              marginLeft: 6, fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(74,222,128,0.18)', color: '#4ade80', fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >WATCH</span>
        )}
      </td>
      <td style={{ opacity: 0.75 }}>{player.name}</td>
      <td>
        <span className={flagClass(player.nationality)}
              title={nationalityName(player.nationality)} />
      </td>
      <td>{player.age}</td>
      <td style={{ fontWeight: 700, color: ovrColor(player.overall) }}>{player.overall}</td>
      <td><RoleTag player={player} /></td>
      <td>{player.ratings.aim}</td>
      <td>{player.ratings.positioning}</td>
      <td>{player.ratings.utility}</td>
      <td>{player.ratings.gamesense}</td>
      <td>{player.ratings.clutch}</td>
      <td>{formatSalary(player.contract?.salary)}</td>
      <td>{player.contract?.yearsRemaining ?? '—'}</td>
      <td style={{ textAlign: 'right' }}>{scouting?.acs || '—'}</td>
      <td style={{
        textAlign: 'right', fontWeight: 600,
        color: form > 12 ? '#4ade80' : form < -12 ? '#ff5460' : 'inherit',
      }}>
        {scouting?.acs ? (form > 0 ? `+${form}` : form) : '—'}
      </td>
      <td style={{ textAlign: 'right' }}>
        <span title={resists
          ? `Morale ${player.morale} — may refuse a move (${Math.round(refusalChance(player) * 100)}% chance)`
          : `Morale ${player.morale ?? 65}`}
          style={{ color: resists ? '#fb923c' : 'inherit', fontWeight: resists ? 700 : 400 }}>
          {player.morale ?? 65}{resists ? '★' : ''}
        </span>
      </td>
      {scouting?.onPoach && (
        <td style={{ textAlign: 'right' }}>
          <button
            onClick={() => scouting.onPoach(player)}
            disabled={!scouting.canPoach}
            title={scouting.poachReason}
            style={{
              padding: '3px 9px', fontSize: '0.7rem', fontWeight: 700, borderRadius: 3,
              cursor: scouting.canPoach ? 'pointer' : 'not-allowed',
              background: scouting.canPoach ? 'rgba(255,70,85,0.85)' : 'transparent',
              border: `1px solid ${scouting.canPoach ? '#ff4655' : 'rgba(255,255,255,0.15)'}`,
              color: scouting.canPoach ? '#fff' : 'inherit',
              opacity: scouting.canPoach ? 1 : 0.4,
            }}
          >SIGN</button>
        </td>
      )}
    </tr>
  );
}

function TeamCard({ team, rank, expanded, onToggle, scoutFor, standing }) {
  const notable = team.roster.filter(p => p.overall >= NOTABLE_OVR);
  const ages = team.roster.map(p => p.age);
  const avgAge = ages.length ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : '—';
  const payroll = team.roster.reduce((s, p) => s + (p.contract?.salary || 0), 0);

  return (
    <div style={{
      // Longhand sides — see the note in Strategy.jsx.
      borderTop: '1px solid rgba(255,255,255,0.08)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${team.color}`,
      borderRadius: 6, marginBottom: 8, overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', background: 'transparent', border: 'none',
          color: 'inherit', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit', fontSize: '0.9rem',
        }}
      >
        <span style={{ width: 22, opacity: 0.45, fontSize: '0.8em' }}>{rank}</span>
        <strong style={{ minWidth: 58 }}>{team.abbr}</strong>
        <span style={{ flex: 1, opacity: 0.85 }}>
          {team.name}
          {team.parentAbbr && (
            <span style={{
              marginLeft: 8, fontSize: '0.68em', opacity: 0.55,
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 5px',
            }}>ACADEMY · {team.parentAbbr}</span>
          )}
        </span>
        {standing && (
          <span style={{
            fontSize: '0.72em', fontWeight: 700,
            color: standing.qualified ? '#4ade80' : standing.eliminated ? '#ff5460' : 'inherit',
          }} title={`Round diff ${standing.roundDiff}`}>
            {standing.wins}-{standing.losses}
          </span>
        )}
        {notable.length > 0 && (
          <span style={{ fontSize: '0.7em', color: '#4ade80', fontWeight: 700 }}>
            {notable.length} to watch
          </span>
        )}
        <span style={{ fontSize: '0.72em', opacity: 0.5 }}>avg {avgAge}y</span>
        <span style={{ fontSize: '0.72em', opacity: 0.5 }}>{formatSalary(payroll)}</span>
        <span style={{ fontWeight: 700, color: ovrColor(team.overallRating), minWidth: 26, textAlign: 'right' }}>
          {team.overallRating}
        </span>
        <span style={{ opacity: 0.4, fontSize: '0.8em' }}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <table style={{ width: '100%', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ opacity: 0.5, fontSize: '0.85em' }}>
                <th style={{ textAlign: 'left' }}>Tag</th>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th>Nat</th><th>Age</th><th>OVR</th>
                <th title="Primary role, and secondary if they have one">Role</th>
                <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
                <th>Salary</th><th>Yrs</th>
                <th title="Average combat score this stage" style={{ textAlign: 'right' }}>ACS</th>
                <th title="ACS against what this player's rating predicts" style={{ textAlign: 'right' }}>Form</th>
                <th title="90+ may refuse a move" style={{ textAlign: 'right' }}>Mor</th>
                {scoutFor?.enabled && <th></th>}
              </tr>
            </thead>
            <tbody>
              {team.roster.map(p => (
                <RosterRow key={p.id} player={p} scouting={scoutFor?.for(p)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Tier2({
  gameState, viewRegion, onChangeRegion,
  humanTeam = null, canPoach = false, movesRemaining = null, onPoach = null,
}) {
  const [expanded, setExpanded] = useState(null);

  const region = gameState.regions?.[viewRegion];
  const tier2 = region?.tier2;

  if (!tier2?.teams?.length) {
    return (
      <div>
        <h2>Tier 2 — {region?.name}</h2>
        <RegionSelector current={viewRegion} onChange={onChangeRegion} />
        <p style={{ opacity: 0.6 }}>No tier-2 scene exists in this save.</p>
      </div>
    );
  }

  // Once a stage has been played, rank by actual result rather than raw
  // strength — the table should reflect what happened, not the preseason.
  const standings = tier2.swiss ? getSwissStandings(tier2.swiss) : null;
  const standingFor = t => standings?.find(s2 => s2.team === t) || null;
  const ranked = standings
    ? standings.map(s2 => s2.team)
    : [...tier2.teams].sort((a, b) => b.overallRating - a.overallRating);

  // Scouting: form is only meaningful once a stage has been played.
  const scoutFor = {
    enabled: !!(canPoach && humanTeam && onPoach),
    for(player) {
      const acs = player.avgAcs;
      const expected = expectedAcs(player.overall);
      const base = {
        acs,
        form: acs > 0 ? Math.round(acs - expected) : 0,
      };
      if (!this.enabled) return base;
      const evaluation = evaluatePoach(gameState, humanTeam, player, { movesRemaining });
      return {
        ...base,
        onPoach,
        canPoach: evaluation.allowed,
        poachReason: evaluation.reason ||
          `Sign ${player.tag} for the rest of the season ($${Math.round((player.contract?.salary || 0) / 1000)}K)`,
      };
    },
  };
  const allPlayers = tier2.teams.flatMap(t => t.roster);
  const watch = allPlayers.filter(p => p.overall >= NOTABLE_OVR).sort((a, b) => b.overall - a.overall);
  const avgOvr = Math.round(tier2.teams.reduce((s, t) => s + t.overallRating, 0) / tier2.teams.length);

  return (
    <div>
      <h2>Tier 2 — {region.name}</h2>
      <RegionSelector current={viewRegion} onChange={(r) => { onChangeRegion(r); setExpanded(null); }} />

      <p style={{ opacity: 0.65, fontSize: '0.85em', margin: '8px 0 14px' }}>
        16 open-circuit teams · league average {avgOvr} OVR ·{' '}
        <span style={{ color: '#4ade80' }}>{watch.length} players worth watching</span>
        {' '}· click a team to see its roster
      </p>

      {scoutFor.enabled ? (
        <p style={{
          margin: '0 0 14px', fontSize: '0.82em', padding: '8px 12px', borderRadius: 5,
          background: 'rgba(255,70,85,0.08)', border: '1px solid rgba(255,70,85,0.3)',
        }}>
          <strong>Signing window open.</strong>{' '}
          {movesRemaining == null
            ? 'Offseason — sign as many as your cap and roster allow.'
            : `${movesRemaining} signing${movesRemaining === 1 ? '' : 's'} left this season — a tier-2 poach spends one, the same as a free agent.`}
          {' '}Players marked{' '}
          <span style={{ color: '#fb923c', fontWeight: 700 }}>★</span> are happy where they are and
          may turn you down.
        </p>
      ) : (
        <p style={{ margin: '0 0 14px', fontSize: '0.8em', opacity: 0.5 }}>
          Poaching opens during the mid-season window between stages, and again in the offseason.
        </p>
      )}

      {watch.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Standouts</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {watch.slice(0, 10).map(p => {
              const team = tier2.teams.find(t => t.roster.includes(p));
              return (
                <span key={p.id} style={{
                  fontSize: '0.78em', padding: '5px 9px', borderRadius: 5,
                  border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.07)',
                }}>
                  <strong>{p.tag}</strong>
                  <span style={{ opacity: 0.6 }}> {team?.abbr}</span>
                  <span style={{ color: ovrColor(p.overall), fontWeight: 700 }}> {p.overall}</span>
                  <span style={{ opacity: 0.5 }}> · {p.age}y</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {ranked.map((team, i) => (
        <TeamCard
          key={team.abbr}
          team={team}
          rank={i + 1}
          standing={standingFor(team)}
          scoutFor={scoutFor}
          expanded={expanded === team.abbr}
          onToggle={() => setExpanded(e => (e === team.abbr ? null : team.abbr))}
        />
      ))}
    </div>
  );
}
