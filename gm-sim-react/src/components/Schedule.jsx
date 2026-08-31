import { useState } from 'react';
import MatchReport from './MatchReport.jsx';
import MatchCard from './MatchCard.jsx';
import RegionSelector from './RegionSelector.jsx';
import { findActiveSeriesForMatch } from '../engine/activeSeries.js';
import { mapName } from '../data/maps.js';

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
  return (
    <div className="match-detail">
      <MatchReport result={result} teamA={teamA} teamB={teamB} />
    </div>
  );
}

