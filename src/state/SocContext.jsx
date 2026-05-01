import { createContext, useContext, useEffect, useReducer } from 'react';
import { evaluateRules } from '../lib/ruleEngine.js';

// =====================================================================
// HackSmarter SOC — global state engine
// One reducer drives the entire app. Side effects (timers) live in the
// provider, which dispatches TICK / STREAM_TICK / REPLAY_TICK actions.
// =====================================================================

const SocContext = createContext(null);
export const useSoc = () => useContext(SocContext);

const PAGES = ['alerts', 'investigation', 'detection', 'replay', 'report'];

// ---------------------------------------------------------------------
// initial state
// ---------------------------------------------------------------------
const initial = {
  scenario: null,

  // Game clock — seconds since session start.
  startedAt: null,
  now: 0,

  // Live alert queue (grows over time as the stream emits alerts).
  alerts: [],
  selectedAlertId: null,

  // Live telemetry stream for the current session.
  telemetry: [],

  // Stream-engine cursors.
  attackIndex: 0,
  noiseIndex: 0,
  benignIndex: 0,

  // Detection engineering.
  detectionRules: [],
  detectionDraft: null,

  // Investigation page — persists across navigation.
  investigationQuery: '',

  // All pages are accessible from the start. We still track which milestones
  // the analyst has hit (first correct triage, IOC flagged, rule built, replay
  // success) for the end-of-session report — they no longer gate navigation.
  unlocked: { alerts: true, investigation: true, detection: true, replay: true, report: true },
  milestones: { firstTriage: false, iocFlagged: false, ruleBuilt: false, replayPassed: false },
  currentPage: 'alerts',
  identifiedIocs: [],

  // Replay state.
  replayRunning: false,
  replayTick: 0,
  replayTelemetry: [],
  replayDetections: [],
  replayCompleted: false,

  // Report.
  report: null,

  // Scoring & risk.
  score: 0,
  scoreLog: [],
  riskLevel: 0,
  correctTriages: 0,
  wrongTriages: 0,
};

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------
const fmtTs = () => new Date().toISOString().substring(11, 19);
const mkEvtId = () => `EVT-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
const mkAlertId = (i) => `ALRT-${1000 + i}`;
const cap = (arr, n) => (arr.length > n ? arr.slice(arr.length - n) : arr);

// Skip the dead-air buildup before the first interesting event. The scenario's
// first AUTH_FAIL fires at tOffset 8 and the first alert at tOffset 11, so
// jumping the clock to 7 means students see the first event within ~1 real
// second of reset and the first alert within ~2 seconds.
const SESSION_HEAD_START = 7;
const floorScore = (n) => Math.max(0, n);

// Map a tOffset to its kill-chain phase using the scenario's timeline.
// timeline entries are sorted ascending by tOffset; the active phase is the
// last entry whose tOffset has been reached.
function findPhase(scenario, tOffset) {
  if (!scenario?.timeline) return null;
  let current = null;
  for (const p of scenario.timeline) {
    if (tOffset >= p.tOffset) current = p.phase;
    else break;
  }
  return current;
}

// ---------------------------------------------------------------------
// reducer
// ---------------------------------------------------------------------
function reducer(s, a) {
  switch (a.type) {
    case 'INIT':
      // If we hydrated from storage, keep the prior clock; otherwise start fresh.
      return s.startedAt
        ? { ...s, scenario: a.scenario }
        : { ...s, scenario: a.scenario, startedAt: Date.now(), now: SESSION_HEAD_START };

    case 'RESET':
      return { ...initial, scenario: s.scenario, startedAt: Date.now(), now: SESSION_HEAD_START };

    // -------- 1Hz clock tick: timer + backlog penalty + risk recalc --------
    case 'TICK': {
      const now = s.now + 1;
      const untriaged = s.alerts.filter((al) => al.status === 'NEW').length;
      const assigned = s.alerts.filter((al) => al.status === 'ASSIGNED').length;
      const resolved = s.alerts.filter((al) => al.status === 'TRIAGED' || al.status === 'ESCALATED').length;
      const backlogPenalty = untriaged > 0 ? -2 : 0;
      const score = floorScore(s.score + backlogPenalty);
      const scoreLog = backlogPenalty
        ? cap([...s.scoreLog, { ts: now, delta: backlogPenalty, reason: `backlog (${untriaged} pending)` }], 60)
        : s.scoreLog;

      const total = s.scenario?.attackChain?.length || 1;
      const progress = s.attackIndex / total;
      const milestoneRelief =
        (s.milestones.firstTriage ? 10 : 0) +
        (s.milestones.iocFlagged ? 8 : 0) +
        (s.milestones.ruleBuilt ? 12 : 0) +
        (s.milestones.replayPassed ? 16 : 0) +
        (s.report?.passed ? 12 : 0);
      const allAlertsHandled = s.alerts.length > 0 && s.alerts.every(
        (al) => al.status === 'TRIAGED' || al.status === 'ESCALATED'
      );
      const riskLevel = Math.max(
        0,
        Math.min(100, Math.round(
          progress * 42 +
          untriaged * 5 +
          assigned * 2 -
          resolved * 4 -
          s.correctTriages * 3 -
          milestoneRelief -
          (allAlertsHandled ? 18 : 0)
        ))
      );
      return { ...s, now, score, scoreLog, riskLevel };
    }

    // -------- Telemetry stream tick (every ~1.5s) --------
    // Decides whether to emit the next attack-chain step, the next noise alert,
    // or a benign filler event drawn from benignPool.
    case 'STREAM_TICK': {
      const sc = s.scenario;
      if (!sc) return s;
      const ts = fmtTs();

      // Attack-chain step is due?
      const next = sc.attackChain[s.attackIndex];
      if (next && s.now >= next.tOffset) {
        const evt = {
          id: mkEvtId(),
          ts,
          isAttack: true,
          phase: findPhase(sc, next.tOffset),
          tOffset: next.tOffset,
          ...next.telemetry,
        };
        let alerts = s.alerts;
        if (next.alert) {
          const alertObj = {
            id: mkAlertId(s.alerts.length),
            ts,
            emittedAt: s.now,
            status: 'NEW',
            triggeringEventId: evt.id,
            ...next.alert,
          };
          alerts = [...s.alerts, alertObj];
        }
        return {
          ...s,
          telemetry: [...s.telemetry, evt],
          alerts,
          attackIndex: s.attackIndex + 1,
        };
      }

      // Noise alert is due?
      const noise = sc.noiseAlerts?.[s.noiseIndex];
      if (noise && s.now >= noise.tOffset) {
        const alertObj = {
          id: mkAlertId(s.alerts.length),
          ts,
          emittedAt: s.now,
          status: 'NEW',
          ...noise.alert,
        };
        return { ...s, alerts: [...s.alerts, alertObj], noiseIndex: s.noiseIndex + 1 };
      }

      // Otherwise emit a benign filler.
      const pool = sc.benignPool || [];
      if (pool.length === 0) return s;
      const benign = pool[s.benignIndex % pool.length];
      const evt = { id: mkEvtId(), ts, isAttack: false, ...benign };
      return {
        ...s,
        telemetry: [...s.telemetry, evt],
        benignIndex: s.benignIndex + 1,
      };
    }

    case 'SELECT_ALERT':
      return { ...s, selectedAlertId: a.id };

    // -------- Self-assign an alert (claim ownership of the ticket) --------
    case 'ASSIGN': {
      const al = s.alerts.find((x) => x.id === a.id);
      if (!al || al.status !== 'NEW') return s;
      const alerts = s.alerts.map((x) => (x.id === a.id ? { ...x, status: 'ASSIGNED', assignedTo: 'me' } : x));
      return { ...s, alerts };
    }

    // -------- Triage --------
    // Allowed on NEW or ASSIGNED alerts. Triaging implicitly takes ownership.
    case 'TRIAGE': {
      const al = s.alerts.find((x) => x.id === a.id);
      if (!al || al.status === 'TRIAGED' || al.status === 'ESCALATED') return s;
      const correct = a.verdict === al.expectedVerdict;
      const delta = correct ? 10 : -5;
      const status = a.verdict === 'escalate' ? 'ESCALATED' : 'TRIAGED';
      const alerts = s.alerts.map((x) =>
        x.id === a.id ? { ...x, status, verdict: a.verdict, assignedTo: x.assignedTo || 'me' } : x
      );
      const correctTriages = s.correctTriages + (correct ? 1 : 0);
      const wrongTriages = s.wrongTriages + (correct ? 0 : 1);
      const milestones = { ...s.milestones };
      if (correct) milestones.firstTriage = true;
      return {
        ...s,
        alerts,
        score: floorScore(s.score + delta),
        scoreLog: cap(
          [...s.scoreLog, { ts: s.now, delta, reason: correct ? `triage ✓ (${al.rule_name})` : `triage ✗ (${al.rule_name})` }],
          60
        ),
        correctTriages,
        wrongTriages,
        milestones,
      };
    }

    // Flag an arbitrary value as an IOC. No immediate score — flagging is a
    // working note. Real scoring happens at report submission, where decoys
    // hurt and correct IOCs help.
    case 'IDENTIFY_IOC': {
      const v = (a.value || '').trim();
      if (!v || s.identifiedIocs.includes(v)) return s;
      return {
        ...s,
        identifiedIocs: [...s.identifiedIocs, v],
        milestones: { ...s.milestones, iocFlagged: true },
      };
    }
    case 'UNFLAG_IOC':
      return { ...s, identifiedIocs: s.identifiedIocs.filter((v) => v !== a.value) };

    case 'ADD_RULE': {
      const rules = [...s.detectionRules, a.rule];
      return {
        ...s,
        detectionRules: rules,
        detectionDraft: null,
        milestones: { ...s.milestones, ruleBuilt: true },
      };
    }
    case 'SAVE_RULE_DRAFT':
      return { ...s, detectionDraft: a.draft };
    case 'SAVE_INVESTIGATION_QUERY':
      return { ...s, investigationQuery: a.query };
    case 'ACK_CERTIFICATE':
      return { ...s, certificatePending: false };
    case 'REMOVE_RULE':
      return { ...s, detectionRules: s.detectionRules.filter((r) => r.id !== a.id) };

    case 'NAV':
      return { ...s, currentPage: a.page };

    // -------- Replay engine --------
    case 'START_REPLAY':
      return {
        ...s,
        replayRunning: true,
        replayTick: 0,
        replayTelemetry: [],
        replayDetections: [],
        replayCompleted: false,
      };
    case 'STOP_REPLAY':
      return { ...s, replayRunning: false };
    case 'REPLAY_TICK': {
      if (!s.replayRunning || !s.scenario) return s;
      const sc = s.scenario;
      const idx = s.replayTick;
      if (idx >= sc.attackChain.length) {
        // Auto-stop & evaluate success.
        const success = s.replayDetections.length > 0;
        const milestones = { ...s.milestones };
        if (success) milestones.replayPassed = true;
        return { ...s, replayRunning: false, replayCompleted: true, milestones };
      }
      const step = sc.attackChain[idx];
      const evt = {
        id: `RPL-${idx}`,
        ts: `t+${String(step.tOffset).padStart(3, '0')}s`,
        tOffset: step.tOffset,
        isAttack: true,
        phase: findPhase(sc, step.tOffset),
        ...step.telemetry,
      };
      const matches = evaluateRules(s.detectionRules, [evt]);
      const detections = matches.map((m) => ({
        ts: evt.ts,
        ruleId: m.ruleId,
        ruleName: m.ruleName,
        eventId: evt.id,
        eventType: evt.type,
        tOffset: step.tOffset,
      }));
      return {
        ...s,
        replayTick: idx + 1,
        replayTelemetry: [...s.replayTelemetry, evt],
        replayDetections: [...s.replayDetections, ...detections],
      };
    }

    // -------- Incident report --------
    case 'SAVE_REPORT_DRAFT':
      return { ...s, report: a.report };

    // Grades structured Q&A from scenario.report.questions and adds a small
    // narrative keyword bonus + small bonus for matching extra IOCs.
    case 'SUBMIT_REPORT': {
      if (!a.report) return { ...s, report: null }; // edit / reset
      const r = a.report;
      const cfg = s.scenario?.report;
      if (!cfg) return s;

      const norm = (x) => String(x ?? '').trim().toLowerCase();

      const grading = cfg.questions.map((q) => {
        const given = norm(r.answers?.[q.id]);
        const expected = norm(q.answer);
        const correct = given.length > 0 && given === expected;
        return {
          id: q.id,
          label: q.label,
          given: r.answers?.[q.id] ?? '',
          expected: q.answer,
          hint: q.hint || '',
          correct,
          points: correct ? q.points : 0,
          max: q.points,
        };
      });

      const narrLower = norm(r.narrative);
      const matched = (cfg.narrative?.keywords || []).filter((k) => narrLower.includes(norm(k)));
      const narrBonus = Math.min(cfg.narrative?.max_bonus ?? 0, matched.length);

      const known = (s.scenario?.iocs || []).map(norm);
      const addnlValid = (r.additionalIocs || [])
        .map((x) => norm(x.value))
        .filter((v) => v && known.includes(v));
      const addnlBonus = Math.min(5, addnlValid.length);

      const total =
        grading.reduce((sum, g) => sum + g.points, 0) + narrBonus + addnlBonus;
      const maxPts =
        cfg.questions.reduce((sum, q) => sum + q.points, 0) +
        (cfg.narrative?.max_bonus ?? 0) +
        5;
      const pct = Math.round((total / maxPts) * 100);
      const passed = pct >= (cfg.pass_threshold_pct ?? 80);

      return {
        ...s,
        report: {
          ...r,
          submittedAt: Date.now(),
          grading,
          narrativeMatched: matched,
          narrativeBonus: narrBonus,
          additionalBonus: addnlBonus,
          total,
          max: maxPts,
          pct,
          passed,
          threshold: cfg.pass_threshold_pct ?? 80,
        },
        certificatePending: passed,
        score: floorScore(s.score + total),
        scoreLog: cap(
          [...s.scoreLog, { ts: s.now, delta: total, reason: passed ? `lab PASSED (${pct}%)` : `lab submitted (${pct}%)` }],
          60
        ),
      };
    }

    default:
      return s;
  }
}

// ---------------------------------------------------------------------
// Persistence — keep the analyst's session across page refreshes.
// We intentionally do not persist the scenario object; it's loaded fresh
// each time so authors can iterate on JSON without stale caches.
// ---------------------------------------------------------------------
const STORAGE_KEY = 'hsoc:state:v1';

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const saved = JSON.parse(raw);
    return { ...initial, ...saved, scenario: null };
  } catch {
    return initial;
  }
}

// ---------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------
export function SocProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  // Load scenario once on mount.
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}scenarios/fortigate_ai_attack.json`)
      .then((r) => r.json())
      .then((scenario) => dispatch({ type: 'INIT', scenario }));
  }, []);

  // Persist state on every change (excluding the scenario blob).
  useEffect(() => {
    if (!state.scenario) return;
    try {
      const { scenario, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // ignore quota / private mode failures
    }
  }, [state]);

  // Provide a reset that also nukes storage.
  const resetSession = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    dispatch({ type: 'RESET' });
  };

  // Game runs at 2x real-time so students don't sit waiting between
  // attack-chain phases. The relative pacing (and analyst pressure) is
  // preserved — just compressed.
  // Clock advances every 500ms (game-second), stream emits every 750ms.
  useEffect(() => {
    if (!state.startedAt) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 500);
    return () => clearInterval(id);
  }, [state.startedAt]);

  useEffect(() => {
    if (!state.scenario) return;
    const id = setInterval(() => dispatch({ type: 'STREAM_TICK' }), 750);
    return () => clearInterval(id);
  }, [state.scenario]);

  // Replay tick — 1Hz while a replay is active.
  useEffect(() => {
    if (!state.replayRunning) return;
    const id = setInterval(() => dispatch({ type: 'REPLAY_TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.replayRunning]);

  return <SocContext.Provider value={{ state, dispatch, resetSession }}>{children}</SocContext.Provider>;
}

// ---------------------------------------------------------------------
// Selectors / derived metrics
// ---------------------------------------------------------------------
export function useDerivedMetrics() {
  const { state } = useSoc();

  // Alerts/min over the last 60 in-game seconds.
  const cutoff = state.now - 60;
  const alertRate = state.alerts.filter((al) => al.emittedAt >= cutoff).length;

  // Detection coverage % — of expected attack types, how many are caught
  // by at least one rule against the live telemetry stream.
  const expected = state.scenario?.expectedDetections || [];
  let coverage = 0;
  if (expected.length > 0) {
    const firings = evaluateRules(state.detectionRules, state.telemetry);
    const covered = new Set();
    for (const f of firings) {
      const evt = state.telemetry.find((e) => e.id === f.eventId);
      if (evt && evt.isAttack && expected.includes(evt.type)) covered.add(evt.type);
    }
    coverage = Math.round((covered.size / expected.length) * 100);
  }

  // mm:ss timer.
  const mm = String(Math.floor(state.now / 60)).padStart(2, '0');
  const ss = String(state.now % 60).padStart(2, '0');
  const timer = `${mm}:${ss}`;

  // Untriaged backlog count.
  const backlog = state.alerts.filter((al) => al.status === 'NEW').length;

  return { alertRate, coverage, timer, backlog };
}
