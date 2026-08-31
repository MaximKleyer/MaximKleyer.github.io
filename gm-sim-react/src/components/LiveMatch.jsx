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

import { useEffect, useRef, useState } from 'react';
import { mapName } from '../data/maps.js';
import TeamLogo from './TeamLogo.jsx';
import {
  StatTable, RoundStrip, rowsFromLog, aggregateRows, buildPlayersMap,
} from './matchStats.jsx';

const ROUND_MS = 1500;               // per-round delay at 1×
const SPEEDS = [0.5, 1, 2, 4];

export default function LiveMatch({ gameState, seriesId, onAdvanceMap, onSimSeries, onSeriesRevealed, onClose }) {
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

  const maps = series?.maps || [];
  const latest = maps.length - 1;
  const activeIdx = mapIdx === 'latest' ? latest : mapIdx;
  const map = typeof activeIdx === 'number' && activeIdx >= 0 ? maps[activeIdx] : null;

  // A new map appeared → jump to it and restart the animation. This runs
  // DURING render (React's derived-state reset), not in an effect: an
  // effect fires after the first commit, and that one stale frame both
  // spoiled the new map and — when the new map was shorter than the
  // fully-revealed previous one — read past the round log and
  // white-screened the whole app.
  //
  // The guard MUST be state, never a ref. An earlier version tracked the
  // animated map count in a ref, and in dev StrictMode react-dom can
  // discard a render after the ref mutation while also discarding its
  // queued setState — the guard then reads "already reset" forever, the
  // reveal counter keeps the previous map's value, and every later map
  // snaps in fully revealed. State comparison is replayed with the
  // render, so a discarded reset simply re-issues.
  const [animatedLen, setAnimatedLen] = useState(maps.length);
  if (maps.length !== animatedLen) {
    setAnimatedLen(maps.length);
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

  // The series result is only "seen" once the final map's reveal
  // finishes — that is when App may release anything it held back to
  // avoid spoilers (the corner result toast). Effect, not render logic:
  // it must fire exactly once per completion, after commit.
  const seriesOverNow = !!series?.winner;
  const revealedOnce = useRef(false);
  useEffect(() => {
    if (seriesOverNow && latestDone && !revealedOnce.current) {
      revealedOnce.current = true;
      onSeriesRevealed?.();
    }
  }, [seriesOverNow, latestDone]);

  // Round ticker — only runs while the user is actually watching the
  // animating map; browsing another tab pauses rather than finishes it.
  useEffect(() => {
    if (!playing || !animating) return undefined;
    const t = setInterval(() => setRevealed(r => Math.min(latestTotal, r + 1)), ROUND_MS / speed);
    return () => clearInterval(t);
  }, [playing, animating, speed, latestTotal]);

  // "All maps" aggregate over finished maps only, so the tab can't
  // spoil the one still animating.
  const finishedMaps = maps.filter((m, i) => !(i === latest && !latestDone));

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
  const players = buildPlayersMap(maps, series.teamA, series.teamB);

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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 700, color: '#6aa9ff' }}>
            <TeamLogo team={series.teamA} size={28} />{series.teamA?.name}
          </span>
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', fontWeight: 700, color: '#ff8c95' }}>
            {series.teamB?.name}<TeamLogo team={series.teamB} size={28} />
          </span>
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
          finishedMaps.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.6, margin: '30px 0' }}>No completed maps yet.</p>
          ) : (
            <>
              <StatTable rows={aggregateRows(finishedMaps, players, 'A')} />
              <StatTable rows={aggregateRows(finishedMaps, players, 'B')} />
            </>
          )
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
            <StatTable rows={rowsFromLog(map, clampedUpTo, sideFilter, players, 'A')} />
            <StatTable rows={rowsFromLog(map, clampedUpTo, sideFilter, players, 'B')} />
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
