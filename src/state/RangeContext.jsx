import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { RANGE_STAGES } from '../content/rangeStages.js';

const RangeContext = createContext(null);

export const useRange = () => useContext(RangeContext);

const STORAGE_KEY = 'range01:session:v1';

const initial = {
  startedAt: Date.now(),
  now: 0,
  activeStageId: RANGE_STAGES[0]?.id ?? null,
  completedStageIds: [],
  decisions: {},
  notes: {},
  score: 0,
  reviewLog: [],
};

function normalizeState(saved) {
  const stageIds = new Set(RANGE_STAGES.map((stage) => stage.id));
  const completedStageIds = Array.isArray(saved?.completedStageIds)
    ? saved.completedStageIds.filter((id) => stageIds.has(id))
    : [];
  const decisions = saved?.decisions && typeof saved.decisions === 'object' ? saved.decisions : {};
  const notes = saved?.notes && typeof saved.notes === 'object' ? saved.notes : {};
  const activeStageId = stageIds.has(saved?.activeStageId)
    ? saved.activeStageId
    : RANGE_STAGES[0]?.id ?? null;

  return {
    ...initial,
    ...saved,
    startedAt: Number.isFinite(saved?.startedAt) ? saved.startedAt : Date.now(),
    now: Number.isFinite(saved?.now) ? saved.now : 0,
    activeStageId,
    completedStageIds,
    decisions,
    notes,
    score: Number.isFinite(saved?.score) ? saved.score : 0,
    reviewLog: Array.isArray(saved?.reviewLog) ? saved.reviewLog : [],
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

function nextOpenStageId(state) {
  return RANGE_STAGES.find((stage) => !state.completedStageIds.includes(stage.id))?.id ?? null;
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return {
        ...initial,
        startedAt: Date.now(),
      };
    case 'TICK':
      return {
        ...state,
        now: state.now + 1,
      };
    case 'SELECT_STAGE': {
      const target = RANGE_STAGES.find((stage) => stage.id === action.stageId);
      if (!target) return state;
      const currentIndex = RANGE_STAGES.findIndex((stage) => stage.id === nextOpenStageId(state));
      const targetIndex = RANGE_STAGES.findIndex((stage) => stage.id === action.stageId);
      const unlocked = targetIndex <= currentIndex || state.completedStageIds.includes(action.stageId);
      return unlocked ? { ...state, activeStageId: action.stageId } : state;
    }
    case 'SAVE_NOTE':
      return {
        ...state,
        notes: { ...state.notes, [action.stageId]: action.note },
      };
    case 'SAVE_DECISION':
      return {
        ...state,
        decisions: {
          ...state.decisions,
          [action.stageId]: {
            ...(state.decisions[action.stageId] || {}),
            verdict: action.verdict,
            updatedAt: Date.now(),
          },
        },
      };
    case 'LOCK_STAGE': {
      const stage = RANGE_STAGES.find((item) => item.id === action.stageId);
      if (!stage) return state;
      const decision = state.decisions[action.stageId];
      if (!decision?.verdict) return state;
      if (decision.locked) return state;

      const correct = decision.verdict === stage.answer;
      const points = correct ? 100 : 0;
      const nextStageId = nextOpenStageId({
        ...state,
        completedStageIds: state.completedStageIds.includes(stage.id)
          ? state.completedStageIds
          : [...state.completedStageIds, stage.id],
      });

      return {
        ...state,
        completedStageIds: state.completedStageIds.includes(stage.id)
          ? state.completedStageIds
          : [...state.completedStageIds, stage.id],
        decisions: {
          ...state.decisions,
          [action.stageId]: {
            ...decision,
            locked: true,
            correct,
            points,
            lockedAt: Date.now(),
          },
        },
        score: state.score + points,
        reviewLog: [
          ...state.reviewLog,
          {
            stageId: stage.id,
            verdict: decision.verdict,
            correct,
            points,
            lockedAt: Date.now(),
          },
        ],
        activeStageId: nextStageId ?? stage.id,
      };
    }
    default:
      return state;
  }
}

export function RangeProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures in private mode or restricted environments.
    }
  }, [state]);

  const resetSession = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
    dispatch({ type: 'RESET' });
  };

  const value = useMemo(() => ({ state, dispatch, resetSession }), [state]);
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRangeMetrics() {
  const { state } = useRange();
  const completed = state.completedStageIds.length;
  const total = RANGE_STAGES.length || 1;
  const progress = Math.round((completed / total) * 100);
  const mm = String(Math.floor(state.now / 60)).padStart(2, '0');
  const ss = String(state.now % 60).padStart(2, '0');
  const timer = `${mm}:${ss}`;
  const activeStage = RANGE_STAGES.find((stage) => stage.id === state.activeStageId) ?? RANGE_STAGES[0] ?? null;
  const currentStage = RANGE_STAGES.find((stage) => !state.completedStageIds.includes(stage.id)) ?? null;
  const decision = activeStage ? state.decisions[activeStage.id] : null;
  return {
    completed,
    total,
    progress,
    timer,
    activeStage,
    currentStage,
    decision,
    allComplete: completed >= total,
  };
}

