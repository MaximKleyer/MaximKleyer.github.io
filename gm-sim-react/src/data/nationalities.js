/**
 * nationalities.js — Player nationality pool + flag emoji lookup.
 *
 * Each region has a weighted pool of nationalities (weights implied by
 * repetition in the array). When a player is generated for a region,
 * their nationality is randomly picked from the pool, so regional rosters
 * feel flavored but still have occasional international mix.
 *
 * Nationalities are stored on Player as ISO 3166-1 alpha-2 codes (e.g.
 * 'US', 'KR') and resolved to { name, flag } at display time.
 *
 * Flags are Unicode regional indicator symbols which render as country
 * flag emojis on all modern systems. Safe to use inline in text/tables.
 */

export const NATIONALITIES = {
  // Americas
  US: { name: 'USA',         flag: '🇺🇸' },
  CA: { name: 'Canada',      flag: '🇨🇦' },
  BR: { name: 'Brazil',      flag: '🇧🇷' },
  MX: { name: 'Mexico',      flag: '🇲🇽' },
  AR: { name: 'Argentina',   flag: '🇦🇷' },
  CL: { name: 'Chile',       flag: '🇨🇱' },
  PE: { name: 'Peru',        flag: '🇵🇪' },
  CO: { name: 'Colombia',    flag: '🇨🇴' },

  // EMEA
  GB: { name: 'UK',          flag: '🇬🇧' },
  FR: { name: 'France',      flag: '🇫🇷' },
  DE: { name: 'Germany',     flag: '🇩🇪' },
  SE: { name: 'Sweden',      flag: '🇸🇪' },
  ES: { name: 'Spain',       flag: '🇪🇸' },
  TR: { name: 'Turkey',      flag: '🇹🇷' },
  PL: { name: 'Poland',      flag: '🇵🇱' },
  FI: { name: 'Finland',     flag: '🇫🇮' },
  DK: { name: 'Denmark',     flag: '🇩🇰' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  RU: { name: 'Russia',      flag: '🇷🇺' },
  UA: { name: 'Ukraine',     flag: '🇺🇦' },
  PT: { name: 'Portugal',    flag: '🇵🇹' },
  IT: { name: 'Italy',       flag: '🇮🇹' },
  NO: { name: 'Norway',      flag: '🇳🇴' },
  MA: { name: 'Morocco',     flag: '🇲🇦' },
  EG: { name: 'Egypt',       flag: '🇪🇬' },
  SA: { name: 'Saudi Arabia',flag: '🇸🇦' },

  // Pacific
  KR: { name: 'S. Korea',    flag: '🇰🇷' },
  JP: { name: 'Japan',       flag: '🇯🇵' },
  TH: { name: 'Thailand',    flag: '🇹🇭' },
  VN: { name: 'Vietnam',     flag: '🇻🇳' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  ID: { name: 'Indonesia',   flag: '🇮🇩' },
  AU: { name: 'Australia',   flag: '🇦🇺' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  MY: { name: 'Malaysia',    flag: '🇲🇾' },
  SG: { name: 'Singapore',   flag: '🇸🇬' },

  // China region
  CN: { name: 'China',       flag: '🇨🇳' },
  HK: { name: 'Hong Kong',   flag: '🇭🇰' },
  TW: { name: 'Taiwan',      flag: '🇹🇼' },
};

/**
 * Weighted random pools per region. Duplication = higher weight.
 * The home region of each league is most common but not dominant, so
 * rosters mix a handful of nationalities per team for flavor.
 */
export const REGION_NATIONALITY_POOL = {
  americas: [
    'US','US','US','US','US',
    'CA','CA',
    'BR','BR','BR','BR',
    'MX','MX',
    'AR','AR',
    'CL','PE','CO',
  ],
  emea: [
    'GB','GB','FR','FR','DE','DE','SE','SE',
    'ES','TR','TR','PL','FI','DK','NL','NL',
    'RU','RU','UA','PT','IT','NO',
    'MA','EG','SA',
  ],
  pacific: [
    'KR','KR','KR','KR','KR',
    'JP','JP','JP',
    'TH','TH','VN','PH','PH','ID','ID',
    'AU','AU','NZ',
    'MY','SG',
  ],
  china: [
    'CN','CN','CN','CN','CN','CN','CN','CN',
    'HK','HK','TW','TW',
  ],
};

/**
 * Pick a random nationality code for a given region.
 */
export function randomNationalityForRegion(regionKey) {
  const pool = REGION_NATIONALITY_POOL[regionKey] || ['US'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * CSS class name for the flag-icons library (see https://github.com/lipis/flag-icons).
 * Returns e.g. "fi fi-us" for code "US", suitable for:
 *   <span className={flagClass(player.nationality)} />
 *
 * flag-icons ships SVG/PNG flag sprites via CSS and works fully offline once
 * bundled. The library must be installed (`npm install flag-icons`) and its
 * stylesheet imported once at the app root:
 *   import 'flag-icons/css/flag-icons.min.css';
 *
 * Used by every table that shows a player flag. For contexts where HTML can't
 * be injected (e.g. <option> elements), use nationalityName() instead and
 * display the country name as text.
 */
export function flagClass(code) {
  if (!code) return 'fi';
  return `fi fi-${code.toLowerCase()}`;
}

/**
 * Lookup helper: get the Unicode flag emoji for a country code.
 * Kept for text-only contexts where CSS sprites can't render (e.g. <option>
 * elements). On Windows this falls back to showing the two-letter code
 * instead of the flag — use nationalityName() or a flagClass span where
 * possible for proper cross-platform rendering.
 */
export function flagFor(code) {
  return NATIONALITIES[code]?.flag || '🏳️';
}

/**
 * Lookup helper: get the country display name for a code.
 */
export function nationalityName(code) {
  return NATIONALITIES[code]?.name || code || '—';
}
