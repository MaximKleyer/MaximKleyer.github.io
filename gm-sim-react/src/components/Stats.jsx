import { useState } from 'react';
import RegionSelector from './RegionSelector.jsx';
import { REGION_KEYS, REGIONS } from '../data/regions.js';
import { flagClass, nationalityName } from '../data/nationalities.js';

/**
 * Resolve the stat object to display for one player given the selected
 * stage filter. Returns an object with the same shape as player.stats
 * (kills/deaths/assists/acs/maps) plus derived kd and avgAcs.
 *
 * Filter values:
 *   1, 2, 3        — that specific stage. Reads from player.stageStats[N]
 *                    if present; if N is the current live stage, reads
 *                    from player.stats (live, in-progress).
 *   'season'       — season total. Sums all stageStats entries plus the
 *                    current live stats (if the live stage hasn't been
 *                    snapshotted yet).
 *
 * Stages without snapshots (and not current) return zeroed stats.
 */
function resolveStats(player, filter, currentStageNum) {
  const liveStats = player.stats || { kills: 0, deaths: 0, assists: 0, acs: 0, maps: 0 };
  const stageStats = player.stageStats || {};

  if (filter === 'season') {
    const totals = { kills: 0, deaths: 0, assists: 0, acs: 0, maps: 0 };
    for (const num of Object.keys(stageStats)) {
      const s = stageStats[num];
      totals.kills   += s.kills   || 0;
      totals.deaths  += s.deaths  || 0;
      totals.assists += s.assists || 0;
      totals.acs     += s.acs     || 0;
      totals.maps    += s.maps    || 0;
    }
    // If currently mid-stage with no snapshot yet, add live numbers on top.
    if (currentStageNum && !stageStats[currentStageNum]) {
      totals.kills   += liveStats.kills   || 0;
      totals.deaths  += liveStats.deaths  || 0;
      totals.assists += liveStats.assists || 0;
      totals.acs     += liveStats.acs     || 0;
      totals.maps    += liveStats.maps    || 0;
    }
    return finalize(totals);
  }

  const num = filter;
  // Selected stage is the current live one with no snapshot yet → live stats
  if (num === currentStageNum && !stageStats[num]) {
    return finalize(liveStats);
  }
  const snap = stageStats[num];
  if (snap) return finalize(snap);
  return finalize({ kills: 0, deaths: 0, assists: 0, acs: 0, maps: 0 });
}

function finalize(s) {
  const kd = s.deaths === 0 ? s.kills : +(s.kills / s.deaths).toFixed(2);
  const avgAcs = s.maps === 0 ? 0 : Math.round(s.acs / s.maps);
  return { ...s, kd, avgAcs };
}

/**
 * Determine which stage's data is live RIGHT NOW. Returns 1, 2, 3, or null.
 */
function getCurrentLiveStage(gameState) {
  const slot = gameState.season.circuit?.[gameState.season.slotIndex];
  if (slot?.type === 'stage') return slot.stageNumber;
  return null;
}

/**
 * Stages that have any data to display, sorted ascending. Includes the
 * current live stage even if it has no snapshot yet (so the user can
 * filter to "current stage in progress").
 */
function getAvailableStages(regions, regionKeys, currentLiveStage) {
  const available = new Set();
  if (currentLiveStage) available.add(currentLiveStage);
  for (const rk of regionKeys) {
    const region = regions[rk];
    if (!region) continue;
    for (const team of region.teams) {
      for (const player of team.roster) {
        const s = player.stageStats || {};
        for (const k of Object.keys(s)) {
          available.add(Number(k));
        }
      }
    }
  }
  return [...available].sort((a, b) => a - b);
}

export default function Stats({ regions, viewRegion, onChangeRegion, gameState }) {
  const [sortKey, setSortKey] = useState('kills');
  const showAll = viewRegion === 'all';

  // Phase 6h: stage selector. Defaults to Season Total — most useful
  // generic view. User can drill into a specific stage when they want.
  const [stageFilter, setStageFilter] = useState('season');

  const regionKeys = showAll ? REGION_KEYS : [viewRegion];
  const currentLiveStage = gameState ? getCurrentLiveStage(gameState) : null;
  const availableStages = getAvailableStages(regions, regionKeys, currentLiveStage);

  const effectiveFilter = (stageFilter === 'season' || availableStages.includes(stageFilter))
    ? stageFilter
    : 'season';

  const allPlayers = [];
  for (const rk of regionKeys) {
    const region = regions[rk];
    if (!region) continue;
    for (const team of region.teams) {
      for (const player of team.roster) {
        const stats = resolveStats(player, effectiveFilter, currentLiveStage);
        allPlayers.push({
          player,
          stats,
          teamAbbr: team.abbr,
          regionName: region.name,
          regionAbbr: region.abbr,
        });
      }
    }
  }

  const sorted = [...allPlayers].sort((a, b) => {
    switch (sortKey) {
      case 'kd': return b.stats.kd - a.stats.kd;
      case 'avgAcs': return b.stats.avgAcs - a.stats.avgAcs;
      case 'maps': return b.stats.maps - a.stats.maps;
      default: return (b.stats[sortKey] || 0) - (a.stats[sortKey] || 0);
    }
  });

  const sortOptions = [
    { key: 'kills', label: 'Kills' },
    { key: 'deaths', label: 'Deaths' },
    { key: 'assists', label: 'Assists' },
    { key: 'kd', label: 'K/D' },
    { key: 'avgAcs', label: 'ACS' },
    { key: 'maps', label: 'Maps' },
  ];

  const title = showAll ? 'All Regions' : (regions[viewRegion]?.name || '');
  const filterLabel = effectiveFilter === 'season' ? 'Season Total' : `Stage ${effectiveFilter}`;

  const stageBtnStyle = (active) => ({
    padding: '5px 12px',
    background: active ? 'var(--accent, #ff4655)' : 'rgba(255,255,255,0.03)',
    border: active ? '1px solid var(--accent, #ff4655)' : '1px solid rgba(255,255,255,0.08)',
    color: active ? '#fff' : '#cdd5e5',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.66rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginRight: 6,
  });

  return (
    <>
      <h2>Stat Leaders — {title}</h2>
      <RegionSelector current={viewRegion} onChange={onChangeRegion} showAll={true} />

      {(availableStages.length > 0 || currentLiveStage) && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span style={{
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#8a98b1',
            fontFamily: "'JetBrains Mono', monospace",
            marginRight: 8,
          }}>
            View
          </span>
          {availableStages.map(num => {
            const isLive = num === currentLiveStage;
            const active = effectiveFilter === num;
            return (
              <button
                key={num}
                onClick={() => setStageFilter(num)}
                style={stageBtnStyle(active)}
              >
                Stage {num}{isLive ? ' (live)' : ''}
              </button>
            );
          })}
          <button
            onClick={() => setStageFilter('season')}
            style={stageBtnStyle(effectiveFilter === 'season')}
          >
            Season Total
          </button>
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.78rem', marginTop: 8 }}>
        Showing: <strong style={{ color: '#cdd5e5' }}>{filterLabel}</strong>
        {effectiveFilter === currentLiveStage && (
          <span style={{ color: '#8ab8ff', marginLeft: 8 }}>· in progress</span>
        )}
      </p>

      <div className="sort-buttons" style={{ marginTop: 12 }}>
        {sortOptions.map(opt => (
          <button key={opt.key} className={sortKey === opt.key ? 'active' : ''} onClick={() => setSortKey(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Player</th><th>Team</th>
            {showAll && <th>Region</th>}
            <th>Nat</th><th>Age</th><th>Maps</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ player, stats, teamAbbr, regionAbbr }, i) => (
            <tr key={player.id}>
              <td>{i + 1}</td>
              <td>{player.tag}</td>
              <td>{teamAbbr}</td>
              {showAll && <td>{regionAbbr}</td>}
              <td title={nationalityName(player.nationality)}>
                <span className={flagClass(player.nationality)} />
              </td>
              <td>{player.age}</td>
              <td>{stats.maps}</td>
              <td>{stats.kills}</td>
              <td>{stats.deaths}</td>
              <td>{stats.assists}</td>
              <td>{stats.kd}</td>
              <td>{stats.avgAcs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
