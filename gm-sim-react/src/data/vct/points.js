/**
 * points.js — Championship points, the spine of the VCT 2027 season.
 *
 * Every regional event (Kickoff, Cup 1, Cup 2) and every Masters pays
 * points by placement. Champions seeding at season's end is the top 4
 * of each region's points table — which is exactly how a non-partner
 * team that keeps qualifying can out-earn a floundering partner, the
 * article's headline promise.
 *
 * Regional events are 16 teams (Swiss to 8, then double-elim):
 *   champion / runner-up / semifinals (3rd-4th) / bracket (5th-8th) /
 *   eliminated in Swiss.
 * Masters is 8 teams (double-elim), so no Swiss tier.
 */

export const CUP_POINTS = {
  champion: 10,
  runnerUp: 8,
  top4: 6,
  top8: 4,      // made the bracket, out in round one
  swiss: 1,     // eliminated in the Swiss
};

export const MASTERS_POINTS = {
  champion: 12,
  runnerUp: 9,
  top4: 6,
  top8: 3,      // out in the first bracket round
};

/** How many teams each region sends to a Masters (event top-2). */
export const MASTERS_SLOTS_PER_REGION = 2;

/** How many teams each region sends to Champions (points top-4). */
export const CHAMPIONS_SLOTS_PER_REGION = 4;
