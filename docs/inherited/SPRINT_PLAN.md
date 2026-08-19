# HSL Academy Platform — Sprint & Agent Plan

Companion to `PLATFORM_ARCHITECTURE.md`. Date: 2026-08-17.
Agent numbering continues from the historical run in `PRODUCT_ARCHITECTURE_PLAN.md`
(which ended at Agent 25). New work starts at **Agent 30**.

## Status board

| Sprint | Agent | Scope | Status |
|---|---|---|---|
| 0 | — | Unblock: site repo, Supabase project, decisions, owners | **Partial** — Supabase built; site repo still missing |
| 1 | 30 | Data layer: schema, RLS, access functions, seed | **Done — verified** |
| 1 | 31 | Content contract: `types.ts`, `schema.ts`, registry | Not started — **gates T1–T4** |
| 1 | 32 | Simulator persistence shim | Not started |
| 2 | 33 | SOC Analyst content (Alex) | Not started |
| 2 | 34/35/36 | IT Support / AI-ML / Electrical content | Blocked on owners |
| 3 | 37 | Program card + `/programs/:slug` | Prototyped in `portal/`, needs port to site repo |
| 3 | 38 | Curriculum accordion, labs, capstone display | Prototyped in `portal/` |
| 4 | 39 | Authentication | Prototyped with mock auth; Supabase swap pending |
| 4 | 40 | Portal + entitlement gating | Prototyped and DB-verified |
| 5 | 41 | Lab launch contract | Prototyped (links to sim on 8767) |
| 5 | 42 | Capstone flow | Not started |
| 6 | 43 | Portfolio + Storage | Not started |
| 6 | 44 | Verification sweep | Not started |

Running locally right now:

| Service | URL |
|---|---|
| Portal prototype | http://127.0.0.1:8768/ |
| Simulator (lab) | http://127.0.0.1:8767/ |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

---

## 0. Lane model — why parallelism works here and didn't before

The historical agents in this repo ran **sequentially**, because every one of
them edited `ui/data.js`, `ui/views.js`, and `ui/app.js`. Shared files, forced
serialization, one commit at a time.

The new platform is deliberately structured so that is no longer true. Work
splits into five lanes with **disjoint file ownership**:

| Lane | Owns | Parallel-safe? |
|---|---|---|
| **P — Platform** | schema, components, routes, auth, shim | Serial within lane |
| **T1 — IT Support** | `content/programs/it-support.ts` + assets | Yes |
| **T2 — SOC Analyst** (Alex) | `content/programs/soc-analyst.ts` + assets | Yes |
| **T3 — AI & ML** | `content/programs/ai-ml.ts` + assets | Yes |
| **T4 — Electrical** | `content/programs/electrical.ts` + assets | Yes |

The four track lanes touch exactly one file each and never touch a component.
They can run simultaneously — as four humans, four agents, or a mix — with zero
merge risk. That property is the whole point of §5A in the architecture, and
it is worth protecting: **the moment a track needs a component change, it stops
being a track task and becomes a platform ticket.**

Lane P is still serial. Components and schema are shared, same as `views.js` was.

### Gate between lanes

T1–T4 are blocked until **P delivers `types.ts` + `schema.ts`** (Sprint 1). That
is a small, fast deliverable and it is deliberately first, because four authors
idling on a missing type definition is the most expensive failure mode in this
plan.

---

## Sprint 0 — Unblock (1–2 days)

Not agent work. Human/account work, and everything downstream waits on it.

| # | Task | Owner | Done when |
|---|---|---|---|
| 0.1 | Locate the `mntacademy.com` Vite source and push it to `github.com/Hack-Smarter-Labs` | Alex | Repo exists, clones, `npm run dev` serves the current site |
| 0.2 | Create the Supabase project; capture URL + anon key in `.env.local` (gitignored) | Alex | `supabase status` / dashboard reachable |
| 0.3 | Confirm the 5 open decisions in `PLATFORM_ARCHITECTURE.md` §9 | Alex | Answers recorded in this file |
| 0.4 | Assign owners for T1, T3, T4 | Alex | Names in the lane table above |

**0.1 is the single highest-risk item in the project.** The live site currently
exists only as a build artifact on one machine and a bundle on a CDN. Until it
is in the org, every phase 4+ task is unstartable and the site is one disk
failure from being gone.

---

## Sprint 1 — Foundations (parallel: P + this repo)

Goal: unblock the four track authors, and get per-user persistence working in
the simulator independent of the website.

### Agent 30 — Data layer (lane P) — ✅ **DONE, VERIFIED**

- **30A Schema:** ✅ `supabase/migrations/20260817090000_catalogue.sql`,
  `…090100_enrollment.sql`, `…090200_progress_and_state.sql`. Enums, FKs,
  unique constraints, `updated_at` triggers, `capstone_scorecard` view.
- **30B Access control:** ✅ `…090300_rls.sql`. `has_module_access()`,
  `has_program_access()`, `my_module_access()`; RLS on all 12 tables; blanket
  grants revoked then re-granted narrowly so a future table without a policy
  fails closed rather than open.
- **30C Seed:** ✅ `supabase/seed.sql` — 4 programs, 12 SOC modules, 16 labs,
  3 demo accounts with full / partial / no entitlement.
  The production `seed:catalogue` script still belongs to Agent 31's registry.

Acceptance — **all six assertions pass against the running stack**:

| # | Assertion | Result |
|---|---|---|
| 1 | Partial student writing progress for a locked module | **403** |
| 2 | Same student writing progress for an unlocked module | **201** |
| 3 | Student B reading Student A's `sim_state` | **`[]`** |
| 4 | Student B forging a `sim_state` row owned by Student A | **403** |
| 5 | Anonymous client reading `enrollments` | **permission denied** |
| 6 | Anonymous client reading unpublished programs | **only `soc-analyst`** |

Entitlement resolution confirmed end to end: full → 12 unlocked / 0 locked;
partial → 4 / 8; none → 0 / 12.

**Gotcha recorded for whoever re-seeds:** `auth.users` rows must set
`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`,
`email_change_token_current`, `phone_change`, `phone_change_token`, and
`reauthentication_token` to `''`. GoTrue scans them into non-nullable Go strings,
so NULL makes every sign-in fail with `"Database error querying schema"` — which
reads like a broken config and is not.

**Also recorded:** the `supabase` CLI at `~/.local/bin/supabase` is a shim whose
`supabase-go` binary was missing. The working install is
`~/.local/share/supabase/`; put it on `PATH` before running any `supabase`
command.

### Agent 31 — Content contract (lane P) — **gates T1–T4**

- **31A `types.ts`:** the `Program` interface tree from §5A.2, exhaustively
  commented, with `soc-analyst` Module 01 and Module 08 written out as the two
  worked examples (flat topics vs. grouped topics).
- **31B `schema.ts`:** zod validator mirroring the types; `npm run validate:content`
  fails with a field path on any malformed track.
- **31C `registry.ts` + stubs:** four stub track files that validate clean and
  render as unpublished. Every author starts from a green build.

Acceptance: `npm run validate:content` passes with 4 stubs; deliberately breaking
one field in one track fails that track with a readable path and does not affect
the other three.

### Agent 32 — Simulator persistence (this repo, lane P)

- **32A `ui/hsl-session.js`:** Supabase session read, `HSL.user`, `HSL.labKey`,
  `HSL.entitled`, sign-out hook. Loads before `data.js`.
- **32B `ui/hsl-persistence.js`:** hydrate/run/flush shim per §7.2. Storage
  proxy, `NAMESPACE_RULES`, 2s debounce, `visibilitychange` + `beforeunload`
  beacon flush, foreign-key purge on user change.
- **32C Offline fallback:** with no session or no network, the simulator behaves
  exactly as it does today — localStorage only, no errors, no blocking splash.

Acceptance: sign in as user A, isolate `WKSTN-042`, create a suppression rule,
sign out, sign in as user B on the same browser → B sees a clean environment; A
signs back in → both actions are still there. Run `node bin/render_all.js` and
confirm the baseline is unchanged (109/110, `purview/audit` still the only fail).

**Do not** rename any `defender-lab.*` key. 232 call sites, no wrapper — see §4.4.

---

## Sprint 2 — Track content (fully parallel: T1 · T2 · T3 · T4)

Four lanes, four files, no interaction. Each track author fills their contract.

### Agent 33 / T2 — SOC Analyst content (**Alex's lane**)

The full spec is already written; this is transcription into `types.ts` shape.

- **33A Weeks 1–3:** Modules 01–06 — topics, hands-on, skills, est. hours
- **33B Weeks 4–5:** Modules 07–10, including Module 08's six topic groups and
  the eight lab workflows written as `HandsOn.steps`
- **33C Week 6 + capstone:** Module 11, Module 12's 12 stages, completion-screen
  score dimensions
- **33D Labs + career + certification:** 10–15 lab definitions with `difficulty`,
  `duration_min`, `sim_entry`; portfolio artifacts; the CySA+ alignment copy with
  its non-affiliation disclaimer

Acceptance: `validate:content` green; `/programs/soc-analyst` renders all 12
modules; `seed:catalogue --only soc-analyst` produces 12 module rows and the
declared lab rows.

### Agents 34 / 35 / 36 — T1, T3, T4 content

Same package shape against their own contracts. Each author gets `types.ts`,
this section, and the SOC track as the worked reference. They ship independently;
`isPublished: false` until their track is complete.

---

## Sprint 3 — Public program interface (lane P)

Depends on Sprint 0.1 (repo) and Agent 31.

### Agent 37 — Program card + detail shell

- **37A Card upgrade:** stat strip, skill chips (existing `bg-gray-50 border
  border-gray-200 rounded-xl` chip), primary/secondary CTAs. Published tracks get
  `Explore Program`; unpublished keep today's static card.
- **37B `/programs/:slug` route:** data-driven from the registry, reusing header
  and footer unchanged, hero + 5-stat overview.
- **37C Sticky program nav:** `top-16`, mirrors the site header treatment;
  desktop inline links with the existing orange underline hover, mobile
  `overflow-x-auto snap-x`.

### Agent 38 — Curriculum, labs, capstone display

- **38A Accordion primitive:** built from card tokens, `aria-expanded`,
  keyboard-operable, `grid-template-rows` collapse, no nested cards.
  **Build against SOC Module 08 first** — it is the largest expanded body in any
  track and will expose layout failures the small modules hide.
- **38B Week grouping + module cards:** week label rails, meta row, skill chips
- **38C Labs grid + capstone rail + career readiness + final CTA**

Acceptance: no horizontal page scroll at 375, 768, 1024, 1440. Lighthouse
accessibility ≥ 95 on `/programs/soc-analyst`. Visual diff against the existing
`#programs` section shows no change to the four existing cards' styling beyond
the intended additions.

---

## Sprint 4 — Auth and entitlement (lane P)

### Agent 39 — Authentication

- **39A `/login`, `/signup`, `/auth/callback`:** split layout from existing
  tokens; email/password + magic link; `?next=` preservation
- **39B Session context + guards:** `<RequireAuth>`, `<RequireEnrollment>`,
  `<RequireModuleAccess>`; loading states that don't flash unauthenticated content
- **39C Sign-out:** clears the Supabase session **and** purges `defender-lab.*`
  from local/session storage (§7.2 — otherwise the next student inherits the
  previous one's lab)

### Agent 40 — Portal and gating

- **40A `/portal`:** enrolled programs only; 0 → empty state with Request
  Information; 1 → redirect straight through; n → picker
- **40B `/portal/:slug`:** curriculum in `enrolled` mode; one `my_module_access`
  RPC for all modules, not one call per module
- **40C Module states:** Not Started / In Progress / Complete from
  `module_progress`; **Locked derived at render, never stored**. Locked modules
  still show title, summary, and topics — only lessons, labs, and launch are hidden.

Acceptance: a student with `access_mode='partial'` and 4 of 12 modules entitled
sees 4 interactive and 8 locked; hand-crafting a request for a locked module's
progress row is **rejected by RLS**, not merely hidden by the UI. Test that
explicitly.

---

## Sprint 5 — Lab integration (lane P + this repo)

### Agent 41 — Launch contract

- **41A Serve `/lab/*`:** simulator copied into the deploy at build; excluded
  from the SPA rewrite so it serves its own `index.html`
- **41B Launch + return:** `?lab=&module=#route` contract; `← Back to Module NN`
  injected into the simulator topbar (the only change to the simulator shell)
- **41C `ui/hsl-lab-harness.js`:** seeds scenario state, watches completion
  conditions already modelled in the sim, writes `lab_attempts.result`

### Agent 42 — Capstone

- **42A 12-stage flow** with per-stage save to `capstone_submissions`
- **42B Scoring view:** the six score dimensions as a SQL view over stage scores,
  re-weightable without a migration
- **42C Completion screen** + `View Program Completion` / `Review Capstone`

---

## Sprint 6 — Portfolio and hardening (lane P)

### Agent 43 — Portfolio

- **43A** `portfolio_artifacts` + Supabase Storage, RLS on the bucket
- **43B** Sanitized report export from capstone and lab outputs
- **43C** `/portal/:slug/portfolio`

### Agent 44 — Verification (read-only, parallel-safe)

- **44A Security sweep:** no service-role key in any client bundle; every table
  RLS-enabled; anon key is the only key in `VITE_*`; no secrets committed
- **44B Cross-track regression:** all four tracks render; publishing/unpublishing
  one track affects no other
- **44C Simulator baseline:** `node bin/render_all.js` unchanged; `node --check`
  clean on all `ui/*.js`; browser walkthrough at 1366×768

---

## Running agents

**This repo** (Agent 32, and the sim half of 41): sequential, existing
`bin/run-codex-agents.sh` pattern — shared `ui/*.js` still forces serialization.

**Website repo** (everything else): lane P sequential; T1–T4 fully parallel once
Agent 31 lands. Each track agent gets a preamble naming its one owned file and
forbidding edits outside it — that constraint is what keeps the lanes clean, so
state it explicitly in the prompt rather than trusting convention.

Per the standing sprint-handoff rule: **at the end of every sprint, update
`PLATFORM_ARCHITECTURE.md` and this file** so the next agent or author starts
cold with no reconstruction.

---

## Open decisions (blocking, from §9)

| # | Decision | Blocks |
|---|---|---|
| 1 | Program title: spec's "Cybersecurity Operations — SOC Analyst" vs live "Security Operation Center (SOC) Analyst" | Agent 33, 37 |
| 2 | Secondary button style (site has none — outline variant proposed) | Agent 37 |
| 3 | Payment processor vs manual enrollment | Agent 39, 40 |
| 4 | Default `access_mode` (recommend `full`) | Agent 30, 40 |
| 5 | Name CySA+ publicly, with disclaimer? | Agent 33 |
| 6 | Owners for T1 / T3 / T4 | Sprint 2 |
