export function renderBracket(gameState) {
    const el = document.getElementById('content');

    if (gameState.phase === 'group') {
        el.innerHTML = `
            <h2>Bracket</h2>
            <div class="empty-state">
                <p>The bracket will be revealed after group play ends.</p>
                <p class="muted">Complete all ${gameState.schedule.filter(m => !m.result).length} remaining group matches first.</p>
            </div>
        `;
        return;
    }

    // TODO: render actual bracket when you build knockout stage
    el.innerHTML = `
        <h2>Bracket</h2>
        <p>Bracket rendering goes here once you build it out.</p>
    `;
}