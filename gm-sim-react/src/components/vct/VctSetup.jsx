/**
 * VctSetup.jsx — starting a VCT 2027 save.
 *
 * Two career paths, per the 2027 announcement:
 *   PARTNER — one of the region's eight partnered orgs. Direct seeding
 *             into every Kickoff and Cup; you never touch a qualifier.
 *   OPEN    — a club in one sub-region's 32-team open qualifier. The
 *             dream run: quals → Cup → Masters → Champions.
 *
 * The open-scene clubs are generated per save, so this screen builds a
 * PREVIEW world up front and hands the whole thing to the app when the
 * user commits — the rosters shown are the rosters they get.
 */

import { useMemo, useState } from 'react';
import { REGIONS, REGION_KEYS } from '../../data/regions.js';
import { SUB_REGIONS } from '../../data/vct/subregions.js';
import { initVctGame } from '../../engine/vct/generation.js';
import TeamLogo from '../TeamLogo.jsx';
import TeamFlag from '../TeamFlag.jsx';
import { commLanguage, languageName } from '../../data/languages.js';

export default function VctSetup({ onStart, onBack }) {
  const [regionKey, setRegionKey] = useState('americas');
  const [path, setPath] = useState('partner');           // 'partner' | 'open'
  const [subKey, setSubKey] = useState(null);

  // One world per setup session: generated once, committed as-is.
  const world = useMemo(() => initVctGame({ type: 'partner', regionKey: 'americas', abbr: null }), []);

  const region = world.regions[regionKey];
  const subKeys = Object.keys(SUB_REGIONS[regionKey]);
  const activeSub = subKey && subKeys.includes(subKey) ? subKey : subKeys[0];

  function commit(choice) {
    // Clear the preview's provisional human flag, then mark the pick.
    for (const rk of REGION_KEYS) {
      for (const t of world.regions[rk].teams) t.isHuman = false;
      for (const s of Object.values(world.regions[rk].subRegions)) {
        for (const t of s.teams) t.isHuman = false;
      }
    }
    let team = null;
    if (choice.type === 'partner') {
      team = world.regions[choice.regionKey].teams.find(t => t.abbr === choice.abbr);
    } else {
      team = world.regions[choice.regionKey].subRegions[choice.subKey].teams
        .find(t => t.abbr === choice.abbr);
    }
    if (!team) return;
    team.isHuman = true;
    world.humanRegion = choice.regionKey;
    world.humanTeamAbbr = team.abbr;
    world.humanSubRegion = choice.type === 'open' ? choice.subKey : null;
    onStart(world);
  }

  const card = { padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'inherit' };

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ letterSpacing: '0.04em' }}>VCT 2027 — Everything Is a Tournament</h1>
      <p className="muted" style={{ maxWidth: 700 }}>
        Eight partners per region, open qualifiers for everyone else. Kickoff → Masters I →
        Cup 1 → Masters II → Cup 2 → Champions. Take a partner's seat — or start in a
        32-team open bracket and make them learn your name.
      </p>
      {onBack && (
        <button onClick={onBack} style={{ ...card, padding: '6px 12px', marginBottom: 14 }}>
          ← Back to mode select
        </button>
      )}

      {/* Region tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
        {REGION_KEYS.map(rk => (
          <button key={rk} onClick={() => { setRegionKey(rk); setSubKey(null); }} style={{
            ...card, padding: '8px 16px', fontWeight: 700,
            border: `1px solid ${rk === regionKey ? REGIONS[rk].color : 'rgba(255,255,255,0.12)'}`,
            background: rk === regionKey ? `${REGIONS[rk].color}22` : 'rgba(255,255,255,0.04)',
          }}>{REGIONS[rk].name}</button>
        ))}
      </div>

      {/* Path tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setPath('partner')} style={{
          ...card, fontWeight: 700,
          border: `1px solid ${path === 'partner' ? '#ff4655' : 'rgba(255,255,255,0.12)'}`,
        }}>
          Partner org
          <div style={{ fontSize: '0.72rem', opacity: 0.65, fontWeight: 400 }}>
            Direct seeding into every event · base payment
          </div>
        </button>
        <button onClick={() => setPath('open')} style={{
          ...card, fontWeight: 700,
          border: `1px solid ${path === 'open' ? '#3ec488' : 'rgba(255,255,255,0.12)'}`,
        }}>
          Open-scene club
          <div style={{ fontSize: '0.72rem', opacity: 0.65, fontWeight: 400 }}>
            Fight through the qualifiers · nothing is given
          </div>
        </button>
      </div>

      {path === 'open' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {subKeys.map(sk => (
            <button key={sk} onClick={() => setSubKey(sk)} style={{
              ...card, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
              border: `1px solid ${sk === activeSub ? SUB_REGIONS[regionKey][sk].color : 'rgba(255,255,255,0.12)'}`,
            }}>
              {SUB_REGIONS[regionKey][sk].name}
              <span style={{ opacity: 0.5, marginLeft: 6 }}>
                {SUB_REGIONS[regionKey][sk].slots} slots
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Team grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))', gap: 10,
      }}>
        {(path === 'partner'
          ? region.teams
          : region.subRegions[activeSub].teams
        ).map(team => {
          const comm = commLanguage(team.roster).lang;
          return (
            <button
              key={team.abbr}
              onClick={() => commit(path === 'partner'
                ? { type: 'partner', regionKey, abbr: team.abbr }
                : { type: 'open', regionKey, subKey: activeSub, abbr: team.abbr })}
              style={card}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <TeamLogo team={team} size={22} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {team.name}
                </span>
                <TeamFlag team={team} style={{ fontSize: '0.8em' }} />
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: 4 }}>
                {team.abbr} · OVR {team.overallRating} · {languageName(comm)} comms
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.55, marginTop: 2 }}>
                {team.roster.map(p => p.tag).join(' · ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
