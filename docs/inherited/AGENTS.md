# SC-200_lab — legacy per-agent task plan

> **Current status:** This file records work inherited from the source lab.
> Current course direction is general SOC Analyst training. Read
> `LATEST_PROGRESS.md` before using any historical task or certification scope
> below. The safety rules at the end remain applicable.

Tasks divided by agent strength. Each agent should read `SC200_LAB.md`
(master), `ExamObjectives.md` (scope), and `HANDOFF.md` (sprint state)
before starting. Hard rules from `SC200_LAB.md` apply to all agents —
especially: **no copying Microsoft proprietary HTML/CSS/JS, ever**;
look-alike from scratch only.

When you finish a task, mark it `[x]` here AND update `HANDOFF.md`.

---

## Agent A — Codex CLI (heavy code lifting)
Best for: writing lots of structured JS/HTML quickly, mock data
generation, expanding view functions, refactoring.

- [x] **A1. Smoke-test pass.** Walk every route listed in
  `ExamObjectives.md` at `http://127.0.0.1:8765/`. Open Firefox devtools.
  For each route, record: render OK? console errors? broken inline
  handlers? File one fix-PR-style commit per cluster of related bugs.
- [x] **A2. Build missing views.** These routes are in `NAV` but the
  view function is either thin or absent — flesh them out following the
  existing `VIEWS[...]` pattern in `ui/views.js`:
  - `sentinel/workbooks` (add 2–3 sample workbook detail panels)
  - `sentinel/automation` → playbook detail side panel
  - `defender-cloud/alerts` (expand with 8–10 alerts, severities mixed)
  - `purview/information-protection` → label-policy detail
  - `purview/audit` → wire the search form to filter `AUDIT_LOG`
- [x] **A3. Mock data expansion.** Grow `ui/data.js`:
  - 5 more incidents covering the remaining scenario archetypes in
    `ExamObjectives.md` (ransomware, AiTM phishing, container breakout,
    AAD risky sign-in, S3-style cloud misconfig)
  - 4 more saved KQL queries with matching fixture rows in
    `MOCK_QUERY_RESULTS`
  - Sentinel Graph entity-graph data shape (nodes/edges) for one incident
- [x] **A4. KQL runner upgrade.** In `runKqlQuery()` (currently in the
  hunting view's `onMount`), parse the leading table name AND a simple
  `where field == "value"` clause; filter the fixture rows accordingly.
  Document the supported subset in a comment.

Agent A note, 2026-06-28: route smoke passed with headless Chrome
`--dump-dom` and Firefox headless screenshots for every NAV route. This
directory is not a Git repository, so fix-PR-style commits could not be
created here.

## Agent B — Claude (me, or another Claude session)
Best for: design polish, UX coherence, IP-sensitive judgment calls,
prose, memory/handoff hygiene.

- [x] **B1. Scenario walkthrough mode.** Add a "Guided scenario" picker
  on the Defender home that walks the user through one of the
  archetypes in `ExamObjectives.md` step-by-step (open this alert →
  inspect that entity → create suppression rule with these conditions
  → observe result). Implement as a thin overlay/coach-mark layer on
  top of the existing views; no view rewrites.
- [x] **B2. Copilot side panel stub.** Add a right-edge "Security
  Copilot" slide-in panel reachable from the topbar sparkle button.
  Hard-code 4 sample prompts and canned answers (incident summary,
  KQL drafting, entity expansion, MITRE mapping). All static.
- [x] **B3. Visual QA pass.** Walk the lab in Firefox at 1366×768 and
  1920×1080. Catch alignment drift, contrast on dark-themed top bars,
  side-panel scroll behavior on long content.
- [x] **B4. README + HANDOFF refresh** at end of each sprint
  ([[feedback_sprint_handoff]]).

## Agent C — Explore / research subagent
Best for: read-only verification against current SC-200 syllabus and
Microsoft Learn modules.

- [x] **C1. Syllabus drift check.** Compare `ExamObjectives.md`
  against the latest published SC-200 study guide on
  `learn.microsoft.com`. Note any objectives we've missed or any that
  have been removed since 2026-04-16. Report findings in a new
  `OBJECTIVES_DELTA.md` — do NOT edit `ExamObjectives.md` directly.
  *Reminder:* do not copy text wholesale; summarize in our own words.
- [x] **C2. Scenario validation.** For each of the 10 archetypes in
  `ExamObjectives.md`, confirm it maps to real Microsoft Learn
  module content. Flag any that look invented.

## Agent D — Verify / smoke-test (lightweight, optional)
Run after every meaningful change.

- [ ] **D1.** `python3 -m http.server` is up; `curl -sS
  http://127.0.0.1:8767/ -o /dev/null -w "%{http_code}\n"` returns 200.
- [ ] **D2.** Open Firefox to `/`, hard-refresh, confirm:
  default route loads Defender home; waffle opens app switcher; each
  workload reachable; alert detail panel opens; suppression rule save
  re-renders alerts; "Replay scenario events" works.
- [ ] **D3.** `localStorage.getItem('defender-lab.rules')` is populated
  after saving a rule and survives a hard refresh.

---

# Sprint 2 — close the OBJECTIVES_DELTA gaps (added 2026-07-06)

Numbered agents, one per surface, parallelizable. Each bullet in
`OBJECTIVES_DELTA.md` § "Missing or under-specified objectives" carries its
`[Agent N]` label. 9 agents total = 100% delta coverage. Same reading order
and hard rules as above. Mark `[x]` here and update `HANDOFF.md` when done.

## Agent 1 — Objectives doc sync (docs only, small)
- [x] **1.1** Update `ExamObjectives.md` to reference the 2026-06-26 Learn
  page and the July 28, 2026 skill outline; add explicit skill weights
  (40-45 / 35-40 / 20-25).
- [x] **1.2** Add Azure cloud services to the candidate familiarity list.
- [x] **1.3** Add all `OBJECTIVES_DELTA.md` missing objectives as concise
  bullets (own words, no Learn text copied).
- [x] **1.4** Re-label Defender for Cloud posture + Purview DLP/Insider Risk
  scenarios as supporting study content per the delta's de-emphasis notes.

## Agent 2 — Defender XDR/MDE settings & automation
- [x] **2.1** `#/defender/settings` surface: MDE advanced features toggles,
  rules settings, custom data collection, device groups, permissions/roles,
  automation levels per group.
- [x] **2.2** ASR policy configuration view (audit vs block modes,
  per-rule states, exclusions).
- [x] **2.3** Email notification rules for incidents, actions, and threat
  analytics (create-notification flow, lab-static).
- [x] **2.4** Alert correlation/tuning beyond suppression: show how alerts
  roll into incidents and a tuning-rule surface.
- [x] **2.5** AIR (automated investigation & response) center + automatic
  attack disruption explanation surface with a disrupted-incident example.

## Agent 3 — MDE device response deepening
- [x] **3.1** Live response: replace the toast stub with a lab console
  (canned `dir`/`getfile`/`run` transcript, session log).
- [x] **3.2** Investigation package: replace toast stub with collection
  flow + package-contents explainer (what's in the ZIP, when to use it).
- [x] **3.3** Tag an incident as "Attack disruption" with the contain-user /
  contain-device automatic actions shown on the timeline.
- [x] **3.4** Burn down the `DEVICE_PAGE_PARITY.md` gap list (response-action
  strip gaps, internet-facing tag, flag column, process tree, Effective
  settings tab).

## Agent 4 — Sentinel ingestion (connectors + DCR family)
- [x] **4.1** Windows Security Events via AMA lab: content-hub solution →
  connector → DCR with event-set/xPath scoping, mirroring the Syslog lab
  pattern at `app.js:1495`.
- [x] **4.2** CEF via AMA lab (connector row already exists in
  `data.js:1096`; build the workflow + `CommonSecurityLog` fixture rows).
- [x] **4.3** Windows Event Forwarding planning study card (WEF vs AMA,
  when each applies).
- [x] **4.4** Azure Activity collection via Azure Policy / diagnostic
  settings workflow.
- [x] **4.5** Logs Ingestion API custom-table lab: app registration +
  Monitoring Metrics Publisher role, DCE vs DCR direct endpoint,
  `streamDeclarations`/`transformKql`, `Custom-` vs `Microsoft-` streams,
  creating a `_CL` table. (The gap Alex spotted 2026-07-06.)

## Agent 5 — Sentinel data platform & hunting infrastructure
- [x] **5.1** Extend table-plan cards with Data lake tier and XDR-tier
  retention; retention decision guidance (Analytics vs Data lake vs XDR).
- [x] **5.2** SOC optimization page (coverage + data-value recommendations).
- [x] **5.3** Summary rule tables lab (aggregate a noisy table into a
  summary table, query both).
- [x] **5.4** Sentinel KQL jobs in Data lake (long-running job → results
  table, contrast with the existing Basic-table search job).
- [x] **5.5** Build `#/sentinel/notebooks` — nav link at `data.js:1845` is
  currently a dead route. Include Sentinel MCP Server connection notes.

## Agent 6 — Detection engineering completion
- [x] **6.1** Add rule-type chooser to the analytics wizard: NRT (with its
  limits), Threat intelligence, ML behavior analytics (Fusion), alongside
  the existing scheduled type.
- [x] **6.2** Sentinel anomalies page (customizable anomaly rules, how they
  feed hunting/detections).

## Agent 7 — Incident response surfaces
- [x] **7.1** Defender for Cloud Apps investigation surface: risky OAuth
  app investigation tied to the existing phishing→OAuth incident.
- [x] **7.2** Entra ID compromised-identity investigation view (risky
  sign-ins, risk detections, confirm-compromise/dismiss actions) tied to
  the existing risky sign-in incident.
- [x] **7.3** Case management: Sentinel/Defender cases with tasks,
  assignment, linked incidents.
- [x] **7.4** Sentinel incidents viewed through the Defender XDR lens
  (unified queue callouts on `#/sentinel/incidents`).
- [x] **7.5** Upgrade Copilot panel: one guided agentic investigation flow
  (multi-step plan → tool calls → verdict), still fully static.
- [x] **7.6** Dedicated Sentinel Graph view rendering the existing INC-1042
  node/edge fixtures (entity relationship analysis).

## Agent 8 — M365 investigation & threat analytics depth
- [x] **8.1** Microsoft Graph activity logs: fixture table + hunting rows +
  where-it-lives guidance (enable via diagnostic settings).
- [x] **8.2** Threat analytics depth: 2–3 report detail pages (overview,
  analyst report, related incidents, exposure) + interpretation guidance —
  route exists at `views.js:722` but is thin.
- [x] **8.3** eDiscovery Content search workflow inside
  `#/purview/ediscovery` (build search → preview → export for
  investigation).

## Agent 9 — QA / verify sweep (run last)
- [x] **9.1** Old Agent D checklist (D1–D3): server 200, full click-through,
  `defender-lab.rules` localStorage survives hard refresh.
- [x] **9.2** All nav routes render — especially the new Sprint 2 routes and
  the previously dead `#/sentinel/notebooks`.
- [x] **9.3** Browser passes from `HANDOFF.md` § Next useful work
  (custom-detections/hunting-graph overflow at 1366×768, analytics wizard
  entity picker, copy buttons, Purview DLP→IRM→eDiscovery walk).
- [x] **9.4** Update `HANDOFF.md` and mark Sprint 2 boxes here.

## Agent 10 — dead-route triage (added 2026-07-06 after Sprint 2 launch)
29 NAV routes in `ui/data.js` have no `VIEWS[...]` entry and render "Page
not found" (found via nav-vs-views sweep). The Sprint 2 agents built the
delta objectives but never audited existing nav links.
- [x] **10.1** Enumerate every NAV route missing from `VIEWS` (compare
  `route:'#/...'` entries in `ui/data.js` against `VIEWS['...']` in
  `ui/views.js`). Nothing may 404 when this task is done.
- [x] **10.2** Build a FULL `#/sentinel/workspace-manager` view — Alex
  flagged this as vital: the central landing surface for managing and
  distributing analytics rules and DCR-backed content across workspaces.
  Include: member workspace list, content selection (analytics rules,
  hunting queries, workbooks, automation), publish/last-publish status,
  and cross-links to `#/sentinel/analytics` and the DCR workflows in
  `#/sentinel/data-connectors`.
- [x] **10.3** Build real views for the other exam-relevant dead routes per
  `ExamObjectives.md`/`OBJECTIVES_DELTA.md`: Action center (ties into the
  AIR surface from Agent 2), Email & collaboration (MDO investigation),
  Entity behavior (UEBA), Watchlist, Sentinel settings (UEBA enablement),
  Sentinel search, Defender for Cloud inventory + attack paths.
- [x] **10.4** For genuinely chrome-only routes (community, news, trials,
  learning hub): render a small original "secondary surface" page stating
  it's supporting content, with pointers to the related core surface.

## Agent 11 — SC-200 Learn-link coverage sweep (read-only report)
Authoritative corpus: `/home/alex/sc-200_app/sc-200_microsoft_learn_links.txt`
(curated official-only SC-200 link index, 2026-07-03, sectioned by topic).
- [x] **11.1** For each section/topic in the link index, assess lab
  coverage: full (interactive surface exists), partial (fixture or study
  card only), missing.
- [x] **11.2** Write `COVERAGE_SWEEP.md` at the repo root: a
  covered/partial/missing table per topic with the lab route(s) that
  cover it, plus a ranked list of the biggest remaining gaps.
- [x] **11.3** Do NOT copy Learn text. Do NOT edit ui/ files — report only.

## Agent 12 — Security Copilot standalone portal (GAP_BRIDGE wave, L)
The largest corpus gap: 800+ chunk-level mentions, zero lab surface (see
`GAP_BRIDGE_FINDINGS.md`). Build Security Copilot as a FIFTH workload:
add a `copilot` entry to `PORTALS` in `data.js` (suggested color
`#7a7574`-family or a distinct teal/violet, initial `SC`), a NAV section,
and views for every route. All content original, own words, fully local.
Verified fixture drafts exist in `local-tasks/out/` (sessions,
transcripts, promptbooks, plugins, capacity — see
`local-tasks/README.md`): review each row for product accuracy, adapt to
`data.js` fixture style, and inline into `ui/data.js`. Do NOT
`<script>`-include the draft files and do NOT regenerate from scratch.
- [x] **12.1** `#/copilot/home` — standalone landing: prompt bar, recent
  sessions, promptbook shortcuts, "embedded vs standalone" study card
  cross-linking the existing topbar Copilot panel.
- [x] **12.2** `#/copilot/sessions` + session detail — session list
  (name, owner, workspace, last activity) and a transcript view: prompts,
  responses, which plugin/skill each step used, pin board, share/export
  controls (local only), edit + rerun a prompt.
- [x] **12.3** `#/copilot/promptbooks` — library (Microsoft vs custom
  tabs), promptbook detail (sequenced prompts, input params), a "run
  promptbook" flow producing a canned session, and a create-your-own
  builder that saves to localStorage.
- [x] **12.4** `#/copilot/plugins` — plugin manager: first-party
  (Defender XDR, Sentinel — workspace picker, Entra, Intune, MDTI),
  non-Microsoft, and custom (OpenAPI/KQL/GPT) plugins; on/off toggles,
  per-plugin setup panel, precedence note for which plugin answers.
- [x] **12.5** `#/copilot/knowledge` — knowledge base connections:
  file upload and Azure AI Search style sources, how grounding affects
  answers (study card + one canned grounded-answer example).
- [x] **12.6** `#/copilot/settings` — owner settings: SCU capacity
  provisioning + usage dashboard (units, overage, per-session burn),
  role assignment (owner/contributor), data-sharing & logging toggles,
  geo/tenant notes. Interactive sliders/toggles persisting locally.
- [x] **12.7** Wire the existing embedded Copilot panel and guided
  scenario overlay to deep-link into the matching standalone session so
  the embedded↔standalone relationship is walkable both ways.

## Agent 13 — KQL practice depth (GAP_BRIDGE wave, M/L)
Corpus: kql summarize 171, parsing 182, joins 64 chunks; lab evaluator
covers only canned basics. Extend hunting surfaces, don't fork them.
- [x] **13.1** Extend the local mock evaluator (`app.js` hunting
  executor) to genuinely evaluate over fixture rows: `union`, `join`
  (inner/leftouter at minimum), `summarize` with `bin()`, `dcount()`,
  `arg_max()`, `parse`/`extract()`/`parse_json()`/`split()`, `let`
  bindings, and `externaldata` (serve a tiny local CSV fixture).
- [x] **13.2** `render` operator support: `timechart`/`barchart`/
  `piechart` results draw a simple original CSS/SVG chart in the results
  pane on `#/sentinel/logs` and `#/defender/hunting`.
- [x] **13.3** A guided KQL exercise set (8–12 tasks: filter → project →
  summarize → join → parse → render) with check-my-answer against
  expected row counts, surfaced from `#/sentinel/logs`.
- [x] **13.4** ASIM beyond DNS: add `imAuthentication` and
  `imNetworkSession` parser-style hunting pages/fixtures mirroring
  `#/sentinel/hunting/dns`, plus a normalization study card comparing
  source columns → ASIM columns.

## Agent 14 — Sentinel hunting operations (GAP_BRIDGE wave, M)
Bookmarks/livestream/restore are exam objectives with no lab controls.
- [x] **14.1** Bookmarks: "Add bookmark" on hunting query results
  (captures query, result row, entity mapping, tags, MITRE technique),
  a bookmarks tab on `#/sentinel/hunting`, and promote-to-incident /
  add-to-existing-incident actions.
- [x] **14.2** Livestream: start a livestream from a hunting query —
  simulated ticking new rows (setInterval over fixtures), pause/stop,
  and "elevate to alert" creating an analytics rule stub.
- [x] **14.3** Restore historical data: from `#/sentinel/search`, a
  restore job on a Data-lake/long-retention table → job status →
  restored `_RST` table queryable in `#/sentinel/logs`, with cost/scope
  notes in own words.
- [x] **14.4** Entity-trigger playbooks: "Run playbook (entity)" action
  on an entity in the incident side panel / `#/sentinel/entity-behavior`,
  wired to a new entity-trigger playbook in `#/sentinel/automation`.

## Agent 15 — Defender Vulnerability Management workflow (GAP_BRIDGE wave, M/L)
Corpus 307 mentions vs 13 in lab; today only exposure/recommendation
context exists. Build the TVM suite under the Defender workload.
Verified TVM fixture drafts: `local-tasks/out/t06-tvm.js` (see
`local-tasks/README.md` merging rule).
- [x] **15.1** `#/defender/vulnerabilities` dashboard — exposure score
  trend, top security recommendations, top vulnerable software, exposed
  devices; cross-link `#/defender/exposure`.
- [x] **15.2** Software inventory + weaknesses: software list (version,
  weakness count, exposed devices) → software detail with CVE list; CVE
  detail (CVSS, exploit-available flag, affected devices).
- [x] **15.3** Security recommendations → "Request remediation" flow
  (ticket with due date, Intune-handoff note) and a remediation
  activities tracker with progress.
- [x] **15.4** Exceptions workflow: file an exception on a
  recommendation (justification, scope: device group, expiry) and show
  its effect on the recommendation list.
- [x] **15.5** Surface device-level TVM tab on `#/defender/device`
  (installed software, discovered vulnerabilities for that device).

## Agent 16 — Defender for Cloud multi-cloud onboarding (GAP_BRIDGE wave, M)
GCP 209 / AWS 82 corpus mentions; lab has only setup context cards.
Verified fixture drafts: `local-tasks/out/t07-multicloud.js` (see
`local-tasks/README.md` merging rule).
- [x] **16.1** AWS connector onboarding lab in
  `#/defender-cloud/environment`: create connector wizard (account ID,
  regions, plans selection CSPM/Servers/Containers/Databases,
  CloudFormation-style template step described in own words, connector
  health states).
- [x] **16.2** GCP connector onboarding lab, same wizard shape
  (project ID, Cloud Shell script step in own words, plan toggles,
  health/errors).
- [x] **16.3** Onboarded AWS/GCP resources appear in
  `#/defender-cloud/inventory` and generate 1–2 multi-cloud alerts in
  `#/defender-cloud/alerts` + one multi-cloud attack path.
- [x] **16.4** File integrity monitoring surface (enable on a plan,
  monitored entities, change events table) + JIT VM access study card
  with a request-access mock.

## Agent 17 — Purview Audit Premium + MDO Threat Explorer (GAP_BRIDGE wave, M)
Verified fixture drafts: `local-tasks/out/t08-audit-premium.js` and
`t09-threat-explorer.js` (see `local-tasks/README.md` merging rule).
- [x] **17.1** Audit (Premium) depth on `#/purview/audit`: standard vs
  premium comparison card, audit retention policies tab (create policy:
  users/record types/duration/priority), long-retention search behavior.
- [x] **17.2** Audit export flow (search → export rows, size/limit
  notes) and Copilot-interaction audit events as searchable fixture rows
  (`CopilotInteraction` record type).
- [x] **17.3** Threat Explorer view inside `#/defender/email-collab`:
  malware/phish/campaign pivots, top targeted users, email entity detail
  (headers summary, verdicts, delivery/ZAP actions), remediate-selected
  mock flow.

## Agent 18 — Multi-workspace / multi-tenant operations (GAP_BRIDGE wave, M)
Verified fixture drafts: `local-tasks/out/t10-mssp-mto.js` (see
`local-tasks/README.md` merging rule).
- [x] **18.1** MSSP / Azure Lighthouse lab on
  `#/sentinel/workspace-manager`: delegated customer tenants list,
  cross-tenant workspace switcher mock, what Lighthouse delegates vs
  what B2B is needed for (own words), cross-workspace `workspace()`
  query example wired into `#/sentinel/logs`.
- [x] **18.2** Defender multi-tenant management (MTO) surface reachable
  from `#/defender/settings` or its own route: consolidated incidents
  across two fictional tenants, tenant switcher, MTO vs single-tenant
  scoping notes.
- [x] **18.3** Data platform depth cards on `#/sentinel/logs`: Azure
  Data Explorer integration (when to mirror/export to ADX) and
  Basic/Auxiliary tier query limitations (KQL limits, per-query charge
  model in concept form) with one runnable limited-query example.

## Agent 19 — GAP_BRIDGE QA / verify sweep (run last)
- [x] **19.1** Nav-vs-views sweep: every `route:'#/...'` in `data.js`
  resolves to a `VIEWS[...]` entry — zero 404s, including all new
  Copilot workload routes.
- [x] **19.2** `node --check` on data.js/views.js/app.js; headless-Chrome
  click-through of every route added by Agents 12–18; console clean.
- [x] **19.3** State checks: promptbook builder, bookmarks, restore
  jobs, SCU settings survive a hard refresh (localStorage).
- [x] **19.4** KQL evaluator regression: the pre-existing canned queries
  on `#/defender/hunting` and `#/sentinel/logs` still run after 13.1.
- [x] **19.5** Update `HANDOFF.md` and mark Agent 12–19 boxes.

## Agent 20 — breadcrumb sync after the 2026-08-05 nav restructure (S)

Context: `NAV.defender` in `ui/data.js` was restructured on 2026-08-05 to match
the real Defender portal. Read **`NAV_SPEC.md`** first — it is the verified
source of truth for section parentage, with per-row Microsoft Learn citations.
Ten views still render a `breadcrumb` naming their pre-restructure section.

Rules for this agent:
- Change **only** the breadcrumb string in each view. Do not touch nav entries,
  routes, page titles (`<h1>`), or layout.
- Breadcrumb format already in use is `Section › Subsection › <strong>Page</strong>`.
  Keep the existing `<strong>` on the final segment where the view has one.
- Do not invent section names. Use exactly the section/subsection labels that
  `NAV.defender` gives for that route.
- `NAV_SPEC.md` records that section *ordering* is a reasoned choice, not a cited
  fact. You are syncing names only; do not reorder anything.

- [x] **20.1** `defender/secure-score` — `Configuration ›` → `Exposure management ›`
- [x] **20.2** `defender/exposure` — `Defender ›` → `Exposure management ›`
- [x] **20.3** `defender/vulnerabilities` — `Endpoints ›` → `Exposure management ›`
- [x] **20.4** `defender/endpoints` — `Configuration ›` → `Endpoints ›`
- [x] **20.5** `defender/email-collab` — `Configuration ›` → `Email & collaboration ›`
- [x] **20.6** `defender/cloud-apps` — `Configuration ›` → `Cloud apps ›`
- [x] **20.7** `defender/settings` — `Configuration ›` → `System ›`
- [x] **20.8** `defender/mto` — `Configuration ›` → `System ›`
- [x] **20.9** `defender/notifications` — `Configuration ›` → `System ›`
- [x] **20.10** `defender/suppression` — `Configuration ›` → `System ›`
- [x] **20.11** Re-run the audit below; it must report `stale: 0`. Then
  `node --check ui/views.js` and `node bin/render_all.js` (expect
  `dead NAV routes: 0`; the `purview/audit` tiny-render failure is
  pre-existing and unrelated — leave it).

Audit command (also in `NAV_SPEC.md`):

```bash
node -e "
const fs=require('fs');
const src=fs.readFileSync('ui/views.js','utf8');
const NAV=(0,eval)(fs.readFileSync('ui/data.js','utf8')+'; NAV');
const navPath={};
for(const wl of Object.keys(NAV)){let sec=null,sub=null;
  for(const i of NAV[wl]){
    if(i.section){sec=i.section;sub=null;continue}
    if(i.subsection){sub=i.subsection;continue}
    if(i.route)navPath[i.route.replace('#/','')]={wl,sec,sub};}}
const marks=[...src.matchAll(/VIEWS\['([^']+)'\]/g)].map(m=>({route:m[1],idx:m.index}));
let stale=0;
for(let i=0;i<marks.length;i++){
  const body=src.slice(marks[i].idx,i+1<marks.length?marks[i+1].idx:src.length);
  const bc=body.match(/breadcrumb\">([^<]*)</); if(!bc)continue;
  const crumb=bc[1].replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  const n=navPath[marks[i].route];
  if(!n||n.wl!=='defender'||!n.sec)continue;
  if(marks[i].route==='defender/home')continue;
  if(!(crumb.includes(n.sec)||(n.sub&&crumb.includes(n.sub)))){
    stale++;console.log('  '+marks[i].route+': \"'+crumb+'\" should name \"'+[n.sec,n.sub].filter(Boolean).join(' > ')+'\"');}}
console.log('stale: '+stale);
"
```

Note: `defender/home` is excluded — it is the top-level Home item and sits in no
section, so its `Defender ›` breadcrumb is correct.

---

## Rules for every agent
1. **No proprietary Microsoft code** in this repo. Visual references
   are fine to look at; copy/paste/near-copy is not. All chrome is
   built from scratch in `styles.css`.
2. **No build step.** Vanilla HTML/CSS/JS. The lab must run from
   `python3 -m http.server` with no install.
3. **No real auth, no real network calls.** Everything is in-memory
   or `localStorage`.
4. **No secrets in any file** ([[feedback_cyber_hygiene]]). The fake
   hashes in `data.js` are `aaa…`, `bbb…`, `ccc…` for a reason.
5. **Terse comms** ([[feedback_style]]). End-of-turn: 1–2 sentences.
6. **Sprint handoff** at end of session — update `HANDOFF.md`
   ([[feedback_sprint_handoff]]).
