# HackSmarter SOC — session handoff

State of the project as of the last edit. Use this to pick up in a fresh session.

## What it is
A frontend-only SOC training simulator. React + Vite, all data static, deployable to GitHub Pages. Live alert stream, telemetry stream, detection rule builder, replay engine, graded incident report. Scenario JSON drives everything.

## How to run
```bash
cd /home/alex/hacksmarterSOC
npm install      # one-time
npm run dev      # http://localhost:5173/
npm run build    # sanity check / dist/ output
```
Build command at start of session was:
```bash
VITE_BASE=/<repo>/ npm run build && npm run deploy   # for GitHub Pages
```

## File structure (current)
```
hacksmarterSOC/
├─ public/
│  ├─ logo.png                                 # HACKSMARTER SOC wordmark, sidebar brand
│  └─ scenarios/fortigate_ai_attack.json       # single source of truth for scenario
├─ src/
│  ├─ App.jsx                                  # SocProvider + sidebar/topbar/workspace shell
│  ├─ main.jsx
│  ├─ styles.css                               # all styling, dark SOC theme
│  ├─ state/SocContext.jsx                     # **the** state engine (useReducer + provider)
│  ├─ components/
│  │  ├─ Sidebar.jsx                           # nav with milestone dots, logo, reset link
│  │  └─ TopBar.jsx                            # risk meter, alert rate, coverage, timer, score
│  ├─ pages/
│  │  ├─ AlertsPage.jsx                        # ticket queue, filter pills, Assign-to-me, triage
│  │  ├─ InvestigationPage.jsx                 # query bar, pause toggle, pivot, IOC flag input
│  │  ├─ DetectionPage.jsx                     # multi-condition rule builder
│  │  ├─ ReplayPage.jsx                        # replay engine + early/late/missed stats
│  │  └─ ReportPage.jsx                        # **graded** structured Q&A + pass/fail
│  └─ lib/ruleEngine.js                        # eq / contains / regex / gt / lt + AND|OR
├─ package.json / vite.config.js / index.html
├─ README.md
└─ HANDOFF.md                                  # this file
```
No `src/hooks/` and no `public/data/` — old approach was deleted.

## State engine (SocContext.jsx)
Single `useReducer`. Side-effect intervals dispatch into it.

Key reducer actions:
- `INIT` — load scenario (preserves `startedAt` if hydrated from localStorage)
- `RESET` — wipe to defaults, keep scenario, new `startedAt`
- `TICK` (1Hz) — timer + backlog penalty (-2/sec while NEW alerts exist) + risk recalc
- `STREAM_TICK` (1.5s) — emits next attack-chain step (with `phase` derived from `scenario.timeline`) → telemetry + optional alert. Or noise alert. Or benign filler from `benignPool`. Telemetry capped at 200 entries.
- `SELECT_ALERT`
- `ASSIGN` — NEW → ASSIGNED, sets assignedTo='me'
- `TRIAGE` — works on NEW or ASSIGNED. +10 correct / -5 wrong against `expectedVerdict`. Auto-assigns. First correct triage flips `milestones.firstTriage`.
- `IDENTIFY_IOC` / `UNFLAG_IOC` — free-text IOC notes. **No immediate score change.** Sets `milestones.iocFlagged`.
- `ADD_RULE` / `REMOVE_RULE` — `milestones.ruleBuilt` on add
- `START_REPLAY` / `STOP_REPLAY` / `REPLAY_TICK` — 1Hz, walks attackChain. On completion sets `milestones.replayPassed` if any detection fired.
- `SUBMIT_REPORT` (or with `report: null` to edit) — grades against `scenario.report.questions` (case-insensitive trimmed compare). Adds narrative keyword bonus + extra-IOC bonus. Stores `grading[]`, `total`, `max`, `pct`, `passed` on `state.report`.
- `NAV` — currently no gating (locks were removed; all pages always navigable)

`unlocked` is now always all-true (legacy shape kept for back-compat). Real progression is in `state.milestones`.

`useDerivedMetrics()` exposes `alertRate`, `coverage` (% of `expectedDetections` covered by live rule firings), `timer` (mm:ss), `backlog` (NEW count).

`localStorage` key `hsoc:state:v1` — every reducer dispatch persists state minus `scenario` (loaded fresh each mount). Reset link in sidebar nukes storage.

## Scenario contract (`fortigate_ai_attack.json`)
```jsonc
{
  "id":"fortigate_ai_attack",
  "name":"AI-Accelerated Edge Compromise",
  "summary":"...",
  "iocs":["185.220.101.42","/api/v2/cmdb/system/admin"],
  "attackType":"edge_device_compromise",
  "attackChain":[ { "tOffset":n, "telemetry":{type,src_ip,user,host,url,msg}, "alert"?:{severity,src_ip,rule_name,confidence,expectedVerdict,summary} } ],
  "noiseAlerts":[ { "tOffset":n, "alert":{...} } ],   // distractors
  "benignPool":[  { type, src_ip, host, user, msg } ],// rotated as filler between attack steps
  "expectedDetections":["AUTH_FAIL","AUTH_SUCCESS","CONFIG_EXPORT","ADMIN_USER_CREATE","API_ENUM"],
  "timeline":[ { "phase":"Recon", "tOffset":5, "label":"..." }, ... ],
  "report":{
    "pass_threshold_pct":80,
    "questions":[
      // type:"text" | "select"; for select include "options":[...]
      { "id","type","label","placeholder"?,"answer","points","options"? }
    ],
    "narrative":{ "label","placeholder","keywords":[...], "max_bonus":5 }
  }
}
```
Adding a scenario = drop another JSON in `public/scenarios/`. Scenario selector UI doesn't exist yet — `App.jsx` hard-fetches `fortigate_ai_attack.json` (in `SocProvider`).

## UX decisions made (don't undo without reason)
- **Locks removed.** Sidebar shows milestone dots (informational), all pages accessible from start. Reason: real SOCs don't gate detection engineering behind triage tutorials.
- **TP/FP/ESC labelled as "Confirm / Dismiss / Escalate"** with explanatory legend on Alerts page (3 cards explaining each + "Assign to me"). Tooltips include the SOC abbreviations.
- **Ticket assignment**: NEW → ASSIGNED → TRIAGED|ESCALATED. Backlog penalty only counts NEW. Filter pills: All / Unassigned / Mine / Resolved.
- **Investigation**: query bar with `key=value` syntax + free-text. Auto-pauses when an alert is selected (snapshot mode); `▶ Resume Live` flushes. Pivot pills (src_ip / user / host / type) with counts. Trigger event highlighted with TRIGGER tag.
- **Phase chips** on attack events derived from `scenario.timeline` — small blue pill rendered in stream lines and trigger-event card.
- **IOC flagging** is a free-text input now (not a candidates checklist — that was hand-holding). No immediate score; decoys hurt only at report grading time.
- **Report is graded**: structured questions (text inputs for IP/host/user/path/account, dropdowns for classification/severity/verdict). Pass = % score ≥ `pass_threshold_pct`. Narrative is small keyword bonus only (free-text QA hard). "+ Add IOC" lets analyst list extra indicators with type+value rows.
- **Persistence**: localStorage. Refresh keeps everything, scenario loads fresh.
- **Logo**: `public/logo.png`, rendered in `.brand` at max-width 188px.

## Known TODO / what was being worked on at handoff
- **Detection Builder value dropdowns**. User asked for select-style/datalist value pickers populated from observed telemetry (like Splunk/Elastic detection authoring). Not yet implemented. Plan: in `DetectionPage.jsx`, compute distinct values per selected `field` from `state.telemetry`, render an `<input list="vals-{field}">` + matching `<datalist>` with those values. Combobox = dropdown affordance + free-text fallback for regex. Field `msg` → leave as text-only (too varied).
- **Scenario selector UI**. Currently the app hard-loads the FortiGate scenario. Adding more scenarios works mechanically (drop JSON + edit fetch URL), but no UI exists.
- **Old persisted localStorage state from earlier sessions** may have stale shape (e.g. old `unlocked` keys, old `report` shape with no `grading`). The reset-session button handles this — tell users to click it after upgrades.

## Things I would not change unless asked
- Single-reducer architecture (replacing with Redux/Zustand would be over-engineering)
- Telemetry capped at 200 entries (DOM perf vs analyst memory)
- 1.5s stream cadence (any faster makes the stream unreadable)
- localStorage key name (`hsoc:state:v1`) — bump the suffix when shape breaks

## Dev server
Was running in the background as bash task `bp6fk41b3`, log at `/tmp/hsoc-dev.log`. Vite v5.4 on port 5173. HMR works for everything except dropped files (which trigger full reload).

## Last build (vite build)
Clean as of the styles append. CSS ~18.4KB / JS ~180KB gzipped 56KB.
