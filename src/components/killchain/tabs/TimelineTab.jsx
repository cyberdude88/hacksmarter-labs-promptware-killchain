import { useState } from 'react';
import { EVENTS } from '../../../content/killChainCase.js';

const SOURCES = ['ALL', 'EMAIL', 'AI', 'TOOL', 'DATA', 'IDENTITY', 'NETWORK', 'ENDPOINT'];

// Chronological correlation across all telemetry sources. ~10-15 of these
// events are actually relevant to the incident; the rest are background —
// the point is making the student separate signal from noise, not hiding
// which is which via any visual tell (relevant/killChainStage are never
// rendered here).
export default function TimelineTab() {
  const [source, setSource] = useState('ALL');
  const rows = source === 'ALL' ? EVENTS : EVENTS.filter((e) => e.source === source);

  return (
    <div className="kc-tab-pane">
      <div className="filter-row">
        {SOURCES.map((s) => (
          <button
            key={s}
            className={`pill ${source === s ? 'is-on' : ''}`}
            onClick={() => setSource(s)}
          >
            {s}
            <span className="pill-count">{s === 'ALL' ? EVENTS.length : EVENTS.filter((e) => e.source === s).length}</span>
          </button>
        ))}
      </div>

      <div className="kc-table-wrap">
        <table className="alert-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Time</th>
              <th style={{ width: 90 }}>Source</th>
              <th style={{ width: 160 }}>Event</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="alert-row">
                <td className="mono">{e.ts}</td>
                <td><span className="status">{e.source}</span></td>
                <td className="mono">{e.event_type}</td>
                <td>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
