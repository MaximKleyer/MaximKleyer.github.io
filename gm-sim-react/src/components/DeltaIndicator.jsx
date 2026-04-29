/**
 * DeltaIndicator.jsx — Tiny component for showing a rating change like (+3)
 * or (-2) next to a stat number.
 *
 * Rules:
 *   - Zero delta → renders nothing (so UI stays clean when nothing changed)
 *   - Positive → green "(+N)"
 *   - Negative → red "(-N)"
 *
 * Used in the Roster, Free Agents, Dashboard, and Standings views after
 * an offseason to show which players grew/declined. The delta lives on
 * player.lastOffseasonDelta (stashed by season.js during beginNewSeason)
 * and persists until the NEXT offseason overwrites it.
 *
 * Rookies don't have a lastOffseasonDelta, so <DeltaIndicator delta={undefined}/>
 * renders nothing — which is what we want. No special "NEW" badge for now,
 * though that would be an easy follow-up if you want it.
 */

export default function DeltaIndicator({ delta, size = 'normal' }) {
  if (delta === undefined || delta === null || delta === 0) return null;

  const isPositive = delta > 0;
  const color = isPositive ? '#4ade80' : '#f87171'; // tailwind green-400 / red-400
  const sign = isPositive ? '+' : '';

  const fontSize = size === 'small' ? '0.68rem' : '0.78rem';

  return (
    <span style={{
      color,
      fontSize,
      fontWeight: 600,
      marginLeft: 4,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '-0.02em',
    }}>
      ({sign}{delta})
    </span>
  );
}
