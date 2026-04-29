/**
 * TeamSelect.jsx — Region + team selection screen.
 */

import { useState } from 'react';
import { REGIONS, REGION_KEYS } from '../data/regions.js';

export default function TeamSelect({ onSelect }) {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const regionDef = selectedRegion ? REGIONS[selectedRegion] : null;

  return (
    <div className="team-select-screen">
      <div className="team-select-header">
        <h1 className="team-select-title">
          VALORANT <span>GM SIMULATOR</span>
        </h1>
        <p className="team-select-sub">
          {!selectedRegion ? 'Choose your region' : 'Choose your franchise'}
        </p>
      </div>

      {/* Step 1: Region selection */}
      {!selectedRegion && (
        <div className="team-select-grid" style={{ maxWidth: '600px' }}>
          {REGION_KEYS.map(key => {
            const region = REGIONS[key];
            return (
              <button
                key={key}
                className="team-select-card"
                style={{ '--team-color': region.color }}
                onClick={() => setSelectedRegion(key)}
              >
                <div className="team-select-color-bar" style={{ background: region.color }} />
                <div className="team-select-info">
                  <span className="team-select-abbr">{region.name}</span>
                  <span className="team-select-name">{region.teams.length} teams</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2: Team selection */}
      {selectedRegion && regionDef && (
        <>
          <button
            className="region-back-btn"
            onClick={() => { setSelectedRegion(null); setSelectedTeam(null); }}
          >
            ← Back to regions
          </button>

          <div className="team-select-grid">
            {regionDef.teams.map((team, index) => (
              <button
                key={team.abbr}
                className={`team-select-card ${selectedTeam === index ? 'selected' : ''}`}
                style={{ '--team-color': team.color }}
                onClick={() => setSelectedTeam(index)}
                onDoubleClick={() => onSelect(selectedRegion, index)}
              >
                <div className="team-select-color-bar" style={{ background: team.color }} />
                <div className="team-select-info">
                  <span className="team-select-abbr">{team.abbr}</span>
                  <span className="team-select-name">{team.name}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            className="team-select-confirm"
            disabled={selectedTeam === null}
            onClick={() => onSelect(selectedRegion, selectedTeam)}
          >
            {selectedTeam !== null
              ? `Start as ${regionDef.teams[selectedTeam].name} (${regionDef.name})`
              : 'Select a team to begin'
            }
          </button>
        </>
      )}
    </div>
  );
}
