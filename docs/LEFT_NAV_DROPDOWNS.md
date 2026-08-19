# Left Nav Dropdowns

## What changed

The main workload left navigation now uses collapsible section headers. The two sections the user called out, `Investigation & response` and `Assets`, can be expanded and retracted with the arrow control.

## Implementation

- `ui/app.js`
  - Added per-section expand/collapse state in `localStorage`.
  - Rendered each section header as a toggle button with a caret.
  - Hid the items under a section when that section is collapsed.
- `ui/styles.css`
  - Added section toggle styling and the hidden-state rule for submenu items.

## Behavior

- Clicking the arrow collapses the submenu.
- Clicking again expands it.
- The state persists across refreshes for each workload.
- The currently active route does not force a collapsed section back open.

## Verification

- `node --check /home/alex/defender-lab/ui/app.js`
