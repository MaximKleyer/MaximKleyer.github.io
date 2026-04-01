/**
 * Schedule.jsx — Shows all matches grouped by week.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Computed / Derived Values
 * ═══════════════════════════════════════════════════════════════
 *
 * In vanilla, you might store "weeks" as its own variable.
 * In React, you compute it from state on every render:
 *
 *   const weeks = [...new Set(schedule.map(m => m.week))];
 *
 * This seems wasteful ("why compute it every time?") but React
 * is fast enough that this is fine for lists under ~10,000 items.
 * The benefit: you never have stale/out-of-sync derived data.
 * The weeks array is always correct because it's always fresh.
 *
 * ═══════════════════════════════════════════════════════════════
 */

export default function Schedule({ gameState }) {
  const { schedule, currentWeek } = gameState;

  // Get unique week numbers, sorted
  const weeks = [...new Set(schedule.map(m => m.week))].sort((a, b) => a - b);

  return (
    <>
      <h2>Schedule</h2>

      {weeks.map(week => (
        <div
          key={week}
          className={`week-block ${week < currentWeek ? 'past' : week === currentWeek ? 'current' : 'future'}`}
        >
          <h3>
            Week {week}
            {week === currentWeek && <span className="muted"> ← current</span>}
          </h3>

          <table>
            <thead>
              <tr><th>Grp</th><th>Home</th><th>Away</th><th>Result</th></tr>
            </thead>
            <tbody>
              {schedule
                .filter(m => m.week === week)
                .map((match, i) => (
                  <tr key={i}>
                    <td>{match.group}</td>
                    <td>{match.teamA.abbr}</td>
                    <td>{match.teamB.abbr}</td>
                    <td>
                      {match.result
                        ? `${match.result.score[0]}-${match.result.score[1]}`
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
