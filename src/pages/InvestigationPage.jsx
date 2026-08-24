import { ALERT } from '../content/killChainCase.js';
import { useKillChain, useKillChainMetrics } from '../state/KillChainContext.jsx';
import KillChainRail from '../components/killchain/KillChainRail.jsx';
import ReportDrawer from '../components/killchain/ReportDrawer.jsx';
import OverviewTab from '../components/killchain/tabs/OverviewTab.jsx';
import TimelineTab from '../components/killchain/tabs/TimelineTab.jsx';
import EmailTab from '../components/killchain/tabs/EmailTab.jsx';
import AiActivityTab from '../components/killchain/tabs/AiActivityTab.jsx';
import IdentityTab from '../components/killchain/tabs/IdentityTab.jsx';
import DataAccessTab from '../components/killchain/tabs/DataAccessTab.jsx';
import NetworkTab from '../components/killchain/tabs/NetworkTab.jsx';
import EvidenceTab from '../components/killchain/tabs/EvidenceTab.jsx';
import KillChainTab from '../components/killchain/tabs/KillChainTab.jsx';

// Kill Chain page — Detect & Analyze phase of the incident-response
// lifecycle. Nearly the entire promptware kill chain lives here: the
// analyst investigates a live incident (Northstar Research Group / ARIA
// Enterprise Assistant) across correlated telemetry, classifies evidence
// against the seven-stage kill chain (Brodt, Feldman, Schneier & Nassi,
// arXiv:2601.09625), and builds an incident report as they go.
//
// Built in phases (see /home/alex/.claude/plans/quizzical-petting-giraffe.md):
// Phase A shipped the shell; Phase B filled in the evidence-gathering tabs;
// Phase C adds the evidence board and per-stage notebook.

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'email', label: 'Email' },
  { id: 'ai-activity', label: 'AI Activity' },
  { id: 'identity', label: 'Identity' },
  { id: 'data-access', label: 'Data Access' },
  { id: 'network', label: 'Network' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'kill-chain', label: 'Kill Chain' },
];

function TabStub({ label }) {
  return (
    <div className="kc-tab-pane">
      <div className="empty">
        The {label} tab lands in a later build phase — see CLAUDE.md / the
        approved plan for the phase order.
      </div>
    </div>
  );
}

function AlertScreen() {
  const { dispatch } = useKillChain();

  const enter = (tab) => {
    dispatch({ type: 'OPEN_INVESTIGATION' });
    dispatch({ type: 'SET_TAB', tab });
  };

  return (
    <div className="page page-killchain">
      <div className="page-head">
        <div>
          <h1>Promptware Kill Chain</h1>
          <div className="dim">Detect &amp; Analyze &middot; AI agent behavioral anomaly</div>
        </div>
      </div>

      <div className="legend">
        <div className="legend-title">
          {ALERT.title}
          <span className="sev-badge sev-high" style={{ marginLeft: 8 }}>{ALERT.severity}</span>
        </div>
        <div className="legend-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="legend-item"><span className="dim small">Entity</span><span className="mono">{ALERT.entity}</span></div>
          <div className="legend-item"><span className="dim small">Agent</span><span>{ALERT.agent}</span></div>
          <div className="legend-item"><span className="dim small">Time</span><span className="mono">{ALERT.time}</span></div>
          <div className="legend-item"><span className="dim small">Status</span><span>NEW</span></div>
        </div>
        <div className="subhead">Observed behavior</div>
        <ul className="artifact-list">
          {ALERT.observed.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      </div>

      <div className="action-row">
        <button className="btn btn-primary" onClick={() => enter('overview')}>INVESTIGATE</button>
        <button className="btn" onClick={() => enter('timeline')}>VIEW TIMELINE</button>
        <button className="btn" onClick={() => enter('overview')}>VIEW ENTITY</button>
        <button className="btn" onClick={() => enter('timeline')}>VIEW RAW EVENTS</button>
      </div>
    </div>
  );
}

function Workspace() {
  const { state, dispatch } = useKillChain();
  const metrics = useKillChainMetrics();

  const renderTab = () => {
    switch (state.activeTab) {
      case 'overview': return <OverviewTab />;
      case 'timeline': return <TimelineTab />;
      case 'email': return <EmailTab />;
      case 'ai-activity': return <AiActivityTab />;
      case 'identity': return <IdentityTab />;
      case 'data-access': return <DataAccessTab />;
      case 'network': return <NetworkTab />;
      case 'evidence': return <EvidenceTab />;
      case 'kill-chain': return <KillChainTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="page page-killchain">
      <div className="page-head">
        <div>
          <h1>Promptware Kill Chain</h1>
          <div className="dim">Detect &amp; Analyze &middot; {ALERT.entity}</div>
        </div>
        <button className="btn kc-report-toggle" onClick={() => dispatch({ type: 'TOGGLE_REPORT_DRAWER' })}>
          Incident Report
          <span className="pill-count">{metrics.reportEntryCount}</span>
          {metrics.reportBumps > 0 && <span className="report-bump" title={`${metrics.reportBumps} entries need another look`} />}
        </button>
      </div>

      <KillChainRail />

      <div className="tab-strip" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${state.activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: t.id })}
            role="tab"
            aria-selected={state.activeTab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {renderTab()}
      <ReportDrawer />
    </div>
  );
}

export default function InvestigationPage() {
  const { state } = useKillChain();
  return state.opened ? <Workspace /> : <AlertScreen />;
}
