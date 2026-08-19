# ui/ NODE MAP — read this instead of the big files

Knowledge node for small-context agents (goose-local) and fast onboarding.
Everything an agent needs to author ONE view without reading `views.js`
(6k+ lines) or `data.js` (3k+ lines).

## File ownership

| File | Owns | Hand-edit? |
|---|---|---|
| `data.js` | All fixture consts, `PORTALS`, `NAV`, `CLOUD_NAV` | codex/Claude only. Auto-merged fixture section at EOF belongs to `local-tasks/integrate.py` |
| `views.js` | `VIEWS['workload/page']` render functions | codex/Claude only. Auto-merged view section at EOF belongs to `local-tasks/add_view.py` |
| `app.js` | Router, shell renderer, controllers, `toast()` | codex/Claude only — never generated locally |
| `styles.css` | All chrome | codex/Claude only |

The shell is generic: `PORTALS` drives the workload switcher, `NAV[<portal id>]`
drives the left nav, router maps `#/<portal>/<page>` → `VIEWS['<portal>/<page>']`.
A new workload or route needs data entries only — no `app.js` changes.

## View contract

```js
VIEWS['copilot/plugins'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Security Copilot › <strong>Plugins</strong></div>
      <h1>Plugins</h1>
      <div class="page-subtitle">One sentence saying what the learner does here.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="toast('Fictional lab action.')">Action</button>
    </div>
  </div>
  ...body...
`;
```

- A view is a function returning an HTML template-literal string.
  (Advanced: return `{ html, onMount }` — local agents must NOT use this.)
- Fixture consts from `data.js` are in scope globally: interpolate rows
  with `${CONST.map(r => `...`).join('')}`.
- ALWAYS wrap fixture values in `esc(...)`.
- Helpers in scope: `esc(s)`, `cap(s)`, `fmtTime(iso)`; `toast('msg')`
  for any button that would "do" something. No other functions exist —
  inventing one = broken page.
- Links between pages: `<a class="chip-link" href="#/workload/page">`.
  Only link routes that exist (see route list in `local-tasks/INTEGRATION.md`
  and `NAV` in `data.js`).

## Approved CSS vocabulary (top of ~200 classes — stay inside it)

- Layout: `grid`, `two-col`, `three-col`, `card`, `card card-body`,
  `card-toolbar`, `tile`, `tile-title`, `tile-sub`
- Page chrome: `page-header`, `breadcrumb`, `page-subtitle`, `page-actions`
- KPIs: `kpi`, `kpi-value`, `kpi-label`, `kpi-delta`
- Text/detail: `muted`, `alert-section-title`, `chip-link`
- Label/value rows: `<div class="detail-row"><span>Label</span><strong>Value</strong></div>`
  — NOT `kv`. `kv` is a **monospace code cell** for raw values in tables
  (`<td class="kv">`); using it as a key/value row renders label and value jammed
  together in monospace.
- Inventory: `table-scroll` (wrap wide tables), `filterbar`, `chip`, `chip active`,
  `filter-group`, `filter-check`, `filter-actions`, `pill`
- Buttons: `btn btn-primary`, `btn btn-secondary`, `btn btn-secondary btn-sm`
- Tables: `<table class="grid">` with plain `thead`/`tbody`
- Severity pills: `<span class="sev high">High</span>` (`sev high`,
  `sev medium`, `sev low`); status tags: `tag`, `tag orange`, `tag green`

## Hard rules (same as AGENTS.md)

No vendor-copied text/markup, no real URLs, no secrets, no build step,
no network calls, fictional data only.
