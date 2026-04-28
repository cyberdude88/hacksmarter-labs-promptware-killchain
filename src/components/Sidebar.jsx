import { useSoc } from '../state/SocContext.jsx';

// Vertical nav. All pages always accessible — milestones are informational.
const ITEMS = [
  { key: 'alerts',        label: 'Alerts',            icon: '◉', milestone: null },
  { key: 'investigation', label: 'Investigation',     icon: '◎', milestone: 'firstTriage' },
  { key: 'detection',     label: 'Detection Builder', icon: '⌬', milestone: 'ruleBuilt' },
  { key: 'replay',        label: 'Replay Attack',     icon: '▶', milestone: 'replayPassed' },
  { key: 'report',        label: 'Incident Report',   icon: '✎', milestone: 'reportReady' },
];

export default function Sidebar() {
  const { state, dispatch, resetSession } = useSoc();

  const isMilestoneDone = (milestone) => {
    if (!milestone) return true;
    if (milestone === 'reportReady') return Boolean(state.report?.grading);
    return Boolean(state.milestones[milestone]);
  };

  const onReset = () => {
    if (window.confirm('Reset session? This wipes triage history, rules, and IOCs.')) resetSession();
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}logo.png`}
             alt="HackSmarter SOC"
             className="brand-logo" />
      </div>

      <nav className="sidebar-nav">
        {ITEMS.map((it) => {
          const active = state.currentPage === it.key;
          const milestoneDone = isMilestoneDone(it.milestone);
          return (
            <button
              key={it.key}
              className={`nav-item ${active ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'NAV', page: it.key })}
            >
              <span className="nav-icon">{it.icon}</span>
              <span className="nav-label">{it.label}</span>
              {it.milestone && (
                <span className={`milestone-dot ${milestoneDone ? 'done' : ''}`}
                      title={milestoneDone ? 'milestone reached' : 'milestone pending'} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="dim small">scenario</div>
        <div className="scen-name">{state.scenario?.name || 'loading…'}</div>
        <button className="btn-link reset-link" onClick={onReset}>↻ reset session</button>
      </div>
    </aside>
  );
}
