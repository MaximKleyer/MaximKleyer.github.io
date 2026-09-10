import { useState, useEffect, useCallback, useRef } from "react";
import GUARD_DB from "../data/guards";
import RAID_BOSSES from "../data/championChallenge";
import { xpForLevel, guardLevelUpCost, maxEnergy, ENERGY_REGEN_MS, STAT_POINTS_PER_LEVEL } from "../engine/formulas";
import { runBattle, makeEnemyGuard } from "../engine/combat";
import PVP_OPPONENTS from "../data/pvpOpponents";
import { runTeamBattle, buildEnemyTeam } from "../engine/teamBattle";

const SAVE_KEY = "pocket-summoner-save";

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);

    // Migration: check if any guard IDs reference guards that no longer exist.
    // If so, invalidate the save to force a fresh start.
    if (save.guards) {
      for (const g of save.guards) {
        if (!GUARD_DB[g.id]) {
          console.warn(`Save references unknown guard "${g.id}" — clearing save`);
          localStorage.removeItem(SAVE_KEY);
          return null;
        }
        if (!g.statBonuses) {
          g.statBonuses = { ...GUARD_DB[g.id].statBonuses };
        }
      }
    }

    // Migrate new fields
    if (!save.partyIndices) {
      // Old saves: put activeGuard + first 5 others into party
      const indices = [save.activeGuard ?? 0];
      for (let i = 0; i < (save.guards?.length || 0) && indices.length < 6; i++) {
        if (!indices.includes(i)) indices.push(i);
      }
      save.partyIndices = indices;
    }
    if (!save.squads) save.squads = [];
    if (!save.settings) save.settings = { battleSpeed: "normal" };
    if (!save.raidsBeaten) save.raidsBeaten = {};
    return save;
  } catch (e) {
    console.warn("Failed to load save:", e);
  }
  return null;
}

function writeSave(player) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(player));
  } catch (e) {
    console.warn("Failed to save:", e);
  }
}

export default function useGameState() {
  const [player, setPlayer] = useState(() => loadSave());
  const [screen, setScreen] = useState(player ? "main" : "title");
  const [battleResult, setBattleResult] = useState(null);
  const [battleData, setBattleData] = useState(null); // for animated battle screen
  const [selectedGuardIdx, setSelectedGuardIdx] = useState(0);
  const [selectedZone, setSelectedZone] = useState(null);
  const [message, setMessage] = useState(null);
  const msgTimeout = useRef(null);
  const championCtx = useRef(null); // tracks { tierId, fightIdx } during champion battles
  const [pvpData, setPvpData] = useState(null);

  // Auto-save
  useEffect(() => {
    if (player) writeSave(player);
  }, [player]);

  // Energy regen
  useEffect(() => {
    if (!player) return;
    const timer = setInterval(() => {
      setPlayer((p) => {
        if (!p) return p;
        const max = maxEnergy(p.level);
        if (p.energy >= max) return p;
        return { ...p, energy: Math.min(max, p.energy + 1) };
      });
    }, ENERGY_REGEN_MS);
    return () => clearInterval(timer);
  }, [player?.level]);

  const showMsg = useCallback((text, duration = 2500) => {
    setMessage(text);
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setMessage(null), duration);
  }, []);

  // --- HELPERS ---

  function checkLevelUp(p) {
    let needed = xpForLevel(p.level);
    while (p.xp >= needed) {
      p.xp -= needed;
      p.level += 1;
      needed = xpForLevel(p.level);
    }
  }

  // --- ACTIONS ---

  function startNewGame(name) {
    const starter = GUARD_DB.dogiWhite;
    const newPlayer = {
      name,
      level: 1,
      xp: 0,
      gold: 200,
      energy: 8,
      reputation: 0,
      spirits: {},
      guards: [
        {
          id: "dogiWhite",
          name: "Dogi (White)",
          level: 1,
          stats: { ...starter.baseStats },
          statBonuses: { ...starter.statBonuses },
          statPoints: 0,
          bodyType: starter.bodyType,
          skills: [...starter.skills],
          emoji: starter.emoji,
        },
      ],
      activeGuard: 0,
      partyIndices: [0],   // up to 6 guards in active party (indices into guards[])
      squads: [],           // saved 3v3 squads: [{ name, indices: [i,j,k] }]
      settings: {
        battleSpeed: "normal", // "fast" | "normal" | "slow"
      },
      questProgress: {},
      encounterClears: {},
      raidsBeaten: {},
    };
    setPlayer(newPlayer);
    setScreen("main");
  }

  /** Spend 1 energy on a quest. When energyRequired is met, complete it. */
  function progressQuest(quest) {
    if (!player) return;
    if (player.energy < 1) { showMsg("Not enough Energy!"); return; }
    if (player.level < quest.minLevel) { showMsg(`Requires Summoner Level ${quest.minLevel}!`); return; }

    const newPlayer = { ...player, energy: player.energy - 1 };
    const progress = (newPlayer.questProgress[quest.id] || 0) + 1;
    newPlayer.questProgress = { ...newPlayer.questProgress, [quest.id]: progress };

    if (progress >= quest.energyRequired) {
      // Quest complete — award rewards and reset progress
      newPlayer.xp += quest.xp;
      newPlayer.gold += quest.gold;
      newPlayer.questProgress = { ...newPlayer.questProgress, [quest.id]: 0 };
      checkLevelUp(newPlayer);
      setPlayer(newPlayer);
      showMsg(`✅ ${quest.name} complete! +${quest.xp} XP, +${quest.gold} Gold`, 3000);
    } else {
      setPlayer(newPlayer);
      showMsg(`${quest.name}: ${progress}/${quest.energyRequired} energy`, 1500);
    }
  }

  /** Fight an encounter (1 EN). Goes to animated battle, then results. */
  function doEncounter(encounter) {
    if (!player) return;
    if (player.energy < 1) { showMsg("Not enough Energy!"); return; }
    if (player.level < encounter.minLevel) { showMsg(`Requires Summoner Level ${encounter.minLevel}!`); return; }

    const guard = player.guards[player.activeGuard];
    if (!guard) { showMsg("No active guard!"); return; }

    // Spend energy immediately
    const newPlayer = { ...player, energy: player.energy - 1 };
    const enemy = makeEnemyGuard(encounter.guardId, encounter.enemyLevel);
    const battle = runBattle(guard, enemy);

    // Pre-compute rewards (applied after battle animation)
    const alreadyCleared = !!newPlayer.encounterClears[encounter.id];
    const rewardMult = alreadyCleared ? 0.25 : 1;
    const pendingRewards = { encounter: encounter.name, battle, guardId: encounter.guardId };

    if (battle.won) {
      pendingRewards.xp = Math.floor(encounter.xp * rewardMult);
      pendingRewards.gold = Math.floor(encounter.gold * rewardMult);
      pendingRewards.reduced = alreadyCleared;
      pendingRewards.spiritFound = GUARD_DB[encounter.guardId]?.name || encounter.guardId;
    }

    setPlayer(newPlayer);
    setBattleData({
      playerGuard: guard,
      enemyGuard: enemy,
      log: battle.log,
      pendingRewards,
      encounter,
      alreadyCleared,
    });
    setScreen("battle");
  }

  /** Called when battle animation finishes — apply rewards and show results */
  function completeBattle() {
    if (!battleData || !player) return;

    const { pendingRewards, encounter, alreadyCleared } = battleData;
    const battle = pendingRewards.battle;

    if (battle.won) {
      const newPlayer = { ...player };
      newPlayer.xp += pendingRewards.xp;
      newPlayer.gold += pendingRewards.gold;

      const sid = pendingRewards.guardId;
      newPlayer.spirits = { ...newPlayer.spirits, [sid]: (newPlayer.spirits[sid] || 0) + 1 };

      if (!alreadyCleared) {
        newPlayer.encounterClears = { ...newPlayer.encounterClears, [encounter.id]: true };
      }

      checkLevelUp(newPlayer);
      setPlayer(newPlayer);
    }

    setBattleResult(pendingRewards);
    setBattleData(null);
    setScreen("battleResult");
  }

  /** Buy a guard from the shop using spirit + gold */
  function buyGuard(guardId) {
    if (!player) return;
    const template = GUARD_DB[guardId];
    if (!template) return;
    if (!player.spirits[guardId] || player.spirits[guardId] < 1) {
      showMsg("You need a Spirit Essence first!");
      return;
    }
    if (player.gold < template.cost) {
      showMsg("Not enough Gold!");
      return;
    }
    if (player.guards.find((g) => g.id === guardId)) {
      showMsg("Already have this guard!");
      return;
    }
    const newGuards = [
      ...player.guards,
      {
        id: guardId,
        name: template.name,
        level: 1,
        stats: { ...template.baseStats },
        statBonuses: { ...template.statBonuses },
        statPoints: 0,
        bodyType: template.bodyType,
        skills: [...template.skills],
        emoji: template.emoji,
      },
    ];
    const newSpirits = { ...player.spirits, [guardId]: player.spirits[guardId] - 1 };
    setPlayer({ ...player, guards: newGuards, spirits: newSpirits, gold: player.gold - template.cost });
    showMsg(`${template.name} joined your guards!`);
  }

  /** Level up a guard — costs gold, awards stat points */
  function levelUpGuard(guardIdx) {
    if (!player) return;
    const guard = player.guards[guardIdx];
    if (!guard) return;
    if (guard.level >= player.level) {
      showMsg("Guard can't exceed your level!");
      return;
    }
    const cost = guardLevelUpCost(guard.level);
    if (player.gold < cost) {
      showMsg(`Need ${cost} Gold!`);
      return;
    }
    const newGuards = [...player.guards];
    newGuards[guardIdx] = {
      ...guard,
      level: guard.level + 1,
      statPoints: (guard.statPoints || 0) + STAT_POINTS_PER_LEVEL,
    };
    setPlayer({ ...player, guards: newGuards, gold: player.gold - cost });
    showMsg(`${guard.name} leveled up! +${STAT_POINTS_PER_LEVEL} stat points`);
  }

  /** Spend 1 stat point on a stat */
  function allocateStat(guardIdx, stat, amount = 1) {
    if (!player) return;
    const guard = player.guards[guardIdx];
    if (!guard) return;
    const available = guard.statPoints || 0;
    if (available < 1) {
      showMsg("No stat points available! Level up your guard.");
      return;
    }
    // Don't over-spend if requesting more than available
    const spend = Math.min(amount, available);
    const newGuards = [...player.guards];
    newGuards[guardIdx] = {
      ...guard,
      stats: { ...guard.stats, [stat]: guard.stats[stat] + spend },
      statPoints: available - spend,
    };
    setPlayer({ ...player, guards: newGuards });
  }

  /** Reset a guard's stat allocation. Cost = 100 * guardLevel */
  function resetStats(guardIdx) {
    if (!player) return;
    const guard = player.guards[guardIdx];
    if (!guard) return;

    const cost = 100 * guard.level;
    if (player.gold < cost) {
      showMsg(`Need ${cost} Gold to reset stats!`);
      return;
    }

    // Get the base stats for this guard's current form
    const template = GUARD_DB[guard.id];
    if (!template) return;

    // Calculate total allocated points (current stats minus base stats)
    const baseStats = template.baseStats;
    let totalAllocated = 0;
    for (const s of Object.keys(baseStats)) {
      totalAllocated += Math.max(0, (guard.stats[s] || 0) - baseStats[s]);
    }

    // Refund all points + existing unspent
    const newGuards = [...player.guards];
    newGuards[guardIdx] = {
      ...guard,
      stats: { ...baseStats },
      statPoints: (guard.statPoints || 0) + totalAllocated,
    };

    setPlayer({ ...player, guards: newGuards, gold: player.gold - cost });
    showMsg(`Stats reset! ${totalAllocated + (guard.statPoints || 0)} points to reallocate.`);
  }

  /** Evolve a guard into its next form */
  function evolveGuard(guardIdx) {
    if (!player) return;
    const guard = player.guards[guardIdx];
    if (!guard) return;

    const currentTemplate = GUARD_DB[guard.id];
    if (!currentTemplate?.evolution) {
      showMsg("This guard can't evolve!");
      return;
    }

    const evo = currentTemplate.evolution;
    if (guard.level < evo.level) {
      showMsg(`Needs to be Lv.${evo.level} to evolve!`);
      return;
    }
    if (player.gold < (evo.goldCost || 0)) {
      showMsg(`Need ${evo.goldCost} Gold to evolve!`);
      return;
    }

    const target = GUARD_DB[evo.targetId];
    if (!target) return;

    // Upon evolution: replace base stats with new form's base stats,
    // keep allocated points (current - old base), gain new stat bonuses.
    const oldTemplate = GUARD_DB[guard.id];
    const oldBase = oldTemplate?.baseStats || guard.stats;
    const allocatedPoints = {};
    for (const s of Object.keys(oldBase)) {
      allocatedPoints[s] = Math.max(0, (guard.stats[s] || 0) - oldBase[s]);
    }
    const newStats = {};
    for (const s of Object.keys(target.baseStats)) {
      newStats[s] = target.baseStats[s] + (allocatedPoints[s] || 0);
    }

    const newGuards = [...player.guards];
    newGuards[guardIdx] = {
      ...guard,
      id: target.id,
      name: target.name,
      emoji: target.emoji,
      skills: [...target.skills],
      bodyType: target.bodyType,
      stats: newStats,
      statBonuses: { ...target.statBonuses },
    };

    setPlayer({ ...player, guards: newGuards, gold: player.gold - (evo.goldCost || 0) });
    showMsg(`🌟 ${guard.name} evolved into ${target.name}!`);
  }

  // ─── CHAMPION CHALLENGE ───

  /** Start a raid boss fight */
  function startChampionFight(bossId) {
    if (!player) return;
    if (player.energy < 2) { showMsg("Need 2 Energy for a raid!"); return; }

    const boss = RAID_BOSSES.find(b => b.id === bossId);
    if (!boss) return;
    if (player.level < boss.requiredLevel) {
      showMsg(`Requires Summoner Lv.${boss.requiredLevel}!`);
      return;
    }

    // Check if previous boss was beaten (linear unlock)
    const bossIdx = RAID_BOSSES.findIndex(b => b.id === bossId);
    if (bossIdx > 0) {
      const prevId = RAID_BOSSES[bossIdx - 1].id;
      if (!player.raidsBeaten?.[prevId]) {
        showMsg(`Defeat ${RAID_BOSSES[bossIdx - 1].name} first!`);
        return;
      }
    }

    const guard = player.guards[player.activeGuard];
    if (!guard) { showMsg("No active guard!"); return; }

    const newPlayer = { ...player, energy: player.energy - 2 };
    setPlayer(newPlayer);

    const enemy = makeEnemyGuard(boss.guardId, boss.bossLevel);
    enemy.name = boss.name; // use boss display name

    const battle = runBattle(guard, enemy);

    championCtx.current = { bossId };
    setBattleData({
      playerGuard: guard,
      enemyGuard: enemy,
      log: battle.log,
      pendingRewards: { battle, isChampion: true },
    });
    setScreen("battle");
  }

  /** Called after raid boss battle animation completes */
  function completeChampionFight() {
    if (!championCtx.current || !battleData || !player) {
      completeBattle();
      return;
    }

    const { bossId } = championCtx.current;
    const boss = RAID_BOSSES.find(b => b.id === bossId);
    const battle = battleData.pendingRewards.battle;
    championCtx.current = null;

    if (!battle.won) {
      setBattleData(null);
      setBattleResult({
        encounter: `${boss.name} — DEFEATED`,
        battle,
        raidFailed: true,
        bossName: boss.name,
      });
      setScreen("battleResult");
      return;
    }

    // Won the raid
    const newPlayer = { ...player };
    const wasAlreadyBeaten = !!newPlayer.raidsBeaten?.[bossId];
    const mult = wasAlreadyBeaten ? 0.25 : 1;

    newPlayer.xp += Math.floor(boss.rewards.xp * mult);
    newPlayer.gold += Math.floor(boss.rewards.gold * mult);

    // Award boss spirit essence on first clear only
    if (!wasAlreadyBeaten && boss.rewards.spiritId) {
      const sid = boss.rewards.spiritId;
      newPlayer.spirits = { ...newPlayer.spirits, [sid]: (newPlayer.spirits[sid] || 0) + 1 };
    }

    newPlayer.raidsBeaten = { ...(newPlayer.raidsBeaten || {}), [bossId]: true };

    checkLevelUp(newPlayer);
    setPlayer(newPlayer);
    setBattleData(null);
    setBattleResult({
      encounter: `${boss.name} — DEFEATED!`,
      battle,
      raidCleared: true,
      bossName: boss.name,
      xp: Math.floor(boss.rewards.xp * mult),
      gold: Math.floor(boss.rewards.gold * mult),
      spiritFound: !wasAlreadyBeaten ? GUARD_DB[boss.rewards.spiritId]?.name : null,
      reduced: wasAlreadyBeaten,
    });
    setScreen("battleResult");
  }

  function setActiveGuard(idx) {
    if (!player) return;
    setPlayer({ ...player, activeGuard: idx });
  }

  // ─── PARTY MANAGEMENT (active 6 guards) ───
  function togglePartyMember(idx) {
    if (!player) return;
    const party = [...(player.partyIndices || [])];
    const pos = party.indexOf(idx);
    if (pos !== -1) {
      // remove unless it's the last one
      if (party.length === 1) {
        showMsg("Party can't be empty!");
        return;
      }
      party.splice(pos, 1);
      // If active guard was removed, fall back to first in party
      let newActive = player.activeGuard;
      if (newActive === idx) newActive = party[0];
      setPlayer({ ...player, partyIndices: party, activeGuard: newActive });
    } else {
      if (party.length >= 6) {
        showMsg("Party full (max 6) — remove one first");
        return;
      }
      party.push(idx);
      setPlayer({ ...player, partyIndices: party });
    }
  }

  // ─── SQUADS (saved 3v3 teams) ───
  function saveSquad(name, indices) {
    if (!player) return;
    if (indices.length !== 3) {
      showMsg("Squad must have exactly 3 guards");
      return;
    }
    const squads = [...(player.squads || [])];
    if (squads.length >= 5) {
      showMsg("Max 5 squads. Delete one first.");
      return;
    }
    squads.push({ name: name || `Squad ${squads.length + 1}`, indices });
    setPlayer({ ...player, squads });
    showMsg(`Squad "${name}" saved!`);
  }

  function deleteSquad(squadIdx) {
    if (!player) return;
    const squads = [...(player.squads || [])];
    squads.splice(squadIdx, 1);
    setPlayer({ ...player, squads });
  }

  // ─── SETTINGS ───
  function updateSetting(key, value) {
    if (!player) return;
    setPlayer({
      ...player,
      settings: { ...(player.settings || {}), [key]: value },
    });
  }

  function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    setPlayer(null);
    setScreen("title");
  }

  /** Start a PVP match (1v1 or 3v3) */
  function startPvpMatch({ opponentId, teamIndices, mode }) {
    if (!player) return;

    // Find opponent across all tiers
    let opponent = null;
    for (const tier of Object.values(PVP_OPPONENTS)) {
      const found = tier.find(o => o.id === opponentId);
      if (found) { opponent = found; break; }
    }
    if (!opponent) { showMsg("Opponent not found"); return; }

    const energyCost = mode === "pvp3v3" ? 4 : 2;
    if (player.energy < energyCost) { showMsg("Not enough Energy!"); return; }

    // Build teams
    const playerTeam = teamIndices.map(i => player.guards[i]).filter(Boolean);
    const enemyRoster = mode === "pvp3v3" ? opponent.roster.slice(0, 3) : [opponent.roster[0]];
    const enemyTeam = buildEnemyTeam(enemyRoster);

    if (playerTeam.length === 0 || enemyTeam.length === 0) {
      showMsg("Invalid team setup");
      return;
    }

    // Spend energy and run battle
    const newPlayer = { ...player, energy: player.energy - energyCost };
    const battle = runTeamBattle(playerTeam, enemyTeam);

    // Pre-compute rewards
    const won = battle.won;
    const repChange = won ? opponent.reputation : -Math.floor(opponent.reputation / 3);
    const goldGain = won ? opponent.gold : 0;
    const xpGain = won ? opponent.xp : Math.floor(opponent.xp / 4);

    setPlayer(newPlayer);
    setPvpData({
      playerTeam,
      enemyTeam,
      log: battle.log,
      opponent,
      mode,
      pendingRewards: {
        won, repChange, goldGain, xpGain,
        playerSurvivors: battle.playerSurvivors,
        enemySurvivors: battle.enemySurvivors,
      },
    });
    setScreen("pvpBattle");
  }

  /** Apply PVP rewards after the battle animation completes */
  function completePvpMatch() {
    if (!pvpData || !player) return;
    const { pendingRewards, opponent, mode } = pvpData;

    const newPlayer = { ...player };
    newPlayer.reputation = Math.max(0, (newPlayer.reputation || 0) + pendingRewards.repChange);
    newPlayer.gold += pendingRewards.goldGain;
    newPlayer.xp += pendingRewards.xpGain;

    // Track wins
    newPlayer.pvpStats = newPlayer.pvpStats || { wins: 0, losses: 0 };
    if (pendingRewards.won) newPlayer.pvpStats.wins++;
    else newPlayer.pvpStats.losses++;

    checkLevelUp(newPlayer);
    setPlayer(newPlayer);

    setBattleResult({
      encounter: `${opponent.name} (${mode === "pvp3v3" ? "3v3" : "1v1"})`,
      battle: { won: pendingRewards.won, log: pvpData.log },
      xp: pendingRewards.xpGain,
      gold: pendingRewards.goldGain,
      isPvp: true,
      repChange: pendingRewards.repChange,
      survivors: pendingRewards.playerSurvivors,
    });
    setPvpData(null);
    setScreen("battleResult");
  }

  return {
    player,
    screen,
    setScreen,
    battleResult,
    setBattleResult,
    battleData,
    completeBattle,
    selectedGuardIdx,
    setSelectedGuardIdx,
    selectedZone,
    setSelectedZone,
    message,
    showMsg,
    startNewGame,
    progressQuest,
    doEncounter,
    buyGuard,
    levelUpGuard,
    allocateStat,
    resetStats,
    evolveGuard,
    startChampionFight,
    completeChampionFight,
    setActiveGuard,
    togglePartyMember,
    saveSquad,
    deleteSquad,
    updateSetting,
    deleteSave,
    pvpData,
    startPvpMatch,
    completePvpMatch,
  };
}
