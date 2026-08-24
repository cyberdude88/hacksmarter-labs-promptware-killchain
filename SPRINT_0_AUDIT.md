# Sprint 0 Audit - Range 01

Date: 2026-08-23

This audit maps the current HackSmarter SOC app so the conversion to the
offline range can start from a known baseline instead of guesswork.

## Current app surface

- React + Vite single-page app served from `localhost:4173`
- Dark SOC training UI with:
  - left sidebar navigation
  - top bar metrics
  - page-based workspace
  - reducer-backed global state
- Main scenario is hard-coded to `public/scenarios/fortigate_ai_attack.json`
- Persistence is local-only via `localStorage`

## File inventory

### Core app

- [`src/App.jsx`](/home/alex/range-01/src/App.jsx)
- [`src/state/SocContext.jsx`](/home/alex/range-01/src/state/SocContext.jsx)
- [`src/styles.css`](/home/alex/range-01/src/styles.css)

### Pages

- [`src/pages/AlertsPage.jsx`](/home/alex/range-01/src/pages/AlertsPage.jsx)
- [`src/pages/InvestigationPage.jsx`](/home/alex/range-01/src/pages/InvestigationPage.jsx)
- [`src/pages/DetectionPage.jsx`](/home/alex/range-01/src/pages/DetectionPage.jsx)
- [`src/pages/ReplayPage.jsx`](/home/alex/range-01/src/pages/ReplayPage.jsx)
- [`src/pages/ReportPage.jsx`](/home/alex/range-01/src/pages/ReportPage.jsx)

### Shared UI

- [`src/components/Sidebar.jsx`](/home/alex/range-01/src/components/Sidebar.jsx)
- [`src/components/TopBar.jsx`](/home/alex/range-01/src/components/TopBar.jsx)

### Scenario content

- [`public/scenarios/fortigate_ai_attack.json`](/home/alex/range-01/public/scenarios/fortigate_ai_attack.json)

### Working notes

- [`HANDOFF.md`](/home/alex/range-01/HANDOFF.md)
- [`CLAUDE.md`](/home/alex/range-01/CLAUDE.md)

## Reusable parts

### State ownership and flow control

The strongest reusable asset is the reducer-driven state model in
[`src/state/SocContext.jsx`](/home/alex/range-01/src/state/SocContext.jsx).
It already centralizes session state, tick-based updates, replay control,
rule evaluation, and report grading. That matches the range brief’s need for
clear state ownership.

### Accessibility and interaction habits

The current app already has some useful habits to preserve:

- keyboard-friendly buttons and form controls
- visible focus behavior inherited from the browser and existing styling
- separate page modules instead of one monolithic screen
- local persistence that survives refresh

### Content separation

Scenario content is already externalized into JSON, which is a good starting
point for moving to a stage/content model.

## Current state model

State lives in one reducer with persistence.

### Primary state fields

- `scenario`
- `startedAt`
- `now`
- `alerts`
- `selectedAlertId`
- `telemetry`
- `attackIndex`
- `noiseIndex`
- `benignIndex`
- `nextBenignAlertAt`
- `detectionRules`
- `detectionDraft`
- `investigationQuery`
- `unlocked`
- `milestones`
- `currentPage`
- `identifiedIocs`
- `replayRunning`
- `replayTick`
- `replayTelemetry`
- `replayDetections`
- `replayCompleted`
- `report`
- `score`
- `scoreLog`
- `riskLevel`
- `correctTriages`
- `wrongTriages`

### Important derived metrics

- alert rate over the last 60 simulated seconds
- detection coverage against `expectedDetections`
- timer in `mm:ss`
- backlog count of untriaged alerts

## Reducer actions

The reducer already covers most of the app behavior:

- `INIT`
- `RESET`
- `TICK`
- `STREAM_TICK`
- `BENIGN_TICK`
- `SELECT_ALERT`
- `ASSIGN`
- `TRIAGE`
- `IDENTIFY_IOC`
- `UNFLAG_IOC`
- `ADD_RULE`
- `SAVE_RULE_DRAFT`
- `SAVE_INVESTIGATION_QUERY`
- `ACK_CERTIFICATE`
- `REMOVE_RULE`
- `NAV`
- `START_REPLAY`
- `STOP_REPLAY`
- `REPLAY_TICK`
- `SAVE_REPORT_DRAFT`
- `SUBMIT_REPORT`

## What should be replaced for the range

The current product is still a SOC simulator, not the target AXIOM range.
The following parts are the least compatible with the range brief:

- FortiGate-specific scenario narrative
- alert queue / investigation / detection / replay / report page structure
- SOC triage and detection-engineering terminology
- live-stream simulation mechanics
- scenario hard-coding in the provider

## Migration risks

### 1. State shape drift

`localStorage` persists a large reducer shape. Any replacement should either
bump the storage key or provide a migration path, or stale sessions will
hydrate with broken data.

### 2. Hard-coded scenario loading

`SocProvider` fetches one scenario JSON on mount. That makes the app easy to
run, but it also couples the UI to one lab flow. The range will need a more
explicit content/stage loading model.

### 3. Workflow logic is embedded in the reducer

Triage, replay, scoring, and report grading are all in one reducer file.
That is manageable today, but it will be the first place to split when the
range introduces authored stages and verdict logic.

### 4. UI structure is SOC-specific

The existing sidebar/topbar/page layout is useful as a baseline, but it does
not map cleanly to the stage-based teaching flow described in `CLAUDE.md`.

### 5. Scenario and UI are still tightly coupled

The pages read directly from the scenario JSON and reducer state. For the
range, stage content should move into a separate content layer so instructors
can edit prompts without touching component code.

## Suggested conversion order

1. Preserve the reducer patterns and persistence scaffolding.
2. Replace SOC navigation with the range stage flow.
3. Move authored content out of the React components.
4. Add stage-level progress and grading.
5. Re-check keyboard flow, reduced motion, and offline packaging.

## Conclusion

The current app is a solid technical base, but the user-facing behavior is
still the wrong genre for the target range. The main reusable investment is
the state/persistence architecture; the main replacement work is the scenario
flow, content model, and page structure.
