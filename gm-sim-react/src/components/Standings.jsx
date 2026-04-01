/**
 * Standings.jsx — Displays group standings.
 *
 * This component is a good example of how simple React components
 * can be. It receives data (teams), computes what it needs (sorted
 * standings), and returns JSX. No state, no side effects, no event
 * handlers. Just data → HTML.
 *
 * Components like this are called "presentational" or "pure" components.
 * They're the easiest to understand, test, and reuse.
 */

import { getGroupStandings } from '../engine/standings.js';

export default function Standings({ teams }) {
  return (
    <>
      <h2>Standings</h2>

      {/*
        Rendering both groups using .map() on the array ['A', 'B'].
        This avoids duplicating the same table JSX twice.

        VANILLA EQUIVALENT:
          ['A', 'B'].forEach(group => {
            html += `<h3>Group ${group}</h3><table>...`;
          });
      */}
      {['A', 'B'].map(group => {
        const standings = getGroupStandings(teams, group);

        return (
          <div key={group}>
            <h3>Group {group}</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Team</th><th>W</th><th>L</th>
                  <th>MW</th><th>ML</th><th>Diff</th><th>OVR</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, i) => (
                  <tr key={team.abbr} className={team.isHuman ? 'highlight' : ''}>
                    <td>{i + 1}</td>
                    <td>{team.name} ({team.abbr})</td>
                    <td>{team.record.wins}</td>
                    <td>{team.record.losses}</td>
                    <td>{team.record.mapWins}</td>
                    <td>{team.record.mapLosses}</td>
                    <td>{team.mapDiff > 0 ? '+' : ''}{team.mapDiff}</td>
                    <td>{team.overallRating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
