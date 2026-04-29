import { getHumanTeam } from '../../engine/league.js';

export function renderRoster(gameState) {
    const el = document.getElementById('content');
    const team = getHumanTeam(gameState);

    el.innerHTML = `
        <h2>${team.name} Roster</h2>
        <table>
            <thead>
                <tr>
                    <th>Tag</th><th>Name</th><th>Role</th><th>OVR</th>
                    <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
                    <th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
                </tr>
            </thead>
            <tbody>
                ${team.roster.map(p => `
                    <tr>
                        <td><strong>${p.tag}</strong></td>
                        <td>${p.name}</td>
                        <td>${p.role}</td>
                        <td>${p.overall}</td>
                        <td>${p.ratings.aim}</td>
                        <td>${p.ratings.positioning}</td>
                        <td>${p.ratings.utility}</td>
                        <td>${p.ratings.gamesense}</td>
                        <td>${p.ratings.clutch}</td>
                        <td>${p.stats.kills}</td>
                        <td>${p.stats.deaths}</td>
                        <td>${p.stats.assists}</td>
                        <td>${p.kd}</td>
                        <td>${p.avgAcs}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}