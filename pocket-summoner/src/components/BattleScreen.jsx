import { useState, useEffect, useRef } from "react";

/**
 * BattleScreen — Animated auto-battle viewer
 *
 * Replays the pre-computed battle log with 2-second delays between moves.
 * Shows both guards, health bars, move used, damage, and effectiveness.
 */
export default function BattleScreen({ playerGuard, enemyGuard, battleLog, onComplete, speed = "normal" }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);
  const logEndRef = useRef(null);

  // Speed multiplier: fast = 0.5x delay, normal = 1x, slow = 1.5x
  const speedMult = speed === "fast" ? 0.5 : speed === "slow" ? 1.5 : 1;

  const current = battleLog[step] || battleLog[0];
  const pHP = current.pHP;
  const eHP = current.eHP;
  const pMaxHP = current.pMaxHP;
  const eMaxHP = current.eMaxHP;

  // Auto-advance through battle log
  useEffect(() => {
    if (step >= battleLog.length - 1) {
      timerRef.current = setTimeout(() => setFinished(true), 1000 * speedMult);
      return () => clearTimeout(timerRef.current);
    }

    const baseDelay = step === 0 ? 1200 : 2000;
    timerRef.current = setTimeout(() => setStep((s) => s + 1), baseDelay * speedMult);
    return () => clearTimeout(timerRef.current);
  }, [step, battleLog.length, speedMult]);

  // Scroll log into view
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const isAttackEntry = current.type === "player" || current.type === "enemy";
  const isResult = current.type === "win" || current.type === "lose";

  return (
    <div style={s.container}>
      {/* Arena header */}
      <div style={s.arenaLabel}>⚔️ BATTLE</div>

      {/* Guard cards */}
      <div style={s.arena}>
        {/* Player guard */}
        <GuardCard
          guard={playerGuard}
          hp={pHP}
          maxHP={pMaxHP}
          side="player"
          isAttacking={current.attacker === "player"}
          isHit={current.attacker === "enemy"}
        />

        {/* VS divider */}
        <div style={s.vs}>VS</div>

        {/* Enemy guard */}
        <GuardCard
          guard={enemyGuard}
          hp={eHP}
          maxHP={eMaxHP}
          side="enemy"
          isAttacking={current.attacker === "enemy"}
          isHit={current.attacker === "player"}
        />
      </div>

      {/* Action display */}
      <div style={s.actionBox}>
        {current.type === "header" && (
          <div style={s.actionHeader}>Battle Start!</div>
        )}
        {isAttackEntry && (
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
              {current.effectiveness === "super" && (
                <span style={s.effSuper}>Super effective!</span>
              )}
              {current.effectiveness === "weak" && (
                <span style={s.effWeak}>Not very effective...</span>
              )}
            </div>
          </>
        )}
        {isResult && (
          <div style={{
            ...s.resultText,
            color: current.type === "win" ? "#4f8" : "#f66",
          }}>
            {current.type === "win" ? "🏆 " : "💀 "}{current.text}
          </div>
        )}
      </div>

      {/* Battle log (scrollable) */}
      <div style={s.logBox}>
        {battleLog.slice(0, step + 1).map((entry, i) => (
          <div key={i} style={{
            fontSize: 11, padding: "2px 0", lineHeight: 1.5,
            color:
              entry.type === "win" ? "#4f8" :
              entry.type === "lose" ? "#f66" :
              entry.type === "header" ? "var(--text-dim)" :
              entry.type === "player" ? "#8cf" : "#fc8",
            fontWeight: entry.type === "header" || entry.type === "win" || entry.type === "lose" ? 700 : 400,
          }}>
            {entry.damage != null
              ? `${entry.text} (-${entry.damage})`
              : entry.text
            }
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Continue button */}
      {finished && (
        <button className="btn btn-primary" style={s.continueBtn} onClick={onComplete}>
          Continue
        </button>
      )}
    </div>
  );
}

function GuardCard({ guard, hp, maxHP, side, isAttacking, isHit }) {
  const hpPct = Math.max(0, Math.floor((hp / maxHP) * 100));
  const hpColor = hpPct > 50 ? "#4d8" : hpPct > 20 ? "#fc6" : "#f55";

  return (
    <div style={{
      ...s.guardCard,
      borderColor: side === "player" ? "#4488cc44" : "#cc444444",
      transform: isAttacking ? "scale(1.05)" : isHit ? "scale(0.95)" : "scale(1)",
      opacity: hp <= 0 ? 0.4 : 1,
      transition: "all 0.3s ease",
    }}>
      <div style={s.guardEmoji}>{guard.emoji}</div>
      <div style={s.guardName}>{guard.name}</div>
      <div style={s.guardLevel}>Lv.{guard.level}</div>
      <span className="type-badge" style={{ marginBottom: 6 }}>{guard.bodyType}</span>

      {/* HP bar */}
      <div style={s.hpBarOuter}>
        <div style={{
          ...s.hpBarInner,
          width: `${hpPct}%`,
          background: hpColor,
        }} />
      </div>
      <div style={s.hpText}>
        {hp} / {maxHP}
      </div>
    </div>
  );
}

// ─── Styles ───
const s = {
  container: {
    padding: "12px 16px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  arenaLabel: {
    fontFamily: "var(--font-pixel)",
    fontSize: 12,
    color: "var(--accent)",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 3,
  },
  arena: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  vs: {
    fontFamily: "var(--font-pixel)",
    fontSize: 14,
    color: "var(--text-dim)",
    padding: "0 4px",
  },
  guardCard: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "var(--card)",
    borderRadius: 12,
    padding: "14px 8px 10px",
    border: "2px solid",
    maxWidth: 170,
  },
  guardEmoji: { fontSize: 36, marginBottom: 4 },
  guardName: { fontWeight: 700, fontSize: 13, textAlign: "center" },
  guardLevel: { fontSize: 11, color: "var(--text-dim)", marginBottom: 4 },
  hpBarOuter: {
    width: "100%",
    height: 10,
    background: "var(--bg)",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 2,
  },
  hpBarInner: {
    height: "100%",
    borderRadius: 5,
    transition: "width 0.6s ease, background 0.3s",
  },
  hpText: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 3,
    color: "var(--text-dim)",
  },
  actionBox: {
    background: "var(--card)",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 12,
    minHeight: 60,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    border: "1px solid var(--border)",
  },
  actionHeader: {
    fontFamily: "var(--font-pixel)",
    fontSize: 11,
    textAlign: "center",
    color: "var(--accent)",
  },
  actionText: { fontWeight: 700, fontSize: 14, marginBottom: 4 },
  actionDetails: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  catBadge: {
    padding: "1px 6px",
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
  },
  typeBadge: {
    fontSize: 10,
    color: "var(--text-dim)",
    background: "rgba(255,255,255,0.08)",
    padding: "1px 6px",
    borderRadius: 3,
  },
  dmgNumber: {
    fontWeight: 700,
    fontSize: 16,
    color: "#f66",
    fontFamily: "var(--font-pixel)",
  },
  effSuper: { fontSize: 10, color: "#4f8", fontWeight: 700 },
  effWeak: { fontSize: 10, color: "#fc8", fontWeight: 700 },
  resultText: {
    fontFamily: "var(--font-pixel)",
    fontSize: 13,
    textAlign: "center",
    fontWeight: 700,
  },
  logBox: {
    flex: 1,
    background: "var(--bg)",
    borderRadius: 8,
    padding: 10,
    overflowY: "auto",
    maxHeight: 180,
    fontFamily: "var(--font-mono)",
    border: "1px solid var(--border)",
  },
  continueBtn: {
    marginTop: 14,
    width: "100%",
    animation: "toastIn 0.3s ease-out",
  },
};
