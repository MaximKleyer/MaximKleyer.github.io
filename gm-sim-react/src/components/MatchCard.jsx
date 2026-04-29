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
 * Used by Bracket.jsx, Schedule.jsx, International.jsx, Worlds.jsx.
 *
 * Phase 6e+ Ask 3 — In-progress display:
 *   Pass `inProgressSeries` (the entry from activeSeries.js) and the card
 *   renders the running map-by-map state. Series score shows current map
 *   wins (e.g. 1-1), per-map cells show round scores for completed maps
 *   only. Card gets a blue outline so it visually pops in tables full of
 *   not-yet-played and finalized matches.
 */

export default function MatchCard({
  match, bestOf = 'bo3', clickable, onClick,
  inProgressSeries = null,
}) {
  if (!match) return <div className="mc-card mc-empty" />;

  const { teamA, teamB, result } = match;
  const hasResult = !!result;

  // Use in-progress series state if provided AND no final result yet.
  // (If both somehow exist, the final result wins — completed beats
  // mid-flight.)
  const series = !hasResult && inProgressSeries ? inProgressSeries.series : null;
  const isInProgress = !!series && !hasResult;

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
    for (const map of result.maps) {
      mapScoresA.push(map.roundsA);
      mapScoresB.push(map.roundsB);
    }
  } else if (isInProgress) {
    // Live running state: series.winsA / winsB are the current map win
    // counts. series.maps holds the per-map results for maps already
    // played (length grows as ticks happen). Scores are stored on each
    // map result already oriented to teamA/teamB by simulateMap, so we
    // can just read them off directly.
    seriesA = series.winsA;
    seriesB = series.winsB;
    for (const map of series.maps) {
      mapScoresA.push(map.roundsA);
      mapScoresB.push(map.roundsB);
    }
  }

  const cardClass = [
    'mc-card',
    hasResult && clickable ? 'mc-clickable' : '',
    isInProgress ? 'mc-in-progress' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
      onClick={() => hasResult && clickable && onClick?.()}
      style={isInProgress ? {
        // Inline style guarantees the visual treatment regardless of
        // whether .mc-in-progress is wired up in the project's CSS.
        outline: '2px solid #6aa9ff',
        outlineOffset: -2,
        boxShadow: '0 0 0 1px rgba(106, 169, 255, 0.25), 0 0 12px rgba(106, 169, 255, 0.15)',
      } : undefined}
      title={isInProgress ? `In progress — ${series.maps.length} of ${series.bestOf} maps played` : undefined}
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

      {/* Format label OR live indicator */}
      {isInProgress ? (
        <span className="mc-format" style={{
          background: 'rgba(106, 169, 255, 0.18)',
          color: '#8ab8ff',
          fontWeight: 700,
        }}>
          LIVE
        </span>
      ) : bestOf && <span className="mc-format">{bestOf}</span>}
    </div>
  );
}
