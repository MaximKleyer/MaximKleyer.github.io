/**
 * LiveMatch.jsx — VLR-style live viewer for a series the human is in.
 *
 * The engine already simulated each map; what this component does is
 * REPLAY the map's roundLog at a chosen speed, updating a live
 * scoreboard round by round. That keeps the viewer perfectly honest:
 * the animated numbers are reconstructed from the same events that
 * produced the stored result, so the final frame always matches the
 * match sheet everywhere else in the app.
 *
 * Controls: speed multiplier, pause, skip map (finish the animation
 * instantly), play next map, sim the rest of the series.
 *
 * App mounts this with key={seriesId}: watching a second series in a row
 * must build a FRESH instance, or the previous series' reveal state
 * bleeds over and every map snaps in fully revealed instead of
 * animating.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { mapName } from '../data/maps.js';

const ROUND_MS = 1500;               // per-round delay at 1×
const SPEEDS = [0.5, 1, 2, 4];

const TYPE_GLYPH = { elim: '×', spike: '✸', defuse: '✂', time: '◷' };
const TYPE_LABEL = {
  elim: 'elimination', spike: 'spike detonated', defuse: 'spike defused', time: 'time expired',
};

/** Deterministic per-player headshot% flavor — the sim doesn't model hitboxes. */
function hsPercent(player) {
  let h = 0;
  const id = player?.id || '';
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  const aim = player?.aim ?? 70;
  return Math.max(8, Math.min(42, Math.round(8 + aim * 0.28 + (h % 9) - 4)));
}

/** VLR-ish rating from ACS and K/D. Calibrated so 210 ACS at 1.0 K/D ≈ 1.00. */
function ratingOf(acs, kills, deaths) {
  const kd = kills / Math.max(1, deaths);
  return ((acs / 210) * 0.7 + Math.min(3, kd) * 0.3).toFixed(2);
}

/**
 * Cumulative per-player stats over the log's first `upTo` rounds,
 * optionally filtered to rounds where the given side attacked/defended.
 * Returns rows keyed by lineup index 0-9 (0-4 team A, 5-9 team B).
 */
function tally(roundLog, upTo, sideFilter = 'all') {
  const rows = Array.from({ length: 10 }, () => ({
    kills: 0, deaths: 0, assists: 0, cs: 0, kastRounds: 0, fk: 0, fd: 0, rounds: 0,
  }));
  // Clamp: for one render after a new map lands, `upTo` can still hold
  // the PREVIOUS map's round count — reading past the log's end crashed
  // the whole app when the next map was shorter.
  const limit = Math.min(upTo, roundLog.length);
  for (let ri = 0; ri < limit; ri++) {
    const r = roundLog[ri];
    // Traded deaths count toward KAST — same rule as the engine's
    // derivation: a trade event immediately follows the kill it trades.
    const traded = new Set();
    for (let ei = 0; ei + 1 < r.ev.length; ei++) {
      if (r.ev[ei + 1].d === r.ev[ei].k) traded.add(r.ev[ei].d);
    }
    for (let i = 0; i < 10; i++) {
      const attacking = (i < 5 ? 'A' : 'B') === r.atk;
      if (sideFilter === 'attack' && !attacking) continue;
      if (sideFilter === 'defend' && attacking) continue;
      rows[i].rounds++;
      rows[i].cs += r.cs[i] || 0;
      let hasKA = r.survivors.includes(i) || traded.has(i);
      for (const e of r.ev) {
        if (e.k === i) { rows[i].kills++; hasKA = true; }
        if (e.d === i) rows[i].deaths++;
        if (e.a === i) { rows[i].assists++; hasKA = true; }
      }
      if (r.ev.length > 0) {
        if (r.ev[0].k === i) rows[i].fk++;
        if (r.ev[0].d === i) rows[i].fd++;
      }
      if (hasKA) rows[i].kastRounds++;
    }
  }
  return rows;
}

function num(v, danger) {
  const color = v > 0 ? '#7ed957' : v < 0 ? '#ff5460' : 'inherit';
  return <span style={{ color: danger ? color : 'inherit', fontWeight: 600 }}>{v > 0 && danger ? `+${v}` : v}</span>;
}

function Scoreboard({ map, upTo, sideFilter, players }) {
  const log = map.roundLog || [];
  const rows = tally(log, upTo, sideFilter);
  const lineup = [...map.rosterAIds, ...map.rosterBIds];

  const teamRows = side => {
    const base = side === 'A' ? 0 : 5;
    return [0, 1, 2, 3, 4]
      .map(i => {
        const li = base + i;
        const id = lineup[li];
        const ps = map.playerStats[id];
        const t = rows[li];
        const rounds = Math.max(1, t.rounds);
        const acs = Math.round(t.cs / rounds);
        return { li, id, ps, t, acs };
      })
      .sort((a, b) => b.acs - a.acs);
  };

  const header = (
    <tr style={{ fontSize: '0.62rem', letterSpacing: '0.06em', opacity: 0.55 }}>
      <th style={{ textAlign: 'left', padding: '4px 8px' }}></th>
      <th>R</th><th>ACS</th><th>K</th><th>D</th><th>A</th><th>+/−</th>
      <th>KAST</th><th>ADR</th><th>HS%</th><th>FK</th><th>FD</th>
    </tr>
  );

  const block = side => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
      <thead>{header}</thead>
      <tbody>
        {teamRows(side).map(({ li, id, ps, t, acs }) => {
          const rounds = Math.max(1, t.rounds);
          const pm = t.kills - t.deaths;
          return (
            <tr key={id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ textAlign: 'left', padding: '6px 8px', fontFamily: 'inherit' }}>
                <strong style={{ color: side === 'A' ? '#6aa9ff' : '#ff8c95' }}>{ps?.tag}</strong>
                <span style={{ opacity: 0.45, marginLeft: 8, fontSize: '0.85em' }}>{ps?.teamAbbr}</span>
              </td>
              <td style={{ textAlign: 'center' }}>{ratingOf(acs, t.kills, t.deaths)}</td>
              <td style={{ textAlign: 'center' }}>{acs}</td>
              <td style={{ textAlign: 'center' }}>{t.kills}</td>
              <td style={{ textAlign: 'center', opacity: 0.8 }}>{t.deaths}</td>
              <td style={{ textAlign: 'center', opacity: 0.8 }}>{t.assists}</td>
              <td style={{ textAlign: 'center' }}>{num(pm, true)}</td>
              <td style={{ textAlign: 'center' }}>{Math.round(100 * t.kastRounds / rounds)}%</td>
              <td style={{ textAlign: 'center' }}>{Math.round((t.cs / rounds) * 0.62)}</td>
              <td style={{ textAlign: 'center', opacity: 0.75 }}>{hsPercent(players[id])}%</td>
              <td style={{ textAlign: 'center' }}>{t.fk}</td>
              <td style={{ textAlign: 'center' }}>{t.fd}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return <>{block('A')}{block('B')}</>;
}

/** The two-row round strip: one row per team, win squares with type glyphs. */
function RoundStrip({ map, upTo, abbrA, abbrB }) {
  const log = map.roundLog || [];
  const squares = side => log.slice(0, upTo).map((r, i) => {
    const won = r.w === side;
    const attacking = r.atk === side;
    return (
      <span
        key={i}
        title={`Round ${i + 1} — ${won ? 'won' : 'lost'} (${TYPE_LABEL[r.t] || r.t})`}
        style={{
          width: 17, height: 17, borderRadius: 3, flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.62rem', fontWeight: 700,
          marginLeft: i === 12 ? 10 : 0,
          background: won
            ? (attacking ? 'rgba(255,70,85,0.85)' : 'rgba(64,168,120,0.85)')
            : 'rgba(255,255,255,0.05)',
          color: won ? '#fff' : 'transparent',
        }}
      >{TYPE_GLYPH[r.t] || '×'}</span>
    );
  });

  return (
    <div style={{ display: 'grid', gap: 4, margin: '12px 0' }}>
      {[['A', abbrA], ['B', abbrB]].map(([side, abbr]) => (
        <div key={side} style={{ display: 'flex', gap: 3, alignItems: 'center', overflowX: 'auto' }}>
          <span style={{ width: 44, flex: 'none', fontSize: '0.68rem', opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>{abbr}</span>
          {squares(side)}
        </div>
      ))}
      <div style={{ fontSize: '0.6rem', opacity: 0.45 }}>
        <span style={{ color: 'rgba(255,70,85,0.95)' }}>■</span> attack round win&nbsp;&nbsp;
        <span style={{ color: 'rgba(64,168,120,0.95)' }}>■</span> defense round win&nbsp;&nbsp;
        × elim · ✸ spike · ✂ defuse · ◷ time
      </div>
    </div>
  );
}

export default function LiveMatch({ gameState, seriesId, onAdvanceMap, onSimSeries, onClose }) {
  // Hold the series object itself: when the series completes, the active
  // entry is drained from gameState, but this reference stays valid.
  const seriesRef = useRef(null);
  const entry = (gameState.season.activeSeries || []).find(e => e.seriesId === seriesId) || null;
  if (entry?.series) seriesRef.current = entry.series;
  const series = seriesRef.current;

  const [mapIdx, setMapIdx] = useState('latest');     // number | 'latest' | 'all'
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [sideFilter, setSideFilter] = useState('all');
  const animatedRef = useRef(-1);                     // maps.length last animated

  const maps = series?.maps || [];
  const latest = maps.length - 1;
  const activeIdx = mapIdx === 'latest' ? latest : mapIdx;
  const map = typeof activeIdx === 'number' && activeIdx >= 0 ? maps[activeIdx] : null;

  // A new map appeared → jump to it and restart the animation. This runs
  // DURING render (React's sanctioned derived-state reset), not in an
  // effect: an effect fires after the first commit, and that one stale
  // frame both spoiled the new map and — when the new map was shorter
  // than the fully-revealed previous one — read past the round log and
  // white-screened the whole app.
  if (maps.length - 1 !== animatedRef.current) {
    animatedRef.current = maps.length - 1;
    if (mapIdx !== 'latest') setMapIdx('latest');
    setRevealed(0);
    if (!playing) setPlaying(true);
  }

  // "The latest map is fully revealed" is a property of the DATA, not of
  // which tab the user is looking at. Conflating the two let a tab
  // switch mid-animation spoil the score and un-gate "Play next map".
  const latestTotal = latest >= 0 ? (maps[latest]?.totalRounds || 0) : 0;
  const latestDone = latest < 0 ? true : revealed >= latestTotal;
  const onLatestTab = mapIdx === 'latest';
  const animating = onLatestTab && !latestDone;

  // Round ticker — only runs while the user is actually watching the
  // animating map; browsing another tab pauses rather than finishes it.
  useEffect(() => {
    if (!playing || !animating) return undefined;
    const t = setInterval(() => setRevealed(r => Math.min(latestTotal, r + 1)), ROUND_MS / speed);
    return () => clearInterval(t);
  }, [playing, animating, speed, latestTotal]);

  // "All maps" aggregate over finished maps.
  const allAgg = useMemo(() => {
    const agg = {};
    maps.forEach((m, i) => {
      if (i === latest && !latestDone) return;
      for (const id of [...m.rosterAIds, ...m.rosterBIds]) {
        const ps = m.playerStats[id];
        const a = agg[id] || (agg[id] = { tag: ps.tag, teamAbbr: ps.teamAbbr, kills: 0, deaths: 0, assists: 0, acsSum: 0, maps: 0, fk: 0, fd: 0, kastSum: 0, isA: m.rosterAIds.includes(id) });
        a.kills += ps.kills; a.deaths += ps.deaths; a.assists += ps.assists;
        a.acsSum += ps.acs; a.maps++; a.fk += ps.fk || 0; a.fd += ps.fd || 0; a.kastSum += ps.kast || 0;
      }
    });
    return agg;
  }, [maps.length, latestDone]);

  if (!series) return null;

  const abbrA = series.teamA?.abbr, abbrB = series.teamB?.abbr;
  const upTo = onLatestTab ? revealed : (map?.totalRounds || 0);
  const clampedUpTo = map ? Math.min(upTo, (map.roundLog || []).length) : 0;
  const shownRoundsA = map ? (map.roundLog || []).slice(0, clampedUpTo).filter(r => r.w === 'A').length : 0;
  const shownRoundsB = map ? (map.roundLog || []).slice(0, clampedUpTo).filter(r => r.w === 'B').length : 0;

  // Series score counting only fully revealed maps, so the header never
  // spoils the map still being animated — regardless of which tab the
  // user is browsing.
  let winsA = 0, winsB = 0;
  maps.forEach((m, i) => {
    const done = i < latest || latestDone;
    if (!done) return;
    (m.winner === series.teamA ? winsA++ : winsB++);
  });

  const seriesOver = !!series.winner;
  const mapDone = latestDone;
  const players = {};
  for (const m of maps) {
    for (const id of [...m.rosterAIds, ...m.rosterBIds]) {
      players[id] = { id, aim: undefined };
    }
  }
  for (const t of [series.teamA, series.teamB]) {
    for (const p of t?.roster || []) if (players[p.id]) players[p.id] = { id: p.id, aim: p.ratings?.aim };
  }

  const upcoming = (series.mapPlan || []).slice(maps.length);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 890,
      background: 'rgba(6,8,14,0.9)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{
        width: 'min(940px, 97vw)', maxHeight: '94vh', overflowY: 'auto',
        border: '1px solid rgba(255,70,85,0.35)',
      }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', letterSpacing: '0.04em' }}>
            <span style={{ color: '#ff4655' }}>●</span> LIVE — Bo{series.bestOf}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {SPEEDS.map(x => (
              <button key={x} onClick={() => setSpeed(x)} style={{
                padding: '3px 9px', cursor: 'pointer', borderRadius: 4,
                background: speed === x ? '#ff4655' : 'rgba(255,255,255,0.06)',
                border: '1px solid ' + (speed === x ? '#ff4655' : 'rgba(255,255,255,0.15)'),
                color: speed === x ? '#fff' : 'inherit', fontSize: '0.72rem', fontWeight: 700,
              }}>{x}×</button>
            ))}
            <button onClick={() => setPlaying(p => !p)} disabled={!animating} style={{
              padding: '3px 10px', cursor: 'pointer', borderRadius: 4,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'inherit', fontSize: '0.72rem', opacity: animating ? 1 : 0.4,
            }}>{playing ? '❚❚' : '▶'}</button>
            <button onClick={onClose} style={{
              padding: '3px 10px', cursor: 'pointer', borderRadius: 4,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'inherit', fontSize: '0.72rem',
            }}>✕ Close</button>
          </div>
        </div>

        {/* ── Score line ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 18, margin: '14px 0 4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#6aa9ff' }}>{series.teamA?.name}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.8rem', fontWeight: 700 }}>
            {mapIdx === 'all' ? winsA : shownRoundsA}
          </span>
          <span style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{mapIdx === 'all' ? 'Series' : map ? mapName(map.mapId) : '—'}</div>
            <div style={{ fontSize: '0.68rem', opacity: 0.6 }}>
              {mapIdx !== 'all' && map?.pickedBy && `pick: ${map.pickedBy === 'A' ? abbrA : abbrB}`}
              {mapIdx !== 'all' && map && !map.pickedBy && 'decider'}
              &nbsp;· maps {winsA}–{winsB}
            </div>
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.8rem', fontWeight: 700 }}>
            {mapIdx === 'all' ? winsB : shownRoundsB}
          </span>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ff8c95' }}>{series.teamB?.name}</span>
        </div>

        {/* ── Map tabs ── */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 6px' }}>
          <button onClick={() => setMapIdx('all')} style={{
            padding: '6px 14px', cursor: 'pointer', borderRadius: 4, fontSize: '0.74rem',
            background: mapIdx === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.14)', color: 'inherit', fontWeight: 600,
          }}>All Maps</button>
          {maps.map((m, i) => (
            <button key={i} onClick={() => { setMapIdx(i === latest ? 'latest' : i); }} style={{
              padding: '6px 14px', cursor: 'pointer', borderRadius: 4, fontSize: '0.74rem',
              background: activeIdx === i && mapIdx !== 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.14)', color: 'inherit', fontWeight: 600,
            }}>
              <span style={{ opacity: 0.5, marginRight: 5 }}>{i + 1}</span>{mapName(m.mapId)}
            </button>
          ))}
          {upcoming.map((m, i) => (
            <span key={`u${i}`} style={{
              padding: '6px 14px', borderRadius: 4, fontSize: '0.74rem', opacity: 0.35,
              border: '1px dashed rgba(255,255,255,0.2)',
            }}>
              <span style={{ marginRight: 5 }}>{maps.length + i + 1}</span>{mapName(m.mapId)}
            </span>
          ))}
        </div>

        {/* ── Body ── */}
        {mapIdx === 'all' ? (
          <AllMaps agg={allAgg} />
        ) : map && map.roundLog ? (
          <>
            <RoundStrip map={map} upTo={clampedUpTo} abbrA={abbrA} abbrB={abbrB} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
              {['all', 'attack', 'defend'].map(f => (
                <button key={f} onClick={() => setSideFilter(f)} style={{
                  padding: '3px 10px', cursor: 'pointer', borderRadius: 4, fontSize: '0.68rem',
                  background: sideFilter === f ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.14)', color: 'inherit', textTransform: 'capitalize',
                }}>{f}</button>
              ))}
            </div>
            <Scoreboard map={map} upTo={clampedUpTo} sideFilter={sideFilter} players={players} />
          </>
        ) : (
          <p style={{ textAlign: 'center', opacity: 0.6, margin: '30px 0' }}>
            {maps.length === 0 ? 'The series is about to start.' : 'No round detail for this map.'}
          </p>
        )}

        {/* ── Flow controls ── */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          {animating && (
            <button onClick={() => setRevealed(latestTotal)} style={{
              padding: '8px 16px', cursor: 'pointer', borderRadius: 4, fontWeight: 600,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit',
            }}>Skip to map result ⏭</button>
          )}
          {!seriesOver && mapDone && (
            <button onClick={onAdvanceMap} style={{
              padding: '8px 18px', cursor: 'pointer', borderRadius: 4, fontWeight: 700,
              background: '#ff4655', border: '1px solid #ff4655', color: '#fff',
            }}>{maps.length === 0 ? '▶ Start map 1' : '▶ Play next map'}</button>
          )}
          {!seriesOver && (
            <button onClick={onSimSeries} style={{
              padding: '8px 16px', cursor: 'pointer', borderRadius: 4, fontWeight: 600,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', color: 'inherit',
            }}>⏩ Sim rest of series</button>
          )}
          {seriesOver && mapDone && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '4px 0 8px' }}>
                {series.winner?.name} wins the series{' '}
                {series.winner === series.teamA
                  ? `${series.score?.[0]}–${series.score?.[1]}`
                  : `${series.score?.[1]}–${series.score?.[0]}`}
              </div>
              <button onClick={onClose} style={{
                padding: '8px 18px', cursor: 'pointer', borderRadius: 4, fontWeight: 700,
                background: '#ff4655', border: '1px solid #ff4655', color: '#fff',
              }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AllMaps({ agg }) {
  const rows = Object.entries(agg).map(([id, a]) => ({ id, ...a }));
  if (rows.length === 0) {
    return <p style={{ textAlign: 'center', opacity: 0.6, margin: '30px 0' }}>No completed maps yet.</p>;
  }
  const side = isA => rows
    .filter(r => r.isA === isA)
    .sort((a, b) => (b.acsSum / b.maps) - (a.acsSum / a.maps));

  const table = list => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
      <thead>
        <tr style={{ fontSize: '0.62rem', opacity: 0.55 }}>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}></th>
          <th>R</th><th>ACS</th><th>K</th><th>D</th><th>A</th><th>+/−</th><th>KAST</th><th>FK</th><th>FD</th>
        </tr>
      </thead>
      <tbody>
        {list.map(r => {
          const acs = Math.round(r.acsSum / r.maps);
          return (
            <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ textAlign: 'left', padding: '6px 8px' }}>
                <strong style={{ color: r.isA ? '#6aa9ff' : '#ff8c95' }}>{r.tag}</strong>
                <span style={{ opacity: 0.45, marginLeft: 8, fontSize: '0.85em' }}>{r.teamAbbr}</span>
              </td>
              <td style={{ textAlign: 'center' }}>{ratingOf(acs, r.kills, r.deaths)}</td>
              <td style={{ textAlign: 'center' }}>{acs}</td>
              <td style={{ textAlign: 'center' }}>{r.kills}</td>
              <td style={{ textAlign: 'center', opacity: 0.8 }}>{r.deaths}</td>
              <td style={{ textAlign: 'center', opacity: 0.8 }}>{r.assists}</td>
              <td style={{ textAlign: 'center' }}>{num(r.kills - r.deaths, true)}</td>
              <td style={{ textAlign: 'center' }}>{Math.round(r.kastSum / r.maps)}%</td>
              <td style={{ textAlign: 'center' }}>{r.fk}</td>
              <td style={{ textAlign: 'center' }}>{r.fd}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return <>{table(side(true))}{table(side(false))}</>;
}
