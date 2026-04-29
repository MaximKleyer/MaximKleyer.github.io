import { useState } from "react";

export default function TitleScreen({ onStart, hasSave, onContinue }) {
  const [name, setName] = useState("");

  return (
    <div className="screen-center">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>⚔️</div>
        <h1 style={{
          fontFamily: "var(--font-pixel)", fontSize: 22, lineHeight: 1.6,
          color: "var(--accent)", textShadow: "0 0 20px rgba(240,192,64,0.4)",
        }}>
          POCKET<br />SUMMONER
        </h1>
        <div style={{
          fontFamily: "var(--font-pixel)", fontSize: 11,
          color: "var(--text-dim)", marginTop: 8, letterSpacing: 4,
        }}>
          EPISODE 1
        </div>
      </div>

      {hasSave && (
        <button
          className="btn btn-primary"
          style={{ width: "100%", maxWidth: 300, marginBottom: 12, fontSize: 15 }}
          onClick={onContinue}
        >
          CONTINUE
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <label style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {hasSave ? "Or start a new game:" : "Enter your Summoner name:"}
        </label>
        <input
          style={{
            background: "var(--card)", border: "2px solid var(--border)",
            borderRadius: 8, padding: "10px 14px", color: "var(--text)",
            fontSize: 15, fontFamily: "var(--font-mono)", outline: "none",
          }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="Your name..."
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onStart(name.trim())}
        />
        <button
          className="btn btn-primary"
          style={{ opacity: name.trim() ? 1 : 0.4 }}
          disabled={!name.trim()}
          onClick={() => onStart(name.trim())}
        >
          {hasSave ? "NEW GAME" : "BEGIN ADVENTURE"}
        </button>
      </div>

      <div style={{ marginTop: 40, fontSize: 10, color: "var(--text-dim)", textAlign: "center" }}>
        A nostalgic recreation • Not affiliated with Riida.com
      </div>
    </div>
  );
}
