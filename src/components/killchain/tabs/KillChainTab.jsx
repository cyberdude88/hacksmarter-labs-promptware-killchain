import { useEffect, useMemo, useState } from 'react';
import { KILL_CHAIN_STAGES, STAGE_QUESTIONS } from '../../../content/killChainCase.js';
import { deriveStageStatus, getStageEvidence, useKillChain } from '../../../state/KillChainContext.jsx';

const CONFIDENCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const DISPOSITIONS = ['SUPPORTED', 'LIKELY', 'INCONCLUSIVE'];

function stageLabel(stageId) {
  const stage = KILL_CHAIN_STAGES.find((item) => item.id === stageId);
  return stage ? `${stage.step}. ${stage.title}` : 'Unknown stage';
}

function NotebookQuestion({ question, selectedOption, onPick }) {
  return (
    <section className="artifact-card">
      <div className="artifact-label">Stage Question</div>
      <div className="field-label">{question.prompt}</div>
      <div className="verdict-grid">
        {question.options.map((option) => {
          const active = selectedOption === option.id;
          return (
            <button
              key={option.id}
              className={`verdict-chip ${active ? 'is-on' : ''}`}
              onClick={() => onPick(option.id)}
            >
              <span className="verdict-short">{option.id}</span>
              <span className="verdict-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function KillChainTab() {
  const { state, dispatch } = useKillChain();
  const stage = useMemo(
    () => KILL_CHAIN_STAGES.find((item) => item.id === state.activeStageId) || KILL_CHAIN_STAGES[0],
    [state.activeStageId],
  );
  const question = STAGE_QUESTIONS[stage.id] || null;
  const assignedEvidence = getStageEvidence(state, stage.id);
  const savedEntry = state.notebook[stage.id] || null;
  const selectedAnswer = state.stageAnswers[stage.id] || '';
  const selectedOption = question?.options.find((option) => option.id === selectedAnswer) || null;
  const status = deriveStageStatus(state, stage.id);
  const stageIndex = KILL_CHAIN_STAGES.findIndex((item) => item.id === stage.id);
  const nextStage = KILL_CHAIN_STAGES[stageIndex + 1] || null;
  const [confidence, setConfidence] = useState('MEDIUM');
  const [disposition, setDisposition] = useState('LIKELY');

  useEffect(() => {
    setConfidence(savedEntry?.confidence || 'MEDIUM');
    setDisposition(savedEntry?.disposition || 'LIKELY');
  }, [savedEntry?.savedAt, stage.id]);

  const addToIncidentReport = () => {
    if (selectedOption) {
      dispatch({
        type: 'ADD_TO_REPORT',
        kind: 'answer',
        refId: `${stage.id}::${question.id}`,
        label: selectedOption.label,
        chosenOptionId: selectedOption.id,
        filedStage: stage.id,
      });
    }
    dispatch({
      type: 'SAVE_NOTEBOOK',
      stageId: stage.id,
      entry: {
        stageId: stage.id,
        stageTitle: stage.title,
        evidenceIds: assignedEvidence.map((item) => item.id),
        confidence,
        disposition,
        answerId: selectedAnswer || null,
        questionId: question?.id || null,
      },
    });
  };

  return (
    <div className="kc-tab-pane">
      <div className="legend">
        <div className="legend-title">Kill Chain Notebook</div>
        <div className="legend-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="legend-item">
            <span className="dim small">Current stage</span>
            <span>{stageLabel(stage.id)}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Status</span>
            <span className="status">{status}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Evidence filed here</span>
            <span>{assignedEvidence.length}</span>
          </div>
          <div className="legend-item">
            <span className="dim small">Notebook saved</span>
            <span>{savedEntry?.savedAt ? 'YES' : 'NO'}</span>
          </div>
        </div>
      </div>

      <div className="filter-row">
        {KILL_CHAIN_STAGES.map((item) => (
          <button
            key={item.id}
            className={`pill ${item.id === stage.id ? 'is-on' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_STAGE', stageId: item.id })}
          >
            {item.step}. {item.title}
          </button>
        ))}
      </div>

      <div className="stage-grid">
        <section className="card stage-main">
          <div className="panel-title">
            <span>{stage.title}</span>
            <span className="dim small">{stage.aka || 'No alternate label'}</span>
          </div>

          <div className="artifact-card">
            <div className="artifact-label">Filed Evidence</div>
            {assignedEvidence.length === 0 ? (
              <div className="empty">No evidence has been filed to this stage yet.</div>
            ) : (
              <ul className="artifact-list">
                {assignedEvidence.map((item) => (
                  <li key={item.id}>
                    <span className="mono">{item.id}</span> {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {question ? (
            <NotebookQuestion
              question={question}
              selectedOption={selectedAnswer}
              onPick={(optionId) => dispatch({ type: 'ANSWER_STAGE_QUESTION', stageId: stage.id, optionId })}
            />
          ) : (
            <section className="artifact-card">
              <div className="artifact-label">Stage Question</div>
              <div className="empty">No judgment question is attached to this stage.</div>
            </section>
          )}

          <section className="artifact-card">
            <div className="artifact-label">Analyst Finding</div>
            <div className="subhead">Confidence</div>
            <div className="filter-row">
              {CONFIDENCE_LEVELS.map((level) => (
                <button
                  key={level}
                  className={`pill ${confidence === level ? 'is-on' : ''}`}
                  onClick={() => setConfidence(level)}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="subhead">Disposition</div>
            <div className="filter-row">
              {DISPOSITIONS.map((value) => (
                <button
                  key={value}
                  className={`pill ${disposition === value ? 'is-on' : ''}`}
                  onClick={() => setDisposition(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="action-row" style={{ marginTop: 10 }}>
              <button
                className="btn btn-primary"
                onClick={addToIncidentReport}
                disabled={assignedEvidence.length === 0 || !selectedAnswer}
              >
                Add to Incident Report
              </button>
              <span className="dim small">
                Requires filed evidence and an answer. Adds this stage's answer to the incident
                report and completes {stage.title}.
              </span>
              {nextStage && (
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_STAGE', stageId: nextStage.id })}
                  disabled={status !== 'COMPLETE'}
                >
                  Next: {nextStage.title} &rarr;
                </button>
              )}
            </div>
          </section>
        </section>

        <aside className="stage-side">
          <section className="card decision-card">
            <div className="panel-title">Notebook Summary</div>
            <div className="review-line">
              <span className="dim">Saved at</span>
              <strong>{savedEntry?.savedAt ? new Date(savedEntry.savedAt).toLocaleString() : 'Not saved yet'}</strong>
            </div>
            <div className="review-line">
              <span className="dim">Confidence</span>
              <strong>{savedEntry?.confidence || confidence}</strong>
            </div>
            <div className="review-line">
              <span className="dim">Disposition</span>
              <strong>{savedEntry?.disposition || disposition}</strong>
            </div>
            <div className="review-line">
              <span className="dim">Answer</span>
              <strong>{question ? (selectedOption?.label || 'Not selected') : 'No question'}</strong>
            </div>
            <div className="subhead">Stored evidence ids</div>
            {savedEntry?.evidenceIds?.length ? (
              <ul className="artifact-list">
                {savedEntry.evidenceIds.map((id) => (
                  <li key={id} className="mono">{id}</li>
                ))}
              </ul>
            ) : (
              <div className="empty">No saved notebook yet.</div>
            )}
          </section>

          <section className="card lesson-card">
            <div className="panel-title">Current Stage</div>
            <div className="lesson-copy">
              {stage.title} is currently {status.toLowerCase()}. Use the evidence board to file cards
              here, answer the question if one exists, then add it to the incident report.
            </div>
            <div className="lesson-next">
              {assignedEvidence.length === 0
                ? 'No filed evidence yet.'
                : `${assignedEvidence.length} evidence card${assignedEvidence.length === 1 ? '' : 's'} filed.`}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
