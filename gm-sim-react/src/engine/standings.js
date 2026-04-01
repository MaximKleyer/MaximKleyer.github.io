/**
 * Get sorted standings for a specific group.
 * Sort order: wins (desc) → map diff (desc) → overall rating (desc)
 */
export function getGroupStandings(teams, group) {
    return teams
        .filter(t => t.group === group)
        .sort((a, b) => {
            // 1. More wins first
            if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
            // 2. Better map differential
            if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
            // 3. Higher team overall as final tiebreak
            return b.overallRating - a.overallRating;
        });
}

/**
 * Get combined standings (both groups, ranked).
 * Useful for the Stats page or general overview.
 */
export function getAllStandings(teams) {
    return [...teams].sort((a, b) => {
        if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
        if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
        return b.overallRating - a.overallRating;
    });
}
