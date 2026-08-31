/**
 * MatchReport.jsx — a completed series, presented the way VLR presents a
 * match page: logos and final score up top, map tabs plus an All Maps
 * aggregate, the round-by-round strip, and full stat lines
 * (R/ACS/K/D/A/+/-/KAST/ADR/HS%/FK/FD) per team.
 *
 * Shares its rendering with the live viewer via matchStats.jsx. Matches
 * the human played carry a round log, which unlocks the strip and the
 * attack/defense filters; AI matches show the stat tables without them.
 */

import { useState } from 'react';
import { mapName } from '../data/maps.js';
import TeamLogo from './TeamLogo.jsx';
import {
  StatTable, RoundStrip, rowsFromLog, rowsFromStats, aggregateRows, buildPlayersMap,
} from './matchStats.jsx';

export default function MatchReport({ result, teamA, teamB }) {
  const [mapIdx, setMapIdx] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');

  if (!result?.maps?.length) return null;
  const maps = result.maps;
  const map = typeof mapIdx === 'number' ? maps[mapIdx] : null;
  const players = buildPlayersMap(maps, teamA, teamB);
  const abbrA = teamA?.abbr, abbrB = teamB?.abbr;

  const hasStats = maps.some(m => m.playerStats && Object.keys(m.playerStats).length > 0);
  const hasLog = !!map?.roundLog?.length;
  const total = map?.totalRounds || 0;

  const rowsFor = side => {
    if (map) {
      return hasLog
        ? rowsFromLog(map, total, sideFilter, players, side)
        : rowsFromStats(map, players, side);
    }
    return aggregateRows(maps, players, side);
  };

  // Winner-first final score.
  const winnerIsA = result.winner === teamA;
  const [sa, sb] = result.score || [0, 0];

  const tabBtn = (active, onClick, children, key) => (
    <button key={key} onClick={onClick} style={{
      padding: '6px 14px', cursor: 'pointer', borderRadius: 4, fontSize: '0.74rem',
      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.14)', color: 'inherit', fontWeight: 600,
    }}>{children}</button>
  );

  return (
    <div>
      {/* ── Score header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 18, margin: '6px 0 4px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700, color: '#6aa9ff', opacity: winnerIsA ? 1 : 0.65 }}>
          <TeamLogo team={teamA} size={26} />{teamA?.name}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.6rem', fontWeight: 700 }}>
          {map ? map.roundsA : sa}
        </span>
        <span style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{map ? mapName(map.mapId) : 'Series'}</div>
          <div style={{ fontSize: '0.66rem', opacity: 0.6 }}>
            {map
              ? (map.pickedBy ? `pick: ${map.pickedBy === 'A' ? abbrA : abbrB}` : 'decider')
              : `${result.winner?.abbr} wins ${winnerIsA ? `${sa}–${sb}` : `${sb}–${sa}`}`}
            {map?.wentToOvertime ? ' · OT' : ''}
          </div>
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.6rem', fontWeight: 700 }}>
          {map ? map.roundsB : sb}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 700, color: '#ff8c95', opacity: winnerIsA ? 0.65 : 1 }}>
          {teamB?.name}<TeamLogo team={teamB} size={26} />
        </span>
      </div>

      {/* ── Map tabs ── */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 6px' }}>
        {tabBtn(mapIdx === 'all', () => setMapIdx('all'), 'All Maps', 'all')}
        {maps.map((m, i) => tabBtn(mapIdx === i, () => setMapIdx(i), (
          <>
            <span style={{ opacity: 0.5, marginRight: 5 }}>{i + 1}</span>
            {mapName(m.mapId)}
            <span style={{ marginLeft: 6, opacity: 0.6, fontSize: '0.9em' }}>
              {m.winner === teamA
                ? `${Math.max(m.roundsA, m.roundsB)}-${Math.min(m.roundsA, m.roundsB)}`
                : `${Math.min(m.roundsA, m.roundsB)}-${Math.max(m.roundsA, m.roundsB)}`}
            </span>
          </>
        ), i))}
      </div>

      {/* ── Body ── */}
      {!hasStats ? (
        <p style={{ textAlign: 'center', opacity: 0.55, margin: '24px 0', fontSize: '0.85rem' }}>
          Player detail is not archived for this match.
        </p>
      ) : (
        <>
          {map && hasLog && (
            <>
              <RoundStrip map={map} upTo={total} abbrA={abbrA} abbrB={abbrB} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                {['all', 'attack', 'defend'].map(f => (
                  <button key={f} onClick={() => setSideFilter(f)} style={{
                    padding: '3px 10px', cursor: 'pointer', borderRadius: 4, fontSize: '0.68rem',
                    background: sideFilter === f ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.14)', color: 'inherit', textTransform: 'capitalize',
                  }}>{f}</button>
                ))}
              </div>
            </>
          )}
          <StatTable rows={rowsFor('A')} />
          <StatTable rows={rowsFor('B')} />
        </>
      )}
    </div>
  );
}
