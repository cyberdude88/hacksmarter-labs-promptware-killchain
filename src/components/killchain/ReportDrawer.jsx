import { useKillChain } from '../../state/KillChainContext.jsx';

// Slide-out Incident Report — stays reachable while the student keeps
// working the tabs underneath, rather than blocking them like a modal.
// Builds up as "Add to Incident Report" actions fire from the tabs; a
// graded-and-wrong entry shows a small red bump rather than the answer.
export default function ReportDrawer() {
  const { state, dispatch } = useKillChain();
  const entries = state.report.entries;

  return (
    <>
      {state.reportDrawerOpen && (
        <div className="report-scrim" onClick={() => dispatch({ type: 'TOGGLE_REPORT_DRAWER' })} />
      )}
      <aside className={`report-drawer ${state.reportDrawerOpen ? 'is-open' : ''}`} aria-hidden={!state.reportDrawerOpen}>
        <div className="completion-head">
          <div className="panel-title" style={{ marginBottom: 0 }}>Incident Report</div>
          <button className="btn-link" onClick={() => dispatch({ type: 'TOGGLE_REPORT_DRAWER' })}>close ✕</button>
        </div>
        <div className="report-drawer-body">
          {entries.length === 0 ? (
            <div className="empty">
              Nothing added yet. As you investigate, use “Add to Incident Report” on evidence,
              findings, and answers you want to cite — this becomes your final report.
            </div>
          ) : (
            <div className="report-entry-list">
              {entries.map((e) => (
                <div key={e.id} className="report-entry">
                  <div className="report-entry-row">
                    <span className="report-entry-kind">{e.kind}</span>
                    {e.graded && !e.correct && <span className="report-bump" title="This entry didn't hold up under grading" />}
                  </div>
                  <div className="report-entry-label">{e.label}</div>
                  <button className="btn-link danger" onClick={() => dispatch({ type: 'REMOVE_FROM_REPORT', id: e.id })}>
                    remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
