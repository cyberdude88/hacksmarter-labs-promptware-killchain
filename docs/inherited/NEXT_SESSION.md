# Next session — start here

Repo: `~/hacksmarter-labs` (branch `master`).

```bash
cd ~/hacksmarter-labs
bin/launch.sh                 # portal on :8768, simulator/capstone on :8767
node bin/portal-check.js      # every module lab renders
node bin/lab-state-check.js   # lab state stays isolated across resets
node bin/render_all.js        # every simulator view renders (purview/audit fails already — pre-existing)
```

Student account for the SOC Analyst track: `user2` / `user2`.
Module 1 lives at `http://127.0.0.1:8768/#/program/soc-analyst/module/1`.

## What just changed (2026-08-18, this session)

Three foundation commits plus the final feedback commit, all verified in headless Chrome:

- `034d271` — Wave 2 module labs (Modules 04, 05, 06) integrated, plus a shared-runtime
  fix: `LabRuntime.freshState()` shallow-spread its defaults, so learner selections
  mutated each module's `MODULE_*_DEFAULT_STATE` constant and a lab reset handed the
  polluted arrays back. Defaults are deep-cloned now; `bin/lab-state-check.js` guards it.
- `95bb88e` — Module 1 rework: walkthrough starts in the alert queue, the student performs
  every action, and the investigation timeline is filled in rather than revealed.
- `873df15` — the coach became a bottom instruction bar that advances on the student's
  action instead of a floating card with a Next button.
- Final Module 1 feedback pass — removed the floating M launcher and intermediate coach buttons;
  all four actions use amber waiting states and auto-advance; restart clears stale sign-in
  filters; timeline facts are strict correct-answer gates with green success feedback and
  clearly boxed character masks whose fixed punctuation is skipped during typing or paste.

Full detail is in `HANDOFF.md` (bottom four sections) and
`MODULAR_LAB_PROGRAM_PROGRESS.md` (Wave 2 gate review).

## Module 1 flow as it now stands

1. Foundations lessons and the alert card (portal).
2. **Required console walkthrough** — 5 coach steps starting at `#/defender/alerts`:
   open alert A1701 → read the alert pane and take its highlighted "Investigate sign-ins
   for this account" pivot → filter the log to j.santos → read the eight failures and
   open the highlighted 09:09:41 success → return.
   Steps marked `require` accept a click only on the highlighted control; all four action
   steps show a non-clickable amber waiting chip, briefly turn green when complete, and
   auto-advance when their `check()` passes. There is no floating launcher or Next press.
3. **Investigation timeline, filled in** — facts 1-3 are fill-in-the-blank sentences
   (count, account, IP, time, result, location, device status, risk) typed from what the
   log showed. Each typed character has its own box; fixed punctuation is skipped when a
   full value is typed or pasted. Normalized matching, marked wrong fields, hints after
   the first miss, and all hints after the second. There is no answer bypass: each fact
   must be correct to unlock the next one, and a correct answer pops green. Fact 4
   (service-desk callback) is handed over. Unscored — practice, not assessment.
4. **Triage worksheet** — the graded artifact, unchanged (pass mark 70).

## Where the pieces live

| Concern | File |
|---|---|
| Module 1 view, wiring, scoring | `portal/module-01.js` |
| Module 1 scenario, evidence, blanks (`template` / `blanks` / `accept`) | `portal/data.js` (`MODULE_ONE_ALERT_ORIENTATION`) |
| Module 1 styles including `.m01-blank` | `portal/module-labs.css` |
| Coach engine: bar, spotlight, scope lock, required-action lock, auto-advance | `ui/coach.js` |
| Coach scripts (steps, `instruction`, `require`, `check`, `waitLabel`, `nudge`) | `ui/coach-data.js` |
| Coach bar + scrim + required-control styles | `ui/styles.css` (search `coach-bar`) |
| Simulator views (alert pane pivot `data-pivot="signin-logs"`) | `ui/views.js` |

## Open items, roughly in priority order

1. **Wave 3 module agents (Modules 07, 08, 09)** — not launched. `bin/run-module-agents.sh 7 8 9`.
   Read the Wave 2 gate review in `MODULAR_LAB_PROGRAM_PROGRESS.md` first; the one carried
   instruction is that agents must build lab defaults from a function (as Module 06 does),
   never from a shared module-level constant.
2. **Roll the Module 1 pattern outward.** Modules 02-06 still use the reveal-then-decide
   shape. The pieces that generalize: `require` steps, auto-advance, fill-in-the-blank
   recall, console-before-worksheet ordering.
3. **A second, unguided Module 1 alert.** Same difficulty, no coach, different story
   (impossible travel or MFA fatigue rather than password spray), scored the same way.
   This is the "did you actually learn it" half of the module and does not exist yet.
4. **`purview/audit` renders empty** in `bin/render_all.js`. Pre-existing, unrelated to
   this session's work, still worth fixing.
5. **Difficulty note from Wave 1** — Modules 02 and 03 were built before the difficulty
   gradient reached the briefs and read heavier than the ramp calls for at week 1-2.
   Left as built; revisit if they feel steep in use.

## Conventions that matter

- Each module agent owns exactly `portal/module-NN.js` + `portal/module-NN.css`. Shared
  files (`portal/app.js`, `portal/lab-runtime.js`, `portal/module-registry.js`) are the
  orchestrator's.
- Every CSS selector in a module file is `.mNN-` prefixed.
- No module before 12 may reference `8767`, `SIM_ORIGIN`, `simEntry`, or the capstone
  route — except Module 1's coach launch, which is scoped to two pages by the coach's
  `allow` list.
- Lab state goes through `LabRuntime` under a lab-specific id; reset touches only that lab.
- Run `node bin/portal-check.js` and `node bin/lab-state-check.js` before closing a wave.
