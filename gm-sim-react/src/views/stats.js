export function renderStats(gameState) {
    const el = document.getElementById('content');

    // Collect all players from all teams
    const allPlayers = gameState.teams.flatMap(t =>
        t.roster.map(p => ({ ...p, teamAbbr: t.abbr, kd: p.kd, avgAcs: p.avgAcs }))
    );

    // Default sort: kills desc
    let sortKey = 'kills';

    function render(key) {
        sortKey = key;
        const sorted = [...allPlayers].sort((a, b) => {
            if (key === 'kd') return b.kd - a.kd;
            if (key === 'avgAcs') return b.avgAcs - a.avgAcs;
            return (b.stats?.[key] ?? b[key] ?? 0) - (a.stats?.[key] ?? a[key] ?? 0);
        });

        el.innerHTML = `
            <h2>Stat Leaders</h2>
            <div class="sort-buttons" id="sort-buttons">
                <button data-sort="kills" class="${key === 'kills' ? 'active' : ''}">Kills</button>
                <button data-sort="deaths" class="${key === 'deaths' ? 'active' : ''}">Deaths</button>
                <button data-sort="assists" class="${key === 'assists' ? 'active' : ''}">Assists</button>
                <button data-sort="kd" class="${key === 'kd' ? 'active' : ''}">K/D</button>
                <button data-sort="avgAcs" class="${key === 'avgAcs' ? 'active' : ''}">ACS</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th><th>Player</th><th>Team</th><th>Role</th>
                        <th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map((p, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${p.tag}</td>
                            <td>${p.teamAbbr}</td>
                            <td>${p.role}</td>
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

        // Attach sort button listeners
        document.querySelectorAll('#sort-buttons button').forEach(btn => {
            btn.addEventListener('click', () => render(btn.dataset.sort));
        });
    }

    render(sortKey);
}