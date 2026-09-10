/**
 * TeamLogo.jsx — every team gets a logo, everywhere, with no licensing
 * baggage.
 *
 * Two layers:
 *
 *   1. Optional real logo. If a file exists at public/logos/<ABBR>.png
 *      (e.g. logos/SEN.png), it is used. The folder ships empty — real
 *      org marks are trademarks, so committing them to a public repo is
 *      the OWNER'S call, made by dropping files in locally. See
 *      public/logos/README.md.
 *
 *   2. Generated crest fallback. A deterministic SVG built from the
 *      team's abbreviation and color — same team, same crest, every
 *      render, no network. This also covers the tier-2 clubs, which are
 *      fictional and have no real logo anywhere.
 *
 * Missing files are remembered per session so each abbreviation probes
 * the override at most once.
 */

import { useState } from 'react';

const noOverride = new Set();

/** Small stable hash for shape/variant selection. */
function hashOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) >>> 0;
  return h;
}

function shade(hex, factor) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#444';
  const n = parseInt(m[1], 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * factor)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Text color that reads on the team color. */
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 168 ? '#10131a' : '#ffffff';
}

const SHAPES = {
  // Each draws inside a 40x40 viewBox.
  shield: 'M20 2 L36 8 V20 C36 30 29 36 20 38 C11 36 4 30 4 20 V8 Z',
  hex: 'M20 2 L35 11 V29 L20 38 L5 29 V11 Z',
  diamond: 'M20 2 L37 20 L20 38 L3 20 Z',
  circle: null,   // rendered as <circle>
};
const SHAPE_KEYS = Object.keys(SHAPES);

function Crest({ abbr, color, size, title }) {
  const h = hashOf(abbr);
  const shapeKey = SHAPE_KEYS[h % SHAPE_KEYS.length];
  const base = color || '#5a6472';
  const dark = shade(base, 0.55);
  const ink = inkOn(base);
  const text = (abbr || '?').slice(0, 4).toUpperCase();
  const fontSize = text.length <= 2 ? 15 : text.length === 3 ? 12 : 9.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={title || abbr}
      style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle' }}
    >
      <title>{title || abbr}</title>
      {shapeKey === 'circle' ? (
        <circle cx="20" cy="20" r="18" fill={base} stroke={dark} strokeWidth="2.5" />
      ) : (
        <path d={SHAPES[shapeKey]} fill={base} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
      )}
      <text
        x="20" y="21.5"
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Rajdhani', 'Arial Narrow', sans-serif"
        fontWeight="700" fontSize={fontSize}
        letterSpacing="0.5" fill={ink}
      >{text}</text>
    </svg>
  );
}

export default function TeamLogo({ team, abbr, color, name, size = 22 }) {
  const a = abbr || team?.abbr;
  const c = color || team?.color;
  const n = name || team?.name || a;
  const [broken, setBroken] = useState(false);

  if (!a) return null;

  if (!broken && !noOverride.has(a)) {
    return (
      <img
        src={`${import.meta.env?.BASE_URL || '/'}logos/${a}.png`}
        width={size}
        height={size}
        alt={n}
        title={n}
        style={{ objectFit: 'contain', flex: 'none', verticalAlign: 'middle' }}
        onError={() => { noOverride.add(a); setBroken(true); }}
      />
    );
  }
  return <Crest abbr={a} color={c} size={size} title={n} />;
}
