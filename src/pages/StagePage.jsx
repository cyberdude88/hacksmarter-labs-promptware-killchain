import { useEffect, useMemo, useState } from 'react';
import { RANGE_DECISIONS, RANGE_STAGE_MAP, RANGE_STAGES } from '../content/rangeStages.js';
import { useRange } from '../state/RangeContext.jsx';

export default function StagePage({ stageId }) {
  const { state, dispatch } = useRange();
  const stage = RANGE_STAGE_MAP[stageId] || RANGE_STAGE_MAP[state.activeStageId] || null;
  const decision = stage ? state.decisions[stage.id] : null;
  const note = stage ? state.notes[stage.id] || '' : '';
  const [localNote, setLocalNote] = useState(note);

  useEffect(() => {
    setLocalNote(note);
  }, [note, stage?.id]);

  useEffect(() => {
    if (!stage || decision?.locked) return;
    const onKeyDown = (event) => {
      const key = event.key;
      if (!/^[1-9]$/.test(key)) return;
      const idx = Number(key) - 1;
      const verdict = stage.verdicts[idx];
      if (!verdict) return;
      dispatch({ type: 'SAVE_DECISION', stageId: stage.id, verdict: verdict.value });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, decision?.locked, stage]);

  const verdicts = useMemo(() => stage?.verdicts || RANGE_DECISIONS, [stage]);
  const selectedVerdict = decision?.verdict || '';
  const locked = Boolean(decision?.locked);
  const canLock = Boolean(stage && selectedVerdict && !locked);
  const stageIndex = stage ? RANGE_STAGES.findIndex((item) => item.id === stage.id) : -1;
  const nextStage = stageIndex >= 0 ? RANGE_STAGES[stageIndex + 1] ?? null : null;

  const saveNote = (value) => {
    setLocalNote(value);
    if (!stage) return;
    dispatch({ type: 'SAVE_NOTE', stageId: stage.id, note: value });
  };

  const lockStage = () => {
    if (!stage) return;
    dispatch({ type: 'LOCK_STAGE', stageId: stage.id });
  };

  if (!stage) {
    return (
      <div className="stage-empty">
        <div className="empty">No stage is available.</div>
      </div>
    );
  }

  return (
    <div className="stage-page">
      <div className="page-head stage-head">
        <div>
          <div className="stage-kicker">{stage.step}</div>
          <h1>{stage.title}</h1>
          <div className="dim">{stage.summary}</div>
        </div>
        <div className="stage-score card-score">
          <div className="metric-label">SCORE</div>
          <div className="score-num">{state.score}</div>
        </div>
      </div>

      <div className="stage-grid">
        <section className="card stage-main">
          <div className="panel-title">
            <span>Prompt</span>
            <span className="dim small">{locked ? 'locked' : 'in progress'}</span>
          </div>
          <p className="stage-prompt">{stage.prompt}</p>

          <div className="axiom-card">
            <div className="panel-title">AXIOM verdict</div>
            <div className="axiom-verdict">{stage.axiomVerdict}</div>
            <div className="axiom-truth">
              <span>Truth: {locked ? stage.truth : 'hidden until commit'}</span>
              <span>Failure mode: {locked ? stage.failureMode : 'hidden until commit'}</span>
            </div>
          </div>

          <div className="panel-title">Telemetry snapshot</div>
          <div className="telemetry-list">
            {stage.telemetry.map((row) => (
              <div key={row} className="telemetry-row">
                <span className="ts">•</span>
                <span className="telemetry-detail">{row}</span>
              </div>
            ))}
          </div>

          <div className="artifact-grid">
            <article className="artifact-card">
              <div className="artifact-label">Thinking</div>
              <ul className="artifact-list">
                {stage.thinking.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </article>
            <article className="artifact-card">
              <div className="artifact-label">Agent notes</div>
              <ul className="artifact-list">
                {stage.agent.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </article>
          </div>

          <div className="artifact-card">
            <div className="artifact-label">Questions</div>
            <ul className="artifact-list">
              {stage.questions.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </section>

        <aside className="stage-side">
          <section className="card decision-card">
            <div className="panel-title">Verdict</div>
            <div className="verdict-grid">
              {verdicts.map((verdict, index) => {
                const active = selectedVerdict === verdict.value;
                return (
              <button
                key={verdict.value}
                className={`verdict-chip ${active ? 'is-on' : ''}`}
                onClick={() => dispatch({ type: 'SAVE_DECISION', stageId: stage.id, verdict: verdict.value })}
                disabled={locked}
              >
                <span className="verdict-short">{index + 1}. {verdict.short}</span>
                <span className="verdict-label">{verdict.label}</span>
                <span className="verdict-desc">{verdict.description}</span>
              </button>
            );
          })}
        </div>

            <label className="field-label">Analyst note</label>
            <textarea
              className="stage-note"
              value={localNote}
              onChange={(e) => saveNote(e.target.value)}
              placeholder="Write the reason for your call."
              disabled={locked}
            />

            <div className="decision-actions">
              <button className="btn btn-primary" onClick={lockStage} disabled={!canLock}>
                {locked ? 'Verdict locked' : 'Lock verdict'}
              </button>
              <div className="dim small">
                {locked
                  ? decision?.correct
                    ? `Correct. ${stage.flag}`
                    : 'Recorded for review.'
                  : 'Choose a verdict, then lock the stage.'}
              </div>
            </div>
          </section>

          <section className="card lesson-card">
            <div className="panel-title">Lesson</div>
            <div className="lesson-copy">{locked ? stage.lesson : 'Lock the verdict to reveal the lesson.'}</div>
            <div className="lesson-next">{locked ? `Flag: ${stage.flag}` : 'Stage flag withheld until commit.'}</div>
          </section>

          <section className="card review-card">
            <div className="panel-title">Review</div>
            <div className="review-line">
              <span className="dim">status</span>
              <strong>{locked ? (decision?.correct ? 'correct' : 'locked') : 'pending'}</strong>
            </div>
            <div className="review-line">
              <span className="dim">points</span>
              <strong>{decision?.points || 0}</strong>
            </div>
            <div className="review-line">
              <span className="dim">next</span>
              <strong>{nextStage?.title || 'No further stages'}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
