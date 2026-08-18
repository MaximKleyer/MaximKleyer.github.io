/**
 * MapVeto.jsx — Interactive map ban/pick before a human series.
 *
 * Shows the active pool with this team's and the opponent's comfort on
 * each map, so a ban or pick is an informed decision rather than a
 * coin flip. The AI acts for the opponent between your turns.
 *
 * Escape hatches, because a full group stage is a lot of series:
 *   • "Auto-pick & Sim"        — keep the CPU's plan for THIS series
 *   • "Don't ask again ..."    — stop prompting for the rest of the season
 */

import { useState } from 'react';
import { mapName, teamMapRating, teamMapOverall } from '../data/maps.js';
import {
  currentStep, isHumanTurn, applyMapAction, applySideChoice,
  runAIUntilHumanTurn, autoCompleteVeto, vetoToMapPlan,
} from '../engine/veto.js';

function ratingColor(v) {
  if (v >= 85) return '#4ade80';
  if (v >= 72) return '#a3e635';
  if (v >= 60) return '#facc15';
  if (v >= 48) return '#fb923c';
  return '#ff5460';
}

export default function MapVeto({ pending, humanTeam, oppTeam, onResolve, onSkipSeason }) {
  // The veto object is mutated in place by the engine; bump to re-render.
  const [, bump] = useState(0);
  const rerender = () => bump(n => n + 1);

  if (!pending) return null;
  const { veto, humanSide } = pending;
  const teamForSide = side => (side === humanSide ? humanTeam : oppTeam);

  const step = currentStep(veto);
  const myTurn = isHumanTurn(veto);
  const awaitingSide = !!veto.pendingSide && veto.pendingSide.chooser === humanSide;

  function afterHumanAction() {
    // Let the CPU take its turns until it's the human's move again.
    runAIUntilHumanTurn(veto, teamForSide);
    if (veto.complete) {
      onResolve(vetoToMapPlan(veto));
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
    onResolve(vetoToMapPlan(veto));
  }

  const actionWord = step?.type === 'ban' ? 'BAN' : step?.type === 'pick' ? 'PICK' : '';

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
        width: 'min(880px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
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

        <p style={{ margin: '10px 0 4px', fontWeight: 600, color: myTurn ? '#ff4655' : 'inherit' }}>
          {prompt}
        </p>
        <p style={{ margin: '0 0 14px', fontSize: '0.78em', opacity: 0.6 }}>
          Ratings show your Attack/Defense comfort, then the opponent's overall.
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

        {/* ── Remaining maps ── */}
        {!awaitingSide && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10, marginBottom: 18,
          }}>
            {veto.remaining.map(id => {
              const atk = teamMapRating(humanTeam, id, 'attack');
              const def = teamMapRating(humanTeam, id, 'defense');
              const mine = teamMapOverall(humanTeam, id);
              const theirs = teamMapOverall(oppTeam, id);
              return (
                <button
                  key={id}
                  disabled={!myTurn}
                  onClick={() => chooseMap(id)}
                  style={{
                    textAlign: 'left', padding: '10px 12px',
                    cursor: myTurn ? 'pointer' : 'default',
                    opacity: myTurn ? 1 : 0.55,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${myTurn ? ratingColor(mine) : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 6, color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong>{mapName(id)}</strong>
                    <span style={{ fontWeight: 700, color: ratingColor(mine) }}>{mine}</span>
                  </div>
                  <div style={{ fontSize: '0.74em', opacity: 0.75, marginTop: 3 }}>
                    ATK {atk} · DEF {def}
                  </div>
                  <div style={{ fontSize: '0.74em', opacity: 0.75 }}>
                    {oppTeam?.abbr} overall{' '}
                    <span style={{ color: ratingColor(theirs), fontWeight: 600 }}>{theirs}</span>
                    {theirs > mine && (
                      <span style={{ color: '#fb923c' }}> · they're better here</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── What's locked in so far ── */}
        {(veto.bans.length > 0 || veto.picks.length > 0) && (
          <div style={{ fontSize: '0.78em', opacity: 0.8, marginBottom: 16, lineHeight: 1.7 }}>
            {veto.bans.length > 0 && (
              <div>
                <strong>Banned:</strong>{' '}
                {veto.bans.map(b => `${mapName(b.mapId)} (${b.by === humanSide ? 'you' : oppTeam?.abbr})`).join(' · ')}
              </div>
            )}
            {veto.picks.length > 0 && (
              <div>
                <strong>Maps:</strong>{' '}
                {veto.picks.map(p => {
                  const who = p.by == null ? 'decider' : (p.by === humanSide ? 'your pick' : `${oppTeam?.abbr} pick`);
                  return `${mapName(p.mapId)} (${who})`;
                }).join(' · ')}
              </div>
            )}
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
          <label style={{ fontSize: '0.8em', opacity: 0.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" onChange={e => { if (e.target.checked) onSkipSeason(); }} />
            Don&apos;t ask again this season
          </label>
        </div>
      </div>
    </div>
  );
}
