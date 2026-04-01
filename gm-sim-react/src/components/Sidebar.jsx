/**
 * Sidebar.jsx — Navigation with context-aware advance button.
 *
 * During group stage: shows "Advance Week" button.
 * During bracket stage: hides it (bracket advances from the Bracket tab).
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
            <div id="week-display">Week {currentWeek}</div>
            <button id="btn-advance" onClick={onAdvanceWeek}>
              Advance Week
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
