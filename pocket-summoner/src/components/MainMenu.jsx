import { useState } from "react";
import { xpForLevel, maxEnergy } from "../engine/formulas";

function MenuButton({ icon, label, sub, onClick, color }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: 20, borderRadius: 12, border: `2px solid ${color}`,
        cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.15s",
        background: hover ? `${color}22` : "var(--card)",
        transform: hover ? "translateY(-2px)" : "none",
        color: "var(--text)",
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{sub}</span>
    </button>
  );
}

export default function MainMenu({ player, onNavigate }) {
  const xpNeeded = xpForLevel(player.level);
  const xpPct = Math.floor((player.xp / xpNeeded) * 100);
  const max = maxEnergy(player.level);
  const activeGuard = player.guards[player.activeGuard];

  return (
    <div className="screen">
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{player.name}</div>
          <div style={{
            background: "var(--accent)", color: "#000", padding: "2px 8px",
            borderRadius: 4, fontSize: 11, fontWeight: 700,
          }}>
            Lv. {player.level}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ background: "var(--card)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            ⚡ {player.energy}/{max}
          </div>
          <div style={{ background: "var(--card)", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            💰 {player.gold}
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="xp-bar-outer">
        <div className="xp-bar-inner" style={{ width: `${xpPct}%` }} />
        <span className="xp-bar-label">XP {player.xp}/{xpNeeded}</span>
      </div>

      {/* Active Guard */}
      {activeGuard && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: 14,
          background: "var(--card)", borderRadius: 10, border: "1px solid var(--border)",
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 36 }}>{activeGuard.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {activeGuard.name}{" "}
              <span className="type-badge">{activeGuard.bodyType}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Lv. {activeGuard.level} — Active Guard
            </div>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
        <MenuButton icon="🗺️" label="Quests" sub="Explore & Battle" onClick={() => onNavigate("quests")} color="#4a9" />
        <MenuButton icon="🏆" label="Champion" sub="Boss Gauntlet" onClick={() => onNavigate("champion")} color="#d64" />
        <MenuButton icon="🛡️" label="Guards" sub="Train & Manage" onClick={() => onNavigate("guards")} color="#68c" />
        <MenuButton icon="🏪" label="Shop" sub="Buy Guards" onClick={() => onNavigate("shop")} color="#c84" />
        <MenuButton icon="👤" label="Profile" sub="Stats & Info" onClick={() => onNavigate("profile")} color="#a6d" />
      </div>
    </div>
  );
}
