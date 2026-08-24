import { AI_CONTEXT } from '../../../content/killChainCase.js';
import { useKillChain } from '../../../state/KillChainContext.jsx';

function hasReportEntry(entries, kind, refId) {
  return entries.some((entry) => entry.kind === kind && entry.refId === refId);
}

function trustClass(trust) {
  switch (trust) {
    case 'HIGH': return 'trust-high';
    case 'INTERNAL': return 'trust-internal';
    case 'EXTERNAL': return 'trust-external';
    default: return 'trust-neutral';
  }
}

export default function AiActivityTab() {
  const { state, dispatch } = useKillChain();

  const addFinding = () => {
    dispatch({
      type: 'ADD_TO_REPORT',
      kind: 'finding',
      refId: 'ai-context-trust-boundary',
      label: 'External content and internal context entered the same model context.',
    });
  };

  return (
    <div className="kc-tab-pane">
      <div className="artifact-grid">
        <section className="artifact-card">
          <div className="artifact-label">Prompt Context</div>
          <div className="review-line">
            <span>User request</span>
            <span>{AI_CONTEXT.userRequest}</span>
          </div>
          <div className="action-row">
            <button className="btn" onClick={() => dispatch({ type: 'TOGGLE_TRUST_BOUNDARIES' })}>
              {state.showTrustBoundaries ? 'HIDE TRUST BOUNDARIES' : 'SHOW TRUST BOUNDARIES'}
            </button>
            <button className="btn btn-primary" onClick={addFinding} disabled={hasReportEntry(state.report.entries, 'finding', 'ai-context-trust-boundary')}>
              ADD TO INCIDENT REPORT
            </button>
          </div>
        </section>

        <section className="artifact-card">
          <div className="artifact-label">Finding</div>
          <p className="email-paragraph" style={{ marginTop: 0 }}>
            External instructions and external data were pulled into the same assistant context
            as internal knowledge and directory lookups. That is the trust-boundary crossing the
            student should recognize here.
          </p>
          <div className="review-line">
            <span>Marked as evidence</span>
            <span className="status">{state.markedEvidence['EVID-001'] ? 'yes' : 'no'}</span>
          </div>
        </section>
      </div>

      <div className="stage-grid">
        <section className="card stage-main">
          <div className="panel-title">Context Sources</div>
          <div className="source-list">
            {AI_CONTEXT.sources.map((source) => {
              const evidenceId = source.label === 'External Email'
                ? 'EVID-001'
                : source.label === 'Vendor Attachment'
                  ? 'EVID-002'
                  : null;
              const canMark = Boolean(evidenceId);
              const marked = evidenceId ? Boolean(state.markedEvidence[evidenceId]) : false;
              return (
                <article key={source.id} className="artifact-card source-card">
                  <div className="source-head">
                    <div>
                      <div className="source-label">{source.label}</div>
                      <div className="dim small">{source.detail}</div>
                    </div>
                    {state.showTrustBoundaries && (
                      <span className={`trust-badge ${trustClass(source.trust)}`}>{source.trust}</span>
                    )}
                  </div>
                  <div className="action-row">
                    {canMark && (
                      <button
                        className="btn"
                        onClick={() => dispatch({ type: 'MARK_EVIDENCE', evidenceId })}
                        disabled={marked}
                      >
                        {marked ? 'EVIDENCE MARKED' : 'ADD TO EVIDENCE'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="stage-side">
          <section className="card">
            <div className="panel-title">Tool Calls</div>
            <table className="alert-table">
              <thead>
                <tr>
                  <th style={{ width: 86 }}>Time</th>
                  <th style={{ width: 156 }}>Tool</th>
                  <th>Arguments</th>
                </tr>
              </thead>
              <tbody>
                {AI_CONTEXT.toolCalls.map((call) => (
                  <tr key={`${call.tool}-${call.ts}`} className="alert-row">
                    <td className="mono">{call.ts}</td>
                    <td className="mono">{call.tool}</td>
                    <td>{call.args}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
      </div>
    </div>
  );
}
