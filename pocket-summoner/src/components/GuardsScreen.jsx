import ScreenHeader from "./ScreenHeader";
import GUARD_DB from "../data/guards";
import { guardLevelUpCost, STAT_POINTS_PER_LEVEL } from "../engine/formulas";

const STAT_NAMES = ["atk", "def", "matk", "mdef", "spd", "int"];
const STAT_LABELS = { atk: "ATK", def: "DEF", matk: "MATK", mdef: "MDEF", spd: "SPD", int: "INT" };

export default function GuardsScreen({
  player, selectedIdx, onSelect, onAllocateStat, onResetStats, onLevelUp, onEvolve, onSetActive, onBack,
}) {
  const guard = player.guards[selectedIdx];
  const points = guard?.statPoints || 0;
  const template = guard ? GUARD_DB[guard.id] : null;
  const evo = template?.evolution;
  const canEvolve = evo && guard.level >= evo.level && player.gold >= (evo.goldCost || 0);
  const evoTarget = evo ? GUARD_DB[evo.targetId] : null;

  return (
    <div className="screen">
      <ScreenHeader title="🛡️ Guards" onBack={onBack} player={player} />

      {/* Guard tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {player.guards.map((g, i) => (
          <button
            key={i}
            style={{
              padding: "6px 12px", borderRadius: 6,
              border: "1px solid var(--border)", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)",
              background: i === selectedIdx ? "var(--accent)" : "var(--card)",
              color: i === selectedIdx ? "#000" : "var(--text)",
            }}
            onClick={() => onSelect(i)}
          >
            {g.emoji} {g.name}
          </button>
        ))}
      </div>

      {guard && (
        <div style={{ background: "var(--card)", borderRadius: 12, padding: 16 }}>
          {/* Guard header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 48 }}>{guard.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>
                {guard.name} <span className="type-badge">{guard.bodyType}</span>
              </div>
              <div style={{
                fontSize: 13, color: "var(--text-dim)", marginTop: 2,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                Lv. {guard.level}
                {player.activeGuard === selectedIdx ? (
                  <span style={{
                    background: "var(--success)", color: "#000", padding: "1px 8px",
                    borderRadius: 4, fontSize: 10, fontWeight: 700,
                  }}>
                    ACTIVE
                  </span>
                ) : (
                  <button
                    onClick={() => onSetActive(selectedIdx)}
                    style={{
                      background: "var(--card2)", border: "1px solid var(--border)",
                      borderRadius: 4, padding: "2px 8px", color: "var(--accent)",
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Set Active
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stat points banner */}
          {points > 0 && (
            <div style={{
              background: "rgba(240,192,64,0.15)", border: "1px solid rgba(240,192,64,0.3)",
              borderRadius: 8, padding: "8px 12px", marginBottom: 12,
              fontSize: 13, fontWeight: 700, color: "var(--accent)", textAlign: "center",
            }}>
              🎯 {points} stat point{points !== 1 ? "s" : ""} to allocate!
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {STAT_NAMES.map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`stat-${s}`} style={{ width: 40, fontSize: 11, fontWeight: 700, textAlign: "right" }}>
                  {STAT_LABELS[s]}
                </span>
                <div style={{ flex: 1, height: 10, background: "var(--bg)", borderRadius: 5, overflow: "hidden" }}>
                  <div className={`stat-bar-${s}`} style={{
                    height: "100%", borderRadius: 5, transition: "width 0.3s",
                    width: `${Math.min(100, guard.stats[s])}%`,
                  }} />
                </div>
                <span style={{ width: 52, textAlign: "right", fontSize: 11, fontWeight: 700 }}>
                  {guard.stats[s]}
                  {(guard.statBonuses?.[s] || 0) > 0 && (
                    <span style={{ color: "var(--success)", fontSize: 9, marginLeft: 2 }}>
                      +{guard.statBonuses[s]}%
                    </span>
                  )}
                </span>
                <button
                  onClick={() => onAllocateStat(selectedIdx, s)}
                  disabled={points < 1}
                  style={{
                    background: points > 0 ? "var(--accent)" : "var(--card2)",
                    border: "1px solid var(--border)",
                    borderRadius: 4, padding: "2px 8px",
                    color: points > 0 ? "#000" : "var(--text-dim)",
                    fontSize: 10, fontWeight: 700,
                    cursor: points > 0 ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                    opacity: points > 0 ? 1 : 0.4,
                  }}
                >
                  +1
                </button>
              </div>
            ))}
          </div>

          {/* Reset stats button */}
          <button
            onClick={() => onResetStats(selectedIdx)}
            style={{
              background: "transparent", border: "1px solid var(--danger)",
              borderRadius: 6, padding: "4px 12px", color: "var(--danger)",
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-mono)", marginBottom: 10, width: "100%",
            }}
          >
            Reset Stats ({100 * guard.level}g)
          </button>

          {/* Skills with PHY/SPC labels */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text-dim)" }}>
              Skills:
            </div>
            {guard.skills.map((sk, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, padding: "4px 0",
                borderBottom: i < guard.skills.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{
                  display: "inline-block",
                  background: sk.physical ? "rgba(255,102,102,0.2)" : "rgba(136,136,255,0.2)",
                  color: sk.physical ? "#f88" : "#aaf",
                  padding: "1px 5px", borderRadius: 3,
                  fontSize: 9, fontWeight: 700, minWidth: 30, textAlign: "center",
                }}>
                  {sk.physical ? "PHY" : "SPC"}
                </span>
                <span style={{ fontWeight: 600, flex: 1 }}>{sk.name}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{sk.type}</span>
                <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>
                  {sk.power}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {/* Level up */}
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => onLevelUp(selectedIdx)}
              disabled={guard.level >= player.level}
            >
              {guard.level >= player.level
                ? "Guard at max level (= your level)"
                : `Level Up (${guardLevelUpCost(guard.level)}g) → +${STAT_POINTS_PER_LEVEL} pts`
              }
            </button>

            {/* Evolution */}
            {evo && evoTarget && (
              <button
                className="btn"
                style={{
                  width: "100%",
                  background: canEvolve
                    ? "linear-gradient(135deg, #f0c040, #ff8800)"
                    : "var(--card2)",
                  color: canEvolve ? "#000" : "var(--text-dim)",
                  border: canEvolve ? "none" : "1px solid var(--border)",
                  fontWeight: 700,
                }}
                onClick={() => onEvolve(selectedIdx)}
                disabled={!canEvolve}
              >
                {guard.level < evo.level
                  ? `🌟 Evolve → ${evoTarget.name} (Lv.${evo.level} required)`
                  : player.gold < (evo.goldCost || 0)
                    ? `🌟 Evolve → ${evoTarget.name} (${evo.goldCost}g needed)`
                    : `🌟 Evolve into ${evoTarget.name}! (${evo.goldCost}g)`
                }
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
