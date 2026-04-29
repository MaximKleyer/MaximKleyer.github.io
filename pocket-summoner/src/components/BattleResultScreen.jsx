export default function BattleResultScreen({ result, onContinue }) {
  const { battle, encounter, xp, gold, spiritFound, reduced,
          championCleared, championFailed, championAdvance,
          tierName, nextFight, totalFights, spiritsAwarded } = result;

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
          color: championFailed ? "var(--danger)"
            : championCleared ? "var(--success)"
            : battle.won ? "var(--accent)" : "var(--danger)",
        }}>
          {championCleared ? "🏆 TIER CLEARED!" :
           championFailed ? "💀 CHALLENGE FAILED" :
           championAdvance ? "✅ Fight Won!" :
           battle.won ? "🏆 Victory!" : "💀 Defeat"}
        </h2>

        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
          {encounter}
        </div>

        {/* Champion advance info */}
        {championAdvance && (
          <div style={{
            background: "rgba(240,192,64,0.12)", border: "1px solid rgba(240,192,64,0.25)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            fontSize: 13, fontWeight: 700, color: "var(--accent)",
          }}>
            Next up: Fight {nextFight}/{totalFights}
          </div>
        )}

        {/* Champion failed info */}
        {championFailed && (
          <div style={{
            background: "rgba(240,96,80,0.12)", border: "1px solid rgba(240,96,80,0.25)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            fontSize: 12, color: "var(--danger)",
          }}>
            Progress in {tierName} tier has been reset. Try again!
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
        {(battle.won || championCleared) && (xp || gold || spiritFound || spiritsAwarded) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0" }}>
            {reduced && (
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
                {championCleared ? "Already cleared — rewards reduced" : "Already cleared — rewards reduced to 25%"}
              </div>
            )}
            {xp != null && (
              <div style={{ background: "var(--card2)", borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 13 }}>
                +{xp} XP
              </div>
            )}
            {gold != null && (
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
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
