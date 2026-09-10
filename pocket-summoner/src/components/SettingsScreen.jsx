import ScreenHeader from "./ScreenHeader";

const BATTLE_SPEEDS = [
  { id: "fast", label: "Fast", desc: "Quick animations (~0.8s per turn)" },
  { id: "normal", label: "Normal", desc: "Standard pacing (~1.5s per turn)" },
  { id: "slow", label: "Slow", desc: "Cinematic pacing (~2.5s per turn)" },
];

export default function SettingsScreen({ player, onUpdateSetting, onDeleteSave, onBack }) {
  const settings = player.settings || { battleSpeed: "normal" };

  return (
    <div className="screen">
      <ScreenHeader title="⚙️ Settings" onBack={onBack} player={player} />

      {/* Battle speed */}
      <div style={{ background: "var(--card)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Battle Animation Speed</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>
          How fast battles play out on screen
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {BATTLE_SPEEDS.map(speed => {
            const active = settings.battleSpeed === speed.id;
            return (
              <button
                key={speed.id}
                onClick={() => onUpdateSetting("battleSpeed", speed.id)}
                style={{
                  padding: 10, borderRadius: 8,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "rgba(240,192,64,0.12)" : "var(--bg)",
                  color: "var(--text)", cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, color: active ? "var(--accent)" : "var(--text)" }}>
                  {speed.label} {active && "✓"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                  {speed.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Game info */}
      <div style={{ background: "var(--card)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Game Info</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.7 }}>
          <div>Version: 0.4.0 — PVP & Raids Update</div>
          <div>Energy regen: 1 ⚡ every 15 seconds</div>
          <div>Save data: stored locally in your browser</div>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{
        background: "var(--card)", borderRadius: 12, padding: 16,
        border: "1px solid rgba(240,96,80,0.3)", marginBottom: 12,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "var(--danger)" }}>
          Danger Zone
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
          This action cannot be undone.
        </div>
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
    </div>
  );
}
