# Hack Smarter Labs Navigation Restructure — Progress

## Request

Implement `NAVIGATION_RESTRUCTURE.md` (same directory) against the running app at
`http://127.0.0.1:8777/`. Goal per that doc: keep every existing function, view, and route,
but change the information architecture so the shell no longer reads like a near-copy of the
source security portal (portal tabs + two-rail "portal + blade" silhouette + product-catalog
app switcher). This is a re-architecture of navigation only — no feature removal, no route-id
changes unless unavoidable.

## Working model: sprints

This project runs as a sequence of sprints, each handed to a **fresh, spawned agent** with no
memory of prior sprints. Each agent reads this file top to bottom (plus
`NAVIGATION_RESTRUCTURE.md`) before starting, does its scoped work, updates this file's Sprint
status + Notes section before finishing, then terminates. The next sprint is spawned fresh
after the previous one closes out — do not reuse or resume an agent across sprints.

## Serving source

```text
python3 /home/alex/hacksmarter-labs/bin/serve.py 8777 --bind 127.0.0.1 --directory /home/alex/hacksmarter-labs/ui
```

Active frontend files: `index.html`, `styles.css`, `app.js`, `data.js`, `views.js`,
`guided-hunting.js`, `helpdesk.js`, `helpdesk-data.js`, `kql-editor.js`, `lab-widgets.js`,
`neutral-terminology.js`, `storage-keys.js`. Plain JS app, no build step — edits are live on
reload.

## Known shell anatomy (confirmed via code read, app.js/data.js/index.html — cite line numbers
when they drift, this file will get stale as sprints edit these files)

- **`.portal-tabs`** (`index.html:60-64`) — exactly 3 static buttons, `data-portal="xdr"|"cloud"|"admin"`,
  each `onclick="switchPortalContext(ctx)"`. `switchPortalContext` (`app.js:101-106`) does NOT
  touch the DOM directly — it looks up the current workload's bucket in `PORTAL_CONTEXT`
  (`app.js:81-89`), no-ops if already in that bucket, else calls `navigate(PORTAL_CONTEXT_HOME[ctx])`
  (`app.js:90-94`: `xdr`→`#/xdr/home`, `cloud`→`#/cloud/overview`, `admin`→`#/workspace/home`),
  a plain hash change that triggers the router. Highlighting is separate: `renderPortalTabs(wl)`
  (`app.js:95-100`) toggles `.active` by matching `data-portal` against `PORTAL_CONTEXT[wl]`.
  **`PORTAL_CONTEXT` dict folds 7 workloads into only 3 buckets**: `xdr`→xdr, `governance`→xdr,
  `ai-agent`→xdr, `siem`→cloud, `cloud`→cloud, `identity`→admin, `workspace`→admin. **`helpdesk`
  is entirely absent from `PORTAL_CONTEXT`** — no tab ever highlights while on a helpdesk route.
  A tab click always lands on one of only 3 fixed home routes — never directly on `siem/home`,
  `governance/home`, `ai-agent/...`, or `identity/overview`. This is the doc §1 "product tabs" to
  replace, and it's already broken/stale, not just stylistically off-model.
- **`#pane-azure`** (`index.html:68-74`, second rail) — hidden/shown logic lives in `render()`
  (`app.js:57-72`): hidden when `wl === 'governance'` (clean-portal mode) or `wl === 'workspace'`
  (single-pane mode); shown for every other workload (not specifically a "cloud" thing). Populated
  by `renderAzurePane(wl)` (`app.js:117-130`) from the **shared `CLOUD_NAV` list** (`data.js:3679-3696`,
  16 cosmetic app tiles), marking the current one via `CLOUD_HIGHLIGHT[wl]`. Collapse/expand
  (icon-only) is a separate toggle, `togglePane('azure')` (`app.js:2162`). This is the doc §2 rail
  to collapse into contextual-subnav / drawer / command-palette.
- **`#pane-blade` / `#sidenav`** (`index.html:75-81`) — the rail to **keep**. Built by
  `renderSidenav(wl, route)` (`app.js:150+`) from `NAV[wl]` (`data.js:3698` onward, per-workload
  arrays of `{section}`/`{subsection}`/`{route,label,icon}` entries).
- **`#panel-switcher` / `#switcher-grid`** (`index.html:86-93`, waffle) — `#btn-waffle` click
  (`app.js:2158-2161`) calls `renderSwitcher()` (`app.js:1662-1677`), which builds tiles from
  **`CLOUD_NAV`, not `PORTALS`**, resolving each tile's route via `CLOUD_APP_ROUTE`
  (`app.js:1654-1661`, extended by `helpdesk.js:32` for `'IT Service Desk'`→`#/helpdesk/dashboard`).
  Clicking a tile calls plain `navigate(route)` — not `switchPortalContext`. Tiles with no
  `CLOUD_APP_ROUTE` entry (AI Foundry, DevOps, Data Explorer/Fabric, Code Repository/Studio,
  Endpoint Management, Workflow Automation, Low-Code Platform — decorative-only) get class `dim`
  and no `onclick`. **This waffle is currently the only reliable entry point** into `siem`,
  `governance`, `ai-agent`, `identity`, `workspace` (beyond its shared `admin` tab home), and
  `helpdesk`. This is the doc §5 "product catalog" launcher to reframe.
- **`#portal-name` / `#portal-context` / `body.className`** — set in `render()` (`app.js:41-52`).
  `#portal-name` is always the constant `LAB_BRAND` (`'Hack Smarter SOC'`); `#portal-context` is
  `· ` + `PORTALS.find(p => p.id === wl).name`. `body.className = 'wl-' + wl + ' route-' + slug`
  (two space-separated classes) — confirms the accent-color hook documented in
  `RESTYLE_PROGRESS.md`. Do not break this class shape; the theme/accent system depends on it.
- **`#workload-strip`** (`index.html:65`) — confirmed **dead markup**, zero JS references anywhere
  (`app.js`/`data.js`/`views.js`/`helpdesk.js`). Either wire it into the new shell or delete the
  empty div — Sprint 1's call.
- **`PORTALS`** (`data.js:3667-3675`) — 7 static entries (`xdr`, `siem`, `cloud`, `governance`,
  `ai-agent`, `identity`, `workspace`); `helpdesk.js:5` runtime-pushes an 8th (`helpdesk`) onto the
  same shared array. `PORTALS` itself is only consumed by `workloadOf()` (route-segment validation)
  and `render()`'s `portal.name`/`.tag` lookup — there is currently no dedicated portal-picker UI
  built from `PORTALS` directly; the waffle switcher is driven by the separate `CLOUD_NAV` list
  instead, so the two are already slightly out of sync with each other.
- Single router chain: `hashchange` (`app.js:2156`) → `render()` (`app.js:41-76`) → rebuilds
  `#sidenav` via `renderSidenav` and `#content` via `mountView(route)` (`app.js:323-340`,
  looks up `VIEWS[route]`).

## IA decision needed (Sprint 1 must resolve and record)

`NAVIGATION_RESTRUCTURE.md` itself proposes **three slightly different bucket lists** for the
new task-based nav across its §3, "Suggested Shell Model → Global nav", and "Route Mapping
Strategy" sections (8 buckets vs. 6 buckets vs. a 6-item route-mapping example, not fully
reconciled with each other). Sprint 1 must pick **one canonical bucket list**, map every
`PORTALS` id and every existing route under it with no drops, and write the final decision +
rationale into this file's Sprint 1 notes — the same way `RESTYLE_PROGRESS.md`'s Sprint 1
recorded the palette decision. Later sprints build on whatever Sprint 1 decides; do not
re-litigate it unless a real defect is found.

## Sprint plan

- **Sprint 1 — IA decision + shell foundation (Phase 1, judgment-heavy).**
  - Reconcile the bucket-taxonomy conflict above into one canonical list covering every
    `PORTALS` id and every existing route (no drops).
  - Replace `.portal-tabs` with a single home-hub entry point (doc §1: `Investigate` /
    `Govern` / `Operate` as the top mental model, or fold directly into the canonical bucket
    list chosen above — Sprint 1's call, document which).
  - Collapse `#pane-azure` as a permanent visual anchor — move it to one of: contextual
    in-page subnav, a drawer, or a command-palette jump surface (doc §2).
  - Reframe the waffle `#panel-switcher` copy/framing away from "product catalog" language
    (doc §5: `Labs` / `Workspaces` / `Scenarios` / `Shortcuts`).
  - Keep all routes intact, keep `#pane-blade`/`#sidenav` as the one persistent rail.
  - Verify: page still loads 200, every existing route still reachable, no console errors,
    theme toggle (from the restyle project) still works.

- **Sprint 2 — Nav bucket rebuild + relabeling (Phase 2, judgment-heavy).**
  - Rebuild `NAV`/left-rail grouping in `data.js` around Sprint 1's canonical task buckets
    instead of the current per-portal product grouping. Every existing route must land in
    exactly one bucket; nothing deleted.
  - Apply the doc §6 visible-label renames (`Incidents`→`Case queue`, `Alerts`→`Signals`,
    `Hunting`→`Search & explore`, `Threat explorer`→`Mail investigation`, `Action center`→
    `Response queue`, `Secure score`→`Exposure score`, `Identity protection`→`Identity risk`,
    `Conditional Access`→`Access policy`, `Workspace Admin`→`Tenant operations`) — labels only,
    route ids unchanged.
  - Update the home-hub landing (from Sprint 1) to reflect the new buckets: current cases,
    active hunts, risky identities, cloud findings, recent response actions, quick-launch cards
    (doc's "Suggested Shell Model → Home").

- **Sprint 3 — Page-local sub-navigation (Phase 2 cont'd, moderate judgment, likely
  largest footprint across `views.js`).**
  - For any page whose subviews are currently exposed as global-shell nav entries, move that
    navigation into the page body (tabs / stepper / filter bar / local side index / card grid
    per doc §4) instead of the global rail.
  - Do not remove any subview — only relocate its entry point.

- **Sprint 4 — Verification & close-out (Phase 3, mechanical + audit).**
  - Audit all remaining visible labels and breadcrumbs for leftover vendor-echoing wording
    beyond the doc §6 table; fix any found.
  - Confirm the helpdesk and AI-agent surfaces still feel coherent inside the new shell.
  - Confirm: no route ids changed unless unavoidable (call out any exceptions explicitly), no
    feature surfaces removed, page + all active JS files still serve 200, no JS syntax errors
    (`node --check` on edited files).
  - Mark all checkboxes below done, write a final summary at the bottom of this file (not a new
    file).

## Sprint status

- [x] Sprint 1 — IA decision + shell foundation
- [x] Sprint 2 — Nav bucket rebuild + relabeling
- [x] Sprint 3 — Page-local sub-navigation
- [x] Sprint 4 — Verification & close-out

## Constraints (from `NAVIGATION_RESTRUCTURE.md`, binding for every sprint)

- Do not change route ids unless absolutely necessary (and if you must, call it out loudly in
  your sprint notes).
- Do not remove any feature surfaces.
- Do not reintroduce vendor-specific product wording in visible UI copy.
- Do not let the shell become a dense catalog — fewer persistent cues, not more.
- No vendor names anywhere in UI copy (pre-existing project rule, unrelated to this restructure
  but keep it intact).
- This is a re-architecture of navigation, not a re-skin — do not touch the color/theme system
  from `RESTYLE_PROGRESS.md` except where a nav change incidentally requires it (e.g. new
  buckets need an accent).

## Notes

### Sprint 1 Implementation Notes

**IA taxonomy decision (binding for Sprints 2–4):**

`NAVIGATION_RESTRUCTURE.md` proposes three not-quite-matching bucket lists:
§3 "Reorganize around jobs" (8 buckets: Triage/Investigate/Hunt/Detect/Respond/
Protect/Audit/Admin), "Suggested Shell Model → Global nav" (6 buckets:
Investigate/Detect/Respond/Protect/Admin/Learning), and the "Route Mapping
Strategy" worked example (6 buckets: Investigate/Search & Detect/Respond/
Protect/Admin/Assist — the only one of the three that actually assigns every
portal, including `identity`/`workspace`/`helpdesk` → Admin and `ai-agent` →
Assist). Notably, the worked example never mentions `governance/*` at all —
a real gap, not just a naming mismatch.

**Canonical decision: 7 buckets — `Investigate`, `Detect`, `Respond`, `Protect`,
`Audit`, `Admin`, `Assist`.**

Reasoning:
- Kept the worked example's most concrete, fully-populated mapping as the base
  (`Admin` = identity + workspace + helpdesk, `Assist` = ai-agent — this is the
  only one of the three source lists that actually places every portal).
  Simplified "Search & Detect" to `Detect` (Global nav's shorter wording; the
  hunting/search/analytics routes it groups are cohesive as one bucket, so a
  separate `Hunt` bucket per §3 would just split one job into two labels).
  Dropped `Triage` (§3) as a distinct bucket — case triage is the front door of
  `Investigate`, not a separate job area with its own routes.
  Dropped `Learning` (Global nav) — no routes in the spec doc or the live NAV
  data are assigned to it, and `helpdesk` (its likely intended occupant) already
  has an explicit, concrete home in the worked example's `Admin` bucket.
- **Plugged the governance gap** by reusing §3's `Audit` bucket, which the two
  6-bucket lists don't have at all: `governance/*` (DLP, insider risk, audit,
  eDiscovery, records/lifecycle) → `Audit`. This was the one real "drop" across
  all three source lists and is now explicitly covered.
- The doc's home-hub framing (§1: `Investigate`/`Govern`/`Operate` as "the
  top-level mental model") is a *different, coarser* taxonomy than its own
  Global-nav/route-mapping sections and was **not** adopted — running two
  different top-level vocabularies in the same shell (a 3-way split on the home
  screen, a 7-way split in the rail) would recreate exactly the kind of
  incoherent hierarchy the restructure is trying to remove. The 7-bucket list
  above is now the single taxonomy used everywhere (Home hub in this sprint;
  left-rail `NAV` regrouping in Sprint 2).

Portal → bucket mapping used for the Home hub (portal-level, one bucket per
workload — this is *not* the final per-route mapping, see below):

| Portal | Bucket | Why |
|---|---|---|
| `xdr` | Investigate | incidents/alerts/cases/exposure — its dominant, front-door surface |
| `siem` | Detect | search/hunting/analytics-authoring is its dominant surface |
| `cloud` | Protect | posture/compliance/attack-path |
| `governance` | Audit | DLP/insider risk/audit/eDiscovery — see gap-fix above |
| `identity` | Admin | matches the doc's own worked example |
| `workspace` | Admin | matches the doc's own worked example |
| `helpdesk` | Admin | matches the doc's own worked example |
| `ai-agent` | Assist | standalone AI surface, not a "job" bucket |

Zero drops: all 8 `PORTALS` ids (7 static + the `helpdesk` one `helpdesk.js`
pushes at runtime) land in exactly one bucket. `Respond` has no portal
anchored to it at this portal-level mapping — that's expected and correct: its
routes (`xdr/action-center`, `xdr/air`, `siem/automation`) are sub-surfaces of
`xdr`/`siem` today and will get real top-level presence once **Sprint 2**
regroups `NAV` at the route level instead of the portal level (e.g.
`xdr/action-center` + `xdr/air` + `siem/automation` → `Respond`, even though
the `xdr`/`siem` portals themselves are anchored in `Investigate`/`Detect`
above). Confirmed feasible by reading the full `NAV.xdr`/`NAV.siem`/
`NAV.cloud`/`NAV.governance`/`NAV.identity` arrays in `data.js` — every route
family present has an obvious home in one of the 7 buckets.

**What changed, file by file:**

- **`index.html`**
  - Removed `.portal-tabs` (the 3 static `data-portal="xdr"|"cloud"|"admin"`
    buttons) and `#workload-strip` (confirmed dead markup, zero JS refs — see
    "workload-strip" decision below).
  - Added `#btn-home-hub` (topbar-left, before the waffle button) and a new
    `#panel-home-hub` drawer (`.sidepanel.left`, same pattern as the existing
    waffle's `#panel-switcher`), body populated by the new `renderHomeHub()`.
    This is the single home-hub entry point replacing `.portal-tabs`.
  - Renamed the waffle's visible copy only (§5 reframe): button
    title/aria-label `"App switcher"` → `"Labs switcher"`, panel header
    `"Hack Smarter SOC training portals"` → `"Labs"`. No markup/behavior
    change — same `#panel-switcher`/`#switcher-grid`, same tiles, same
    `onclick="navigate(...)"` wiring, same dim/decorative tiles.
- **`app.js`**
  - `render()`: `#pane-azure` is now unconditionally hidden
    (`azurePane.hidden = true`) and the shell always gets the `.no-azure` class
    (the layout rule that already existed for `workspace`'s single-pane mode,
    now applied to every workload) — it's no longer shown for any workload.
    Removed the `renderAzurePane(wl)` call and the `singlePanePortal` branch
    that used to conditionally show/hide it. `governance`'s existing
    `clean-portal` mode (hides both panes) is untouched and still wins when
    both classes are present (later CSS rule, same specificity).
  - Removed `renderPortalTabs(wl)` call. Removed the now-dead
    `PORTAL_CONTEXT_HOME`, `renderPortalTabs()`, `switchPortalContext()`, and
    `window.switchPortalContext` — nothing else referenced them (grepped all
    `.js`/`.html` first). **Kept `PORTAL_CONTEXT` itself** (now otherwise
    unused) because `helpdesk.js:30` does `PORTAL_CONTEXT.helpdesk = 'admin'`
    as a top-level statement at script-load time — deleting the object would
    make that line throw a `ReferenceError`, which would abort the rest of
    `helpdesk.js` (all its `NAV`/route registrations) on every page load.
    Left a comment on it explaining this so nobody deletes it in Sprint 2/3
    without also fixing `helpdesk.js`.
  - Added the taxonomy as data: `TASK_BUCKETS` (the 7 canonical buckets, in
    order), `PORTAL_BUCKET` (portal → bucket, per the table above),
    `PORTAL_HOME_ROUTE` (portal → landing route, keyed by `PORTALS` id rather
    than by `CLOUD_NAV`'s display-name strings, so the Home hub doesn't inherit
    the existing "two lists must stay in sync" fragility already noted for
    `CLOUD_NAV`/`CLOUD_APP_ROUTE`/`PORTALS`), and `PORTAL_ICON` (reuses emoji
    already used elsewhere in the app for the same workload — no new imagery).
  - Added `renderHomeHub()`: renders `#home-hub-body` as one `.pane-title` +
    `.switcher-grid` block per non-empty bucket (reusing the waffle's existing
    `.switcher-tile`/`.switcher-icon`/`.switcher-label` CSS classes — no new
    tile styling needed). Wired to `#btn-home-hub` in the `DOMContentLoaded`
    handler (`renderHomeHub(); showPanel('panel-home-hub');`, mirroring the
    existing waffle wiring) and called once at load like `renderSwitcher()`.
    Tiles `navigate()` to `PORTAL_HOME_ROUTE[id]` then `hidePanels()`, same
    pattern as the waffle. The existing generic `[data-close]` handler already
    covers the new panel's close button (no extra JS needed).
  - Left `renderAzurePane()`, `CLOUD_HIGHLIGHT`, `CLOUD_NAV`, `CLOUD_APP_ROUTE`
    all defined and untouched (still used by `renderSwitcher()` for the
    waffle, and `CLOUD_HIGHLIGHT`/`CLOUD_APP_ROUTE` are also mutated by
    `helpdesk.js`). `renderAzurePane()` is now uncalled dead code — left in
    place rather than deleted in case Sprint 2/3 wants to repurpose its
    per-workload cross-link logic for a contextual in-page subnav; flagging
    for whichever sprint finishes touching page-local subnav to decide whether
    to actually delete it then.
- **`styles.css`**
  - Added `.hub-section`/`.hub-section:first-child`/`.hub-section .pane-title`
    (layout-only spacing between bucket groups in the Home hub — no new
    colors, reuses `var()`-free plain px spacing consistent with the rest of
    the file).
  - **Bug found and fixed, caused by the `#pane-azure` change above:**
    `body.route-xdr-hunting .shell` (both the base rule and its
    `@media (max-width: 1100px)` variant) hardcoded a 3-column
    `grid-template-columns` (`56px 220px minmax(0,1fr)`) assuming `#pane-azure`
    always survives on that route as a 56px icon rail. With `#pane-azure`
    permanently hidden, that 3rd column had no grid item to fill it and the
    real content would have rendered squeezed into the wrong (too-narrow)
    columns with a large empty gutter on the right. Fixed both rules to a
    2-column `220px minmax(0, 1fr)` / `minmax(180px, 220px) minmax(0, 1fr)`,
    dropping only the now-nonexistent azure column and leaving the hunting
    page's own blade-width intent unchanged. This is the one non-cosmetic
    layout fix beyond the nav/shell work itself — called out explicitly since
    it touches CSS beyond the minimum literal ask, but it was made necessary
    by the `#pane-azure` change and left the app in a functional state that
    a check-only Sprint 1 would otherwise have shipped broken.
  - Everything else `#pane-azure`/`.portal-tab`/`.workload-strip`-related in
    `styles.css` (the base rules, the `:has(#pane-azure.collapsed)` selectors,
    the other `body.route-xdr-hunting .pane-azure *` child rules) is now dead
    CSS (nothing left in the DOM matches `.portal-tab`; `#pane-azure` still
    exists in the DOM but is always `hidden`, so rules that only style its
    children are inert, not broken). Left alone deliberately — none of it sets
    `display` on `.pane-azure`/`#pane-azure` itself, so nothing fights the
    `hidden` attribute, and removing unused CSS wasn't asked for and adds risk
    for no behavior change.

**`#pane-azure` collapse — which pattern was chosen and why:**

The spec (§2) offered three options: contextual in-page subnav, a drawer
opened on demand, or a command-palette jump surface. `#pane-azure`'s actual
content (per the shell-anatomy notes) is the same `CLOUD_NAV` list the waffle
switcher already renders — it was a second, always-visible copy of the
waffle's data, not a unique feature. Rather than build a fourth mechanism,
Sprint 1 folds its job into the **two on-demand drawers that already/now
cover the same cross-workload jump**: the pre-existing waffle
(`#panel-switcher`, reframed in copy per §5 below) and the new Home hub
(`#panel-home-hub`, taxonomy-grouped). Both are strictly "opened on demand"
per the spec's own second option. No content or route was lost — every
`CLOUD_NAV`/`CLOUD_APP_ROUTE` destination `#pane-azure` used to show is still
one click away via either drawer.

**`#workload-strip` — decision: deleted.**

Confirmed dead markup (zero JS references anywhere, per the shell-anatomy
notes, reconfirmed by grep before deleting). Re-wiring it into the new shell
as a persistent strip would have added a second always-visible chrome element
right where `.portal-tabs` used to sit — directly against the "fewer
persistent cues, not more" constraint. Deleted instead; its old 2px accent
purpose (if ever finished) is superseded by the existing `body.className =
'wl-' + wl` accent-color hook, which already colors things per workload
without a dedicated strip.

**Waffle reframe (§5) — scope kept deliberately narrow:**

Only visible copy changed (button title/aria-label, panel header text) per
the "keep it functional, don't break the only working nav path" instruction —
`#switcher-grid`'s tile markup, `CLOUD_NAV`/`CLOUD_APP_ROUTE` data, and the
`renderSwitcher()` function are byte-for-byte unchanged. The waffle remains a
flat, all-tiles view (including the decorative dim tiles with no route) — a
deliberately different flavor from the Home hub's taxonomy-grouped, only-real-
workloads view, not a duplicate of it.

**Verification performed:**

- `curl http://127.0.0.1:8777/`, `/index.html`, `/app.js`, `/styles.css` all
  return `200`.
- `node --check` clean on every `.js` file in the active file list (`app.js`,
  `data.js`, `views.js`, `helpdesk.js`, `helpdesk-data.js`, `kql-editor.js`,
  `guided-hunting.js`, `lab-widgets.js`, `workflow-automation.js`,
  `neutral-terminology.js`, `storage-keys.js`).
- Grepped the whole tree for `switchPortalContext`/`PORTAL_CONTEXT_HOME`/
  `renderPortalTabs`/`.portal-tab`/`#workload-strip` after deleting them —
  zero remaining references anywhere.
- Traced all 8 workloads' landing `VIEWS[...]` entries exist
  (`xdr/home`, `siem/home`, `cloud/overview`, `governance/home`,
  `ai-agent/home`, `identity/overview`, `workspace/home`,
  `helpdesk/dashboard` — confirmed present in `views.js`/`helpdesk.js`) and
  that `PORTAL_HOME_ROUTE` points at exactly those routes, so every Home hub
  tile resolves to a real, registered view.
- Traced reachability paths for all 8 beyond the Home hub, to confirm nothing
  regressed: the waffle (`#panel-switcher`) still reaches 7 of 8 unchanged
  (all but `ai-agent`, matching its pre-Sprint-1 behavior exactly — untouched
  `CLOUD_APP_ROUTE`); `ai-agent` is separately reachable, unaffected by this
  sprint, via the always-present `#btn-copilot` topbar button → "Open
  standalone session" → `openCopilotSession()` → `navigate('#/ai-agent/session')`
  (this path predates Sprint 1 and was not touched — worth noting since the
  shell-anatomy notes' claim that the waffle is "the only reliable entry
  point" into `ai-agent` undersells this existing path slightly).
  Once in any workload, `#pane-blade`/`#sidenav` (untouched by this sprint)
  reaches every route registered in that workload's `NAV[...]` array as
  before.
- No route ids were changed. No feature surfaces were removed (every prior
  destination is still reachable, just via a different entry point for the
  3 that used to go through `.portal-tabs`). No vendor wording introduced —
  new visible copy is limited to "Home", "Labs", and the 7 bucket labels
  (Investigate/Detect/Respond/Protect/Audit/Admin/Assist), none of which
  trip `neutral-terminology.js`'s replacement patterns (checked by reading
  the full pattern list — none match this wording). Theme/color system
  untouched except the one incidental CSS fix above, which changes column
  widths only, not colors.

**Flagged for Sprint 2:**

- Sprint 2's "rebuild `NAV`/left-rail grouping around the canonical buckets"
  is a route-level exercise, distinct from this sprint's portal-level
  `PORTAL_BUCKET` map. Use the reasoning table above as the starting point,
  but expect to split `xdr` and `siem` routes across multiple buckets (see
  the `Respond` note above).
- The Home hub currently shows one tile per workload (8 tiles total, grouped
  into 6 populated buckets — `Respond` renders no section since no portal is
  anchored there at the portal level). Once Sprint 2 does the route-level
  regroup, consider whether the Home hub should show route-level entries
  (e.g. a "Response queue" tile under `Respond`) rather than just portal
  landing pages — left as Sprint 2's call since it depends on how granular
  the rebuilt `NAV` ends up being.
- `renderAzurePane()` (`app.js`) is now dead code (uncalled). Left in place
  this sprint (see reasoning above); Sprint 3 (page-local subnav) is the
  natural point to either repurpose or delete it.
- The progress doc's shell-anatomy note that "`helpdesk` is entirely absent
  from `PORTAL_CONTEXT`" doesn't match what's in `helpdesk.js:30`
  (`PORTAL_CONTEXT.helpdesk = 'admin';`, which does add it, since `const` only
  blocks rebinding, not mutation) — doesn't affect anything since
  `PORTAL_CONTEXT` is now dead/unused regardless, just noting the discrepancy
  in case it matters for anyone re-reading the older notes.

### Sprint 2 Implementation Notes

**Mechanism chosen: an explicit `route -> bucket` override map (`ROUTE_BUCKET`,
`app.js`), layered on top of the untouched per-portal `NAV` arrays, plus a
`buildNavBuckets()` builder that flattens/dedupes into the 7 buckets on
demand.** The brief offered two options — rewrite `NAV` itself into a
bucket-keyed structure, or layer a route→bucket map on the existing arrays —
and asked for whichever is less invasive. `NAV` turned out to be read by two
other things besides the sidenav: `buildSearchIndex()` (the command-palette
jump surface, `app.js`) and `registerSecondaryNavViews()` (auto-generates a
fallback `VIEWS[route]` — with an `<h1>`/breadcrumb taken directly from the
NAV entry's `label` — for any route that doesn't have a hand-built view,
`views.js`). Replacing `NAV`'s shape would have forced changes to both.
Leaving `NAV` alone and adding a derived map meant neither needed to change,
and both automatically picked up the §6 label renames for free since those
were edited at the source (`data.js`), not via a separate override table.

`ROUTE_BUCKET` only lists the 59 `xdr`- and `siem`-owned routes (see below for
why exactly those two). Every other portal (`cloud`, `governance`, `ai-agent`,
`identity`, `workspace`, `helpdesk`) is a single-bucket portal per the spec
doc's own worked example (`#/identity/*, #/workspace/*, #/helpdesk/* ->
Admin`; `#/cloud/* -> Protect`), so those routes fall through to Sprint 1's
existing `PORTAL_BUCKET` map in `buildNavBuckets()` — no need to enumerate 62
more routes whose bucket already equals their portal's default. This also
means `helpdesk`'s bucket coverage needed zero new code: `PORTAL_BUCKET.helpdesk
= 'admin'` already existed from Sprint 1, and the runtime-load-order problem
(`helpdesk.js` adds `NAV.helpdesk` *after* `app.js` runs) is sidestepped
entirely by not caching the bucket structure at load time — `buildNavBuckets()`
re-derives it from live `NAV`/`ROUTE_BUCKET`/`PORTAL_BUCKET` on every call
(cheap: ~120 array entries), so it's always correct regardless of what has
loaded by the time it's called.

**Dedup rule.** `NAV.xdr` embeds a "SIEM & SOAR" section that cross-links 16
`siem` routes under xdr-flavored (sometimes differently-worded) labels, and a
`System`-section entry that cross-links `#/siem/settings`. The bucket rail
must show each route exactly once, so `buildNavBuckets()` does two passes:
pass 1 walks `PORTALS` in order and keeps only each route's entry from its
*owning* array (the array whose key matches the route's own path segment —
e.g. `#/siem/home`'s canonical label comes from `NAV.siem`, not `NAV.xdr`'s
cross-link copy); pass 2 is a safety net that would pick up any route that
hypothetically only ever appears as a foreign copy, so nothing silently drops
even if that assumption is ever wrong. This also incidentally fixed a
pre-existing label mismatch: `NAV.xdr`'s cross-link labeled `#/siem/settings`
as "SIEM & SOAR" while `NAV.siem`'s own entry called it "Settings" — the
bucket rail (and the Home hub) now shows the owning array's "Settings", which
is the more accurate name for that page.

**Route → bucket mapping — full reasoning, not just the obvious cases.**

Every `cloud/*`, `governance/*`, `ai-agent/*`, `identity/*`, `workspace/*`,
`helpdesk/*` route was bucketed *wholesale* per its portal's `PORTAL_BUCKET`
default (Protect / Audit / Assist / Admin / Admin / Admin respectively) — this
is a direct, literal reading of the doc's own "Route Mapping Strategy" worked
example (`#/cloud/* -> Protect`, `#/identity/*, #/workspace/*, #/helpdesk/* ->
Admin`), not a judgment call. The only two portals whose routes actually
needed per-route splitting were `xdr` (31 owned routes) and `siem` (28 owned
routes), matching exactly what Sprint 1 flagged as the open question.

`xdr` split four ways:
- **Investigate** (14 routes): `home`, `incidents`, `alerts`, `cases`,
  `alert-tuning`, `threat-analytics`, `intel-explorer`, `devices`,
  `identities`, `identity-protection`, `email-collab`, `threat-explorer`,
  `cloud-apps`, `suppression`. Non-obvious ones: `identity-protection` (now
  "Identity risk") went to Investigate rather than Protect/Admin because it's
  a risk-signal surface an analyst pivots to *during* investigation (it
  matches the spec's own "risky identities" Home-section bullet, which sits
  alongside "current cases"/"active hunts" — all Investigate-flavored, not
  Protect-flavored). `suppression` (Suppression rules) went with Investigate
  rather than Protect because it's alert-queue hygiene tightly coupled to the
  Alerts/Signals workflow, not a preventive control.
- **Detect** (3 routes): `hunting` ("Advanced hunting"), `custom-detections`,
  `hunting-graph`. These do the same job as `siem`'s hunting/search/analytics
  surface (Sprint 1's stated reason `siem` itself anchors in Detect), so xdr's
  own hunting routes follow the same logic rather than staying with
  Investigate just because they live in the `xdr` path namespace.
- **Respond** (2 routes): `action-center` (now "Response queue"), `air`. Named
  explicitly in the spec doc's own route-mapping example.
- **Protect** (6 routes): `exposure`, `secure-score` (now "Exposure score"),
  `vulnerabilities`, `endpoints`, `asr-policy`, `device-discovery`. These are
  posture/prevention surfaces (exposure management, vuln management, ASR
  policy authoring) — proactive hardening, not case work — even though they
  live under the `xdr` route namespace.
- **Admin** (6 routes): `reports`, `learning-hub`, `trials`, `settings`,
  `notifications`, `mto`. Secondary/config/reporting pages with no natural
  task-bucket home of their own; `learning-hub` in particular is where the
  spec's dropped `Learning` bucket (from Sprint 1's taxonomy reconciliation)
  effectively lands — Admin was the closest fit rather than resurrecting a
  bucket the canonical 7-list deliberately excluded.

`siem` split three ways:
- **Detect** (21 routes): the bulk of the portal — `home`, `logs`, `search`,
  `graph`, `workbooks`, `hunting` (now "Search & explore"), the three ASIM
  hunting sub-routes, `anomalies`, `soc-optimization`, `summary-rules`,
  `data-lake-jobs`, `notebooks`, `entity-behavior`, `mitre`, `content-hub`,
  `repositories`, `data-connectors`, `analytics`, `watchlist`. `content-hub`/
  `repositories` went to Detect rather than Admin because they're
  detection-content (analytic rule pack) management, not tenant admin.
- **Respond** (1 route): `automation`. Named explicitly in the spec's route
  mapping example.
- **Investigate** (2 routes): `incidents` (now "Case queue" — `siem` has its
  own separate incident queue from `xdr`'s, and both get the same renamed
  label since they're the same *kind* of page, just two different route ids)
  and `threat-intel` ("Threat intelligence" — intel research consumed during
  case work, same reasoning as xdr's `intel-explorer`).
- **Admin** (4 routes): `news`, `community`, `workspace-manager`, `settings`
  — informational/config pages with no task-bucket home.

**Verification: per-portal before/after route-count reconciliation (not just
eyeballed).** Loaded `data.js`+`app.js`+`views.js`+`helpdesk.js` in a Node `vm`
context (stubbed `document`/`localStorage`/etc., no real DOM) and called
`buildNavBuckets()` directly. Result: **121 total routes in the new bucket
structure, 121 unique, 0 duplicates** — exactly the expected distinct-route
universe (104 across the `data.js` `NAV` object + 17 from `helpdesk.js`'s
runtime-added `NAV.helpdesk`). Per-portal reconciliation (old "owned" count —
i.e. excluding foreign cross-link copies — vs. new bucket count) matched
exactly for all 8 portals: `xdr` 31/31, `siem` 28/28, `cloud` 14/14,
`governance` 13/13, `ai-agent` 6/6, `identity` 4/4, `workspace` 8/8, `helpdesk`
17/17. Per-bucket populations: Investigate 16, Detect 24, Respond 3, Protect
20, Audit 13, Admin 39, Assist 6 (all sum to 121). `Respond` — empty at the
Home hub in Sprint 1 — now has 3 real routes in both the rail and the hub.
Also called `render()` for a spot-check across all 8 workloads plus
`#/xdr/action-center` and `toggleNavBucket('respond')` in the same harness —
zero exceptions.

**Rail rendering — global, not per-workload; collapsed-by-default except the
active bucket.** `renderSidenav()` now takes just `activeHash` (dropped the
`wl` parameter — content no longer depends on which portal you're in) and
renders all 7 `TASK_BUCKETS` in fixed order, skipping any bucket with zero
routes (none currently qualify, since all 7 buckets already have real
content, but this keeps the render defensive against future data changes).
Each bucket is a collapsible header (reusing the existing `.navsection` /
`.navsection-toggle` / `.navcaret` CSS/markup verbatim) with its routes
flattened directly underneath as plain `.navitem` leaves — no third,
portal-named subsection tier, since that would just reintroduce per-portal
grouping as a second visible hierarchy under a different name (the hard
constraint against that). Collapse state moved from the old
`(workload, section-name)` localStorage keys to bucket-id-only keys
(`hsl.nav.bucket.<id>`, `navBucketExpanded`/`setNavBucketExpanded` in `app.js`)
since a bucket's collapsed/expanded state is now a global rail property, not
a per-workload one. Only the bucket containing the *current* route
auto-expands by default (computed fresh via `ROUTE_BUCKET[activeHash]` on
every render, not cached) — every other bucket defaults to collapsed, so
day-to-day visual density looks like the old per-portal rail (roughly one
bucket's worth of items visible) even though the full 121-route set now
technically lives in the DOM at all times. Once a user manually toggles a
bucket, that explicit preference persists across navigation and overrides the
"auto-expand the current one" default. The old `subKey`/`navSectionKey`/
`navSectionExpanded`/`setNavSectionExpanded`/`toggleNavSection` helpers were
removed outright (not left as dead code) since they were single-purpose and
fully superseded; `window.toggleNavSection` was swapped for
`window.toggleNavBucket` in the same spot. `#blade-title` no longer shows
`portal.name` (`render()` in `app.js`, plus the matching static placeholder in
`index.html`) — it now reads the constant "Navigation", since a global,
all-buckets rail mislabeled with just the current portal's name would be
actively wrong, not merely stale.

**Home hub (Sprint 1's `renderHomeHub()`) — rebuilt to show real route-level
tiles per bucket, not one portal-landing tile per bucket.** Reuses the same
`buildNavBuckets()` the rail uses, so the two are guaranteed to agree. Each
bucket section shows up to `HOME_HUB_CAP` (8) route tiles plus, if the bucket
has more, a trailing "+N more in <Bucket>" tile that jumps to the bucket's
first route and (via the now-expanded-because-current-bucket rail logic)
puts every remaining entry in that bucket one click away. This keeps `Admin`
(39 routes — by far the largest, since it aggregates `identity` + `workspace`
+ `helpdesk` + several misc `xdr`/`siem` config pages) from turning the hub
into a wall of tiles, while `Respond` (3 routes) and `Assist` (6 routes) show
in full. `PORTAL_HOME_ROUTE`/`PORTAL_ICON` (Sprint 1) are no longer read by
`renderHomeHub()` — left defined with a comment explaining why, same
treatment Sprint 1 gave `renderAzurePane()` after *it* went uncalled, rather
than deleted outright. Confirmed via the same Node harness that the Home
hub's `Respond` section actually renders "Response queue" and "AIR center"
tiles (spot-checked the generated HTML string directly, not just "no
exception").

**§6 label renames — scope boundary applied, and why.** Renamed the label at
its source everywhere it's a *navigation-facing* string: the `NAV` entry
itself (`data.js`, including duplicate/cross-link copies of the same route so
`buildSearchIndex()` and `registerSecondaryNavViews()`'s auto-generated
fallback headers stay consistent too), the corresponding hand-built
`VIEWS[route]`'s own `<h1>`/breadcrumb (`views.js`), and any other page's
button/card-title/table-header/tab-label/toast that is itself naming that
same destination as a shortcut or cross-reference (e.g. the `identity/overview`
dashboard's "Open Identity risk" button, the `workspace/admin-centers`
solution-card blurb, `SIGNIN_DETAIL_TABS`' `ca` tab, the notification-rule
trigger text and its matching `<option>`). Deliberately did **not** touch
fixture/scenario *data* that happens to reuse the same words for a different,
narrative purpose: `SEED_ALERTS` alert titles/summaries/`detectionSource`
values, `ATTACK_STORIES` graph-node labels and remediation prose, and
`ENTRA_RECOMMENDATIONS` titles/details. Reasoning: the doc's §6 table is about
*navigation labels* specifically ("Rename visible navigation labels to
neutral task language... the routes can stay the same; the labels do the
work"), not license to rewrite simulated telemetry/incident-narrative
wording, which is deliberate pedagogical content outside this sprint's remit
— Sprint 4's broader "audit all remaining labels" pass is the more
appropriate place to revisit that boundary if it needs to move. Also left
`PORTALS[].tag` for `identity` (still says "Conditional Access, Identity
Protection") untouched after confirming by grep that `.tag` is not rendered
anywhere in current code (dead metadata) — not a visible occurrence.

One **grammar-driven exception** to literal find-replace: `identity/conditional-access`'s
drawer breadcrumb read "Edit Conditional Access policy" / "New Conditional
Access policy" — a literal `Conditional Access -> Access policy` substitution
would have produced the doubled "Edit Access policy policy". Rewrote the
whole phrase to "Edit access policy" / "New access policy" instead.

**One naming collision worth flagging, not fixing this sprint:** renaming
`Secure score -> Exposure score` (applied comprehensively — this one is a
named feature reused as a KPI across `xdr/home`, `xdr/secure-score`,
`cloud/overview`, `identity/overview`, and the `xdr/reports`/`xdr/exposure`
secondary surfaces, so it got the full treatment rather than the narrower
"just the nav label + its own page" pattern) now sits alongside an
**already-existing, unrelated** "Exposure score" metric in the vulnerability-
management view (`views.js:3391`, `tvm.exposureScore`, and `views.js:10340`'s
"Exposure score trend") that predates this sprint. Two different underlying
numbers now share one label in different parts of the app. This was an
unavoidable consequence of the doc's own explicit rename instruction, not a
mistake, but it's a real terminology collision Sprint 4's audit should be
aware of.

**`Workspace Admin -> Tenant operations`** required touching three places
that all key off the same literal string simultaneously (`PORTALS[].name`,
`CLOUD_NAV`'s tile `label`, and `CLOUD_APP_ROUTE`'s dictionary key + matching
`CLOUD_HIGHLIGHT.workspace` value) since `renderSwitcher()` joins them by
exact string equality (`CLOUD_APP_ROUTE[item.label]`, `item.label ===
currentLabel`) — a fragility Sprint 1 had already flagged between `CLOUD_NAV`/
`CLOUD_APP_ROUTE`/`PORTALS`. Also updated `neutral-terminology.js`'s two
replacement rules that target `'Workspace Admin'` as their *output* (for
`Microsoft 365 admin center`/`365 Admin` source text) to target `'Tenant
operations'` instead — otherwise the terminology layer's live `MutationObserver`
would have kept re-inserting the old label into the DOM wherever those source
phrases still appear (e.g. `workspace/*`'s `m365AdminHeader()` breadcrumb
root, which literally reads `365 admin center` in source and gets
live-neutralized).

**Verification performed (full list):**
- `node --check` clean on every edited file (`data.js`, `app.js`, `views.js`,
  `neutral-terminology.js`, `index.html` n/a) plus every other active `.js`
  file (`helpdesk.js`, `helpdesk-data.js`, `kql-editor.js`,
  `guided-hunting.js`, `lab-widgets.js`, `workflow-automation.js`,
  `storage-keys.js`) — all clean.
- `curl` 200 on `/`, `/app.js`, `/data.js`, `/views.js`.
- Grepped the whole tree for each of the 9 old label strings (plus
  case-variant sweeps for "Secure score"/"Identity Protection"/"Conditional
  Access") after editing; every remaining hit is one of: a route id string
  that must stay (`#/xdr/secure-score`), a code comment (not visible), or
  fixture/narrative data content deliberately out of scope (see above) — all
  enumerated by file:line in this note's "scope boundary" section rather than
  left implicit.
- Built `NAV`/`ROUTE_BUCKET`/`PORTAL_BUCKET`/`buildNavBuckets()` in a headless
  Node `vm` harness (stubbed DOM) to get exact, programmatic route counts
  rather than eyeballing: 121 total/unique/0-dupes, per-portal old-vs-new
  counts reconciled exactly for all 8 portals (see table above).
- Called `render()` across all 8 workloads' home routes plus
  `#/xdr/action-center`, `renderHomeHub()` after each, and
  `toggleNavBucket('respond')`, in the same harness — zero exceptions.
  Confirmed by string-inspecting the generated HTML that `Respond` renders
  real tiles ("Response queue", "AIR center") in both the rail and the hub,
  not just that bucket iteration didn't throw.
- Confirmed no leftover references anywhere to the removed
  `toggleNavSection`/`navSectionExpanded`/`setNavSectionExpanded`/
  `navSectionKey`/`subKey` helpers.

**No route ids were changed.** No feature surfaces were removed — every route
reachable via the old per-portal rail is reachable via the new bucket rail
(programmatically verified, not assumed). No vendor-specific product wording
was introduced; new visible copy is limited to the 7 bucket labels (already
introduced by Sprint 1) plus the §6 rename target strings themselves (`Case
queue`, `Signals`, `Search & explore`, `Mail investigation`, `Response queue`,
`Exposure score`, `Identity risk`, `Access policy`, `Tenant operations`),
`Navigation` (the new blade-title), and the Home hub's "+N more in <Bucket>"
affordance — none of these trip `neutral-terminology.js`'s replacement
patterns (checked by reading the full pattern list).

**Flagged for Sprint 3:**
- `renderAzurePane()` (`app.js`) is still uncalled dead code, now doubly so
  (Sprint 1 left it for a possible contextual-subnav repurpose; Sprint 2 also
  didn't need it). Sprint 3 (page-local subnav) remains the natural point to
  either repurpose or delete it.
- The "Secure score" / vulnerability-management "Exposure score" naming
  collision above — not a regression this sprint introduced by mistake, but
  worth a look if Sprint 3/4 touches either surface.
- `Admin` is now the largest bucket by a wide margin (39 routes — identity +
  workspace + helpdesk + assorted `xdr`/`siem` config/reporting pages). It's
  still a flat list (no sub-grouping, per the "don't reintroduce per-portal
  hierarchy" constraint) with collapse-by-default keeping it out of the way
  until opened. If page-local subnav work in Sprint 3 changes how deep any of
  those pages' own content is exposed, it's worth re-checking whether `Admin`
  still feels navigable at 39 flat entries or would benefit from a
  non-portal-flavored grouping (e.g. "Directory & access" vs. "Tenant
  config" vs. "Support tools") — left as Sprint 3/4's call since it's a
  judgment question about in-page navigation depth, not a route-mapping
  defect.
- `PORTAL_HOME_ROUTE`/`PORTAL_ICON` (Sprint 1) are now fully unused dead data
  (see above) — low-risk to delete whenever a later sprint is already editing
  that area, not urgent enough to justify a standalone edit this sprint.

### Sprint 3 Implementation Notes

**Search for genuine subview candidates — method and result.** Grepped every
`.js` file for 3-segment route literals (`'#/x/y/z'`) as the most literal
reading of the doc §4 pattern ("a route whose path is a deeper segment of a
sibling route's path") — this is exhaustive, not a sample, since every route
string in the app is a literal `'#/...'` token somewhere in `data.js`,
`views.js`, or `helpdesk.js`. Exactly one family matched anywhere in the
121-route universe: `#/siem/hunting/dns`, `#/siem/hunting/authentication`,
`#/siem/hunting/network-session` — the doc's own worked example. Cross-checked
by grouping every `VIEWS['route'] = () => helperFn(...)` call by shared
`helperFn` (a Python one-liner over `views.js`) to catch same-shape siblings
that *don't* share a path prefix: the only other multi-route group was
`renderSecondarySurface` (`xdr/reports`, `xdr/learning-hub`, `xdr/trials`,
`siem/news`, `siem/repositories`, `siem/community`, `cloud/community`,
`cloud/workbooks`, `cloud/diagnose`) — a shared "simple placeholder page"
factory, not siblings of each other (different portals, different jobs); not
a subview family. Also confirmed the codebase already has a working
precedent for "detail/drill-in page kept out of NAV entirely" that this
sprint didn't need to touch: `xdr/device`, `xdr/incident`, `xdr/identity`,
`xdr/discovered-device`, `helpdesk/ticket` (singular object-detail routes)
and `xdr/email-collab/threat-explorer/campaigns` / `governance/ai-hub`
(deeper drill-in pages) are all registered `VIEWS[...]` but were never in
`NAV`/the rail to begin with — they're reached only by in-page links from a
parent list, exactly the pattern doc §4 asks for, already in place before
this sprint. **Conclusion: one genuine subview family (the 3 ASIM routes),
relocated below. Everything else in the 121-route set is either already
page-local (the drill-ins above) or a real independent top-level task** (e.g.
`xdr/hunting` / `xdr/custom-detections` / `xdr/hunting-graph` are three
different jobs — ad hoc queries, rule authoring, graph visualization — not
three modes of one page, so they were left alone; `helpdesk`'s 17 routes are
17 genuinely separate support tools, not subviews of each other).

**Relocation mechanism — filtered at the render layer, not removed from
`NAV`/`buildNavBuckets()`.** This was the key design decision, driven by the
brief's own verification requirement: `buildNavBuckets()` must still report
121 total/unique/0-dupes (the same reconciliation Sprint 2 ran), because
demoting a route's *entry point* must not shrink the distinct-route universe
that function represents. So `NAV.siem`'s 3 ASIM entries were left exactly as
they were in `data.js` (untouched — `buildNavBuckets()` still walks them and
counts them), and a new `PAGE_LOCAL_ROUTES` `Set` (`app.js`) lists the 3
routes to hide. `renderSidenav()` and `renderHomeHub()` — the only two things
that turn `buildNavBuckets()`'s output into visible UI — now filter
`PAGE_LOCAL_ROUTES` out of the `items` array before rendering rows/tiles.
Nothing else reads that filtered list: `buildSearchIndex()` (command
palette) and `registerSecondaryNavViews()` both still read raw `NAV` directly
(per Sprint 2's own note about why `NAV`'s shape was left alone), so the 3
ASIM routes remain one Ctrl-K/search away even though they no longer have a
line in the rail or a tile in the Home hub — arguably an improvement over
before, since a command palette hit is on-demand chrome, not permanent
clutter, matching the same "on-demand drawer" reasoning Sprint 1 used for
`#pane-azure`'s two replacement surfaces.

**In-page destination — a 4th tab on `VIEWS['siem/hunting']`, not a new
mechanism.** That view (`views.js`, "Search & explore") already had a
`.tabs`/`.tab` pattern (`activeTab`/`setSentinelHuntingTab()`/`renderSearchTab
`/`renderBookmarksTab`/`renderLivestreamTab`) — the same in-page-tabs idiom
used all over the rest of the app (device tabs, identity tabs, attack-path
tabs, M365 user/message filters, etc.), so this sprint added a 4th tab,
"ASIM parsers," rather than inventing a different subnav shape. Its content
is a card grid (`.tile`/`.tile-grid`, an existing CSS class already used
elsewhere in the same file) of 3 clickable cards, one per ASIM route, using
`onclick="navigate(route)"` (consistent with how the rest of the rail/hub
navigates, not an `<a href>`, since `.tile`'s hover/shadow styling assumes a
clickable block, not a reset anchor). Card copy (`ASIM_HUNTING_PARSERS`,
`views.js`, right above `VIEWS['siem/hunting']`) reuses each destination
route's own `subtitle` text from its `renderMockAsimLab` config, so the card
grid can't drift out of sync with what the destination page actually says.
**The 3 ASIM routes themselves are completely unchanged** —
`VIEWS['siem/hunting/dns']` etc. still call `renderMockAsimLab(...)` exactly
as before, including their own existing "Advanced hunting" back-link and
next/prev chain between the 3 parsers (a small stepper that already existed
inside `renderMockAsimLab` before this sprint) — this sprint only changed how
a user *arrives* at them from the shell, not their own content or behavior.
Direct hash navigation to any of the 3 (`#/siem/hunting/dns` etc.) still
mounts exactly as before — confirmed in the verification harness below.

**Admin-bucket call: kept flat at the data/route level; added purely visual
sub-headings in the rail's rendering only.** Sprint 2 flagged Admin (39
routes, no sub-grouping) and asked Sprint 3 to make a real call. Read through
all 39: `identity`'s 4 (directory/risk/access-policy/sign-in-logs),
`workspace`'s 8 (tenant admin), `helpdesk`'s 17 (support tools), and 10 misc
`xdr`/`siem` reporting/settings pages. None of these are subviews of each
other in the doc §4 sense — a license report is not a tab of the user
directory, a PowerShell console is not a mode of DNS management — so nothing
in Admin qualifies for the "relocate into a parent's page body" treatment
Sprint 3's brief is otherwise about. **Decision: Admin stays a flat route
list at the `buildNavBuckets()`/data level (still exactly 39, still
collapsed-by-default) — but the rail's rendering only, for this one bucket,
groups those 39 into 4 named visual sub-headings** so an expanded Admin
section is scannable instead of a 39-item wall: "Directory & access"
(identity's 4), "Tenant & workspace" (workspace's 8), "Support & service
desk" (helpdesk's 17), "Reporting & platform settings" (the 10 misc
`xdr`/`siem` pages). This is allowed under the brief's own explicit
carve-out ("a non-portal-flavored visual grouping... is different from
re-introducing per-portal hierarchy") and even reuses the brief's own
suggested names for 3 of the 4 groups. The one place this *could* have
silently recreated the old per-portal split is the 4th group: rather than
keep "xdr misc" and "siem misc" as two separate headings (which would have
been a literal renamed reappearance of the old per-portal boundary), they
were deliberately merged into one "Reporting & platform settings" group,
since job-wise they're the same kind of page (reporting/settings/trials)
regardless of which portal namespace they happen to live in. Implementation:
`ADMIN_SUBGROUPS` (`app.js`, an ordered list of `{label, routes}`) plus
`renderAdminSubgroups()`, called only when `bucket.id === 'admin'` inside
`renderSidenav()`; every other bucket renders exactly as Sprint 2 left it
(flat, via a small extracted `navItemRow()` helper that both paths share, so
there's only one place that builds a `<li class="navitem">` row). The
sub-heading markup reuses `.navsubsection`/`.navsubsection-toggle` — CSS that
already existed in `styles.css` from the pre-Sprint-2 per-portal rail and had
sat unused since Sprint 2's rewrite dropped that tier — rendered here as a
static, non-interactive label (no `onclick`/caret, since only the parent
bucket is collapsible, not each sub-heading) rather than new CSS. Any admin
route not covered by one of the 4 named groups still renders, flat, at the
end (a defensive leftover pass, same "don't silently drop things" instinct
`buildNavBuckets()` itself already uses) — currently that pass is a no-op
since all 39 are accounted for, but it means a future Admin-portal addition
degrades gracefully instead of vanishing. `renderHomeHub()` was deliberately
**not** given the same sub-grouping — its existing `HOME_HUB_CAP`/"+N more"
mechanism (Sprint 2) already solves the "Admin is huge" problem at the hub
layer by showing 8 tiles and a jump-to-rail link, and the rail (now
sub-headed) is exactly where that jump lands, so the two layers complement
each other rather than needing the same treatment twice.

**`renderAzurePane()` — deleted.** Sprint 1 and Sprint 2 both explicitly
left this decision open ("repurpose... or delete — Sprint 3's call"). It
was not repurposed: this sprint's page-local subnav need (the ASIM card
grid) was better served by the codebase's existing in-page `.tabs` idiom
than by adapting `renderAzurePane()`'s per-workload `CLOUD_NAV` cross-link
list, which solves a different problem (a flat list of *other workloads*,
not a set of sibling routes within one page). It had been fully uncalled
dead code since Sprint 1 (confirmed zero remaining references before
deleting, beyond two historical comments describing what Sprint 1/2 did,
which were left as accurate history rather than rewritten). Deleted the
function body only, in `app.js`; left `CLOUD_HIGHLIGHT` (still read by
`renderSwitcher()` for the waffle) and `#pane-azure`/`#sidenav-azure`
(`index.html`, always `hidden`, Sprint 1's call, not reopened here)
untouched — the pane markup is now simply an inert, permanently-hidden
element with nothing writing into it, rather than removed outright, matching
the same "leave dead DOM alone unless asked" restraint Sprint 1 used
elsewhere in the same file.

**Verification performed:**
- `curl` 200 on `/`, `/app.js`, `/data.js`, `/views.js` against the live
  server at `127.0.0.1:8777` (already running, not restarted).
- `node --check` clean on every active `.js` file (`app.js`, `data.js`,
  `views.js`, `helpdesk.js`, `helpdesk-data.js`, `kql-editor.js`,
  `guided-hunting.js`, `lab-widgets.js`, `workflow-automation.js`,
  `neutral-terminology.js`, `storage-keys.js`).
- Built the same kind of headless Node `vm` harness Sprint 2 used, loading
  all active files **in the same order `index.html`'s `<script>` tags do**
  (`storage-keys.js`, `data.js`, `helpdesk-data.js`, `lab-widgets.js`,
  `kql-editor.js`, `guided-hunting.js`, `views.js`, `app.js`,
  `workflow-automation.js`, `helpdesk.js` — load order matters here because
  `app.js` references at least one `views.js`-defined function,
  `visibleInventoryColumns`, at its own top level). Results:
  - `buildNavBuckets()`: **121 total / 121 unique / 0 dupes** — unchanged
    from Sprint 2, confirming the ASIM demotion didn't shrink the distinct-
    route universe. Per-bucket counts also unchanged from Sprint 2's own
    numbers: `investigate` 16, `detect` 24, `respond` 3, `protect` 20,
    `audit` 13, `admin` 39, `assist` 6.
  - All 3 ASIM routes: present in `buildNavBuckets()`'s output (`true`),
    present in `buildSearchIndex()`'s output (`true`), **absent** from
    `renderSidenav()`'s rendered HTML for 6 different active routes spanning
    5 different buckets, and **absent** from `renderHomeHub()`'s rendered
    HTML — confirms the filter applies consistently regardless of which
    route/bucket is currently active.
  - Admin bucket: all 4 sub-heading labels ("Directory & access", "Tenant &
    workspace", "Support & service desk", "Reporting & platform settings",
    checked in their `escHtml`-escaped form) present in `renderSidenav()`'s
    output when rendered with an active route inside Admin.
  - `VIEWS['siem/hunting/dns']`, `VIEWS['siem/hunting/authentication']`,
    `VIEWS['siem/hunting/network-session']` all called directly and returned
    a populated `{html, onMount}` object (`onMount` present as a function in
    all 3, `html` length in the thousands of characters) — confirms each
    route's own view is completely unaffected and still mounts on direct
    hash navigation. `VIEWS['siem/hunting']()` with the tab set to `'asim'`
    (via the same `sessionStorage` key `setSentinelHuntingTab()` writes,
    `hsl.siem.hunting.tab`) rendered all 3 parser routes' `navigate(...)`
    calls in its output, and the 4-tab bar (`Search results` / `Bookmarks` /
    `Livestream` / `ASIM parsers`) was present.
  - `mountView('siem/hunting/dns')` (and the other 2) threw inside the
    harness — traced this to the harness's minimal DOM stub, not a real
    defect: `renderMockAsimLab`'s `onMount` calls `attachKqlEditor(...)`,
    which does real DOM manipulation (`insertBefore` on a syntax-highlight
    overlay) that the stub's fake elements don't support. This is a
    pre-existing property of these views' `onMount` (unchanged by this
    sprint — `renderMockAsimLab` itself was not touched) and not something
    Sprint 2's simpler `render()` spot-checks would have exercised either;
    the direct `VIEWS[route]()` calls above are the more targeted check for
    what this sprint actually changed (entry points, not view internals) and
    they passed cleanly.
- Grepped the whole tree for `renderAzurePane` after deleting it — zero
  remaining calls; the only 2 hits left are historical comments describing
  Sprint 1/2's own past decisions, not live references.
- Grepped for 3-segment route literals across every `.js` file as the
  exhaustive check described above — confirmed the ASIM triplet is the only
  match in the entire 121-route universe.

**No route ids were changed.** No feature surfaces were removed — all 121
routes remain reachable (rail for 118 of them, rail sub-heading nesting for
the Admin 39, command palette + in-page tab card grid for the 3 demoted ASIM
routes, direct hash navigation for all of them as always). No vendor-specific
wording was introduced; new visible copy is limited to "ASIM parsers" (a tab
label, already using the pre-existing "ASIM" abbreviation used elsewhere in
this same view) and the 4 Admin sub-heading labels, none of which trip
`neutral-terminology.js`'s replacement patterns. Theme/color system
untouched.

**Flagged for Sprint 4:**
- The "Secure score" / vulnerability-management "Exposure score" naming
  collision Sprint 2 flagged is still unresolved — this sprint didn't touch
  either surface. Still worth a look in Sprint 4's broader label audit.
- `PORTAL_HOME_ROUTE`/`PORTAL_ICON` (flagged unused since Sprint 1/2) are
  still unused dead data — still low-risk to delete whenever Sprint 4 is
  already editing that area.
- Nothing else from Sprint 3's own scope is left open: the ASIM subview
  relocation, the Admin-bucket call, and the `renderAzurePane()` decision are
  all resolved above, not deferred further.

### Sprint 4 Implementation Notes

**Label/breadcrumb audit — method.** Used `neutral-terminology.js`'s
`TERMINOLOGY` array as the baseline for "already-handled vendor wording": any
literal product/platform name in that list (Sentinel, Defender, Purview,
Entra, Copilot, Azure, M365, etc.) gets rewritten live by its `MutationObserver`
regardless of which source file it's typed into, so source text like
`<h1>Security Copilot</h1>` (`views.js`, the `ai-agent/*` breadcrumbs) or
`Sentinel workspace: ...` (`views.js`'s automation view) is not a leftover bug
— it's the app's existing, working de-vendoring mechanism, confirmed by
reading the observer's `subtree`/`childList`/`characterData` wiring at the
bottom of the file. Auditing for genuine leftovers therefore meant hunting for
words that read as source-portal structure rather than source-portal product
names, since structural jargon (rail/blade/portal-switcher language) isn't a
string the terminology layer's pattern list would ever target. Grepped every
active `.js`/`.html` file for `blade`, `portal`, `rail`, `pane`, `flyout`,
`waffle`, `app switcher` as whole-word hits, then manually triaged every
result into internal identifier (CSS class/id/comment/variable —
compatibility-contract territory per this project's own
`neutral-terminology.js` header comment, left alone) vs. actual visible copy
(fixed).

**Found and fixed (visible copy only):**
- `views.js:5902` — a toast string on the Automation rule detail card read
  `'Create automation rule blade is open in the lab page below.'` → reworded
  to `'Create automation rule panel is open in the lab page below.'` ("blade"
  is literally the source portal's own name for this exact flyout-panel UI
  pattern, the same concept `#pane-azure`/`#pane-blade` was built around
  before Sprints 1–3 collapsed it away; leaving the word in a toast would
  undercut that work even though the CSS class it sits inside,
  `.automation-blade`, is an internal identifier and stays).
- `views.js:5940` — same page's close-button toast, `'Blade closed (lab
  stub).'` → `'Panel closed (lab stub).'`. Same reasoning.
- `index.html:74` — `aria-label="Collapse blade pane"` on `#toggle-blade`
  (the one persistent rail, `#pane-blade`) → `aria-label="Collapse navigation
  pane"`, matching `#blade-title`'s existing Sprint-2 text ("Navigation") so
  the accessible name and the visible label agree. This one mattered
  slightly more than the two toasts: it's screen-reader-exposed text on the
  current persistent rail, not a lab-stub toast on one page.
- `data.js:3673` — `PORTALS` id `identity`'s `.tag` field still read
  `'Identity · Conditional Access, Identity Protection'`, i.e. the exact two
  pre-rename vendor product names Sprint 2's own §6 table replaced
  everywhere else (`Conditional Access → Access policy`, `Identity
  protection → Identity risk`). Confirmed by grep (same check Sprint 2
  already ran) that `.tag` is never rendered by any code path — dead
  metadata, not a visible regression — but since it's cheap and I was
  already editing the same literal array for the score-collision fix below,
  updated it to `'Identity · Access policy, Identity risk'` for internal
  consistency. Every other `PORTALS[].tag` value was left untouched (none of
  the others contain stale renamed terms).

**Ambiguous case, deliberately left alone:** `views.js:7765`'s
`aria-label="Purview portal options"` (plus the visible "New portal" /
"Purview portal" / "Classic governance portal" copy on the same governance
page) reads like leftover-vendor-structure "portal" language at first grep
hit, but the page it's on (`governance/solutions` /
`governance/classic-governance`) is specifically teaching the real,
documented distinction between the modern and "classic" versions of the
actual product this lab simulates — a genuine, factual UI-history distinction
a learner needs to know, not the app's own navigation being mis-described.
This is the same category of carve-out Sprint 2 already established for
`SEED_ALERTS`/`ATTACK_STORIES`/`ENTRA_RECOMMENDATIONS` narrative content and
the one Sprint 3 confirmed for helpdesk's real Windows admin vocabulary:
deliberate pedagogical content about the thing being simulated, not IA copy
about this shell. Left untouched (and "Purview" itself still gets
live-neutralized to "Data Governance" by the existing terminology layer
either way, so the rendered text never actually says the vendor name).

**Helpdesk and AI-agent coherence — traced end to end, both intact.**

Helpdesk (`helpdesk.js`/`helpdesk-data.js`, 17 routes, `PORTAL_BUCKET.helpdesk
= 'admin'` from Sprint 1): three independent entry paths into
`#/helpdesk/dashboard` today — the Home hub's Admin section, the Labs
switcher (waffle)'s "IT Service Desk" tile (`CLOUD_APP_ROUTE['IT Service
Desk']`, unchanged since before Sprint 1), and, once inside any Admin-bucket
page, the rail's Sprint-3 "Support & service desk" sub-heading (all 17
routes). One real wrinkle worth recording, not a defect: Admin is 39 routes
total and `buildNavBuckets()`'s assembly order (walks `PORTALS` in array
order, and `helpdesk` is runtime-pushed last) puts `identity`'s 4 +
`workspace`'s 8 + several `xdr`/`siem` misc routes before any `helpdesk`
route in the flattened list. The Home hub caps each bucket at 8 tiles before
a "+N more" tile, so none of Admin's first 8 tiles are Help Desk routes;
reaching Help Desk from the Home hub takes Home hub → "+N more in Admin" →
rail's "Support & service desk" sub-heading (2 stops), not 1. This isn't
broken (the waffle's direct tile and the rail sub-heading both reach it in 1
click each, and it matches the exact "+N more" mechanic Sprint 2 designed on
purpose for oversized buckets), but it means the Home hub specifically is not
the fastest path to Help Desk — worth knowing if a future pass ever wants to
special-case large sub-workloads in the hub. Internally, helpdesk's own
breadcrumb convention (`hdPageHeader()` → `"IT Service Desk › <page>"`) is
consistent across all 17 of its views, its own tab pattern (Active
Directory's Users/Groups/Computers tabs) matches the app's existing
in-page-tabs idiom used everywhere else, and nothing about it reads as
orphaned.

AI-agent / "Security Copilot" (`views.js` `ai-agent/*`, 6 routes,
`PORTAL_BUCKET['ai-agent'] = 'assist'`): the Assist bucket has only 6 routes,
so all 6 render in the Home hub without needing "+N more" — the opposite
situation from helpdesk, and the more comfortable one. Reachable via Home hub
→ Assist, rail → Assist (flat, no sub-grouping needed at 6 items), and —
predating this whole restructure and untouched by any of the 4 sprints — the
always-present topbar `#btn-copilot` icon, which opens an embedded flyout
with an "Open standalone session" button that lands on `#/ai-agent/session`.
(`ai-agent` has no `CLOUD_APP_ROUTE` entry, so it is not directly reachable
from the Labs switcher — confirmed unchanged from Sprint 1's own note about
this.) All of these land coherently on the same 6-route surface; nothing
orphaned. Breadcrumbs read `Security Copilot › <page>` in source (`views.js`)
and render as `AI Security Agent › <page>` after the terminology layer runs —
verified this resolves correctly, not just assumed, by checking the literal
breadcrumb strings against the real `TERMINOLOGY` regex list.

**Flagged item #1 — "Secure score" / "Exposure score" collision: fixed, not
just re-flagged.** Confirmed by reading both surfaces line by line that these
are two genuinely distinct, pre-existing metrics that now share one label
after Sprint 2's comprehensive `Secure score → Exposure score` rename: (a)
the tenant-wide risk-posture score (`t.secureScore`/`t.secureScoreMax`, a
percentage/points figure, e.g. 65% / 247 of 380 pts) shown at `xdr/home`, its
own dedicated `xdr/secure-score` page, `cloud/overview`, and
`identity/overview`; versus (b) an unrelated, pre-existing
threat-and-vulnerability-management (TVM) metric (`tvm.exposureScore`,
`TVM_EXPOSURE_TREND`) shown per-device on the `xdr/devices` detail page's
Vulnerabilities tab and as a trend chart on the dedicated
`xdr/vulnerabilities` dashboard. This is a real, in-context collision, not
just a theoretical one: the device tab's own callout text says "Use the full
TVM dashboard to compare exposure across the tenant" and links directly to
`xdr/vulnerabilities`, which itself links to `xdr/exposure` (the org-level
page that itself links to `xdr/secure-score`) — a user can be 1–2 clicks away
from seeing "Exposure score" mean two different numbers. Call made: rename
the TVM-specific label, not the org-wide one (the org-wide one is the doc's
own explicit §6 rename target and is the more prominent, cross-page KPI;
TVM's is the narrower, page-scoped metric). Changed exactly two visible
strings — no data, route, or function name touched: `views.js:3391`
`<span>Exposure score</span>` (device Vulnerabilities tab) →
`<span>Vulnerability exposure score</span>`; `views.js:10377`
`<strong>Exposure score trend</strong>` (xdr/vulnerabilities dashboard) →
`<strong>Vulnerability exposure trend</strong>`. Verified via a Node `vm`
harness that the rendered `xdr/vulnerabilities` HTML now contains
"Vulnerability exposure trend" and no longer contains the bare "Exposure
score trend" string, and that `xdr/device`'s vulnerabilities tab now renders
"Vulnerability exposure score". The org-wide "Exposure score" (`xdr/home`,
`xdr/secure-score`, `cloud/overview`, `identity/overview`) is completely
untouched and remains the one surface that owns that exact label.

**Flagged item #2 — `PORTAL_HOME_ROUTE`/`PORTAL_ICON` dead data: deleted.**
Re-grepped the whole tree before touching anything: both were still only
referenced at their own definition sites in `app.js` (zero consumers
anywhere in `app.js`/`data.js`/`views.js`/`helpdesk.js`), exactly as Sprints
1–3 each independently found. Both maps existed only to serve Sprint 1's
original one-tile-per-portal Home hub, which Sprint 2's route-level
`buildNavBuckets()`-driven rewrite fully superseded. Three sprints in a row
flagging the same unused data as "low-risk to delete whenever a later sprint
is already in this file" was itself a signal to just finish it rather than
pass it to a nonexistent Sprint 5 — deleted both objects (`app.js`, replaced
with a one-line explanatory comment for anyone grepping for them later) and
confirmed via the harness that `typeof PORTAL_HOME_ROUTE`/`typeof
PORTAL_ICON` are now `undefined` with no knock-on breakage anywhere (route
counts, renders, and search index all unaffected).

**Full verification pass — all green:**
- `styles.css` braces: 1571 open / 1571 close (balanced; unchanged from
  before this sprint — no CSS was touched this sprint).
- `node --check` clean on every active file: `app.js`, `data.js`, `views.js`,
  `helpdesk.js`, `helpdesk-data.js`, `kql-editor.js`, `guided-hunting.js`,
  `lab-widgets.js`, `workflow-automation.js`, `neutral-terminology.js`,
  `storage-keys.js`.
- `curl` 200 against the already-running server at `127.0.0.1:8777` for `/`,
  `/index.html`, `/app.js`, `/data.js`, `/views.js`, `/helpdesk.js`,
  `/helpdesk-data.js`, `/kql-editor.js`, `/guided-hunting.js`,
  `/lab-widgets.js`, `/workflow-automation.js`, `/neutral-terminology.js`,
  `/storage-keys.js`, `/styles.css`.
- Route-count reconciliation, same Node `vm`-harness method Sprints 2–3 used
  (all active `.js` files loaded into one sandboxed context in
  `index.html`'s actual `<script>` order, `buildNavBuckets()` called
  directly): 121 total routes, 121 unique, 0 duplicates — identical to the
  pre-Sprint-4 baseline. Per-bucket counts also byte-for-byte unchanged from
  Sprint 2/3's own numbers: `investigate` 16, `detect` 24, `respond` 3,
  `protect` 20, `audit` 13, `admin` 39, `assist` 6 (sums to 121). This
  confirms none of this sprint's label/data edits touched a route id or
  dropped/added a route — the one thing this sprint was explicitly warned to
  stop and reconsider if it happened.
- Same harness: called `render()` across all 8 workloads' home routes plus
  `#/xdr/action-center`, `#/siem/hunting/dns`, `#/xdr/vulnerabilities`,
  `#/xdr/devices`, `#/xdr/secure-score`, and `#/identity/conditional-access`
  — zero exceptions except the one pre-existing, already-documented
  `attachKqlEditor`/`insertBefore` DOM-stub limitation on the ASIM routes
  that Sprint 3's own notes already called out as a harness artifact, not a
  real defect (re-confirmed, not newly introduced).
- Confirmed the 3 ASIM routes are still present in `buildNavBuckets()`'s
  output (still reachable via command palette / their own in-page tab card
  grid, per Sprint 3) — Sprint 3's demotion mechanism is untouched.
- Theme toggle: read (not just trusted) `index.html`'s pre-paint inline
  script (`hsl.ui.theme` → `matchMedia` fallback → `document.body.dataset.theme`,
  lines 12–23) and `app.js`'s `toggleTheme()`/`updateThemeIcon()` plus their
  `DOMContentLoaded` wiring — all consistent with `RESTYLE_PROGRESS.md`'s own
  description of this subsystem, and none of this sprint's edits touched
  `index.html`'s `<head>`/inline-script block, `app.js`'s theme functions, or
  any theme-related CSS custom property. Nothing from this nav sprint bled
  into that separate subsystem.
- No route ids changed anywhere in this sprint — every edit was a visible
  string (toast text, aria-label, a dead `.tag` metadata field, two KPI
  labels) or a dead-code deletion; none touched a `'#/...'` route literal, a
  `NAV`/`ROUTE_BUCKET`/`PORTAL_BUCKET` key, or a `VIEWS[...]` registration
  key.
- No feature surface removed, across this sprint or, by the transitive chain
  of each prior sprint's own reconciliation (Sprint 1: 8/8 portals landed
  with zero drops; Sprint 2: 121/121 route reconciliation per-portal, exact
  old-vs-new match for all 8 portals; Sprint 3: 121/121 unchanged after the
  ASIM relocation), across the whole 4-sprint project. No git history is
  available in this checkout to diff against a pre-Sprint-1 commit (`ui/` is
  not a git repo, confirmed), so this project relies on each sprint's own
  programmatic before/after reconciliation as the audit trail instead —
  which is unbroken end to end.

**Residual items for a future pass (not defects, no Sprint 5 warranted):**
- The Home-hub-takes-2-clicks-to-reach-Help-Desk note above (Admin bucket
  ordering + 8-tile cap) — a cosmetic navigation-depth observation, not a
  bug; both the waffle and the rail sub-heading already offer a 1-click path.
- `renderAzurePane()`'s markup (`#pane-azure`/`#sidenav-azure` in
  `index.html`) remains inert-but-present DOM, per Sprint 1/3's deliberate
  "leave dead DOM alone unless asked" calls — still true, still fine.
- `views.js:7765`'s "Purview portal" pedagogical carve-out (see above) —
  flagged here explicitly in case a future non-navigation pass wants to
  revisit the boundary between "teaching a real product's UI history" and
  "this app's own navigation copy," but this sprint's judgment is that it's
  the former and should stay.

## Final summary — project complete

The navigation restructure requested in `NAVIGATION_RESTRUCTURE.md` is done.
Across four sprints:

1. **Shell foundation (Sprint 1)** replaced the 3-tab `.portal-tabs` bar (a
   broken, only-3-buckets-wide product switcher) with a single Home hub
   entry point, collapsed the always-visible second rail (`#pane-azure`) into
   two on-demand drawers (the Home hub and the reframed Labs-switcher
   waffle), deleted confirmed-dead `#workload-strip` markup, and settled the
   project's one open design question — reconciling the spec doc's three
   slightly different bucket lists into a single canonical 7-bucket taxonomy
   (`Investigate`/`Detect`/`Respond`/`Protect`/`Audit`/`Admin`/`Assist`) used
   everywhere from then on.
2. **Nav bucket rebuild + relabeling (Sprint 2)** replaced the per-portal
   left-rail grouping with a route-level `ROUTE_BUCKET`/`PORTAL_BUCKET` →
   `buildNavBuckets()` mapping covering all 121 routes into the 7 buckets
   with zero drops (programmatically reconciled against the old per-portal
   counts), applied the spec's §6 visible-label renames throughout
   (`Incidents → Case queue`, `Secure score → Exposure score`, etc.), and
   rebuilt the Home hub to show real route-level tiles instead of one
   portal-landing tile per bucket.
3. **Page-local sub-navigation (Sprint 3)** found and relocated the one
   genuine subview family in the whole 121-route universe (the 3 ASIM
   hunting parsers) from the global rail into an in-page tab on
   `siem/hunting`, added non-portal-flavored visual sub-headings to the
   Admin bucket (39 routes) to keep it scannable without reintroducing
   per-portal hierarchy, and deleted the by-then-fully-dead
   `renderAzurePane()` function.
4. **Verification & close-out (Sprint 4)** audited all remaining visible
   labels/breadcrumbs beyond the doc's own rename table and fixed the small
   set of genuine leftovers found (three "blade" strings in toasts/aria-label,
   one stale pre-rename `.tag` metadata value), traced the helpdesk and
   ai-agent surfaces end to end and confirmed both are coherently reachable
   with no orphaned paths, resolved both items Sprint 3 flagged (renamed the
   TVM-specific "Exposure score" to "Vulnerability exposure score"/"...trend"
   to end its collision with the org-wide renamed metric; deleted the
   confirmed-unused `PORTAL_HOME_ROUTE`/`PORTAL_ICON` dead data), and ran a
   full verification pass — 121/121/0-dupes route reconciliation, clean
   `node --check` on every active file, 200s on every asset, and confirmation
   that the separate day/night theme subsystem was untouched by all four
   sprints.

**Current state:** the shell now presents one home hub, one persistent
task-based rail (7 buckets, all 121 routes reachable, no dense per-product
catalog), page-local sub-navigation where a real subview family existed, and
neutral task-language labels throughout, with the vendor-neutral terminology
layer (`neutral-terminology.js`) still doing its separate, pre-existing job
of scrubbing literal product names from rendered text. No feature surface was
lost and no route id was changed anywhere across the whole project — every
route present before Sprint 1 is still reachable today, just regrouped and
relabeled.

**Residual known issues for a future pass (none urgent, no defects):**
- Reaching Help Desk specifically from the Home hub takes 2 stops (via
  Admin's "+N more") rather than 1, because Admin is by far the largest
  bucket (39 routes) and helpdesk's routes sort last in it; the waffle and
  the rail's own "Support & service desk" sub-heading already offer 1-click
  paths, so this is a minor Home-hub-specific wrinkle, not a broken path.
- `#pane-azure`/`renderAzurePane()`'s markup remains inert dead DOM in
  `index.html` (function body already deleted in Sprint 3) — harmless, never
  rendered, left alone per each prior sprint's "don't touch dead DOM unless
  asked" judgment.
- `views.js:7765`'s "Purview portal" copy (teaching the real product's
  new-vs-classic-portal distinction) is a deliberate pedagogical carve-out,
  not a leftover — flagged for visibility in case a future pass wants to
  revisit that specific boundary.

## Post-close-out polish pass (done directly, no new sprint)

User feedback after the 4 sprints closed out, small enough to fix inline:

- **AI Security Agent still read as Copilot visually**, not just in wording:
  the topbar icon was a literal 4-point sparkle/star (Copilot's own glyph
  shape), and `views.js`'s XDR-home CTA button carried a `✨` sparkle emoji
  next to leftover source text ("Ask Security Copilot", relying on
  `neutral-terminology.js`'s live rewrite to reach "AI Security Agent" at
  runtime). Replaced the topbar SVG with an original chat-bubble/three-dot
  "assistant" glyph (`index.html`, `#btn-copilot`) and rewrote the button to
  say "🤖 Ask AI Security Agent" directly at the source instead of depending
  on the runtime rewrite (`views.js:1348`).
- **Waffle switcher renamed:** "Labs" → "Cloud Systems" (`index.html`'s
  `#panel-switcher` header, `#btn-waffle` title/aria-label, plus a stale code
  comment in `app.js`) per user preference.
- **Nav bucket rail now animates instead of snapping.** `.navcaret` rotates
  90° via CSS transition (driven off `aria-expanded`, replacing the old
  JS glyph-swap between `▾`/`▸`) instead of instantly changing character, and
  `.navitem`/`.navsubsection` rows collapse via a `max-height`/`opacity`/
  `padding` transition instead of `display:none`. This required changing
  `toggleNavBucket()` (`app.js`) to stop calling `renderSidenav()` (a full
  `innerHTML` replace — destroys and recreates the DOM, so a CSS transition
  has no "before" state to animate from) on a manual click; it now flips
  `.section-hidden`/`aria-expanded` directly on the existing elements instead,
  found via a new `data-bucket` attribute threaded through `navItemRow()`/
  `renderAdminSubgroups()`. Route-navigation-triggered renders still do a
  full `renderSidenav()` rebuild (correct there — the active row and
  auto-expanded bucket both need to recompute) so only the manual-toggle path
  changed behavior.
- **Carets glow green in dark/night mode, flat in light/day mode**
  (`var(--good)` + `text-shadow`, gated on `body[data-theme="light"]` so
  light mode stays glow-free) — reuses the existing teal-green palette var,
  no new hardcoded color introduced.
- **Bucket header labels lightened in dark mode only**
  (`.navsection-toggle`/`.navsubsection-toggle` from `--fg-faint` to
  `--fg-muted`, one existing palette tier up) — user feedback that
  INVESTIGATE/DETECT/etc. read too subdued against the night palette; day
  mode was already lighter-toned and left untouched.
- Confirmed dark/night remains the default theme (unqualified `:root`, no
  `[data-theme]` attribute needed) — this was already true from the earlier
  restyle project (see `RESTYLE_PROGRESS.md` Sprints 1-2), no code change
  needed, just verified the early inline theme-detection script in
  `index.html` still falls back to `'dark'` rather than `'light'`.

Verified: `node --check` clean on `app.js`/`views.js`, `styles.css` braces
balanced (1577/1577), page and all edited assets return 200.

No further sprints are planned.
