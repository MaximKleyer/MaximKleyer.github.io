import React from 'react';
import { STAT_ALIGNMENTS } from '../data/abilities.js';

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

export default function CustomSpreadPanel({
  pokemon,
  spread,
  onChange,
  onClose,
  effectiveSpeed,
}) {
  if (!pokemon) return null;

  const totalSP = spread.sp.reduce((a, b) => a + b, 0);
  const spRemaining = 66 - totalSP;

  function updateSP(idx, value) {
    const clampedValue = Math.max(0, Math.min(32, Number(value) || 0));
    const newSP = [...spread.sp];
    const delta = clampedValue - newSP[idx];
    // Check if we'd exceed 66 total
    if (totalSP + delta > 66) {
      // Cap at whatever fits
      newSP[idx] = newSP[idx] + (66 - totalSP);
    } else {
      newSP[idx] = clampedValue;
    }
    onChange({ ...spread, sp: newSP });
  }

  return (
    <div className="custom-spread-panel">
      <div className="custom-spread-header">
        <h3>{pokemon.name}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="pokemon-info">
        <div className="base-stats">
          <strong>Base Stats:</strong>
          {pokemon.base.map((v, i) => (
            <span key={i} className="base-stat">
              <em>{STAT_LABELS[i]}</em> {v}
            </span>
          ))}
        </div>
        <div className="typing">
          {pokemon.types.map(t => (
            <span key={t} className={`type-pill type-${t.toLowerCase()}`}>{t}</span>
          ))}
        </div>
      </div>

      <div className="sp-sliders">
        <div className="sp-header">
          <strong>Stat Points: </strong>
          <span className={spRemaining < 0 ? 'sp-over' : 'sp-remaining'}>
            {totalSP}/66 ({spRemaining >= 0 ? `${spRemaining} remaining` : `${-spRemaining} over!`})
          </span>
        </div>
        {STAT_LABELS.map((label, idx) => (
          <div className="sp-row" key={label}>
            <label>{label}</label>
            <input
              type="range"
              min={0}
              max={32}
              value={spread.sp[idx]}
              onChange={e => updateSP(idx, e.target.value)}
            />
            <input
              type="number"
              min={0}
              max={32}
              value={spread.sp[idx]}
              onChange={e => updateSP(idx, e.target.value)}
              className="sp-input"
            />
          </div>
        ))}
      </div>

      <div className="spread-controls">
        <label>
          Alignment:
          <select
            value={spread.alignment}
            onChange={e => onChange({ ...spread, alignment: e.target.value })}
          >
            {Object.keys(STAT_ALIGNMENTS).map(a => {
              const { boost, reduce } = STAT_ALIGNMENTS[a];
              const suffix = boost && reduce
                ? ` (+${boost.toUpperCase()}, -${reduce.toUpperCase()})`
                : ' (neutral)';
              return <option key={a} value={a}>{a}{suffix}</option>;
            })}
          </select>
        </label>

        <label>
          Ability:
          <select
            value={spread.ability}
            onChange={e => onChange({ ...spread, ability: e.target.value })}
          >
            {pokemon.abilities.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label>
          Item:
          <select
            value={spread.item || ''}
            onChange={e => onChange({ ...spread, item: e.target.value || null })}
          >
            <option value="">None</option>
            <option value="Choice Scarf">Choice Scarf (×1.5)</option>
            <option value="Iron Ball">Iron Ball (×0.5)</option>
          </select>
        </label>

        <label>
          Speed Stage:
          <select
            value={spread.stage}
            onChange={e => onChange({ ...spread, stage: Number(e.target.value) })}
          >
            {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(s => (
              <option key={s} value={s}>{s > 0 ? `+${s}` : s}</option>
            ))}
          </select>
        </label>

        {spread.ability === 'Unburden' && (
          <label>
            <input
              type="checkbox"
              checked={spread.unburdenActive}
              onChange={e => onChange({ ...spread, unburdenActive: e.target.checked })}
            />
            Unburden activated
          </label>
        )}
      </div>

      <div className="effective-display">
        <div className="effective-label">Effective Speed:</div>
        <div className="effective-value">{effectiveSpeed}</div>
      </div>
    </div>
  );
}
