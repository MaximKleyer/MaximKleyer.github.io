/**
 * openOrgs.js — the open scene's organizations.
 *
 * Each sub-region's 32-team qualifier field mixes two kinds of club:
 *
 *   SEEDED ORGS — a curated handful of established organizations per
 *   scene (fictional, scene-flavored). These anchor the qualifier the
 *   way real open brackets always have a few names everyone knows.
 *
 *   GENERATED CLUBS — the rest of the field, built from scene-neutral
 *   word banks with collision-checked abbreviations and colors. These
 *   are the anonymous grinders any open bracket is mostly made of.
 *
 * All names here are inventions — no real org marks (see TeamLogo.jsx
 * for why that matters in a public repo).
 */

export const SEEDED_ORGS = {
  na: [
    { name: 'Meteor Eighty',      abbr: 'M80X', color: '#f2c400' },
    { name: 'Oxide Esports',      abbr: 'OXE',  color: '#00c2a8' },
    { name: 'Masked Raccoons',    abbr: 'MRAC', color: '#7a5cff' },
    { name: 'Undisguised',        abbr: 'UDSG', color: '#e85d9e' },
    { name: 'Homefield Five',     abbr: 'HF5',  color: '#4a90d9' },
    { name: 'Rustbelt Gaming',    abbr: 'RBG',  color: '#c0392b' },
  ],
  latam: [
    { name: 'Cóndor Club',        abbr: 'CNDR', color: '#8e44ad' },
    { name: 'Nueve Colas',        abbr: '9C',   color: '#e67e22' },
    { name: 'Austral Kings',      abbr: 'AUK',  color: '#2980b9' },
    { name: 'Fuego Andino',       abbr: 'FAND', color: '#d35400' },
    { name: 'Pampa Squad',        abbr: 'PMP',  color: '#27ae60' },
    { name: 'Selva Nueve',        abbr: 'SLV9', color: '#16a085' },
  ],
  br: [
    { name: 'Verde Amarela',      abbr: 'VAM',  color: '#f1c40f' },
    { name: 'Capivara Clube',     abbr: 'CAPI', color: '#795548' },
    { name: 'Onda Carioca',       abbr: 'ONDA', color: '#03a9f4' },
    { name: 'Sereia Esports',     abbr: 'SRIA', color: '#009688' },
    { name: 'Favela Kings',       abbr: 'FVK',  color: '#ff5722' },
    { name: 'Paulista Prime',     abbr: 'PPR',  color: '#607d8b' },
  ],
  eu: [
    { name: 'Aurora Borealis',    abbr: 'AUB',  color: '#22d3ee' },
    { name: 'Case Closed',        abbr: 'CASE', color: '#2b9348' },
    { name: 'Les Souris',         abbr: 'SOUR', color: '#f4a261' },
    { name: 'Diamant Rouge',      abbr: 'DIAR', color: '#00b4d8' },
    { name: 'Iron Wolves',        abbr: 'IRW',  color: '#6b7280' },
    { name: 'Scarlet Empire',     abbr: 'SCE',  color: '#b91c1c' },
  ],
  mena: [
    { name: 'Desert Falcons',     abbr: 'DFAL', color: '#d4a017' },
    { name: 'Nile Vipers',        abbr: 'NILE', color: '#1e824c' },
    { name: 'Atlas Lions',        abbr: 'ATLS', color: '#c0392b' },
    { name: 'Oasis Club',         abbr: 'OAS',  color: '#3498db' },
    { name: 'Sandstorm Five',     abbr: 'SND5', color: '#e0ac69' },
    { name: 'Crescent Guard',     abbr: 'CRG',  color: '#8e6c2f' },
  ],
  tr: [
    { name: 'Anadolu Aslanları',  abbr: 'ANA',  color: '#e30a17' },
    { name: 'Bosphorus Club',     abbr: 'BOS',  color: '#1c6dd0' },
    { name: 'Galata Guard',       abbr: 'GLT',  color: '#f39c12' },
    { name: 'Kapadokya Five',     abbr: 'KAP5', color: '#9b59b6' },
    { name: 'İstanbul Wolves',    abbr: 'IWLV', color: '#34495e' },
    { name: 'Ege Espor',          abbr: 'EGE',  color: '#16a085' },
  ],
  kr: [
    { name: 'Haeundae Tigers',    abbr: 'HDT',  color: '#e2012d' },
    { name: 'Gangnam Guard',      abbr: 'GNG',  color: '#2a68a2' },
    { name: 'Cheonan Rush',       abbr: 'CNR',  color: '#cba135' },
    { name: 'Busan Breakers',     abbr: 'BSB',  color: '#00a8cc' },
    { name: 'Sinchon Spectre',    abbr: 'SSP',  color: '#7f8fa6' },
    { name: 'Daejeon Dynasty',    abbr: 'DJD',  color: '#8c7ae6' },
  ],
  jp: [
    { name: 'Sakura Blades',      abbr: 'SKB',  color: '#ffb7c5' },
    { name: 'Shibuya Crossing',   abbr: 'SBY',  color: '#404072' },
    { name: 'Raijin Gaming',      abbr: 'RAI',  color: '#f6b93b' },
    { name: 'Osaka Onslaught',    abbr: 'OSK',  color: '#eb2f06' },
    { name: 'Kitsune Klan',       abbr: 'KTS',  color: '#fa983a' },
    { name: 'Nippon Nova',        abbr: 'NPN',  color: '#38ada9' },
  ],
  sea: [
    { name: 'Archipelago Aces',   abbr: 'ARCH', color: '#f59e0b' },
    { name: 'Mekong Monitors',    abbr: 'MKM',  color: '#0ea5e9' },
    { name: 'Jakarta Juggernaut', abbr: 'JKT',  color: '#ef4444' },
    { name: 'Manila Mayhem',      abbr: 'MNL',  color: '#14b8a6' },
    { name: 'Merlion Guard',      abbr: 'MLG',  color: '#a855f7' },
    { name: 'Siam Serpents',      abbr: 'SIAM', color: '#eab308' },
  ],
  sas: [
    { name: 'Mumbai Monarchs',    abbr: 'MUM',  color: '#ff471a' },
    { name: 'Delhi Dominion',     abbr: 'DEL',  color: '#1e90ff' },
    { name: 'Bengaluru Blitz',    abbr: 'BLR',  color: '#e74c3c' },
    { name: 'Karachi Kings VLR',  abbr: 'KHI',  color: '#01411c' },
    { name: 'Himalayan Peak',     abbr: 'HIM',  color: '#95a5a6' },
    { name: 'Chennai Chargers',   abbr: 'CHE',  color: '#f1c40f' },
  ],
  cn: [
    { name: 'Shanghai Sirens',    abbr: 'SHS',  color: '#dc2626' },
    { name: 'Chengdu Pandas',     abbr: 'CDP',  color: '#404040' },
    { name: 'Hangzhou Harbor',    abbr: 'HZH',  color: '#0891b2' },
    { name: 'Shenzhen Surge',     abbr: 'SZS',  color: '#7c3aed' },
    { name: 'Beijing Bastion',    abbr: 'BJB',  color: '#b45309' },
    { name: 'Guangzhou Ghosts',   abbr: 'GZG',  color: '#64748b' },
  ],
};

/* ─────────────── Generated clubs ─────────────── */

const CLUB_PREFIXES = [
  'Crimson', 'Shadow', 'Iron', 'Golden', 'Silent', 'Rogue', 'Neon', 'Frost',
  'Ember', 'Storm', 'Night', 'Solar', 'Lunar', 'Rapid', 'Static', 'Venom',
  'Phantom', 'Savage', 'Mystic', 'Turbo', 'Alpha', 'Omega', 'Prime', 'Nova',
  'Void', 'Zenith', 'Apex', 'Feral', 'Grim', 'Hollow', 'Radiant', 'Obsidian',
];
const CLUB_NOUNS = [
  'Vipers', 'Ravens', 'Titans', 'Wraiths', 'Falcons', 'Sharks', 'Wolves',
  'Drakes', 'Cobras', 'Lynx', 'Herons', 'Jackals', 'Mantis', 'Golems',
  'Reapers', 'Sentries', 'Nomads', 'Corsairs', 'Vanguards', 'Outlaws',
  'Spectres', 'Raiders', 'Krakens', 'Phoenix', 'Panthers', 'Griffins',
  'Vultures', 'Stingers', 'Bandits', 'Warlocks', 'Pilots', 'Rangers',
];

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate club definitions to fill a qualifier field, avoiding every
 * name/abbr already taken (seeded orgs, partners, other sub-regions —
 * pass them all in `taken`). Mutates nothing; returns fresh defs.
 */
export function generateClubDefs(count, taken) {
  const defs = [];
  let guard = 0;
  while (defs.length < count && guard++ < count * 60) {
    const name = `${CLUB_PREFIXES[Math.floor(Math.random() * CLUB_PREFIXES.length)]} ` +
                 `${CLUB_NOUNS[Math.floor(Math.random() * CLUB_NOUNS.length)]}`;
    if (taken.names.has(name)) continue;
    // Abbreviation: initials, then initials+letter until unique.
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase();
    let abbr = initials;
    for (let i = 0; taken.abbrs.has(abbr) && i < 26; i++) {
      abbr = `${initials}${String.fromCharCode(65 + i)}`;
    }
    if (taken.abbrs.has(abbr)) continue;
    taken.names.add(name);
    taken.abbrs.add(abbr);
    defs.push({ name, abbr, color: hslToHex(hashHue(name), 0.62, 0.52) });
  }
  return defs;
}
