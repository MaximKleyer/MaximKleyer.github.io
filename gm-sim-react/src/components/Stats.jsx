import { useState } from 'react';
import RegionSelector from './RegionSelector.jsx';
import { REGION_KEYS, REGIONS } from '../data/regions.js';

export default function Stats({ regions, viewRegion, onChangeRegion }) {
  const [sortKey, setSortKey] = useState('kills');
  const showAll = viewRegion === 'all';

  // Gather players from selected region(s)
  const regionKeys = showAll ? REGION_KEYS : [viewRegion];
  const allPlayers = [];
  for (const rk of regionKeys) {
    const region = regions[rk];
    if (!region) continue;
    for (const team of region.teams) {
      for (const player of team.roster) {
        allPlayers.push({
          player,
          teamAbbr: team.abbr,
          regionName: region.name,
          regionAbbr: region.abbr,
        });
      }
    }
  }

  const sorted = [...allPlayers].sort((a, b) => {
    const pA = a.player, pB = b.player;
    switch (sortKey) {
      case 'kd': return pB.kd - pA.kd;
      case 'avgAcs': return pB.avgAcs - pA.avgAcs;
      case 'maps': return pB.stats.maps - pA.stats.maps;
      default: return (pB.stats[sortKey] || 0) - (pA.stats[sortKey] || 0);
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

  const title = showAll ? 'All Regions' : (regions[viewRegion]?.name || '');

  return (
    <>
      <h2>Stat Leaders — {title}</h2>
      <RegionSelector current={viewRegion} onChange={onChangeRegion} showAll={true} />

      <div className="sort-buttons" style={{ marginTop: 12 }}>
        {sortOptions.map(opt => (
          <button key={opt.key} className={sortKey === opt.key ? 'active' : ''} onClick={() => setSortKey(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Player</th><th>Team</th>
            {showAll && <th>Region</th>}
            <th>Role</th><th>Maps</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ player, teamAbbr, regionAbbr }, i) => (
            <tr key={player.id}>
              <td>{i + 1}</td>
              <td>{player.tag}</td>
              <td>{teamAbbr}</td>
              {showAll && <td>{regionAbbr}</td>}
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
