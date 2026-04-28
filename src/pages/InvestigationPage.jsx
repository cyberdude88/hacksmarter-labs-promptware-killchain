import { useEffect, useMemo, useRef, useState } from 'react';
import { useSoc } from '../state/SocContext.jsx';

// Investigation page — SIEM-style drill-down.
// Two analyst-facing controls keep the firehose manageable:
//   1. A query bar that filters the visible stream (free-text or k=v).
//   2. A pause toggle that locks a snapshot so new emits don't push the
//      logs you're inspecting off the screen.
const PIVOTS = [
  { k: 'src_ip', label: 'source IP' },
  { k: 'user',   label: 'user' },
  { k: 'host',   label: 'host' },
  { k: 'type',   label: 'event type' },
];

const LOG_FAMILIES = [
  { k: 'all', label: 'All Logs' },
  { k: 'network', label: 'Network Logs' },
  { k: 'auth', label: 'Auth Logs' },
  { k: 'system', label: 'System Logs' },
  { k: 'admin', label: 'Admin / API' },
  { k: 'detection', label: 'IDS / IPS / Detection' },
];

function classifyEvent(evt) {
  const type = evt.type || '';
  if (type.startsWith('IDS_') || type.startsWith('IPS_')) return 'detection';
  if (type.startsWith('AUTH_')) return 'auth';
  if (type.startsWith('API_') || type.startsWith('ADMIN_') || type.startsWith('CONFIG_')) return 'admin';
  if (['SYSTEM_ADMIN_LOGIN', 'SYSTEM_GUI_RENDER', 'SYSTEM_CONFIG_READ', 'SYSTEM_BACKUP_STAGE', 'SYSTEM_ACCOUNT_STAGE'].includes(type)) return 'admin';
  if (type.startsWith('FW_') || type.startsWith('NET_')) return 'network';
  if (type.startsWith('SYSTEM_')) return 'system';
  if (['DNS_QUERY', 'PROXY_GET', 'DHCP_LEASE', 'FW_ALLOW'].includes(type)) return 'network';
  if (['PROCESS_START', 'FILE_WRITE'].includes(type)) return 'system';
  return evt.isAttack ? 'admin' : 'system';
}

function phaseForTOffset(tOffset, timeline = []) {
  let phase = null;
  for (const item of timeline) {
    if (tOffset >= item.tOffset) phase = item.phase;
    else break;
  }
  return phase;
}

// Parse a query into a list of filters.
// Supported syntax:
//   src_ip=185.220.101.42      → exact match on src_ip
//   user=admin host=fgt-edge-01 → AND of multiple k=v pairs
//   admin                       → free-text substring across all string fields
//   src_ip=185.220 admin       → mixed: k=v match AND substring match
function parseQuery(q) {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  const kv = [];
  const text = [];
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq > 0) kv.push({ k: t.slice(0, eq), v: t.slice(eq + 1) });
    else text.push(t.toLowerCase());
  }
  return { kv, text };
}

function matchesQuery(evt, parsed) {
  for (const { k, v } of parsed.kv) {
    const ev = evt[k];
    if (ev === undefined || !String(ev).toLowerCase().includes(v.toLowerCase())) return false;
  }
  for (const t of parsed.text) {
    const hay = Object.entries(evt)
      .flatMap(([k, v]) => [k, typeof v === 'string' ? v : null])
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(t)) return false;
  }
  return true;
}

export default function InvestigationPage() {
  const { state, dispatch } = useSoc();
  const streamRef = useRef(null);

  const selected = state.alerts.find((a) => a.id === state.selectedAlertId);
  const trigger = selected ? state.telemetry.find((e) => e.id === selected.triggeringEventId) : null;

  // ---- pivot selection ----
  const [pivot, setPivot] = useState('src_ip');
  useEffect(() => { setPivot('src_ip'); }, [state.selectedAlertId]);

  // ---- pause / snapshot ----
  // We auto-pause the moment the analyst selects an alert: investigating a
  // moving target is harder than analyzing a static snapshot.
  const [paused, setPaused] = useState(false);
  const [snapshot, setSnapshot] = useState([]);
  const lastSelectedRef = useRef(null);

  useEffect(() => {
    if (state.selectedAlertId && state.selectedAlertId !== lastSelectedRef.current) {
      setSnapshot(state.telemetry);
      setPaused(true);
      lastSelectedRef.current = state.selectedAlertId;
    }
    if (!state.selectedAlertId) lastSelectedRef.current = null;
  }, [state.selectedAlertId, state.telemetry]);

  const togglePause = () => {
    if (paused) { setPaused(false); setSnapshot([]); }
    else { setSnapshot(state.telemetry); setPaused(true); }
  };

  const freezeCurrentStream = () => {
    setSnapshot(state.telemetry);
    setPaused(true);
  };

  const baseStream = paused ? snapshot : state.telemetry;

  // ---- query + pivot filtering ----
  const [query, setQuery] = useState('');
  const [jumpTargetId, setJumpTargetId] = useState(null);
  const [activePhase, setActivePhase] = useState(null);
  const [familyFilter, setFamilyFilter] = useState('all');
  const [hostFilter, setHostFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const parsed = useMemo(() => parseQuery(query), [query]);

  const valueFor = (k) => (trigger?.[k] ?? selected?.[k] ?? null);
  const counts = PIVOTS.reduce((acc, p) => {
    const v = valueFor(p.k);
    acc[p.k] = v ? baseStream.filter((e) => e[p.k] === v).length : 0;
    return acc;
  }, {});

  const pivotValue = valueFor(pivot);
  const hostCounts = Object.fromEntries(
    baseStream
      .filter((e) => e.host)
      .map((e) => e.host)
      .reduce((acc, host) => acc.set(host, (acc.get(host) || 0) + 1), new Map())
      .entries()
  );
  const typeCounts = Object.fromEntries(
    baseStream
      .filter((e) => e.type)
      .map((e) => e.type)
      .reduce((acc, type) => acc.set(type, (acc.get(type) || 0) + 1), new Map())
      .entries()
  );
  const hosts = Object.keys(hostCounts).sort();
  const types = Object.keys(typeCounts).sort();
  const familyCounts = Object.fromEntries(
    LOG_FAMILIES.map((f) => [
      f.k,
      f.k === 'all' ? baseStream.length : baseStream.filter((e) => classifyEvent(e) === f.k).length,
    ])
  );
  const visible = baseStream.filter((e) => {
    if (selected && pivotValue && e[pivot] !== pivotValue) return false;
    if (activePhase && e.phase !== activePhase) return false;
    if (familyFilter !== 'all' && classifyEvent(e) !== familyFilter) return false;
    if (hostFilter !== 'all' && e.host !== hostFilter) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (query && !matchesQuery(e, parsed)) return false;
    return true;
  });
  const liveActivity = state.telemetry.slice(-14).reverse();

  const phaseCounts = Object.fromEntries(
    (state.scenario?.timeline || []).map((p) => [
      p.phase,
      (state.scenario?.attackChain || []).filter((step) => phaseForTOffset(step.tOffset, state.scenario?.timeline || []) === p.phase).length,
    ])
  );
  const phaseSeenCounts = Object.fromEntries(
    (state.scenario?.timeline || []).map((p) => [
      p.phase,
      baseStream.filter((e) => e.isAttack && e.phase === p.phase).length,
    ])
  );

  // Auto-scroll only while LIVE — when paused the analyst is reading.
  useEffect(() => {
    if (paused) return;
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length, paused]);

  useEffect(() => {
    if (!jumpTargetId) return;
    const el = document.getElementById(`stream-${jumpTargetId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('jump-target');
    window.requestAnimationFrame(() => el.classList.add('jump-target'));
    const timer = window.setTimeout(() => {
      el.classList.remove('jump-target');
      setJumpTargetId((id) => (id === jumpTargetId ? null : id));
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [jumpTargetId, visible]);

  // ---- IOC flag input ----
  const [iocInput, setIocInput] = useState('');
  const flagIoc = () => {
    const v = iocInput.trim();
    if (!v) return;
    dispatch({ type: 'IDENTIFY_IOC', value: v });
    setIocInput('');
  };

  const phaseReached = (tOffset) => state.now >= tOffset && state.attackIndex > 0;

  const clearAlertFocus = () => {
    if (state.selectedAlertId) {
      dispatch({ type: 'SELECT_ALERT', id: null });
      setPaused(false);
      setSnapshot([]);
    }
  };

  const applyFamilyFilter = (family) => {
    clearAlertFocus();
    freezeCurrentStream();
    setFamilyFilter(family);
    setHostFilter('all');
    setTypeFilter('all');
    setActivePhase(null);
    setQuery('');
  };

  const applyHostFilter = (host) => {
    clearAlertFocus();
    freezeCurrentStream();
    setHostFilter(host);
    setActivePhase(null);
  };

  const applyTypeFilter = (type) => {
    clearAlertFocus();
    freezeCurrentStream();
    setTypeFilter(type);
    setActivePhase(null);
  };

  const jumpToTimelineEvent = (tOffset, phase) => {
    const target = baseStream.find((e) => e.tOffset === tOffset) || state.telemetry.find((e) => e.tOffset === tOffset);
    if (!target) return;

    const hiddenByPivot = selected && pivotValue && target[pivot] !== pivotValue;
    const hiddenByQuery = query && !matchesQuery(target, parsed);

    if (hiddenByQuery) setQuery('');
    if (hiddenByPivot) dispatch({ type: 'SELECT_ALERT', id: null });
    freezeCurrentStream();
    setFamilyFilter('all');
    setHostFilter('all');
    setTypeFilter('all');
    setActivePhase(phase);
    setJumpTargetId(target.id);
  };

  const clearLogFilters = () => {
    setFamilyFilter('all');
    setHostFilter('all');
    setTypeFilter('all');
    setActivePhase(null);
  };

  return (
    <div className="page page-invest">
      <div className="page-head">
        <div>
          <h1>Investigation</h1>
          <div className="dim">
            {selected
              ? <>Alert <span className="mono">{selected.id}</span> · {selected.rule_name}</>
              : <>showing telemetry stream · click an alert in the queue to focus the investigation</>}
          </div>
        </div>
        <div className="dim small">{visible.length} of {baseStream.length} events</div>
      </div>

      {/* --- Query + pause controls --- */}
      <div className="query-row">
        <input
          className="query-bar"
          placeholder='search… e.g. src_ip=185.220.101.42  user=admin  CONFIG_EXPORT'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className={`btn ${paused ? 'btn-primary' : ''}`}
          onClick={togglePause}
          title={paused ? 'snapshot frozen — click to resume live stream' : 'pause stream to analyze a snapshot'}
        >
          {paused ? '▶ Resume Live' : '⏸ Pause Stream'}
        </button>
        {selected && <button className="btn-link" onClick={clearAlertFocus}>clear alert focus</button>}
        {query && <button className="btn-link" onClick={() => setQuery('')}>clear query</button>}
        {(familyFilter !== 'all' || hostFilter !== 'all' || typeFilter !== 'all' || activePhase) && (
          <button className="btn-link" onClick={clearLogFilters}>clear log filters</button>
        )}
      </div>

      {paused && (
        <div className="banner banner-paused">
          <b>Snapshot paused</b> at {baseStream.length} events. New telemetry is buffered behind the scenes — resume to flush it in.
        </div>
      )}

      {/* --- Alert context (only when selected) --- */}
      {selected && (
        <div className="context-card">
          <div className="context-head">
            <div>
              <div className="dim small">selected alert</div>
              <div className="context-title">
                <span className={`sev-badge sev-${selected.severity}`}>{selected.severity}</span>
                {' '}{selected.rule_name}
              </div>
              <div className="dim small">{selected.summary}</div>
            </div>
            <button className="btn-link" onClick={clearAlertFocus}>✕ clear</button>
          </div>

          <div className="context-body">
            <div>
              <div className="subhead">Triggering Event</div>
              {trigger ? (
                <div className="trigger-evt">
                  {trigger.phase && <span className="phase-chip">{trigger.phase}</span>}
                  <div><span className="dim small">type</span> <span className="evt-type">{trigger.type}</span></div>
                  <div><span className="dim small">at</span> <span className="mono">{trigger.ts}</span></div>
                  <div><span className="dim small">src_ip</span> <span className="mono">{trigger.src_ip}</span></div>
                  {trigger.user && <div><span className="dim small">user</span> <span className="mono">{trigger.user}</span></div>}
                  {trigger.host && <div><span className="dim small">host</span> <span className="mono">{trigger.host}</span></div>}
                  {trigger.url && <div><span className="dim small">url</span> <span className="mono">{trigger.url}</span></div>}
                  {trigger.msg && <div className="trigger-msg">{trigger.msg}</div>}
                </div>
              ) : (
                <div className="dim small">
                  No specific triggering event for this alert (correlation alert) — pivoting on alert metadata instead.
                </div>
              )}
            </div>

            <div>
              <div className="subhead">Pivot — find correlating logs by</div>
              <div className="pivot-row">
                {PIVOTS.map((p) => {
                  const v = valueFor(p.k);
                  return (
                    <button
                      key={p.k}
                      className={`pivot-pill ${pivot === p.k ? 'is-on' : ''}`}
                      disabled={!v}
                      title={v ? `${p.label} = ${v}` : 'no value on this alert'}
                      onClick={() => setPivot(p.k)}
                    >
                      <span>{p.label}</span>
                      {v && <span className="pivot-val mono">{v}</span>}
                      <span className="pivot-count">{counts[p.k]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="dim small">
                Showing {visible.length} event(s) where <span className="mono">{pivot}</span> ={' '}
                <span className="mono">{pivotValue || '—'}</span>{query && <> · query: <span className="mono">{query}</span></>}.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="invest-grid">
        <section className="invest-stream">
          <div className="panel-head">
            <div className="panel-title">Evidence Log</div>
            <div className="dim small">
              {familyFilter !== 'all' ? LOG_FAMILIES.find((f) => f.k === familyFilter)?.label : 'Mixed telemetry'}
            </div>
          </div>
          <div className="stream-toolbar">
            <div className="dim small">
              Showing
              {familyFilter !== 'all' && <> <span className="mono">{LOG_FAMILIES.find((f) => f.k === familyFilter)?.label}</span></>}
              {hostFilter !== 'all' && <> · host <span className="mono">{hostFilter}</span></>}
              {typeFilter !== 'all' && <> · type <span className="mono">{typeFilter}</span></>}
              {activePhase && <> · phase <span className="mono">{activePhase}</span></>}
              {familyFilter === 'all' && hostFilter === 'all' && typeFilter === 'all' && !activePhase && <> live attack and benign telemetry together</>}
            </div>
            {activePhase && (
              <button className="btn-link" onClick={() => setActivePhase(null)}>
                clear phase
              </button>
            )}
          </div>
          <div className="stream" ref={streamRef}>
            {visible.length === 0 && <div className="empty">no events match…</div>}
            {visible.map((e) => (
              <StreamLine key={e.id} evt={e} isTrigger={trigger?.id === e.id} />
            ))}
          </div>
        </section>

        <section className="invest-side">
          <div className="card">
            <div className="panel-head">
              <div className="panel-title">Activity Feed</div>
              <div className="dim small">live</div>
            </div>
            <div className="activity-feed">
              {liveActivity.length === 0 && <div className="empty">waiting for telemetry…</div>}
              {liveActivity.map((e) => (
                <div key={`live-${e.id}`} className={`activity-line ${e.isAttack ? 'attack' : 'benign'}`}>
                  <span className="mono">[{e.ts}]</span>{' '}
                  <span className="evt-type">{e.type}</span>
                  {e.host && <span className="dim small"> · {e.host}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="panel-title">Filter Logs</div>
            <div className="filter-card">
              <div>
                <div className="subhead">Families</div>
                <div className="filter-grid">
                  {LOG_FAMILIES.map((f) => (
                    <button
                      key={f.k}
                      className={`filter-pill ${familyFilter === f.k ? 'is-on' : ''}`}
                      onClick={() => applyFamilyFilter(f.k)}
                    >
                      <span>{f.label}</span>
                      <span className="filter-count">{familyCounts[f.k] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selected && (
                <div>
                  <div className="subhead">Alert Context</div>
                  <div className="filter-grid">
                    {trigger?.host && (
                      <button className={`filter-pill ${hostFilter === trigger.host ? 'is-on' : ''}`} onClick={() => applyHostFilter(trigger.host)}>
                        <span>Host</span>
                        <span className="filter-count mono">{trigger.host}</span>
                      </button>
                    )}
                    {selected?.type && (
                      <button className={`filter-pill ${typeFilter === selected.type ? 'is-on' : ''}`} onClick={() => applyTypeFilter(selected.type)}>
                        <span>Alert Type</span>
                        <span className="filter-count mono">{selected.type}</span>
                      </button>
                    )}
                    {trigger?.type && (
                      <button className={`filter-pill ${typeFilter === trigger.type ? 'is-on' : ''}`} onClick={() => applyTypeFilter(trigger.type)}>
                        <span>Trigger Type</span>
                        <span className="filter-count mono">{trigger.type}</span>
                      </button>
                    )}
                    {selected?.src_ip && (
                      <button className="filter-pill" onClick={() => setQuery(`src_ip=${selected.src_ip}`)}>
                        <span>Source IP</span>
                        <span className="filter-count mono">{selected.src_ip}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="subhead">Hosts</div>
                <div className="filter-list">
                  <button className={`filter-row ${hostFilter === 'all' ? 'is-on' : ''}`} onClick={() => applyHostFilter('all')}>
                    <span>All hosts</span>
                    <span className="filter-count">{hosts.length}</span>
                  </button>
                  {hosts.map((host) => (
                    <button key={host} className={`filter-row ${hostFilter === host ? 'is-on' : ''}`} onClick={() => applyHostFilter(host)}>
                      <span className="mono">{host}</span>
                      <span className="filter-count">{hostCounts[host]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="subhead">Event Types</div>
                <div className="filter-list compact">
                  <button className={`filter-row ${typeFilter === 'all' ? 'is-on' : ''}`} onClick={() => applyTypeFilter('all')}>
                    <span>All types</span>
                    <span className="filter-count">{types.length}</span>
                  </button>
                  {types.map((type) => (
                    <button key={type} className={`filter-row ${typeFilter === type ? 'is-on' : ''}`} onClick={() => applyTypeFilter(type)}>
                      <span className="mono">{type}</span>
                      <span className="filter-count">{typeCounts[type]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="panel-head">
              <div className="panel-title">Attack Timeline</div>
              {activePhase && <span className="phase-filter-chip">{activePhase}</span>}
            </div>
            <ol className="timeline">
              {(state.scenario?.timeline || []).map((p, i) => {
                const reached = phaseReached(p.tOffset);
                const hasEvent = baseStream.some((e) => e.tOffset === p.tOffset) || state.telemetry.some((e) => e.tOffset === p.tOffset);
                const isOn = activePhase === p.phase;
                return (
                  <li key={i} className={`${reached ? 'reached' : ''} ${isOn ? 'is-on' : ''}`}>
                    <div className="phase-dot" />
                    <button
                      type="button"
                      className="timeline-jump"
                      disabled={!reached || !hasEvent}
                      onClick={() => jumpToTimelineEvent(p.tOffset, p.phase)}
                      title={reached && hasEvent ? 'jump to matching telemetry event' : 'event not in the current stream yet'}
                    >
                      <div className="phase-name">{p.phase}</div>
                      <div className="phase-label">{p.label}</div>
                      <div className="dim small">t+{p.tOffset}s · {phaseSeenCounts[p.phase] || 0}/{phaseCounts[p.phase] || 0} seen</div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="card">
            <div className="panel-title">Indicators of Compromise</div>
            <div className="dim small">
              Flag any value (IP, URL, hash, domain) you've identified as suspicious.
              Decoys hurt your final score, so only flag what the evidence supports.
            </div>
            <div className="ioc-input-row">
              <input
                className="text-in"
                placeholder="e.g. 185.220.101.42"
                value={iocInput}
                onChange={(e) => setIocInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && flagIoc()}
              />
              <button className="btn btn-primary" onClick={flagIoc} disabled={!iocInput.trim()}>Flag</button>
            </div>
            {state.identifiedIocs.length > 0 && (
              <>
                <div className="subhead">Flagged ({state.identifiedIocs.length})</div>
                <div className="ioc-chips">
                  {state.identifiedIocs.map((v) => (
                    <span key={v} className="chip chip-ok">
                      <span className="mono">{v}</span>
                      <button className="chip-x"
                              onClick={() => dispatch({ type: 'UNFLAG_IOC', value: v })}
                              title="unflag">×</button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StreamLine({ evt, isTrigger }) {
  const cls = `${evt.isAttack ? 'attack' : 'benign'} ${isTrigger ? 'is-trigger' : ''}`;
  return (
    <div id={`stream-${evt.id}`} className={`stream-line ${cls}`}>
      {isTrigger && <span className="trigger-tag">TRIGGER</span>}
      <span className="ts">[{evt.ts}]</span>{' '}
      {evt.phase && <span className="phase-chip">{evt.phase}</span>}{' '}
      <span className="evt-type">{evt.type}</span>
      {Object.entries(evt)
        .filter(([k]) => !['id', 'ts', 'isAttack', 'type', 'msg', 'phase', 'tOffset'].includes(k))
        .map(([k, v]) => (
          <span key={k} className="kv"> {k}=<em>{String(v)}</em></span>
        ))}
      {evt.msg && <span className="msg"> — {evt.msg}</span>}
    </div>
  );
}
