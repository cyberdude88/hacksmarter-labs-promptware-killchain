import { useState } from 'react';
import { useSoc } from '../state/SocContext.jsx';

// SOC alert table — appends in real time, supports self-assignment + triage.
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const TRIAGE = [
  { k: 'true_positive',  label: 'Confirm',  short: 'TP',  cls: 'tp',
    title: 'True Positive — confirmed real attack activity' },
  { k: 'false_positive', label: 'Dismiss',  short: 'FP',  cls: 'fp',
    title: 'False Positive — benign / legitimate activity' },
  { k: 'escalate',       label: 'Escalate', short: 'ESC', cls: 'esc',
    title: 'Escalate — needs senior analyst / IR engagement' },
];

const FILTERS = [
  { k: 'all',        label: 'All' },
  { k: 'unassigned', label: 'Unassigned' },
  { k: 'mine',       label: 'Mine' },
  { k: 'resolved',   label: 'Resolved' },
];

export default function AlertsPage() {
  const { state, dispatch } = useSoc();
  const [filter, setFilter] = useState('all');

  const matches = (al) => {
    switch (filter) {
      case 'unassigned': return al.status === 'NEW';
      case 'mine':       return al.assignedTo === 'me' && (al.status === 'ASSIGNED' || al.status === 'TRIAGED' || al.status === 'ESCALATED');
      case 'resolved':   return al.status === 'TRIAGED' || al.status === 'ESCALATED';
      default:           return true;
    }
  };
  const search = state.alertSearch.trim().toLowerCase();
  const matchesSearch = (al) =>
    !search ||
    al.src_ip.toLowerCase().includes(search) ||
    al.rule_name.toLowerCase().includes(search) ||
    al.summary.toLowerCase().includes(search);
  const filtered = state.alerts.filter((al) => matches(al) && matchesSearch(al));

  // Sort: open first (NEW > ASSIGNED), then by severity, then newest.
  const STATUS_ORDER = { NEW: 0, ASSIGNED: 1, ESCALATED: 2, TRIAGED: 3 };
  const sorted = [...filtered].sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (so !== 0) return so;
    const sev = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
    if (sev !== 0) return sev;
    return b.emittedAt - a.emittedAt;
  });

  const counts = {
    all:        state.alerts.length,
    unassigned: state.alerts.filter((a) => a.status === 'NEW').length,
    mine:       state.alerts.filter((a) => a.assignedTo === 'me' && a.status !== 'NEW').length,
    resolved:   state.alerts.filter((a) => a.status === 'TRIAGED' || a.status === 'ESCALATED').length,
  };

  return (
    <div className="page page-alerts">
      <div className="page-head">
        <div>
          <h1>Alert Queue</h1>
          <div className="dim">
            {state.alerts.length} alert{state.alerts.length === 1 ? '' : 's'} · streaming live · ~4s cadence
          </div>
        </div>
      </div>

      {/* Beginner-friendly legend — explains what each verdict actually means in a real SOC workflow */}
      <div className="legend">
        <div className="legend-title">How to triage an alert</div>
        <div className="legend-grid">
          <div className="legend-item">
            <div><b className="tp">Confirm</b> <span className="dim small">(True Positive)</span></div>
            <div className="legend-gist">"This alert is real malicious activity."</div>
            <div className="dim small">
              Next steps in real life: contain (block IP, isolate host, disable account), open an
              incident-response ticket, preserve evidence.
            </div>
          </div>

          <div className="legend-item">
            <div><b className="fp">Dismiss</b> <span className="dim small">(False Positive)</span></div>
            <div className="legend-gist">"This alert is benign / legitimate activity."</div>
            <div className="dim small">
              Next steps in real life: close the ticket and — if the detection rule is noisy — send it
              back to the detection team for tuning.
            </div>
          </div>

          <div className="legend-item">
            <div><b className="esc">Escalate</b></div>
            <div className="legend-gist">"This is beyond my tier / authority."</div>
            <div className="dim small">
              Hand off to <b>Tier 2 / Incident Response</b> when scope, impact, or required access
              exceeds your level. Common triggers: confirmed admin compromise, data exfiltration,
              ransomware indicators.
            </div>
          </div>
        </div>

        <div className="legend-foot dim small">
          <b>Assign to me</b> claims a ticket into your queue (like Jira/ServiceNow) without resolving
          it — useful when you want to investigate before deciding.
        </div>
      </div>

      {/* Filter pills */}
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f.k}
                  className={`pill ${filter === f.k ? 'is-on' : ''}`}
                  onClick={() => setFilter(f.k)}>
            {f.label} <span className="pill-count">{counts[f.k]}</span>
          </button>
        ))}
      </div>

      {sorted.length === 0 && <div className="empty">no alerts in this view</div>}

      {sorted.length > 0 && (
        <table className="alert-table">
          <thead>
            <tr>
              <th>time</th>
              <th>sev</th>
              <th>source_ip</th>
              <th>rule_name</th>
              <th>status</th>
              <th>assignee</th>
              <th>conf</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((al) => {
              const selected = al.id === state.selectedAlertId;
              const open = al.status === 'NEW' || al.status === 'ASSIGNED';
              const priority = al.expectedVerdict && al.expectedVerdict !== 'false_positive';
              return (
                <tr
                  key={al.id}
                  className={`alert-row sev-${al.severity} ${selected ? 'is-selected' : ''} ${open ? '' : 'is-done'} ${al.status === 'NEW' ? 'is-new' : ''} ${priority ? 'is-priority' : 'is-benign'}`}
                  onClick={() => dispatch({ type: 'SELECT_ALERT', id: al.id })}
                >
                  <td className="ts">{al.ts}</td>
                  <td><span className={`sev-badge sev-${al.severity}`}>{al.severity}</span></td>
                  <td className="mono">{al.src_ip}</td>
                  <td>
                    <div className="rule-name">{al.rule_name}</div>
                    <div className="dim small">{al.summary}</div>
                  </td>
                  <td><span className={`status status-${al.status.toLowerCase()}`}>{al.status}</span></td>
                  <td className="mono dim">{al.assignedTo || '—'}</td>
                  <td className="mono">{al.confidence}%</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {open ? (
                      <div className="action-row">
                        {al.status === 'NEW' && (
                          <button className="t-btn take"
                                  title="Claim this ticket — moves it to your queue without resolving it yet"
                                  onClick={() => dispatch({ type: 'ASSIGN', id: al.id })}>
                            Assign to me
                          </button>
                        )}
                        {TRIAGE.map((t) => (
                          <button key={t.k}
                                  className={`t-btn ${t.cls}`}
                                  title={t.title}
                                  onClick={() => dispatch({ type: 'TRIAGE', id: al.id, verdict: t.k })}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="dim small">{al.verdict?.replace('_', ' ')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="page-foot dim small">
        Tip: clicking a row pre-filters Investigation to that alert's source IP.
      </div>
    </div>
  );
}
