import RAID_BOSSES from "../data/championChallenge";
import GUARD_DB from "../data/guards";
import ScreenHeader from "./ScreenHeader";

export default function ChampionScreen({ player, onStartFight, onBack }) {
  const beaten = player.raidsBeaten || {};

  return (
    <div className="screen">
      <ScreenHeader title="🏆 Champion Challenge" onBack={onBack} player={player} />

      <div style={{
        fontSize: 12, color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.5,
      }}>
        Face legendary raid bosses one at a time. Each victory unlocks the next
        and rewards you with the boss's spirit essence (first clear only).
        Costs 2 ⚡ per attempt. Failure does not lock you out — try again.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {RAID_BOSSES.map((boss, idx) => {
          const isBeaten = !!beaten[boss.id];
          const prevBeaten = idx === 0 || !!beaten[RAID_BOSSES[idx - 1].id];
          const levelOK = player.level >= boss.requiredLevel;
          const locked = !prevBeaten || !levelOK;
          const guardInfo = GUARD_DB[boss.guardId];
          const activeGuard = player.guards[player.activeGuard];

          return (
            <div
              key={boss.id}
              style={{
                background: "var(--card)", borderRadius: 12, padding: 14,
                border: `2px solid ${isBeaten ? "var(--success)" : locked ? "var(--border)" : "var(--accent)"}`,
                opacity: locked && !isBeaten ? 0.5 : 1,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 36 }}>{guardInfo?.emoji || "👹"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {boss.name}
                    {isBeaten && (
                      <span style={{
                        marginLeft: 8, background: "var(--success)", color: "#000",
                        padding: "1px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                      }}>BEATEN</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent)", fontStyle: "italic", marginTop: 2 }}>
                    "{boss.title}"
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>
                    Lv.{boss.bossLevel} {guardInfo?.bodyType} • Requires Summoner Lv.{boss.requiredLevel}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{
                fontSize: 11, color: "var(--text-dim)", marginBottom: 8,
                fontStyle: "italic", lineHeight: 1.4,
              }}>
                {locked && !prevBeaten
                  ? `🔒 Defeat ${RAID_BOSSES[idx - 1].name} to unlock`
                  : locked && !levelOK
                    ? `🔒 Reach Summoner Lv.${boss.requiredLevel}`
                    : boss.desc}
              </div>

              {/* Rewards */}
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 8 }}>
                Rewards: +{isBeaten ? Math.floor(boss.rewards.xp * 0.25) : boss.rewards.xp} XP,
                +{isBeaten ? Math.floor(boss.rewards.gold * 0.25) : boss.rewards.gold} 💰
                {!isBeaten && <span style={{ color: "var(--accent)" }}> • {boss.name} Spirit Essence</span>}
                {isBeaten && <span style={{ fontStyle: "italic" }}> (already beaten — reduced)</span>}
              </div>

              {/* Fight button */}
              {!locked && (
                <button
                  className="btn btn-primary"
                  style={{
                    width: "100%", fontSize: 13, padding: "8px 16px",
                    background: isBeaten ? "var(--card2)" : undefined,
                    color: isBeaten ? "var(--text)" : undefined,
                    border: isBeaten ? "1px solid var(--border)" : undefined,
                  }}
                  disabled={player.energy < 2 || !activeGuard}
                  onClick={() => onStartFight(boss.id)}
                >
                  {!activeGuard ? "No active guard!"
                    : player.energy < 2 ? "Need 2 ⚡"
                    : isBeaten ? `Re-challenge (2 ⚡)`
                    : `Challenge ${boss.name} (2 ⚡)`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
