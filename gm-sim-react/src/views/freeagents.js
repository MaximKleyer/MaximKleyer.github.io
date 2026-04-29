import { getHumanTeam } from '../engine/league.js';

export function renderFreeAgents(gameState) {
    const el = document.getElementById('content');
    const team = getHumanTeam(gameState);

    // Sort free agents by overall (best first)
    const sorted = [...gameState.freeAgents].sort((a, b) => b.overall - a.overall);

    el.innerHTML = `
        <h2>Free Agents</h2>
        <p class="muted">${sorted.length} available players</p>
        <table>
            <thead>
                <tr>
                    <th>Tag</th><th>Name</th><th>Role</th><th>OVR</th>
                    <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
                    <th></th>
                </tr>
            </thead>
            <tbody id="fa-list"></tbody>
        </table>
    `;

    // Build rows with working Sign buttons
    const tbody = document.getElementById('fa-list');
    sorted.forEach(player => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${player.tag}</strong></td>
            <td>${player.name}</td>
            <td>${player.role}</td>
            <td>${player.overall}</td>
            <td>${player.ratings.aim}</td>
            <td>${player.ratings.positioning}</td>
            <td>${player.ratings.utility}</td>
            <td>${player.ratings.gamesense}</td>
            <td>${player.ratings.clutch}</td>
            <td></td>
        `;

        // Sign button
        const btn = document.createElement('button');
        btn.textContent = team.rosterFull ? 'Full' : 'Sign';
        btn.disabled = team.rosterFull;
        btn.classList.add('btn-small');
        btn.addEventListener('click', () => {
            if (team.rosterFull) return;
            team.addPlayer(player);
            gameState.freeAgents.splice(gameState.freeAgents.indexOf(player), 1);
            renderFreeAgents(gameState); // re-render
        });
        row.lastElementChild.appendChild(btn);

        tbody.appendChild(row);
    });
}