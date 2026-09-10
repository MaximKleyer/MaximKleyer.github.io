export default function BattleResultScreen({ result, onContinue }) {
  const { battle, encounter, xp, gold, spiritFound, reduced,
          raidCleared, raidFailed, bossName, spiritsAwarded } = result;

  return (
    <div className="screen-center">
      <div style={{
        background: "var(--card)", borderRadius: 14, padding: 24,
        width: "100%", maxWidth: 400, textAlign: "center",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        {/* Title */}
        <h2 style={{
          fontFamily: "var(--font-pixel)", fontSize: 13,
          marginBottom: 8,
          color: result.isPvp
            ? (battle.won ? "var(--success)" : "var(--danger)")
            : raidFailed ? "var(--danger)"
            : raidCleared ? "var(--success)"
            : battle.won ? "var(--accent)" : "var(--danger)",
        }}>
          {result.isPvp
            ? (battle.won ? "🏆 PVP VICTORY!" : "💀 PVP DEFEAT")
            : raidCleared ? "🏆 RAID DEFEATED!"
            : raidFailed ? "💀 RAID FAILED"
            : battle.won ? "🏆 Victory!" : "💀 Defeat"
          }
        </h2>

        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
          {encounter}
        </div>

        {/* Raid failed info */}
        {raidFailed && (
          <div style={{
            background: "rgba(240,96,80,0.12)", border: "1px solid rgba(240,96,80,0.25)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            fontSize: 12, color: "var(--danger)",
          }}>
            {bossName} stands victorious. Train more and try again.
          </div>
        )}

        {/* Raid cleared first time info */}
        {raidCleared && spiritFound && (
          <div style={{
            background: "rgba(240,192,64,0.15)", border: "1px solid rgba(240,192,64,0.3)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            fontSize: 12, fontWeight: 700, color: "var(--accent)",
          }}>
            🌟 {bossName}'s essence has been added to your collection!
          </div>
        )}

        {/* Battle log */}
        <div style={{
          textAlign: "left", maxHeight: 160, overflowY: "auto",
          background: "var(--bg)", borderRadius: 8, padding: 10,
          marginBottom: 12, fontSize: 11, lineHeight: 1.7,
          fontFamily: "var(--font-mono)",
        }}>
          {battle.log.map((entry, i) => (
            <div key={i} style={{
              padding: "1px 0",
              color: entry.type === "win" ? "#4f8" : entry.type === "lose" ? "#f66" :
                entry.type === "header" ? "#fff" : entry.type === "player" ? "#8cf" : "#fc8",
              fontWeight: entry.type === "header" || entry.type === "win" || entry.type === "lose" ? 700 : 400,
            }}>
              {entry.damage != null ? `${entry.text} (-${entry.damage})` : entry.text}
            </div>
          ))}
        </div>

        {/* Rewards */}
        {(battle.won || raidCleared || result.isPvp) && (xp || gold || spiritFound || spiritsAwarded || result.isPvp) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0" }}>
            {reduced && (
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
                Already cleared — rewards reduced to 25%
              </div>
            )}
            {xp != null && xp > 0 && (
              <div style={{ background: "var(--card2)", borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 13 }}>
                +{xp} XP
              </div>
            )}
            {gold != null && gold > 0 && (
              <div style={{ background: "var(--card2)", borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 13 }}>
                +{gold} 💰
              </div>
            )}
            {spiritFound && (
              <div style={{
                background: "rgba(240,192,64,0.12)", color: "var(--accent)",
                border: "1px solid rgba(240,192,64,0.25)",
                borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 13,
              }}>
                🌟 Spirit Essence: {spiritFound}
              </div>
            )}
            {spiritsAwarded && spiritsAwarded.map((name, i) => (
              <div key={i} style={{
                background: "rgba(240,192,64,0.12)", color: "var(--accent)",
                border: "1px solid rgba(240,192,64,0.25)",
                borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 13,
              }}>
                🌟 Spirit Essence: {name}
              </div>
            ))}
            {result.isPvp && result.repChange != null && (
              <div style={{
                background: result.repChange >= 0 ? "rgba(64,216,128,0.12)" : "rgba(240,96,80,0.12)",
                color: result.repChange >= 0 ? "var(--success)" : "var(--danger)",
                border: `1px solid ${result.repChange >= 0 ? "rgba(64,216,128,0.25)" : "rgba(240,96,80,0.25)"}`,
                borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 13,
              }}>
                {result.repChange >= 0 ? "+" : ""}{result.repChange} ⭐ Reputation
              </div>
            )}
            {result.isPvp && result.survivors != null && battle.won && (
              <div style={{
                fontSize: 11, color: "var(--text-dim)", textAlign: "center", marginTop: 4,
              }}>
                {result.survivors} guard{result.survivors !== 1 ? "s" : ""} survived
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
