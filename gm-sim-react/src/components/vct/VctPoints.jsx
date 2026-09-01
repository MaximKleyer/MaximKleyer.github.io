/**
 * VctPoints.jsx — the Championship points race, per region.
 *
 * The season's spine: the top 4 of each region's table go to Champions.
 * Partners and open clubs share one table — watching an open club climb
 * past a floundering partner is the whole point of the 2027 format.
 */

import { useState } from 'react';
import { REGIONS, REGION_KEYS } from '../../data/regions.js';
import { regionPointsTable } from '../../engine/vct/circuit.js';
import { CHAMPIONS_SLOTS_PER_REGION } from '../../data/vct/points.js';
import { SUB_REGIONS } from '../../data/vct/subregions.js';
import TeamLogo from '../TeamLogo.jsx';
import TeamFlag from '../TeamFlag.jsx';

export default function VctPoints({ gameState }) {
  const [regionKey, setRegionKey] = useState(gameState.humanRegion);
  const table = regionPointsTable(gameState, regionKey);

  return (
    <div>
      <h2>Championship Points</h2>
      <p className="muted">
        Top {CHAMPIONS_SLOTS_PER_REGION} per region qualify for Champions.
      </p>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
        {REGION_KEYS.map(rk => (
          <button key={rk} onClick={() => setRegionKey(rk)} style={{
            padding: '6px 14px', cursor: 'pointer', borderRadius: 4, fontWeight: 600,
            color: 'inherit',
            background: rk === regionKey ? `${REGIONS[rk].color}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${rk === regionKey ? REGIONS[rk].color : 'rgba(255,255,255,0.14)'}`,
          }}>{REGIONS[rk].name}</button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th style={{ textAlign: 'left' }}>Team</th>
            <th>Scene</th>
            <th>OVR</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {/* Rank and the Champions cutline come from the UNFILTERED
              table — the same ordering championsField seeds from — so
              this view can never disagree with the dashboard or the
              actual seeding. The filter only trims zero-point filler
              clubs from display, and never the human's own team. */}
          {table
            .map((r, rank) => ({ ...r, rank }))
            .filter(r => r.points > 0 || !r.team.subRegion || r.team.isHuman)
            .map(r => {
            const inChampions = r.rank < CHAMPIONS_SLOTS_PER_REGION;
            const i = r.rank;
            return (
              <tr key={r.team.abbr} className={r.team.isHuman ? 'highlight' : ''} style={{
                borderLeft: inChampions ? '3px solid #3ec488' : '3px solid transparent',
              }}>
                <td>{i + 1}</td>
                <td style={{ textAlign: 'left' }}>
                  <TeamLogo team={r.team} size={18} />{' '}
                  {r.team.name} ({r.team.abbr}){' '}
                  <TeamFlag team={r.team} style={{ fontSize: '0.85em' }} />
                  {!r.team.subRegion && (
                    <span style={{
                      marginLeft: 8, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                      padding: '1px 6px', borderRadius: 3,
                      background: 'rgba(255,70,85,0.16)', color: '#ff8c95',
                    }}>PARTNER</span>
                  )}
                </td>
                <td style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {r.team.subRegion
                    ? SUB_REGIONS[regionKey][r.team.subRegion]?.name || r.team.subRegion
                    : '—'}
                </td>
                <td>{r.team.overallRating}</td>
                <td style={{ fontWeight: 700, color: inChampions ? '#3ec488' : 'inherit' }}>
                  {r.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
