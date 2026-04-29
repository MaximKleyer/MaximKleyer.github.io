import React from 'react';
import { POKEMON } from '../data/pokemon.js';
import { STAT_ALIGNMENTS } from '../data/abilities.js';

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

export default function YourPokemonBuilder({
  builder,
  setBuilder,
  effectiveSpeed,
  onClear,
}) {
  const selectedMon = builder.pokemonId ? POKEMON.find(p => p.id === builder.pokemonId) : null;

  const totalSP = builder.sp.reduce((a, b) => a + b, 0);
  const spRemaining = 66 - totalSP;

  function updateSP(idx, value) {
    const clamped = Math.max(0, Math.min(32, Number(value) || 0));
    const newSP = [...builder.sp];
    const delta = clamped - newSP[idx];
    if (totalSP + delta > 66) {
      newSP[idx] = newSP[idx] + (66 - totalSP);
    } else {
      newSP[idx] = clamped;
    }
    setBuilder({ ...builder, sp: newSP });
  }

  function onSelectPokemon(id) {
    const mon = POKEMON.find(p => p.id === id);
    setBuilder({
      ...builder,
      pokemonId: id,
      ability: mon ? mon.abilities[0] : null,
      // reset SP to clean state whenever pokemon changes
      sp: [0, 0, 0, 0, 0, 32],
    });
  }

  return (
    <div className="your-pokemon-builder">
      <div className="builder-header">
        <div className="builder-title">
          <span className="builder-badge">YOUR POKÉMON</span>
          <h2>Add Your Pokémon to the Table</h2>
        </div>
        {selectedMon && (
          <button className="clear-btn" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <p className="builder-intro">
        Pick a Pokémon, dial in its spread, and it'll be inserted into the table below with its
        effective speed calculated against the same field conditions. It'll highlight where it ranks.
      </p>

      <div className="builder-select-row">
        <label>
          <span className="builder-label">Pokémon</span>
          <select
            className="builder-mon-select"
            value={builder.pokemonId || ''}
            onChange={e => onSelectPokemon(e.target.value)}
          >
            <option value="">— Select a Pokémon —</option>
            {POKEMON.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      {selectedMon && (
        <>
          <div className="builder-info-strip">
            <div className="builder-typing">
              {selectedMon.types.map(t => (
                <span key={t} className={`type-pill type-${t.toLowerCase()}`}>{t}</span>
              ))}
            </div>
            <div className="builder-base-stats">
              {selectedMon.base.map((v, i) => (
                <span key={i} className="builder-base-stat">
                  <em>{STAT_LABELS[i]}</em>
                  <strong>{v}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="builder-grid">
            {/* LEFT: SP sliders */}
            <div className="builder-col">
              <div className="builder-col-header">
                <h3>Stat Points</h3>
                <span className={spRemaining < 0 ? 'sp-over' : 'sp-remaining-small'}>
                  {totalSP}/66
                  {spRemaining > 0 && ` · ${spRemaining} left`}
                  {spRemaining < 0 && ` · ${-spRemaining} over!`}
                </span>
              </div>
              {STAT_LABELS.map((label, idx) => (
                <div className="builder-sp-row" key={label}>
                  <label className="builder-sp-label">{label}</label>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    value={builder.sp[idx]}
                    onChange={e => updateSP(idx, e.target.value)}
                    className="builder-slider"
                  />
                  <input
                    type="number"
                    min={0}
                    max={32}
                    value={builder.sp[idx]}
                    onChange={e => updateSP(idx, e.target.value)}
                    className="builder-sp-input"
                  />
                </div>
              ))}
              <div className="builder-sp-presets">
                <button
                  type="button"
                  onClick={() => setBuilder({ ...builder, sp: [0, 0, 0, 0, 0, 32], alignment: 'Timid' })}
                >
                  Max Speed (Timid)
                </button>
                <button
                  type="button"
                  onClick={() => setBuilder({ ...builder, sp: [32, 0, 0, 32, 2, 0], alignment: 'Quiet' })}
                >
                  TR Sweeper (Quiet)
                </button>
                <button
                  type="button"
                  onClick={() => setBuilder({ ...builder, sp: [32, 2, 16, 0, 16, 0], alignment: 'Sassy' })}
                >
                  Bulky Support (Sassy)
                </button>
                <button
                  type="button"
                  onClick={() => setBuilder({ ...builder, sp: [0, 0, 0, 0, 0, 0], alignment: 'Serious' })}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* MIDDLE: Config dropdowns */}
            <div className="builder-col">
              <div className="builder-col-header">
                <h3>Build</h3>
              </div>

              <div className="builder-field">
                <label>Stat Alignment</label>
                <select
                  value={builder.alignment}
                  onChange={e => setBuilder({ ...builder, alignment: e.target.value })}
                >
                  {Object.keys(STAT_ALIGNMENTS).map(a => {
                    const { boost, reduce } = STAT_ALIGNMENTS[a];
                    const suffix = boost && reduce
                      ? ` (+${boost.toUpperCase()}, -${reduce.toUpperCase()})`
                      : ' (neutral)';
                    return <option key={a} value={a}>{a}{suffix}</option>;
                  })}
                </select>
              </div>

              <div className="builder-field">
                <label>Ability</label>
                <select
                  value={builder.ability || selectedMon.abilities[0]}
                  onChange={e => setBuilder({ ...builder, ability: e.target.value })}
                >
                  {selectedMon.abilities.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="builder-field">
                <label>Item</label>
                <select
                  value={builder.item || ''}
                  onChange={e => setBuilder({ ...builder, item: e.target.value || null })}
                >
                  <option value="">None</option>
                  <option value="Choice Scarf">Choice Scarf (×1.5)</option>
                  <option value="Iron Ball">Iron Ball (×0.5)</option>
                </select>
              </div>

              <div className="builder-field">
                <label>Speed Stage</label>
                <select
                  value={builder.stage}
                  onChange={e => setBuilder({ ...builder, stage: Number(e.target.value) })}
                >
                  {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(s => (
                    <option key={s} value={s}>{s > 0 ? `+${s}` : s}</option>
                  ))}
                </select>
              </div>

              {builder.ability === 'Unburden' && (
                <div className="builder-field builder-checkbox-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={builder.unburdenActive}
                      onChange={e => setBuilder({ ...builder, unburdenActive: e.target.checked })}
                    />
                    Unburden activated (item consumed)
                  </label>
                </div>
              )}
            </div>

            {/* RIGHT: Effective speed display */}
            <div className="builder-col builder-result-col">
              <div className="builder-col-header">
                <h3>Result</h3>
              </div>
              <div className="builder-result">
                <div className="builder-result-label">Effective Speed</div>
                <div className="builder-result-value">{effectiveSpeed}</div>
                <div className="builder-result-footnote">
                  Applied against current field conditions
                </div>
              </div>

              <div className="builder-inserted-note">
                <div className="builder-inserted-dot" />
                <span>Row is inserted in table below, positioned by effective speed.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
