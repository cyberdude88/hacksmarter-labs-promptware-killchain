import { CASE, EVENTS } from '../../../content/killChainCase.js';
import { useKillChain } from '../../../state/KillChainContext.jsx';

const KEY_MAP = {
  documentsPerRequest: 'Documents / request',
  repositoriesPerRequest: 'Repositories / request',
  toolCallsPerRequest: 'Tool calls / request',
  crossDepartment: 'Cross-department access',
  externalOutput: 'External output',
  executiveAccess: 'Executive access',
};

function hasReportEntry(entries, kind, refId) {
  return entries.some((entry) => entry.kind === kind && entry.refId === refId);
}

export default function DataAccessTab() {
  const { state, dispatch } = useKillChain();
  const rows = EVENTS.filter((event) => event.source === 'DATA');
  const reportExists = hasReportEntry(state.report.entries, 'finding', 'data-access-baseline-anomaly');

  return (
    <div className="kc-tab-pane">
      <div className="artifact-grid">
        <section className="artifact-card">
          <div className="artifact-label">Repository Access</div>
          <div className="kc-table-wrap">
            <table className="alert-table">
              <thead>
                <tr>
                  <th style={{ width: 88 }}>Time</th>
                  <th style={{ width: 108 }}>Repository</th>
                  <th style={{ width: 150 }}>Event</th>
                  <th>Detail</th>
                  <th style={{ width: 140 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const marked = Boolean(state.markedEvidence[row.id]);
                  return (
                    <tr key={row.id} className="alert-row">
                      <td className="mono">{row.ts}</td>
                      <td>{row.repository || '—'}</td>
                      <td className="mono">{row.event_type}</td>
                      <td>{row.detail}</td>
                      <td>
                        <button
                          className="btn"
                          onClick={() => dispatch({ type: 'MARK_EVIDENCE', evidenceId: row.id })}
                          disabled={marked}
                        >
                          {marked ? 'EVIDENCE MARKED' : 'MARK AS EVIDENCE'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="artifact-card">
          <div className="artifact-label">Baseline / Anomaly</div>
          <div className="kc-table-wrap">
            <table className="alert-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Baseline</th>
                  <th>Incident</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(KEY_MAP).map(([key, label]) => (
                  <tr key={key} className="alert-row">
                    <td>{label}</td>
                    <td className="mono">{CASE.baseline[key]}</td>
                    <td className="mono">{CASE.incident[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="action-row" style={{ marginTop: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => dispatch({
                type: 'ADD_TO_REPORT',
                kind: 'finding',
                refId: 'data-access-baseline-anomaly',
                label: 'Repository usage exceeded the normal baseline during the incident window.',
              })}
              disabled={reportExists}
            >
              ADD TO INCIDENT REPORT
            </button>
            <span className="dim small">The anomaly table is static; the search-driven hunt panel comes later.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
