/**
 * placements.js — Compute 1–12 placements for a region at any moment.
 *
 * Used by:
 *   - Bracket.jsx standings panel (live, updates as teams get eliminated)
 *   - Points.jsx (for displaying where teams currently sit)
 *   - season.js completeCurrentStage (final snapshot for history + points)
 *
 * Placement states:
 *   - FINAL:  concrete 1–12 number, team is locked into that finish
 *   - ALIVE:  team is still playing in the bracket; placement shown as the
 *             best rank they can still achieve (e.g. 'Top 4')
 *   - GROUP:  bracket hasn't started yet; placement is current group-stage rank
 *
 * Elimination order from the double-elim bracket (see engine/bracket.js):
 *   Stage 2 complete → LB R1 losers eliminated → positions 7–8
 *   Stage 3 complete → LB QF losers eliminated → positions 5–6
 *   Stage 4 complete → LB SF loser eliminated  → position 4
 *   Stage 5 complete → LB Final loser eliminated → position 3
 *   Stage 6 complete → GF loser eliminated → position 2, winner → position 1
 *
 * Non-playoff group teams (groupA[4–5] + groupB[4–5]) fill 9–12 using their
 * frozen group standings the moment the bracket is generated.
 */

/** Sort teams within a group by wins → map diff → round diff → overall. */
function groupSortCompare(a, b) {
  if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
  const mdB = b.record.mapWins - b.record.mapLosses;
  const mdA = a.record.mapWins - a.record.mapLosses;
  if (mdB !== mdA) return mdB - mdA;
  const rdB = (b.record.roundWins || 0) - (b.record.roundLosses || 0);
  const rdA = (a.record.roundWins || 0) - (a.record.roundLosses || 0);
  if (rdB !== rdA) return rdB - rdA;
  return b.overallRating - a.overallRating;
}

/**
 * Live placements for an entire region. Always returns all 12 teams.
 * Each entry: { team, state, placement, label, sort }
 *
 *   state:     'final' | 'alive' | 'group'
 *   placement: number (1–12) — concrete finish when state === 'final',
 *              otherwise the best-case finish the team can still reach
 *   label:     short display string ("1st", "T-5th", "Alive · Top 4", ...)
 *   sort:      numeric used to order the standings panel top-to-bottom
 */
export function computeLivePlacements(region) {
  const teams = region.teams;
  const bracket = region.bracket;

  // ── Case A: group stage, no bracket yet ──
  if (!bracket) {
    return computeGroupStagePlacements(teams);
  }

  // ── Case B: bracket exists — mix of final + alive + group-locked 9-12 ──
  return computeBracketPlacements(region);
}

/**
 * Group stage: rank all 12 teams by group W/L within their own group,
 * then interleave A1/B1/A2/B2/... so the panel shows an overall 1–12 order.
 */
function computeGroupStagePlacements(teams) {
  const groupA = teams.filter(t => t.group === 'A').sort(groupSortCompare);
  const groupB = teams.filter(t => t.group === 'B').sort(groupSortCompare);

  const out = [];
  for (let i = 0; i < Math.max(groupA.length, groupB.length); i++) {
    if (groupA[i]) out.push(groupEntry(groupA[i], 'A', i + 1));
    if (groupB[i]) out.push(groupEntry(groupB[i], 'B', i + 1));
  }
  // Assign sequential sort positions (1..12) for display.
  out.forEach((e, i) => { e.sort = i + 1; });
  return out;
}

function groupEntry(team, groupLetter, groupRank) {
  return {
    team,
    state: 'group',
    placement: null,
    label: `${groupLetter}${groupRank}`,
    sort: 0,
    record: `${team.record.wins}-${team.record.losses}`,
  };
}

/**
 * Bracket stage: blend bracket elimination order + frozen 9–12 + alive teams.
 *
 * The double-elim bracket engine eliminates teams in a fixed order relative
 * to the elimination index. We map that index → concrete placement:
 *
 *   eliminated[0], [1] — LB Round 1 losers     → 7th, 8th
 *   eliminated[2], [3] — LB Quarterfinal losers → 5th, 6th
 *   eliminated[4]      — LB Semifinal loser     → 4th
 *   eliminated[5]      — LB Final loser         → 3rd
 *   eliminated[6]      — Grand Final loser      → 2nd
 *   grandFinal.winner  — Champion               → 1st
 *
 * Non-playoff teams fill 9–12 from frozen group standings.
 * Alive teams fill the contiguous top block of unclaimed positions {1..N},
 * where N = number of alive teams (since eliminations always claim from
 * the bottom of the playoff range upward).
 */
const ELIM_INDEX_TO_PLACEMENT = [7, 8, 5, 6, 4, 3, 2];

function computeBracketPlacements(region) {
  const bracket = region.bracket;
  const teams = region.teams;

  const finalized = []; // [{ team, placement }]
  const inBracketTeams = new Set();

  // Gather all bracket participants (top 8)
  const seedSlots = [
    ...(bracket.ubQF || []), ...(bracket.ubSF || []),
    ...(bracket.lbR1 || []),
  ];
  for (const m of seedSlots) {
    if (m?.teamA) inBracketTeams.add(m.teamA);
    if (m?.teamB) inBracketTeams.add(m.teamB);
  }

  // Champion (1st place) if grand final has resolved
  const champion = bracket.grandFinal?.result?.winner || null;
  if (champion) {
    finalized.push({ team: champion, placement: 1 });
  }

  // Map eliminated teams to concrete placements by their elimination index.
  const elim = bracket.eliminated || [];
  for (let i = 0; i < elim.length; i++) {
    const team = elim[i];
    if (!team || team === champion) continue;
    const placement = ELIM_INDEX_TO_PLACEMENT[i];
    if (placement != null) {
      finalized.push({ team, placement });
    }
  }

  const finalizedSet = new Set(finalized.map(e => e.team));

  // Alive teams = bracket participants not yet finalized.
  const alive = [];
  for (const team of inBracketTeams) {
    if (!finalizedSet.has(team)) alive.push(team);
  }

  // Alive teams occupy the contiguous top block {1..alive.length}.
  // Best case = 1st, worst case = alive.length.
  const aliveBestCase = 1;
  const aliveWorstCase = alive.length;

  // Non-playoff teams fill 9–12 from frozen standings
  const nonPlayoff = teams.filter(t => !inBracketTeams.has(t));
  const frozen = region.frozenStandings;
  let nonPlayoffSorted;
  if (frozen) {
    const rankFor = (team) => {
      const grp = frozen[team.group] || [];
      const idx = grp.findIndex(c => c.abbr === team.abbr);
      return idx >= 0 ? idx : 999;
    };
    nonPlayoffSorted = [...nonPlayoff].sort((a, b) => {
      const ra = rankFor(a), rb = rankFor(b);
      if (ra !== rb) return ra - rb;
      if (a.group !== b.group) return a.group === 'A' ? -1 : 1;
      return 0;
    });
  } else {
    nonPlayoffSorted = [...nonPlayoff].sort(groupSortCompare);
  }

  // Assemble output in display order (top to bottom)
  const out = [];

  for (const { team, placement } of finalized) {
    out.push({
      team,
      state: 'final',
      placement,
      label: ordinal(placement),
      sort: placement,
      record: `${team.record.wins}-${team.record.losses}`,
    });
  }

  // Alive cluster sits between the champion (if any) and the earliest
  // eliminated placement. Sort alive teams by current bracket depth
  // (heuristic: more wins = deeper in bracket).
  const aliveSorted = [...alive].sort((a, b) => b.record.wins - a.record.wins);
  for (let i = 0; i < aliveSorted.length; i++) {
    const team = aliveSorted[i];
    out.push({
      team,
      state: 'alive',
      placement: aliveBestCase,
      label: aliveWorstCase === 1 ? 'Alive' : `Alive · Top ${aliveWorstCase}`,
      // Sort between champion (1) and first finalized-non-champion placement.
      // Use 1.5 + tiny offset so they cluster between 1 and the next finalized.
      sort: 1.5 + i * 0.01,
      record: `${team.record.wins}-${team.record.losses}`,
    });
  }

  // 9–12 locked non-playoff
  let npPlace = 9;
  for (const team of nonPlayoffSorted) {
    out.push({
      team,
      state: 'final',
      placement: npPlace,
      label: ordinal(npPlace),
      sort: npPlace,
      record: `${team.record.wins}-${team.record.losses}`,
    });
    npPlace++;
  }

  out.sort((a, b) => a.sort - b.sort);
  return out;
}

/**
 * Final placements only — used by season.js at stage completion to compute
 * point awards. Returns [{ team, placement }] for all 12 teams, assuming the
 * bracket is fully resolved (stage 7). If the bracket is not complete this
 * still works but alive teams are not included in the output.
 */
export function computeFinalStagePlacements(region) {
  const live = computeLivePlacements(region);
  return live
    .filter(e => e.state === 'final')
    .map(e => ({ team: e.team, placement: e.placement }));
}

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
