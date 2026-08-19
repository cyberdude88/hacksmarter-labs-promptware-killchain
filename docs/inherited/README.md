# Hack Smarter Labs — Student Portal & SOC Labs

A hands-on training platform for Security Operations Center analyst work: alert
triage, incident investigation, threat hunting, detection engineering, identity
and endpoint response, vulnerability management, and reporting.

Everything is static files. No build step, no server runtime, no database
required to run it — a browser and Python 3 are the whole toolchain.

## Quick start

```bash
bin/dev.sh          # start both halves, print URLs and demo sign-ins
bin/dev.sh status   # what is listening
bin/dev.sh stop     # shut both down
```

Then open <http://127.0.0.1:8768/#/login> and sign in as **`user2` / `user2`**.

Demo accounts are in `portal/data.js`; the password always equals the username.
Each is enrolled in exactly one of the four tracks, so you can see both the
unlocked and locked states:

| Account | Enrolled track | Status |
|---|---|---|
| `user1` | IT Help Desk & Career Accelerator | outline only |
| **`user2`** | **Security Operations Center (SOC) Analyst** | **the built track** |
| `user3` | Foundations of AI & Machine Learning | outline only |
| `user4` | Electrical Engineering Essentials | outline only |

## How the app is put together

Two static apps that reference each other:

| Half | Directory | Local | What it is |
|---|---|---|---|
| Portal | `portal/` | :8768 | Login, catalogue, curriculum, per-module lab pages |
| Simulator | `ui/` | :8767 | The SOC lab environment — ~30k lines of alerts, incidents, device timelines, hunting queries |

They are **separate origins locally** so either half can be reloaded without
restarting the other, and **one origin when deployed** — the Pages workflow
mounts `portal/` at `/` and `ui/` at `/sim/`.

`portal/app.js` detects which environment it is in and resolves `SIM_ORIGIN`
accordingly. That is the only place either half hardcodes the other's location;
CI fails the build if an unguarded `127.0.0.1:8767` reaches the deployed
artifact.

### Where things live

```
portal/
  data.js         Catalogue: 4 programs x 12 modules, the LABS array, demo accounts
  app.js          Hash router, mock auth, entitlement gating, all portal views
  lab-runtime.js  Per-lab localStorage isolation — one lab's reset cannot wipe another's
  module-01.js    Module 1's self-contained miniature lab
  module-labs.css Lab styling
ui/               The simulator (inherited SC-200 lab, rebranded)
supabase/         Postgres schema + RLS for the real backend that replaces mock auth
local-tasks/      Fixture authoring pipeline that compiles into ui/data.js
bin/              dev.sh, launch.sh, qa-sweep.sh, render_all.js
```

### Two things to know before changing code

**The mock auth is a stand-in, not the design.** `portal/app.js` gates access in
the browser purely so the entitlement UI can be reviewed. The real authority is
the `has_module_access()` SQL function and RLS policies in
`supabase/migrations/`. The UI must never be the authority on access.

**Module lab state is namespaced per lab and per student.**
`lab-runtime.js` keys on `hsl-portal.lab-state.v1.<labId>.<anonymousStudentId>`,
so resetting one exercise cannot erase course progress or another module's work.
New module labs should go through `LabRuntime`, not raw `localStorage`.

## Curriculum status

The SOC Analyst track is the built one: 12 modules across 6 weeks, module 12 is
the capstone. Modules 1–11 are isolated miniature labs that deliberately expose
only task-relevant controls; **module 12 alone** exposes the complete integrated
range. Do not leak future evidence, full navigation, or the capstone storyline
into an earlier module.

Module 1 (`#/program/soc-analyst/module/1`) is implemented. The remaining
modules have their curriculum outline, objectives, and skills defined in
`portal/data.js` but no lab surface yet — the per-module plan and shared lab
contract are in `MODULAR_LAB_PROGRAM_PROGRESS.md`.

## Deployment

Pushing to `master` triggers `.github/workflows/pages.yml`, which assembles the
single-origin site and publishes it to GitHub Pages. No manual deploy step.

## Documentation map

| File | What it covers |
|---|---|
| `MODULAR_LAB_PROGRAM_PROGRESS.md` | Per-module lab plan, shared contract, QA gate |
| `PLATFORM_ARCHITECTURE.md` | Data model, entitlements, RLS, the real auth flow |
| `MODULE_STANDARD.md` | The shape every module object must carry |
| `HSL_DESIGN_TOKENS.md` | Colors, type, and components taken from the live site |
| `LATEST_PROGRESS.md` | Current status and project direction |
| `HANDOFF.md` | Engineering history |
| `PROJECT_GUIDE_FOR_AI.md` | Orientation for AI agents working in this repo |

Legacy SC-200 files (`SC200_LAB.md`, `ExamObjectives.md`, `COVERAGE_SWEEP.md`,
`GAP_BRIDGE.md`) are retained as implementation history. This course teaches
general SOC analyst work; those documents no longer define its scope.

## Legal

Hack Smarter Labs is an independent training publication and
is not affiliated with, authorized, sponsored, or approved by any software
vendor. All lab UI code and lab data are original and fictional. Curriculum
includes concepts aligned with cybersecurity analyst certification objectives;
completion does not guarantee certification or exam passage.
