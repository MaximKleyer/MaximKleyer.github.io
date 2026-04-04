/**
 * Sidebar.jsx — Context-aware navigation.
 *
 * Week 0: Shows "Start Season" button (validates rosters first)
 * Week 1-5: Shows "Advance Week" button
 * Bracket: Shows "Playoffs" label, no advance button
 */

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'schedule',   label: 'Schedule' },
  { id: 'roster',     label: 'Roster' },
  { id: 'freeagents', label: 'Free Agents' },
  { id: 'standings',  label: 'Standings' },
  { id: 'bracket',    label: 'Bracket' },
  { id: 'stats',      label: 'Stats' },
];

export default function Sidebar({ currentView, onNavigate, currentWeek, onAdvanceWeek, phase }) {
  const isPreseason = currentWeek === 0;

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
        ) : (
          <div id="week-display" style={{ textAlign: 'center' }}>
            Playoffs
          </div>
        )}
      </div>
    </nav>
  );
}
