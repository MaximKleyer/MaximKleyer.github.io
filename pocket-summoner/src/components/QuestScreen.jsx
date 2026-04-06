import QUEST_ZONES from "../data/quests";
import GUARD_DB from "../data/guards";
import ScreenHeader from "./ScreenHeader";

export default function QuestScreen({
  player, selectedZone, onSelectZone, onProgressQuest, onDoEncounter, onBack,
}) {
  const zoneData = selectedZone ? QUEST_ZONES[selectedZone] : null;

  return (
    <div className="screen">
      <ScreenHeader title="🗺️ Zones" onBack={onBack} player={player} />

      {!zoneData ? (
        // Zone selection
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.values(QUEST_ZONES).map((z) => {
            const locked = player.level < z.requiredLevel;
            return (
              <button
                key={z.id}
                style={{
                  display: "flex", flexDirection: "column", padding: 16,
                  background: "var(--card)", borderRadius: 10,
                  border: "1px solid var(--border)", cursor: locked ? "not-allowed" : "pointer",
                  textAlign: "left", fontFamily: "var(--font-mono)",
                  color: "var(--text)", opacity: locked ? 0.4 : 1,
                }}
                disabled={locked}
                onClick={() => onSelectZone(z.id)}
              >
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{z.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  {locked
                    ? `🔒 Requires Lv. ${z.requiredLevel}`
                    : `${z.quests.length} quests • ${z.encounters.length} encounters`
                  }
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Zone detail — quests + encounters
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => onSelectZone(null)}
            style={{
              background: "none", border: "none", color: "var(--accent)",
              cursor: "pointer", fontWeight: 700, fontSize: 12,
              textAlign: "left", padding: "4px 0", fontFamily: "var(--font-mono)",
            }}
          >
            ← Back to Zones
          </button>

          {/* QUESTS SECTION */}
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px", color: "var(--accent)" }}>
            🔍 Quests
          </h3>
          {zoneData.quests.map((q) => {
            const locked = player.level < q.minLevel;
            const progress = player.questProgress?.[q.id] || 0;
            const pct = Math.floor((progress / q.energyRequired) * 100);
            return (
              <button
                key={q.id}
                style={{
                  display: "flex", flexDirection: "column", padding: 12,
                  background: "var(--card)", borderRadius: 8,
                  border: "1px solid var(--border)", cursor: locked ? "not-allowed" : "pointer",
                  textAlign: "left", fontFamily: "var(--font-mono)",
                  color: "var(--text)", opacity: locked ? 0.4 : 1,
                }}
                disabled={locked}
                onClick={() => onProgressQuest(q)}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                  {q.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>
                  {q.desc}
                </div>
                {/* Progress bar */}
                <div style={{
                  background: "var(--bg)", borderRadius: 4, height: 14,
                  position: "relative", overflow: "hidden", marginBottom: 4,
                }}>
                  <div style={{
                    background: pct >= 100 ? "var(--success)" : "linear-gradient(90deg, #4080f0, #60a0ff)",
                    height: "100%", borderRadius: 4, width: `${pct}%`, transition: "width 0.3s",
                  }} />
                  <span style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    textAlign: "center", fontSize: 9, lineHeight: "14px",
                    fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                  }}>
                    {progress}/{q.energyRequired} EN
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                  Reward: +{q.xp} XP • +{q.gold} 💰
                  {locked && <span> • 🔒 Lv.{q.minLevel}</span>}
                </div>
              </button>
            );
          })}

          {/* ENCOUNTERS SECTION */}
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "12px 0 4px", color: "#f66" }}>
            ⚔️ Spirit Encounters
          </h3>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>
            1 EN per fight. Win to earn Spirit Essence + rewards.
          </div>
          {zoneData.encounters.map((enc) => {
            const locked = player.level < enc.minLevel;
            const cleared = !!player.encounterClears?.[enc.id];
            const guardInfo = GUARD_DB[enc.guardId];
            return (
              <button
                key={enc.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 12,
                  background: "var(--card)", borderRadius: 8,
                  border: `1px solid ${cleared ? "var(--success)" : "var(--border)"}`,
                  cursor: locked ? "not-allowed" : "pointer",
                  textAlign: "left", fontFamily: "var(--font-mono)",
                  color: "var(--text)", opacity: locked ? 0.4 : 1,
                }}
                disabled={locked}
                onClick={() => onDoEncounter(enc)}
              >
                <span style={{ fontSize: 28 }}>{guardInfo?.emoji || "?"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {enc.name}
                    <span className="type-badge" style={{ marginLeft: 6 }}>{guardInfo?.bodyType}</span>
                    <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-dim)" }}>
                      Lv.{enc.enemyLevel}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                    1 EN • +{cleared ? Math.floor(enc.xp * 0.25) : enc.xp} XP • +{cleared ? Math.floor(enc.gold * 0.25) : enc.gold} 💰 • Spirit Essence
                    {cleared && <span style={{ color: "var(--success)", marginLeft: 4 }}>✓ Cleared</span>}
                    {locked && <span> • 🔒 Lv.{enc.minLevel}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
