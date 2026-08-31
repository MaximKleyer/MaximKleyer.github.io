/**
 * MapVeto.jsx — Interactive map ban/pick before a human series.
 *
 * The whole pool stays on screen the entire time and maps change STATE
 * where they stand: bans burn red, picks light green, the decider goes
 * yellow. A sequence timeline across the top shows every step of the
 * veto and where it stands.
 *
 * Escape hatches, because a full group stage is a lot of series:
 *   • "Auto-pick & Sim"        — keep the CPU's plan for THIS series
 *   • "Don't ask again ..."    — stop prompting for the rest of the season
 *
 * "Watch live when it starts" hands the resolved series to the live
 * viewer instead of the ordinary advance flow.
 */

import { useMemo, useState } from 'react';
import { mapName, teamMapRating, teamMapOverall } from '../data/maps.js';
import {
  currentStep, isHumanTurn, applyMapAction, applySideChoice,
  runAIUntilHumanTurn, autoCompleteVeto, vetoToMapPlan,
} from '../engine/veto.js';

const BAN = '#ff4655';
const PICK = '#3ec488';
const DECIDER = '#f0c54a';

function ratingColor(v) {
  if (v >= 85) return '#4ade80';
  if (v >= 72) return '#a3e635';
  if (v >= 60) return '#facc15';
  if (v >= 48) return '#fb923c';
  return '#ff5460';
}

/** One chip in the sequence timeline. */
function StepChip({ step, resolvedMapId, isCurrent, sideFor }) {
  const color = step.type === 'ban' ? BAN : step.type === 'pick' ? PICK : DECIDER;
  const label = step.type === 'decider' ? 'DECIDER' : `${step.type.toUpperCase()} ${sideFor(step.actor)}`;
  return (
    <div style={{
      flex: '1 1 90px', minWidth: 86, textAlign: 'center',
      padding: '6px 4px', borderRadius: 4,
      background: resolvedMapId ? `${color}22` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isCurrent ? color : resolvedMapId ? `${color}66` : 'rgba(255,255,255,0.1)'}`,
      boxShadow: isCurrent ? `0 0 10px ${color}55` : 'none',
    }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.1em', fontWeight: 700, color }}>
        {label}
      </div>
      <div style={{ fontSize: '0.74rem', fontWeight: 600, marginTop: 2, minHeight: 16 }}>
        {resolvedMapId ? mapName(resolvedMapId) : isCurrent ? '···' : ''}
      </div>
    </div>
  );
}

export default function MapVeto({ pending, humanTeam, oppTeam, onResolve, onSkipSeason }) {
  // The veto object is mutated in place by the engine; bump to re-render.
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);
  const [watchLive, setWatchLive] = useState(false);

  if (!pending) return null;
  const { veto, humanSide } = pending;
  const teamForSide = side => (side === humanSide ? humanTeam : oppTeam);
  const sideFor = actor => (actor == null ? '' : actor === humanSide ? 'YOU' : oppTeam?.abbr || 'OPP');

  const step = currentStep(veto);
  const myTurn = isHumanTurn(veto);
  const awaitingSide = !!veto.pendingSide && veto.pendingSide.chooser === humanSide;

  // A stable board: every pool map, alphabetical, changing state in place.
  const pool = useMemo(() => {
    const ids = [
      ...veto.bans.map(b => b.mapId),
      ...veto.picks.map(p => p.mapId),
      ...veto.remaining,
    ];
    return [...new Set(ids)].sort((a, b) => mapName(a).localeCompare(mapName(b)));
    // The set of pool maps never changes during one veto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which step resolved which map, for the timeline.
  const resolvedByStep = [];
  {
    let bi = 0, pi = 0;
    for (const st of veto.steps) {
      if (st.type === 'ban') resolvedByStep.push(veto.bans[bi++]?.mapId || null);
      else resolvedByStep.push(veto.picks[pi++]?.mapId || null);
    }
  }

  function mapState(id) {
    const ban = veto.bans.find(b => b.mapId === id);
    if (ban) return { kind: 'ban', by: ban.by };
    const pickIdx = veto.picks.findIndex(p => p.mapId === id);
    if (pickIdx >= 0) {
      const p = veto.picks[pickIdx];
      return p.by == null
        ? { kind: 'decider', order: pickIdx + 1, side: p.firstHalfAttacker }
        : { kind: 'pick', by: p.by, order: pickIdx + 1, side: p.firstHalfAttacker, sideBy: p.sidePickedBy };
    }
    return { kind: 'open' };
  }

  function afterHumanAction() {
    runAIUntilHumanTurn(veto, teamForSide);
    if (veto.complete) {
      onResolve(vetoToMapPlan(veto), { watchLive });
      return;
    }
    rerender();
  }

  function chooseMap(mapId) {
    applyMapAction(veto, mapId);
    afterHumanAction();
  }

  function chooseSide(side) {
    applySideChoice(veto, side);
    afterHumanAction();
  }

  function autoPick() {
    autoCompleteVeto(veto, teamForSide);
    onResolve(vetoToMapPlan(veto), { watchLive });
  }

  const actionWord = step?.type === 'ban' ? 'BAN' : step?.type === 'pick' ? 'PICK' : '';
  const actionColor = step?.type === 'ban' ? BAN : PICK;

  let prompt;
  if (awaitingSide) {
    prompt = `${oppTeam?.abbr} picked ${mapName(veto.pendingSide.mapId)} — choose your starting side`;
  } else if (myTurn) {
    prompt = `Your turn to ${actionWord} a map`;
  } else {
    prompt = 'Waiting on opponent…';
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(6,8,14,0.82)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="card" style={{
        width: 'min(920px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
        border: '1px solid rgba(255,70,85,0.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>
            Map Veto — {pending.teamAAbbr} vs {pending.teamBAbbr}
          </h2>
          <span style={{ fontSize: '0.8em', opacity: 0.7 }}>
            Bo{pending.bestOf}{pending.grandFinal ? ' · Grand Final' : ''}
          </span>
        </div>

        {/* ── Sequence timeline ── */}
        <div style={{ display: 'flex', gap: 6, margin: '14px 0 10px', flexWrap: 'wrap' }}>
          {veto.steps.map((st, i) => (
            <StepChip
              key={i}
              step={st}
              resolvedMapId={resolvedByStep[i]}
              isCurrent={i === veto.stepIndex && !veto.complete}
              sideFor={sideFor}
            />
          ))}
        </div>

        <p style={{ margin: '4px 0 12px', fontWeight: 600, color: myTurn || awaitingSide ? actionColor : 'inherit' }}>
          {prompt}
        </p>

        {/* ── Side choice ── */}
        {awaitingSide && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            {['attack', 'defense'].map(side => {
              const r = teamMapRating(humanTeam, veto.pendingSide.mapId, side);
              return (
                <button
                  key={side}
                  onClick={() => chooseSide(side)}
                  style={{
                    flex: 1, padding: '14px 12px', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${ratingColor(r)}`,
                    borderRadius: 6, color: 'inherit', fontSize: '1em', fontWeight: 600,
                  }}
                >
                  Start on {side === 'attack' ? 'Attack' : 'Defense'}
                  <div style={{ fontSize: '0.85em', fontWeight: 700, color: ratingColor(r), marginTop: 4 }}>
                    your rating {r}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── The board ── */}
        {!awaitingSide && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10, marginBottom: 18,
          }}>
            {pool.map(id => {
              const st = mapState(id);
              const open = st.kind === 'open';
              const clickable = open && myTurn;
              const atk = teamMapRating(humanTeam, id, 'attack');
              const def = teamMapRating(humanTeam, id, 'defense');
              const mine = teamMapOverall(humanTeam, id);
              const theirs = teamMapOverall(oppTeam, id);
              const stateColor = st.kind === 'ban' ? BAN : st.kind === 'pick' ? PICK : st.kind === 'decider' ? DECIDER : null;
              const tagText = st.kind === 'ban'
                ? `BANNED · ${sideFor(st.by) === 'YOU' ? 'you' : sideFor(st.by)}`
                : st.kind === 'pick'
                  ? `MAP ${st.order} · ${sideFor(st.by) === 'YOU' ? 'your pick' : `${sideFor(st.by)} pick`}`
                  : st.kind === 'decider' ? 'DECIDER' : null;

              return (
                <button
                  key={id}
                  disabled={!clickable}
                  onClick={() => clickable && chooseMap(id)}
                  style={{
                    textAlign: 'left', padding: '10px 12px', position: 'relative',
                    cursor: clickable ? 'pointer' : 'default',
                    opacity: st.kind === 'ban' ? 0.45 : clickable ? 1 : 0.8,
                    background: stateColor ? `${stateColor}14` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${stateColor || (clickable ? actionColor : 'rgba(255,255,255,0.1)')}`,
                    borderRadius: 6, color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong style={{ textDecoration: st.kind === 'ban' ? 'line-through' : 'none' }}>
                      {mapName(id)}
                    </strong>
                    <span style={{ fontWeight: 700, color: ratingColor(mine) }}>{mine}</span>
                  </div>
                  {tagText && (
                    <div style={{
                      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                      color: stateColor, marginTop: 3,
                    }}>
                      {tagText}
                      {st.side && st.kind !== 'ban' && (
                        <span style={{ opacity: 0.8, fontWeight: 600 }}>
                          {' '}· {st.side === humanSide ? 'you' : oppTeam?.abbr} start ATK
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.74em', opacity: 0.75, marginTop: 3 }}>
                    ATK {atk} · DEF {def}
                  </div>
                  <div style={{ fontSize: '0.74em', opacity: 0.75 }}>
                    {oppTeam?.abbr} overall{' '}
                    <span style={{ color: ratingColor(theirs), fontWeight: 600 }}>{theirs}</span>
                    {theirs > mine && st.kind === 'open' && (
                      <span style={{ color: '#fb923c' }}> · they're better here</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Escape hatches ── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={autoPick}
            style={{
              padding: '10px 18px', cursor: 'pointer', fontWeight: 600,
              background: 'rgba(255,70,85,0.85)', border: '1px solid #ff4655',
              borderRadius: 4, color: '#fff',
            }}
          >
            Auto-pick &amp; Sim Series
          </button>
          <label style={{ fontSize: '0.8em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: watchLive ? PICK : 'inherit' }}>
            <input type="checkbox" checked={watchLive} onChange={e => setWatchLive(e.target.checked)} />
            Watch live when it starts
          </label>
          <label style={{ fontSize: '0.8em', opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" onChange={e => { if (e.target.checked) onSkipSeason({ watchLive }); }} />
            Don&apos;t ask again this season
          </label>
        </div>
      </div>
    </div>
  );
}
