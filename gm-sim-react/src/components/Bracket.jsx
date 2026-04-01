/**
 * Bracket.jsx — Visual double elimination bracket.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Breaking complex UI into small components
 * ═══════════════════════════════════════════════════════════════
 *
 * A bracket is visually complex. Instead of one giant render,
 * we break it into:
 *   - <MatchCard />  — a single matchup (two teams + score)
 *   - <Round />       — a column of matches in the same round
 *   - <Bracket />     — the full layout with UB and LB sections
 *
 * Each piece is small and testable on its own. This is the
 * composability that React enables — you build complex UIs
 * from simple, reusable building blocks.
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { getStageName, getChampion } from '../engine/bracket.js';

/**
 * A single match card showing two teams and the series score.
 * Highlights the winner in green and loser in red.
 *
 * @param {object}  match — { teamA, teamB, result }
 * @param {string}  bestOf — "bo3" or "bo5" label
 */
function MatchCard({ match, bestOf = 'bo3' }) {
  if (!match) return null;

  const { teamA, teamB, result } = match;

  // Helper to render one team row inside the match card
  const TeamRow = ({ team, score, isWinner }) => (
    <div className={`match-team ${isWinner === true ? 'winner' : ''} ${isWinner === false ? 'loser' : ''}`}>
      <span
        className="team-color"
        style={{ background: team?.color || '#333' }}
      />
      <span className="team-name">{team?.abbr || 'TBD'}</span>
      <span className="team-score">{score ?? '-'}</span>
    </div>
  );

  // Determine scores and winner
  let scoreA = null, scoreB = null, aWon = null, bWon = null;
  if (result) {
    // result.score is [winsA, winsB] where A is from simulateSeries
    // but winner might be teamB, so we need to figure out which score goes where
    if (result.winner === teamA) {
      scoreA = Math.max(result.score[0], result.score[1]);
      scoreB = Math.min(result.score[0], result.score[1]);
      aWon = true;
      bWon = false;
    } else {
      scoreB = Math.max(result.score[0], result.score[1]);
      scoreA = Math.min(result.score[0], result.score[1]);
      aWon = false;
      bWon = true;
    }
  }

  return (
    <div className="match-card">
      <TeamRow team={teamA} score={scoreA} isWinner={aWon} />
      <TeamRow team={teamB} score={scoreB} isWinner={bWon} />
      <span className="match-format">{bestOf}</span>
    </div>
  );
}


/**
 * A column of matches sharing the same round label.
 */
function Round({ label, matches, bestOf = 'bo3' }) {
  // Normalize to array (some rounds are a single match, not an array)
  const matchList = Array.isArray(matches) ? matches : [matches];

  return (
    <div className="bracket-round">
      <div className="round-label">{label}</div>
      <div className="round-matches">
        {matchList.map((match, i) => (
          <MatchCard key={i} match={match} bestOf={bestOf} />
        ))}
      </div>
    </div>
  );
}


/**
 * Main Bracket component.
 */
export default function Bracket({ gameState, bracket, onAdvanceBracket }) {

  // ── Group stage not finished yet ──
  if (gameState.phase === 'group') {
    const remaining = gameState.schedule.filter(m => !m.result).length;
    return (
      <>
        <h2>Bracket</h2>
        <div className="empty-state">
          <p>The bracket will be revealed after group play ends.</p>
          <p className="muted">
            {remaining} group match{remaining !== 1 ? 'es' : ''} remaining.
          </p>
        </div>
      </>
    );
  }

  // ── Bracket not yet generated (shouldn't happen, but safety check) ──
  if (!bracket) {
    return (
      <>
        <h2>Bracket</h2>
        <p className="muted">Generating bracket...</p>
      </>
    );
  }

  const champion = getChampion(bracket);
  const stageName = getStageName(bracket.stage);
  const isFinished = bracket.stage >= 7;

  return (
    <>
      <h2>Playoffs — Double Elimination</h2>

      {/* Stage info and advance button */}
      <div className="bracket-controls">
        <p className="muted">
          {isFinished
            ? `🏆 ${champion.name} wins Champions!`
            : `Next: ${stageName}`
          }
        </p>
        {!isFinished && (
          <button className="btn-advance-bracket" onClick={onAdvanceBracket}>
            Simulate {stageName}
          </button>
        )}
      </div>

      {/* ── Upper Bracket ── */}
      <div className="bracket-section">
        <h3 className="bracket-section-label upper">Upper Bracket</h3>
        <div className="bracket-row">
          <Round label="UB Quarterfinals" matches={bracket.ubQF} />
          <Round label="UB Semifinals" matches={bracket.ubSF} />
          <Round label="UB Final" matches={bracket.ubFinal} />
        </div>
      </div>

      {/* ── Grand Final (center) ── */}
      <div className="bracket-section">
        <h3 className="bracket-section-label grand">Grand Final</h3>
        <div className="bracket-row">
          <Round label="" matches={bracket.grandFinal} bestOf="bo5" />
        </div>
      </div>

      {/* ── Lower Bracket ── */}
      <div className="bracket-section">
        <h3 className="bracket-section-label lower">Lower Bracket</h3>
        <div className="bracket-row">
          <Round label="LB Round 1" matches={bracket.lbR1} />
          <Round label="LB Quarterfinals" matches={bracket.lbQF} />
          <Round label="LB Semifinal" matches={bracket.lbSF} />
          <Round label="LB Final" matches={bracket.lbFinal} bestOf="bo5" />
        </div>
      </div>

      {/* ── Eliminated teams ── */}
      {bracket.eliminated.length > 0 && (
        <div className="eliminated-list">
          <h3>Eliminated</h3>
          <p className="muted">
            {bracket.eliminated.map(t => t.abbr).join(', ')}
          </p>
        </div>
      )}
    </>
  );
}
