/**
 * Strategy.jsx — composition, role assignment and IGL.
 *
 * The old panel was two stacked dropdowns per slot. That hid the decision
 * it was asking you to make: the option list showed a tag, a nationality
 * and an overall, none of which say whether the player FITS the slot, and
 * the key-stat highlighting only appeared after an assignment, so it
 * could confirm a choice but never inform one. It also auto-filled, so
 * most managers never touched it.
 *
 * This version puts the decision on screen. Each slot names the two stats
 * that role actually weighs, and every player on the roster is listed with
 * those two stats, their role fit, and the rating they would ACTUALLY
 * play at once the fit penalty is applied. Off-role players are shown
 * rather than hidden — taking the hit is sometimes the right call, and
 * hiding it would remove the choice.
 */

import { useState } from 'react';
import { COMPOSITIONS, SUBTYPES, getDefaultSubtype } from '../data/strategy.js';
import { ROLE_WEIGHTS } from '../data/constants.js';
import { roleFit, roleFitPenalty, effectiveOverall, roleLabel, FLEX } from '../data/roles.js';

const STAT_ABBRS = {
  aim: 'AIM', positioning: 'POS', utility: 'UTL', gamesense: 'IQ', clutch: 'CLT',
};

const ROLE_COLORS = {
  duelist: '#ff5460', initiator: '#4ade80', controller: '#a78bfa',
  sentinel: '#38bdf8', flex: '#facc15',
};

// How each fit reads to the manager.
const FIT_STYLE = {
  primary:   { label: 'PRIMARY',   color: '#4ade80' },
  secondary: { label: 'SECONDARY', color: '#facc15' },
  flex:      { label: 'FLEX',      color: '#38bdf8' },
  off:       { label: 'OFF-ROLE',  color: '#ff5460' },
  none:      { label: '',          color: 'inherit' },
};

/**
 * The two stats a role weighs most. Derived from ROLE_WEIGHTS rather than
 * hardcoded, so retuning the weights updates the UI automatically.
 */
function keyStatsFor(role) {
  const weights = ROLE_WEIGHTS[role] || {};
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([stat]) => stat);
}

function RoleChip({ role, dim = false }) {
  if (!role) return null;
  return (
    <span style={{
      color: ROLE_COLORS[role] || 'inherit',
      opacity: dim ? 0.55 : 1,
      fontWeight: dim ? 400 : 700,
      fontSize: dim ? '0.68em' : '0.74em',
    }}>{roleLabel(role)}</span>
  );
}

/** One candidate row inside a slot. */
function Candidate({ player, role, keyStats, taken, selected, onPick }) {
  const fit = roleFit(player, role);
  const style = FIT_STYLE[fit] || FIT_STYLE.off;
  const penalty = roleFitPenalty(player, role);
  const effective = effectiveOverall(player, role);

  return (
    <button
      onClick={() => onPick(player)}
      disabled={taken && !selected}
      title={taken && !selected ? 'Already assigned to another slot' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '5px 8px',
        marginBottom: 3,
        borderRadius: 4,
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: '0.78rem',
        cursor: taken && !selected ? 'not-allowed' : 'pointer',
        opacity: taken && !selected ? 0.3 : 1,
        color: 'inherit',
        background: selected ? 'rgba(255,70,85,0.16)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? '#ff4655' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <strong>{player.tag}</strong>
        <RoleChip role={player.primaryRole} />
        {player.secondaryRole && <RoleChip role={player.secondaryRole} dim />}
      </span>

      {/* The two stats this role actually weighs */}
      <span style={{ display: 'flex', gap: 8, fontFamily: "'JetBrains Mono', monospace" }}>
        {keyStats.map(stat => (
          <span key={stat} style={{ opacity: 0.85 }}>
            <span style={{ opacity: 0.5, fontSize: '0.82em' }}>{STAT_ABBRS[stat]} </span>
            <strong>{player.ratings[stat]}</strong>
          </span>
        ))}
      </span>

      {style.label && (
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em',
          color: style.color, minWidth: 62, textAlign: 'right',
        }}>{style.label}</span>
      )}

      {/* What they'd actually play at */}
      <span style={{ minWidth: 56, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
        <strong style={{ color: penalty < 0 ? style.color : 'inherit' }}>{effective}</strong>
        {penalty < 0 && (
          <span style={{ opacity: 0.5, fontSize: '0.75em' }}> ({penalty})</span>
        )}
      </span>
    </button>
  );
}

export default function Strategy({ team, onUpdate }) {
  const [comp, setComp] = useState(team.strategy.comp);
  const [openSlot, setOpenSlot] = useState(null);
  const compDef = COMPOSITIONS[comp];
  const slots = compDef ? compDef.slots : [];
  const assignments = team.strategy.assignments;

  const getPlayer = id => team.roster.find(p => p.id === id) || null;
  const assignedIds = new Set(assignments.filter(Boolean).map(a => a.playerId));

  function commit() {
    team.strategy.assignments = [...team.strategy.assignments];
    onUpdate?.();
  }

  function handleComp(next) {
    setComp(next);
    team.strategy.comp = next;
    // Slots change shape, so drop assignments that no longer have a home.
    team.strategy.assignments = (COMPOSITIONS[next]?.slots || [])
      .map((_, i) => team.strategy.assignments[i] || null)
      .filter((a, i) => a && a.role === COMPOSITIONS[next].slots[i]);
    commit();
  }

  function assign(slotIdx, player) {
    const role = slots[slotIdx];
    const next = [...team.strategy.assignments];
    while (next.length < slots.length) next.push(null);
    // A player can only hold one slot.
    for (let i = 0; i < next.length; i++) {
      if (next[i]?.playerId === player.id) next[i] = null;
    }
    next[slotIdx] = { playerId: player.id, role, subtypeId: getDefaultSubtype(role) };
    team.strategy.assignments = next;
    setOpenSlot(null);
    commit();
  }

  function clearSlot(slotIdx) {
    const next = [...team.strategy.assignments];
    next[slotIdx] = null;
    team.strategy.assignments = next;
    commit();
  }

  function autoFill() {
    team.autoAssignStrategy();
    commit();
  }

  function setSubtype(slotIdx, subtypeId) {
    const next = [...team.strategy.assignments];
    if (next[slotIdx]) next[slotIdx] = { ...next[slotIdx], subtypeId };
    team.strategy.assignments = next;
    commit();
  }

  function setIgl(id) {
    team.strategy.iglId = id || null;
    commit();
  }

  // Lineup health, so the cost of the current plan is visible at a glance.
  const filled = slots.map((role, i) => {
    const a = assignments[i];
    const p = a ? getPlayer(a.playerId) : null;
    return p ? { player: p, role, fit: roleFit(p, role), penalty: roleFitPenalty(p, role) } : null;
  });
  const assignedCount = filled.filter(Boolean).length;
  const totalPenalty = filled.reduce((s, f) => s + (f?.penalty || 0), 0);
  const offRoleCount = filled.filter(f => f?.fit === 'off').length;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Team Strategy</h3>
        <span style={{ fontSize: '0.75em', opacity: 0.6 }}>
          each slot shows the two stats that role weighs
        </span>
      </div>

      {/* Composition */}
      <div style={{ marginTop: 12, marginBottom: 6, fontSize: '0.72rem', letterSpacing: '0.08em', opacity: 0.55 }}>
        COMPOSITION
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(COMPOSITIONS).map(([key, c]) => (
          <button
            key={key}
            onClick={() => handleComp(key)}
            title={c.slots.map(roleLabel).join(' · ')}
            style={{
              padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 600, color: 'inherit',
              background: comp === key ? 'rgba(255,70,85,0.18)' : 'transparent',
              border: `1px solid ${comp === key ? '#ff4655' : 'rgba(255,255,255,0.14)'}`,
            }}
          >
            {c.label || key}
          </button>
        ))}
      </div>

      {/* Lineup health */}
      <div style={{
        marginTop: 14, padding: '8px 12px', borderRadius: 5, fontSize: '0.8em',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span>
          <strong>{assignedCount}/{slots.length}</strong> slots filled
        </span>
        {offRoleCount > 0 && (
          <span style={{ color: '#ff5460' }}>
            {offRoleCount} off-role
          </span>
        )}
        <span style={{ opacity: 0.75 }}>
          fit cost:{' '}
          <strong style={{ color: totalPenalty < -6 ? '#ff5460' : totalPenalty < 0 ? '#facc15' : '#4ade80' }}>
            {totalPenalty === 0 ? 'none' : `${totalPenalty} overall`}
          </strong>
        </span>
        <button
          onClick={autoFill}
          style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 700, color: 'inherit',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
          }}
        >Auto-fill</button>
      </div>

      {/* Slots */}
      <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        {slots.map((role, i) => {
          const assignment = assignments[i];
          const player = assignment ? getPlayer(assignment.playerId) : null;
          const keyStats = keyStatsFor(role);
          const isOpen = openSlot === i;
          const fit = player ? roleFit(player, role) : 'none';
          const style = FIT_STYLE[fit] || FIT_STYLE.off;
          const subtypes = SUBTYPES[role] || [];

          return (
            <div key={i} style={{
              // Longhand on every side: mixing the `border` shorthand with
              // `borderLeft` makes React warn, because a re-render can
              // apply the shorthand after the specific side and wipe it.
              borderTop: `1px solid ${player ? 'rgba(255,255,255,0.1)' : 'rgba(255,70,85,0.35)'}`,
              borderRight: `1px solid ${player ? 'rgba(255,255,255,0.1)' : 'rgba(255,70,85,0.35)'}`,
              borderBottom: `1px solid ${player ? 'rgba(255,255,255,0.1)' : 'rgba(255,70,85,0.35)'}`,
              borderLeft: `3px solid ${ROLE_COLORS[role] || '#888'}`,
              borderRadius: 6, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ color: ROLE_COLORS[role], minWidth: 86, fontSize: '0.85rem' }}>
                  {roleLabel(role)}
                </strong>
                <span style={{ fontSize: '0.68rem', opacity: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  {keyStats.map(s => STAT_ABBRS[s]).join(' + ')}
                </span>

                <span style={{ flex: 1 }} />

                {player ? (
                  <>
                    <strong style={{ fontSize: '0.85rem' }}>{player.tag}</strong>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: style.color }}>
                      {style.label}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                      {effectiveOverall(player, role)}
                      {roleFitPenalty(player, role) < 0 && (
                        <span style={{ opacity: 0.5, fontSize: '0.8em' }}>
                          {' '}({roleFitPenalty(player, role)})
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => clearSlot(i)}
                      title="Clear this slot"
                      style={{
                        background: 'transparent', border: 'none', color: 'inherit',
                        opacity: 0.4, cursor: 'pointer', fontSize: '0.9rem', padding: '0 4px',
                      }}
                    >✕</button>
                  </>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#ff5460', opacity: 0.8 }}>empty</span>
                )}

                <button
                  onClick={() => setOpenSlot(isOpen ? null : i)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                    fontSize: '0.7rem', fontWeight: 700, color: 'inherit',
                    background: isOpen ? 'rgba(255,70,85,0.16)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.16)',
                  }}
                >{isOpen ? 'Close' : player ? 'Change' : 'Choose'}</button>
              </div>

              {/* Candidates — every player, fit marked, nothing hidden */}
              {isOpen && (
                <div style={{ marginTop: 8 }}>
                  {[...team.roster]
                    .sort((a, b) => effectiveOverall(b, role) - effectiveOverall(a, role))
                    .map(p => (
                      <Candidate
                        key={p.id}
                        player={p}
                        role={role}
                        keyStats={keyStats}
                        taken={assignedIds.has(p.id)}
                        selected={assignment?.playerId === p.id}
                        onPick={pl => assign(i, pl)}
                      />
                    ))}
                </div>
              )}

              {/* Subtype, once someone is in the slot */}
              {player && subtypes.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {subtypes.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSubtype(i, sub.id)}
                      title={sub.desc}
                      style={{
                        padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                        fontSize: '0.68rem', color: 'inherit',
                        background: assignment?.subtypeId === sub.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                        border: `1px solid ${assignment?.subtypeId === sub.id ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
                      }}
                    >{sub.label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* IGL */}
      <div style={{ marginTop: 16, marginBottom: 6, fontSize: '0.72rem', letterSpacing: '0.08em', opacity: 0.55 }}>
        IN-GAME LEADER · picked on game sense
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {team.roster.map(p => (
          <button
            key={p.id}
            onClick={() => setIgl(team.strategy.iglId === p.id ? null : p.id)}
            title={`${p.tag} — game sense ${p.ratings.gamesense}`}
            style={{
              padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              fontSize: '0.74rem', color: 'inherit',
              background: team.strategy.iglId === p.id ? 'rgba(255,70,85,0.18)' : 'transparent',
              border: `1px solid ${team.strategy.iglId === p.id ? '#ff4655' : 'rgba(255,255,255,0.14)'}`,
            }}
          >
            {p.tag}
            <span style={{ opacity: 0.55, marginLeft: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              {p.ratings.gamesense}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
