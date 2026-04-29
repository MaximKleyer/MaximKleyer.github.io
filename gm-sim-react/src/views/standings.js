import { getGroupStandings } from '../engine/standings.js';

export function renderStandings(gameState) {
    const el = document.getElementById('content');

    el.innerHTML = `
        <h2>Standings</h2>
        ${['A', 'B'].map(group => {
            const standings = getGroupStandings(gameState.teams, group);
            return `
                <h3>Group ${group}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>Team</th><th>W</th><th>L</th>
                            <th>MW</th><th>ML</th><th>Diff</th><th>OVR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map((t, i) => `
                            <tr class="${t.isHuman ? 'highlight' : ''}">
                                <td>${i + 1}</td>
                                <td>${t.name} (${t.abbr})</td>
                                <td>${t.record.wins}</td>
                                <td>${t.record.losses}</td>
                                <td>${t.record.mapWins}</td>
                                <td>${t.record.mapLosses}</td>
                                <td>${t.mapDiff > 0 ? '+' : ''}${t.mapDiff}</td>
                                <td>${t.overallRating}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }).join('')}
    `;
}