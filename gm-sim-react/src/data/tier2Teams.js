/**
 * tier2Teams.js — the 16 tier-2 organisations in each region.
 *
 * Two kinds of org, mirroring how real tier-2 scenes look:
 *
 *   ACADEMY  — a tier-1 org's second team. Derived from the parent's
 *              entry in regions.js so the name, abbreviation and colour
 *              stay in sync if a tier-1 team is ever renamed. `parent`
 *              is the tier-1 abbr, which later phases can use for
 *              promotion paths or internal transfers.
 *
 *   INDEPENDENT — an org with no tier-1 side. These are the teams with
 *              nothing above them, so they are the ones most exposed to
 *              having a breakout player poached.
 *
 * Six academies plus ten independents per region. Tier 2 is deliberately
 * more open than the franchised tier 1: no fixed slots, and (much later,
 * if ever) a route upward.
 */

import { REGIONS } from './regions.js';

// Which tier-1 orgs field an academy side, per region.
const ACADEMY_PARENTS = {
  americas: ['NRG', 'EG', 'SEN', 'LOUD', 'C9', 'KRU'],
  emea:     ['FNC', 'NAVI', 'TH', 'KC', 'BBL', 'VIT'],
  pacific:  ['DRX', 'GEN', 'T1', 'PRX', 'RRQ', 'TS'],
  china:    ['EDG', 'BLG', 'FPX', 'JDG', 'TE', 'AG'],
};

// Independent orgs. Ten per region, flavoured loosely by scene.
const INDEPENDENTS = {
  americas: [
    { name: 'M80',                     abbr: 'M80',  color: '#f2c400' },
    { name: 'Oxygen Esports',          abbr: 'OXG',  color: '#00c2a8' },
    { name: 'Moon Raccoons',           abbr: 'MRC',  color: '#7a5cff' },
    { name: 'Turtle Troop',            abbr: 'TRT',  color: '#3fa34d' },
    { name: 'Disguised',               abbr: 'DSG',  color: '#e85d9e' },
    { name: 'Rise of the Fallen',      abbr: 'ROTF', color: '#c0392b' },
    { name: 'Division One',            abbr: 'DIV',  color: '#4a90d9' },
    { name: 'Pigeons',                 abbr: 'PGN',  color: '#9aa4b0' },
    { name: 'Shopify Rebellion Black', abbr: 'SRB',  color: '#95bf47' },
    { name: 'Dynamo Esports',          abbr: 'DYN',  color: '#ff7a29' },
  ],
  emea: [
    { name: 'Apeks',                   abbr: 'APK',  color: '#e63946' },
    { name: 'Case Esports',            abbr: 'CASE', color: '#2b9348' },
    { name: 'Los Ratones',             abbr: 'LR',   color: '#f4a261' },
    { name: 'Diamant Esports',         abbr: 'DIA',  color: '#00b4d8' },
    { name: 'Alliance Guardians',      abbr: 'ALG',  color: '#5566ff' },
    { name: 'Nightblood Gaming',       abbr: 'NBG',  color: '#8e2de2' },
    { name: 'Azure Dragon',            abbr: 'AZD',  color: '#1f6feb' },
    { name: 'Iron Wolves',             abbr: 'IRW',  color: '#6b7280' },
    { name: 'Northern Lights',         abbr: 'NL',   color: '#22d3ee' },
    { name: 'Scarlet Empire',          abbr: 'SCE',  color: '#b91c1c' },
  ],
  pacific: [
    { name: 'Bleed Esports',           abbr: 'BLD',  color: '#c026d3' },
    { name: 'Alter Ego',               abbr: 'AE',   color: '#ef4444' },
    { name: 'Boom Esports',            abbr: 'BOOM', color: '#f59e0b' },
    { name: 'Persija Evos',            abbr: 'PEV',  color: '#0ea5e9' },
    { name: 'Sin Prisa Gaming',        abbr: 'SPG',  color: '#14b8a6' },
    { name: 'Made in Thailand',        abbr: 'MIT',  color: '#eab308' },
    { name: 'Kanaya Esports',          abbr: 'KNY',  color: '#a855f7' },
    { name: 'Jadeite',                 abbr: 'JDE',  color: '#34d399' },
    { name: 'Fennel',                  abbr: 'FNL',  color: '#fb7185' },
    { name: 'Lotus Collective',        abbr: 'LTC',  color: '#f472b6' },
  ],
  china: [
    { name: 'Rare Atom',               abbr: 'RA',   color: '#dc2626' },
    { name: 'Ultra Prime',             abbr: 'UP',   color: '#7c3aed' },
    { name: 'Douyu Gaming',            abbr: 'DOU',  color: '#ff6600' },
    { name: 'Qing Jiu Club',           abbr: 'QJC',  color: '#0891b2' },
    { name: 'Nova Rising',             abbr: 'NVR',  color: '#4ade80' },
    { name: 'Dragon Ranger',           abbr: 'DRG2', color: '#f43f5e' },
    { name: 'Wolves Academy Blue',     abbr: 'WAB',  color: '#3b82f6' },
    { name: 'Titan Shield',            abbr: 'TSH',  color: '#94a3b8' },
    { name: 'Jade Phoenix',            abbr: 'JPX',  color: '#fbbf24' },
    { name: 'Silk Road Gaming',        abbr: 'SRG',  color: '#d97706' },
  ],
};

/**
 * Build the 16 tier-2 team definitions for a region.
 * Returns [{ name, abbr, color, parent }] — `parent` is null for
 * independents and the tier-1 abbr for academies.
 */
export function getTier2TeamDefs(regionKey) {
  const tier1 = REGIONS[regionKey]?.teams || [];
  const byAbbr = new Map(tier1.map(t => [t.abbr, t]));

  const academies = (ACADEMY_PARENTS[regionKey] || [])
    .map(abbr => byAbbr.get(abbr))
    .filter(Boolean)
    .map(parent => ({
      name: `${parent.name} Academy`,
      // Suffix rather than truncate so the link to the parent stays
      // readable in standings tables.
      abbr: `${parent.abbr}A`,
      color: parent.color,
      parent: parent.abbr,
    }));

  const independents = (INDEPENDENTS[regionKey] || [])
    .map(t => ({ ...t, parent: null }));

  return [...academies, ...independents];
}

export const TIER2_TEAM_COUNT = 16;
