// PVP opponents — placeholder NPCs to fight against
// Each opponent has a name, tier, and a roster of 1-3 guards
// with their own levels and optional stat allocations

const PVP_OPPONENTS = {
  // ─── BRONZE TIER ───
  bronze: [
    {
      id: "rookie_alex", name: "Rookie Alex", tier: "Bronze",
      desc: "A new summoner just starting their journey.",
      roster: [
        { guardId: "miki", level: 5 },
        { guardId: "dogiPink", level: 4 },
        { guardId: "spini", level: 3 },
      ],
      reputation: 10, gold: 200, xp: 150,
    },
    {
      id: "trainer_zoe", name: "Trainer Zoe", tier: "Bronze",
      desc: "Specializes in raising young spirits.",
      roster: [
        { guardId: "owlvi", level: 6 },
        { guardId: "burgi", level: 5 },
        { guardId: "rainbowfox", level: 7 },
      ],
      reputation: 12, gold: 250, xp: 200,
    },
    {
      id: "scholar_finn", name: "Scholar Finn", tier: "Bronze",
      desc: "Studies magical-type spirits.",
      roster: [
        { guardId: "waaga", level: 7 },
        { guardId: "magimanGreen", level: 6 },
      ],
      reputation: 15, gold: 280, xp: 230,
    },
  ],

  // ─── SILVER TIER ───
  silver: [
    {
      id: "ranger_kira", name: "Ranger Kira", tier: "Silver",
      desc: "A wilderness expert with rugged spirits.",
      roster: [
        { guardId: "bigiworm", level: 12 },
        { guardId: "cactuman", level: 11 },
        { guardId: "dasypus", level: 13 },
      ],
      reputation: 25, gold: 500, xp: 400,
    },
    {
      id: "pyromancer_marcus", name: "Pyromancer Marcus", tier: "Silver",
      desc: "Burns down opponents with fire spirits.",
      roster: [
        { guardId: "firebo", level: 14 },
        { guardId: "trifishRed", level: 13 },
        { guardId: "firecrab", level: 12 },
      ],
      reputation: 30, gold: 600, xp: 480,
    },
    {
      id: "hydromancer_lila", name: "Hydromancer Lila", tier: "Silver",
      desc: "Master of water spirits and tidal magic.",
      roster: [
        { guardId: "trifishGreen", level: 14 },
        { guardId: "squidi", level: 13 },
        { guardId: "danda", level: 12 },
      ],
      reputation: 30, gold: 600, xp: 480,
    },
    {
      id: "duelist_rex", name: "Duelist Rex", tier: "Silver",
      desc: "Prefers fast and aggressive 1v1 battles.",
      roster: [
        { guardId: "miki", level: 15 },
        { guardId: "shin", level: 14 },
      ],
      reputation: 28, gold: 580, xp: 460,
    },
  ],

  // ─── GOLD TIER ───
  gold: [
    {
      id: "shadowblade_vex", name: "Shadowblade Vex", tier: "Gold",
      desc: "Cloaked figure who commands dark spirits.",
      roster: [
        { guardId: "danti", level: 19 },
        { guardId: "shadowimp", level: 18 },
        { guardId: "magimanRed", level: 20 },
      ],
      reputation: 50, gold: 1200, xp: 900,
    },
    {
      id: "knight_elara", name: "Knight Elara", tier: "Gold",
      desc: "Honorable warrior with armored spirits.",
      roster: [
        { guardId: "armorGreen", level: 18 },
        { guardId: "armorRed", level: 18 },
        { guardId: "steelha", level: 19 },
      ],
      reputation: 55, gold: 1300, xp: 980,
    },
    {
      id: "beastmaster_thora", name: "Beastmaster Thora", tier: "Gold",
      desc: "Tames the most savage spirits.",
      roster: [
        { guardId: "rexliGrey", level: 20 },
        { guardId: "codi", level: 19 },
        { guardId: "tororo", level: 18 },
      ],
      reputation: 60, gold: 1400, xp: 1050,
    },
  ],

  // ─── PLATINUM TIER ───
  platinum: [
    {
      id: "stormcaller_nyx", name: "Stormcaller Nyx", tier: "Platinum",
      desc: "Commands wind and lightning spirits.",
      roster: [
        { guardId: "owlvia", level: 24 },
        { guardId: "elecgrain", level: 23 },
        { guardId: "chickaPink", level: 25 },
      ],
      reputation: 90, gold: 2200, xp: 1600,
    },
    {
      id: "warlord_drogan", name: "Warlord Drogan", tier: "Platinum",
      desc: "A ruthless commander of evolved beasts.",
      roster: [
        { guardId: "srDogi", level: 24 },
        { guardId: "kendoMiki", level: 25 },
        { guardId: "tosstanmastiff", level: 26 },
      ],
      reputation: 100, gold: 2500, xp: 1800,
    },
  ],

  // ─── DIAMOND TIER ───
  diamond: [
    {
      id: "archmage_seraphine", name: "Archmage Seraphine", tier: "Diamond",
      desc: "Wields the most powerful magical spirits.",
      roster: [
        { guardId: "darkwizard", level: 28 },
        { guardId: "firewizard", level: 28 },
        { guardId: "magus", level: 29 },
      ],
      reputation: 150, gold: 4000, xp: 2800,
    },
    {
      id: "dragonlord_kael", name: "Dragonlord Kael", tier: "Diamond",
      desc: "The legendary tamer of dragons. The ultimate test.",
      roster: [
        { guardId: "akigowa", level: 30 },
        { guardId: "iferasa", level: 30 },
        { guardId: "skiinaa", level: 30 },
      ],
      reputation: 200, gold: 6000, xp: 4000,
    },
  ],
};

export const TIER_ORDER = ["bronze", "silver", "gold", "platinum", "diamond"];

export const TIER_INFO = {
  bronze:   { name: "Bronze",   color: "#cd7f32", reputationRequired: 0,   icon: "🥉" },
  silver:   { name: "Silver",   color: "#c0c0c0", reputationRequired: 30,  icon: "🥈" },
  gold:     { name: "Gold",     color: "#ffd700", reputationRequired: 80,  icon: "🥇" },
  platinum: { name: "Platinum", color: "#e5e4e2", reputationRequired: 150, icon: "💎" },
  diamond:  { name: "Diamond",  color: "#b9f2ff", reputationRequired: 300, icon: "💠" },
};

export default PVP_OPPONENTS;
