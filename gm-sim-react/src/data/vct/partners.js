/**
 * partners.js — the 8 partnered organizations per region in VCT 2027.
 *
 * The two-year partnership cycle trims each region to eight partners
 * (down from the franchise mode's twelve). Partners get direct seeding
 * into regional main events — they skip the open qualifiers entirely
 * and meet the qualified open teams at Kickoff and each Cup — plus a
 * guaranteed base payment each year.
 *
 * Selection reuses the org shells from regions.js so the two modes
 * share branding (and any real logo dropped into public/logos/ works in
 * both). The cut keeps each region's flavor anchors: Brazil and LATAM
 * representation in Americas, the Turkish orgs in EMEA, the Korean core
 * plus the South Asia org in Pacific.
 */

import { REGIONS } from '../regions.js';

const PARTNER_ABBRS = {
  americas: ['SEN', 'C9', 'NRG', 'LOUD', '100T', 'EG', 'KRU', 'LEV'],
  emea:     ['FNC', 'VIT', 'TH', 'KC', 'BBL', 'NAVI', 'TL', 'FUT'],
  pacific:  ['DRX', 'GEN', 'T1', 'PRX', 'ZETA', 'TS', 'RRQ', 'GE'],
  china:    ['EDG', 'BLG', 'FPX', 'JDG', 'TE', 'WOL', 'AG', 'TYL'],
};

export const PARTNERS_PER_REGION = 8;

/** Team defs ({ name, abbr, color }) for a region's 8 partners. */
export function getPartnerDefs(regionKey) {
  const abbrs = PARTNER_ABBRS[regionKey] || [];
  const defs = REGIONS[regionKey]?.teams || [];
  return abbrs
    .map(a => defs.find(d => d.abbr === a))
    .filter(Boolean);
}
