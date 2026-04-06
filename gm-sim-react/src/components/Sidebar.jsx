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
  { id: 'points',        label: 'Points' },
  { id: 'stats',         label: 'Stats' },
];

export default function Sidebar({
  currentView, onNavigate, currentWeek, onAdvanceWeek,
  phase, bracketLabel, allDone, stageName
}) {
  const isPreseason = currentWeek === 0 && phase === 'group';

  return (
    <nav id="sidebar">
      <div className="sidebar-header">
        <h1>VLRT GM SIM</h1>
        <div className="sub">Maxim Kleyer</div>
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
        {phase === 'group' ? (
          <>
            <div id="week-display">
              {isPreseason ? 'Preseason' : `Week ${currentWeek}`}
            </div>
            <button
              id="btn-advance"
              className={isPreseason ? 'btn-start-season' : ''}
              onClick={onAdvanceWeek}
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
            <button id="btn-advance" onClick={onAdvanceWeek}>
              Advance Bracket
            </button>
          </>
        ) : (
          <div id="week-display" style={{ textAlign: 'center' }}>
            {allDone ? '🏆 Circuit Complete' : 'Playoffs'}
          </div>
        )}
      </div>
    </nav>
  );
}
