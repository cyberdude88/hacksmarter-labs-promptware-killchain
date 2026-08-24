import { EVENTS } from '../../../content/killChainCase.js';
import { useKillChain } from '../../../state/KillChainContext.jsx';

function hasReportEntry(entries, kind, refId) {
  return entries.some((entry) => entry.kind === kind && entry.refId === refId);
}

export default function NetworkTab() {
  const { state, dispatch } = useKillChain();
  const rows = EVENTS.filter((event) => event.source === 'NETWORK');
  const reportExists = hasReportEntry(state.report.entries, 'finding', 'network-attempted-outbound');

  return (
    <div className="kc-tab-pane">
      <div className="artifact-grid">
        <section className="artifact-card">
          <div className="artifact-label">Network Evidence</div>
          <div className="kc-table-wrap">
            <table className="alert-table">
              <thead>
                <tr>
                  <th style={{ width: 88 }}>Time</th>
                  <th style={{ width: 170 }}>Destination</th>
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
                      <td className="mono">{row.destination || '—'}</td>
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
          <div className="artifact-label">C2 Judgment</div>
          <p className="email-paragraph" style={{ marginTop: 0 }}>
            The outbound connection is logged as attempted only. There is no delivery confirmation
            in the captured window, which keeps the conclusion narrower than a confirmed exfiltration
            claim.
          </p>
          <div className="action-row">
            <button
              className="btn btn-primary"
              onClick={() => dispatch({
                type: 'ADD_TO_REPORT',
                kind: 'finding',
                refId: 'network-attempted-outbound',
                label: 'Outbound transmission was attempted, not confirmed delivered.',
              })}
              disabled={reportExists}
            >
              ADD TO INCIDENT REPORT
            </button>
            <span className="dim small">The C2-style question itself is part of the later notebook phase.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
