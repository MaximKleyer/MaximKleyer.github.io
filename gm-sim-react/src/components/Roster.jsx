/**
 * Roster.jsx — Player table with Maps column + Strategy section.
 */

import { useState } from 'react';
import Strategy from './Strategy.jsx';
import DeltaIndicator from './DeltaIndicator.jsx';
import EditableCell from './EditableCell.jsx';
import NationalitySelect from './NationalitySelect.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';

export default function Roster({
  team, onRelease, onUpdate, allowMinRelease = false,
  godMode = false, onEditPlayer,
}) {
  const [, forceUpdate] = useState(0);

  function handleStrategyUpdate() {
    forceUpdate(n => n + 1);
    if (onUpdate) onUpdate();
  }

  // Adapter: rating edits flow through a single handler
  const editStat = (player, stat) => (v) => onEditPlayer?.(player, stat, v);

  return (
    <>
      <h2>{team.name} Roster</h2>
      <p className="muted">{team.roster.length} players · Team OVR: {team.overallRating}</p>

      <table>
        <thead>
          <tr>
            <th>Tag</th><th>Name</th><th>Nat</th><th>Age</th><th>OVR</th>
            <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
            <th>Maps</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {team.roster.map(player => {
            const d = player.lastOffseasonDelta;
            return (
            <tr key={player.id}>
              <td>
                {godMode ? (
                  <EditableCell
                    value={player.tag}
                    editable
                    width={80}
                    onCommit={v => onEditPlayer(player, 'tag', v)}
                  />
                ) : (
                  <strong>{player.tag}</strong>
                )}
                {player.id === team.strategy.iglId && <span className="igl-badge">IGL</span>}
              </td>
              <td>
                <EditableCell
                  value={player.name}
                  editable={godMode}
                  width={130}
                  onCommit={v => onEditPlayer(player, 'name', v)}
                />
              </td>
              <td title={nationalityName(player.nationality)}>
                <NationalitySelect
                  value={player.nationality}
                  editable={godMode}
                  onCommit={v => onEditPlayer(player, 'nationality', v)}
                />
              </td>
              <td>
                <EditableCell
                  value={player.age}
                  type="number"
                  editable={godMode}
                  min={16} max={40}
                  onCommit={v => onEditPlayer(player, 'age', v)}
                />
              </td>
              <td>
                {player.overall}
                <DeltaIndicator delta={d?.overall} />
              </td>
              <td>
                <EditableCell value={player.ratings.aim} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'aim')} />
                <DeltaIndicator delta={d?.aim} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.positioning} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'positioning')} />
                <DeltaIndicator delta={d?.positioning} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.utility} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'utility')} />
                <DeltaIndicator delta={d?.utility} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.gamesense} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'gamesense')} />
                <DeltaIndicator delta={d?.gamesense} size="small" />
              </td>
              <td>
                <EditableCell value={player.ratings.clutch} type="number" editable={godMode} min={1} max={99} onCommit={editStat(player, 'clutch')} />
                <DeltaIndicator delta={d?.clutch} size="small" />
              </td>
              <td>{player.stats.maps}</td>
              <td>{player.stats.kills}</td>
              <td>{player.stats.deaths}</td>
              <td>{player.stats.assists}</td>
              <td>{player.kd}</td>
              <td>{player.avgAcs}</td>
              <td>
                <button className="btn-small btn-danger" disabled={team.atMinRoster && !allowMinRelease}
                  onClick={() => onRelease(player)}>
                  {team.atMinRoster && !allowMinRelease ? 'Min 5' : 'Release'}
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      <Strategy team={team} onUpdate={handleStrategyUpdate} />
    </>
  );
}
