import { IDENTITY_PERMS, STAGE_QUESTIONS } from '../../../content/killChainCase.js';
import { useKillChain } from '../../../state/KillChainContext.jsx';

const QUESTION = STAGE_QUESTIONS['privilege-escalation'];

function hasReportEntry(entries, kind, refId) {
  return entries.some((entry) => entry.kind === kind && entry.refId === refId);
}

export default function IdentityTab() {
  const { state, dispatch } = useKillChain();
  const selected = state.stageAnswers['privilege-escalation'] || '';
  const selectedOption = QUESTION.options.find((o) => o.id === selected) || null;
  const reportExists = hasReportEntry(state.report.entries, 'answer', 'privilege-escalation::q-privesc');
  const evidenceMarked = Boolean(state.markedEvidence['EVID-004']);

  return (
    <div className="kc-tab-pane">
      <div className="artifact-grid">
        <section className="artifact-card">
          <div className="artifact-label">Service Permissions</div>
          <div className="review-line">
            <span>Identity</span>
            <span className="mono">{IDENTITY_PERMS.identity}</span>
          </div>
          <div className="review-line">
            <span>Granted at</span>
            <span className="mono">{IDENTITY_PERMS.grantedAt}</span>
          </div>
          <div className="review-line">
            <span>Role changes in incident window</span>
            <span>{IDENTITY_PERMS.roleChangeEventsInWindow}</span>
          </div>
          <div className="subhead">Assigned permissions</div>
          <ul className="artifact-list">
            {IDENTITY_PERMS.assigned.map((perm) => <li key={perm}>{perm}</li>)}
          </ul>
          <div className="action-row">
            <button
              className="btn"
              onClick={() => dispatch({ type: 'MARK_EVIDENCE', evidenceId: 'EVID-004' })}
              disabled={evidenceMarked}
            >
              {evidenceMarked ? 'EVIDENCE MARKED' : 'MARK PERMISSION SNAPSHOT AS EVIDENCE'}
            </button>
          </div>
        </section>

        <section className="artifact-card">
          <div className="artifact-label">Judgment Question</div>
          <div className="field-label">{QUESTION.prompt}</div>
          <div className="verdict-grid">
            {QUESTION.options.map((option) => {
              const active = selected === option.id;
              return (
                <button
                  key={option.id}
                  className={`verdict-chip ${active ? 'is-on' : ''}`}
                  onClick={() => dispatch({ type: 'ANSWER_STAGE_QUESTION', stageId: 'privilege-escalation', optionId: option.id })}
                >
                  <span className="verdict-short">{option.id}</span>
                  <span className="verdict-label">{option.label}</span>
                </button>
              );
            })}
          </div>
          <div className="action-row" style={{ marginTop: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!selectedOption) return;
                dispatch({
                  type: 'ADD_TO_REPORT',
                  kind: 'answer',
                  refId: 'privilege-escalation::q-privesc',
                  label: selectedOption.label,
                  chosenOptionId: selectedOption.id,
                });
              }}
              disabled={!selectedOption}
            >
              {reportExists ? 'Update Incident Report' : 'Add to Incident Report'}
            </button>
            <span className="dim small">No role assignment changed in the incident window.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
