/**
 * Sidebar.jsx — Navigation sidebar with view buttons and advance week.
 *
 * ═══════════════════════════════════════════════════════════════
 * REACT CONCEPT: Components & Props
 * ═══════════════════════════════════════════════════════════════
 *
 * A component is a function that returns JSX (HTML-like syntax).
 * It receives "props" — an object of data passed from the parent.
 *
 * VANILLA EQUIVALENT:
 *   In vanilla, the sidebar was hardcoded in index.html and wired
 *   up with addEventListener in main.js. If you wanted to highlight
 *   the active button, you manually toggled CSS classes:
 *     document.querySelector('.active')?.classList.remove('active');
 *     btn.classList.add('active');
 *
 *   In React, the active state is a prop. The component reads it
 *   and applies the class automatically. When the prop changes,
 *   React re-renders the component. You never touch the DOM.
 *
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * The list of sidebar tabs.
 * Each object maps a view ID (used in code) to a display label.
 * Keeping this as data makes it easy to add/remove/reorder tabs.
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

/**
 * Sidebar component.
 *
 * Props explained:
 * @param {string}   currentView    — which tab is active (e.g. 'roster')
 * @param {function} onNavigate     — called with the view ID when a tab is clicked
 * @param {number}   currentWeek    — displayed above the advance button
 * @param {function} onAdvanceWeek  — called when the advance button is clicked
 *
 * The "on___" naming convention is standard React:
 *   - Props starting with "on" are callbacks (functions the child calls)
 *   - The parent defines WHAT happens; the child defines WHEN it happens
 */
export default function Sidebar({ currentView, onNavigate, currentWeek, onAdvanceWeek }) {
  return (
    <nav id="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <h1>VLRT GM SIM</h1>
        <div className="sub">Maxim Kleyer</div>
      </div>

      {/*
        .map() — React's replacement for loops.

        VANILLA:
          let html = '';
          NAV_ITEMS.forEach(item => { html += `<button>...</button>`; });
          sidebar.innerHTML = html;

        REACT:
          NAV_ITEMS.map(item => <button key={item.id}>...</button>)

        The "key" prop is REQUIRED when rendering lists. React uses it
        to track which items changed, were added, or removed.
        Without it, React re-renders the entire list every time.
        With it, React only updates the specific items that changed.
      */}
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={currentView === item.id ? 'active' : ''}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}

      {/* Footer with advance week button */}
      <div className="sidebar-footer">
        <div id="week-display">Week {currentWeek}</div>
        <button id="btn-advance" onClick={onAdvanceWeek}>
          Advance Week
        </button>
      </div>
    </nav>
  );
}
