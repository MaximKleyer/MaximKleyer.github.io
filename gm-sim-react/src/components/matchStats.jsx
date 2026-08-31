/**
 * matchStats.jsx — the VLR-style match presentation, shared between the
 * live viewer (which replays a round log) and the completed-match report
 * (which reads finished results).
 *
 * Two data paths feed one look:
 *   rowsFromLog    — rebuilt per round from a map's roundLog, so a live
 *                    scoreboard can update mid-map and filter by side.
 *                    Only matches the human plays persist a log.
 *   rowsFromStats  — straight from the stored playerStats; the path for
 *                    AI matches and anything already final.
 * Both end in the same row shape and the same table.
 */

import TeamLogo from './TeamLogo.jsx';

export const TYPE_GLYPH = { elim: '×', spike: '✸', defuse: '✂', time: '◷' };
export const TYPE_LABEL = {
  elim: 'elimination', spike: 'spike detonated', defuse: 'spike defused', time: 'time expired',
};

/** Deterministic per-player headshot% flavor — the sim doesn't model hitboxes. */
export function hsPercent(player) {
  let h = 0;
  const id = player?.id || '';
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  const aim = player?.aim ?? 70;
  return Math.max(8, Math.min(42, Math.round(8 + aim * 0.28 + (h % 9) - 4)));
}

/** VLR-ish rating from ACS and K/D. Calibrated so 210 ACS at 1.0 K/D ≈ 1.00. */
export function ratingOf(acs, kills, deaths) {
  const kd = kills / Math.max(1, deaths);
  return ((acs / 210) * 0.7 + Math.min(3, kd) * 0.3).toFixed(2);
}

/**
 * Cumulative per-player stats over the log's first `upTo` rounds,
 * optionally filtered to rounds where the given side attacked/defended.
 * Returns rows keyed by lineup index 0-9 (0-4 team A, 5-9 team B).
 */
export function tally(roundLog, upTo, sideFilter = 'all') {
  const rows = Array.from({ length: 10 }, () => ({
    kills: 0, deaths: 0, assists: 0, cs: 0, kastRounds: 0, fk: 0, fd: 0, rounds: 0,
  }));
  // Clamp: for one render after a new map lands, `upTo` can still hold
  // the PREVIOUS map's round count — reading past the log's end crashed
  // the whole app when the next map was shorter.
  const limit = Math.min(upTo, roundLog.length);
  for (let ri = 0; ri < limit; ri++) {
    const r = roundLog[ri];
    // Traded deaths count toward KAST — same rule as the engine's
    // derivation: a trade event immediately follows the kill it trades.
    const traded = new Set();
    for (let ei = 0; ei + 1 < r.ev.length; ei++) {
      if (r.ev[ei + 1].d === r.ev[ei].k) traded.add(r.ev[ei].d);
    }
    for (let i = 0; i < 10; i++) {
      const attacking = (i < 5 ? 'A' : 'B') === r.atk;
      if (sideFilter === 'attack' && !attacking) continue;
      if (sideFilter === 'defend' && attacking) continue;
      rows[i].rounds++;
      rows[i].cs += r.cs[i] || 0;
      let hasKA = r.survivors.includes(i) || traded.has(i);
      for (const e of r.ev) {
        if (e.k === i) { rows[i].kills++; hasKA = true; }
        if (e.d === i) rows[i].deaths++;
        if (e.a === i) { rows[i].assists++; hasKA = true; }
      }
      if (r.ev.length > 0) {
        if (r.ev[0].k === i) rows[i].fk++;
        if (r.ev[0].d === i) rows[i].fd++;
      }
      if (hasKA) rows[i].kastRounds++;
    }
  }
  return rows;
}

/** Row shape both data paths produce. Nullable stats render as —. */
function mkRow(ps, isA, players, { acs, kills, deaths, assists, kast, adr, fk, fd }) {
  return {
    id: ps.id, tag: ps.tag, teamAbbr: ps.teamAbbr, isA,
    r: ratingOf(acs, kills, deaths),
    acs, kills, deaths, assists, pm: kills - deaths,
    kast: kast ?? null,
    adr: adr ?? Math.round(acs * 0.62),
    hs: hsPercent(players?.[ps.id] || { id: ps.id }),
    fk: fk ?? null, fd: fd ?? null,
  };
}

/** Live path: rows for one team over the revealed slice of the log. */
export function rowsFromLog(map, upTo, sideFilter, players, side) {
  const log = map.roundLog || [];
  const t = tally(log, upTo, sideFilter);
  const lineup = [...map.rosterAIds, ...map.rosterBIds];
  const base = side === 'A' ? 0 : 5;
  return [0, 1, 2, 3, 4].map(i => {
    const li = base + i;
    const ps = map.playerStats[lineup[li]];
    const row = t[li];
    const rounds = Math.max(1, row.rounds);
    const acs = Math.round(row.cs / rounds);
    return mkRow(ps, side === 'A', players, {
      acs, kills: row.kills, deaths: row.deaths, assists: row.assists,
      kast: Math.round(100 * row.kastRounds / rounds),
      adr: Math.round((row.cs / rounds) * 0.62),
      fk: row.fk, fd: row.fd,
    });
  }).sort((a, b) => b.acs - a.acs);
}

/** Final path: rows straight from a finished map's stored playerStats. */
export function rowsFromStats(map, players, side) {
  const ids = side === 'A' ? map.rosterAIds : map.rosterBIds;
  return (ids || [])
    .map(id => map.playerStats?.[id])
    .filter(Boolean)
    .map(ps => mkRow(ps, side === 'A', players, {
      acs: ps.acs, kills: ps.kills, deaths: ps.deaths, assists: ps.assists,
      kast: ps.kast, fk: ps.fk, fd: ps.fd,
    }))
    .sort((a, b) => b.acs - a.acs);
}

/** Series aggregate across finished maps, for the All Maps tab. */
export function aggregateRows(maps, players, side) {
  const agg = {};
  for (const m of maps) {
    const ids = side === 'A' ? m.rosterAIds : m.rosterBIds;
    for (const id of ids || []) {
      const ps = m.playerStats?.[id];
      if (!ps) continue;
      const a = agg[id] || (agg[id] = {
        ps, kills: 0, deaths: 0, assists: 0, acsSum: 0, maps: 0,
        fk: 0, fd: 0, kastSum: 0, kastKnown: true, fkKnown: true,
      });
      a.kills += ps.kills; a.deaths += ps.deaths; a.assists += ps.assists;
      a.acsSum += ps.acs; a.maps++;
      if (typeof ps.kast === 'number') a.kastSum += ps.kast; else a.kastKnown = false;
      if (typeof ps.fk === 'number') { a.fk += ps.fk; a.fd += ps.fd || 0; } else a.fkKnown = false;
    }
  }
  return Object.values(agg)
    .map(a => mkRow(a.ps, side === 'A', players, {
      acs: Math.round(a.acsSum / a.maps),
      kills: a.kills, deaths: a.deaths, assists: a.assists,
      kast: a.kastKnown ? Math.round(a.kastSum / a.maps) : null,
      fk: a.fkKnown ? a.fk : null, fd: a.fkKnown ? a.fd : null,
    }))
    .sort((a, b) => b.acs - a.acs);
}

function num(v) {
  const color = v > 0 ? '#7ed957' : v < 0 ? '#ff5460' : 'inherit';
  return <span style={{ color, fontWeight: 600 }}>{v > 0 ? `+${v}` : v}</span>;
}
const dash = <span style={{ opacity: 0.35 }}>—</span>;

/** One team's VLR-style stat table. */
export function StatTable({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
      <thead>
        <tr style={{ fontSize: '0.62rem', letterSpacing: '0.06em', opacity: 0.55 }}>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}></th>
          <th>R</th><th>ACS</th><th>K</th><th>D</th><th>A</th><th>+/−</th>
          <th>KAST</th><th>ADR</th><th>HS%</th><th>FK</th><th>FD</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <td style={{ textAlign: 'left', padding: '6px 8px' }}>
              <strong style={{ color: row.isA ? '#6aa9ff' : '#ff8c95' }}>{row.tag}</strong>
              <span style={{ opacity: 0.45, marginLeft: 8, fontSize: '0.85em' }}>{row.teamAbbr}</span>
            </td>
            <td style={{ textAlign: 'center' }}>{row.r}</td>
            <td style={{ textAlign: 'center' }}>{row.acs}</td>
            <td style={{ textAlign: 'center' }}>{row.kills}</td>
            <td style={{ textAlign: 'center', opacity: 0.8 }}>{row.deaths}</td>
            <td style={{ textAlign: 'center', opacity: 0.8 }}>{row.assists}</td>
            <td style={{ textAlign: 'center' }}>{num(row.pm)}</td>
            <td style={{ textAlign: 'center' }}>{row.kast == null ? dash : `${row.kast}%`}</td>
            <td style={{ textAlign: 'center' }}>{row.adr}</td>
            <td style={{ textAlign: 'center', opacity: 0.75 }}>{row.hs}%</td>
            <td style={{ textAlign: 'center' }}>{row.fk == null ? dash : row.fk}</td>
            <td style={{ textAlign: 'center' }}>{row.fd == null ? dash : row.fd}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The two-row round strip: one row per team, win squares with type glyphs. */
export function RoundStrip({ map, upTo, abbrA, abbrB }) {
  const log = map.roundLog || [];
  const shown = Math.min(upTo, log.length);
  const squares = side => log.slice(0, shown).map((r, i) => {
    const won = r.w === side;
    const attacking = r.atk === side;
    return (
      <span
        key={i}
        title={`Round ${i + 1} — ${won ? 'won' : 'lost'} (${TYPE_LABEL[r.t] || r.t})`}
        style={{
          width: 17, height: 17, borderRadius: 3, flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.62rem', fontWeight: 700,
          marginLeft: i === 12 ? 10 : 0,
          background: won
            ? (attacking ? 'rgba(255,70,85,0.85)' : 'rgba(64,168,120,0.85)')
            : 'rgba(255,255,255,0.05)',
          color: won ? '#fff' : 'transparent',
        }}
      >{TYPE_GLYPH[r.t] || '×'}</span>
    );
  });

  return (
    <div style={{ display: 'grid', gap: 4, margin: '12px 0' }}>
      {[['A', abbrA], ['B', abbrB]].map(([side, abbr]) => (
        <div key={side} style={{ display: 'flex', gap: 3, alignItems: 'center', overflowX: 'auto' }}>
          <span style={{ width: 64, flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', opacity: 0.85, fontFamily: "'JetBrains Mono', monospace" }}>
            <TeamLogo abbr={abbr} color={side === 'A' ? '#6aa9ff' : '#ff8c95'} size={14} />{abbr}
          </span>
          {squares(side)}
        </div>
      ))}
      <div style={{ fontSize: '0.6rem', opacity: 0.45 }}>
        <span style={{ color: 'rgba(255,70,85,0.95)' }}>■</span> attack round win&nbsp;&nbsp;
        <span style={{ color: 'rgba(64,168,120,0.95)' }}>■</span> defense round win&nbsp;&nbsp;
        × elim · ✸ spike · ✂ defuse · ◷ time
      </div>
    </div>
  );
}

/** Aim lookup so HS% flavor tracks the live roster where possible. */
export function buildPlayersMap(maps, teamA, teamB) {
  const players = {};
  for (const m of maps) {
    for (const id of [...(m.rosterAIds || []), ...(m.rosterBIds || [])]) {
      players[id] = { id, aim: undefined };
    }
  }
  for (const t of [teamA, teamB]) {
    for (const p of t?.roster || []) if (players[p.id]) players[p.id] = { id: p.id, aim: p.ratings?.aim };
  }
  return players;
}
