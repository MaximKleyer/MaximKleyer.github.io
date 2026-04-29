export default function ScreenHeader({ title, onBack, player }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 0", marginBottom: 12, borderBottom: "1px solid var(--border)",
    }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", color: "var(--accent)",
          cursor: "pointer", fontWeight: 700, fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}
      >
        ← Back
      </button>
      <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
        ⚡{player.energy} 💰{player.gold}
      </span>
    </div>
  );
}
