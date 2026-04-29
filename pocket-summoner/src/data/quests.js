// Quest zones and encounters for Pocket Summoner Episode 1
// All guardId references verified against guards.js (191 guards from CSV)

const QUEST_ZONES = {
  basalonTown: {
    id: "basalonTown", name: "Basalon Town", requiredLevel: 1,
    quests: [
      { id: "bt_q1", name: "Patrol the Streets", type: "quest", energyRequired: 5, xp: 7500, gold: 15000, minLevel: 1, desc: "Walk the streets and keep the peace." },
      { id: "bt_q2", name: "Assisting in the Laboratory", type: "quest", energyRequired: 5, xp: 100, gold: 200, minLevel: 2, desc: "Help the professor with his spirit research." },
      { id: "bt_q3", name: "Exploring the Mystic House", type: "quest", energyRequired: 5, xp: 150, gold: 300, minLevel: 4, desc: "Investigate the haunted house on the edge of town." },
      { id: "bt_q4", name: "Report of Dark Matter", type: "quest", energyRequired: 5, xp: 200, gold: 400, minLevel: 8, desc: "Dark energy detected. Investigate the source." },
    ],
    encounters: [
      { id: "bt_e1", name: "Wild Miki", guardId: "miki", enemyLevel: 3, xp: 100, gold: 200, minLevel: 2 },
      { id: "bt_e2", name: "Wild Waaga", guardId: "waaga", enemyLevel: 6, xp: 175, gold: 300, minLevel: 4 },
      { id: "bt_e3", name: "Wild Spini", guardId: "spini", enemyLevel: 4, xp: 130, gold: 240, minLevel: 3 },
    ],
  },
  darkForest: {
    id: "darkForest", name: "The Dark Forest", requiredLevel: 5,
    quests: [
      { id: "df_q1", name: "Enter the Forest", type: "quest", energyRequired: 7, xp: 125, gold: 250, minLevel: 5, desc: "Brave the dark canopy and map the forest trails." },
      { id: "df_q2", name: "Check the Mystic Light", type: "quest", energyRequired: 7, xp: 200, gold: 400, minLevel: 8, desc: "A strange glow has been spotted deep in the forest." },
      { id: "df_q3", name: "Search for Treasure", type: "quest", energyRequired: 7, xp: 275, gold: 600, minLevel: 10, desc: "Rumors of buried crystals in the forest floor." },
    ],
    encounters: [
      { id: "df_e1", name: "Wild Green TriFish", guardId: "trifishGreen", enemyLevel: 5, xp: 200, gold: 350, minLevel: 5 },
      { id: "df_e2", name: "Wild BulbHead (Yellow)", guardId: "bulbheadYellow", enemyLevel: 10, xp: 250, gold: 450, minLevel: 8 },
      { id: "df_e3", name: "Wild BigiWorm", guardId: "bigiworm", enemyLevel: 12, xp: 275, gold: 500, minLevel: 10 },
      { id: "df_e4", name: "Wild Burgi", guardId: "burgi", enemyLevel: 6, xp: 160, gold: 280, minLevel: 5 },
      { id: "df_e5", name: "Wild Woodi", guardId: "woodi", enemyLevel: 8, xp: 200, gold: 350, minLevel: 6 },
    ],
  },
  beastPlain: {
    id: "beastPlain", name: "The Beast Plain", requiredLevel: 10,
    quests: [
      { id: "bp_q1", name: "Scout the Plains", type: "quest", energyRequired: 7, xp: 200, gold: 400, minLevel: 10, desc: "Map the vast open grasslands." },
      { id: "bp_q2", name: "Beast Hunt", type: "quest", energyRequired: 9, xp: 300, gold: 600, minLevel: 13, desc: "Track down dangerous wild spirits." },
    ],
    encounters: [
      { id: "bp_e1", name: "Wild Monki (Brown)", guardId: "monkiBrown", enemyLevel: 10, xp: 220, gold: 400, minLevel: 10 },
      { id: "bp_e2", name: "Wild Snacki", guardId: "snacki", enemyLevel: 11, xp: 240, gold: 440, minLevel: 10 },
      { id: "bp_e3", name: "Wild Rainbowfox", guardId: "rainbowfox", enemyLevel: 13, xp: 280, gold: 520, minLevel: 12 },
      { id: "bp_e4", name: "Wild Squidi", guardId: "squidi", enemyLevel: 10, xp: 220, gold: 400, minLevel: 10 },
      { id: "bp_e5", name: "Wild Mushi", guardId: "mushi", enemyLevel: 11, xp: 240, gold: 440, minLevel: 10 },
      { id: "bp_e6", name: "Wild Codi (BOSS)", guardId: "codi", enemyLevel: 16, xp: 400, gold: 800, minLevel: 14 },
    ],
  },
  spiritSands: {
    id: "spiritSands", name: "Spirit Sands", requiredLevel: 12,
    quests: [
      { id: "ss_q1", name: "Exploring the Desert", type: "quest", energyRequired: 9, xp: 250, gold: 500, minLevel: 12, desc: "Cross the scorching dunes into uncharted territory." },
      { id: "ss_q2", name: "Exploring the Pyramid", type: "quest", energyRequired: 9, xp: 325, gold: 650, minLevel: 14, desc: "An ancient pyramid hides secrets within." },
    ],
    encounters: [
      { id: "ss_e1", name: "Wild Red TriFish", guardId: "trifishRed", enemyLevel: 14, xp: 290, gold: 560, minLevel: 12 },
      { id: "ss_e2", name: "Wild Firebo", guardId: "firebo", enemyLevel: 14, xp: 300, gold: 580, minLevel: 12 },
      { id: "ss_e3", name: "Wild Cactuman", guardId: "cactuman", enemyLevel: 13, xp: 270, gold: 520, minLevel: 12 },
      { id: "ss_e4", name: "Wild Dasypus", guardId: "dasypus", enemyLevel: 16, xp: 320, gold: 600, minLevel: 14 },
      { id: "ss_e5", name: "Wild Firecrab", guardId: "firecrab", enemyLevel: 13, xp: 260, gold: 500, minLevel: 12 },
      { id: "ss_e6", name: "Wild Fireworm", guardId: "fireworm", enemyLevel: 14, xp: 290, gold: 560, minLevel: 13 },
    ],
  },
  kingsHeartForest: {
    id: "kingsHeartForest", name: "King's Heart Forest", requiredLevel: 14,
    quests: [
      { id: "kh_q1", name: "Collect King's Wood", type: "quest", energyRequired: 8, xp: 280, gold: 550, minLevel: 14, desc: "Gather rare wood from the ancient forest." },
      { id: "kh_q2", name: "Exploring the Hidden Path", type: "quest", energyRequired: 8, xp: 350, gold: 700, minLevel: 16, desc: "A secret trail leads deeper into the woods." },
    ],
    encounters: [
      { id: "kh_e1", name: "Wild Dogia", guardId: "dogia", enemyLevel: 14, xp: 300, gold: 550, minLevel: 14 },
      { id: "kh_e2", name: "Wild Steelha", guardId: "steelha", enemyLevel: 18, xp: 360, gold: 700, minLevel: 16 },
      { id: "kh_e3", name: "Wild Pa", guardId: "pa", enemyLevel: 10, xp: 220, gold: 400, minLevel: 14 },
      { id: "kh_e4", name: "Wild Mycena", guardId: "mycena", enemyLevel: 14, xp: 280, gold: 520, minLevel: 14 },
      { id: "kh_e5", name: "Wild Bigmouth", guardId: "bigmouth", enemyLevel: 12, xp: 250, gold: 460, minLevel: 14 },
    ],
  },
  darkshire: {
    id: "darkshire", name: "Darkshire", requiredLevel: 18,
    quests: [
      { id: "ds_q1", name: "Enter Darkshire", type: "quest", energyRequired: 10, xp: 300, gold: 600, minLevel: 18, desc: "The shadows grow thick as you approach the cursed village." },
      { id: "ds_q2", name: "Securing the Gate", type: "quest", energyRequired: 10, xp: 400, gold: 800, minLevel: 19, desc: "Defend the village gate from dark forces." },
      { id: "ds_q3", name: "Break In", type: "quest", energyRequired: 10, xp: 450, gold: 1000, minLevel: 20, desc: "Infiltrate the dark fortress." },
    ],
    encounters: [
      { id: "ds_e1", name: "Wild Magiman (Green)", guardId: "magimanGreen", enemyLevel: 18, xp: 360, gold: 700, minLevel: 18 },
      { id: "ds_e2", name: "Wild Magiman (Red)", guardId: "magimanRed", enemyLevel: 18, xp: 360, gold: 700, minLevel: 18 },
      { id: "ds_e3", name: "Wild Danti", guardId: "danti", enemyLevel: 20, xp: 420, gold: 840, minLevel: 19 },
      { id: "ds_e4", name: "Wild Danworm", guardId: "danworm", enemyLevel: 18, xp: 350, gold: 700, minLevel: 18 },
      { id: "ds_e5", name: "Wild Shadowimp", guardId: "shadowimp", enemyLevel: 20, xp: 420, gold: 840, minLevel: 19 },
      { id: "ds_e6", name: "Wild Nightimp", guardId: "nightimp", enemyLevel: 21, xp: 450, gold: 880, minLevel: 20 },
    ],
  },
  skyTower: {
    id: "skyTower", name: "Sky Tower", requiredLevel: 22,
    quests: [
      { id: "st_q1", name: "Entering the Sky Tower", type: "quest", energyRequired: 12, xp: 450, gold: 900, minLevel: 22, desc: "Ascend the legendary tower that reaches the clouds." },
      { id: "st_q2", name: "The Hidden Floor", type: "quest", energyRequired: 12, xp: 550, gold: 1100, minLevel: 24, desc: "A secret floor appears between the walls." },
    ],
    encounters: [
      { id: "st_e1", name: "Wild Roroca", guardId: "roroca", enemyLevel: 24, xp: 500, gold: 1000, minLevel: 22 },
      { id: "st_e2", name: "Wild Mickia", guardId: "mickia", enemyLevel: 18, xp: 380, gold: 740, minLevel: 22 },
      { id: "st_e3", name: "Wild Witch", guardId: "witch", enemyLevel: 20, xp: 420, gold: 820, minLevel: 22 },
    ],
  },
  greatLand: {
    id: "greatLand", name: "The Great Land", requiredLevel: 20,
    quests: [
      { id: "gl_q1", name: "Helping the Traveler", type: "quest", energyRequired: 10, xp: 380, gold: 750, minLevel: 20, desc: "A lost traveler needs an escort through dangerous terrain." },
      { id: "gl_q2", name: "Enter the Hidden Lair", type: "quest", energyRequired: 10, xp: 450, gold: 900, minLevel: 22, desc: "A hidden cave entrance reveals itself." },
    ],
    encounters: [
      { id: "gl_e1", name: "Wild Chicki (Pink)", guardId: "chickiPink", enemyLevel: 20, xp: 380, gold: 750, minLevel: 20 },
      { id: "gl_e2", name: "Wild Mopuppy", guardId: "mopuppy", enemyLevel: 18, xp: 350, gold: 700, minLevel: 20 },
      { id: "gl_e3", name: "Wild Foorse (Orange)", guardId: "foorseOrange", enemyLevel: 14, xp: 300, gold: 580, minLevel: 21 },
      { id: "gl_e4", name: "Wild Cruispleuro", guardId: "cruispleuro", enemyLevel: 22, xp: 450, gold: 900, minLevel: 21 },
      { id: "gl_e5", name: "Wild Foorse (Blue)", guardId: "foorseBlue", enemyLevel: 13, xp: 280, gold: 540, minLevel: 20 },
    ],
  },
  wallOfGaia: {
    id: "wallOfGaia", name: "Wall of Gaia", requiredLevel: 24,
    quests: [
      { id: "wg_q1", name: "Up on the Mountain", type: "quest", energyRequired: 12, xp: 500, gold: 1000, minLevel: 24, desc: "Scale the great wall to reach the summit." },
      { id: "wg_q2", name: "Exploring the Dino Base", type: "quest", energyRequired: 12, xp: 600, gold: 1200, minLevel: 26, desc: "Ancient dinosaur spirits roam this forgotten base." },
    ],
    encounters: [
      { id: "wg_e1", name: "Wild Rexli (Grey)", guardId: "rexliGrey", enemyLevel: 24, xp: 500, gold: 1000, minLevel: 24 },
      { id: "wg_e2", name: "Wild Rexli (Green)", guardId: "rexliGreen", enemyLevel: 24, xp: 500, gold: 1000, minLevel: 24 },
      { id: "wg_e3", name: "Wild Wooman", guardId: "wooman", enemyLevel: 22, xp: 460, gold: 920, minLevel: 24 },
      { id: "wg_e4", name: "Wild Magiman (Blue)", guardId: "magimanBlue", enemyLevel: 22, xp: 460, gold: 920, minLevel: 24 },
      { id: "wg_e5", name: "Wild Chicki (Yellow)", guardId: "chickiYellow", enemyLevel: 24, xp: 480, gold: 950, minLevel: 24 },
      { id: "wg_e6", name: "Wild Elecgrain", guardId: "elecgrain", enemyLevel: 20, xp: 420, gold: 820, minLevel: 24 },
    ],
  },
  drXLaboratory: {
    id: "drXLaboratory", name: "Dr. X Laboratory", requiredLevel: 24,
    quests: [
      { id: "dx_q1", name: "Exploring the Ground Floor", type: "quest", energyRequired: 12, xp: 520, gold: 1050, minLevel: 24, desc: "The mad scientist's lab is filled with danger." },
      { id: "dx_q2", name: "Disarm the Traps", type: "quest", energyRequired: 12, xp: 600, gold: 1200, minLevel: 26, desc: "Navigate through deadly traps to reach the core." },
    ],
    encounters: [
      { id: "dx_e1", name: "Wild Shade", guardId: "shade", enemyLevel: 22, xp: 450, gold: 900, minLevel: 24 },
      { id: "dx_e2", name: "Wild Masko (Blue)", guardId: "maskoBlue", enemyLevel: 20, xp: 420, gold: 820, minLevel: 24 },
      { id: "dx_e3", name: "Wild Masko (Green)", guardId: "maskoGreen", enemyLevel: 20, xp: 420, gold: 820, minLevel: 24 },
      { id: "dx_e4", name: "Wild Dark Masko", guardId: "darkMasko", enemyLevel: 22, xp: 460, gold: 920, minLevel: 25 },
    ],
  },
  dragonLair: {
    id: "dragonLair", name: "The Dragon Lair", requiredLevel: 28,
    quests: [
      { id: "dl_q1", name: "Enter the Dragon's Domain", type: "quest", energyRequired: 15, xp: 700, gold: 1400, minLevel: 28, desc: "The ancient lair pulses with draconic energy." },
      { id: "dl_q2", name: "The Dragon Master's Trial", type: "quest", energyRequired: 15, xp: 850, gold: 1700, minLevel: 30, desc: "Prove your worth to earn the title of Dragon Master." },
    ],
    encounters: [
      { id: "dl_e1", name: "Dragon Hatchling: Traruz", guardId: "traruz", enemyLevel: 24, xp: 600, gold: 1200, minLevel: 28 },
      { id: "dl_e2", name: "Dragon Hatchling: Akigosa", guardId: "akigosa", enemyLevel: 24, xp: 600, gold: 1200, minLevel: 28 },
      { id: "dl_e3", name: "Dragon Hatchling: Iferasz", guardId: "iferasz", enemyLevel: 24, xp: 600, gold: 1200, minLevel: 28 },
      { id: "dl_e4", name: "Dragon Hatchling: Skiinaza", guardId: "skiinaza", enemyLevel: 24, xp: 600, gold: 1200, minLevel: 28 },
    ],
  },
};

export default QUEST_ZONES;
