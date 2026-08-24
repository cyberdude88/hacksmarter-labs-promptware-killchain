import { CASE, ALERT } from '../../../content/killChainCase.js';
import { useKillChain, useKillChainMetrics } from '../../../state/KillChainContext.jsx';

export default function OverviewTab() {
  const { state } = useKillChain();
  const metrics = useKillChainMetrics();

  return (
    <div className="kc-tab-pane">
      <div className="legend">
        <div className="legend-title">{ALERT.title}</div>
        <div className="legend-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="legend-item">
            <span className="dim small">Severity</span>
            <span className="sev-badge sev-high">{ALERT.severity}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Entity</span>
            <span className="mono">{ALERT.entity}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Agent</span>
            <span>{ALERT.agent}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Time</span>
            <span className="mono">{ALERT.time}</span>
          </div>
        </div>
        <ul className="artifact-list">
          {ALERT.observed.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      </div>

      <div className="stage-grid">
        <div className="stage-main card">
          <div className="panel-title">Entities</div>
          <div className="review-line"><span>Organization</span><span>{CASE.org}</span></div>
          <div className="review-line"><span>AI agent</span><span>{CASE.agentName}</span></div>
          <div className="review-line"><span>Service identity</span><span className="mono">{CASE.identity}</span></div>
          <div className="subhead">ARIA capabilities</div>
          <ul className="artifact-list">
            {CASE.agentCapabilities.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <div className="stage-side card">
          <div className="panel-title">Investigation status</div>
          <div className="review-line"><span>Evidence collected</span><span>{metrics.evidenceCollected}</span></div>
          <div className="review-line"><span>Report entries</span><span>{metrics.reportEntryCount}</span></div>
          <div className="review-line"><span>Stages complete</span><span>{metrics.stagesComplete} / {metrics.stagesTotal}</span></div>
          <div className="subhead">Normal ARIA behavior</div>
          <ul className="artifact-list">
            {CASE.normalBehavior.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
