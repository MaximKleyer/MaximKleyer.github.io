import CHAMPION_TIERS from "../data/championChallenge";
import GUARD_DB from "../data/guards";
import ScreenHeader from "./ScreenHeader";

export default function ChampionScreen({
  player, onStartFight, onBack,
}) {
  const progress = player.championProgress || {};
  // progress shape: { tierId: { currentFight: 0, cleared: false } }

  return (
    <div className="screen">
      <ScreenHeader title="🏆 Champion Challenge" onBack={onBack} player={player} />

      <div style={{
        fontSize: 12, color: "var(--text-dim)", marginBottom: 14,
        lineHeight: 1.5,
      }}>
        Fight through each tier's gauntlet without losing. If you fall, you restart the tier.
        Clear all fights to earn rare spirit essences.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHAMPION_TIERS.map((tier) => {
          const locked = player.level < tier.requiredLevel;
          const tierProg = progress[tier.id] || { currentFight: 0, cleared: false };
          const cleared = tierProg.cleared;
          const currentFight = tierProg.currentFight || 0;
          const activeGuard = player.guards[player.activeGuard];

          return (
            <div
              key={tier.id}
              style={{
                background: "var(--card)", borderRadius: 12, padding: 14,
                border: `1px solid ${cleared ? "var(--success)" : "var(--border)"}`,
                opacity: locked ? 0.4 : 1,
              }}
            >
              {/* Tier header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{tier.name}</span>
                  {cleared && <span style={{
                    marginLeft: 8, background: "var(--success)", color: "#000",
                    padding: "1px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                  }}>CLEARED</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  {locked ? `🔒 Lv.${tier.requiredLevel}` : `Lv.${tier.requiredLevel}+`}
                </span>
              </div>

              {/* Fight sequence */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                {tier.fights.map((fight, i) => {
                  const guard = GUARD_DB[fight.guardId];
                  const isNext = i === currentFight && !cleared;
                  const beaten = i < currentFight || cleared;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 8px", borderRadius: 6, fontSize: 11,
                        background: beaten ? "rgba(64,216,128,0.15)" : isNext ? "rgba(240,192,64,0.15)" : "var(--bg)",
                        border: `1px solid ${beaten ? "var(--success)" : isNext ? "var(--accent)" : "var(--border)"}`,
                        color: beaten ? "var(--success)" : isNext ? "var(--accent)" : "var(--text-dim)",
                        fontWeight: isNext ? 700 : 400,
                      }}
                    >
                      <span>{guard?.emoji || "?"}</span>
                      <span>Lv.{fight.level}</span>
                      {beaten && <span>✓</span>}
                    </div>
                  );
                })}
              </div>

              {/* Rewards preview */}
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 8 }}>
                Rewards: +{cleared ? Math.floor(tier.rewards.xp * 0.25) : tier.rewards.xp} XP,
                +{cleared ? Math.floor(tier.rewards.gold * 0.25) : tier.rewards.gold} 💰
                {tier.rewards.spirits.length > 0 && (
                  <span style={{ color: "var(--accent)" }}>
                    {" "}• Spirits: {tier.rewards.spirits.map(s => GUARD_DB[s]?.name || s).join(", ")}
                  </span>
                )}
                {cleared && <span style={{ fontStyle: "italic" }}> (reduced — already cleared)</span>}
              </div>

              {/* Fight button */}
              {!locked && (
                <button
                  className="btn btn-primary"
                  style={{
                    width: "100%", fontSize: 13, padding: "8px 16px",
                    background: cleared ? "var(--card2)" : undefined,
                    color: cleared ? "var(--text)" : undefined,
                    border: cleared ? "1px solid var(--border)" : undefined,
                  }}
                  disabled={player.energy < 1 || !activeGuard}
                  onClick={() => onStartFight(tier.id)}
                >
                  {cleared
                    ? `Re-challenge (Fight ${currentFight + 1}/${tier.fights.length})`
                    : currentFight > 0
                      ? `Continue — Fight ${currentFight + 1}/${tier.fights.length} (1 EN)`
                      : `Begin Challenge (1 EN per fight)`
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
