import { useState } from 'react';
import MatchCard from './MatchCard.jsx';
import RegionSelector from './RegionSelector.jsx';
import { findActiveSeriesForMatch } from '../engine/activeSeries.js';

export default function Schedule({ regionData, viewRegion, onChangeRegion, gameState }) {
  const { schedule, currentWeek } = regionData;
  const [expanded, setExpanded] = useState(null);
  const weeks = [...new Set(schedule.map(m => m.week))].sort((a, b) => a - b);

  return (
    <>
      <h2>Schedule — {regionData.name}</h2>
      <RegionSelector current={viewRegion} onChange={onChangeRegion} />
      <p className="muted" style={{ marginTop: 12, fontSize: '0.75rem' }}>
        Click a completed match to view player stats. Live matches are outlined blue.
      </p>

      <div className="schedule-weeks-grid">
        {weeks.map(week => (
          <div key={week} className={`week-block ${week < currentWeek ? 'past' : week === currentWeek ? 'current' : 'future'}`}>
            <h3>Week {week}{week === currentWeek && <span className="muted"> ← current</span>}</h3>
            <div className="schedule-card-grid">
              {schedule.filter(m => m.week === week).map((match) => {
                const idx = schedule.indexOf(match);
                const isExp = expanded === idx;
                const has = !!match.result;
                const inProgress = gameState ? findActiveSeriesForMatch(gameState, match) : null;
                return (
                  <div key={idx} className="schedule-card-wrapper">
                    <div className="schedule-card-row">
                      <span className="schedule-group-badge">{match.group}</span>
                      <MatchCard
                        match={{ teamA: match.teamA, teamB: match.teamB, result: match.result }}
                        clickable={has}
                        onClick={() => setExpanded(isExp ? null : idx)}
                        inProgressSeries={inProgress}
                      />
                    </div>
                    {isExp && has && (
                      <div className="schedule-detail-panel">
                        <MatchDetail result={match.result} teamA={match.teamA} teamB={match.teamB} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function MatchDetail({ result, teamA, teamB }) {
  const [selectedMap, setSelectedMap] = useState(0);
  const map = result.maps[selectedMap];
  const aIds = map.rosterAIds || [];
  const bIds = map.rosterBIds || [];
  const aStats = aIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  const bStats = bIds.map(id => map.playerStats?.[id]).filter(Boolean).sort((a, b) => b.acs - a.acs);
  return (
    <div className="match-detail">
      <div className="map-score-row">
        {result.maps.map((m, i) => (
          <button key={i} className={`map-pill ${selectedMap === i ? 'active' : ''} ${m.winner === teamA ? 'team-a-won' : 'team-b-won'}`} onClick={() => setSelectedMap(i)}>
            <span className="map-pill-label">Map {i + 1}</span>
            <span className="map-pill-score">{Math.max(m.roundsA, m.roundsB)}-{Math.min(m.roundsA, m.roundsB)}</span>
            <span className="map-pill-winner">{m.winner.abbr}</span>
          </button>
        ))}
      </div>
      <div className="map-stats-grid">
        <StatsTable stats={aStats} teamName={teamA.name} teamColor={teamA.color} />
        <StatsTable stats={bStats} teamName={teamB.name} teamColor={teamB.color} />
      </div>
    </div>
  );
}

function StatsTable({ stats, teamName, teamColor }) {
  return (
    <div className="map-stats-team">
      <div className="map-stats-team-header">
        <span className="map-stats-color" style={{ background: teamColor }} />
        <span>{teamName}</span>
      </div>
      <table className="map-stats-table">
        <thead><tr><th>Player</th><th>Role</th><th>K</th><th>D</th><th>A</th><th>ACS</th></tr></thead>
        <tbody>{stats.map(s => (<tr key={s.id || s.tag}><td><strong>{s.tag}</strong></td><td>{s.role}</td><td>{s.kills}</td><td>{s.deaths}</td><td>{s.assists}</td><td>{s.acs}</td></tr>))}</tbody>
      </table>
    </div>
  );
}
