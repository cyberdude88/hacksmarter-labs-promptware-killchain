import { useEffect, useMemo, useState } from 'react';
import { EMAIL, EVENTS, EVENT_TO_EVIDENCE } from '../../../content/killChainCase.js';
import { useKillChain } from '../../../state/KillChainContext.jsx';

const SORTED_EVENTS = [...EVENTS].sort((a, b) => (a.date + a.ts).localeCompare(b.date + b.ts));
const ALL_DATES = [...new Set(SORTED_EVENTS.map((e) => e.date))].sort();
const MIN_DATE = ALL_DATES[0];
const MAX_DATE = ALL_DATES[ALL_DATES.length - 1];

const SOURCES = [
  { id: 'ALL', label: 'All Logs' },
  { id: 'EMAIL', label: 'Email Logs' },
  { id: 'AI', label: 'AI Logs' },
  { id: 'TOOL', label: 'Tool Logs' },
  { id: 'DATA', label: 'Data Logs' },
  { id: 'IDENTITY', label: 'Identity Logs' },
  { id: 'NETWORK', label: 'Network Logs' },
  { id: 'ENDPOINT', label: 'Endpoint Logs' },
];

function detailFields(event) {
  const fields = [];
  if (event.user) fields.push(['User', event.user]);
  if (event.agent) fields.push(['Agent', event.agent]);
  if (event.repository) fields.push(['Repository', event.repository]);
  if (event.tool) fields.push(['Tool', event.tool]);
  if (event.action) fields.push(['Action', event.action]);
  if (event.destination) fields.push(['Destination', event.destination]);
  if (event.trust_level) fields.push(['Trust level', event.trust_level]);
  if (event.message_id) fields.push(['Message ID', event.message_id]);
  return fields;
}

function EmailArtifact({ onOpenEmailTab }) {
  return (
    <div className="artifact-card" style={{ marginTop: 12 }}>
      <div className="artifact-label">Email Artifact</div>
      <div className="review-line"><span>Message ID</span><span className="mono">{EMAIL.messageId}</span></div>
      <div className="review-line"><span>Subject</span><span>{EMAIL.subject}</span></div>
      <div className="review-line"><span>From</span><span className="mono">{EMAIL.from}</span></div>
      <div className="review-line"><span>To</span><span className="mono">{EMAIL.to}</span></div>
      <div className="review-line"><span>Received</span><span className="mono">{EMAIL.receivedAt}</span></div>
      <div className="subhead">Headers</div>
      <table className="alert-table" style={{ marginBottom: 12 }}>
        <thead>
          <tr>
            <th>Header</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(EMAIL.headers).map(([key, value]) => (
            <tr key={key} className="alert-row">
              <td className="mono">{key}</td>
              <td className="mono">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="subhead">Attachment</div>
      <div className="review-line">
        <span>{EMAIL.attachments[0].name}</span>
        <span className="dim small">{EMAIL.attachments[0].sizeKb} KB</span>
      </div>
      <div className="subhead">Raw message</div>
      <pre className="email-pre" style={{ maxHeight: 180, overflow: 'auto' }}>{EMAIL.raw}</pre>
      <div className="subhead">AI-extracted content</div>
      <p className="email-paragraph">{EMAIL.aiExtracted}</p>
      <div className="action-row" style={{ marginTop: 10 }}>
        <button className="btn btn-primary" onClick={onOpenEmailTab}>Open Email Tab</button>
      </div>
    </div>
  );
}

// Chronological correlation across all telemetry sources. ~10-15 of these
// events are actually relevant to the incident; the rest are background —
// the point is making the student separate signal from noise, not hiding
// which is which via any visual tell (relevant/killChainStage are never
// rendered here).
export default function TimelineTab() {
  const { state, dispatch } = useKillChain();
  const [source, setSource] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(MIN_DATE);
  const [dateTo, setDateTo] = useState(MAX_DATE);
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [timeTo, setTimeTo] = useState('23:59');

  const filterActive = dateFrom !== MIN_DATE || dateTo !== MAX_DATE || timeFrom !== '00:00' || timeTo !== '23:59';
  const resetFilters = () => {
    setDateFrom(MIN_DATE); setDateTo(MAX_DATE); setTimeFrom('00:00'); setTimeTo('23:59');
  };

  const rows = useMemo(() => (
    SORTED_EVENTS.filter((e) => (
      (source === 'ALL' || e.source === source)
      && e.date >= dateFrom && e.date <= dateTo
      && e.ts.slice(0, 5) >= timeFrom && e.ts.slice(0, 5) <= timeTo
    ))
  ), [source, dateFrom, dateTo, timeFrom, timeTo]);
  const [selectedId, setSelectedId] = useState(rows[0]?.id || null);

  useEffect(() => {
    const nextId = rows.some((row) => row.id === selectedId) ? selectedId : rows[0]?.id || null;
    if (nextId !== selectedId) setSelectedId(nextId);
  }, [rows, selectedId]);

  const selectedEvent = rows.find((row) => row.id === selectedId) || rows[0] || null;
  const reportExists = selectedEvent
    ? state.report.entries.some((entry) => entry.kind === 'evidence' && entry.refId === selectedEvent.id)
    : false;
  const emailArtifactVisible = selectedEvent?.source === 'EMAIL' && selectedEvent?.message_id === EMAIL.messageId;
  const linkedEvidenceIds = selectedEvent ? (EVENT_TO_EVIDENCE[selectedEvent.id] || []) : [];

  const addArtifact = () => {
    if (!selectedEvent) return;
    dispatch({
      type: 'ADD_TO_REPORT',
      kind: 'evidence',
      refId: selectedEvent.id,
      label: `${selectedEvent.source} log: ${selectedEvent.event_type} at ${selectedEvent.date} ${selectedEvent.ts}`,
    });
    // If this row is itself the source citation for a curated evidence
    // card, filing it also marks that card on the Evidence Board — no
    // need to separately re-find it in a per-category tab.
    linkedEvidenceIds.forEach((evidenceId) => {
      if (!state.markedEvidence[evidenceId]) {
        dispatch({ type: 'MARK_EVIDENCE', evidenceId });
      }
    });
  };

  return (
    <div className="kc-tab-pane">
      <div className="filter-row">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            className={`pill ${source === s.id ? 'is-on' : ''}`}
            onClick={() => setSource(s.id)}
          >
            {s.label}
            <span className="pill-count">{s.id === 'ALL' ? SORTED_EVENTS.length : SORTED_EVENTS.filter((e) => e.source === s.id).length}</span>
          </button>
        ))}
      </div>

      <div className="filter-row" style={{ alignItems: 'center', marginTop: 8 }}>
        <span className="dim small">Date</span>
        <input
          type="date"
          className="search-bar"
          style={{ width: 150 }}
          min={MIN_DATE}
          max={MAX_DATE}
          value={dateFrom}
          onChange={(ev) => setDateFrom(ev.target.value)}
          aria-label="Filter from date"
        />
        <span className="dim small">to</span>
        <input
          type="date"
          className="search-bar"
          style={{ width: 150 }}
          min={MIN_DATE}
          max={MAX_DATE}
          value={dateTo}
          onChange={(ev) => setDateTo(ev.target.value)}
          aria-label="Filter to date"
        />
        <span className="dim small">Time</span>
        <input
          type="time"
          className="search-bar"
          style={{ width: 110 }}
          value={timeFrom}
          onChange={(ev) => setTimeFrom(ev.target.value)}
          aria-label="Filter from time"
        />
        <span className="dim small">to</span>
        <input
          type="time"
          className="search-bar"
          style={{ width: 110 }}
          value={timeTo}
          onChange={(ev) => setTimeTo(ev.target.value)}
          aria-label="Filter to time"
        />
        {filterActive && (
          <button className="btn" onClick={resetFilters}>Clear date/time filter</button>
        )}
        <span className="dim small">{rows.length} of {SORTED_EVENTS.length} logs shown</span>
      </div>

      <div className="stage-grid">
        <div className="kc-table-wrap">
          <table className="alert-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Date</th>
                <th style={{ width: 90 }}>Time</th>
                <th style={{ width: 90 }}>Source</th>
                <th style={{ width: 160 }}>Event</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr
                  key={e.id}
                  className={`alert-row timeline-row ${selectedId === e.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setSelectedId(e.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="mono">{e.date}</td>
                  <td className="mono">{e.ts}</td>
                  <td><span className="status">{e.source}</span></td>
                  <td className="mono">{e.event_type}</td>
                  <td>{e.detail}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="empty">No logs in this date/time range.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="stage-side">
          <section className="artifact-card">
            <div className="artifact-label">Log Details</div>
            {selectedEvent ? (
              <>
                <div className="review-line"><span>Date</span><span className="mono">{selectedEvent.date}</span></div>
                <div className="review-line"><span>Time</span><span className="mono">{selectedEvent.ts}</span></div>
                <div className="review-line"><span>Source</span><span className="status">{selectedEvent.source} Logs</span></div>
                <div className="review-line"><span>Event</span><span className="mono">{selectedEvent.event_type}</span></div>
                <div className="review-line"><span>Detail</span><span>{selectedEvent.detail}</span></div>
                {detailFields(selectedEvent).map(([label, value]) => (
                  <div key={label} className="review-line">
                    <span>{label}</span>
                    <span className="mono">{value}</span>
                  </div>
                ))}
                {emailArtifactVisible && (
                  <EmailArtifact onOpenEmailTab={() => dispatch({ type: 'SET_TAB', tab: 'email' })} />
                )}
                {reportExists && linkedEvidenceIds.length > 0 && (
                  <div className="status-note">
                    Linked to catalog evidence {linkedEvidenceIds.join(', ')} — marked on the Evidence Board. File it to a stage there.
                  </div>
                )}
                <div className="action-row" style={{ marginTop: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={addArtifact}
                    disabled={reportExists}
                  >
                    Add Artifact to Incident Report
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">Select a log row to inspect its full details.</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
