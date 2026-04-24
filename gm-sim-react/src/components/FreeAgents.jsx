/**
 * FreeAgents.jsx — Lists unsigned players, sorted by overall, with sign buttons.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Local State vs Lifted State
 * ═══════════════════════════════════════════════════════════════
 *
 * Not all state needs to live in the parent (App.jsx).
 * The "sort by" selection only matters to THIS component — no other
 * component cares which column the free agent list is sorted by.
 * So we keep it as LOCAL state here with its own useState.
 *
 * Rule of thumb:
 *   - Does multiple components need this data? → lift to parent
 *   - Does only this component care? → keep it local
 *
 * The freeAgents array and signPlayer action affect the whole app,
 * so those live in App.jsx and arrive here as props.
 * The sortKey is purely a UI concern, so it stays here.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import DeltaIndicator from './DeltaIndicator.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';

export default function FreeAgents({ freeAgents, canSign, onSign }) {
  // Local state — only this component uses sortKey
  const [sortKey, setSortKey] = useState('overall');

  // Sort the list (creates a new array, doesn't mutate the original)
  const sorted = [...freeAgents].sort((a, b) => {
    if (sortKey === 'overall') return b.overall - a.overall;
    return (b.ratings[sortKey] || 0) - (a.ratings[sortKey] || 0);
  });

  // Sort button helper — avoids repeating the same JSX 5 times
  const SortBtn = ({ label, value }) => (
    <button
      className={sortKey === value ? 'active' : ''}
      onClick={() => setSortKey(value)}
    >
      {label}
    </button>
  );

  return (
    <>
      <h2>Free Agents</h2>
      <p className="muted">{sorted.length} available players</p>

      {/* Sort buttons */}
      <div className="sort-buttons">
        <SortBtn label="Overall" value="overall" />
        <SortBtn label="Aim" value="aim" />
        <SortBtn label="Positioning" value="positioning" />
        <SortBtn label="Utility" value="utility" />
        <SortBtn label="Game Sense" value="gamesense" />
        <SortBtn label="Clutch" value="clutch" />
      </div>

      <table>
        <thead>
          <tr>
            <th>Tag</th><th>Name</th><th>Nat</th><th>Age</th><th>OVR</th>
            <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(player => {
            const d = player.lastOffseasonDelta;
            return (
            <tr key={player.id}>
              <td><strong>{player.tag}</strong></td>
              <td>{player.name}</td>
              <td title={nationalityName(player.nationality)}>
                <span className={flagClass(player.nationality)} />
              </td>
              <td>{player.age}</td>
              <td>{player.overall}<DeltaIndicator delta={d?.overall} /></td>
              <td>{player.ratings.aim}<DeltaIndicator delta={d?.aim} size="small" /></td>
              <td>{player.ratings.positioning}<DeltaIndicator delta={d?.positioning} size="small" /></td>
              <td>{player.ratings.utility}<DeltaIndicator delta={d?.utility} size="small" /></td>
              <td>{player.ratings.gamesense}<DeltaIndicator delta={d?.gamesense} size="small" /></td>
              <td>{player.ratings.clutch}<DeltaIndicator delta={d?.clutch} size="small" /></td>
              <td>
                <button
                  className="btn-small"
                  disabled={!canSign}
                  onClick={() => onSign(player)}
                >
                  {canSign ? 'Sign' : 'Full'}
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
