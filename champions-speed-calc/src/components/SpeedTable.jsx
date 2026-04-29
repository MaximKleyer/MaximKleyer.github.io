import React, { useState, useMemo } from 'react';

export default function SpeedTable({
  data,
  trickRoom,
  onSelectForSpread,
  focusedPokemonId,
  customRow,        // optional — the user's built pokemon, shown as a distinct row
}) {
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(trickRoom);

  React.useEffect(() => { setSortAsc(trickRoom); }, [trickRoom]);

  const filtered = useMemo(() => {
    // Combine normal data with the custom row (if one exists) before filtering/sorting
    const combined = customRow ? [...data, customRow] : data;
    const q = search.trim().toLowerCase();
    const matching = q
      ? combined.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.types || []).some(t => t.toLowerCase().includes(q))
        )
      : combined;
    return [...matching].sort((a, b) =>
      sortAsc ? a.effectiveSpeed - b.effectiveSpeed : b.effectiveSpeed - a.effectiveSpeed
    );
  }, [data, search, sortAsc, customRow]);

  // Reference for comparison highlighting. Custom row takes priority over focused id.
  const referenceSpeed = customRow?.effectiveSpeed
    ?? (focusedPokemonId
        ? data.find(p => p.id === focusedPokemonId)?.effectiveSpeed
        : null);
  const referenceId = customRow?.id ?? focusedPokemonId;

  function rowClass(p) {
    if (p.id === referenceId) {
      return customRow && p.id === customRow.id ? 'custom-row' : 'focused-row';
    }
    if (referenceSpeed == null) return '';
    if (trickRoom) {
      if (p.effectiveSpeed < referenceSpeed) return 'outsped-by-focus';
      if (p.effectiveSpeed > referenceSpeed) return 'outspeeds-focus';
    } else {
      if (p.effectiveSpeed > referenceSpeed) return 'outsped-by-focus';
      if (p.effectiveSpeed < referenceSpeed) return 'outspeeds-focus';
    }
    return 'speed-tie';
  }

  return (
    <div className="speed-table-container">
      <div className="table-header">
        <input
          className="search-box"
          placeholder="Search by name or type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="sort-toggle"
          onClick={() => setSortAsc(!sortAsc)}
          title={trickRoom ? 'In Trick Room, lower = faster' : 'Higher = faster'}
        >
          Sort: {sortAsc ? '↑ Low → High' : '↓ High → Low'}
        </button>
        <span className="result-count">
          {filtered.length} Pokémon{customRow ? ' (incl. yours)' : ''}
        </span>
        {customRow && (
          <div className="table-legend">
            <span className="legend-dot legend-dot-custom" /> Your Pokémon
            <span className="legend-sep">·</span>
            <span className="legend-dot legend-dot-faster" /> Faster than yours
            <span className="legend-sep">·</span>
            <span className="legend-dot legend-dot-slower" /> Slower than yours
          </div>
        )}
      </div>

      <div className="table-scroll">
        <table className="speed-table">
          <thead>
            <tr>
              <th>Pokémon</th>
              <th>Types</th>
              <th>Base Spe</th>
              <th>SP</th>
              <th>Alignment</th>
              <th>Ability</th>
              <th className="speed-col">Effective Speed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className={rowClass(p)}>
                <td className="mon-name">
                  {p.name}
                  {p.megaOf && <span className="mega-badge">MEGA</span>}
                  {p.isCustom && <span className="custom-badge">YOURS</span>}
                </td>
                <td className="types">
                  {p.types.map(t => (
                    <span key={t} className={`type-pill type-${t.toLowerCase()}`}>{t}</span>
                  ))}
                </td>
                <td className="num">{p.base[5]}</td>
                <td className="num">{p.appliedSP}</td>
                <td className="alignment">{p.appliedAlignment}</td>
                <td className="ability">{p.appliedAbility || '—'}</td>
                <td className="num speed-val">{p.effectiveSpeed}</td>
                <td>
                  {!p.isCustom && (
                    <button
                      className="focus-btn"
                      onClick={() => onSelectForSpread(p.id)}
                    >
                      Customize
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
