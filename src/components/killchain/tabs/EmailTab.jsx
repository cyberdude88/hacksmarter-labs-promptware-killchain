import { useState } from 'react';
import { EMAIL, EMAILS, STAGE_QUESTIONS } from '../../../content/killChainCase.js';
import { useKillChain } from '../../../state/KillChainContext.jsx';

const VIEWS = [
  { id: 'raw', label: 'View Raw Message' },
  { id: 'ai', label: 'View AI-Extracted Content' },
  { id: 'headers', label: 'View Headers' },
  { id: 'attachments', label: 'View Attachments' },
];

const CLAIM_ID = 'email-msg-0417';
const QUESTION_REF = 'initial-access::q-instruction-type';
const QUESTION = STAGE_QUESTIONS['initial-access'];

function hasReportEntry(entries, kind, refId) {
  return entries.some((entry) => entry.kind === kind && entry.refId === refId);
}

function PromptAnalysis() {
  const { state, dispatch } = useKillChain();
  const selected = state.instructionType;
  const selectedOption = QUESTION.options.find((o) => o.id === selected) || null;
  const reportReady = Boolean(selectedOption);
  const reportExists = hasReportEntry(state.report.entries, 'answer', QUESTION_REF);

  return (
    <section className="artifact-card">
      <div className="artifact-label">Prompt Analysis</div>
      <div className="dim small" style={{ marginBottom: 10 }}>
        Classify the instruction type embedded in the extracted content. The answer is not shown
        here; choose the best fit from the options below.
      </div>
      <div className="verdict-grid">
        {QUESTION.options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              className={`verdict-chip ${active ? 'is-on' : ''}`}
              onClick={() => dispatch({ type: 'SET_INSTRUCTION_TYPE', optionId: option.id })}
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
              refId: QUESTION_REF,
              label: selectedOption.label,
              chosenOptionId: selectedOption.id,
            });
          }}
          disabled={!reportReady}
        >
          {reportExists ? 'Update Incident Report' : 'Add to Incident Report'}
        </button>
        <span className="dim small">Prompt analysis stays ungraded until the later notebook phase.</span>
      </div>
    </section>
  );
}

const byReceivedAt = (a, b) => (a.receivedAt < b.receivedAt ? -1 : a.receivedAt > b.receivedAt ? 1 : 0);
const INBOX = [...EMAILS].sort(byReceivedAt);

export default function EmailTab() {
  const { state, dispatch } = useKillChain();
  const [view, setView] = useState('raw');
  const [selectedId, setSelectedId] = useState(EMAIL.messageId);
  const injectedMarked = Boolean(state.markedEvidence['EVID-003']);
  const claim = state.claims[CLAIM_ID] || null;

  const selected = EMAILS.find((m) => m.messageId === selectedId) || EMAIL;
  const isFlagged = selected.messageId === EMAIL.messageId;

  const markInjection = () => {
    dispatch({ type: 'MARK_EVIDENCE', evidenceId: 'EVID-003' });
    dispatch({ type: 'SET_CLAIM', claimId: CLAIM_ID, verdict: 'injection' });
  };

  const addEvidenceOnly = () => {
    dispatch({ type: 'MARK_EVIDENCE', evidenceId: 'EVID-003' });
  };

  const selectMessage = (messageId) => {
    setSelectedId(messageId);
    setView('raw');
  };

  return (
    <div className="kc-tab-pane">
      <section className="artifact-card">
        <div className="artifact-label">Inbox &middot; {INBOX.length} messages</div>
        <div className="kc-table-wrap">
          <table className="alert-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>From</th>
                <th>To</th>
                <th>Subject</th>
                <th>Source IP</th>
              </tr>
            </thead>
            <tbody>
              {INBOX.map((m) => {
                const active = m.messageId === selectedId;
                const flagged = m.messageId === EMAIL.messageId;
                return (
                  <tr
                    key={m.messageId}
                    className={`alert-row ${active ? 'is-selected' : ''}`}
                    onClick={() => selectMessage(m.messageId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="ts">{m.receivedAt}</td>
                    <td className="mono">{m.from}</td>
                    <td className="mono">{m.to}</td>
                    <td>
                      {m.subject}
                      {flagged && <span className="sev-badge sev-high" style={{ marginLeft: 8 }}>FLAGGED</span>}
                    </td>
                    <td className="mono">{m.headers['X-Originating-IP']}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="artifact-grid">
        <section className="artifact-card">
          <div className="artifact-label">Message Views &middot; {selected.messageId}</div>
          <div className="filter-row" style={{ marginBottom: 10 }}>
            {VIEWS.map((item) => (
              <button
                key={item.id}
                className={`pill ${view === item.id ? 'is-on' : ''}`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {view === 'raw' && (
            <pre className="email-pre">{selected.raw}</pre>
          )}

          {view === 'ai' && (
            <>
              {isFlagged ? (
                <>
                  <p className="email-paragraph">{selected.aiExtracted}</p>
                  <div className="action-row">
                    <button className="btn btn-primary" onClick={markInjection}>
                      MARK AS PROMPT INJECTION
                    </button>
                    <button className="btn" onClick={addEvidenceOnly} disabled={injectedMarked}>
                      ADD TO EVIDENCE
                    </button>
                    <button className={`btn ${claim === 'benign' ? 'btn-primary' : ''}`}
                            onClick={() => dispatch({ type: 'SET_CLAIM', claimId: CLAIM_ID, verdict: 'benign' })}>
                      MARK BENIGN
                    </button>
                    <button className={`btn ${claim === 'sender' ? 'btn-primary' : ''}`}
                            onClick={() => dispatch({ type: 'SET_CLAIM', claimId: CLAIM_ID, verdict: 'sender' })}>
                      INVESTIGATE SENDER
                    </button>
                  </div>
                  {injectedMarked && <div className="status-note">Injected passage flagged for follow-up.</div>}
                </>
              ) : (
                <p className="dim small">
                  No embedded directive extracted from this message — content stayed within the
                  sender's stated purpose.
                </p>
              )}
            </>
          )}

          {view === 'headers' && (
            <table className="alert-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selected.headers).map(([key, value]) => (
                  <tr key={key} className="alert-row">
                    <td className="mono">{key}</td>
                    <td className="mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'attachments' && (
            <div className="attachment-list">
              {selected.attachments.length === 0 && <div className="dim small">No attachments.</div>}
              {selected.attachments.map((attachment) => (
                <div key={attachment.name} className="review-line">
                  <span>{attachment.name}</span>
                  <span className="dim small">{attachment.sizeKb} KB</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="artifact-card">
          <div className="artifact-label">Analyst Actions</div>
          <div className="review-line">
            <span>Flagged message</span>
            <span className="mono">{EMAIL.messageId}</span>
          </div>
          <div className="review-line">
            <span>Source verdict</span>
            <span className="status">{claim || 'unlabeled'}</span>
          </div>
          <div className="review-line">
            <span>Evidence flag</span>
            <span className="status">{injectedMarked ? 'marked' : 'not marked'}</span>
          </div>
        </section>
      </div>

      {injectedMarked && <PromptAnalysis />}
    </div>
  );
}
