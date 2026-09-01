/**
 * languages.js — spoken languages for players and teams.
 *
 * Why this exists: rolling every player's nationality independently made
 * each region a melting pot — an Americas side of one American, two
 * Brazilians, an Argentinian and a Canadian is a roster that cannot talk
 * to each other mid-round. Real teams form around a comms language
 * (English-comms NA sides, Portuguese BR sides, Turkish or Russian cores
 * in EMEA), with the occasional import who learned the language.
 *
 * The model:
 *   - Every player speaks the native language of their nationality,
 *     always. This is an invariant — generation, save migration, and
 *     god-mode nationality edits all maintain it.
 *   - Generation may add extra languages by nationality-weighted chance
 *     (English is the esports lingua franca, so it is the common extra).
 *   - A team's COMM LANGUAGE is whichever language the most rostered
 *     players speak. AI clubs only sign players who speak it, so their
 *     rosters stay coherent. The human can sign anyone, but a fielded
 *     five with players outside the comms loop pays a match penalty
 *     (see Match.js) — and the outsiders gradually learn the team's
 *     language at development windows.
 *
 * Language codes are lowercase ISO-639-ish strings ('en', 'pt', 'fil'),
 * deliberately distinct in shape from the uppercase nationality codes.
 */

export const LANGUAGES = {
  en:  'English',
  pt:  'Portuguese',
  es:  'Spanish',
  fr:  'French',
  de:  'German',
  sv:  'Swedish',
  tr:  'Turkish',
  pl:  'Polish',
  fi:  'Finnish',
  da:  'Danish',
  nl:  'Dutch',
  ru:  'Russian',
  uk:  'Ukrainian',
  it:  'Italian',
  no:  'Norwegian',
  ar:  'Arabic',
  ko:  'Korean',
  ja:  'Japanese',
  th:  'Thai',
  vi:  'Vietnamese',
  fil: 'Filipino',
  id:  'Indonesian',
  ms:  'Malay',
  zh:  'Chinese',
};

export function languageName(code) {
  return LANGUAGES[code] || code || '—';
}

/**
 * The language every player of a nationality is guaranteed to speak.
 * (Cantonese is folded into 'zh' so the China region can communicate —
 * a finer split would cut Hong Kong off from every roster it has.)
 */
export const NATIVE_LANGUAGE = {
  US: 'en', CA: 'en', GB: 'en', AU: 'en', NZ: 'en', SG: 'en',
  BR: 'pt', PT: 'pt',
  MX: 'es', AR: 'es', CL: 'es', PE: 'es', CO: 'es', ES: 'es',
  FR: 'fr', DE: 'de', SE: 'sv', TR: 'tr', PL: 'pl', FI: 'fi',
  DK: 'da', NL: 'nl', RU: 'ru', UA: 'uk', IT: 'it', NO: 'no',
  MA: 'ar', EG: 'ar', SA: 'ar',
  KR: 'ko', JP: 'ja', TH: 'th', VN: 'vi', PH: 'fil', ID: 'id', MY: 'ms',
  CN: 'zh', HK: 'zh', TW: 'zh',
};

export function nativeLanguageOf(nationality) {
  return NATIVE_LANGUAGE[nationality] || 'en';
}

/**
 * Chance a generated player of this nationality also speaks each extra
 * language. Rolled independently at generation. Tuned to esports reality:
 * English is near-universal in the Nordics/NL/PH and rare in JP/CN, the
 * post-Soviet scene shares Russian, Morocco's scene runs through French.
 */
export const EXTRA_LANGUAGE_CHANCES = {
  US: [['es', 0.08]],
  CA: [['fr', 0.25]],
  BR: [['en', 0.30], ['es', 0.20]],
  MX: [['en', 0.35]],
  AR: [['en', 0.30], ['pt', 0.10]],
  CL: [['en', 0.30]],
  PE: [['en', 0.25]],
  CO: [['en', 0.30]],
  FR: [['en', 0.45]],
  DE: [['en', 0.60]],
  SE: [['en', 0.85]],
  ES: [['en', 0.35], ['pt', 0.10]],
  TR: [['en', 0.35]],
  PL: [['en', 0.50]],
  FI: [['en', 0.80], ['sv', 0.15]],
  DK: [['en', 0.85], ['sv', 0.12]],
  NL: [['en', 0.85], ['de', 0.20]],
  RU: [['en', 0.30]],
  UA: [['ru', 0.80], ['en', 0.30]],
  PT: [['en', 0.40], ['es', 0.25]],
  IT: [['en', 0.35]],
  NO: [['en', 0.85], ['sv', 0.15]],
  MA: [['fr', 0.65], ['en', 0.30]],
  EG: [['en', 0.35]],
  SA: [['en', 0.35]],
  KR: [['en', 0.20]],
  JP: [['en', 0.15]],
  TH: [['en', 0.30]],
  VN: [['en', 0.25]],
  PH: [['en', 0.95]],
  ID: [['en', 0.35]],
  MY: [['en', 0.75], ['zh', 0.30]],
  SG: [['zh', 0.50], ['ms', 0.15]],
  CN: [['en', 0.12]],
  HK: [['en', 0.65]],
  TW: [['en', 0.25]],
};

/** Native language plus independently-rolled extras. Native is always first. */
export function rollLanguages(nationality, rng = Math.random) {
  const langs = [nativeLanguageOf(nationality)];
  for (const [lang, chance] of EXTRA_LANGUAGE_CHANCES[nationality] || []) {
    if (!langs.includes(lang) && rng() < chance) langs.push(lang);
  }
  return langs;
}

/**
 * A deterministic RNG seeded from a string (mulberry32 over an FNV-1a
 * hash). The save-migration backfill rolls with this, seeded by player
 * id: if the post-load autosave ever fails (quota), the next launch
 * re-rolls the SAME languages instead of quietly reshuffling which
 * rosters read as coherent between sessions.
 */
export function seededRng(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h = (h + 0x6D2B79F5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Probability a generated player of this nationality speaks `lang` at
 * all. Used to weight nationality picks when building a roster around a
 * comms language.
 */
export function speakChance(nationality, lang) {
  if (nativeLanguageOf(nationality) === lang) return 1;
  for (const [l, chance] of EXTRA_LANGUAGE_CHANCES[nationality] || []) {
    if (l === lang) return chance;
  }
  return 0;
}

/**
 * Which comms language a new club forms around, weighted per region the
 * way the real scene splits: Americas is English orgs plus Brazilian and
 * LATAM cores, EMEA is mostly English-comms internationals with Turkish
 * and Russian language cores, Pacific splits across Korea/Japan/SEA, and
 * China is Chinese. Duplication = higher weight.
 */
export const TEAM_LANGUAGE_POOL = {
  americas: ['en', 'en', 'en', 'en', 'en', 'pt', 'pt', 'pt', 'es', 'es'],
  emea:     ['en', 'en', 'en', 'en', 'en', 'en', 'tr', 'tr', 'ru', 'ru', 'fr'],
  pacific:  ['en', 'en', 'en', 'en', 'ko', 'ko', 'ko', 'ja', 'ja', 'th', 'id', 'vi'],
  // China runs Chinese, full stop — its nationality pool (CN/HK/TW) has
  // no native English speakers, so an 'en' club there would come out as
  // an all-Hong-Kong curiosity rather than anything the scene produces.
  china:    ['zh'],
};

export function randomTeamLanguage(regionKey) {
  const pool = TEAM_LANGUAGE_POOL[regionKey] || ['en'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** The languages a player speaks, tolerating objects that predate the field. */
export function playerLanguages(player) {
  if (Array.isArray(player?.languages) && player.languages.length > 0) {
    return player.languages;
  }
  return [nativeLanguageOf(player?.nationality)];
}

export function speaks(player, lang) {
  if (!lang) return true;
  return playerLanguages(player).includes(lang);
}

/** Teach a language, preserving the native-first ordering and uniqueness. */
export function addLanguage(player, lang) {
  if (!lang || !player) return false;
  const langs = playerLanguages(player);
  if (langs.includes(lang)) {
    // Materialize the derived array so the fact they speak it persists.
    if (!Array.isArray(player.languages)) player.languages = [...langs];
    return false;
  }
  player.languages = [...langs, lang];
  return true;
}

/**
 * The comms language of a group: whichever language the most members
 * speak. Ties break toward the language with the most NATIVE speakers,
 * so a 3-native-Portuguese core outranks the three who happen to share
 * English. Returns { lang, coverage } — lang is null for an empty group.
 */
export function commLanguage(players) {
  if (!players || players.length === 0) return { lang: null, coverage: 0 };
  const coverage = new Map();   // lang → # who speak it
  const native = new Map();     // lang → # native speakers
  for (const p of players) {
    for (const lang of playerLanguages(p)) {
      coverage.set(lang, (coverage.get(lang) || 0) + 1);
    }
    const nat = nativeLanguageOf(p?.nationality);
    native.set(nat, (native.get(nat) || 0) + 1);
  }
  // Final tiebreak is alphabetical on the language code: coverage maps
  // iterate in player order, so without it an exact tie flips with a
  // depth-chart drag — same five, different label.
  let best = null, bestCov = 0, bestNat = -1;
  for (const [lang, cov] of coverage) {
    const nat = native.get(lang) || 0;
    if (
      cov > bestCov ||
      (cov === bestCov && (nat > bestNat || (nat === bestNat && (best === null || lang < best))))
    ) {
      best = lang; bestCov = cov; bestNat = nat;
    }
  }
  return { lang: best, coverage: bestCov };
}

/** How many of a lineup sit outside the comms loop. 0 = fully coherent. */
export function commUncovered(players) {
  if (!players || players.length === 0) return 0;
  return players.length - commLanguage(players).coverage;
}

/**
 * Can this candidate communicate on this roster? True when they speak
 * the roster's comms language (or the roster is empty). This is the
 * filter every AI signing pass runs — it is what keeps AI clubs from
 * drifting back into melting pots as players churn.
 */
export function fitsTeamLanguage(roster, candidate) {
  const { lang } = commLanguage(roster);
  if (!lang) return true;
  return speaks(candidate, lang);
}

/**
 * Pick a nationality from the region's pool, weighted toward countries
 * likely to produce a speaker of the team's comms language. An 'en' club
 * in the Americas comes out mostly US/CA with the odd English-speaking
 * Brazilian; a 'pt' club comes out almost entirely Brazilian. Falls back
 * to a plain region roll if nothing in the pool can speak the language
 * (the caller then force-teaches it).
 */
export function pickNationalityForLanguage(regionPool, lang) {
  const weights = regionPool.map(nat => speakChance(nat, lang));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) {
    return regionPool[Math.floor(Math.random() * regionPool.length)];
  }
  let roll = Math.random() * total;
  for (let i = 0; i < regionPool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return regionPool[i];
  }
  return regionPool[regionPool.length - 1];
}
