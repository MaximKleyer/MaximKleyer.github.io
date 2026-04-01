/**
 * TeamSelect.jsx — Pre-game team selection screen.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Controlled flow with state
 * ═══════════════════════════════════════════════════════════════
 *
 * Before the game starts, we show this screen instead of the
 * main app. App.jsx tracks a "started" state — when false,
 * it renders <TeamSelect />. When the user picks a team and
 * clicks confirm, App.jsx sets started=true and renders the
 * game. This is a clean way to handle multi-screen flows
 * without a router.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { TEAM_DEFS } from '../data/teams.js';

export default function TeamSelect({ onSelect }) {
  // Track which team card is highlighted (hovered/selected)
  const [selected, setSelected] = useState(null);

  return (
    <div className="team-select-screen">
      <div className="team-select-header">
        <h1 className="team-select-title">
          VALORANT <span>GM SIMULATOR</span>
        </h1>
        <p className="team-select-sub">Choose your franchise</p>
      </div>

      <div className="team-select-grid">
        {TEAM_DEFS.map((team, index) => (
          <button
            key={team.abbr}
            className={`team-select-card ${selected === index ? 'selected' : ''}`}
            style={{
              '--team-color': team.color,
            }}
            onClick={() => setSelected(index)}
            onDoubleClick={() => onSelect(index)}
          >
            <div
              className="team-select-color-bar"
              style={{ background: team.color }}
            />
            <div className="team-select-info">
              <span className="team-select-abbr">{team.abbr}</span>
              <span className="team-select-name">{team.name}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        className="team-select-confirm"
        disabled={selected === null}
        onClick={() => onSelect(selected)}
      >
        {selected !== null
          ? `Start as ${TEAM_DEFS[selected].name}`
          : 'Select a team to begin'
        }
      </button>
    </div>
  );
}
