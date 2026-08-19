# Hack Smarter Labs — Cyber Range

A single-page, offline SOC cyber range. No sign-in, no curriculum, no portal —
you land directly in the security workspace and work incidents.

```bash
bin/dev.sh start      # serves ui/ on http://127.0.0.1:8777/
bin/dev.sh stop
bin/dev.sh status
```

Or click **Hack Smarter Labs** on the dash.

## What it is

`ui/` is the whole product: ~1.4M of static JS/CSS/HTML with no build step and
no backend. Every alert, incident, device timeline, sign-in log, hunting query
result, email header, and vulnerability record is fixture data in `ui/data.js`.

| Path | What it holds |
|---|---|
| `ui/index.html` | Shell: topbar, workload tabs, panes |
| `ui/app.js` | Router, nav, chrome, storage |
| `ui/views.js` | Every view's render function |
| `ui/data.js` | The entire fictional environment |
| `ui/neutral-terminology.js` | **Vendor-neutral naming layer — see below** |
| `ui/helpdesk*.js` | IT Service Desk workload |
| `ui/kql-editor.js`, `ui/guided-hunting.js` | Hunting query surface |
| `ui/workflow-automation.js` | SOAR / playbook surface |
| `ui/coach.js`, `ui/coach-data.js` | Guided walkthrough layer (inert without `?coach=`) |

## Vendor-neutral naming is a product rule, not a preference

`ui/neutral-terminology.js` rewrites vendor product names to generic
security-operations language at render time — "Defender for Endpoint" becomes
"Endpoint Detection & Response", the tenant is "Hack Smarter Labs", the domain
is `hacksmarterlabs.example`. Internal identifiers (routes, storage keys,
fixture field names) stay stable on purpose; only learner-facing strings change.

**Do not reintroduce vendor product names in visible copy.** If you add a view
that surfaces one, add the mapping to `neutral-terminology.js` instead.

## Provenance

Forked from the Mission Next Technical Academy SOC Analyst course
(`~/Mission_Next_Technical_Academy_SOC_Analyst_course`). That project is a
portal + simulator pair; this one keeps only the simulator — the range — and
drops the login, catalogue, curriculum, module pages, and Supabase backend.

Ports are deliberately distinct so all three can run at once:
`8765` SC-200 lab · `8767`/`8768` academy sim/portal · `8777` this range.

## Checks

```bash
node bin/render_all.js    # render every view; sweep NAV routes for dead links
bin/qa-sweep.sh           # syntax + render, logs to docs/QA_LOG.md
```

`purview/audit: tiny/empty render` is a known pre-existing failure inherited
from upstream; it is not a rebrand regression.

## Disclaimer

Independent fictional training simulator. Not affiliated with, authorized,
sponsored, or approved by any software vendor. All data is fictional.
