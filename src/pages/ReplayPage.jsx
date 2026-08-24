// Recovery page — Recovery phase of the incident-response lifecycle. Where
// the analyst will confirm the promptware kill chain is fully closed out
// before signing off into the Incident Report.
//
// Placeholder: no tasks wired up yet.
export default function ReplayPage() {
  return (
    <div className="page page-recovery">
      <div className="page-head">
        <div>
          <h1>Recovery</h1>
          <div className="dim">Recovery</div>
        </div>
      </div>

      <div className="empty">
        Nothing here yet — this stage will cover verifying recovery before
        the incident report once its content is designed.
      </div>
    </div>
  );
}
