import { useEffect, useState } from 'react';
import { useSoc } from '../state/SocContext.jsx';

// Incident Report — structured Q&A driven by scenario.report.questions.
// Grading is value-based (case-insensitive trimmed compare) so anyone can
// type the answer; the lab is "passed" when score % ≥ pass_threshold_pct.
// Narrative scoring is a small keyword bonus only — free-text QA is hard,
// so we keep it as a sanity-check input rather than a primary signal.

const IOC_TYPES = [
  { k: 'ip',     label: 'IP' },
  { k: 'host',   label: 'Host' },
  { k: 'url',    label: 'URL / Path' },
  { k: 'user',   label: 'User' },
  { k: 'hash',   label: 'File hash' },
  { k: 'domain', label: 'Domain' },
  { k: 'other',  label: 'Other' },
];

function buildNarrative(answers) {
  const attackerIp = answers.attacker_ip || '[attacker IP]';
  const host = answers.compromised_host || '[host]';
  const user = answers.compromised_user || '[user]';
  const apiPath = answers.exfil_path || '[API path]';
  const persistence = answers.persistence_account || '[persistence account]';
  const attackType = (answers.attack_type || 'edge device compromise').replace(/_/g, ' ');
  const severity = answers.severity || '[severity]';

  return `Host ${host} was compromised by ${attackerIp} using account ${user}. The attacker abused ${apiPath} during the ${attackType}, then created persistence with ${persistence}. This activity indicates a ${severity} compromise of the edge device. Recommended containment: isolate the device, disable ${user} and ${persistence}, rotate credentials, and block ${attackerIp}.`;
}

export default function ReportPage() {
  const { state, dispatch } = useSoc();
  const cfg = state.scenario?.report;
  const draft = state.report?.grading ? null : state.report;

  // ---- form state ----
  const [answers, setAnswers] = useState(() => draft?.answers || {});
  const [narrative, setNarrative] = useState(() => draft?.narrative || '');
  const [narrativeTouched, setNarrativeTouched] = useState(() => Boolean(draft?.narrative));
  // Pre-populate "additional IOCs" from anything flagged on the Investigation page.
  const [additionalIocs, setAdditionalIocs] = useState(() =>
    draft?.additionalIocs || state.identifiedIocs.map((v) => ({ type: 'other', value: v }))
  );

  // Reset the form when the analyst clicks "edit" on a submitted report.
  useEffect(() => {
    if (!state.report) {
      setAnswers({});
      setNarrative('');
      setNarrativeTouched(false);
      setAdditionalIocs(state.identifiedIocs.map((v) => ({ type: 'other', value: v })));
    }
  }, [state.report, state.identifiedIocs]);

  useEffect(() => {
    if (narrativeTouched) return;
    setNarrative(buildNarrative(answers));
  }, [answers, narrativeTouched]);

  useEffect(() => {
    if (!cfg || state.report?.grading) return;
    dispatch({
      type: 'SAVE_REPORT_DRAFT',
      report: { answers, narrative, additionalIocs },
    });
  }, [answers, narrative, additionalIocs, cfg, state.report?.grading, dispatch]);

  // ---- IOC row helpers ----
  const addIoc = () => setAdditionalIocs((r) => [...r, { type: 'ip', value: '' }]);
  const removeIoc = (i) => setAdditionalIocs((r) => r.filter((_, j) => j !== i));
  const updateIoc = (i, patch) =>
    setAdditionalIocs((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  // ---- validation ----
  const requiredAnswered = (cfg?.questions || []).every(
    (q) => (answers[q.id] || '').toString().trim().length > 0
  );
  const valid = requiredAnswered;

  const submit = () => {
    if (!valid) return;
    dispatch({
      type: 'SUBMIT_REPORT',
      report: { answers, narrative, additionalIocs: additionalIocs.filter((x) => x.value.trim()) },
    });
  };

  if (!cfg) {
    return (
      <div className="page page-report">
        <div className="page-head"><h1>Incident Report</h1></div>
        <div className="empty">scenario has no report config</div>
      </div>
    );
  }

  // ---- Submitted: show graded results ----
  if (state.report?.grading) return <Graded onEdit={() => dispatch({ type: 'SUBMIT_REPORT', report: null })} />;

  // ---- Form ----
  const totalPoints = cfg.questions.reduce((s, q) => s + q.points, 0) + (cfg.narrative?.max_bonus ?? 0) + 5;

  return (
    <div className="page page-report">
      <div className="page-head">
        <div>
          <h1>Incident Report</h1>
          <div className="dim">
            Answer each question from your investigation notes. Pass threshold:{' '}
            <b>{cfg.pass_threshold_pct}%</b> · {totalPoints} points total.
          </div>
        </div>
      </div>

      <div className="report-form">
        <section className="card">
          <div className="panel-title">Findings</div>

          <div className="q-grid">
            {cfg.questions.map((q) => (
              <Question key={q.id} q={q}
                        value={answers[q.id] || ''}
                        onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
            ))}
          </div>
        </section>

        <section className="card">
          <div className="panel-title">Additional Indicators of Compromise</div>
          <div className="dim small">
            Optional. Add any extra IOCs you observed that aren't already covered above.
            Matches against known IOCs add small bonus points.
          </div>

          <div className="ioc-rows">
            {additionalIocs.map((row, i) => (
              <div key={i} className="ioc-row">
                <select value={row.type} onChange={(e) => updateIoc(i, { type: e.target.value })}>
                  {IOC_TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
                </select>
                <input className="text-in"
                       placeholder="value"
                       value={row.value}
                       onChange={(e) => updateIoc(i, { value: e.target.value })} />
                <button className="remove-cond" title="remove" onClick={() => removeIoc(i)}>×</button>
              </div>
            ))}
            {additionalIocs.length === 0 && <div className="empty">none added</div>}
          </div>

          <button className="btn" onClick={addIoc}>+ Add IOC</button>
        </section>

        <section className="card">
          <div className="panel-title">{cfg.narrative?.label || 'Narrative'}</div>
          <textarea className="narrative-in"
                    placeholder={cfg.narrative?.placeholder}
                    value={narrative}
                    onChange={(e) => {
                      setNarrativeTouched(true);
                      setNarrative(e.target.value);
                    }} />
          <div className="dim small">
            Auto-filled from your findings. Edit it if you want. Bonus: up to {cfg.narrative?.max_bonus ?? 0} points for mentioning relevant terms.
          </div>
        </section>

        <div className="submit-row">
          <button className="btn btn-primary" onClick={submit} disabled={!valid}>Submit Report</button>
          {!valid && <span className="dim small">Fill in every required question to submit.</span>}
        </div>
      </div>
    </div>
  );
}

function Question({ q, value, onChange }) {
  if (q.type === 'select') {
    return (
      <label className="q-block">
        <div className="q-label">{q.label} <span className="q-points">{q.points}pt</span></div>
        <select className="q-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— pick one —</option>
          {q.options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="q-block">
      <div className="q-label">{q.label} <span className="q-points">{q.points}pt</span></div>
      <input className="q-input" type="text"
             placeholder={q.placeholder}
             value={value}
             onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function buildReviewNotes(state) {
  const notes = [];
  const realAlerts = state.alerts.filter((al) => al.expectedVerdict !== 'false_positive');
  const untriagedReal = realAlerts.filter(
    (al) => al.status === 'NEW' || al.status === 'ASSIGNED'
  );
  const timelineIncomplete =
    state.scenario?.attackChain &&
    state.attackIndex < state.scenario.attackChain.length;

  if (state.detectionRules.length === 0) {
    notes.push('Detection Rules have not been applied to mitigate this attack in the future.');
  }
  if (timelineIncomplete) {
    notes.push('The attack timeline has not finished. Wait for the full incident sequence, then handle the final alerts.');
  }
  if (untriagedReal.length > 0) {
    notes.push(`${untriagedReal.length} confirmed-threat alert${untriagedReal.length === 1 ? '' : 's'} remain untriaged or only assigned.`);
  }
  if (!state.replayCompleted || state.replayDetections.length === 0) {
    notes.push('Replay has not been run to validate that your detection rules catch the attack chain.');
  }

  return notes;
}

function getCompletionFlag(passed) {
  if (!passed) return '';
  const shifted = [73, 84, 78, 124, 49, 57, 100, 58, 51, 52, 51, 102, 57, 50, 52, 54, 126];
  return shifted.map((n) => String.fromCharCode(n - 1)).join('');
}

function Graded({ onEdit }) {
  const { state, dispatch } = useSoc();
  const r = state.report;
  const reviewNotes = buildReviewNotes(state);
  const labComplete = r.passed && reviewNotes.length === 0;
  const flag = getCompletionFlag(labComplete);
  const [showCompletion, setShowCompletion] = useState(
    labComplete && state.certificatePending
  );
  const [showIncomplete, setShowIncomplete] = useState(!labComplete);
  const [flagCopied, setFlagCopied] = useState(false);
  useEffect(() => {
    if (showCompletion && labComplete && state.certificatePending) {
      dispatch({ type: 'ACK_CERTIFICATE' });
    }
  }, [showCompletion, labComplete, state.certificatePending, dispatch]);
  const copyFlag = async () => {
    if (!flag) return;
    try {
      await navigator.clipboard.writeText(flag);
      setFlagCopied(true);
      window.setTimeout(() => setFlagCopied(false), 1600);
    } catch {
      // Clipboard API can be blocked (insecure context / sandboxed iframe);
      // the flag is still visible on-screen for manual copy.
    }
  };
  return (
    <div className="page page-report">
      <div className="page-head">
        <div>
          <h1>Incident Report — Graded</h1>
          <div className="dim">submitted at t+{state.now}s</div>
        </div>
        <button className="btn-link" onClick={onEdit}>edit / resubmit</button>
      </div>

      <div className={`grade-banner ${r.passed ? 'pass' : 'fail'}`}>
        <div className="grade-icon">{r.passed ? '✓' : '✗'}</div>
        <div className="grade-body">
          <div className="grade-headline">
            {r.passed ? 'LAB PASSED' : 'LAB NOT PASSED'} — {r.total} / {r.max} ({r.pct}%)
          </div>
          <div className="dim small">
            pass threshold: {r.threshold}%
            {r.passed && !labComplete && <> · workflow incomplete — complete the Tier-2 Review Notes to unlock the flag</>}
          </div>
        </div>
        {labComplete && <button className="btn" onClick={() => setShowCompletion(true)}>View Result</button>}
        {!labComplete && <button className="btn" onClick={() => setShowIncomplete(true)}>Review Requirements</button>}
      </div>

      {reviewNotes.length > 0 && (
        <section className="tier2-notes">
          <div className="panel-title">Tier-2 Review Notes</div>
          <ul>
            {reviewNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="panel-title">Question Breakdown</div>
        <ul className="grading">
          {r.grading.map((g) => (
            <li key={g.id} className={g.correct ? 'ok' : 'bad'}>
              <span className="grade-mark">{g.correct ? '✓' : '✗'}</span>
              <span className="grade-q">
                <div className="grade-q-label">{g.label}</div>
                <div className="dim small">
                  your answer: <span className="mono">{g.given || '—'}</span>
                  {!g.correct && g.hint && <> · <b>Hint:</b> <span className="grade-hint">{g.hint}</span></>}
                </div>
              </span>
              <span className="grade-pts">+{g.points}/{g.max}</span>
            </li>
          ))}

          <li className={r.narrativeBonus > 0 ? 'ok' : ''}>
            <span className="grade-mark">{r.narrativeBonus > 0 ? '✓' : '·'}</span>
            <span className="grade-q">
              <div className="grade-q-label">Narrative keyword bonus</div>
              <div className="dim small">
                {r.narrativeMatched.length > 0
                  ? <>matched: {r.narrativeMatched.join(', ')}</>
                  : 'no recognized keywords'}
              </div>
            </span>
            <span className="grade-pts">+{r.narrativeBonus}</span>
          </li>

          <li className={r.additionalBonus > 0 ? 'ok' : ''}>
            <span className="grade-mark">{r.additionalBonus > 0 ? '✓' : '·'}</span>
            <span className="grade-q">
              <div className="grade-q-label">Additional IOC matches</div>
              <div className="dim small">{r.additionalBonus} matched known IOCs (cap 5)</div>
            </span>
            <span className="grade-pts">+{r.additionalBonus}</span>
          </li>

          {(r.workflowGrading || []).map((g) => (
            <li key={g.id} className={g.complete ? 'ok' : 'bad'}>
              <span className="grade-mark">{g.complete ? '✓' : '✗'}</span>
              <span className="grade-q">
                <div className="grade-q-label">{g.label}</div>
                <div className="dim small">
                  {g.complete ? 'completed' : <><b>Hint:</b> <span className="grade-hint">{g.hint}</span></>}
                </div>
              </span>
              <span className="grade-pts">+{g.points}/{g.max}</span>
            </li>
          ))}
        </ul>
      </section>

      {!labComplete && showIncomplete && (
        <div className="completion-backdrop" onClick={() => setShowIncomplete(false)}>
          <div className="completion-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="completion-head">
              <div className="panel-title">Lab Not Completed</div>
              <button className="btn-link" onClick={() => setShowIncomplete(false)}>close</button>
            </div>
            <div className="completion-body">
              <div className="completion-icon incomplete">!</div>
              <div className="completion-headline">Flag Locked</div>
              <div className="completion-sub dim">Complete the analysis workflow before final credit.</div>
              <div className="incomplete-copy">
                Completing the steps is part of the score: build a detection rule, run Replay Attack,
                and triage the confirmed incident alerts. Investigation supports your report answers and
                optional IOC bonus points. Then resubmit the report to unlock the completion flag.
              </div>
              {reviewNotes.length > 0 && (
                <ul className="incomplete-notes">
                  {reviewNotes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              )}
            </div>
            <div className="completion-foot">
              <button className="btn btn-primary" onClick={() => setShowIncomplete(false)}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {labComplete && showCompletion && (
        <div className="completion-backdrop" onClick={() => setShowCompletion(false)}>
          <div className="completion-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="completion-head">
              <div className="panel-title">Lab Completion</div>
              <button className="btn-link" onClick={() => setShowCompletion(false)}>close</button>
            </div>

            <div className="completion-body">
              <div className="completion-icon">✓</div>
              <div className="completion-headline">SOC Analyst Lab Successfully Completed</div>
              <div className="completion-sub dim">Hack Smarter SOC · SOC Analyst Track</div>

              <div className="completion-score">
                <div className="completion-pct">{r.pct}<span className="completion-pct-unit">%</span></div>
                <div className="completion-pct-label dim">passed</div>
              </div>

              <div className="completion-stats">
                <div>
                  <div className="completion-stat-key">Score</div>
                  <div className="completion-stat-val mono">{r.total} / {r.max}</div>
                </div>
                <div>
                  <div className="completion-stat-key">Pass Threshold</div>
                  <div className="completion-stat-val mono">{r.threshold}%</div>
                </div>
                <div>
                  <div className="completion-stat-key">Status</div>
                  <div className="completion-stat-val accent">PASS</div>
                </div>
              </div>

              {flag && (
                <div className="completion-flag">
                  <div className="completion-flag-label">Submission Flag</div>
                  <div className="completion-flag-row">
                    <code className="completion-flag-val">{flag}</code>
                    <button className="btn" onClick={copyFlag}>
                      {flagCopied ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                  <div className="dim small">
                    Submit this flag at <span className="mono">hacksmarter.org</span> to get credit for completing the lab.
                  </div>
                </div>
              )}
            </div>

            <div className="completion-foot">
              <button className="btn btn-primary" onClick={() => setShowCompletion(false)}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
