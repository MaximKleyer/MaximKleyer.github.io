/**
 * regions.js — Region and team definitions for all 4 VCT regions.
 */

export const REGIONS = {
  americas: {
    name: 'Americas',
    abbr: 'AMR',
    color: '#ff4655',
    teams: [
      { name: 'Sentinels',      abbr: 'SEN',  color: '#ff002f' }, // changed
      { name: 'Cloud9',         abbr: 'C9',   color: '#00aeef' }, // changed
      { name: 'NRG Esports',    abbr: 'NRG',  color: '#e74c3c' },
      { name: 'LOUD',           abbr: 'LOUD', color: '#5bbd00' },
      { name: '100 Thieves',    abbr: '100T', color: '#ef3232' }, // changed
      { name: 'MIBR',           abbr: 'MIBR', color: '#808080' }, // changed
      { name: 'Evil Geniuses',  abbr: 'EG',   color: '#004d99' }, // changed
      { name: 'KRÜ Esports',    abbr: 'KRU',  color: '#ff0066' }, // changed
      { name: 'Leviatán',       abbr: 'LEV',  color: '#33d6ff' }, // changed
      { name: 'FURIA',          abbr: 'FUR',  color: '#ffffff' }, // changed
      { name: 'G2 Esports',     abbr: 'G2',   color: '#f57070' }, // changed
      { name: 'ENVY',           abbr: 'ENVY', color: '#00004d' }, // changed
    ],
  },
  emea: {
    name: 'EMEA',
    abbr: 'EMEA',
    color: '#4aafe0',
    teams: [
      { name: 'Fnatic',         abbr: 'FNC',  color: '#ff5900' },
      { name: 'Team Vitality',  abbr: 'VIT',  color: '#ffdd00' },
      { name: 'Team Heretics',  abbr: 'TH',   color: '#cc9900' }, // changed
      { name: 'Gentlemates',    abbr: 'M8',   color: '#ff99ff' }, // changed
      { name: 'Karmine Corp',   abbr: 'KC',   color: '#339cff' }, // changed
      { name: 'BBL Esports',    abbr: 'BBL',  color: '#ffc34d' }, // changed
      { name: 'FUT Esports',    abbr: 'FUT',  color: '#ff3300' }, // changed
      { name: 'Navi',           abbr: 'NAVI', color: '#ffd700' }, 
      { name: 'Team Liquid',    abbr: 'TL',   color: '#004080' }, // changed
      { name: 'Giants Gaming',  abbr: 'GX',   color: '#333333' }, // changed
      { name: 'PCIFIC',         abbr: 'PCFC', color: '#4d94ff' }, // changed
      { name: 'Eternal Fire',   abbr: 'EF',   color: '#ffe699' }, // changed
    ],
  },
  pacific: {
    name: 'Pacific',
    abbr: 'PAC',
    color: '#ff9632',
    teams: [
      { name: 'DRX',            abbr: 'DRX',  color: '#2a68a2' }, // changed
      { name: 'Gen.G',          abbr: 'GEN',  color: '#cba135' },
      { name: 'T1',             abbr: 'T1',   color: '#e2012d' },
      { name: 'Global Esports', abbr: 'GE',   color: '#ff471a' }, // changed
      { name: 'Paper Rex',      abbr: 'PRX',  color: '#ffffff' }, // changed
      { name: 'Team Secret',    abbr: 'TS',   color: '#999999' },
      { name: 'Full Sense',     abbr: 'FS',   color: '#ff6600' }, // chnaged
      { name: 'ZETA DIVISION',  abbr: 'ZETA', color: '#737373' }, // changed
      { name: 'DetonatioN FM',  abbr: 'DFM',  color: '#404072' }, // changed
      { name: 'Rex Regum Qeon', abbr: 'RRQ',  color: '#ffa666' }, // changed
      { name: 'Varrel',         abbr: 'VAR',  color: '#5d091a' }, // changed
      { name: 'NS RedForce',    abbr: 'NS',   color: '#cc0000' },
    ],
  },
  china: {
    name: 'China',
    abbr: 'CN',
    color: '#e8c840',
    teams: [
      { name: 'EDward Gaming',  abbr: 'EDG',  color: '#ffffff' }, // changed
      { name: 'Bilibili Gaming',abbr: 'BLG',  color: '#80dfff' }, // changed
      { name: 'FunPlus Phoenix',abbr: 'FPX',  color: '#ee2737' }, 
      { name: 'Nova Esports',   abbr: 'NOVA', color: '#b3006e' }, // changed
      { name: 'Trace Esports',  abbr: 'TE',   color: '#0033cc' }, // changed
      { name: 'All Gamers',     abbr: 'AG',   color: '#ff0000' }, // changed
      { name: 'Wolves Esports', abbr: 'WOL',  color: '#cc7a00' }, // changed
      { name: 'Dragon Ranger',  abbr: 'DRG',  color: '#66ff99' }, // changed
      { name: 'JD Gaming',      abbr: 'JDG',  color: '#cc0000' }, // changed
      { name: 'Titan Esports',  abbr: 'TITN', color: '#990000' }, // changed
      { name: 'TyLoo',          abbr: 'TYL',  color: '#ff1a1a' }, // changed
      { name: 'Xi Lai Gaming',  abbr: 'XLG',  color: '#006680' }, // changed
    ],
  },
};

export const REGION_KEYS = Object.keys(REGIONS);
export const REGION_OPTIONS = REGION_KEYS.map(k => ({ key: k, name: REGIONS[k].name }));
