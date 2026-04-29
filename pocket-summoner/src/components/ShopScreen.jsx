import GUARD_DB from "../data/guards";
import ScreenHeader from "./ScreenHeader";

export default function ShopScreen({ player, onBuy, onBack }) {
  const available = Object.values(GUARD_DB).filter((g) => g.cost > 0);

  return (
    <div className="screen">
      <ScreenHeader title="🏪 Spirit Shop" onBack={onBack} player={player} />

      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
        Trade spirits for guards. You need at least 1 spirit + gold to recruit.
      </div>

      {/* Spirit inventory */}
      <div style={{ background: "var(--card)", borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
        <strong>Your Spirits:</strong>{" "}
        {Object.keys(player.spirits).filter(id => player.spirits[id] > 0).length === 0
          ? "None yet — complete quests to find spirits!"
          : Object.entries(player.spirits)
              .filter(([, count]) => count > 0)
              .map(([id, count]) => (
                <span
                  key={id}
                  style={{
                    display: "inline-block", background: "rgba(240,192,64,0.12)",
                    color: "var(--accent)", padding: "2px 8px", borderRadius: 4,
                    margin: "2px 4px", fontSize: 11, fontWeight: 600,
                  }}
                >
                  {GUARD_DB[id]?.emoji} {GUARD_DB[id]?.name} ×{count}
                </span>
              ))
        }
      </div>

      {/* Guard cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {available.map((g) => {
          const owned = player.guards.find((pg) => pg.id === g.id);
          const hasSpirit = player.spirits[g.id] && player.spirits[g.id] >= 1;
          const canAfford = player.gold >= g.cost;

          return (
            <div
              key={g.id}
              style={{
                background: "var(--card)", borderRadius: 10, padding: 14,
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 32 }}>{g.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {g.name} <span className="type-badge">{g.bodyType}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{g.desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>💰 {g.cost}</span>
                {owned ? (
                  <span style={{
                    background: "var(--success)", color: "#000", padding: "3px 10px",
                    borderRadius: 4, fontSize: 11, fontWeight: 700,
                  }}>
                    OWNED
                  </span>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{
                      opacity: hasSpirit && canAfford ? 1 : 0.4,
                      padding: "6px 16px", fontSize: 13,
                    }}
                    disabled={!hasSpirit || !canAfford}
                    onClick={() => onBuy(g.id)}
                  >
                    {!hasSpirit ? "Need Spirit" : !canAfford ? "Can't Afford" : "Recruit"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
