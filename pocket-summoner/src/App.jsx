import { useState } from "react";
import "./styles/theme.css";
import useGameState from "./hooks/useGameState";
import TitleScreen from "./components/TitleScreen";
import MainMenu from "./components/MainMenu";
import QuestScreen from "./components/QuestScreen";
import GuardsScreen from "./components/GuardsScreen";
import ShopScreen from "./components/ShopScreen";
import ChampionScreen from "./components/ChampionScreen";
import BattleScreen from "./components/BattleScreen";
import BattleResultScreen from "./components/BattleResultScreen";
import ProfileScreen from "./components/ProfileScreen";
import BattleHubScreen from "./components/BattleHubScreen";
import PvpScreen from "./components/PvpScreen";
import TeamBattleScreen from "./components/TeamBattleScreen";
import SettingsScreen from "./components/SettingsScreen";

export default function App() {
  const game = useGameState();
  const {
    player, screen, setScreen, message,
    battleResult, setBattleResult,
    battleData, pvpData,
    selectedGuardIdx, setSelectedGuardIdx,
    selectedZone, setSelectedZone,
  } = game;

  const [pvpMode, setPvpMode] = useState("pvp1v1");

  // Get battle speed from settings
  const battleSpeed = player?.settings?.battleSpeed || "normal";

  function handleBattleComplete() {
    if (battleData?.pendingRewards?.isChampion) {
      game.completeChampionFight();
    } else {
      game.completeBattle();
    }
  }

  function handleResultContinue() {
    const r = battleResult;
    setBattleResult(null);
    if (r?.raidCleared || r?.raidFailed) {
      setScreen("champion");
    } else if (r?.isPvp) {
      setScreen("battleHub");
    } else {
      setScreen("quests");
    }
  }

  return (
    <>
      {message && <div className="toast">{message}</div>}

      {screen === "title" && (
        <TitleScreen
          onStart={game.startNewGame}
          hasSave={!!player}
          onContinue={() => setScreen("main")}
        />
      )}

      {screen === "main" && player && (
        <MainMenu player={player} onNavigate={setScreen} />
      )}

      {screen === "quests" && player && (
        <QuestScreen
          player={player}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          onProgressQuest={game.progressQuest}
          onDoEncounter={game.doEncounter}
          onBack={() => { setSelectedZone(null); setScreen("main"); }}
        />
      )}

      {screen === "champion" && player && (
        <ChampionScreen
          player={player}
          onStartFight={game.startChampionFight}
          onBack={() => setScreen("main")}
        />
      )}

      {screen === "battleHub" && player && (
        <BattleHubScreen
          player={player}
          onSelectMode={(mode) => {
            if (mode === "pvp1v1" || mode === "pvp3v3") {
              setPvpMode(mode);
              setScreen("pvp");
            }
          }}
          onBack={() => setScreen("main")}
        />
      )}

      {screen === "pvp" && player && (
        <PvpScreen
          player={player}
          mode={pvpMode}
          onStartMatch={game.startPvpMatch}
          onSaveSquad={game.saveSquad}
          onDeleteSquad={game.deleteSquad}
          onBack={() => setScreen("battleHub")}
        />
      )}

      {screen === "pvpBattle" && pvpData && (
        <TeamBattleScreen
          playerTeam={pvpData.playerTeam}
          enemyTeam={pvpData.enemyTeam}
          battleLog={pvpData.log}
          onComplete={game.completePvpMatch}
          speed={battleSpeed}
        />
      )}

      {screen === "guards" && player && (
        <GuardsScreen
          player={player}
          selectedIdx={selectedGuardIdx}
          onSelect={setSelectedGuardIdx}
          onAllocateStat={game.allocateStat}
          onResetStats={game.resetStats}
          onLevelUp={game.levelUpGuard}
          onEvolve={game.evolveGuard}
          onSetActive={game.setActiveGuard}
          onTogglePartyMember={game.togglePartyMember}
          onBack={() => setScreen("main")}
        />
      )}

      {screen === "shop" && player && (
        <ShopScreen
          player={player}
          onBuy={game.buyGuard}
          onBack={() => setScreen("main")}
        />
      )}

      {screen === "battle" && battleData && (
        <BattleScreen
          playerGuard={battleData.playerGuard}
          enemyGuard={battleData.enemyGuard}
          battleLog={battleData.log}
          onComplete={handleBattleComplete}
          speed={battleSpeed}
        />
      )}

      {screen === "battleResult" && battleResult && (
        <BattleResultScreen
          result={battleResult}
          onContinue={handleResultContinue}
        />
      )}

      {screen === "profile" && player && (
        <ProfileScreen
          player={player}
          onBack={() => setScreen("main")}
          onDeleteSave={game.deleteSave}
        />
      )}

      {screen === "settings" && player && (
        <SettingsScreen
          player={player}
          onUpdateSetting={game.updateSetting}
          onDeleteSave={game.deleteSave}
          onBack={() => setScreen("main")}
        />
      )}
    </>
  );
}
