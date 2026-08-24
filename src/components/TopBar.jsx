import { useSoc, useDerivedMetrics } from '../state/SocContext.jsx';

export default function TopBar() {
  const { state, dispatch } = useSoc();
  const { alertRate, coverage, timer, backlog } = useDerivedMetrics();

  return (
    <header className="topbar">
      <div className="metric metric-search">
        <div className="metric-label">SEARCH</div>
        <input
          type="text"
          className="search-bar"
          placeholder="ip, rule, summary…"
          value={state.alertSearch}
          onChange={(e) => dispatch({ type: 'SET_ALERT_SEARCH', query: e.target.value })}
        />
      </div>

      <Metric label="ALERT RATE" value={`${alertRate}/min`} hint={backlog > 0 ? `${backlog} pending` : 'cleared'} />
      <Metric label="COVERAGE" value={`${coverage}%`} hint={`${state.detectionRules.length} rules`} />
      <Metric label="TIMER" value={timer} mono />
    </header>
  );
}

function Metric({ label, value, hint, mono, accent }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${mono ? 'mono' : ''} ${accent ? 'accent' : ''}`}>{value}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  );
}
