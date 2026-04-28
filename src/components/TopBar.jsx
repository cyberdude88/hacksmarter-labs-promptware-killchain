import { useSoc, useDerivedMetrics } from '../state/SocContext.jsx';

// Always-visible student-facing metrics: risk meter, alert rate, coverage %, timer.
export default function TopBar() {
  const { state } = useSoc();
  const { alertRate, coverage, timer, backlog } = useDerivedMetrics();

  const riskClass =
    state.riskLevel >= 70 ? 'crit' : state.riskLevel >= 40 ? 'high' : state.riskLevel >= 15 ? 'med' : 'low';

  return (
    <header className="topbar">
      <div className="metric metric-risk">
        <div className="metric-label">RISK</div>
        <div className="risk-bar">
          <div className={`risk-fill risk-${riskClass}`} style={{ width: `${state.riskLevel}%` }} />
          <div className="risk-num">{state.riskLevel}</div>
        </div>
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
