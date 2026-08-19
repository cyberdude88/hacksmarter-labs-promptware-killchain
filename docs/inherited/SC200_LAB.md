# SC-200_lab — legacy source project document

> **Current status:** This file describes the source project's historical
> certification scope. The copied Hack Smarter course now teaches general SOC
> Analyst work. Read `LATEST_PROGRESS.md` for the authoritative current
> direction; do not use SC-200 exam coverage as a feature gate.

**Read this file first.** It's the single entry point for anyone (human or agent)
picking up this project. Everything else hangs off it.

## What this is
A local-only, browser-based simulator of the Microsoft security operations
toolset (Defender XDR, Sentinel, Defender for Cloud, Purview) for SC-200
exam study. Static files only — no build step, no framework, no auth, no
backend. Opens in Firefox via a tiny Python http server.

## Where everything lives
```
~/defender-lab/
  SC200_LAB.md         ← you are here (master)
  README.md            ← short user-facing readme
  ExamObjectives.md    ← scope source of truth (exam domains → lab views)
  HANDOFF.md           ← sprint state (done / in-progress / todo)
  defender.py          ← original CLI engine (kept for parity)
  rules.json, events.jsonl, run_scenario.sh
  bin/launch.sh        ← server + browser launcher
  ui/
    index.html         [DONE]
    styles.css         [DONE]   Fluent-inspired tokens, original code
    data.js            [DONE]   mock data for every view
    views.js           [DONE]   render funcs per route
    app.js             [DONE]   router + suppression engine + wiring
```

## Run it
```bash
~/hacksmarter-labs/bin/launch.sh
                                      # starts server on 127.0.0.1:8767 + opens browser
# or, manually:
cd ~/hacksmarter-labs/ui
python3 -m http.server 8767 --bind 127.0.0.1
```

Pinned to GNOME dash via `~/.local/share/applications/sc200-lab.desktop`.

## Source of truth for scope
**`ExamObjectives.md`** is the authority on what this lab must cover. Every
new feature must map to an exam domain or scenario archetype listed there.
If a feature isn't in the SC-200 syllabus, push back before building it.

## Briefing for the next agent (Codex / Claude / any LLM)

You're picking up an in-progress sprint. The hard contract:

1. **No proprietary Microsoft code.** The user has and may paste real
   Microsoft Learn / Azure portal CSS or JS as visual reference. **Do not
   adapt, port, or near-copy it.** Look-alike from scratch only. Our
   `styles.css` is original and already mirrors the Fluent design tokens
   (Segoe UI stack, primary `#0078d4`, severity colors, 2px corners, the
   `--theme-*` CSS-variable pattern). Extend it the same way.

2. **No build step.** Plain HTML/CSS/JS. No bundler, no TypeScript, no
   framework. The lab must run from `python3 -m http.server`.

3. **No real auth, no real APIs.** All data is fictional, in-memory, and
   sourced from `ui/data.js`. The suppression rule engine persists rules
   to `localStorage` only.

4. **Hash routing, single page.** `index.html` is the only HTML file.
   Routes look like `#/defender/home`, `#/sentinel/incidents`. The router
  in `app.js` sets a `wl-*` class on `<body>` to switch the
   per-workload color theme defined in `styles.css`.

5. **Faithful chrome.** Top bar (waffle, wordmark, search, tenant, avatar),
   workload accent strip, left sidenav, main pane, slide-in side panels for
   alert detail / incident detail / suppression rule editor / app switcher.
   All wired in `index.html` already.

6. **Exam-realism over feature breadth.** The user studies SC-200 by
   *doing* — so prioritize: incident triage, alert suppression with AND
   semantics, KQL hunting, Sentinel analytics rules, Defender for Cloud
   recommendations, Purview DLP. Skip anything not in `ExamObjectives.md`.

7. **Sprint handoff rule.** Before stopping, update `HANDOFF.md` with what
   you finished and what's next. This is a hard project rule for Alex
   ([[feedback_sprint_handoff]]).

8. **Tone.** Terse. No trailing summaries in chat — Alex reads the diff
   ([[feedback_style]]).

## What's done right now
- `index.html` — full chrome shell + all side panels
- `styles.css` — per-workload theming, tiles, KPI strips, KQL editor, donut, MITRE chips, timeline, etc.
- `data.js` — mock data for incidents, alerts, hunting tables, saved queries, Sentinel rules, Defender-for-Cloud recommendations, compliance frameworks, DLP, insider risk, sensitivity labels, audit log, plus NAV maps and PORTALS list
- `views.js` — render functions for every route in `ExamObjectives.md`,
  plus `renderAlertDetail` / `renderIncidentDetail` / `ruleEvalSummary`
  helpers used by the side panels
- `app.js` — hash router, workload theming, sidenav/app switcher wiring,
  suppression-rule engine, side panels, guided scenario controls, Copilot
  panel, and Sentinel workspace selector

## What's next (in order)
1. Smoke-test any route added to `NAV` at `http://127.0.0.1:8767/`.
2. Verify the scanner.exe suppression scenario still walks correctly:
   pre-update events show "Suppressed", post-update events fire alerts,
   look-alike file does NOT suppress.
3. Keep filling SC-200 study gaps as hands-on views instead of static notes.
4. Update `HANDOFF.md` before stopping.

## Acceptance criteria
- Page loads on `#/defender/home` showing KPIs + incident preview + secure score donut
- Waffle opens the app switcher panel; clicking a portal navigates and re-themes
- Sidenav updates per workload; active item highlighted
- Clicking any incident opens the right side panel with entities, alerts, timeline
- Clicking any alert opens detail with per-condition ✓/✗ rule evaluation
- "+ Create suppression rule" opens form pre-populated with file_name + sha256 conditions
- Saving a rule re-renders the alerts table with suppressed rows highlighted
- "Replay scenario events" resets `alerts` from `SEED_ALERTS` and re-renders
- Hunting view: clicking a saved query loads it; "Run query" shows mock rows
- All four workloads (Defender / Sentinel / Defender-for-Cloud / Purview) reachable from the waffle
- No console errors in Firefox devtools

## Visual reference tokens (already in `styles.css`)
Built from scratch, NOT copied from Microsoft sources:
- Font: `"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`
- Mono: `ui-monospace, "Cascadia Code", Menlo, Consolas, monospace`
- Primary: `#0078d4` · primary-hover: `#106ebe` · primary-soft: `#deecf9`
- Severity: high `#d13438` · med `#ff8c00` · low `#ffb900` · info `#0078d4`
- Good (success / suppressed): `#107c10`
- Bg: `#faf9f8` · card: `#fff` · hover: `#f3f2f1` · selected: `#edebe9`
- Border: `#edebe9` (subtle) / `#d2d0ce` (strong)
- Topbar default: `#2b3a55` (navy) — switches per workload
- Corner radius: 2px chrome, 4px tiles
- Shadow stack: `--shadow-1` (subtle) and `--shadow-2` (elevated panel)

## Pitfalls already paid for
- Snap Firefox can't read `file://` under `$HOME` — always serve over http
- GNOME dash doesn't auto-pin new `.desktop` entries; pin via `gsettings` (already done)
- Dash-to-Dock `show-mounts` clutters the dash with disk shortcuts; turned off
- Don't break the legacy CLI scenario (`defender.py` + `events.jsonl`) — it's still useful for terminal-only checks
