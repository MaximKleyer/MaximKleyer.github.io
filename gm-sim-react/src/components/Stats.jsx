/**
 * Stats.jsx — League-wide stat leaders with sortable columns.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT vs VANILLA — WHY THIS COMPONENT IS BETTER IN REACT
 * ═══════════════════════════════════════════════════════════════
 *
 * In the vanilla version, clicking a sort button called render()
 * which wiped the ENTIRE table with innerHTML and rebuilt it.
 * Then it re-attached click listeners to the new sort buttons.
 * If you had scroll position, it reset. If a user was hovering
 * on a row, the hover state broke.
 *
 * In React, clicking a sort button calls setSortKey('kills').
 * React compares the old table to the new one and only moves
 * the <tr> elements that actually changed position. Scroll
 * position stays. Hover states stay. Transitions can animate.
 *
 * This is React's "virtual DOM diffing" — it builds a lightweight
 * copy of the DOM in memory, compares it to the previous one,
 * and applies the minimum set of changes. You get performance
 * and UX benefits for free just by using the framework correctly.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState } from 'react';

export default function Stats({ teams }) {
  const [sortKey, setSortKey] = useState('kills');

  // Flatten all players from all teams into one array.
  // Each player gets a teamAbbr field so we know which team they're on.
  const allPlayers = teams.flatMap(team =>
    team.roster.map(player => ({
      player,
      teamAbbr: team.abbr,
    }))
  );

  // Sort by the selected stat
  const sorted = [...allPlayers].sort((a, b) => {
    const pA = a.player;
    const pB = b.player;
    switch (sortKey) {
      case 'kd':     return pB.kd - pA.kd;
      case 'avgAcs': return pB.avgAcs - pA.avgAcs;
      default:       return (pB.stats[sortKey] || 0) - (pA.stats[sortKey] || 0);
    }
  });

  // Sort button options
  const sortOptions = [
    { key: 'kills',   label: 'Kills' },
    { key: 'deaths',  label: 'Deaths' },
    { key: 'assists', label: 'Assists' },
    { key: 'kd',      label: 'K/D' },
    { key: 'avgAcs',  label: 'ACS' },
  ];

  return (
    <>
      <h2>Stat Leaders</h2>

      <div className="sort-buttons">
        {sortOptions.map(opt => (
          <button
            key={opt.key}
            className={sortKey === opt.key ? 'active' : ''}
            onClick={() => setSortKey(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Player</th><th>Team</th><th>Role</th>
            <th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ player, teamAbbr }, i) => (
            <tr key={player.id
              
            }>
              <td>{i + 1}</td>
              <td>{player.tag}</td>
              <td>{teamAbbr}</td>
              <td>{player.role}</td>
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
