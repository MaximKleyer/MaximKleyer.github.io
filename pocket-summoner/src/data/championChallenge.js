// Champion Challenge — Boss gauntlet
// All guardIds verified against guards.js

const CHAMPION_TIERS = [
  {
    id: "apprentice", name: "Apprentice", requiredLevel: 8,
    fights: [
      { guardId: "miki", level: 8, name: "Apprentice's Miki" },
      { guardId: "trifishGreen", level: 9, name: "Apprentice's TriFish" },
      { guardId: "waaga", level: 10, name: "Apprentice's Waaga" },
    ],
    rewards: { xp: 500, gold: 1000, spirits: ["bulbheadYellow"] },
  },
  {
    id: "disciple", name: "Disciple", requiredLevel: 14,
    fights: [
      { guardId: "bulbheadYellow", level: 14, name: "Disciple's BulbHead" },
      { guardId: "bigiworm", level: 15, name: "Disciple's BigiWorm" },
      { guardId: "dasypus", level: 16, name: "Disciple's Dasypus" },
      { guardId: "magimanGreen", level: 17, name: "Disciple's Magiman" },
    ],
    rewards: { xp: 1200, gold: 2500, spirits: ["magimanGreen", "trifishBlue"] },
  },
  {
    id: "adept", name: "Adept", requiredLevel: 18,
    fights: [
      { guardId: "firebo", level: 18, name: "Adept's Firebo" },
      { guardId: "danworm", level: 19, name: "Adept's Danworm" },
      { guardId: "foorseOrange", level: 20, name: "Adept's Foorse" },
      { guardId: "danti", level: 21, name: "Adept's Danti" },
      { guardId: "roroca", level: 22, name: "Adept's Roroca" },
    ],
    rewards: { xp: 2000, gold: 4000, spirits: ["danda", "shin", "soulhunter"] },
  },
  {
    id: "expert", name: "Expert", requiredLevel: 22,
    fights: [
      { guardId: "rexaGrey", level: 23, name: "Expert's Rexa" },
      { guardId: "darkwizard", level: 24, name: "Expert's Darkwizard" },
      { guardId: "aircarri", level: 25, name: "Expert's Aircarri" },
      { guardId: "magus", level: 26, name: "Expert's Magus" },
      { guardId: "firewizard", level: 27, name: "Expert's Firewizard" },
    ],
    rewards: { xp: 3500, gold: 7000, spirits: ["cruispleuro", "rexliGrey", "goldha"] },
  },
  {
    id: "master", name: "Master", requiredLevel: 26,
    fights: [
      { guardId: "thor", level: 27, name: "Master's Thor" },
      { guardId: "bladeMaster", level: 28, name: "Master's Blade Master" },
      { guardId: "tosstanmastiff", level: 29, name: "Master's Tosstanmastiff" },
      { guardId: "inferno", level: 30, name: "Master's Inferno" },
      { guardId: "armedMickia", level: 30, name: "Master's Armed Mickia" },
    ],
    rewards: { xp: 5000, gold: 12000, spirits: ["thor", "elecgrain"] },
  },
  {
    id: "dragonMaster", name: "Dragon Master", requiredLevel: 30,
    fights: [
      { guardId: "traruza", level: 32, name: "Dragon Traruza" },
      { guardId: "akigowa", level: 32, name: "Dragon Akigowa" },
      { guardId: "iferasa", level: 32, name: "Dragon Iferasa" },
      { guardId: "skiinaa", level: 32, name: "Dragon Skiinaa" },
    ],
    rewards: { xp: 8000, gold: 20000, spirits: ["traruz", "akigosa", "iferasz", "skiinaza"] },
  },
];

export default CHAMPION_TIERS;
