/**
 * Stats.jsx — League stat leaders with maps played column.
 */

import { useState } from 'react';

export default function Stats({ teams }) {
  const [sortKey, setSortKey] = useState('kills');

  const allPlayers = teams.flatMap(team =>
    team.roster.map(player => ({ player, teamAbbr: team.abbr }))
  );

  const sorted = [...allPlayers].sort((a, b) => {
    const pA = a.player, pB = b.player;
    switch (sortKey) {
      case 'kd': return pB.kd - pA.kd;
      case 'avgAcs': return pB.avgAcs - pA.avgAcs;
      case 'maps': return (pB.player?.stats?.maps || 0) - (pA.player?.stats?.maps || 0);
      default: return (pB.stats?.[sortKey] || pB.player?.stats?.[sortKey] || 0)
                    - (pA.stats?.[sortKey] || pA.player?.stats?.[sortKey] || 0);
    }
  });

  const sortOptions = [
    { key: 'kills', label: 'Kills' },
    { key: 'deaths', label: 'Deaths' },
    { key: 'assists', label: 'Assists' },
    { key: 'kd', label: 'K/D' },
    { key: 'avgAcs', label: 'ACS' },
    { key: 'maps', label: 'Maps' },
  ];

  return (
    <>
      <h2>Stat Leaders</h2>

      <div className="sort-buttons">
        {sortOptions.map(opt => (
          <button key={opt.key} className={sortKey === opt.key ? 'active' : ''}
            onClick={() => setSortKey(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Player</th><th>Team</th><th>Role</th>
            <th>Maps</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ player, teamAbbr }, i) => (
            <tr key={player.id}>
              <td>{i + 1}</td>
              <td>{player.tag}</td>
              <td>{teamAbbr}</td>
              <td>{player.role}</td>
              <td>{player.stats.maps}</td>
              <td>{player.stats.kills}</td>
              <td>{player.stats.deaths}</td>
              <td>{player.stats.assists}</td>
              <td>{player.kd}</td>
              <td>{player.avgAcs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
