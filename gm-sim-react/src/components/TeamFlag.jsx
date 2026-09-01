/**
 * TeamFlag.jsx — the flag a team flies, derived from its players.
 *
 * A strict majority nationality among the starting five shows that
 * country's flag; a roster with no majority is an international team and
 * shows a globe instead (there is no real-world "mixed" flag to use).
 * The tooltip always carries the full nationality split so the mark is
 * explainable at a glance.
 */

import { flagClass, nationalityName, teamNationality } from '../data/nationalities.js';

export default function TeamFlag({ team, style = {} }) {
  const { code, mixed, counts } = teamNationality(team);
  if (!code && !mixed) return null;

  const split = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${nationalityName(c)} ×${n}`)
    .join(', ');

  if (mixed) {
    return (
      <span
        title={`International — no majority nationality (${split})`}
        style={{ fontSize: '0.9em', lineHeight: 1, verticalAlign: 'middle', ...style }}
      >🌐</span>
    );
  }
  return (
    <span
      className={flagClass(code)}
      title={`${nationalityName(code)} team (${split})`}
      style={{ verticalAlign: 'middle', ...style }}
    />
  );
}
