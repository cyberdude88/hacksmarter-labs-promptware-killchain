import { KILL_CHAIN_STAGES } from '../../content/killChainCase.js';
import { useKillChain, deriveStageStatus } from '../../state/KillChainContext.jsx';

const STATUS_CLASS = {
  LOCKED: 'kc-status-locked',
  INVESTIGATING: 'kc-status-investigating',
  'EVIDENCE FOUND': 'kc-status-evidence',
  'ASSESSMENT REQUIRED': 'kc-status-assessment',
  COMPLETE: 'kc-status-complete',
};

// Persistent progress indicator + evidence-mapping framework, always
// visible once the investigation is open (spec §25) — not hidden nav.
export default function KillChainRail() {
  const { state, dispatch } = useKillChain();

  const gotoStage = (stageId) => {
    dispatch({ type: 'SET_ACTIVE_STAGE', stageId });
    dispatch({ type: 'SET_TAB', tab: 'kill-chain' });
  };

  return (
    <div className="kc-rail" role="tablist" aria-label="Kill chain stages">
      {KILL_CHAIN_STAGES.map((stage) => {
        const status = deriveStageStatus(state, stage.id);
        const active = state.activeStageId === stage.id && state.activeTab === 'kill-chain';
        return (
          <button
            key={stage.id}
            className={`kc-rail-stage ${STATUS_CLASS[status]} ${active ? 'is-active' : ''}`}
            onClick={() => gotoStage(stage.id)}
            aria-current={active ? 'true' : undefined}
          >
            <span className="kc-rail-step">{stage.step}</span>
            <span className="kc-rail-title">{stage.title}</span>
            <span className="kc-rail-status">{status}</span>
          </button>
        );
      })}
    </div>
  );
}
