// Containment page — Containment & Eradication phase of the incident-response
// lifecycle. Where the analyst will scope and cut off a promptware compromise
// (e.g. revoking tool/agent permissions, purging poisoned memory/retrieval
// entries, patching the injected instruction out of the data path).
//
// Placeholder: no tasks wired up yet.
export default function DetectionPage() {
  return (
    <div className="page page-containment">
      <div className="page-head">
        <div>
          <h1>Containment</h1>
          <div className="dim">Containment &amp; Eradication</div>
        </div>
      </div>

      <div className="empty">
        Nothing here yet — this stage will cover scoping and cutting off a
        promptware compromise once its content is designed.
      </div>
    </div>
  );
}
