import { createContext, useContext, useEffect, useReducer } from 'react';
import { evaluateRules } from '../lib/ruleEngine.js';

// =====================================================================
// The Promptware Kill Chain — global state engine
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
  nextBenignAlertAt: null,

  // Authored detection rules (analyst can build ad-hoc Tier-2 rules).
  detectionRules: [],
  detectionDraft: null,

  // Investigation page — persists across navigation.
  investigationQuery: '',

  // Top-bar alert search — filters the Alert Queue by IP, rule, or summary.
  alertSearch: '',

  // All pages are accessible from the start. We still track which milestones
  // the analyst has hit (first correct triage, IOC flagged, rule built, replay
  // success) for the end-of-session report — they no longer gate navigation.
  unlocked: { alerts: true, investigation: true, detection: true, replay: true, report: true },
  milestones: { correctAssign: false, firstTriage: false, iocFlagged: false, ruleBuilt: false, replayPassed: false },
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
// Timestamps render in the browser's local timezone so the analyst sees
// times that match their wall clock (not UTC).
const fmtTs = () =>
  new Date().toLocaleTimeString('en-GB', { hour12: false });
const fmtTsBack = (secondsAgo) =>
  new Date(Date.now() - secondsAgo * 1000).toLocaleTimeString('en-GB', { hour12: false });
const mkEvtId = () => `EVT-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
const mkAlertId = (i) => `ALRT-${1000 + i}`;
const cap = (arr, n) => (arr.length > n ? arr.slice(arr.length - n) : arr);
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// Build the initial pre-seeded alert queue from scenario.benignAlertPreSeed.
// Each entry has an `ageSec` that backdates the alert so the analyst opens
// the lab to a populated queue (matches a real SOC shift handover).
function buildPreSeededAlerts(scenario) {
  const pre = scenario?.benignAlertPreSeed || [];
  return pre.map((p, i) => {
    const { ageSec, ...alertFields } = p;
    return {
      id: mkAlertId(i),
      ts: fmtTsBack(ageSec ?? 0),
      emittedAt: -1 * (ageSec ?? 0),
      status: 'NEW',
      ...alertFields,
    };
  });
}

// Same idea for telemetry — the Investigation page opens with hours of
// baseline logs already present, like a SIEM that's been ingesting all day.
// Combines hand-authored entries (telemetryPreSeed) with a much larger pool
// of randomly-generated background events so the analyst has real volume to
// search through.
const BULK_PRESEED_COUNT = 500;
const BULK_PRESEED_MAX_AGE_SEC = 8 * 60 * 60; // 8h back
const BULK_PRESEED_MIN_AGE_SEC = 70;          // leave a small live-only window

function buildPreSeededTelemetry(scenario) {
  const pre = scenario?.telemetryPreSeed || [];
  const pool = scenario?.benignPool || [];

  const authored = pre.map((p) => {
    const { ageSec, ...fields } = p;
    return {
      id: mkEvtId(),
      ageSec: ageSec ?? 0,
      ts: fmtTsBack(ageSec ?? 0),
      tOffset: -1 * (ageSec ?? 0),
      isAttack: false,
      ...fields,
    };
  });

  const bulk = [];
  if (pool.length > 0) {
    for (let i = 0; i < BULK_PRESEED_COUNT; i++) {
      const ageSec =
        BULK_PRESEED_MIN_AGE_SEC +
        Math.floor(Math.random() * (BULK_PRESEED_MAX_AGE_SEC - BULK_PRESEED_MIN_AGE_SEC));
      const pick = pool[Math.floor(Math.random() * pool.length)];
      bulk.push({
        id: mkEvtId(),
        ageSec,
        ts: fmtTsBack(ageSec),
        tOffset: -ageSec,
        isAttack: false,
        ...pick,
      });
    }
  }

  // Oldest first so the natural scroll order goes past → present.
  return [...authored, ...bulk].sort((a, b) => b.ageSec - a.ageSec);
}

// Start the visible timer at 00:00. The immediate STREAM_TICK emits the t+0
// telemetry event, and the first visible incident alert is scheduled at 00:10.
const SESSION_HEAD_START = 0;
const SIMULATION_END_SEC = 60;
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
      // If we hydrated from storage, keep the prior clock; otherwise start fresh
      // with a pre-seeded backlog of benign alerts + hours of baseline telemetry.
      if (s.startedAt) return { ...s, scenario: a.scenario };
      return {
        ...s,
        scenario: a.scenario,
        startedAt: Date.now(),
        now: SESSION_HEAD_START,
        alerts: buildPreSeededAlerts(a.scenario),
        telemetry: buildPreSeededTelemetry(a.scenario),
        nextBenignAlertAt: SESSION_HEAD_START + randInt(10, 25),
      };

    case 'RESET':
      return {
        ...initial,
        scenario: s.scenario,
        startedAt: Date.now(),
        now: SESSION_HEAD_START,
        alerts: buildPreSeededAlerts(s.scenario),
        telemetry: buildPreSeededTelemetry(s.scenario),
        nextBenignAlertAt: SESSION_HEAD_START + randInt(10, 25),
      };

    // -------- 1Hz clock tick: timer + backlog penalty + risk recalc --------
    case 'TICK': {
      const now = s.now + 1;
      // Only real threats (true_positive / escalate) drive the risk meter.
      // Benign noise alerts are background to the analyst, not organizational
      // risk — dismissing them shouldn't relieve risk and ignoring them
      // shouldn't raise it.
      const realAlerts = s.alerts.filter(
        (al) => al.expectedVerdict !== 'false_positive'
      );
      const untriaged = realAlerts.filter((al) => al.status === 'NEW').length;
      const assigned = realAlerts.filter((al) => al.status === 'ASSIGNED').length;
      const resolved = realAlerts.filter(
        (al) => al.status === 'TRIAGED' || al.status === 'ESCALATED'
      ).length;
      const backlogPenalty = untriaged > 0 ? -2 : 0;
      const score = floorScore(s.score + backlogPenalty);
      const scoreLog = backlogPenalty
        ? cap([...s.scoreLog, { ts: now, delta: backlogPenalty, reason: `backlog (${untriaged} pending)` }], 60)
        : s.scoreLog;

      const sc = s.scenario;
      const total = sc?.attackChain?.length || 1;
      const progress = s.attackIndex / total;
      const milestoneRelief =
        (s.milestones.firstTriage ? 10 : 0) +
        (s.milestones.iocFlagged ? 8 : 0) +
        (s.milestones.ruleBuilt ? 12 : 0) +
        (s.milestones.replayPassed ? 16 : 0) +
        (s.report?.passed ? 12 : 0);
      const allAlertsHandled = realAlerts.length > 0 && realAlerts.every(
        (al) => al.status === 'TRIAGED' || al.status === 'ESCALATED'
      );
      // Time pressure: the longer the attack runs and the longer real alerts
      // sit untouched, the more risk creeps up. This gives the meter visible
      // movement between attack events without re-coupling to benign noise.
      const chainStartT = sc?.attackChain?.[0]?.tOffset || 0;
      const chainActive = sc && s.attackIndex > 0 && s.attackIndex < (sc.attackChain?.length || 0);
      const chainElapsed = chainActive ? Math.max(0, s.now - chainStartT) : 0;
      const chainDrift = Math.min(18, chainElapsed * 0.35);
      const backlogPressure = Math.min(15, (untriaged + assigned) * (chainElapsed * 0.15));
      const riskLevel = Math.max(
        0,
        Math.min(100, Math.round(
          progress * 50 +
          untriaged * 8 +
          assigned * 3 -
          resolved * 4 -
          s.correctTriages * 3 -
          milestoneRelief -
          (allAlertsHandled ? 18 : 0) +
          chainDrift +
          backlogPressure
        ))
      );
      return { ...s, now, score, scoreLog, riskLevel };
    }

    // -------- Telemetry stream tick (every 2s, real-time) --------
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

      // Random benign alerts stay inside the first minute so all simulated
      // activity satisfies the QA timing requirement.
      const alertPool = sc.benignAlertPool || [];
      if (
        alertPool.length > 0 &&
        s.nextBenignAlertAt != null &&
        s.now <= SIMULATION_END_SEC &&
        s.now >= s.nextBenignAlertAt
      ) {
        const pick = alertPool[Math.floor(Math.random() * alertPool.length)];
        const nextBenignAlertAt = s.now + randInt(10, 25);
        const alertObj = {
          id: mkAlertId(s.alerts.length),
          ts,
          emittedAt: s.now,
          status: 'NEW',
          ...pick,
        };
        return {
          ...s,
          alerts: [...s.alerts, alertObj],
          nextBenignAlertAt: nextBenignAlertAt <= SIMULATION_END_SEC ? nextBenignAlertAt : null,
        };
      }

      // Benign telemetry is emitted on its own timer and also stops after
      // the first minute.
      return s;
    }

    // -------- Ambient benign telemetry (every 1s, real-time) --------
    // Real SOCs never go quiet — keep the evidence log alive with low-signal
    // noise even after the attack chain is done.
    case 'BENIGN_TICK': {
      const sc = s.scenario;
      if (!sc) return s;
      if (s.now > SIMULATION_END_SEC) return s;
      const pool = sc.benignPool || [];
      if (pool.length === 0) return s;
      const benign = pool[Math.floor(Math.random() * pool.length)];
      const evt = { id: mkEvtId(), ts: fmtTs(), isAttack: false, ...benign };
      // Cap telemetry array to keep DOM/perf reasonable over long sessions.
      // Pre-seed adds ~550 entries up front; cap well above that.
      const telemetry = s.telemetry.length > 2000
        ? [...s.telemetry.slice(-1999), evt]
        : [...s.telemetry, evt];
      return {
        ...s,
        telemetry,
        benignIndex: s.benignIndex + 1,
      };
    }

    case 'SELECT_ALERT':
      return { ...s, selectedAlertId: a.id };

    // -------- Self-assign an alert (claim ownership of the ticket) --------
    // Lights the Alerts milestone dot the first time the analyst assigns
    // themselves a genuine threat alert (not a benign/false-positive one) —
    // rewards prioritizing the real signal over the noise.
    case 'ASSIGN': {
      const al = s.alerts.find((x) => x.id === a.id);
      if (!al || al.status !== 'NEW') return s;
      const alerts = s.alerts.map((x) => (x.id === a.id ? { ...x, status: 'ASSIGNED', assignedTo: 'me' } : x));
      const correct = al.expectedVerdict && al.expectedVerdict !== 'false_positive';
      const milestones = correct ? { ...s.milestones, correctAssign: true } : s.milestones;
      return { ...s, alerts, milestones };
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
    case 'SET_ALERT_SEARCH':
      return { ...s, alertSearch: a.query };
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

      const realAlerts = s.alerts.filter((al) => al.expectedVerdict !== 'false_positive');
      const timelineComplete = s.attackIndex >= (s.scenario?.attackChain?.length || 0);
      const realAlertsHandled = realAlerts.length > 0 && realAlerts.every(
        (al) => al.status === 'TRIAGED' || al.status === 'ESCALATED'
      );
      const workflowGrading = [
        {
          id: 'workflow_detection',
          label: 'Detection Builder: rule created',
          complete: s.detectionRules.length > 0,
          points: s.detectionRules.length > 0 ? 10 : 0,
          max: 10,
          hint: 'Create at least one detection rule that can catch part of the attack chain.',
        },
        {
          id: 'workflow_replay',
          label: 'Replay Attack: detection validated',
          complete: s.replayCompleted && s.replayDetections.length > 0,
          points: s.replayCompleted && s.replayDetections.length > 0 ? 10 : 0,
          max: 10,
          hint: 'Run Replay Attack and confirm at least one detection fires.',
        },
        {
          id: 'workflow_triage',
          label: 'Alerts: full incident triaged',
          complete: timelineComplete && realAlertsHandled,
          points: timelineComplete && realAlertsHandled ? 10 : 0,
          max: 10,
          hint: 'Let the full one-minute incident play out, then triage or escalate every confirmed-threat alert.',
        },
      ];
      const workflowTotal = workflowGrading.reduce((sum, g) => sum + g.points, 0);
      const workflowMax = workflowGrading.reduce((sum, g) => sum + g.max, 0);

      const total =
        grading.reduce((sum, g) => sum + g.points, 0) + narrBonus + addnlBonus + workflowTotal;
      const maxPts =
        cfg.questions.reduce((sum, q) => sum + q.points, 0) +
        (cfg.narrative?.max_bonus ?? 0) +
        5 +
        workflowMax;
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
          workflowGrading,
          workflowTotal,
          workflowMax,
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
const STORAGE_KEY = 'hsoc:state:v4';

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
    fetch(`${base}scenarios/promptware_kill_chain.json`)
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

  // Pacing: game time advances at real-time speed. Attack-chain events are
  // checked every 1s so adjacent offsets still fire within the first minute.
  useEffect(() => {
    if (!state.startedAt) return;
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.startedAt]);

  useEffect(() => {
    if (!state.scenario) return;
    // Fire one STREAM_TICK immediately so the first attack-chain event
    // lands on page load — no waiting for the first interval.
    dispatch({ type: 'STREAM_TICK' });
    const id = setInterval(() => dispatch({ type: 'STREAM_TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.scenario, state.startedAt]);

  // Ambient benign telemetry — varied 5-10s spacing, capped at the first
  // minute with the rest of the simulation.
  useEffect(() => {
    if (!state.scenario || !state.startedAt) return;
    let timeoutId;
    function schedule() {
      const elapsedMs = Date.now() - state.startedAt;
      const remainingMs = SIMULATION_END_SEC * 1000 - elapsedMs;
      if (remainingMs <= 0) return;
      const delay = Math.min(5000 + Math.floor(Math.random() * 5000), remainingMs); // 5-10s
      timeoutId = setTimeout(() => {
        if (Date.now() - state.startedAt <= SIMULATION_END_SEC * 1000) {
          dispatch({ type: 'BENIGN_TICK' });
        }
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timeoutId);
  }, [state.scenario, state.startedAt]);

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
