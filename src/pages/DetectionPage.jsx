import { useEffect, useState } from 'react';
import { useSoc } from '../state/SocContext.jsx';
import { evaluateRules } from '../lib/ruleEngine.js';

// Builds detection rules with N conditions joined by AND/OR.
// Live-evaluates against the streaming telemetry and shows hits / FPs.
const FIELDS = ['type', 'src_ip', 'user', 'host', 'url', 'msg'];
const OPS = [
  { k: 'eq', label: 'equals' },
  { k: 'contains', label: 'contains' },
  { k: 'regex', label: 'matches regex' },
];

const emptyCond = () => ({ field: 'type', op: 'eq', value: '' });

export default function DetectionPage() {
  const { state, dispatch } = useSoc();
  const draft = state.detectionDraft;

  const [name, setName] = useState(() => draft?.name || '');
  const [join, setJoin] = useState(() => draft?.join || 'AND');
  const [conds, setConds] = useState(() => draft?.conditions?.length ? draft.conditions : [emptyCond()]);
  const [saveNotice, setSaveNotice] = useState('');
  const [submitError, setSubmitError] = useState('');

  const updateCond = (i, patch) =>
    setConds((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const normalizedConds = conds.map((c) => ({ ...c, value: c.value.trim() }));
  const filledConds = normalizedConds.filter((c) => c.value.length > 0);
  const hasPartialCond = normalizedConds.some((c) => c.value.length === 0);
  const valid = name.trim().length > 0 && filledConds.length > 0;
  const dirty = name.length > 0 || conds.some((c) => c.value.length > 0);

  useEffect(() => {
    dispatch({
      type: 'SAVE_RULE_DRAFT',
      draft: { name, join, conditions: conds },
    });
  }, [name, join, conds, dispatch]);

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(''), 1800);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  useEffect(() => {
    if (!submitError) return;
    const timer = window.setTimeout(() => setSubmitError(''), 2200);
    return () => window.clearTimeout(timer);
  }, [submitError]);

  const submit = () => {
    if (name.trim().length === 0) {
      setSubmitError('Add a rule name before saving.');
      return;
    }
    if (filledConds.length === 0) {
      setSubmitError('Add at least one condition value before saving.');
      return;
    }
    const rule = {
      id: `RULE-${Date.now()}`,
      name: name.trim(),
      join,
      conditions: filledConds,
    };
    dispatch({ type: 'ADD_RULE', rule });
    setName('');
    setJoin('AND');
    setConds([emptyCond()]);
    setSaveNotice(`Saved rule: ${rule.name}`);
    setSubmitError('');
  };

  // Evaluate every rule against the live telemetry to populate hit counts.
  const allFirings = evaluateRules(state.detectionRules, state.telemetry);
  const expected = new Set(state.scenario?.expectedDetections || []);

  return (
    <div className="page page-detect">
      <div className="page-head">
        <div>
          <h1>Detection Builder</h1>
          <div className="dim">
            Author rules. Live telemetry is matched on every emit; coverage updates in the top bar.
          </div>
        </div>
        <div className="dim small">{state.detectionRules.length} active rule(s)</div>
      </div>

      <div className="detect-grid">
        <section className="card">
          <div className="panel-title">New Rule</div>

          <label className="field-label">name</label>
          <input className="text-in" placeholder="e.g. FortiGate brute force"
                 value={name} onChange={(e) => setName(e.target.value)} />

          <div className="join-row">
            <span className="field-label">match</span>
            <button className={`pill ${join === 'AND' ? 'is-on' : ''}`} onClick={() => setJoin('AND')}>ALL (AND)</button>
            <button className={`pill ${join === 'OR' ? 'is-on' : ''}`} onClick={() => setJoin('OR')}>ANY (OR)</button>
          </div>

          {conds.map((c, i) => (
            <div key={i} className={`cond-row ${conds.length > 1 ? 'has-remove' : ''}`}>
              <select value={c.field} onChange={(e) => updateCond(i, { field: e.target.value })}>
                {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={c.op} onChange={(e) => updateCond(i, { op: e.target.value })}>
                {OPS.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
              </select>
              <input className="text-in"
                     value={c.value}
                     placeholder="value"
                     onChange={(e) => updateCond(i, { value: e.target.value })} />
              {conds.length > 1 && (
                <button className="remove-cond"
                        title="remove condition"
                        onClick={() => setConds((cs) => cs.filter((_, j) => j !== i))}>×</button>
              )}
            </div>
          ))}

          <div className="cond-actions">
            <button className="btn" onClick={() => setConds((cs) => [...cs, emptyCond()])}>+ add condition</button>
            <button className="btn btn-primary" onClick={submit}>Save Rule</button>
          </div>
          {saveNotice && <div className="form-ok">{saveNotice}</div>}
          {submitError && <div className="form-error">{submitError}</div>}
          {dirty && hasPartialCond && (
            <div className="dim small">Empty condition rows will be ignored when you save.</div>
          )}

          <div className="hint">
            <div className="dim small">Examples that catch the FortiGate scenario:</div>
            <ul className="dim small">
              <li><code>type</code> equals <code>AUTH_FAIL</code></li>
              <li><code>type</code> equals <code>CONFIG_EXPORT</code></li>
              <li><code>src_ip</code> equals <code>185.220.101.42</code></li>
              <li>AND-join: <code>type=AUTH_SUCCESS</code> + <code>src_ip=185.220.101.42</code> (catches the post-bruteforce login)</li>
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="panel-title">Active Rules</div>
          {state.detectionRules.length === 0 && <div className="empty">no rules yet — your first rule unlocks Replay</div>}
          <ul className="rule-list">
            {state.detectionRules.map((r) => {
              const my = allFirings.filter((f) => f.ruleId === r.id);
              const attackMatches = my.filter((f) => {
                const evt = state.telemetry.find((e) => e.id === f.eventId);
                return evt && evt.isAttack;
              }).length;
              const expectedHits = my.filter((f) => {
                const evt = state.telemetry.find((e) => e.id === f.eventId);
                return evt && evt.isAttack && expected.has(evt.type);
              }).length;
              const noiseMatches = my.length - attackMatches;
              return (
                <li key={r.id} className="rule-item">
                  <div>
                    <div className="rule-name">{r.name}</div>
                    <div className="dim small mono">
                      {r.conditions.map((c, i) => (
                        <span key={i}>
                          {i > 0 && ` ${r.join} `}
                          {c.field} {c.op} <code>{c.value}</code>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rule-meta">
                    <span className={`fire-count ${my.length > 0 ? 'fired' : ''}`}>
                      {my.length} match{my.length === 1 ? '' : 'es'}
                    </span>
                    {expectedHits > 0 && <span className="fp-count">{expectedHits} expected</span>}
                    {attackMatches > expectedHits && <span className="fp-count">{attackMatches - expectedHits} other attack</span>}
                    {noiseMatches > 0 && <span className="fp-count">{noiseMatches} benign</span>}
                    <button className="btn-link danger"
                            onClick={() => dispatch({ type: 'REMOVE_RULE', id: r.id })}>remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
