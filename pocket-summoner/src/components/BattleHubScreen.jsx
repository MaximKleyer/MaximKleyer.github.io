import ScreenHeader from "./ScreenHeader";

export default function BattleHubScreen({ player, onSelectMode, onBack }) {
  const modes = [
    {
      id: "pvp1v1",
      label: "1v1 Duel",
      icon: "⚔️",
      desc: "Single guard vs single guard. Quick matches.",
      color: "#4a9",
      enabled: true,
      energyCost: 2,
    },
    {
      id: "pvp3v3",
      label: "3v3 Team",
      icon: "🛡️",
      desc: "Build a team of three. Sequential battles.",
      color: "#68c",
      enabled: player.guards.length >= 3,
      energyCost: 4,
      lockReason: player.guards.length < 3 ? "Need 3+ guards" : null,
    },
    {
      id: "tournament",
      label: "Tournament",
      icon: "🏆",
      desc: "Bracket-style tournament against multiple opponents.",
      color: "#c84",
      enabled: false,
      lockReason: "Coming soon",
    },
    {
      id: "guildWars",
      label: "Guild Wars",
      icon: "⚔️🏰",
      desc: "Join a guild and battle other guilds for glory.",
      color: "#a6d",
      enabled: false,
      lockReason: "Coming soon",
    },
  ];

  return (
    <div className="screen">
      <ScreenHeader title="⚔️ Battle" onBack={onBack} player={player} />

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--card)", borderRadius: 10, padding: "10px 14px",
        marginBottom: 14, border: "1px solid var(--border)",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Reputation</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>
            ⭐ {player.reputation || 0}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Active Guards</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{player.guards.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            disabled={!m.enabled}
            onClick={() => m.enabled && onSelectMode(m.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: 16,
              background: "var(--card)", borderRadius: 12,
              border: `2px solid ${m.enabled ? m.color : "var(--border)"}`,
              cursor: m.enabled ? "pointer" : "not-allowed",
              textAlign: "left", fontFamily: "var(--font-mono)",
              color: "var(--text)", opacity: m.enabled ? 1 : 0.5,
              transition: "transform 0.1s",
            }}
            onMouseEnter={(e) => m.enabled && (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <span style={{ fontSize: 32 }}>{m.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: m.color }}>
                {m.label}
                {m.energyCost && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, color: "var(--text-dim)", fontWeight: 400,
                  }}>
                    ⚡ {m.energyCost} EN
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>
                {m.desc}
              </div>
              {m.lockReason && (
                <div style={{ fontSize: 10, color: "var(--danger)", marginTop: 4, fontWeight: 700 }}>
                  🔒 {m.lockReason}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
