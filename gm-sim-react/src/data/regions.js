/**
 * regions.js — Region and team definitions for all 4 VCT regions.
 */

export const REGIONS = {
  americas: {
    name: 'Americas',
    abbr: 'AMR',
    color: '#ff4655',
    teams: [
      { name: 'Sentinels',      abbr: 'SEN',  color: '#e4002b' },
      { name: 'Cloud9',         abbr: 'C9',   color: '#009cde' },
      { name: 'NRG Esports',    abbr: 'NRG',  color: '#e74c3c' },
      { name: 'LOUD',           abbr: 'LLL',  color: '#5bbd00' },
      { name: '100 Thieves',    abbr: '100T', color: '#ff0000' },
      { name: 'MIBR',           abbr: 'MBR',  color: '#f5c400' },
      { name: 'Evil Geniuses',  abbr: 'EG',   color: '#1e90ff' },
      { name: 'KRÜ Esports',   abbr: 'KRU',  color: '#6f2dbd' },
      { name: 'Leviatán',      abbr: 'LEV',  color: '#00c389' },
      { name: 'FURIA',          abbr: 'FUR',  color: '#333333' },
      { name: 'G2 Esports',     abbr: 'G2',   color: '#ef2020' },
      { name: '2Game Esports',  abbr: '2G',   color: '#f58220' },
    ],
  },
  emea: {
    name: 'EMEA',
    abbr: 'EMEA',
    color: '#4aafe0',
    teams: [
      { name: 'Fnatic',         abbr: 'FNC',  color: '#ff5900' },
      { name: 'Team Vitality',  abbr: 'VIT',  color: '#ffdd00' },
      { name: 'Team Heretics',  abbr: 'TH',   color: '#9d4dbb' },
      { name: 'Gentle Mates',   abbr: 'M8',   color: '#72e8a0' },
      { name: 'Karmine Corp',   abbr: 'KC',   color: '#0055a4' },
      { name: 'BBL Esports',    abbr: 'BBL',  color: '#e31e24' },
      { name: 'FUT Esports',    abbr: 'FUT',  color: '#00b4d8' },
      { name: 'Navi',           abbr: 'NAVI', color: '#ffd700' },
      { name: 'Team Liquid',    abbr: 'TL',   color: '#0070de' },
      { name: 'Giants Gaming',  abbr: 'GIA',  color: '#ff8200' },
      { name: 'Apeks',          abbr: 'APK',  color: '#c8102e' },
      { name: 'KOI',            abbr: 'KOI',  color: '#00b5a3' },
    ],
  },
  pacific: {
    name: 'Pacific',
    abbr: 'PAC',
    color: '#ff9632',
    teams: [
      { name: 'DRX',            abbr: 'DRX',  color: '#5b9bd5' },
      { name: 'Gen.G',          abbr: 'GEN',  color: '#cba135' },
      { name: 'T1',             abbr: 'T1',   color: '#e2012d' },
      { name: 'Global Esports', abbr: 'GE',   color: '#2eb82e' },
      { name: 'Paper Rex',      abbr: 'PRX',  color: '#e63946' },
      { name: 'Team Secret',    abbr: 'TS',   color: '#999999' },
      { name: 'Talon Esports',  abbr: 'TLN',  color: '#d4af37' },
      { name: 'ZETA DIVISION',  abbr: 'ZET',  color: '#00d4aa' },
      { name: 'DetonatioN FM',  abbr: 'DFM',  color: '#1a1a2e' },
      { name: 'Rex Regum Qeon', abbr: 'RRQ',  color: '#ff6b00' },
      { name: 'Bleed Esports',  abbr: 'BLD',  color: '#dc143c' },
      { name: 'NS RedForce',    abbr: 'NS',   color: '#cc0000' },
    ],
  },
  china: {
    name: 'China',
    abbr: 'CN',
    color: '#e8c840',
    teams: [
      { name: 'EDward Gaming',  abbr: 'EDG',  color: '#1a1a1a' },
      { name: 'Bilibili Gaming',abbr: 'BLG',  color: '#00a1d6' },
      { name: 'FunPlus Phoenix',abbr: 'FPX',  color: '#ee2737' },
      { name: 'Nova Esports',   abbr: 'NOVA', color: '#ff6ec7' },
      { name: 'Trace Esports',  abbr: 'TE',   color: '#3cb371' },
      { name: 'All Gamers',     abbr: 'AG',   color: '#6c5ce7' },
      { name: 'Wolves Esports', abbr: 'WOL',  color: '#555555' },
      { name: 'Dragon Ranger',  abbr: 'DRG',  color: '#b22222' },
      { name: 'JD Gaming',      abbr: 'JDG',  color: '#c41e3a' },
      { name: 'Rare Atom',      abbr: 'RA',   color: '#00bfff' },
      { name: 'TyLoo',          abbr: 'TYL',  color: '#ff4500' },
      { name: 'Attacking Soul', abbr: 'ASE',  color: '#8b0000' },
    ],
  },
};

export const REGION_KEYS = Object.keys(REGIONS);
export const REGION_OPTIONS = REGION_KEYS.map(k => ({ key: k, name: REGIONS[k].name }));
