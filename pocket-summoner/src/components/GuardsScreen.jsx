import { useState } from "react";
import ScreenHeader from "./ScreenHeader";
import GUARD_DB from "../data/guards";
import { guardLevelUpCost, STAT_POINTS_PER_LEVEL } from "../engine/formulas";

const STAT_NAMES = ["atk", "def", "matk", "mdef", "spd", "int"];
const STAT_LABELS = { atk: "ATK", def: "DEF", matk: "MATK", mdef: "MDEF", spd: "SPD", int: "INT" };

export default function GuardsScreen({
  player, selectedIdx, onSelect, onAllocateStat, onResetStats,
  onLevelUp, onEvolve, onSetActive, onTogglePartyMember, onBack,
}) {
  const [view, setView] = useState("party"); // "party" or "storage"
  const [storageSort, setStorageSort] = useState("rank"); // "rank" | "name" | "type" | "level"

  const guard = player.guards[selectedIdx];
  const points = guard?.statPoints || 0;
  const template = guard ? GUARD_DB[guard.id] : null;
  const evo = template?.evolution;
  const canEvolve = evo && guard.level >= evo.level && player.gold >= (evo.goldCost || 0);
  const evoTarget = evo ? GUARD_DB[evo.targetId] : null;

  const partyIndices = player.partyIndices || [player.activeGuard ?? 0];
  const partyGuards = partyIndices.map(i => ({ idx: i, g: player.guards[i] })).filter(x => x.g);
  const storageGuards = player.guards
    .map((g, idx) => ({ idx, g }))
    .filter(x => !partyIndices.includes(x.idx));

  // Sort storage
  const sortedStorage = [...storageGuards].sort((a, b) => {
    switch (storageSort) {
      case "name": return a.g.name.localeCompare(b.g.name);
      case "type": return a.g.bodyType.localeCompare(b.g.bodyType);
      case "level": return b.g.level - a.g.level;
      case "rank":
      default: return (GUARD_DB[b.g.id]?.rank || 0) - (GUARD_DB[a.g.id]?.rank || 0);
    }
  });

  const isPartyMember = partyIndices.includes(selectedIdx);

  return (
    <div className="screen">
      <ScreenHeader title="🛡️ Guards" onBack={onBack} player={player} />

      {/* View toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => setView("party")}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 6,
            border: "1px solid var(--border)", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)",
            background: view === "party" ? "var(--accent)" : "var(--card)",
            color: view === "party" ? "#000" : "var(--text)",
          }}
        >
          ⭐ Party ({partyGuards.length}/6)
        </button>
        <button
          onClick={() => setView("storage")}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 6,
            border: "1px solid var(--border)", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)",
            background: view === "storage" ? "var(--accent)" : "var(--card)",
            color: view === "storage" ? "#000" : "var(--text)",
          }}
        >
          📦 Storage ({storageGuards.length})
        </button>
      </div>

      {/* Party view */}
      {view === "party" && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
          {partyGuards.map(({ idx, g }) => (
            <button
              key={idx}
              style={{
                padding: "6px 10px", borderRadius: 6,
                border: "1px solid var(--border)", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)",
                background: idx === selectedIdx ? "var(--accent)" : "var(--card)",
                color: idx === selectedIdx ? "#000" : "var(--text)",
              }}
              onClick={() => onSelect(idx)}
            >
              {g.emoji} {g.name} L{g.level}
              {idx === player.activeGuard && <span style={{ marginLeft: 4 }}>★</span>}
            </button>
          ))}
        </div>
      )}

      {/* Storage view */}
      {view === "storage" && (
        <>
          {/* Sort dropdown */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Sort:</span>
            {["rank", "name", "type", "level"].map(s => (
              <button
                key={s}
                onClick={() => setStorageSort(s)}
                style={{
                  padding: "3px 8px", borderRadius: 4,
                  border: "1px solid var(--border)", cursor: "pointer",
                  fontSize: 10, fontFamily: "var(--font-mono)",
                  background: storageSort === s ? "var(--accent)" : "transparent",
                  color: storageSort === s ? "#000" : "var(--text-dim)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: 6, marginBottom: 12, maxHeight: 240, overflowY: "auto",
          }}>
            {sortedStorage.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--text-dim)", padding: 12, gridColumn: "1 / -1", textAlign: "center" }}>
                No spirits in storage. All your guards are in your active party.
              </div>
            )}
            {sortedStorage.map(({ idx, g }) => (
              <button
                key={idx}
                onClick={() => onSelect(idx)}
                style={{
                  padding: 8, borderRadius: 8,
                  border: `1px solid ${idx === selectedIdx ? "var(--accent)" : "var(--border)"}`,
                  cursor: "pointer", fontFamily: "var(--font-mono)",
                  background: idx === selectedIdx ? "rgba(240,192,64,0.12)" : "var(--card)",
                  color: "var(--text)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                }}
              >
                <span style={{ fontSize: 20 }}>{g.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{g.name}</span>
                <span style={{ fontSize: 9, color: "var(--text-dim)" }}>L{g.level}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selected guard detail */}
      {guard && (
        <div style={{ background: "var(--card)", borderRadius: 12, padding: 16 }}>
          {/* Guard header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 48 }}>{guard.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>
                {guard.name} <span className="type-badge">{guard.bodyType}</span>
              </div>
              <div style={{
                fontSize: 13, color: "var(--text-dim)", marginTop: 2,
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              }}>
                Lv. {guard.level}
                {player.activeGuard === selectedIdx ? (
                  <span style={{
                    background: "var(--success)", color: "#000", padding: "1px 8px",
                    borderRadius: 4, fontSize: 10, fontWeight: 700,
                  }}>ACTIVE</span>
                ) : isPartyMember ? (
                  <button
                    onClick={() => onSetActive(selectedIdx)}
                    style={{
                      background: "var(--card2)", border: "1px solid var(--border)",
                      borderRadius: 4, padding: "2px 8px", color: "var(--accent)",
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                    }}
                  >Set Active</button>
                ) : null}
                <button
                  onClick={() => onTogglePartyMember(selectedIdx)}
                  style={{
                    background: isPartyMember ? "var(--danger)" : "var(--success)",
                    border: "none", borderRadius: 4, padding: "2px 8px", color: "#000",
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {isPartyMember ? "→ Storage" : "→ Party"}
                </button>
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
                <span style={{ width: 64, textAlign: "right", fontSize: 11, fontWeight: 700 }}>
                  {(() => {
                    const bonus = guard.statBonuses?.[s] || 0;
                    const effective = bonus > 0
                      ? Math.floor(guard.stats[s] * (1 + bonus / 100))
                      : guard.stats[s];
                    return (
                      <>
                        {guard.stats[s]}
                        {bonus > 0 && (
                          <span style={{ color: "var(--success)", fontSize: 10 }}>
                            →{effective}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </span>
                <span style={{ minWidth: 60, textAlign: "left", fontSize: 11, lineHeight: 1 }}>
                  {(() => {
                    const bonus = guard.statBonuses?.[s] || 0;
                    if (bonus < 5) return <span style={{ opacity: 0.2 }}>·</span>;
                    const halfStars = Math.floor(bonus / 5);
                    const full = Math.floor(halfStars / 2);
                    const hasHalf = halfStars % 2 === 1;
                    return (
                      <span title={`+${bonus}%`} style={{ color: "var(--accent)" }}>
                        {"★".repeat(full)}
                        {hasHalf && (
                          <span style={{
                            display: "inline-block", position: "relative",
                            width: "0.5em", overflow: "hidden", verticalAlign: "top",
                          }}>★</span>
                        )}
                      </span>
                    );
                  })()}
                </span>
                <button
                  onClick={() => onAllocateStat(selectedIdx, s, 1)}
                  disabled={points < 1}
                  style={{
                    background: points > 0 ? "var(--accent)" : "var(--card2)",
                    border: "1px solid var(--border)",
                    borderRadius: 4, padding: "2px 6px",
                    color: points > 0 ? "#000" : "var(--text-dim)",
                    fontSize: 10, fontWeight: 700,
                    cursor: points > 0 ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                    opacity: points > 0 ? 1 : 0.4,
                  }}
                >+1</button>
                <button
                  onClick={() => onAllocateStat(selectedIdx, s, 10)}
                  disabled={points < 10}
                  style={{
                    background: points >= 10 ? "var(--accent)" : "var(--card2)",
                    border: "1px solid var(--border)",
                    borderRadius: 4, padding: "2px 6px",
                    color: points >= 10 ? "#000" : "var(--text-dim)",
                    fontSize: 10, fontWeight: 700,
                    cursor: points >= 10 ? "pointer" : "not-allowed",
                    fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                    opacity: points >= 10 ? 1 : 0.4,
                  }}
                >+10</button>
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

          {/* Skills */}
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
                <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>{sk.power}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => onLevelUp(selectedIdx)}
              disabled={guard.level >= player.level}
            >
              {guard.level >= player.level
                ? "Guard at max level (= your level)"
                : `Level Up (${guardLevelUpCost(guard.level)}g) → +${STAT_POINTS_PER_LEVEL} pts`}
            </button>

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
                    : `🌟 Evolve into ${evoTarget.name}! (${evo.goldCost}g)`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
