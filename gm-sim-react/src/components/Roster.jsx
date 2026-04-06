/**
 * Roster.jsx — Player table with Maps column + Strategy section.
 */

import { useState } from 'react';
import Strategy from './Strategy.jsx';
import { flagClass, nationalityName } from '../data/nationalities.js';

export default function Roster({ team, onRelease, onUpdate }) {
  const [, forceUpdate] = useState(0);

  function handleStrategyUpdate() {
    forceUpdate(n => n + 1);
    if (onUpdate) onUpdate();
  }

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
          {team.roster.map(player => (
            <tr key={player.id}>
              <td>
                <strong>{player.tag}</strong>
                {player.id === team.strategy.iglId && <span className="igl-badge">IGL</span>}
              </td>
              <td>{player.name}</td>
              <td title={nationalityName(player.nationality)}>
                <span className={flagClass(player.nationality)} />
              </td>
              <td>{player.age}</td>
              <td>{player.overall}</td>
              <td>{player.ratings.aim}</td>
              <td>{player.ratings.positioning}</td>
              <td>{player.ratings.utility}</td>
              <td>{player.ratings.gamesense}</td>
              <td>{player.ratings.clutch}</td>
              <td>{player.stats.maps}</td>
              <td>{player.stats.kills}</td>
              <td>{player.stats.deaths}</td>
              <td>{player.stats.assists}</td>
              <td>{player.kd}</td>
              <td>{player.avgAcs}</td>
              <td>
                <button className="btn-small btn-danger" disabled={team.atMinRoster}
                  onClick={() => onRelease(player)}>
                  {team.atMinRoster ? 'Min 5' : 'Release'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Strategy team={team} onUpdate={handleStrategyUpdate} />
    </>
  );
}
