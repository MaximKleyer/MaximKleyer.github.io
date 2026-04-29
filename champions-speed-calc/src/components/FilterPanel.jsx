import React from 'react';

export default function FilterPanel({ field, setField, assumptions, setAssumptions }) {
  return (
    <div className="filter-panel">
      <div className="filter-section">
        <h3>Field Conditions</h3>
        <div className="toggle-row">
          <label className={field.tailwind ? 'active' : ''}>
            <input
              type="checkbox"
              checked={field.tailwind}
              onChange={e => setField({ ...field, tailwind: e.target.checked })}
            />
            Tailwind (×2)
          </label>
          <label className={field.trickRoom ? 'active' : ''}>
            <input
              type="checkbox"
              checked={field.trickRoom}
              onChange={e => setField({ ...field, trickRoom: e.target.checked })}
            />
            Trick Room (reverses order)
          </label>
          <label className={field.paralysis ? 'active' : ''}>
            <input
              type="checkbox"
              checked={field.paralysis}
              onChange={e => setField({ ...field, paralysis: e.target.checked })}
            />
            Paralysis (×0.5)
          </label>
        </div>

        <div className="dropdown-row">
          <label>
            Weather:
            <select
              value={field.weather}
              onChange={e => setField({ ...field, weather: e.target.value })}
            >
              <option value="none">None</option>
              <option value="rain">Rain</option>
              <option value="sun">Sun</option>
              <option value="sand">Sand</option>
              <option value="snow">Snow</option>
            </select>
          </label>

          <label>
            Terrain:
            <select
              value={field.terrain}
              onChange={e => setField({ ...field, terrain: e.target.value })}
            >
              <option value="none">None</option>
              <option value="electric">Electric</option>
              <option value="grassy">Grassy</option>
              <option value="psychic">Psychic</option>
              <option value="misty">Misty</option>
            </select>
          </label>

          <label>
            Default Item:
            <select
              value={field.defaultItem || ''}
              onChange={e => setField({ ...field, defaultItem: e.target.value || null })}
            >
              <option value="">None</option>
              <option value="Choice Scarf">Choice Scarf (×1.5)</option>
              <option value="Iron Ball">Iron Ball (×0.5)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="filter-section">
        <h3>Default Assumptions for Roster</h3>
        <div className="dropdown-row">
          <label>
            SP in Speed:
            <input
              type="number"
              min={0}
              max={32}
              value={assumptions.sp}
              onChange={e => setAssumptions({
                ...assumptions,
                sp: Math.max(0, Math.min(32, Number(e.target.value))),
              })}
            />
          </label>

          <label>
            Stat Alignment:
            <select
              value={assumptions.alignment}
              onChange={e => setAssumptions({ ...assumptions, alignment: e.target.value })}
            >
              <option value="Timid">Timid (+Spe, -Atk)</option>
              <option value="Jolly">Jolly (+Spe, -SpA)</option>
              <option value="Hasty">Hasty (+Spe, -Def)</option>
              <option value="Naive">Naive (+Spe, -SpD)</option>
              <option value="Serious">Serious (neutral)</option>
              <option value="Brave">Brave (-Spe, +Atk)</option>
              <option value="Quiet">Quiet (-Spe, +SpA)</option>
              <option value="Relaxed">Relaxed (-Spe, +Def)</option>
              <option value="Sassy">Sassy (-Spe, +SpD)</option>
            </select>
          </label>

          <label className="assumed-label">
            <input
              type="checkbox"
              checked={assumptions.activateWeatherAbilities}
              onChange={e => setAssumptions({
                ...assumptions,
                activateWeatherAbilities: e.target.checked,
              })}
            />
            Activate weather-speed abilities
          </label>
        </div>
        <p className="assumption-note">
          These defaults apply to every Pokémon in the table unless you override an
          individual Pokémon in the Custom Spread panel.
        </p>
      </div>
    </div>
  );
}
