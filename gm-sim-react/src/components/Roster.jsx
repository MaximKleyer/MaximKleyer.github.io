/**
 * Roster.jsx — Shows the human team's players with stats and a release button.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Callbacks as Props (Child → Parent communication)
 * ═══════════════════════════════════════════════════════════════
 *
 * VANILLA:
 *   const btn = document.createElement('button');
 *   btn.addEventListener('click', () => {
 *     team.removePlayer(player);
 *     freeAgents.push(player);
 *     renderRoster();         // manually re-render
 *   });
 *
 * REACT:
 *   <button onClick={() => onRelease(player)}>Release</button>
 *
 * The component doesn't know HOW releasing works — it just calls
 * the onRelease function it received as a prop. The parent (App.jsx)
 * handles the actual logic. This separation means you could reuse
 * this Roster component in a completely different context.
 *
 * Data flows DOWN through props. Actions flow UP through callbacks.
 * This is called "unidirectional data flow" and it's the core
 * architectural principle of React.
 *
 * ═══════════════════════════════════════════════════════════════
 */

export default function Roster({ team, onRelease }) {
  return (
    <>
      <h2>{team.name} Roster</h2>
      <p className="muted">{team.roster.length}/5 players</p>

      <table>
        <thead>
          <tr>
            <th>Tag</th><th>Name</th><th>Role</th><th>OVR</th>
            <th>AIM</th><th>POS</th><th>UTL</th><th>IQ</th><th>CLT</th>
            <th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {team.roster.map(player => (
            <tr key={player.id}>
              <td><strong>{player.tag}</strong></td>
              <td>{player.name}</td>
              <td>{player.role}</td>
              <td>{player.overall}</td>
              <td>{player.ratings.aim}</td>
              <td>{player.ratings.positioning}</td>
              <td>{player.ratings.utility}</td>
              <td>{player.ratings.gamesense}</td>
              <td>{player.ratings.clutch}</td>
              <td>{player.stats.kills}</td>
              <td>{player.stats.deaths}</td>
              <td>{player.stats.assists}</td>
              <td>{player.kd}</td>
              <td>{player.avgAcs}</td>
              <td>
                {/*
                  onClick={() => onRelease(player)}
                  The arrow function is needed here to pass the specific player.
                  If you wrote onClick={onRelease(player)} (without the arrow),
                  it would call onRelease immediately during render, not on click.
                  This is a common React gotcha.
                */}
                <button
                  className="btn-small btn-danger"
                  disabled={team.atMinRoster}
                  onClick={() => onRelease(player)}
                >
                  {team.atMinRoster ? 'Min 5' : 'Release'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
