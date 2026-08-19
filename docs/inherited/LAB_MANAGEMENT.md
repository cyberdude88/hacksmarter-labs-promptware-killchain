# LAB_MANAGEMENT — dev management strategy handoff

For the next orchestrating session. Written 2026-07-06 after Sprint 2.
Read this first; it explains how this lab is developed and where it stands.

## Operating model

You (Claude session) are the **manager**, not the builder. Codex CLI does
the heavy code lifting to preserve Claude token budget; you plan, define
agent briefs, launch runs, verify claims, and keep the docs honest.

- Workers: `codex exec` agents, one numbered section each in `AGENTS.md`.
- Runner: `bin/run-codex-agents.sh <numbers>` — sequential, one git commit
  per agent, logs to `.agent-logs/` (gitignored).
- Manager verifies AFTER each wave: diffs are non-empty, `node --check`
  clean, key routes render (headless Chrome), claims in summaries match
  the actual diff. Workers self-grade — never take "done" on faith.

## Doc map (repo root)

| File | Role |
|---|---|
| `SC200_LAB.md` | Master project rules |
| `ExamObjectives.md` | Exam scope source of truth (synced to July 28, 2026 outline) |
| `OBJECTIVES_DELTA.md` | Syllabus drift audit; every gap bullet labeled `[Agent N]`/`[DONE]` |
| `AGENTS.md` | All agent briefs + checkboxes. Letters A–D = Sprint 1, numbers 1–11 = Sprint 2. Next agent: **12** |
| `HANDOFF.md` | Chronological build log; every agent appends a dated entry |
| `GAP_BRIDGE.md` | Next mission brief: chunk-level study-app vs lab compare → defines Agent 12+ |
| `COVERAGE_SWEEP.md` | Agent 11's topic-level coverage report vs the Learn link index |
| `DEVICE_PAGE_PARITY.md` | Device-page feature parity tracker |
| `LAB_MANAGEMENT.md` | This file. Update it at end of each management session |

Companion project: `~/sc-200_app` (study app, 127.0.0.1:8766) — read-only
authority for coverage compares. This course copy serves on 127.0.0.1:8767
(`python3 -m http.server 8767 --bind 127.0.0.1` from `ui/`); the original
SC-200 lab keeps 127.0.0.1:8765.

## Hard-won gotchas (do not re-learn these)

1. **Codex sandbox is broken on this machine** (bwrap/AppArmor userns).
   `-s workspace-write` exits 0 while writing NOTHING. Always
   `-s danger-full-access` (already baked into the runner). After any
   run, confirm the commit diff is non-empty — the runner commits with
   `--allow-empty`, so exit 0 + a commit proves nothing by itself.
2. **Never run two build agents in parallel.** They all edit
   `ui/data.js` / `ui/views.js` / `ui/app.js`. Sequential + commit per
   agent means one bad agent = one revertable commit.
3. **Topic-level sweeps miss things.** Workspace manager 404'd through a
   9-agent pass because the delta doc had mislabeled it "secondary" and
   nobody audited nav-vs-views. Rules now: (a) nothing in NAV may 404 —
   sweep `route:'#/...'` in data.js against `VIEWS['...']` in views.js
   after every wave; (b) gaps Alex hits while actually studying outrank
   any doc's relevance call.
4. **Verified ≠ accurate.** QA proves routes render and state persists,
   not that agent-written content matches real portal behavior. Accuracy
   review is an open workstream (below).

## State as of 2026-07-06

- Git repo since today; baseline `9b07a2a`, one commit per agent through
  `26ff5ad` (Agent 11). All Sprint 2 checkboxes `[x]`.
- Agents 1–9: closed all `OBJECTIVES_DELTA.md` objectives (ingestion
  labs incl. Logs Ingestion API, retention tiers, SOC optimization,
  summary rules, notebooks, NRT/TI/ML rule types, anomalies, MDCA,
  Entra, case management, live response, ASR, AIR, Graph activity logs,
  threat analytics, eDiscovery search) + QA (83 NAV routes render clean).
- Agent 10: dead-route triage; full workspace manager, action center,
  MDO email & collab, UEBA, watchlists, Sentinel settings/search,
  Defender for Cloud inventory/attack paths.
- Agent 11: `COVERAGE_SWEEP.md`. Remaining **Missing**: Security Copilot
  standalone experience (sessions/workspaces/plugins/promptbooks — the
  big one) and exam logistics (skippable). Several **Partial** rows
  remain in the report body.

## Work queue (in order)

1. **GAP_BRIDGE mission** — run per `GAP_BRIDGE.md`: chunk-level compare
   of `~/sc-200_app` corpus vs lab, write `GAP_BRIDGE_FINDINGS.md`,
   define Agent 12+ (Copilot standalone is almost certainly Agent 12),
   run via `bin/run-codex-agents.sh`, QA agent last.
2. **Burn down COVERAGE_SWEEP Partials** — fold into the same wave.
3. **Accuracy review workstream** — when Alex reports a lab page that
   contradicts Learn/readiness content, log it as a numbered fix agent.
   Consider a dedicated review agent that diffs high-traffic surfaces
   against Learn descriptions (own words only — no copied text).
4. Ongoing: after every wave — nav-vs-views 404 sweep, `node --check`,
   headless-Chrome spot check, `HANDOFF.md` entry, commit hygiene.

## Alex's standing rules

- Terse comms, no trailing summaries ([[feedback_style]]).
- No Microsoft proprietary code or Learn text ever; original look-alike
  only. No secrets in any file ([[feedback_cyber_hygiene]]).
- Vanilla HTML/CSS/JS, no build step, no real network calls.
- Sprint handoff: update `HANDOFF.md` (build log) and this file
  (management state) before ending a session ([[feedback_sprint_handoff]]).
- Spend codex tokens, not Claude tokens, on bulk code. Claude does
  planning, briefs, verification, and IP-sensitive judgment calls.

## 2026-07-06 (later) — goose-local pipeline session
- Codex usage-capped mid-wave (8 empty commits, reset). Alex pivoted:
  goose-local (qwen2.5:7b) + python gates replace the codex wave.
  The 14:20 codex rerun was CANCELLED. Supabase MCP removed from codex.
- How it works now: read `local-tasks/README.md` + `VIEW_QUEUE.md` first.
  Fixtures: briefs tasks/T*.md → runner bin-run-goose-tasks.sh →
  verify.js → integrate.py (marker section in data.js). Views: briefs
  generated by gen_view_task.py → bin-run-goose-views.sh →
  add_view.py (render gate + NAV wiring, per-workload markers).
  QA: bin/qa-sweep.sh renders every view in a node vm (also covers the
  no-404 sweep). All results append to local-tasks/QA_LOG.md.
- 7B lessons: absolute output paths (relative paths → file lands
  nowhere); positional specs beat conditional ("first 5 rows X" not
  "5 of them X"); NO file-read indirection in briefs (it stalls);
  isolated new files only; retry-once catches most flakes.
- Manager-owned remainder (needs Claude or codex-when-uncapped):
  VIEW_QUEUE.md § Manager-owned — KQL evaluator depth, ASIM pages,
  bookmarks/livestream/restore on existing views, cross-links,
  copilot embedded↔standalone links, prose accuracy review.
- Next session: check `git log`/QA_LOG for V12-V22 results, run
  bin/qa-sweep.sh, retry failed V-tasks (briefs are cheap to tweak —
  see the 7B lessons), then work the manager-owned list.
