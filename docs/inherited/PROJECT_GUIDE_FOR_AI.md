# Hack Smarter Labs — AI Project Guide

Snapshot date: 2026-08-17

This document gives a new AI assistant enough context to work safely and
productively without reconstructing the project from scratch.

Read `LATEST_PROGRESS.md` first for the newest scope and implementation status.

## Project identity

- **Project name:** hacksmarter-labs
- **Publication brand:** Hack Smarter Labs
- **Project root:** `/home/alex/hacksmarter-labs`
- **Local URL:** `http://127.0.0.1:8767/`
- **Dedicated port:** `8767`
- **Original source project:** `/home/alex/defender-lab` on port `8765`
- **Companion SC-200 study app:** `/home/alex/sc-200_app` on port `8766`
- **Git branch:** `master`
- **Git remote:** none configured

Do not change this course back to ports `8765` or `8766`. The three local
applications are intentionally able to run side by side.

## What the project is

Hack Smarter Labs is a local, browser-based simulator for
general SOC Analyst work. It presents fictional security-operations data
through original interfaces inspired by common XDR, SIEM/SOAR, endpoint,
identity, cloud-security, automation, and data-governance workflows.

The codebase was inherited from an SC-200-oriented lab and still contains
vendor-specific routes and historical certification documents. Those are
implementation heritage, not the current teaching scope.

The current simulator includes workflow models originally inspired by:

- Defender XDR and Defender for Endpoint
- Sentinel
- Defender for Cloud
- Purview
- Security Copilot
- Entra
- Microsoft 365 admin center

The application is a static single-page app. It has no framework, package
installation, build step, backend, authentication, or real cloud connection.
A Python static-file server hosts it locally. All incidents, alerts, users,
devices, queries, and cloud resources are fictional fixtures.

## Non-negotiable project rules

1. Do not copy, port, or closely reproduce proprietary Microsoft HTML, CSS, or
   JavaScript. Visual references may guide original implementation only.
2. Keep the application plain HTML, CSS, and JavaScript with no build step.
3. Do not add real authentication, real tenant access, or real API calls.
4. Do not put secrets, tokens, real hashes, or real customer data in the repo.
5. New learning features must map to a transferable SOC Analyst competency or
   a direct user requirement. `ExamObjectives.md` is a legacy reference, not a
   scope gate.
6. Preserve the legacy terminal scenario in `defender.py`, `rules.json`,
   `events.jsonl`, and `run_scenario.sh`.
7. Update `HANDOFF.md` after a meaningful work session.
8. Before changing navigation, read `NAV_SPEC.md`.
9. Preserve existing user changes in the working tree. Never reset or discard
   unrelated edits.

## Start the course

Preferred launcher:

```bash
cd "/home/alex/hacksmarter-labs"
./bin/launch.sh
```

The launcher starts a detached Python server from `ui/`, writes its process ID
to `.server.pid`, logs to `.server.log`, and opens the course in the default
browser.

Manual start:

```bash
cd "/home/alex/hacksmarter-labs/ui"
python3 -m http.server 8767 --bind 127.0.0.1
```

Health check:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8767/
```

A healthy instance returns `200`.

To stop only this course's detached server, first confirm that the PID belongs
to the course and then terminate it:

```bash
pid=$(cat "/home/alex/hacksmarter-labs/.server.pid")
readlink -f "/proc/$pid/cwd"
ps -p "$pid" -o args=
kill "$pid"
```

The working directory must end in
`hacksmarter-labs/ui`, and the process should
be `python3 -m http.server 8767 --bind 127.0.0.1`.

## Desktop integration

The course has a GNOME dash launcher:

- Desktop entry:
  `/home/alex/.local/share/applications/hacksmarter-labs.desktop`
- Icon:
  `/home/alex/.local/share/icons/hacksmarter-labs.png`
- Pinned application ID: `hacksmarter-labs.desktop`

The icon is the user-provided `M` image. Activating the pinned icon runs
`bin/launch.sh`, so the server starts automatically if needed and the browser
opens to port `8767`.

## Read these files first

Read in this order before implementing changes:

1. `LATEST_PROGRESS.md` — current direction and most recent work.
2. `PROJECT_GUIDE_FOR_AI.md` — this architecture and safety guide.
3. `HANDOFF.md` — implementation history and validation details.
4. `AGENTS.md` — legacy task history plus still-relevant safety rules.
5. `NAV_SPEC.md` — required source of truth before navigation changes.
6. `SC200_LAB.md` and `ExamObjectives.md` — legacy source references only.

Supporting audits and design notes include `COVERAGE_SWEEP.md`,
`OBJECTIVES_DELTA.md`, `GAP_BRIDGE.md`, `GAP_BRIDGE_FINDINGS.md`,
`PRODUCT_ARCHITECTURE_PLAN.md`, `DEVICE_PAGE_PARITY.md`, and
`ANOMALY_RULES.md`.

## Architecture

```text
hacksmarter-labs/
├── ui/
│   ├── index.html               SPA shell, panels, footer, script order
│   ├── assets/hacksmarter-logo.png
│   │                            transparent header, favicon, and dash logo
│   ├── styles.css               all original visual styling and themes
│   ├── data.js                  navigation plus fictional fixture data
│   ├── views.js                 route renderers and mock KQL evaluator
│   ├── app.js                   router, actions, panels, and app state
│   ├── guided-hunting.js        guided hunting query builder
│   ├── kql-editor.js            shared KQL editor behavior
│   ├── lab-widgets.js           reusable local UI/state helpers
│   ├── workflow-automation.js   late-loaded workflow view override
│   └── NODE_MAP.md              UI structure notes and selector map
├── bin/
│   ├── launch.sh                port 8767 server and browser launcher
│   ├── qa-sweep.sh              syntax and render QA wrapper
│   ├── render_all.js            route/view mechanical render test
│   └── run-codex-agents.sh      historical task-runner automation
├── local-tasks/                 historical generation/verification tooling
├── defender.py                  legacy CLI suppression engine
├── run_scenario.sh              legacy terminal training scenario
├── rules.json                   CLI scenario rule data
├── events.jsonl                 CLI scenario event data
├── SC200_LAB.md                 master project document
├── LATEST_PROGRESS.md           current direction and latest status
├── ExamObjectives.md            legacy certification reference
├── HANDOFF.md                   chronological engineering handoff
└── AGENTS.md                    contributor instructions and task history
```

### Browser load order

`ui/index.html` loads the JavaScript in this order:

1. `data.js`
2. `lab-widgets.js`
3. `kql-editor.js`
4. `guided-hunting.js`
5. `views.js`
6. `app.js`
7. `workflow-automation.js`

Order matters. Most files use browser globals instead of ES modules.
`workflow-automation.js` intentionally loads last because it overrides a view
registered earlier. Do not convert one file to modules or reorder scripts
without testing every dependent global.

### Runtime flow

```text
URL hash
  → app.js router
  → workload lookup in data.js
  → VIEWS[route] renderer in views.js
  → HTML inserted into the shared shell
  → optional onMount handler wires route-specific controls
  → interactions update memory, localStorage, or sessionStorage
  → affected view or side panel re-renders
```

Routes use hashes such as `#/defender/home`, `#/sentinel/incidents`, and
`#/purview/audit`. `ui/index.html` is the only HTML entry page.

## Workloads and current route inventory

| Workload key | Navigation route entries |
|---|---:|
| `defender` | 47 |
| `sentinel` | 28 |
| `defender-cloud` | 14 |
| `purview` | 13 |
| `copilot` | 6 |
| `entra` | 3 |
| `m365-admin` | 8 |

There are currently 110 unique registered view renderers. Navigation contains
more entries because some views are reachable from multiple workload contexts.
The no-dead-navigation invariant is currently passing.

## Important implementation conventions

### Data

Put reusable fictional fixtures and navigation definitions in `ui/data.js`.
Use stable IDs so list rows, side panels, cross-product pivots, and persisted
selections continue to agree. Keep identifiers harmless and obviously
fictional.

### Views

Register screens in `ui/views.js` as `VIEWS['workload/route']`. A view normally
returns either an HTML string or an object containing HTML plus an `onMount`
callback. Reuse existing render helpers before adding new patterns.

### Interactions

Put shared interaction logic, routing, side-panel functions, and persistent
state in `ui/app.js`. Inline handlers in rendered HTML call global functions,
so renaming a function requires searching all UI files.

### Styling

Extend `ui/styles.css` using existing tokens and scoped component classes.
Avoid broad selectors that can change unrelated portals. Test at 1366×768 as
well as a larger desktop width because side panels and wide tables are common.

### Navigation

`NAV` and `PORTALS` live in `ui/data.js`. Read `NAV_SPEC.md` before editing
them. Every navigable route must have a matching `VIEWS[...]` registration.
Drill-down routes may exist without a direct navigation item.

### Client-side state

State is intentionally local-only. Keys use the historical
`defender-lab.*` namespace in `localStorage` and `sessionStorage`. The namespace
is an internal compatibility contract, not visible publication branding.
Changing it would silently discard learners' saved progress, rules, filters,
promptbooks, jobs, and selected entities, so do not rename it casually.

Major persisted areas include:

- suppression rules and replayed alert state
- selected incident, device, identity, and cloud-resource tabs
- Sentinel workspace, rules, playbooks, bookmarks, and job state
- hunting mode, query drafts, autorun handoffs, and KQL exercises
- Defender for Cloud filters and remediation progress
- Copilot sessions, promptbooks, plugins, knowledge, and settings
- Entra and Microsoft 365 filters and selections
- navigation-pane collapse state

Use browser storage only. Do not introduce a database or server-side state.

## Main learning workflows

The simulator currently includes, among many supporting screens:

- incident and alert triage with entity/evidence side panels
- chronological attack-story playback and blast-radius analysis
- suppression-rule practice with multi-condition AND behavior
- Defender Advanced Hunting and guided query building
- a local mock KQL evaluator with joins, summaries, parsing, and charts
- Sentinel analytics rules, hunting, bookmarks, livestream, search/restore
  jobs, workbooks, automation, notebooks, and entity graphs
- AMA, DCR, Syslog, CEF, Windows events, Azure Activity, and custom-log
  ingestion walkthroughs
- endpoint inventory, device discovery, live response, investigation packages,
  and vulnerability management
- Defender for Cloud alerts, incidents, multicloud onboarding, inventory,
  recommendations, and attack paths
- Purview Audit, eDiscovery, DLP, insider risk, information protection, and
  governance study surfaces
- Entra users, risky identities, sign-ins, roles, and Conditional Access
- Microsoft 365 users, licensing, service health, usage, and Message center
- standalone and embedded Security Copilot simulations

All actions are simulations and all data is fictional.

## Verification

Run syntax checks after JavaScript changes:

```bash
cd "/home/alex/hacksmarter-labs"
node --check ui/data.js
node --check ui/lab-widgets.js
node --check ui/kql-editor.js
node --check ui/guided-hunting.js
node --check ui/views.js
node --check ui/app.js
node --check ui/workflow-automation.js
```

Run the route/view renderer:

```bash
node bin/render_all.js
```

Baseline on 2026-08-17:

```text
views: 109/110 render clean; dead NAV routes: 0
FAIL: purview/audit: tiny/empty render
```

The `purview/audit` result is a documented pre-existing mechanical-render
limitation. It is still a real known issue; do not treat additional failures as
part of the baseline.

`bin/qa-sweep.sh` runs syntax and render checks and appends to
`local-tasks/QA_LOG.md`, so it is not read-only. Use it when updating the QA
history is desired.

For meaningful interface changes, also test in a real browser:

- the changed route at `http://127.0.0.1:8767/`
- the browser console for exceptions
- keyboard activation where rows/buttons are interactive
- persistence after refresh where state is meant to survive
- horizontal overflow at 1366×768
- related cross-route and side-panel pivots

## Known limitations and expected baseline

- `purview/audit` is the only current `render_all.js` failure.
- Everything is a simulation; KQL support is a deliberate fixture-backed
  subset, not a complete Kusto engine.
- There is no real login, RBAC enforcement, API, cloud tenant, email system,
  endpoint, or SIEM backend.
- Historical certification documents retain old scope and implementation
  decisions. Treat `LATEST_PROGRESS.md`, this guide, the latest `HANDOFF.md`
  entries, user direction, and current code as authoritative.
- The working tree may contain intentional user changes. Inspect `git status`
  and diffs before editing. There is no configured remote to recover from.

## Safe change workflow for another AI

1. Read the required project documents listed above.
2. Inspect `git status` and preserve unrelated modifications.
3. Find the existing route, fixture, helper, and styles before adding code.
4. Make the smallest change that satisfies a general SOC Analyst competency or
   the user's current requirement.
5. Keep data fictional and behavior local-only.
6. Run proportional syntax, render, HTTP, and browser checks.
7. Compare results with the known baseline instead of assuming every old
   warning was caused by the new change.
8. Update `HANDOFF.md` with the outcome, verification, and remaining work.

## Branding requirements

The user-facing brand must be written exactly as:

> Hack Smarter Labs

Do not reintroduce the previous publication name. The course folder and pinned
launcher retain the more descriptive name “Hack Smarter Labs SOC
Analyst course.”
