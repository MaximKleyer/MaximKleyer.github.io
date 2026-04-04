/**
 * Strategy.jsx — Composition, role assignment, IGL, with stat highlighting.
 *
 * UPDATED:
 *   - Stats that a subtype weighs more heavily are highlighted in
 *     bright accent color + bold
 *   - "Auto-Fill" button to quickly assign best-fit players
 */

import { useState } from 'react';
import { COMPOSITIONS, SUBTYPES, getDefaultSubtype } from '../data/strategy.js';

// ── Determine which stats are "key" for a subtype ──
// A stat is considered key if its weight is >= 0.25 (top-weighted)
const SUBTYPE_KEY_STATS = {};
for (const role of Object.keys(SUBTYPES)) {
  for (const sub of SUBTYPES[role]) {
    const keys = [];
    for (const [stat, weight] of Object.entries(sub.weights)) {
      if (weight >= 0.25) keys.push(stat);
    }
    SUBTYPE_KEY_STATS[sub.id] = keys;
  }
}

// Map internal stat names to display abbreviations
const STAT_ABBRS = {
  aim: 'AIM',
  positioning: 'POS',
  utility: 'UTL',
  gamesense: 'IQ',
  clutch: 'CLT',
};

export default function Strategy({ team, onUpdate }) {
  const [comp, setComp] = useState(team.strategy.comp);
  const compDef = COMPOSITIONS[comp];
  const slots = compDef ? compDef.slots : [];
  const assignments = team.strategy.assignments;
  const iglId = team.strategy.iglId;

  function handleCompChange(newComp) {
    setComp(newComp);
    team.strategy.comp = newComp;
    team.autoAssignStrategy();
    onUpdate();
  }

  function handlePlayerAssign(slotIndex, playerId) {
    const role = slots[slotIndex];
    const subtype = getDefaultSubtype(role);

    // Remove player from any existing slot
    team.strategy.assignments = team.strategy.assignments.filter(
      a => a.playerId !== playerId
    );

    // Rebuild assignments array with the new assignment at the correct slot
    const newAssignments = [];
    for (let i = 0; i < slots.length; i++) {
      if (i === slotIndex) {
        newAssignments.push({ playerId, role, subtypeId: subtype });
      } else {
        // Keep existing assignment if it exists and isn't the player we just moved
        const existing = assignments.find(
          (a, idx) => idx === i && a.playerId !== playerId
        );
        if (existing) {
          newAssignments.push(existing);
        } else if (assignments[i] && assignments[i].playerId !== playerId) {
          newAssignments.push(assignments[i]);
        }
      }
    }

    team.strategy.assignments = newAssignments.filter(Boolean);
    onUpdate();
  }

  function handleSubtypeChange(slotIndex, subtypeId) {
    if (team.strategy.assignments[slotIndex]) {
      team.strategy.assignments[slotIndex].subtypeId = subtypeId;
      onUpdate();
    }
  }

  function handleIglChange(playerId) {
    team.strategy.iglId = playerId;
    onUpdate();
  }

  function handleAutoFill() {
    team.autoAssignStrategy();
    setComp(team.strategy.comp); // sync local state
    onUpdate();
  }

  function getPlayer(id) {
    return team.roster.find(p => p.id === id);
  }

  const assignedIds = new Set(assignments.map(a => a.playerId));

  return (
    <div className="strategy-section">
      <div className="strategy-header-row">
        <h3>Team Strategy</h3>
        <button className="btn-small" onClick={handleAutoFill}>
          Auto-Fill Best Fit
        </button>
      </div>

      {/* Composition Picker */}
      <div className="strategy-row">
        <label className="strategy-label">Composition</label>
        <select
          className="strategy-select"
          value={comp}
          onChange={(e) => handleCompChange(e.target.value)}
        >
          {Object.entries(COMPOSITIONS).map(([key, c]) => (
            <option key={key} value={key}>{c.label} — {c.desc}</option>
          ))}
        </select>
      </div>

      {/* IGL Picker */}
      <div className="strategy-row">
        <label className="strategy-label">
          IGL (In-Game Leader)
          <span className="strategy-hint"> — High IQ boosts team round wins</span>
        </label>
        <select
          className="strategy-select"
          value={iglId || ''}
          onChange={(e) => handleIglChange(e.target.value)}
        >
          <option value="">None</option>
          {team.roster.map(p => (
            <option key={p.id} value={p.id}>
              {p.tag} — IQ: {p.ratings.gamesense} ({p.role})
            </option>
          ))}
        </select>
        {iglId && getPlayer(iglId) && (
          <span className="igl-bonus-preview">
            +{Math.max(0, (getPlayer(iglId).ratings.gamesense - 60) * 0.15).toFixed(1)} team bonus
          </span>
        )}
      </div>

      {/* Role Assignments */}
      <div className="strategy-label" style={{ marginTop: '16px' }}>Starting 5 — Role Assignments</div>
      <div className="assignments-grid">
        {slots.map((role, i) => {
          const assignment = assignments[i];
          const player = assignment ? getPlayer(assignment.playerId) : null;
          const subtypes = SUBTYPES[role] || [];

          // Determine which stats are highlighted for the current subtype
          const keyStats = assignment?.subtypeId
            ? (SUBTYPE_KEY_STATS[assignment.subtypeId] || [])
            : [];

          return (
            <div key={i} className={`assignment-card ${!player ? 'assignment-empty' : ''}`}>
              <div className="assignment-role-label">{role.toUpperCase()} #{i + 1}</div>

              {/* Player select */}
              <select
                className="assignment-select"
                value={assignment?.playerId || ''}
                onChange={(e) => handlePlayerAssign(i, e.target.value)}
              >
                <option value="">— Select Player —</option>
                {team.roster.map(p => {
                  const isAssigned = assignedIds.has(p.id) && assignment?.playerId !== p.id;
                  return (
                    <option key={p.id} value={p.id} disabled={isAssigned}>
                      {p.tag} ({p.role}) — {p.overall} OVR
                      {isAssigned ? ' [assigned]' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Subtype select */}
              {player && subtypes.length > 0 && (
                <select
                  className="assignment-subtype"
                  value={assignment?.subtypeId || ''}
                  onChange={(e) => handleSubtypeChange(i, e.target.value)}
                >
                  {subtypes.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label} — {sub.desc}
                    </option>
                  ))}
                </select>
              )}

              {/* Player preview with highlighted stats */}
              {player && (
                <div className="assignment-preview">
                  <span className="assignment-tag">
                    {player.tag}
                    {player.id === iglId && <span className="igl-badge">IGL</span>}
                  </span>
                  <div className="assignment-stats">
                    {Object.entries(STAT_ABBRS).map(([stat, abbr]) => {
                      const isKey = keyStats.includes(stat);
                      return (
                        <span
                          key={stat}
                          className={`assignment-stat ${isKey ? 'stat-highlighted' : ''}`}
                        >
                          {abbr} {player.ratings[stat]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty slot warning */}
              {!player && (
                <div className="assignment-empty-msg">No player assigned</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
