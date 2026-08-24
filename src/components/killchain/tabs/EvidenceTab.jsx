import { EVIDENCE_CATALOG, KILL_CHAIN_STAGES } from '../../../content/killChainCase.js';
import { deriveStageStatus, getStageEvidence, useKillChain } from '../../../state/KillChainContext.jsx';

function stageLabel(stageId) {
  const stage = KILL_CHAIN_STAGES.find((item) => item.id === stageId);
  return stage ? `${stage.step}. ${stage.title}` : 'Unassigned';
}

export default function EvidenceTab() {
  const { state, dispatch } = useKillChain();
  const markedCount = Object.keys(state.markedEvidence).length;
  const assignedCount = Object.values(state.boardAssignments).filter(Boolean).length;

  return (
    <div className="kc-tab-pane">
      <div className="legend">
        <div className="legend-title">Evidence Board</div>
        <div className="legend-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="legend-item">
            <span className="dim small">Catalog cards</span>
            <span>{EVIDENCE_CATALOG.length}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Marked</span>
            <span>{markedCount}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Filed to stages</span>
            <span>{assignedCount}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Open notebook stages</span>
            <span>{KILL_CHAIN_STAGES.filter((stage) => deriveStageStatus(state, stage.id) !== 'LOCKED').length}</span>
          </div>
        </div>
      </div>

      <div className="artifact-grid">
        <section className="artifact-card">
          <div className="artifact-label">Curated Evidence Cards</div>
          <div className="source-list">
            {EVIDENCE_CATALOG.map((evidence) => {
              const marked = Boolean(state.markedEvidence[evidence.id]);
              const assignedStage = state.boardAssignments[evidence.id] || '';
              const canFile = marked && assignedStage;
              return (
                <article key={evidence.id} className="artifact-card source-card">
                  <div className="source-head">
                    <div>
                      <div className="source-label">{evidence.label}</div>
                      <div className="dim small mono">{evidence.id}</div>
                    </div>
                    <span className={`status ${marked ? 'status-assigned' : 'status-triaged'}`}>
                      {marked ? 'MARKED' : 'UNMARKED'}
                    </span>
                  </div>
                  <div className="email-paragraph">{evidence.detail}</div>
                  <div className="review-line">
                    <span className="dim">Best-fit stage</span>
                    <span>{stageLabel(evidence.stage)}</span>
                  </div>
                  <div className="review-line">
                    <span className="dim">Currently filed</span>
                    <span>{stageLabel(assignedStage)}</span>
                  </div>
                  <div className="review-line">
                    <span className="dim">Source events</span>
                    <span className="mono">{evidence.sourceEventIds.join(', ')}</span>
                  </div>
                  <div className="action-row">
                    <select
                      className="search-bar"
                      value={assignedStage}
                      onChange={(event) => dispatch({
                        type: 'ASSIGN_EVIDENCE_TO_STAGE',
                        evidenceId: evidence.id,
                        stageId: event.target.value,
                      })}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <option value="">Choose stage</option>
                      {KILL_CHAIN_STAGES.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.step}. {stage.title}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={() => dispatch({
                        type: 'ADD_TO_REPORT',
                        kind: 'evidence',
                        refId: evidence.id,
                        label: evidence.label,
                        filedStage: assignedStage,
                      })}
                      disabled={!canFile}
                    >
                      Add to Incident Report
                    </button>
                  </div>
                  {!marked && (
                    <div className="status-note">
                      Flag this card in Email, AI Activity, Identity, Data Access, or Network first.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="artifact-card">
          <div className="artifact-label">Board Snapshot</div>
          <div className="source-list">
            {KILL_CHAIN_STAGES.map((stage) => {
              const assigned = getStageEvidence(state, stage.id);
              const status = deriveStageStatus(state, stage.id);
              return (
                <article key={stage.id} className="artifact-card source-card">
                  <div className="source-head">
                    <div>
                      <div className="source-label">{stage.step}. {stage.title}</div>
                      <div className="dim small">{stage.aka || 'Direct stage'}</div>
                    </div>
                    <span className="status">{status}</span>
                  </div>
                  <div className="review-line">
                    <span className="dim">Assigned evidence</span>
                    <span>{assigned.length}</span>
                  </div>
                  {assigned.length === 0 ? (
                    <div className="empty">No evidence filed here yet.</div>
                  ) : (
                    <ul className="artifact-list">
                      {assigned.map((evidence) => (
                        <li key={evidence.id}>
                          <span className="mono">{evidence.id}</span> {evidence.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="action-row">
                    <button
                      className="btn"
                      onClick={() => {
                        dispatch({ type: 'SET_ACTIVE_STAGE', stageId: stage.id });
                        dispatch({ type: 'SET_TAB', tab: 'kill-chain' });
                      }}
                    >
                      Review stage
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
