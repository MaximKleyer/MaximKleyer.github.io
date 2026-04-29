import { getHumanTeam } from '../engine/league.js';

export function renderDashboard(gameState) {
    const el = document.getElementById('content');
    const team = getHumanTeam(gameState);

    el.innerHTML = `
        <h2>Dashboard</h2>
        <p class="muted">Week ${gameState.currentWeek} &middot; ${gameState.phase} stage</p>
        <div class="dashboard-grid">
            <div class="card">
                <h3>Your Team</h3>
                <p><strong>${team.name}</strong> (${team.abbr})</p>
                <p>Record: ${team.recordStr}</p>
                <p>Team OVR: ${team.overallRating}</p>
            </div>
            <div class="card">
                <h3>Roster</h3>
                ${team.roster.map(p => `
                    <p>${p.tag} — ${p.role} — ${p.overall} OVR</p>
                `).join('')}
            </div>
        </div>
    `;
}