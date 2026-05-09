import { useState } from "react";
import ScreenHeader from "./ScreenHeader";
import GUARD_DB from "../data/guards";
import PVP_OPPONENTS, { TIER_ORDER, TIER_INFO } from "../data/pvpOpponents";

export default function PvpScreen({ player, mode, onStartMatch, onSaveSquad, onDeleteSquad, onBack }) {
  // mode = "pvp1v1" or "pvp3v3"
  const teamSize = mode === "pvp3v3" ? 3 : 1;
  const energyCost = mode === "pvp3v3" ? 4 : 2;
  const [showSquadDialog, setShowSquadDialog] = useState(false);
  const [squadName, setSquadName] = useState("");

  const [team, setTeam] = useState(() => {
    // Start with active guard, plus first available others
    const initial = [player.activeGuard];
    if (teamSize > 1) {
      for (let i = 0; i < player.guards.length && initial.length < teamSize; i++) {
        if (!initial.includes(i)) initial.push(i);
      }
    }
    return initial.slice(0, teamSize);
  });

  const [selectedOpponent, setSelectedOpponent] = useState(null);

  function toggleGuard(idx) {
    if (team.includes(idx)) {
      // Remove (unless it's the only one in 1v1)
      if (teamSize === 1) return;
      setTeam(team.filter(i => i !== idx));
    } else {
      if (team.length < teamSize) {
        setTeam([...team, idx]);
      } else if (teamSize === 1) {
        setTeam([idx]);
      } else {
        // Replace last for 3v3 if at capacity
        setTeam([...team.slice(0, -1), idx]);
      }
    }
  }

  const reputation = player.reputation || 0;

  function handleStart() {
    if (!selectedOpponent || team.length === 0) return;
    if (player.energy < energyCost) return;
    onStartMatch({ opponentId: selectedOpponent, teamIndices: team, mode });
  }

  return (
    <div className="screen">
      <ScreenHeader
        title={mode === "pvp3v3" ? "🛡️ 3v3 Team Battle" : "⚔️ 1v1 Duel"}
        onBack={onBack}
        player={player}
      />

      {/* Team selection */}
      <div style={{
        background: "var(--card)", borderRadius: 10, padding: 14,
        marginBottom: 14, border: "1px solid var(--border)",
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--accent)",
        }}>
          Your Team ({team.length}/{teamSize})
        </div>

        {/* Saved Squads (3v3 only) */}
        {mode === "pvp3v3" && (
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10, color: "var(--text-dim)", marginBottom: 4,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>Saved Squads:</span>
              {team.length === 3 && (player.squads?.length || 0) < 5 && (
                <button
                  onClick={() => setShowSquadDialog(true)}
                  style={{
                    background: "var(--accent)", color: "#000",
                    border: "none", borderRadius: 4, padding: "2px 8px",
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  💾 Save Current
                </button>
              )}
            </div>
            {showSquadDialog && (
              <div style={{
                background: "var(--bg)", border: "1px solid var(--accent)",
                borderRadius: 6, padding: 8, marginBottom: 8,
              }}>
                <input
                  type="text"
                  placeholder="Squad name..."
                  value={squadName}
                  onChange={e => setSquadName(e.target.value)}
                  style={{
                    width: "100%", padding: "4px 8px", borderRadius: 4,
                    border: "1px solid var(--border)", background: "var(--card)",
                    color: "var(--text)", fontSize: 11, fontFamily: "var(--font-mono)",
                    marginBottom: 6,
                  }}
                  maxLength={20}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => {
                      if (squadName.trim() && onSaveSquad) {
                        onSaveSquad(squadName.trim(), team);
                        setSquadName("");
                        setShowSquadDialog(false);
                      }
                    }}
                    style={{
                      flex: 1, padding: "4px 8px", borderRadius: 4,
                      border: "none", background: "var(--success)", color: "#000",
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                    }}
                  >Save</button>
                  <button
                    onClick={() => { setShowSquadDialog(false); setSquadName(""); }}
                    style={{
                      flex: 1, padding: "4px 8px", borderRadius: 4,
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--text-dim)", fontSize: 10, cursor: "pointer",
                    }}
                  >Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(player.squads || []).length === 0 && (
                <span style={{ fontSize: 10, color: "var(--text-dim)", fontStyle: "italic" }}>
                  No saved squads. Pick 3 guards then tap "Save Current".
                </span>
              )}
              {(player.squads || []).map((sq, i) => (
                <div key={i} style={{ display: "flex", gap: 2 }}>
                  <button
                    onClick={() => setTeam([...sq.indices])}
                    style={{
                      padding: "3px 8px", borderRadius: 4,
                      border: "1px solid var(--border)", cursor: "pointer",
                      fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)",
                      background: "var(--bg)", color: "var(--accent)",
                    }}
                  >
                    📋 {sq.name}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete squad "${sq.name}"?`)) {
                        onDeleteSquad?.(i);
                      }
                    }}
                    style={{
                      padding: "3px 6px", borderRadius: 4,
                      border: "1px solid var(--border)", cursor: "pointer",
                      fontSize: 10, fontFamily: "var(--font-mono)",
                      background: "transparent", color: "var(--danger)",
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected slots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {Array.from({ length: teamSize }).map((_, slot) => {
            const guardIdx = team[slot];
            const guard = guardIdx != null ? player.guards[guardIdx] : null;
            return (
              <div key={slot} style={{
                flex: 1, background: "var(--bg)", borderRadius: 8,
                border: `2px solid ${guard ? "var(--accent)" : "var(--border)"}`,
                padding: "8px 4px", textAlign: "center", minHeight: 60,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                {guard ? (
                  <>
                    <span style={{ fontSize: 22 }}>{guard.emoji}</span>
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{guard.name}</div>
                    <div style={{ fontSize: 9, color: "var(--text-dim)" }}>Lv.{guard.level}</div>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Empty</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 6 }}>
          {teamSize > 1 ? "Tap to add/remove from team:" : "Tap to select your guard:"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {player.guards.map((g, i) => {
            const inTeam = team.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleGuard(i)}
                style={{
                  padding: "5px 10px", borderRadius: 6,
                  border: `1px solid ${inTeam ? "var(--accent)" : "var(--border)"}`,
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  background: inTeam ? "var(--accent)" : "var(--bg)",
                  color: inTeam ? "#000" : "var(--text)",
                }}
              >
                {g.emoji} {g.name} <span style={{ opacity: 0.6, fontSize: 9 }}>L{g.level}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Opponents list */}
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>
        Choose Opponent
      </div>

      {TIER_ORDER.map((tierId) => {
        const tier = TIER_INFO[tierId];
        const tierLocked = reputation < tier.reputationRequired;
        const opponents = PVP_OPPONENTS[tierId] || [];
        return (
          <div key={tierId} style={{ marginBottom: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
              opacity: tierLocked ? 0.4 : 1,
            }}>
              <span style={{ fontSize: 18 }}>{tier.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: tier.color }}>
                {tier.name}
              </span>
              {tierLocked && (
                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                  🔒 {tier.reputationRequired} reputation required
                </span>
              )}
            </div>
            {!tierLocked && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {opponents.map(opp => {
                  const isSelected = selectedOpponent === opp.id;
                  // For 1v1, show first guard. For 3v3, show all up to 3.
                  const displayRoster = mode === "pvp3v3" ? opp.roster.slice(0, 3) : [opp.roster[0]];
                  return (
                    <button
                      key={opp.id}
                      onClick={() => setSelectedOpponent(opp.id)}
                      style={{
                        padding: 12, borderRadius: 8,
                        background: isSelected ? "rgba(240,192,64,0.12)" : "var(--card)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "var(--font-mono)", color: "var(--text)",
                      }}
                    >
                      <div style={{
                        display: "flex", justifyContent: "space-between", marginBottom: 4,
                      }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{opp.name}</span>
                        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                          +{opp.reputation}⭐ • +{opp.gold}💰
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 6 }}>
                        {opp.desc}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {displayRoster.map((r, i) => {
                          const g = GUARD_DB[r.guardId];
                          return (
                            <span key={i} style={{
                              display: "inline-flex", alignItems: "center", gap: 3,
                              padding: "2px 6px", borderRadius: 4,
                              background: "var(--bg)", fontSize: 10,
                            }}>
                              {g?.emoji} {g?.name} <span style={{ opacity: 0.6 }}>L{r.level}</span>
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Start button */}
      <button
        className="btn btn-primary"
        style={{
          width: "100%", marginTop: 16, padding: "12px 16px", fontSize: 14,
          opacity: (selectedOpponent && team.length === teamSize && player.energy >= energyCost) ? 1 : 0.4,
        }}
        disabled={!selectedOpponent || team.length !== teamSize || player.energy < energyCost}
        onClick={handleStart}
      >
        {!selectedOpponent
          ? "Select an opponent"
          : team.length !== teamSize
            ? `Pick ${teamSize - team.length} more guard${teamSize - team.length !== 1 ? "s" : ""}`
            : player.energy < energyCost
              ? `Need ${energyCost} Energy`
              : `START MATCH (${energyCost} EN)`
        }
      </button>
    </div>
  );
}
