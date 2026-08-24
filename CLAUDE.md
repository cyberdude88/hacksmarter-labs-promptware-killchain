# CLAUDE.md — Range 01 project outline

This repository is a copied starting point for turning the current HackSmarter SOC app into a standalone range.
Use this file as the working brief for the conversion effort. The goal is to preserve what is already useful,
replace what is genre-mismatched, and end with an offline, double-clickable range build.

## Source of truth

Current app root: `/home/alex/range-01`

Baseline app characteristics:
- React + Vite single-page app
- Dark SOC training UI with sidebar, top bar, pages, and a reducer-backed state engine
- Existing persistence, keyboard support, and structured grading patterns
- Current product is a general SOC simulator, not the target AI-triage range

The target experience is the range described by the separate range brief:
- Self-contained offline HTML
- No runtime network dependencies
- No build step required for use
- Stage-based teaching flow with AXIOM verdicts and graded analyst decisions

## What to preserve

- The discipline around state ownership and reducer-driven flow
- The existing accessibility habits: focus handling, keyboard paths, reduced-motion awareness
- The habit of keeping content separate from presentation when possible
- Local-only persistence and export patterns, guarded for browser compatibility

## What to replace

- The SOC simulator narrative and all FortiGate-specific scenario content
- The current navigation model and page structure if they do not map cleanly to the range stages
- Any CDN dependency or browser-only assumptions that would break offline use
- Any design changes that restyle the completed visual system

## Sprint Plan

### Sprint 0 — Audit and map the gap

Goal: establish exactly what can be reused from the current app before any conversion work starts.

Tasks:
- Inventory the current file structure and identify reusable state, persistence, and accessibility code
- Map the current pages and reducer actions to the range requirements
- Identify which pieces of the UI can be reused as-is and which are only useful as reference
- Create an audit note that records existing state fields, functions, and likely migration risks

Exit criteria:
- We know the current app surface well enough to plan the conversion without guessing

### Sprint 1 — Lock the range architecture

Goal: reshape the app into the range shell before moving content.

Tasks:
- Define the target single-file or static-file runtime shape
- Replace SOC-specific routing with the range stage flow
- Introduce a stage model that can support authored prompts, telemetry, verdicts, and lessons
- Keep keyboard navigation and visible focus intact while the UI changes

Exit criteria:
- The app behaves like a range scaffold, even if content is still placeholder material

### Sprint 2 — Extract content from code

Goal: move stage content out of the app logic and into a content layer that instructors can edit safely.

Tasks:
- Create a content file or content block for stage definitions
- Keep stages isolated so one stage can be edited without touching the others
- Add documentation for the stage schema and content markup conventions
- Make the content path easy to replace without rewriting app logic

Exit criteria:
- Stage data is no longer welded into component code

### Sprint 3 — Add assessment mechanics

Goal: implement the range-specific grading and persistence behaviors.

Tasks:
- Add local persistence for progress with safe fallbacks
- Track per-stage interactions and metrics
- Add exportable results for instructors
- Add any answer-validation or anti-cheat shaping required by the range brief

Exit criteria:
- A session can survive refresh, be exported, and be reviewed offline

### Sprint 4 — Finish the student workflow

Goal: make the final range usable end-to-end in a lab setting.

Tasks:
- Verify focus flow and keyboard navigation through every stage
- Confirm reduced-motion behavior works in the final flow
- Validate print/export behavior
- Check that the UI still works at narrow widths

Exit criteria:
- The range is usable as a self-contained training artifact without external services

## Working rules

- Keep changes additive until a sprint explicitly replaces a subsystem
- Prefer small, verifiable commits
- Do not restyle the finished visual language unless the range brief explicitly requires it
- If a stage/content decision conflicts with the implementation, trust the range brief over the app default
- When a piece of future work is genuinely open-ended or exploratory (the right shape isn't
  obvious yet), don't design it inline in the main session. Spawn a lower-tier model subagent to
  draft a markdown design doc under `docs/` for a separate follow-up session to pick up, and
  close out that thread in the current session rather than blocking on it.

## Recommended order

1. Audit the current app.
2. Build the range shell.
3. Externalize content.
4. Add progress, export, and assessment.
5. Finish accessibility and offline validation.

## Stop condition

Once this outline is in place, stop and wait for the next implementation task.

## 2026-08-24 pivot — target scenario is now "The Promptware Kill Chain"

The range's subject is now **promptware** — the seven-stage kill chain from
Brodt, Feldman, Schneier & Nassi, *"The Promptware Kill Chain: How Prompt
Injections Gradually Evolved Into a Multistep Malware Delivery Mechanism"*
(arXiv:2601.09625, 2026): Initial Access (prompt injection) → Privilege
Escalation (jailbreaking) → Reconnaissance → Persistence (memory/retrieval
poisoning) → Command & Control → Lateral Movement → Actions on Objective.
Also see the CSA Lab Space note on promptware-as-C2
(labs.cloudsecurityalliance.org) and Schneier's writeup. This supersedes the
generic "range brief" language earlier in this file wherever the two conflict.

Nav is remapped onto the NIST SP 800-61 incident-response lifecycle, bookended
by Alerts and Incident Report (kept, per Alex):
- **Alerts** — Detection (trigger)
- **Kill Chain** (was Investigation) — Detect & Analyze; a dropdown steps
  through the 7 promptware stages, since nearly the whole kill chain lives
  analytically inside this one IR phase
- **Containment** (was Detection Builder) — Containment & Eradication
- **Recovery** (was Replay Attack) — Recovery
- **Incident Report** — Post-Incident Activity

Current state: nav labels/icons updated, Kill Chain/Containment/Recovery pages
are empty placeholders (Kill Chain has the stage-descriptions dropdown, no
graded tasks). Alerts and Incident Report still run on the **old FortiGate
placeholder data** (`public/scenarios/promptware_kill_chain.json`, renamed but
content untouched) — that data needs a real promptware-themed rewrite before
this is coherent end-to-end. Same "complete tasks to light up the sidebar dot,
then unlock the next stage, flag at the end" pattern as before — preserve it
when authoring real stage content.

## 2026-08-24 — Timeline volume, evidence-ID fix, evidence auto-linking

`src/content/killChainCase.js`:
- `EVENTS` grew from 60 to 300 (Email 55 / AI 30 / Tool 75 / Data 30 /
  Identity 40 / Network 30 / Endpoint 40), keeping the original ratio. The
  original 60 are unchanged and renamed `REAL_EVENTS` (still EVT-001..060,
  still what `EVIDENCE_CATALOG` cites); a seeded, deterministic generator
  appends 240 `NOISE_EVENTS` (EVT-061+) spread across a 10-day window
  (`INCIDENT_DATE = '2026-08-17'`, ±1 week) so events now carry a `date`
  field, not just `ts`. Includes three decoy IDENTITY
  baseline/re-check `PERMISSION_SNAPSHOT` pairs for other service accounts
  (`svc-backup-agent`, `svc-reporting-bot`, `svc-crm-sync`) — same shape as
  the real EVID-004 evidence, deliberately, as red herrings.
- **Fixed a pre-existing bug**: `EVIDENCE_CATALOG`'s `sourceEventIds` were
  systematically miscounted against actual EVT- ids (e.g. EVID-004 cited
  EVT-047, a workstation login, instead of EVT-057, the actual re-check
  snapshot; EVID-009 cited the wrong four events entirely). Re-derived every
  reference against real event content — see git history for the full diff.
  This had been silently defeating any evidence-to-source-event linkage.
- Added `EVENT_TO_EVIDENCE`, a reverse index (EVT-id → [EVID-ids]) for the
  Timeline tab.

`src/components/killchain/tabs/TimelineTab.jsx`:
- Added Date (two `<input type=date>`) and Time-of-day (two `<input
  type=time>`) range filters, plus a Date column and a "Clear filter"
  control. Rows now sort chronologically across the full 10-day span.
- "Add Artifact to Incident Report" now also checks `EVENT_TO_EVIDENCE` for
  the selected row: if it's the cited source of a catalog card, clicking it
  also dispatches `MARK_EVIDENCE` for that card, so it shows up MARKED on
  the Evidence Board without the student having to re-find it in a
  per-category tab. Previously this button only wrote an inert report
  entry that `gradeEntry()` could never match to `EVIDENCE_CATALOG` (refId
  was an EVT- id, catalog keys are EVID- ids) — it did nothing gradeable.
