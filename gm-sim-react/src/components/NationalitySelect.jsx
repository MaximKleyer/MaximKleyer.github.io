/**
 * NationalitySelect.jsx — Dropdown for changing a player's nationality
 * during God Mode. Renders the current flag sprite inline in the cell,
 * with a hidden overlay <select> that catches clicks and presents a
 * country-name dropdown.
 *
 * Why the overlay approach?
 *   HTML <option> elements don't render CSS sprites, so a normal styled
 *   dropdown would show plain "USA" / "South Korea" text without flags.
 *   By overlaying a transparent <select> on top of the flag sprite,
 *   users see a flag they can click, and the native OS dropdown appears
 *   showing readable country names. Ugly compromise but works everywhere.
 *
 * The country list is sorted alphabetically by display name so users
 * can scan to find what they want.
 */

import { NATIONALITIES, flagClass, nationalityName } from '../data/nationalities.js';

const SORTED_CODES = Object.keys(NATIONALITIES)
  .sort((a, b) => NATIONALITIES[a].name.localeCompare(NATIONALITIES[b].name));

export default function NationalitySelect({ value, onCommit, editable = false }) {
  // Read-only path: just the flag sprite
  if (!editable) {
    return (
      <span
        className={flagClass(value)}
        title={nationalityName(value)}
      />
    );
  }

  // Editable path: flag sprite with a transparent <select> overlay.
  // The wrapper is position:relative so the select can overlay it.
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: 2,
        border: '1px solid rgba(180, 130, 255, 0.45)',
        borderRadius: 3,
        background: 'rgba(180, 130, 255, 0.10)',
        cursor: 'pointer',
      }}
      title={`${nationalityName(value)} — click to change`}
    >
      <span className={flagClass(value)} />
      <select
        value={value || 'US'}
        onChange={e => onCommit(e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {SORTED_CODES.map(code => (
          <option key={code} value={code}>
            {NATIONALITIES[code].name}
          </option>
        ))}
      </select>
    </span>
  );
}
