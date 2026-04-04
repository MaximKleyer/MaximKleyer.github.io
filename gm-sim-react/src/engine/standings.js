/**
 * standings.js — Sort teams with round differential as an additional tiebreaker.
 *
 * Sort order: wins → map diff → round diff → overall rating
 */

export function getGroupStandings(teams, group) {
  return teams
    .filter(t => t.group === group)
    .sort((a, b) => {
      if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
      if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
      const rdA = (a.record.roundWins || 0) - (a.record.roundLosses || 0);
      const rdB = (b.record.roundWins || 0) - (b.record.roundLosses || 0);
      if (rdB !== rdA) return rdB - rdA;
      return b.overallRating - a.overallRating;
    });
}

export function getAllStandings(teams) {
  return [...teams].sort((a, b) => {
    if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
    if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
    const rdA = (a.record.roundWins || 0) - (a.record.roundLosses || 0);
    const rdB = (b.record.roundWins || 0) - (b.record.roundLosses || 0);
    if (rdB !== rdA) return rdB - rdA;
    return b.overallRating - a.overallRating;
  });
}
