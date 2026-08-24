# Phase B — Evidence-gathering tabs (Email, AI Activity, Identity, Data Access, Network)

Self-contained build brief. This is Phase B of the approved plan at
`/home/alex/.claude/plans/quizzical-petting-giraffe.md` — read that file first for full context
on why this lab exists and how it's phased. This doc only covers Phase B in enough detail to
build it without re-deriving the earlier decisions.

## What already exists (Phase A, shipped and verified)

Repo: `/home/alex/promptware-kill-chain`. Dev/serve: `hacksmarter-labs/bin/dev.sh` serves
`dist/` on `http://127.0.0.1:8777/`; rebuild with `npm run build` in this repo after changes,
then reload — no restart needed.

- **Content** — `src/content/killChainCase.js` exports everything Phase B tabs need to render:
  `CASE` (org/agent/baseline-vs-incident numbers), `ALERT`, `EVENTS` (flat telemetry, 60 events,
  filterable by `source`), `EMAIL` (raw/headers/attachments/aiExtracted/injectedSpan),
  `AI_CONTEXT` (context sources with `trust` + a `toolCalls` trace), `IDENTITY_PERMS`
  (`svc-aria-prod`'s assigned permissions), `EVIDENCE_CATALOG` (12 curated evidence cards —
  Phase C consumes these for the evidence board, but Phase B's "mark as evidence" actions write
  into the same `markedEvidence` bucket), `STAGE_QUESTIONS` (per-stage MC judgment questions,
  keyed by stage id).
- **State** — `src/state/KillChainContext.jsx`, `useKillChain()` hook giving `{ state, dispatch,
  resetSession }`. Actions already implemented and ready to use in Phase B:
  - `TOGGLE_TRUST_BOUNDARIES` — flips `state.showTrustBoundaries` (AI Activity tab).
  - `MARK_EVIDENCE({ evidenceId })` — sets `state.markedEvidence[evidenceId] = true`.
  - `SET_CLAIM({ claimId, verdict })` — for benign/injection-style calls on a piece of content.
  - `SET_INSTRUCTION_TYPE({ optionId })` — Email tab's Prompt Analysis classification.
  - `ANSWER_STAGE_QUESTION({ stageId, optionId })` — records an MC answer against
    `STAGE_QUESTIONS[stageId]`.
  - `ADD_TO_REPORT({ kind, refId, label, chosenOptionId? })` — appends to the Incident Report
    drawer (`kind` is `'evidence' | 'finding' | 'answer' | 'field'`; dedupes on
    `kind`+`refId`, so calling it twice for the same thing is harmless).
  Grading (the little red "bump" on a wrong report entry) happens later, in Phase C, when a
  stage's notebook is saved — Phase B just needs to call `ADD_TO_REPORT` correctly; it does not
  grade anything itself.
- **UI shell** — `src/pages/InvestigationPage.jsx` renders the persistent kill-chain rail
  (`KillChainRail.jsx`), the tab strip, and the `ReportDrawer.jsx`. Each tab is its own component
  under `src/components/killchain/tabs/`, switched on `state.activeTab` in `InvestigationPage`'s
  `renderTab()`. **`OverviewTab.jsx` and `TimelineTab.jsx` are the reference pattern** — read
  both before starting; every new tab should look like a sibling of these, not a new paradigm.
  The 7 not-yet-built tabs currently render `<TabStub label="..." />` — replace those five
  `case` lines in `renderTab()` (`email`, `ai-activity`, `identity`, `data-access`, `network`)
  with the new components; leave `evidence` and `kill-chain` as stubs, those are Phase C.
- **CSS** (`src/styles.css`) — reuse, don't reinvent: `.card`, `.legend`/`.legend-grid`/
  `.legend-item`, `.artifact-grid`/`.artifact-card`/`.artifact-label`/`.artifact-list`,
  `.panel-title`/`.subhead`/`.field-label`, `.pill`/`.pill.is-on`, `.btn`/`.btn-primary`/
  `.btn-link`, `.verdict-chip`/`.verdict-chip.is-on` (built for exactly this — a clickable MC
  option card), `.alert-table` (+ `.kc-table-wrap` for horizontal scroll), `.sev-badge`,
  `.status`. Kill-chain-specific additions from Phase A: `.kc-tab-pane` (wrap every tab's root
  in this), `.kc-rail`/`.kc-rail-stage`, `.tab-strip`/`.tab-btn`, `.report-drawer` family. Don't
  add new top-level page chrome — everything here is inside the existing `.kc-tab-pane`.

## Goal

Build the five data-gathering tabs. Each surfaces its slice of evidence, lets the student mark
things as evidence / classify them, and offers an explicit **"Add to Incident Report"** button
next to each meaningful action — this is the "student builds the report as they go" mechanic the
project owner asked for. Do not auto-add anything to the report; it's opt-in per finding.

### 1. Email tab (`EmailTab.jsx`) — spec §6, §7

- View toggles: **VIEW RAW MESSAGE** (`EMAIL.raw`) / **VIEW AI-EXTRACTED CONTENT**
  (`EMAIL.aiExtracted`) / **VIEW HEADERS** (`EMAIL.headers`, render as a key/value table) /
  **VIEW ATTACHMENTS** (`EMAIL.attachments`). Default view: raw.
- Do **not** auto-highlight `EMAIL.injectedSpan`. Let the student select text or click
  "mark this passage" in the AI-extracted view; a simple approach that satisfies the spec
  without building a text-selection UI: put the AI-extracted text in a `<p>`, and give it a
  "MARK AS PROMPT INJECTION" button next to the AI-extracted view (not pre-highlighted) — the
  spec's requirement is that the student *chooses* to flag it, not that they physically select
  a span. When clicked: `dispatch({ type: 'MARK_EVIDENCE', evidenceId: 'EVID-003' })` (that's
  the catalog card for "Indirect instructions discovered") + reveal the **Prompt Analysis**
  panel described next. Also offer **ADD TO EVIDENCE** / **MARK BENIGN** / **INVESTIGATE
  SENDER** buttons per spec §6 — MARK BENIGN and INVESTIGATE SENDER can be inert/no-op besides a
  visual pressed state (there's no separate "sender investigation" data to reveal — keep it
  honest, don't fabricate a fake reveal for it).
- **Prompt Analysis panel** (spec §7): once the injected content is marked, show
  `STAGE_QUESTIONS['initial-access']` as five `.verdict-chip` options (Direct / Indirect /
  System Prompt Manipulation / Normal / Unknown). On pick: `dispatch({ type:
  'ANSWER_STAGE_QUESTION', stageId: 'initial-access', optionId })`, then a button **"Add to
  Incident Report"** that dispatches `ADD_TO_REPORT({ kind: 'answer', refId:
  'initial-access::q-instruction-type', label: '<chosen option label>', chosenOptionId })`.
  Do **not** reveal `STAGE_QUESTIONS['initial-access'].rationale`/`answer` on pick — right/wrong
  isn't shown here at all (grading happens in Phase C).

### 2. AI Activity tab (`AiActivityTab.jsx`) — spec §8

- Render `AI_CONTEXT.userRequest`, then the `sources` list and `toolCalls` trace.
- Trust levels stay hidden (just show the source label + detail) until the student clicks
  **SHOW TRUST BOUNDARIES** (`dispatch({ type: 'TOGGLE_TRUST_BOUNDARIES' })`). Once
  `state.showTrustBoundaries` is true, show each source's `trust` value as a small badge —
  reuse `.status` styling, color-code informally (HIGH = calm/accent, INTERNAL = neutral,
  EXTERNAL = warm/warn) since there's no existing "trust badge" class to reuse verbatim; adding
  one small new CSS rule here is fine and expected (this is the one tab Phase A didn't
  pre-build CSS for).
- Let the student mark any `EXTERNAL`-trust source as evidence (a small "add to evidence"
  button per source row) — this is what feeds `EVID-001`/`EVID-002` in Phase C's board. Map:
  the "External Email" source → `EVID-001`; "Vendor Attachment" → not separately cataloged,
  skip a button there or reuse `EVID-002`. Also offer "Add to Incident Report" for a finding
  like "instructions and data entered the same model context" (`kind: 'finding'`, `refId:
  'ai-context-trust-boundary'`) — free label text the tab author writes, not user input.

### 3. Identity tab (`IdentityTab.jsx`) — spec §9

- Render `IDENTITY_PERMS.assigned` as a permission list, plus `IDENTITY_PERMS.grantedAt` /
  `roleChangeEventsInWindow` framed plainly ("No role assignment events occurred in the incident
  window").
- Show `STAGE_QUESTIONS['privilege-escalation']` as four `.verdict-chip` options. Same pattern
  as the Email tab's Prompt Analysis block: dispatch `ANSWER_STAGE_QUESTION` on pick, offer
  "Add to Incident Report" (`kind: 'answer'`, `refId: 'privilege-escalation::q-privesc'`). No
  reveal of correctness here either.

### 4. Data Access tab (`DataAccessTab.jsx`) — spec §10 (repo list only — recon search-marking
lives here too since there's no separate "Reconnaissance" tab in this 9-tab set), §18

- Repository access list: filter `EVENTS` where `source === 'DATA'`, render as a table (reuse
  `.alert-table`/`.kc-table-wrap`) with a "mark as evidence" action per row for the ones tagged
  `relevant: true` in the data **only visible to you as the implementer, never branch UI logic
  on `relevant` or `killChainStage`** — every row gets the same mark-as-evidence button; the
  grading in Phase C is what tells the student whether they picked correctly, not the UI here.
- **Baseline / Anomaly panel** (spec §18): a static comparison table from `CASE.baseline` vs
  `CASE.incident` — Documents/request, Repositories/request, Tool calls/request, Cross-department
  access, External output, Executive access. Plain table, no interactivity required beyond
  existing evidence-marking on the rows above it. (This is the *static* table only — the
  interactive AI-assisted anomaly-hunting panel from spec §17/§18's "students search for
  anomalies" framing is explicitly out of scope; see `docs/hunt-dashboard-design.md`.)

### 5. Network tab (`NetworkTab.jsx`) — spec §12 (data only — the C2 judgment question itself is
Phase C, attached to the Kill Chain tab, not built here)

- Filter `EVENTS` where `source === 'NETWORK'`, render as a table, same evidence-marking
  pattern as Data Access. Make sure the `OUTBOUND_ATTEMPT` event's "ATTEMPTED, not confirmed"
  wording is visible as-is — don't paraphrase it into something more conclusive.
- No MC question on this tab. If you're tempted to add the Command & Control judgment question
  here because the evidence lives here — don't; it's explicitly scoped to Phase C so all four
  remaining stage questions (persistence, C2, lateral-movement, actions-on-objective) get built
  together against the Kill Chain tab's per-stage notebook UI, which doesn't exist yet.

## Explicitly out of scope for this doc

- The Evidence tab / evidence board (sorting cards onto kill-chain stages) — Phase C.
- The Kill Chain tab and any remaining `STAGE_QUESTIONS` (persistence, command-and-control,
  lateral-movement, actions-on-objective) — Phase C.
- Grading / red report-drawer bumps — first triggered by Phase C's `SAVE_NOTEBOOK`.
- Hunt tab, AI-assisted query/anomaly UI — deferred, see `docs/hunt-dashboard-design.md`.

## Verification

1. `npm run build` — must complete with no errors.
2. In-browser: from the alert screen, INVESTIGATE, then click through Email → AI Activity →
   Identity → Data Access → Network. Each should render real content (no `<TabStub>` left).
3. Email tab: raw/AI-extracted/headers/attachments toggles all show different content; marking
   the injected passage reveals the Prompt Analysis panel; picking an option and clicking "Add
   to Incident Report" increments the drawer's entry count (open it via the header button to
   confirm) with no red bump yet (nothing's graded until Phase C).
4. AI Activity tab: sources render without trust badges until "Show Trust Boundaries" is
   clicked, then badges appear.
5. Identity tab: picking a privilege-escalation option and adding it to the report also shows up
   in the drawer, ungraded.
6. Data Access / Network tabs: tables render, "mark as evidence" buttons work (no visible error;
   there's no evidence-board UI yet to confirm placement — Phase C verifies that end).
7. Refresh the page mid-tab — `KillChainContext`'s existing persistence should restore
   `activeTab`, `markedEvidence`, `stageAnswers`, and `report.entries` exactly as left.
