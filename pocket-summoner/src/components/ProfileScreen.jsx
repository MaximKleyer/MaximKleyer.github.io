import ScreenHeader from "./ScreenHeader";
import { xpForLevel, maxEnergy } from "../engine/formulas";
import TYPE_CHART from "../data/typeChart";

export default function ProfileScreen({ player, onBack, onDeleteSave }) {
  const xpNeeded = xpForLevel(player.level);
  const max = maxEnergy(player.level);

  return (
    <div className="screen">
      <ScreenHeader title="👤 Profile" onBack={onBack} player={player} />

      <div style={{ background: "var(--card)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        {[
          ["Summoner", player.name],
          ["Level", player.level],
          ["XP", `${player.xp} / ${xpNeeded}`],
          ["Gold", `💰 ${player.gold}`],
          ["Energy", `⚡ ${player.energy} / ${max}`],
          ["Reputation", `⭐ ${player.reputation}`],
          ["Guards", player.guards.length],
          ["Spirits Held", Object.values(player.spirits).reduce((a, b) => a + b, 0)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
            }}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      {/* Type Chart */}
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        Type Effectiveness Chart
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
        {Object.entries(TYPE_CHART)
          .filter(([k]) => k !== "Normal")
          .map(([type, data]) => (
            <div
              key={type}
              style={{
                display: "flex", gap: 8, fontSize: 11, padding: "4px 8px",
                background: "var(--card)", borderRadius: 6,
              }}
            >
              <span style={{ fontWeight: 700, width: 80 }}>{type}</span>
              <span style={{ flex: 1, color: "var(--success)" }}>
                💪 {data.strong.join(", ") || "—"}
              </span>
              <span style={{ flex: 1, color: "var(--danger)" }}>
                🔻 {data.weak.join(", ") || "—"}
              </span>
            </div>
          ))}
      </div>

      {/* Delete save */}
      <button
        className="btn"
        style={{
          background: "transparent", border: "1px solid var(--danger)",
          color: "var(--danger)", width: "100%", fontSize: 12,
        }}
        onClick={() => {
          if (window.confirm("Delete your save? This cannot be undone!")) {
            onDeleteSave();
          }
        }}
      >
        Delete Save Data
      </button>
    </div>
  );
}
