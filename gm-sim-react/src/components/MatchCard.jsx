/**
 * MatchCard.jsx — Shared match result display component.
 *
 * Layout matches the Excel mockup:
 * ┌─────────────┬───────┬────┬────┬────┐
 * │  Team A     │   2   │ 13 │  2 │ 13 │
 * │  Team B     │   1   │  2 │ 13 │ 10 │
 * └─────────────┴───────┴────┴────┴────┘
 *
 * - Team name on the left
 * - Series score (bold, larger) in the middle
 * - Individual map scores flowing right
 * - Winner row is highlighted, loser is dimmed
 *
 * Used by both Bracket.jsx and Schedule.jsx.
 */

export default function MatchCard({ match, bestOf = 'bo3', clickable, onClick }) {
  if (!match) return <div className="mc-card mc-empty" />;

  const { teamA, teamB, result } = match;
  const hasResult = !!result;

  // Figure out series scores and per-map scores
  let seriesA = '-', seriesB = '-';
  let mapScoresA = [], mapScoresB = [];
  let aWon = null;

  if (hasResult) {
    if (result.winner === teamA) {
      seriesA = Math.max(result.score[0], result.score[1]);
      seriesB = Math.min(result.score[0], result.score[1]);
      aWon = true;
    } else {
      seriesB = Math.max(result.score[0], result.score[1]);
      seriesA = Math.min(result.score[0], result.score[1]);
      aWon = false;
    }

    // Per-map round scores
    for (const map of result.maps) {
      mapScoresA.push(map.roundsA);
      mapScoresB.push(map.roundsB);
    }
  }

  return (
    <div
      className={`mc-card ${hasResult && clickable ? 'mc-clickable' : ''}`}
      onClick={() => hasResult && clickable && onClick?.()}
    >
      {/* Team A row */}
      <div className={`mc-row ${aWon === true ? 'mc-winner' : ''} ${aWon === false ? 'mc-loser' : ''}`}>
        <span className="mc-color" style={{ background: teamA?.color || '#333' }} />
        <span className="mc-name">{teamA?.abbr || 'TBD'}</span>
        <span className="mc-series">{seriesA}</span>
        {mapScoresA.map((score, i) => (
          <span key={i} className={`mc-map ${score > mapScoresB[i] ? 'mc-map-won' : 'mc-map-lost'}`}>
            {score}
          </span>
        ))}
      </div>

      {/* Team B row */}
      <div className={`mc-row ${aWon === false ? 'mc-winner' : ''} ${aWon === true ? 'mc-loser' : ''}`}>
        <span className="mc-color" style={{ background: teamB?.color || '#333' }} />
        <span className="mc-name">{teamB?.abbr || 'TBD'}</span>
        <span className="mc-series">{seriesB}</span>
        {mapScoresB.map((score, i) => (
          <span key={i} className={`mc-map ${score > mapScoresA[i] ? 'mc-map-won' : 'mc-map-lost'}`}>
            {score}
          </span>
        ))}
      </div>

      {/* Format label */}
      {bestOf && <span className="mc-format">{bestOf}</span>}
    </div>
  );
}
