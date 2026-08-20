/**
 * swissFormat.js — generic Swiss stage.
 *
 * Parameterised by wins-to-qualify / losses-to-eliminate / max rounds, so
 * one implementation covers the tier-2 stage (16 teams, 4W/4L, ≤7 rounds)
 * and could later replace the hardcoded 8-team engine in swiss.js.
 *
 * ── Pairing ──
 * Teams are grouped by identical W-L record, strongest record first, and
 * paired within their group. Two constraints shape it:
 *
 *   Rematches are avoided. A pair that has already met is only accepted
 *   when no alternative pairing exists for that group.
 *
 *   Odd groups FLOAT. A 16-team Swiss to 4W/4L does not stay evenly
 *   divisible: by round 6 the live records are 3-2 and 2-3 with five
 *   teams each. The lowest-ranked team in an odd group drops into the
 *   next group down, which is what real Swiss stages do and what makes
 *   the bracket resolve to exactly 8 qualifiers in 7 rounds. Without
 *   floats the stage deadlocks on an unpairable group.
 *
 * Byes are never issued. With an even field and floats, every live team
 * is pairable every round.
 *
 * ── State ──
 * Plain data plus live Team refs in `entries[].team`. Everything else is
 * indices and counters, so an in-progress stage survives save/load via
 * the normal team-reference machinery in persistence.js.
 */

/** Ranking within a record group: round diff, then map diff, then seed. */
function tiebreak(a, b) {
  const rd = (b.roundWins - b.roundLosses) - (a.roundWins - a.roundLosses);
  if (rd !== 0) return rd;
  const md = (b.mapWins - b.mapLosses) - (a.mapWins - a.mapLosses);
  if (md !== 0) return md;
  return a.seed - b.seed;
}

export function initSwissStage(teams, {
  winsToQualify = 4,
  lossesToEliminate = 4,
  maxRounds = 7,
  bestOf = 3,
} = {}) {
  return {
    config: { winsToQualify, lossesToEliminate, maxRounds, bestOf },
    entries: teams.map((team, i) => ({
      id: i,
      seed: i + 1,
      team,
      wins: 0,
      losses: 0,
      mapWins: 0,
      mapLosses: 0,
      roundWins: 0,
      roundLosses: 0,
      opponents: [],      // entry ids already faced
    })),
    round: 0,             // rounds completed
    rounds: [],           // [{ round, matches: [{ aId, bId, floated, result }] }]
    status: 'pending',    // 'pending' | 'in-progress' | 'complete'
  };
}

export function isQualified(state, e) {
  return e.wins >= state.config.winsToQualify;
}

export function isEliminated(state, e) {
  return e.losses >= state.config.lossesToEliminate;
}

export function isLive(state, e) {
  return !isQualified(state, e) && !isEliminated(state, e);
}

export function liveEntries(state) {
  return state.entries.filter(e => isLive(state, e));
}

export function isSwissComplete(state) {
  return liveEntries(state).length === 0 || state.round >= state.config.maxRounds;
}

/**
 * Qualified teams, ordered for bracket seeding: fewest losses first, then
 * the usual tiebreaks. Seed 1 is the cleanest record.
 */
export function getQualifiedSeeds(state) {
  return state.entries
    .filter(e => isQualified(state, e))
    .sort((a, b) => (a.losses - b.losses) || tiebreak(a, b))
    .map(e => e.team);
}

export function getEliminatedTeams(state) {
  return state.entries.filter(e => isEliminated(state, e)).map(e => e.team);
}

/** Standings for the UI: every team, best record first. */
export function getSwissStandings(state) {
  return [...state.entries]
    .sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses) || tiebreak(a, b))
    .map(e => ({
      team: e.team,
      wins: e.wins,
      losses: e.losses,
      roundWins: e.roundWins,
      roundLosses: e.roundLosses,
      roundDiff: e.roundWins - e.roundLosses,
      qualified: isQualified(state, e),
      eliminated: isEliminated(state, e),
    }));
}

/**
 * Build the next round's pairings without playing them.
 * Returns [{ aId, bId, floated }], or [] when the stage is over.
 */
export function buildNextRound(state) {
  if (isSwissComplete(state)) return [];

  // Group live entries by record, strongest first.
  const byRecord = new Map();
  for (const e of liveEntries(state)) {
    const key = `${e.wins}-${e.losses}`;
    if (!byRecord.has(key)) byRecord.set(key, []);
    byRecord.get(key).push(e);
  }
  const groups = [...byRecord.entries()]
    .sort((x, y) => {
      const [xw, xl] = x[0].split('-').map(Number);
      const [yw, yl] = y[0].split('-').map(Number);
      return (yw - xw) || (xl - yl);
    })
    .map(([, list]) => list.sort(tiebreak));

  const matches = [];
  let floater = null;

  for (let g = 0; g < groups.length; g++) {
    // A team floated down from the group above joins at the top of this
    // one — it has the better record of anyone here.
    const pool = floater ? [floater, ...groups[g]] : [...groups[g]];
    const floatedIds = floater ? new Set([floater.id]) : new Set();
    floater = null;

    if (pool.length % 2 === 1) {
      if (g === groups.length - 1) {
        // Nowhere left to float. Only reachable if the live field is odd,
        // which this format never produces — surface it rather than
        // silently issuing a bye.
        throw new Error(
          `swissFormat: unpairable odd group at ${pool[0].wins}-${pool[0].losses} ` +
          `with no lower group to float into (${pool.length} teams)`);
      }
      // Send the weakest team down to meet the next record group.
      floater = pool.pop();
    }

    for (const m of pairGroup(pool, floatedIds)) matches.push(m);
  }

  // A leftover floater means the live field was odd — impossible for an
  // even bracket, so fail loudly rather than dropping a team.
  if (floater) {
    throw new Error('swissFormat: a team was left unpaired after the final group');
  }
  return matches;
}

/**
 * Pair one even-sized list without rematches.
 *
 * Greedy "strongest takes strongest legal opponent" is not enough: it can
 * consume the only legal partner for a team it has not reached yet and
 * force a rematch at the tail. Measured at ~4% of all pairings. So this
 * searches for a complete rematch-free matching by backtracking, keeping
 * the greedy preference as the exploration order so the result still
 * pairs strong with strong.
 *
 * Groups are small (at most 8 once records spread out, and round one has
 * no history to violate), so the search space is trivial.
 */
function pairGroup(list, floatedIds) {
  const matching = findMatching(list) || greedyWithRematches(list);
  return matching.map(([a, b]) => ({
    aId: a.id,
    bId: b.id,
    floated: floatedIds.has(a.id) || floatedIds.has(b.id),
    result: null,
  }));
}

/** Complete rematch-free matching, or null if none exists. */
function findMatching(list) {
  if (list.length === 0) return [];
  const [a, ...rest] = list;
  for (let i = 0; i < rest.length; i++) {
    const b = rest[i];
    if (a.opponents.includes(b.id)) continue;
    const sub = findMatching(rest.filter((_, j) => j !== i));
    if (sub) return [[a, b], ...sub];
  }
  return null;
}

/**
 * Fallback when every complete matching contains a rematch — possible in
 * late rounds of a small group. Pairs greedily, which minimises how many
 * rematches appear without another exhaustive search.
 */
function greedyWithRematches(list) {
  const pool = [...list];
  const out = [];
  while (pool.length > 1) {
    const a = pool.shift();
    let idx = pool.findIndex(b => !a.opponents.includes(b.id));
    if (idx === -1) idx = 0;
    out.push([a, pool.splice(idx, 1)[0]]);
  }
  return out;
}

/**
 * Record a played match. `mapsA`/`mapsB` are map wins; `roundsA`/`roundsB`
 * are total rounds across the series, used for the RD tiebreak column.
 */
export function recordResult(state, match, { winnerId, mapsA, mapsB, roundsA, roundsB }) {
  const a = state.entries[match.aId];
  const b = state.entries[match.bId];
  const aWon = winnerId === a.id;

  (aWon ? a : b).wins++;
  (aWon ? b : a).losses++;

  a.mapWins += mapsA; a.mapLosses += mapsB;
  b.mapWins += mapsB; b.mapLosses += mapsA;
  a.roundWins += roundsA; a.roundLosses += roundsB;
  b.roundWins += roundsB; b.roundLosses += roundsA;

  a.opponents.push(b.id);
  b.opponents.push(a.id);
  match.result = { winnerId, mapsA, mapsB, roundsA, roundsB };
}

/** Append a built round to the state and mark it in progress. */
export function pushRound(state, matches) {
  state.rounds.push({ round: state.round + 1, matches });
  state.round++;
  state.status = 'in-progress';
  return state.rounds[state.rounds.length - 1];
}

export function finalizeSwiss(state) {
  if (isSwissComplete(state)) state.status = 'complete';
  return state;
}
