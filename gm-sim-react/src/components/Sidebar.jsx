/**
 * Sidebar.jsx — Unified advance button for all phases.
 *
 * Group:   "▶ Start Season" (week 0) or "Advance Week" (week 1+)
 * Bracket: "Advance Bracket" with stage name
 * Done:    "Season Complete" (disabled)
 */

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'schedule',      label: 'Schedule' },
  { id: 'roster',        label: 'Roster' },
  { id: 'freeagents',    label: 'Free Agents' },
  { id: 'standings',     label: 'Standings' },
  { id: 'bracket',       label: 'Bracket' },
  { id: 'international', label: 'International' },
  { id: 'worlds',        label: 'Worlds' },
  { id: 'points',        label: 'Points' },
  { id: 'history',       label: 'History' },
  { id: 'stats',         label: 'Stats' },
];

// Shared style for the three fast-forward buttons (Sim Series / Group / Playoffs)
const ffBtnStyle = {
  width: '100%',
  padding: '5px 8px',
  background: 'transparent',
  border: '1px solid rgba(106, 169, 255, 0.30)',
  color: '#8ab8ff',
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.66rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

export default function Sidebar({
  currentView, onNavigate, currentWeek, onAdvanceWeek,
  phase, bracketLabel, allDone, stageName, advanceDisabled,
  advanceBlockReason,
  onDeleteSave,
  onStartNewSeason, seasonNumber,
  isOffseason, onStartPreseason, humanRosterSize,
  godMode, onToggleGodMode,
  // Fast-forward (Phase 6e+ Ask 3)
  hasActiveSeries: ffHasActive,
  canSimGroup, canSimPlayoffs,
  onSimSeries, onSimGroupStage, onSimPlayoffs,
}) {
  const isPreseason = currentWeek === 0 && phase === 'group';

  // Phase 6e+ Ask 1: during offseason, sidebar shows "Start Preseason"
  // directly (disabled when roster < 5). This replaces the intermediate
  // "Go to Offseason" button since the user is already there.
  const offseasonUnderstaffed = isOffseason && (humanRosterSize || 0) < 5;

  function handleDeleteClick() {
    const ok = typeof window !== 'undefined' && window.confirm(
      'Delete this save and start a new game?\n\n' +
      'This will permanently erase your current progress. ' +
      'You\'ll be returned to the team-select screen.'
    );
    if (ok && onDeleteSave) onDeleteSave();
  }

  return (
    <nav id="sidebar">
      <div className="sidebar-header">
        <h1>VLRT GM SIM</h1>
        <div className="sub">Maxim Kleyer</div>
        {godMode && (
          <div style={{
            marginTop: 6,
            display: 'inline-block',
            padding: '3px 8px',
            background: 'rgba(180, 130, 255, 0.15)',
            border: '1px solid rgba(180, 130, 255, 0.5)',
            borderRadius: 3,
            color: '#c299ff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}>
            💀 GOD MODE
          </div>
        )}
      </div>

      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={currentView === item.id ? 'active' : ''}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}

      <div className="sidebar-footer">
        {stageName && !allDone && (
          <div style={{
            textAlign: 'center',
            fontSize: '0.62rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: '6px',
          }}>
            {stageName}
          </div>
        )}
        {isOffseason ? (
          <>
            <div id="week-display" style={{ textAlign: 'center', marginBottom: 6 }}>
              🌴 Offseason
            </div>
            {offseasonUnderstaffed ? (
              <div style={{
                textAlign: 'center',
                fontSize: '0.64rem',
                color: 'var(--accent, #ff4655)',
                marginBottom: 6,
                padding: '0 4px',
                lineHeight: 1.3,
              }}>
                ⚠ Sign {5 - (humanRosterSize || 0)} more player{5 - (humanRosterSize || 0) > 1 ? 's' : ''} to continue
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                fontSize: '0.64rem',
                color: '#8a98b1',
                marginBottom: 8,
                padding: '0 4px',
                lineHeight: 1.3,
              }}>
                Roster set — ready to begin
              </div>
            )}
            <button
              onClick={onStartPreseason}
              disabled={offseasonUnderstaffed}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: offseasonUnderstaffed ? '#3a4152' : 'var(--accent, #ff4655)',
                border: offseasonUnderstaffed
                  ? '1px solid #3a4152'
                  : '1px solid var(--accent, #ff4655)',
                color: offseasonUnderstaffed ? '#6f7d93' : '#fff',
                borderRadius: 4,
                cursor: offseasonUnderstaffed ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              ▶ Start Preseason
            </button>
          </>
        ) : phase === 'group' ? (
          <>
            <div id="week-display">
              {isPreseason ? 'Preseason' : `Week ${currentWeek}`}
            </div>
            {advanceBlockReason && (
              <div style={{
                textAlign: 'center',
                fontSize: '0.64rem',
                color: 'var(--accent, #ff4655)',
                marginBottom: '6px',
                padding: '0 4px',
                lineHeight: 1.3,
              }}>
                ⚠ {advanceBlockReason}
              </div>
            )}
            <button
              id="btn-advance"
              className={isPreseason ? 'btn-start-season' : ''}
              onClick={onAdvanceWeek}
              disabled={advanceDisabled}
              style={advanceDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              {isPreseason ? '▶ Start Season' : 'Advance Week'}
            </button>
          </>
        ) : phase === 'bracket' ? (
          <>
            <div id="week-display">Playoffs</div>
            {bracketLabel && (
              <div style={{
                textAlign: 'center', fontSize: '0.65rem',
                color: 'var(--text-muted)', marginBottom: '6px'
              }}>
                {bracketLabel}
              </div>
            )}
            <button
              id="btn-advance"
              onClick={onAdvanceWeek}
              disabled={advanceDisabled}
              style={advanceDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              {advanceDisabled ? 'Awaiting Pick' : 'Advance Bracket'}
            </button>
          </>
        ) : (
          <>
            <div id="week-display" style={{ textAlign: 'center', marginBottom: 6 }}>
              {allDone ? `🏆 Season ${seasonNumber || 2025} Complete` : 'Playoffs'}
            </div>
            {allDone && onStartNewSeason && (
              <button
                onClick={onStartNewSeason}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--accent, #ff4655)',
                  border: '1px solid var(--accent, #ff4655)',
                  color: '#fff',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                ▶ Enter Offseason
              </button>
            )}
          </>
        )}

        {/* ── Fast-forward buttons (Phase 6e+ Ask 3) ── */}
        {(ffHasActive || canSimGroup || canSimPlayoffs) && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              fontSize: '0.58rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#6f7d93',
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: 'center',
              marginBottom: 6,
            }}>
              Fast Forward
            </div>
            {ffHasActive && (
              <button onClick={onSimSeries} style={ffBtnStyle}>
                ⏩ Sim Series
              </button>
            )}
            {canSimGroup && (
              <button onClick={onSimGroupStage} style={{ ...ffBtnStyle, marginTop: 4 }}>
                ⏩⏩ Sim Group Stage
              </button>
            )}
            {canSimPlayoffs && (
              <button onClick={onSimPlayoffs} style={{ ...ffBtnStyle, marginTop: 4 }}>
                ⏩⏩ Sim Playoffs
              </button>
            )}
          </div>
        )}

        {onToggleGodMode && (
          <button
            onClick={onToggleGodMode}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '6px 10px',
              background: godMode ? 'rgba(180, 130, 255, 0.12)' : 'transparent',
              border: godMode
                ? '1px solid rgba(180, 130, 255, 0.5)'
                : '1px solid rgba(255,255,255,0.08)',
              color: godMode ? '#c299ff' : '#6f7d93',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.68rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!godMode) {
                e.currentTarget.style.borderColor = 'rgba(180, 130, 255, 0.4)';
                e.currentTarget.style.color = '#c299ff';
              }
            }}
            onMouseLeave={(e) => {
              if (!godMode) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = '#6f7d93';
              }
            }}
          >
            {godMode ? '💀 God Mode: ON' : 'God Mode'}
          </button>
        )}

        {onDeleteSave && (
          <button
            onClick={handleDeleteClick}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#6f7d93',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.68rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 70, 85, 0.4)';
              e.currentTarget.style.color = '#ff6675';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#6f7d93';
            }}
          >
            Delete Save
          </button>
        )}
      </div>
    </nav>
  );
}
