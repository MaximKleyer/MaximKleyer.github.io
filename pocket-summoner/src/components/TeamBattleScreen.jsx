import { useState, useEffect, useRef } from "react";

/**
 * TeamBattleScreen — animates sequential team battles
 *
 * Walks through the combined log entry-by-entry. Renders both team rosters
 * with current/KO'd state and shows the current matchup prominently.
 */
export default function TeamBattleScreen({
  playerTeam, enemyTeam, battleLog, onComplete, speed = "normal",
}) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);
  const logEndRef = useRef(null);

  const speedMult = speed === "fast" ? 0.5 : speed === "slow" ? 1.5 : 1;

  const current = battleLog[step] || battleLog[0];

  // Track which guard is currently active on each side and current HP
  // by walking the log up to current step
  let pActiveIdx = 0;
  let eActiveIdx = 0;
  let pHP = null, eHP = null, pMaxHP = null, eMaxHP = null;
  for (let i = 0; i <= step; i++) {
    const entry = battleLog[i];
    if (!entry) continue;
    if (entry.type === "switch_player") pActiveIdx++;
    else if (entry.type === "switch_enemy") eActiveIdx++;
    if (entry.pHP != null) {
      pHP = entry.pHP;
      eHP = entry.eHP;
      pMaxHP = entry.pMaxHP;
      eMaxHP = entry.eMaxHP;
    }
  }

  const pCurrent = playerTeam[pActiveIdx] || playerTeam[playerTeam.length - 1];
  const eCurrent = enemyTeam[eActiveIdx] || enemyTeam[enemyTeam.length - 1];

  // Auto-advance
  useEffect(() => {
    if (step >= battleLog.length - 1) {
      timerRef.current = setTimeout(() => setFinished(true), 1000 * speedMult);
      return () => clearTimeout(timerRef.current);
    }
    const e = battleLog[step];
    let delay = 1500;
    if (e?.type === "header" || e?.type === "matchup") delay = 1200;
    else if (e?.type === "switch_player" || e?.type === "switch_enemy") delay = 1500;
    else if (e?.skill) delay = 1800;
    else delay = 800;

    timerRef.current = setTimeout(() => setStep(s => s + 1), delay * speedMult);
    return () => clearTimeout(timerRef.current);
  }, [step, battleLog.length, speedMult]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const isAttack = current?.type === "player" || current?.type === "enemy";
  const isResult = current?.type === "win" || current?.type === "lose";
  const isMatchup = current?.type === "matchup";

  return (
    <div style={s.container}>
      <div style={s.arenaLabel}>⚔️ TEAM BATTLE</div>

      {/* Team rosters */}
      <div style={s.rosters}>
        <RosterRow team={playerTeam} activeIdx={pActiveIdx} side="player" />
        <RosterRow team={enemyTeam} activeIdx={eActiveIdx} side="enemy" />
      </div>

      {/* Active matchup with HP bars */}
      <div style={s.activeMatchup}>
        <ActiveCard
          guard={pCurrent}
          hp={pHP}
          maxHP={pMaxHP}
          side="player"
          isAttacking={current?.attacker === "player"}
          isHit={current?.attacker === "enemy"}
        />
        <div style={s.vs}>VS</div>
        <ActiveCard
          guard={eCurrent}
          hp={eHP}
          maxHP={eMaxHP}
          side="enemy"
          isAttacking={current?.attacker === "enemy"}
          isHit={current?.attacker === "player"}
        />
      </div>

      {/* Action display */}
      <div style={s.actionBox}>
        {current?.type === "header" && (
          <div style={s.actionHeader}>{current.text}</div>
        )}
        {isMatchup && (
          <div style={{ ...s.actionHeader, color: "var(--accent)" }}>
            {current.text}
          </div>
        )}
        {(current?.type === "switch_player" || current?.type === "switch_enemy") && (
          <div style={{
            ...s.actionHeader,
            color: current.type === "switch_player" ? "#8cf" : "#fc8",
          }}>
            {current.text}
          </div>
        )}
        {isAttack && (
          <>
            <div style={s.actionText}>
              <span style={{ color: current.attacker === "player" ? "#8cf" : "#fc8" }}>
                {current.text}
              </span>
            </div>
            <div style={s.actionDetails}>
              <span style={{
                ...s.catBadge,
                background: current.skill?.physical ? "rgba(255,102,102,0.25)" : "rgba(136,136,255,0.25)",
                color: current.skill?.physical ? "#f88" : "#aaf",
              }}>
                {current.skill?.physical ? "PHY" : "SPC"}
              </span>
              <span style={s.typeBadge}>{current.skill?.type}</span>
              <span style={s.dmgNumber}>-{current.damage}</span>
              {current.effectiveness === "super" && <span style={s.effSuper}>Super effective!</span>}
              {current.effectiveness === "weak" && <span style={s.effWeak}>Not very effective...</span>}
            </div>
          </>
        )}
        {isResult && (
          <div style={{
            ...s.resultText,
            color: current.type === "win" ? "#4f8" : "#f66",
          }}>
            {current.text}
          </div>
        )}
      </div>

      {/* Log */}
      <div style={s.logBox}>
        {battleLog.slice(0, step + 1).map((entry, i) => (
          <div key={i} style={{
            fontSize: 10, padding: "1px 0", lineHeight: 1.5,
            color:
              entry.type === "win" ? "#4f8" :
              entry.type === "lose" ? "#f66" :
              entry.type === "header" || entry.type === "matchup" ? "var(--accent)" :
              entry.type === "switch_player" ? "#8cf" :
              entry.type === "switch_enemy" ? "#fc8" :
              entry.type === "player" ? "#8cf" :
              entry.type === "enemy" ? "#fc8" :
              "var(--text-dim)",
            fontWeight: ["header","matchup","win","lose"].includes(entry.type) ? 700 : 400,
          }}>
            {entry.damage != null ? `${entry.text} (-${entry.damage})` : entry.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {finished && (
        <button className="btn btn-primary" style={s.continueBtn} onClick={onComplete}>
          Continue
        </button>
      )}
    </div>
  );
}

function RosterRow({ team, activeIdx, side }) {
  return (
    <div style={{
      display: "flex", gap: 4, justifyContent: "center", padding: "6px 0",
    }}>
      {team.map((g, i) => {
        const isKO = i < activeIdx;
        const isActive = i === activeIdx;
        return (
          <div key={i} style={{
            width: 48, height: 48, borderRadius: 8,
            background: "var(--card)",
            border: `2px solid ${
              isActive
                ? (side === "player" ? "#4488cc" : "#cc4444")
                : isKO ? "var(--danger)" : "var(--border)"
            }`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            opacity: isKO ? 0.3 : 1,
            transition: "all 0.3s",
          }}>
            <span style={{ fontSize: 22, filter: isKO ? "grayscale(1)" : "none" }}>
              {g.emoji}
            </span>
            {isKO && (
              <span style={{
                position: "absolute", top: 2, right: 2, fontSize: 12,
              }}>💀</span>
            )}
            {isActive && (
              <span style={{
                position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)",
                fontSize: 8, background: side === "player" ? "#4488cc" : "#cc4444",
                color: "#fff", padding: "0 4px", borderRadius: 2, fontWeight: 700,
              }}>•</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActiveCard({ guard, hp, maxHP, side, isAttacking, isHit }) {
  const hpPct = hp != null && maxHP ? Math.max(0, Math.floor((hp / maxHP) * 100)) : 100;
  const hpColor = hpPct > 50 ? "#4d8" : hpPct > 20 ? "#fc6" : "#f55";

  return (
    <div style={{
      ...s.guardCard,
      borderColor: side === "player" ? "#4488cc44" : "#cc444444",
      transform: isAttacking ? "scale(1.05)" : isHit ? "scale(0.95)" : "scale(1)",
      transition: "all 0.3s ease",
    }}>
      <div style={s.guardEmoji}>{guard?.emoji}</div>
      <div style={s.guardName}>{guard?.name}</div>
      <div style={s.guardLevel}>Lv.{guard?.level}</div>
      <span className="type-badge" style={{ marginBottom: 6 }}>{guard?.bodyType}</span>
      <div style={s.hpBarOuter}>
        <div style={{ ...s.hpBarInner, width: `${hpPct}%`, background: hpColor }} />
      </div>
      <div style={s.hpText}>{hp != null ? `${hp} / ${maxHP}` : "—"}</div>
    </div>
  );
}

const s = {
  container: { padding: "12px 16px", minHeight: "100vh", display: "flex", flexDirection: "column" },
  arenaLabel: {
    fontFamily: "var(--font-pixel)", fontSize: 11, color: "var(--accent)",
    textAlign: "center", marginBottom: 8, letterSpacing: 3,
  },
  rosters: {
    display: "flex", flexDirection: "column", gap: 2, marginBottom: 8,
    background: "var(--card)", borderRadius: 8, padding: 4,
  },
  activeMatchup: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12,
  },
  vs: { fontFamily: "var(--font-pixel)", fontSize: 14, color: "var(--text-dim)", padding: "0 4px" },
  guardCard: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    background: "var(--card)", borderRadius: 12, padding: "10px 6px 8px",
    border: "2px solid", maxWidth: 160,
  },
  guardEmoji: { fontSize: 30, marginBottom: 2 },
  guardName: { fontWeight: 700, fontSize: 12, textAlign: "center" },
  guardLevel: { fontSize: 10, color: "var(--text-dim)", marginBottom: 3 },
  hpBarOuter: { width: "100%", height: 9, background: "var(--bg)", borderRadius: 5, overflow: "hidden", marginTop: 2 },
  hpBarInner: { height: "100%", borderRadius: 5, transition: "width 0.6s ease, background 0.3s" },
  hpText: { fontSize: 9, fontWeight: 700, marginTop: 2, color: "var(--text-dim)" },
  actionBox: {
    background: "var(--card)", borderRadius: 10, padding: "10px 14px",
    marginBottom: 10, minHeight: 56, display: "flex", flexDirection: "column",
    justifyContent: "center", border: "1px solid var(--border)",
  },
  actionHeader: { fontFamily: "var(--font-pixel)", fontSize: 10, textAlign: "center", color: "var(--accent)" },
  actionText: { fontWeight: 700, fontSize: 13, marginBottom: 4 },
  actionDetails: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  catBadge: { padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 700 },
  typeBadge: {
    fontSize: 10, color: "var(--text-dim)", background: "rgba(255,255,255,0.08)",
    padding: "1px 6px", borderRadius: 3,
  },
  dmgNumber: { fontWeight: 700, fontSize: 15, color: "#f66", fontFamily: "var(--font-pixel)" },
  effSuper: { fontSize: 10, color: "#4f8", fontWeight: 700 },
  effWeak: { fontSize: 10, color: "#fc8", fontWeight: 700 },
  resultText: { fontFamily: "var(--font-pixel)", fontSize: 12, textAlign: "center", fontWeight: 700 },
  logBox: {
    flex: 1, background: "var(--bg)", borderRadius: 8, padding: 8,
    overflowY: "auto", maxHeight: 140, border: "1px solid var(--border)",
  },
  continueBtn: { marginTop: 12, width: "100%" },
};
