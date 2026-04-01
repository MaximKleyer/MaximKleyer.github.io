/**
 * Bracket.jsx — Double elimination bracket.
 *
 * COLUMN LAYOUT (updated):
 *   Col 1: UB Quarterfinals (top) + LB Round 1 (bottom)
 *   Col 2: UB Semifinals (top) + LB Quarterfinals (bottom)
 *   Col 3: (empty top) + LB Semifinal (bottom)
 *   Col 4: UB Final (top) + LB Final (bottom)     ← same column now
 *   Col 5: Grand Final (centered)
 */

import { getStageName, getChampion } from '../engine/bracket.js';

/* ── Shared: format map scores for display ─────────────────── */
export function formatMapScores(result) {
  if (!result || !result.maps) return [];
  return result.maps.map(m => {
    const high = Math.max(m.roundsA, m.roundsB);
    const low = Math.min(m.roundsA, m.roundsB);
    return `${high}-${low}`;
  });
}

/* ── Match Card ──────────────────────────────────────────────── */
function MatchCard({ match, bestOf = 'bo3' }) {
  if (!match) return <div className="match-card empty" />;
  const { teamA, teamB, result } = match;

  let scoreA = null, scoreB = null, aWon = null, bWon = null;
  if (result) {
    if (result.winner === teamA) {
      scoreA = Math.max(result.score[0], result.score[1]);
      scoreB = Math.min(result.score[0], result.score[1]);
      aWon = true; bWon = false;
    } else {
      scoreB = Math.max(result.score[0], result.score[1]);
      scoreA = Math.min(result.score[0], result.score[1]);
      aWon = false; bWon = true;
    }
  }

  const mapScores = formatMapScores(result);

  const TeamRow = ({ team, score, isWinner }) => (
    <div className={`match-team ${isWinner === true ? 'winner' : ''} ${isWinner === false ? 'loser' : ''}`}>
      <span className="team-color" style={{ background: team?.color || '#333' }} />
      <span className="team-name">{team?.abbr || 'TBD'}</span>
      <span className="team-score">{score ?? '-'}</span>
    </div>
  );

  return (
    <div className="match-card">
      <TeamRow team={teamA} score={scoreA} isWinner={aWon} />
      <TeamRow team={teamB} score={scoreB} isWinner={bWon} />
      {mapScores.length > 0 && (
        <div className="match-map-scores">
          {mapScores.map((s, i) => (
            <span key={i} className="map-score-pill">M{i + 1}: {s}</span>
          ))}
        </div>
      )}
      <span className="match-format">{bestOf}</span>
    </div>
  );
}

/* ── SVG Connectors ──────────────────────────────────────────── */
function Connector({ type = 'straight' }) {
  if (type === 'converge') {
    return (
      <div className="connector converge">
        <svg viewBox="0 0 32 100" preserveAspectRatio="none">
          <path d="M 0 25 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" />
          <path d="M 0 75 H 16 V 50 H 32" stroke="var(--border-hover)" strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }
  if (type === 'straight') {
    return (
      <div className="connector straight">
        <svg viewBox="0 0 32 10" preserveAspectRatio="none">
          <line x1="0" y1="5" x2="32" y2="5" stroke="var(--border-hover)" strokeWidth="2" />
        </svg>
      </div>
    );
  }
  return null;
}

/* ── Main Bracket Component ──────────────────────────────────── */
export default function Bracket({ gameState, bracket, onAdvanceBracket }) {
  if (gameState.phase === 'group') {
    const remaining = gameState.schedule.filter(m => !m.result).length;
    return (
      <>
        <h2>Bracket</h2>
        <div className="empty-state">
          <p>The bracket will be revealed after group play ends.</p>
          <p className="muted">{remaining} group match{remaining !== 1 ? 'es' : ''} remaining.</p>
        </div>
      </>
    );
  }

  if (!bracket) {
    return <><h2>Bracket</h2><p className="muted">Generating bracket...</p></>;
  }

  const champion = getChampion(bracket);
  const stageName = getStageName(bracket.stage);
  const isFinished = bracket.stage >= 7;

  return (
    <div className="bracket-page">
      <h2>Playoffs — Double Elimination</h2>

      <div className="bracket-controls">
        <p className="muted">
          {isFinished ? `🏆 ${champion.name} wins Champions!` : `Next: ${stageName}`}
        </p>
        {!isFinished && (
          <button className="btn-advance-bracket" onClick={onAdvanceBracket}>
            Simulate {stageName}
          </button>
        )}
      </div>

      <div className="bracket-grid">

        {/* ── Col 1: UBQF + LBR1 ── */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">UB Quarterfinals</div>
            <div className="round-matches">
              <MatchCard match={bracket.ubQF[0]} />
              <MatchCard match={bracket.ubQF[1]} />
            </div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Round 1</div>
            <div className="round-matches">
              <MatchCard match={bracket.lbR1[0]} />
              <MatchCard match={bracket.lbR1[1]} />
            </div>
          </div>
        </div>

        {/* Connectors 1→2 */}
        <div className="bracket-connectors">
          <div className="bracket-half upper"><Connector type="converge" /></div>
          <div className="bracket-divider" />
          <div className="bracket-half lower"><Connector type="converge" /></div>
        </div>

        {/* ── Col 2: UBSF + LBQF ── */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">UB Semifinals</div>
            <div className="round-matches">
              <MatchCard match={bracket.ubSF[0]} />
              <MatchCard match={bracket.ubSF[1]} />
            </div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Quarterfinals</div>
            <div className="round-matches">
              <MatchCard match={bracket.lbQF[0]} />
              <MatchCard match={bracket.lbQF[1]} />
            </div>
          </div>
        </div>

        {/* Connectors 2→3 */}
        <div className="bracket-connectors">
          <div className="bracket-half upper"><Connector type="converge" /></div>
          <div className="bracket-divider" />
          <div className="bracket-half lower"><Connector type="converge" /></div>
        </div>

        {/* ── Col 3: (empty top) + LBSF ── */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">&nbsp;</div>
            <div className="round-matches round-matches-center">
              <div className="bracket-through-line">→</div>
            </div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Semifinal</div>
            <div className="round-matches round-matches-center">
              <MatchCard match={bracket.lbSF} />
            </div>
          </div>
        </div>

        {/* Connectors 3→4 */}
        <div className="bracket-connectors">
          <div className="bracket-half upper"><Connector type="straight" /></div>
          <div className="bracket-divider" />
          <div className="bracket-half lower"><Connector type="straight" /></div>
        </div>

        {/* ── Col 4: UB Final + LB Final (SAME COLUMN) ── */}
        <div className="bracket-col">
          <div className="bracket-half upper">
            <div className="round-label">UB Final</div>
            <div className="round-matches round-matches-center">
              <MatchCard match={bracket.ubFinal} />
            </div>
          </div>
          <div className="bracket-divider" />
          <div className="bracket-half lower">
            <div className="round-label">LB Final</div>
            <div className="round-matches round-matches-center">
              <MatchCard match={bracket.lbFinal} bestOf="bo5" />
            </div>
          </div>
        </div>

        {/* Connectors 4→5 */}
        <div className="bracket-connectors">
          <Connector type="converge" />
        </div>

        {/* ── Col 5: Grand Final ── */}
        <div className="bracket-col grand-final-col">
          <div className="round-label grand-label">Grand Final</div>
          <div className="round-matches round-matches-center">
            <MatchCard match={bracket.grandFinal} bestOf="bo5" />
          </div>
          {champion && (
            <div className="champion-banner">
              <span className="champion-icon">🏆</span>
              <span>{champion.name}</span>
            </div>
          )}
        </div>
      </div>

      {bracket.eliminated.length > 0 && (
        <div className="eliminated-list">
          <h3>Eliminated</h3>
          <p className="muted">{bracket.eliminated.map(t => t.abbr).join('  ·  ')}</p>
        </div>
      )}
    </div>
  );
}
