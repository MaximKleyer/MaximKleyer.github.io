/**
 * subregions.js — the VCT 2027 mode's qualifier territories.
 *
 * The 2027 structure ("everything is a tournament") replaces league play
 * with open qualifiers feeding regional events. Each REGION (Americas,
 * EMEA, Pacific, China) is split into the SUB-REGIONS that run their own
 * open qualifiers, per the official Path to Global Events:
 *
 *   Americas — North America (US/CA/MX), LATAM, Brazil
 *   EMEA     — Europe (everything except Türkiye and MENA), MENA, Türkiye
 *   Pacific  — Korea, Japan, Southeast Asia, South Asia
 *   China    — one national qualifier
 *
 * Every sub-region hosts OPEN_TEAMS_PER_SUBREGION generated clubs and
 * sends `slots` qualified teams to its region's next Kickoff/Cup. Slots
 * are powers of two summing to 8 per region, so every regional main
 * event is exactly 8 partners + 8 qualified opens = 16 teams.
 *
 * `pool` is the weighted nationality draw (duplication = weight) and
 * `langPool` the weighted comms-language draw for generated clubs —
 * same identity machinery as the franchise mode, scoped one level down.
 */

export const OPEN_TEAMS_PER_SUBREGION = 32;

export const SUB_REGIONS = {
  americas: {
    na: {
      name: 'North America', abbr: 'NA', color: '#ff4655', slots: 4,
      pool: ['US', 'US', 'US', 'US', 'US', 'US', 'CA', 'CA', 'MX', 'MX'],
      langPool: ['en', 'en', 'en', 'en', 'es'],
    },
    latam: {
      name: 'LATAM', abbr: 'LAT', color: '#c084fc', slots: 2,
      pool: ['AR', 'AR', 'CL', 'CL', 'PE', 'CO', 'CO'],
      langPool: ['es'],
    },
    br: {
      name: 'Brazil', abbr: 'BR', color: '#3ec488', slots: 2,
      pool: ['BR'],
      langPool: ['pt'],
    },
  },
  emea: {
    eu: {
      name: 'Europe', abbr: 'EU', color: '#4aafe0', slots: 4,
      pool: [
        'GB', 'GB', 'FR', 'FR', 'DE', 'DE', 'SE', 'SE', 'ES', 'PL',
        'FI', 'DK', 'NL', 'NL', 'RU', 'RU', 'UA', 'PT', 'IT', 'NO',
      ],
      langPool: ['en', 'en', 'en', 'en', 'ru', 'fr'],
    },
    mena: {
      name: 'MENA', abbr: 'MENA', color: '#f0c54a', slots: 2,
      pool: ['MA', 'MA', 'EG', 'EG', 'SA', 'SA'],
      langPool: ['ar'],
    },
    tr: {
      name: 'Türkiye', abbr: 'TR', color: '#e4353f', slots: 2,
      pool: ['TR'],
      langPool: ['tr'],
    },
  },
  pacific: {
    kr: {
      name: 'Korea', abbr: 'KR', color: '#7aa2ff', slots: 2,
      pool: ['KR'],
      langPool: ['ko'],
    },
    jp: {
      name: 'Japan', abbr: 'JP', color: '#ff8c95', slots: 2,
      pool: ['JP'],
      langPool: ['ja'],
    },
    sea: {
      name: 'Southeast Asia', abbr: 'SEA', color: '#ff9632', slots: 2,
      pool: ['TH', 'TH', 'VN', 'PH', 'PH', 'ID', 'ID', 'MY', 'SG'],
      langPool: ['en', 'en', 'th', 'id'],
    },
    sas: {
      name: 'South Asia', abbr: 'SAS', color: '#3fbf7f', slots: 2,
      pool: ['IN', 'IN', 'IN', 'IN', 'PK'],
      langPool: ['en', 'en', 'hi'],
    },
  },
  china: {
    cn: {
      name: 'China', abbr: 'CN', color: '#e8c840', slots: 8,
      pool: ['CN', 'CN', 'CN', 'CN', 'CN', 'CN', 'CN', 'CN', 'HK', 'TW', 'TW'],
      langPool: ['zh'],
    },
  },
};

export const SUB_REGION_KEYS = Object.fromEntries(
  Object.entries(SUB_REGIONS).map(([rk, subs]) => [rk, Object.keys(subs)])
);

/** Sum of qualifier slots per region — every region must send exactly 8. */
export function openSlotsForRegion(regionKey) {
  return Object.values(SUB_REGIONS[regionKey] || {}).reduce((s, d) => s + d.slots, 0);
}
