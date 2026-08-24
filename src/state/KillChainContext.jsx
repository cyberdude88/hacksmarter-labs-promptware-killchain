import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { KILL_CHAIN_STAGES, STAGE_QUESTIONS, EVIDENCE_CATALOG } from '../content/killChainCase.js';

// =====================================================================
// Kill Chain investigation lab — dedicated state module.
// Separate from SocContext (a real-time alert/telemetry simulator with a
// different shape entirely) and from the unused RangeContext scaffold.
// Own localStorage key so a reset here never touches other pages' state.
// =====================================================================

const KillChainContext = createContext(null);
export const useKillChain = () => useContext(KillChainContext);

const STORAGE_KEY = 'killchain:session:v1';

const TABS = [
  'overview', 'timeline', 'email', 'ai-activity',
  'identity', 'data-access', 'network', 'evidence', 'kill-chain',
];

const initial = {
  opened: false,
  activeTab: 'overview',
  activeStageId: KILL_CHAIN_STAGES[0].id,
  showTrustBoundaries: false,
  reportDrawerOpen: false,

  // Investigation actions.
  markedEvidence: {},      // { evidenceId: true }
  claims: {},              // { claimId: 'benign' | 'injection' }
  instructionType: null,   // Prompt Analysis classification (email tab)

  // Evidence board: evidenceId -> stageId the student filed it under.
  boardAssignments: {},

  // Per-stage judgment-question answers: stageId -> optionId.
  stageAnswers: {},

  // Per-stage analyst notebook: stageId -> { finding, evidenceIds, confidence, disposition, savedAt }
  notebook: {},

  // Containment + attribution + final assessment.
  containmentSelected: [],       // array of containment option ids
  attributionConfidence: null,   // 'NONE'|'LOW'|'MEDIUM'|'HIGH'
  assessment: {},                // final 12-field form, keyed by field id

  // Incident report — built incrementally as the student works.
  report: { entries: [] },       // [{ id, kind, refId, label, addedAt, graded, correct }]

  submitted: false,
  score: null,
};

function normalizeState(saved) {
  if (!saved || typeof saved !== 'object') return initial;
  return {
    ...initial,
    ...saved,
    markedEvidence: saved.markedEvidence && typeof saved.markedEvidence === 'object' ? saved.markedEvidence : {},
    claims: saved.claims && typeof saved.claims === 'object' ? saved.claims : {},
    boardAssignments: saved.boardAssignments && typeof saved.boardAssignments === 'object' ? saved.boardAssignments : {},
    stageAnswers: saved.stageAnswers && typeof saved.stageAnswers === 'object' ? saved.stageAnswers : {},
    notebook: saved.notebook && typeof saved.notebook === 'object' ? saved.notebook : {},
    containmentSelected: Array.isArray(saved.containmentSelected) ? saved.containmentSelected : [],
    assessment: saved.assessment && typeof saved.assessment === 'object' ? saved.assessment : {},
    report: saved.report && Array.isArray(saved.report.entries) ? saved.report : { entries: [] },
    activeTab: TABS.includes(saved.activeTab) ? saved.activeTab : 'overview',
  };
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    return normalizeState(JSON.parse(raw));
  } catch {
    return initial;
  }
}

// A stage's evidence is "found" once the student has filed at least one
// evidence card onto it via the board.
function stageHasEvidence(state, stageId) {
  return Object.values(state.boardAssignments).some((s) => s === stageId);
}

export function getStageEvidence(state, stageId) {
  return EVIDENCE_CATALOG.filter((evidence) => state.boardAssignments[evidence.id] === stageId);
}

// Derive rail status for one stage. Not stored — always computed fresh so
// it can never drift out of sync with the underlying investigation state.
export function deriveStageStatus(state, stageId) {
  if (!state.opened) return 'LOCKED';
  const hasEvidence = stageHasEvidence(state, stageId);
  const hasAnswer = Boolean(state.stageAnswers[stageId]);
  const notebookEntry = state.notebook[stageId];
  if (notebookEntry?.savedAt) return 'COMPLETE';
  if (hasEvidence && hasAnswer) return 'ASSESSMENT REQUIRED';
  if (hasEvidence) return 'EVIDENCE FOUND';
  if (hasAnswer) return 'ASSESSMENT REQUIRED';
  return 'INVESTIGATING';
}

// Grade one report entry against the answer key it points back at.
function gradeEntry(entry) {
  if (entry.kind === 'evidence') {
    const evidence = EVIDENCE_CATALOG.find((e) => e.id === entry.refId);
    const filedStage = entry.filedStage; // captured at grading time from boardAssignments
    if (!evidence || !filedStage) return { graded: true, correct: false };
    return { graded: true, correct: filedStage === evidence.stage };
  }
  if (entry.kind === 'answer') {
    const [stageId] = String(entry.refId).split('::');
    const q = STAGE_QUESTIONS[stageId];
    if (!q) return { graded: true, correct: null };
    return { graded: true, correct: entry.chosenOptionId === q.answer };
  }
  // findings / free-text fields aren't auto-graded — leave ungraded (no bump).
  return { graded: false, correct: null };
}

function gradeEntriesForStage(state, stageId) {
  const entries = state.report.entries.map((entry) => {
    if (entry.kind === 'evidence') {
      const filedStage = entry.filedStage ?? state.boardAssignments[entry.refId] ?? null;
      if (!filedStage) return entry;
      if (filedStage !== stageId) return entry;
      return { ...entry, filedStage, ...gradeEntry({ ...entry, filedStage }) };
    }
    if (entry.kind === 'answer') {
      const [entryStageId] = String(entry.refId).split('::');
      if (entryStageId !== stageId) return entry;
      return { ...entry, ...gradeEntry(entry) };
    }
    return entry;
  });
  return { ...state.report, entries };
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return initial;

    case 'OPEN_INVESTIGATION':
      return { ...state, opened: true };

    case 'SET_TAB':
      return TABS.includes(action.tab) ? { ...state, activeTab: action.tab } : state;

    case 'SET_ACTIVE_STAGE': {
      const known = KILL_CHAIN_STAGES.some((s) => s.id === action.stageId);
      return known ? { ...state, activeStageId: action.stageId } : state;
    }

    case 'TOGGLE_TRUST_BOUNDARIES':
      return { ...state, showTrustBoundaries: !state.showTrustBoundaries };

    case 'TOGGLE_REPORT_DRAWER':
      return { ...state, reportDrawerOpen: !state.reportDrawerOpen };

    case 'MARK_EVIDENCE':
      return { ...state, markedEvidence: { ...state.markedEvidence, [action.evidenceId]: true } };

    case 'SET_CLAIM':
      return { ...state, claims: { ...state.claims, [action.claimId]: action.verdict } };

    case 'SET_INSTRUCTION_TYPE':
      return { ...state, instructionType: action.optionId };

    case 'ASSIGN_EVIDENCE_TO_STAGE':
      return { ...state, boardAssignments: { ...state.boardAssignments, [action.evidenceId]: action.stageId } };

    case 'ANSWER_STAGE_QUESTION':
      return { ...state, stageAnswers: { ...state.stageAnswers, [action.stageId]: action.optionId } };

    case 'SAVE_NOTEBOOK': {
      const notebook = {
        ...state.notebook,
        [action.stageId]: { ...action.entry, savedAt: Date.now() },
      };
      const report = gradeEntriesForStage({ ...state, notebook }, action.stageId);
      return { ...state, notebook, report };
    }

    case 'ADD_TO_REPORT': {
      const id = `RPT-${state.report.entries.length + 1}-${action.kind}`;
      const entry = {
        id,
        kind: action.kind,
        refId: action.refId,
        label: action.label,
        chosenOptionId: action.chosenOptionId ?? null,
        filedStage: action.filedStage ?? null,
        addedAt: Date.now(),
        graded: false,
        correct: null,
      };
      const entries = state.report.entries.some((e) => e.kind === action.kind && e.refId === action.refId)
        ? state.report.entries.map((e) => (e.kind === action.kind && e.refId === action.refId ? { ...e, ...entry, id: e.id } : e))
        : [...state.report.entries, entry];
      return { ...state, report: { ...state.report, entries } };
    }
    case 'REMOVE_FROM_REPORT':
      return { ...state, report: { ...state.report, entries: state.report.entries.filter((e) => e.id !== action.id) } };

    case 'TOGGLE_CONTAINMENT': {
      const has = state.containmentSelected.includes(action.optionId);
      return {
        ...state,
        containmentSelected: has
          ? state.containmentSelected.filter((id) => id !== action.optionId)
          : [...state.containmentSelected, action.optionId],
      };
    }

    case 'SET_ATTRIBUTION_CONFIDENCE':
      return { ...state, attributionConfidence: action.value };

    case 'SAVE_ASSESSMENT_FIELD':
      return { ...state, assessment: { ...state.assessment, [action.fieldId]: action.value } };

    default:
      return state;
  }
}

export function KillChainProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota / private-mode failures — session continues in memory only
    }
  }, [state]);

  const resetSession = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    dispatch({ type: 'RESET' });
  };

  const value = useMemo(() => ({ state, dispatch, resetSession }), [state]);
  return <KillChainContext.Provider value={value}>{children}</KillChainContext.Provider>;
}

// ---------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------
export function useKillChainMetrics() {
  const { state } = useKillChain();
  const evidenceCollected = Object.keys(state.markedEvidence).length;
  const reportBumps = state.report.entries.filter((e) => e.graded && !e.correct).length;
  const stagesComplete = KILL_CHAIN_STAGES.filter((s) => deriveStageStatus(state, s.id) === 'COMPLETE').length;
  return {
    evidenceCollected,
    reportEntryCount: state.report.entries.length,
    reportBumps,
    stagesComplete,
    stagesTotal: KILL_CHAIN_STAGES.length,
  };
}
