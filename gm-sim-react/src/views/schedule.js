export function renderSchedule(gameState) {
    const el = document.getElementById('content');
    const { schedule, currentWeek } = gameState;

    const weeks = [...new Set(schedule.map(m => m.week))].sort((a, b) => a - b);

    el.innerHTML = `
        <h2>Schedule</h2>
        ${weeks.map(w => `
            <div class="week-block ${w < currentWeek ? 'past' : w === currentWeek ? 'current' : 'future'}">
                <h3>Week ${w} ${w === currentWeek ? '← current' : ''}</h3>
                <table>
                    <thead>
                        <tr><th>Group</th><th>Home</th><th>Away</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                        ${schedule.filter(m => m.week === w).map(m => `
                            <tr>
                                <td>${m.group}</td>
                                <td>${m.teamA.abbr}</td>
                                <td>${m.teamB.abbr}</td>
                                <td>${m.result ? `${m.result.score[0]}-${m.result.score[1]}` : '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
    `;
}