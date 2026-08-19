# Hack Smarter Labs SOC Analyst Course — Latest Progress

Status date: 2026-08-17  
Status: Cleanup complete; course server stopped after verification  
Current direction: General SOC Analyst training—not SC-200 certification training

## Current project direction

This project is a hands-on training environment for general Security Operations
Center analyst work. It should teach transferable analyst skills such as alert
triage, incident investigation, threat hunting, detection engineering, identity
investigation, endpoint response, cloud security, data governance, case
management, and response automation.

The project was copied from an older SC-200-oriented simulator, so many files,
routes, fixtures, storage keys, and historical notes still use Microsoft product
names or SC-200 language. That source history does not define the current course.
Certification objectives may be useful background references, but they are no
longer the scope gate, curriculum, or purpose of this lab.

For current decisions, use this priority order:

1. The user's current direction and requests.
2. `LATEST_PROGRESS.md`.
3. `PROJECT_GUIDE_FOR_AI.md`.
4. The latest entries in `HANDOFF.md`.
5. Current application behavior and code.
6. Legacy SC-200 documents only as implementation history or optional technical
   reference.

## Project identity

- Project folder: `/home/alex/hacksmarter-labs`
- Publication brand: **Hack Smarter Labs**
- Course type: General SOC Analyst practical training
- Local URL: `http://127.0.0.1:8767/`
- Dedicated port: `8767`
- Original SC-200 lab: `/home/alex/defender-lab` on port `8765`
- Separate SC-200 study app: `/home/alex/sc-200_app` on port `8766`
- Git branch: `master`
- Git remote: none configured

The course is isolated from the original lab and can run beside both older
projects without a port conflict.

## Latest completed work

### 1. Independent course copy

- Copied the complete original lab from `/home/alex/defender-lab`.
- Preserved hidden files and Git history.
- Renamed the new folder to:
  `hacksmarter-labs`.
- Confirmed the copy contains the complete application and supporting tools.

### 2. Dedicated runtime and port separation

- Changed the copied course launcher from port `8765` to `8767`.
- Kept `8765` available for the original lab.
- Avoided `8766`, which belongs to the separate study application.
- Updated the active launcher and run instructions.
- Verified that the server process runs from this course's `ui/` directory.

Final verification runtime, stopped after the checks:

```text
PID used for verification: 55376
Process: python3 -m http.server 8767 --bind 127.0.0.1
Working directory: /home/alex/hacksmarter-labs/ui
HTTP status before shutdown: 200
```

### 3. Desktop launcher and pinned dash icon

- Created a dedicated desktop launcher:
  `/home/alex/.local/share/applications/hacksmarter-labs.desktop`.
- Pinned `hacksmarter-labs.desktop` to the GNOME dash.
- Configured it to run this course's `bin/launch.sh`.
- Clicking the icon starts the server when needed and opens the course URL.

### 4. Hack Smarter logo integration

- Used the user-provided geometric `M` image as the source.
- Removed the original white canvas and produced a true-alpha PNG.
- Replaced the old shield in the application header.
- Reused the logo as the browser favicon and GNOME dash icon.
- Brightened the dark navy portions to vivid blue for visibility against the
  near-black header while preserving the orange chevron.
- Verified transparent corners, clean rendering, and HTTP asset delivery.

Final assets:

- Project/web asset: `ui/assets/hacksmarter-logo.png`
- Installed dash icon:
  `/home/alex/.local/share/icons/hacksmarter-labs.png`

### 5. Publication branding

- Replaced all references to the previous publication brand with:
  **Hack Smarter Labs**.
- Updated the browser title, header wordmark, app switcher heading, legal
  footer, README, runtime brand constant, architecture plan, and handoff.
- Verified zero case-insensitive matches for the previous publication name in
  the working project outside Git history.

### 6. Neutral simulator navigation terminology

The outer application launcher now uses general industry terminology:

| Previous label | Current simulator label |
|---|---|
| Foundry | AI Foundry |
| Azure | Cloud Console |
| Copilot Studio | AI Agent Studio |
| Data Explorer | Data Explorer |
| Defender | XDR Security |
| DevOps | DevOps |
| Entra | Identity & Access |
| Fabric | Data Fabric |
| GitHub | Code Repository |
| Intune | Endpoint Management |
| 365 Admin | Workspace Admin |
| Power Automate | Workflow Automation |
| Power Platform | Low-Code Platform |
| Purview | Data Governance |
| Visual Studio Code | Code Studio |
| Sentinel | SIEM & SOAR |

The top context tabs, workload title, browser context title, current-workload
highlight, and XDR home breadcrumb were updated to the same neutral vocabulary.
Routes and workflow behavior were not changed.

### 7. AI handoff documentation

- Added `PROJECT_GUIDE_FOR_AI.md` with architecture, runtime flow, key files,
  state conventions, desktop integration, verification commands, known issues,
  and safe modification practices.
- Updated that guide to establish general SOC Analyst work as the current
  teaching purpose.
- Marked inherited certification documents as legacy references rather than
  current scope authorities.

### 8. Learner-facing neutral terminology

- Added a centralized presentation layer that converts inherited vendor labels
  into transferable industry terminology without renaming compatibility-critical
  routes, storage keys, functions, or fixture schemas.
- Renamed **Security Copilot** to **AI Security Agent** throughout the rendered
  experience, including page titles, navigation, the embedded panel, standalone
  workspace, tooltips, and accessibility labels.
- Replaced Microsoft ecosystem labels with neutral categories such as **XDR
  Security**, **SIEM & SOAR**, **Cloud Security**, **Identity & Access**, **Data
  Governance**, **Endpoint Management**, and **Workspace Admin**.
- Standardized the fictional tenant as **Hack Smarter Labs** and migrated its
  identities to the reserved `hacksmarterlabs.example` domain in source
  fixtures, learner-visible content, form values, and cross-linked workflows.
- Audited all 103 unique navigation routes and all 110 registered views in a
  real browser. Visible text, hidden panel text, accessibility attributes,
  tooltips, placeholders, and form values contain zero matches for the targeted
  targeted vendor and legacy-tenant vocabulary.

### 9. Final tenant fixture migration

- Migrated all 453 legacy tenant-name references across application fixtures,
  views, actions, identifiers, and supporting documentation.
- Replaced the temporary generic presentation label with the confirmed
  **Hack Smarter Labs** identity.
- Normalized tenant email and directory domains to
  `hacksmarterlabs.example`.
- Updated lowercase resource identifiers to the stable `hacksmarterlabs`
  token and the directory account domain to `HACKSMARTERLABS`.
- Retained a compatibility-only runtime rule that converts values saved by an
  older browser session to the final tenant name and domain.
- Verified the final header as `Hack Smarter Labs · Tenant`, checked the
  promptbook route, and stopped the temporary verification server.

### 10. Generic local-user identity

- Replaced the personalized analyst username across incident ownership, audit
  history, cases, automation, operator fields, and remediation fixtures with the
  stable label **Me**.
- Changed the header avatar to **ME** with a **Me** tooltip and removed the
  personalized first-name greeting.
- Renamed unrelated fictional identities that shared the same first name so
  they cannot be mistaken for the course user's identity.
- The interface uses the fixed self-reference **Me**, so it requires no
  current-user lookup or identity refresh.

## Current technical state

The application remains a static single-page app built with vanilla HTML, CSS,
and JavaScript. It has no package install, build step, framework, backend,
authentication, or live cloud connection.

Current route inventory:

| Workload key | Navigation entries |
|---|---:|
| `defender` | 47 |
| `sentinel` | 28 |
| `defender-cloud` | 14 |
| `purview` | 13 |
| `copilot` | 6 |
| `entra` | 3 |
| `m365-admin` | 8 |

The internal route keys retain inherited names for compatibility. They are not
the user-facing simulator labels and should not be renamed without a complete
route and storage migration.

Latest automated verification:

```text
JavaScript syntax checks: pass
HTTP response on port 8767 before final shutdown: 200
Registered views: 110
Views rendering cleanly: 109
Dead navigation routes: 0
Known renderer warning: purview/audit — tiny/empty render
Git diff whitespace check: pass
```

The `purview/audit` renderer warning predates the recent branding, logo, port,
and navigation changes. No new renderer regressions were introduced.

## Important remaining terminology work

### Compatibility-only source identifiers

Inherited route names, CSS hooks, JavaScript symbols, storage keys, and some raw
fixture identifiers still retain historical product-oriented names. They are
not learner-visible: `ui/neutral-terminology.js` converts all rendered text and
accessibility metadata to neutral terminology. Renaming these internal contracts
would require a separate route/state migration and is not needed for publication.

### Inherited SC-200 wording

The publishable UI still contains inherited `SC-200` teaching labels in a
small number of view callouts, comments, and secondary surfaces. The general
SOC Analyst scope means those should become role-based wording such as:

- SOC analyst decision point
- Investigation checkpoint
- Response workflow
- Detection engineering exercise
- Supporting security-operations context

This work has not yet been performed in the interactive UI. It should be a
focused content pass so technically useful exercises are preserved while
certification-specific framing is removed.

### Vendor-specific technical schemas

Some inherited query tables and evidence fields model vendor-specific technical
schemas. The interface presents them with generic workflow labels while keeping
the underlying mock evaluator stable. Generalize a schema only when the matching
fixtures, saved queries, result sets, and exercises can be migrated together.

## Recommended next work

1. Remove remaining SC-200 wording from the publishable UI and replace it with
   general SOC Analyst competency language.
2. Define a general SOC Analyst curriculum map covering:
   - alert intake and prioritization;
   - incident triage and case ownership;
   - evidence, entity, and timeline analysis;
   - endpoint and identity response;
   - threat hunting and query reasoning;
   - detection creation and tuning;
   - SIEM/SOAR investigation and automation;
   - cloud and SaaS investigation;
   - data protection and insider-risk response;
   - documentation, escalation, and shift handoff.
3. Use that curriculum map—not `ExamObjectives.md`—to decide future features.
4. Fix or formally retire the `purview/audit` mechanical renderer warning.
5. Perform a fresh visual walkthrough at 1366×768 and a larger desktop
   resolution after future layout changes.

## Current working-tree note

The branding, port, logo, launcher terminology, documentation, and related
changes are currently working-tree changes. Do not reset, discard, or overwrite
them. Inspect `git status` and the diff before any new implementation work.

## Quick start for the next person or AI

```bash
cd "/home/alex/hacksmarter-labs"
./bin/launch.sh
```

Open:

```text
http://127.0.0.1:8767/
```

Validate:

```bash
node --check ui/data.js
node --check ui/views.js
node --check ui/app.js
node bin/render_all.js
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8767/
```

Read `PROJECT_GUIDE_FOR_AI.md` next for the full architecture and safe-change
workflow.
