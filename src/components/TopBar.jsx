import { useSoc } from '../state/SocContext.jsx';

export default function TopBar() {
  const { state, dispatch } = useSoc();

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
    </header>
  );
}
