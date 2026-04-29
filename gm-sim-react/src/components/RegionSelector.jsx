/**
 * RegionSelector.jsx — Shared dropdown for switching viewed region.
 *
 * @param {string}   current   — currently selected region key
 * @param {function} onChange  — called with new region key
 * @param {boolean}  showAll   — whether to include an "All Regions" option
 */

import { REGIONS, REGION_KEYS } from '../data/regions.js';

export default function RegionSelector({ current, onChange, showAll = false }) {
  return (
    <div className="region-selector">
      {showAll && (
        <button
          className={`region-btn ${current === 'all' ? 'active' : ''}`}
          style={current === 'all' ? { borderColor: 'var(--white)', color: 'var(--white)' } : {}}
          onClick={() => onChange('all')}
        >
          All
        </button>
      )}
      {REGION_KEYS.map(key => {
        const region = REGIONS[key];
        const isActive = current === key;
        return (
          <button
            key={key}
            className={`region-btn ${isActive ? 'active' : ''}`}
            style={isActive ? { borderColor: region.color, color: region.color } : {}}
            onClick={() => onChange(key)}
          >
            {region.name}
          </button>
        );
      })}
    </div>
  );
}
