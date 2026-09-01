/**
 * VctApp.jsx — the whole VCT 2027 mode behind one component.
 *
 * App.jsx delegates here when gameState.mode === 'vct2027'. Everything
 * match-related is the SAME machinery as the franchise app — MapVeto,
 * LiveMatch, Toast, the pending-toast hold — driven by advanceVct()
 * instead of the franchise advance. Views reuse Roster/FreeAgents/
 * PlayerCard wholesale; the VCT-specific screens live in this folder.
 */

import { useEffect, useRef, useState } from 'react';
import { advanceVct, simVctSlot, ensureVctSeason } from '../../engine/vct/live.js';
import { VCT_SLOTS, initVctCircuit } from '../../engine/vct/circuit.js';
import { getVctHumanTeam } from '../../engine/vct/generation.js';
import { resolvePendingVeto } from '../../engine/activeSeries.js';
import { seriesToResult, isSeriesComplete } from '../../classes/Match.js';
import { applyPlayerEdit } from '../../engine/editPlayer.js';
import MapVeto from '../MapVeto.jsx';
import LiveMatch from '../LiveMatch.jsx';
import Toast from '../Toast.jsx';
import Roster from '../Roster.jsx';
import FreeAgents from '../FreeAgents.jsx';
import VctDashboard from './VctDashboard.jsx';
import VctQualifiers from './VctQualifiers.jsx';
import VctEvent from './VctEvent.jsx';
import VctPoints from './VctPoints.jsx';

const VIEWS = [
  { key: 'dashboard', label: 'Season' },
  { key: 'qualifiers', label: 'Qualifiers' },
  { key: 'event', label: 'Regional Event' },
  { key: 'masters', label: 'Masters' },
  { key: 'champions', label: 'Champions' },
  { key: 'points', label: 'Points' },
  { key: 'roster', label: 'Roster' },
  { key: 'freeagents', label: 'Free Agents' },
];

/** The most recent slot key of a given type at or before the cursor. */
function latestSlotKey(circuit, type) {
  for (let i = Math.min(circuit.slotIndex, VCT_SLOTS.length - 1); i >= 0; i--) {
    if (VCT_SLOTS[i].type === type) return VCT_SLOTS[i].key;
  }
  return VCT_SLOTS.find(s => s.type === type)?.key || null;
}

export default function VctApp({ gameState, setGameState, onDeleteSave }) {
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [watchingSeriesId, setWatchingSeriesId] = useState(null);
  const pendingToastRef = useRef(null);

  ensureVctSeason(gameState);
  if (!gameState.circuit) initVctCircuit(gameState);
  const circuit = gameState.circuit;
  const human = getVctHumanTeam(gameState);
  const seasonDone = circuit.status === 'season-complete';

  const humanLiveEntry = (gameState.season.activeSeries || [])
    .find(e => e.teamA?.isHuman || e.teamB?.isHuman) || null;

  /* ── Toast plumbing (same hold-while-watching rule as franchise) ── */
  function displayMatchToast(result, team) {
    const won = result.winner === team;
    const opponent = result.teamA === team ? result.teamB : result.teamA;
    setToast({
      message: won
        ? `W ${Math.max(...result.score)}-${Math.min(...result.score)} vs ${opponent.name}`
        : `L ${Math.min(...result.score)}-${Math.max(...result.score)} vs ${opponent.name}`,
      type: won ? 'win' : 'loss',
      mapScores: (result.maps || []).map(m =>
        `${Math.max(m.roundsA, m.roundsB)}-${Math.min(m.roundsA, m.roundsB)}`),
    });
  }
  function queueMatchToast(result, team) {
    if (watchingSeriesId) { pendingToastRef.current = { result, team }; return; }
    displayMatchToast(result, team);
  }
  function flushPendingToast() {
    const held = pendingToastRef.current;
    if (!held) return;
    pendingToastRef.current = null;
    displayMatchToast(held.result, held.team);
  }

  /* ── Advance ── */
  function handleAdvance() {
    if (gameState.season.pendingVeto || watchingSeriesId) return;
    const r = advanceVct(gameState);
    for (const entry of r.completedSeries || []) {
      if (entry.teamA?.isHuman || entry.teamB?.isHuman) {
        queueMatchToast(seriesToResult(entry.series), human);
      }
    }
    setGameState(prev => ({ ...prev }));
  }

  function handleSimSlot() {
    if (watchingSeriesId) return;
    if (gameState.season.pendingVeto) resolvePendingVeto(gameState, null);
    simVctSlot(gameState);
    setGameState(prev => ({ ...prev }));
  }

  /* ── Veto plumbing ── */
  const pendingVeto = gameState.season.pendingVeto;
  const vetoEntry = pendingVeto != null
    ? gameState.season.activeSeries?.[pendingVeto.entryIndex]
    : null;
  const vetoOpp = vetoEntry
    ? (vetoEntry.teamA?.isHuman ? vetoEntry.teamB : vetoEntry.teamA)
    : null;

  function handleVetoResolve(plan, { watchLive } = {}) {
    const entry = vetoEntry;
    resolvePendingVeto(gameState, plan);
    if (watchLive && entry) setWatchingSeriesId(entry.seriesId);
    setGameState(prev => ({ ...prev }));
  }

  function handleVetoSkip({ watchLive } = {}) {
    const entry = vetoEntry;
    gameState.season.skipVetoThisSeason = true;
    resolvePendingVeto(gameState, null);
    if (watchLive && entry) setWatchingSeriesId(entry.seriesId);
    setGameState(prev => ({ ...prev }));
  }

  /* ── Live viewer advance: keep ticking the engine per map ── */
  function watchAdvance() {
    const r = advanceVct(gameState);
    for (const entry of r.completedSeries || []) {
      if (entry.teamA?.isHuman || entry.teamB?.isHuman) {
        queueMatchToast(seriesToResult(entry.series), human);
      }
    }
    setGameState(prev => ({ ...prev }));
  }

  function watchSimSeries() {
    let guard = 0;
    while (guard++ < 12) {
      const before = gameState.season.activeSeries.length;
      watchAdvance();
      if (gameState.season.activeSeries.length === 0 || gameState.season.pendingVeto) break;
      if (gameState.season.activeSeries.length === before
          && humanLiveEntry && isSeriesComplete(humanLiveEntry.series)) break;
    }
  }

  function handleEditPlayer(player, field, value) {
    if (applyPlayerEdit(gameState, player, field, value)) {
      setGameState(prev => ({ ...prev }));
    }
  }

  /* ── Keyboard: Space = advance, S = sim slot ── */
  useEffect(() => {
    function onKeyDown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable) return;
      if (gameState.season?.pendingVeto || watchingSeriesId) return;
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); handleAdvance(); }
      else if (e.key === 's' || e.key === 'S') handleSimSlot();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const currentSlot = circuit.live ? VCT_SLOTS[circuit.slotIndex] : VCT_SLOTS[circuit.slotIndex + 1];

  function renderView() {
    switch (view) {
      case 'qualifiers':
        return <VctQualifiers gameState={gameState}
          slotKey={latestSlotKey(circuit, 'quals') || 'kickoffQuals'} />;
      case 'event':
        return (
          <>
            <h2>{VCT_SLOTS.find(s => s.key === latestSlotKey(circuit, 'regional'))?.label || 'Regional Event'}</h2>
            <VctEvent gameState={gameState} slotKey={latestSlotKey(circuit, 'regional') || 'kickoff'} />
          </>
        );
      case 'masters':
        return (
          <>
            <h2>{VCT_SLOTS.find(s => s.key === latestSlotKey(circuit, 'masters'))?.label || 'Masters'}</h2>
            <VctEvent gameState={gameState} slotKey={latestSlotKey(circuit, 'masters') || 'masters1'} global />
          </>
        );
      case 'champions':
        return (
          <>
            <h2>Champions</h2>
            <VctEvent gameState={gameState} slotKey="champions" global />
          </>
        );
      case 'points':
        return <VctPoints gameState={gameState} />;
      case 'roster':
        return <Roster team={human} onRelease={() => {}} onUpdate={() => setGameState(p => ({ ...p }))}
          godMode={!!gameState.godMode} onEditPlayer={handleEditPlayer}
          mapPool={gameState.mapPool?.active} />;
      case 'freeagents':
        return <FreeAgents
          freeAgents={gameState.regions[gameState.humanRegion].freeAgents}
          team={human}
          canSign={false}
          windowClosed
          onSign={() => {}}
          godMode={!!gameState.godMode}
          onEditPlayer={handleEditPlayer}
        />;
      default:
        return <VctDashboard gameState={gameState} />;
    }
  }

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <nav style={{
        width: 210, flex: 'none', padding: '18px 14px',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <h1 style={{ fontSize: '1rem', letterSpacing: '0.1em', margin: '0 0 4px' }}>VCT 2027</h1>
        <div style={{ fontSize: '0.66rem', opacity: 0.55, marginBottom: 10 }}>
          {seasonDone ? 'Season complete' : currentSlot ? currentSlot.label : ''}
        </div>

        {!seasonDone && (
          <>
            <button onClick={handleAdvance} disabled={!!pendingVeto} style={{
              padding: '10px 12px', cursor: 'pointer', fontWeight: 700, borderRadius: 5,
              background: '#ff4655', color: '#fff', border: '1px solid #ff4655',
              opacity: pendingVeto ? 0.5 : 1,
            }}>
              Advance <span style={{ opacity: 0.6, fontSize: '0.72em' }}>Space</span>
            </button>
            <button onClick={handleSimSlot} style={{
              padding: '8px 12px', cursor: 'pointer', fontWeight: 600, borderRadius: 5,
              background: 'rgba(255,255,255,0.06)', color: 'inherit',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              ⏩ Sim {currentSlot?.label || 'Slot'} <span style={{ opacity: 0.6, fontSize: '0.72em' }}>S</span>
            </button>
          </>
        )}

        <div style={{ height: 12 }} />
        {VIEWS.map(v => (
          <button key={v.key} onClick={() => setView(v.key)} style={{
            padding: '7px 10px', cursor: 'pointer', textAlign: 'left', borderRadius: 4,
            background: view === v.key ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none', color: 'inherit', fontWeight: view === v.key ? 700 : 500,
            fontSize: '0.85rem',
          }}>{v.label}</button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={() => {
          if (window.confirm('Delete this save and return to the start screen?')) onDeleteSave();
        }} style={{
          padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: '0.72rem',
          background: 'transparent', border: '1px solid rgba(255,84,96,0.4)', color: '#ff8c95',
        }}>Delete Save</button>
      </nav>

      <main id="content" style={{ flex: 1, padding: '22px 26px', minWidth: 0 }}>
        {renderView()}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          mapScores={toast.mapScores}
          onClose={() => setToast(null)}
        />
      )}

      {pendingVeto && (
        <MapVeto
          pending={pendingVeto}
          humanTeam={human}
          oppTeam={vetoOpp}
          onResolve={handleVetoResolve}
          onSkipSeason={handleVetoSkip}
        />
      )}

      {watchingSeriesId && (
        <LiveMatch
          key={watchingSeriesId}
          gameState={gameState}
          seriesId={watchingSeriesId}
          onAdvanceMap={watchAdvance}
          onSimSeries={watchSimSeries}
          onSeriesRevealed={flushPendingToast}
          onClose={() => { setWatchingSeriesId(null); flushPendingToast(); }}
        />
      )}

      {humanLiveEntry && !watchingSeriesId && !pendingVeto && (
        <button
          onClick={() => setWatchingSeriesId(humanLiveEntry.seriesId)}
          title="Open the live round-by-round view of your series"
          style={{
            position: 'fixed', right: 18, bottom: 18, zIndex: 800,
            padding: '10px 18px', cursor: 'pointer', fontWeight: 700,
            letterSpacing: '0.06em', fontSize: '0.8rem',
            background: '#ff4655', color: '#fff',
            border: '1px solid #ff4655', borderRadius: 6,
            boxShadow: '0 4px 18px rgba(255,70,85,0.4)',
          }}
        >
          ● WATCH LIVE
        </button>
      )}
    </div>
  );
}
