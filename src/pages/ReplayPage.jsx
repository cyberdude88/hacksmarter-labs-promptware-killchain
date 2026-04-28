import { useEffect, useRef } from 'react';
import { useSoc } from '../state/SocContext.jsx';

// Replay engine UI — restarts the scenario timeline against the user's rules
// and shows where their detections fired (early/late/missed).
export default function ReplayPage() {
  const { state, dispatch } = useSoc();
  const streamRef = useRef(null);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.replayTelemetry.length]);

  const start = () => dispatch({ type: 'START_REPLAY' });
  const stop = () => dispatch({ type: 'STOP_REPLAY' });

  // Per-step status: did the user catch this attack step?
  const detectionByEvtId = new Map(state.replayDetections.map((d) => [d.eventId, d]));
  const attackChainLen = state.scenario?.attackChain?.length || 0;

  // Categorize firings by how early they were within the timeline.
  // Early = first half of timeline, Late = second half.
  const halfPoint = attackChainLen / 2;
  const earlyHits = state.replayDetections.filter((d, i) => {
    const evt = state.replayTelemetry.find((e) => e.id === d.eventId);
    return evt && state.replayTelemetry.indexOf(evt) < halfPoint;
  }).length;
  const lateHits = state.replayDetections.length - earlyHits;
  const missed = state.replayTelemetry.filter((e) => !detectionByEvtId.has(e.id) && (state.scenario?.expectedDetections || []).includes(e.type)).length;

  return (
    <div className="page page-replay">
      <div className="page-head">
        <div>
          <h1>Replay Attack</h1>
          <div className="dim">
            Run the FortiGate timeline against your detection rules. Each tick advances one step.
          </div>
        </div>
        <div className="replay-controls">
          {state.replayRunning ? (
            <>
              <span className="replay-tick">tick {state.replayTick}/{attackChainLen}</span>
              <button className="btn btn-danger" onClick={stop}>Stop</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={start}>
              {state.replayCompleted ? '↻ Replay Again' : '▶ Start Replay'}
            </button>
          )}
        </div>
      </div>

      <div className="replay-grid">
        <section className="card">
          <div className="panel-title">Replayed Telemetry</div>
          <div className="stream" ref={streamRef}>
            {state.replayTelemetry.length === 0 && <div className="empty">press Start Replay…</div>}
            {state.replayTelemetry.map((e) => {
              const det = detectionByEvtId.get(e.id);
              const expected = (state.scenario?.expectedDetections || []).includes(e.type);
              const cls = det ? 'caught' : expected ? 'missed' : '';
              return (
                <div key={e.id} className={`stream-line attack ${cls}`}>
                  <span className="ts">[{e.ts}]</span>{' '}
                  <span className="evt-type">{e.type}</span>
                  <span className="kv"> src_ip=<em>{e.src_ip}</em></span>
                  {e.user && <span className="kv"> user=<em>{e.user}</em></span>}
                  {e.url && <span className="kv"> url=<em>{e.url}</em></span>}
                  {e.msg && <span className="msg"> — {e.msg}</span>}
                  {det && <span className="badge-detect">✓ {det.ruleName}</span>}
                  {!det && expected && <span className="badge-miss">✗ MISSED</span>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="panel-title">Detection Summary</div>

          <div className="big-stats">
            <Stat label="early" value={earlyHits} cls="ok" />
            <Stat label="late" value={lateHits} cls="warn" />
            <Stat label="missed" value={missed} cls="bad" />
          </div>

          <div className="subhead">Firings</div>
          {state.replayDetections.length === 0 && <div className="empty">no rules fired yet</div>}
          <ul className="firings">
            {state.replayDetections.map((d, i) => (
              <li key={i}>
                <span className="ts mono">{d.ts}</span>
                <span className="evt-type">{d.eventType}</span>
                <span className="dim small">{d.ruleName}</span>
              </li>
            ))}
          </ul>

          {state.replayCompleted && (
            <div className={`replay-result ${state.replayDetections.length > 0 ? 'ok' : 'bad'}`}>
              {state.replayDetections.length > 0
                ? '✓ Replay complete — detections recorded'
                : '✗ No detections fired — go back and refine your rules'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, cls }) {
  return (
    <div className={`stat-box stat-${cls}`}>
      <div className="stat-num">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
