import { useState, useEffect, useCallback, useRef } from "react";
import GUARD_DB from "../data/guards";
import CHAMPION_TIERS from "../data/championChallenge";
import { xpForLevel, guardLevelUpCost, maxEnergy, ENERGY_REGEN_MS, STAT_POINTS_PER_LEVEL } from "../engine/formulas";
import { runBattle, makeEnemyGuard } from "../engine/combat";

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
        // Ensure statBonuses field exists (for old saves from before bonuses)
        if (!g.statBonuses) {
          g.statBonuses = { ...GUARD_DB[g.id].statBonuses };
        }
      }
    }
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
      // Track quest progress: { questId: energySpent }
      questProgress: {},
      // Track encounter clears: { encounterId: true }
      encounterClears: {},
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
  function allocateStat(guardIdx, stat) {
    if (!player) return;
    const guard = player.guards[guardIdx];
    if (!guard) return;
    if ((guard.statPoints || 0) < 1) {
      showMsg("No stat points available! Level up your guard.");
      return;
    }
    const newGuards = [...player.guards];
    newGuards[guardIdx] = {
      ...guard,
      stats: { ...guard.stats, [stat]: guard.stats[stat] + 1 },
      statPoints: guard.statPoints - 1,
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

  /** Start the next fight in a champion tier */
  function startChampionFight(tierId) {
    if (!player) return;
    if (player.energy < 1) { showMsg("Not enough Energy!"); return; }

    const tier = CHAMPION_TIERS.find(t => t.id === tierId);
    if (!tier) return;
    if (player.level < tier.requiredLevel) { showMsg(`Requires Lv.${tier.requiredLevel}!`); return; }

    const guard = player.guards[player.activeGuard];
    if (!guard) { showMsg("No active guard!"); return; }

    const prog = player.championProgress?.[tierId] || { currentFight: 0, cleared: false };
    const fightIdx = prog.cleared ? 0 : prog.currentFight; // restart if re-challenging
    const fight = tier.fights[fightIdx];
    if (!fight) return;

    const newPlayer = { ...player, energy: player.energy - 1 };

    // If re-challenging, reset progress
    if (prog.cleared) {
      newPlayer.championProgress = {
        ...newPlayer.championProgress,
        [tierId]: { currentFight: 0, cleared: false },
      };
    }

    setPlayer(newPlayer);

    const enemy = makeEnemyGuard(fight.guardId, fight.level);
    // Override enemy name with the challenge name
    enemy.name = fight.name;

    const battle = runBattle(guard, enemy);

    championCtx.current = { tierId, fightIdx };
    setBattleData({
      playerGuard: guard,
      enemyGuard: enemy,
      log: battle.log,
      pendingRewards: { battle, isChampion: true },
    });
    setScreen("battle");
  }

  /** Called after champion battle animation completes */
  function completeChampionFight() {
    if (!championCtx.current || !battleData || !player) {
      // Fallback — not a champion fight, use normal complete
      completeBattle();
      return;
    }

    const { tierId, fightIdx } = championCtx.current;
    const tier = CHAMPION_TIERS.find(t => t.id === tierId);
    const battle = battleData.pendingRewards.battle;
    championCtx.current = null;

    if (!battle.won) {
      // Lost — reset tier progress
      const newPlayer = { ...player };
      newPlayer.championProgress = {
        ...newPlayer.championProgress,
        [tierId]: { currentFight: 0, cleared: false },
      };
      setPlayer(newPlayer);
      setBattleData(null);
      setBattleResult({
        encounter: `${tier.name} Challenge — FAILED`,
        battle,
        championFailed: true,
        tierName: tier.name,
      });
      setScreen("battleResult");
      return;
    }

    // Won this fight
    const newPlayer = { ...player };
    const nextFight = fightIdx + 1;
    const tierCleared = nextFight >= tier.fights.length;
    const wasAlreadyCleared = !!newPlayer.championProgress?.[tierId]?.cleared;

    if (tierCleared) {
      // Tier complete — award rewards
      const mult = wasAlreadyCleared ? 0.25 : 1;
      newPlayer.xp += Math.floor(tier.rewards.xp * mult);
      newPlayer.gold += Math.floor(tier.rewards.gold * mult);

      // Award spirit essences
      for (const sid of tier.rewards.spirits) {
        newPlayer.spirits = { ...newPlayer.spirits, [sid]: (newPlayer.spirits[sid] || 0) + 1 };
      }

      newPlayer.championProgress = {
        ...newPlayer.championProgress,
        [tierId]: { currentFight: 0, cleared: true },
      };

      checkLevelUp(newPlayer);
      setPlayer(newPlayer);
      setBattleData(null);
      setBattleResult({
        encounter: `${tier.name} Challenge — COMPLETE!`,
        battle,
        championCleared: true,
        tierName: tier.name,
        xp: Math.floor(tier.rewards.xp * mult),
        gold: Math.floor(tier.rewards.gold * mult),
        spiritsAwarded: tier.rewards.spirits.map(s => GUARD_DB[s]?.name || s),
        reduced: wasAlreadyCleared,
      });
      setScreen("battleResult");
    } else {
      // Advance to next fight
      newPlayer.championProgress = {
        ...newPlayer.championProgress,
        [tierId]: { currentFight: nextFight, cleared: false },
      };
      setPlayer(newPlayer);
      setBattleData(null);
      setBattleResult({
        encounter: `${tier.name} — Fight ${fightIdx + 1}/${tier.fights.length} WON`,
        battle,
        championAdvance: true,
        tierName: tier.name,
        nextFight: nextFight + 1,
        totalFights: tier.fights.length,
      });
      setScreen("battleResult");
    }
  }

  function setActiveGuard(idx) {
    if (!player) return;
    setPlayer({ ...player, activeGuard: idx });
  }

  function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    setPlayer(null);
    setScreen("title");
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
    deleteSave,
  };
}
