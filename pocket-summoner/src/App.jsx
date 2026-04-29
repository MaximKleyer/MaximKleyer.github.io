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

export default function App() {
  const game = useGameState();
  const {
    player, screen, setScreen, message,
    battleResult, setBattleResult,
    battleData,
    selectedGuardIdx, setSelectedGuardIdx,
    selectedZone, setSelectedZone,
  } = game;

  // Route battle completion based on context
  function handleBattleComplete() {
    if (battleData?.pendingRewards?.isChampion) {
      game.completeChampionFight();
    } else {
      game.completeBattle();
    }
  }

  // Route battle result "Continue" based on where they came from
  function handleResultContinue() {
    const r = battleResult;
    setBattleResult(null);
    if (r?.championCleared || r?.championFailed || r?.championAdvance) {
      setScreen("champion");
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
    </>
  );
}
