# HSL Academy — SOC Analyst Program Platform Architecture

Status: **draft v1, architecture only — no implementation started**
Date: 2026-08-17
Companion documents: `HSL_DESIGN_TOKENS.md` (extracted live-site design system),
`PROJECT_GUIDE_FOR_AI.md` (simulator internals), `NAV_SPEC.md` (simulator nav).

---

## 1. What is being built

Three things that currently exist as two disconnected pieces:

| Piece | Today | Target |
|---|---|---|
| **Marketing site** `mntacademy.com` | Vite + React + Tailwind SPA, waitlist stage, one page of anchor sections. Source **not on this laptop**. | Gains a SOC Analyst program card + full program detail interface, using only existing design tokens. |
| **Student portal** | Does not exist. | Login → shows only the programs the student purchased → curriculum, progress, labs, capstone, portfolio. |
| **Simulator (this repo)** | Static vanilla-JS SPA on `127.0.0.1:8767`, all state in `localStorage`/`sessionStorage`. | Becomes the **supplemental lab environment**, launched from the portal, with per-user state persisted to Supabase. |

The three share one design system, one identity, one database.

### The framing that matters

The curriculum is the product. **The lab is supplemental** — a place to practise
what a module teaches, not the course itself. A student can complete a module's
lessons without the lab; the lab is where the module's hands-on block and the
capstone live. Architecturally this means the LMS owns progress and sequencing;
the simulator owns only its own scenario state and reports outcomes back.

---

## 2. System topology

```
                        ┌───────────────────────────────────────────┐
                        │  Supabase                                  │
   ┌────────────────────┤  • auth.users (email/password + OAuth)     │
   │                    │  • Postgres + Row Level Security           │
   │  session (JWT)     │  • Storage (portfolio artifacts, exports)  │
   │                    └───────────────────────────────────────────┘
   │                                    ▲              ▲
   │                                    │ REST/RPC     │ REST/RPC
   ▼                                    │              │
┌──────────────────────────────────────────────┐  ┌─────────────────────────┐
│ mntacademy.com  (Vite + React + Tailwind)    │  │ /lab/*  Simulator SPA   │
│                                              │  │ (this repo, vanilla JS) │
│  PUBLIC                                      │  │                         │
│   /                     marketing (existing) │  │  persistence shim       │
│   /programs/soc-analyst  program detail      │──▶│  hydrate → run → flush  │
│                                              │  │                         │
│  AUTHENTICATED                               │  └─────────────────────────┘
│   /login  /portal  /portal/:programSlug      │        same origin
│   /portal/:programSlug/labs  …               │   (required — see §7.2)
└──────────────────────────────────────────────┘
```

**Same origin is a hard requirement**, not a preference. The simulator is 30k
lines of vanilla JS that reads state synchronously. It gets the Supabase session
from the shared origin's `localStorage` with no auth round-trip, no token
passing through URLs, and no postMessage handshake. Serve the simulator at
`mntacademy.com/lab/` as static files. Do **not** put it on `lab.mntacademy.com`.

### Deployment shape

| Surface | Host | Notes |
|---|---|---|
| Marketing + portal | Vercel (matches existing Vite build) | SPA fallback rewrite for client routes |
| Simulator | Same Vercel project, `public/lab/` | Copied in at build; excluded from SPA rewrite so `/lab/*` serves its own `index.html` |
| Data/auth | Supabase | Anon key in client, RLS enforced. Service-role key never leaves server functions. |

---

## 3. Blocking prerequisite

**The marketing site source is not on this machine.** We have only the deployed
bundle. `github.com/Hack-Smarter-Labs` is an empty shell — no repos.
Nothing about the site exists off the deploying machine.

Nothing in §5–§6 can be implemented until one of these happens:

1. The site repo is pushed to the HSL org and cloned here, **or**
2. The source is copied from wherever it currently lives, **or**
3. A decision is made to rebuild the site from the extracted tokens (§`HSL_DESIGN_TOKENS.md`
   makes this viable and pixel-faithful, but it forks the codebase — not recommended).

Option 1 is the right answer, and it also fixes the fact that the live site has
no backup. Treat that as the first task.

Work that *can* start now, unblocked: the Supabase schema (§4), the curriculum
content model (§6.1), and the simulator persistence shim (§7).

---

## 4. Data model (Supabase)

Principle: **content lives in the repo, state lives in the database.** The
curriculum — 12 modules, topics, labs, capstone stages — is versioned TypeScript
in the site repo. Postgres stores only stable string keys pointing at it, plus
everything that is per-student. This keeps curriculum edits a code review rather
than a data migration, and keeps the tables small.

### 4.1 Catalogue

```sql
create table public.programs (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- 'soc-analyst'
  title         text not null,                 -- 'Cybersecurity Operations — SOC Analyst'
  subtitle      text,                          -- 'Learn to Investigate. Detect. Respond.'
  duration_weeks int not null,
  module_count  int not null,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.modules (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references public.programs(id) on delete cascade,
  module_key    text not null,                 -- 'soc-01' … 'soc-12'; joins to repo content
  number        int  not null,                 -- 1..12
  week          int  not null,                 -- 1..6
  title         text not null,
  is_capstone   boolean not null default false,
  sort_order    int  not null,
  unique (program_id, module_key),
  unique (program_id, number)
);

create table public.labs (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references public.modules(id) on delete cascade,
  lab_key       text not null unique,          -- 'lab-email-triage'
  title         text not null,
  difficulty    text not null check (difficulty in ('Foundational','Intermediate','Advanced')),
  duration_min  int  not null,
  sim_entry     text                           -- simulator route, e.g. '#/defender/incidents'
);
```

`sim_entry` is the seam between LMS and simulator: the only place the LMS knows
a simulator route. Everything else about the simulator stays opaque to the LMS.

### 4.2 Entitlement — "only what they purchased"

Two separate questions, and they need two mechanisms:

- *Which programs does this student see?* → `enrollments`
- *Which modules inside a program are open?* → `access_mode` + `module_entitlements`

```sql
create type access_mode as enum ('full', 'partial', 'drip');

create table public.enrollments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  program_id    uuid not null references public.programs(id),
  status        text not null default 'active'
                  check (status in ('active','paused','completed','expired','revoked')),
  access_mode   access_mode not null default 'full',
  purchased_at  timestamptz not null default now(),
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz,                   -- null = perpetual
  order_ref     text,                          -- payment processor reference
  unique (user_id, program_id)
);

-- Only consulted when access_mode = 'partial'.
create table public.module_entitlements (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  module_id     uuid not null references public.modules(id) on delete cascade,
  primary key (enrollment_id, module_id)
);

-- Only consulted when access_mode = 'drip'.
alter table public.enrollments add column drip_interval interval default '7 days';
```

The three modes, concretely:

| Mode | Behaviour | Use case |
|---|---|---|
| `full` | All 12 modules open immediately | Standard purchase |
| `partial` | Only modules listed in `module_entitlements` | Single-module or bundle sales; audit access |
| `drip` | Week *n* unlocks at `starts_at + drip_interval * (week-1)` | Cohort pacing |

Access resolves in one place, server-side, so the client can never be the
authority:

```sql
create or replace function public.has_module_access(p_module_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from enrollments e
    join modules m on m.program_id = e.program_id
    where m.id = p_module_id
      and e.user_id = auth.uid()
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and case e.access_mode
            when 'full'    then true
            when 'partial' then exists (
                   select 1 from module_entitlements me
                   where me.enrollment_id = e.id and me.module_id = m.id)
            when 'drip'    then now() >= e.starts_at + e.drip_interval * (m.week - 1)
          end
  );
$$;
```

Every gated table's RLS policy calls this function. One definition, no drift.

### 4.3 Progress

```sql
create type progress_state as enum ('not_started','in_progress','complete');

create table public.module_progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  module_id     uuid not null references public.modules(id) on delete cascade,
  state         progress_state not null default 'not_started',
  percent       int not null default 0 check (percent between 0 and 100),
  started_at    timestamptz,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table public.lesson_progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  module_id     uuid not null references public.modules(id) on delete cascade,
  lesson_key    text not null,                 -- from repo content
  state         progress_state not null default 'not_started',
  completed_at  timestamptz,
  primary key (user_id, lesson_key)
);

create table public.lab_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  state         progress_state not null default 'in_progress',
  score         numeric(5,2),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  result        jsonb not null default '{}'::jsonb   -- per-step outcomes
);
```

The `Not Started / In Progress / Complete / Locked` module states in the spec map
to `module_progress.state` for the first three; **`Locked` is never stored** — it
is derived at render time from `has_module_access`. Storing it would create two
sources of truth that drift the moment an entitlement changes.

### 4.4 Simulator state — the per-user JSON store

This is the "bunch of JSON settings tied to the assigned user" requirement.

```sql
create table public.sim_state (
  user_id       uuid not null references auth.users(id) on delete cascade,
  namespace     text not null,   -- 'global' | 'lab:<lab_key>' | 'capstone'
  payload       jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  updated_at    timestamptz not null default now(),
  primary key (user_id, namespace)
);
create index on public.sim_state using gin (payload jsonb_path_ops);
```

One row per user per namespace, not one row per key. The simulator has **97
distinct storage keys** plus dynamically-constructed ones, across **232 raw
`localStorage`/`sessionStorage` call sites** with no central wrapper. A key-per-row
table would mean hundreds of round-trips per session. A single JSONB blob per
namespace is one read on launch and one debounced write on change.

Namespacing matters for the "supplemental" framing:

- `global` — the student's persistent tenant: suppression rules, saved queries,
  promptbooks, nav preferences. Carries across every lab.
- `lab:<lab_key>` — scenario state scoped to one lab, so relaunching a lab can
  reset cleanly without wiping the student's own configuration.
- `capstone` — the 12-stage capstone, which must survive across sessions and
  never be reset by a lab relaunch.

Payload shape is the flattened storage map, verbatim keys preserved:

```json
{
  "local":   { "defender-lab.suppression.rules": "[…]", "defender-lab.hunting.mode": "guided" },
  "session": { "defender-lab.incident.id": "INC-1042" }
}
```

Keeping the original `defender-lab.*` key names is deliberate — renaming them
means auditing 232 call sites and silently discarding any existing local
progress. The namespace is an internal compatibility contract (`PROJECT_GUIDE_FOR_AI.md`
§ client-side state), not user-visible branding.

### 4.5 Portfolio and capstone

```sql
create table public.capstone_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  program_id    uuid not null references public.programs(id),
  stage         int not null check (stage between 1 and 12),
  answers       jsonb not null default '{}'::jsonb,
  score         numeric(5,2),
  submitted_at  timestamptz,
  unique (user_id, program_id, stage)
);

create table public.portfolio_artifacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in
                  ('incident_report','vuln_assessment','hunt_report',
                   'exec_summary','incident_timeline','capstone_report')),
  title         text not null,
  storage_path  text,                          -- Supabase Storage object
  content       jsonb,                         -- structured version
  created_at    timestamptz not null default now()
);
```

The capstone score breakdown on the completion screen (Investigation Accuracy,
Detection, Threat Hunting, Incident Response, Vulnerability Analysis, Reporting)
is computed from `capstone_submissions.score` per stage — a view, not stored
columns, so the rubric can be re-weighted without a migration.

### 4.6 RLS — the whole security model

Row Level Security **on every table**, no exceptions. The anon key is public by
design; RLS is what makes that safe.

```sql
alter table public.enrollments          enable row level security;
alter table public.module_entitlements  enable row level security;
alter table public.module_progress      enable row level security;
alter table public.lesson_progress      enable row level security;
alter table public.lab_attempts         enable row level security;
alter table public.sim_state            enable row level security;
alter table public.capstone_submissions enable row level security;
alter table public.portfolio_artifacts  enable row level security;

-- Self-access pattern, applied to every user-owned table:
create policy own_rows on public.sim_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Gated content: progress may only be written for modules the student owns.
create policy gated_module_progress on public.module_progress
  for all using  (user_id = auth.uid() and public.has_module_access(module_id))
      with check (user_id = auth.uid() and public.has_module_access(module_id));

-- Catalogue is world-readable but only when published; writes are admin-only.
alter table public.programs enable row level security;
create policy public_catalogue on public.programs for select using (is_published);
```

Non-negotiables, per the standing cyber-hygiene rule:

- Service-role key **never** in client code, never in the repo, never in `VITE_*`.
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` reach the browser.
- `.env.local` gitignored; secrets in Vercel env vars.
- Entitlement is enforced by RLS, not by hiding UI. Client-side gating is a
  courtesy to the student, never the control.
- Simulator fixture data stays fictional. The Hack Smarter Labs tenant
  migration documented in `LATEST_PROGRESS.md` is complete and does not change
  the platform architecture.

---

## 5. Marketing surface — `#programs` expansion

Rule from the brief, restated: **no redesign.** Everything below is assembled
from tokens already on the page (`HSL_DESIGN_TOKENS.md`).

### 5.1 The card

The `#programs` grid stays `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`. The
existing SOC card gains: a stat strip, skill chips, and two CTAs. It becomes the
only interactive card in the grid — accepted, because it is the only program
with a built curriculum.

Skill chips reuse the existing tinted-row treatment rather than inventing a chip:
`bg-[#f8fafc] border border-gray-100 rounded-xl` shrunk to `text-xs px-2.5 py-1
rounded-full`. Nine chips overflow a 4-up card, so show six with `+3 more`; the
full set renders on the detail page.

### 5.2 Detail interface — route, not modal

The site already ships `react-router-dom`. A modal cannot hold 12 accordion
modules, a labs grid, a 12-stage capstone, and career readiness without becoming
a page pretending to be a modal. Use a real route:

```
/programs/soc-analyst
```

This also gives shareable/indexable URLs, which a waitlist-stage site wants, and
matches the site's own existing behaviour (it has a router and a 404 route).
`Explore Program` navigates; `Request Information` continues to anchor to
`#waitlist`.

Header and footer are reused unchanged — the detail page renders inside the same
`pt-16` shell.

### 5.3 Page composition

| Block | Treatment |
|---|---|
| Hero | Dark band, `linear-gradient(150deg,#0c1e32,#1e3a5f,#162d4a)`, eyebrow pill "Cybersecurity Operations", `text-3xl font-bold text-white`, orange underline bar, subcopy `text-white/55` |
| Program overview | 5 stat cards, white on `#f8fafc` section, `rounded-2xl border border-gray-200 shadow-sm`, `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` |
| Program nav | Sticky `top-16` (below fixed header), `bg-white/95 backdrop-blur-sm border-b border-gray-100` — mirrors the site header exactly. Desktop: 5 inline links with the existing orange underline hover. Mobile: `overflow-x-auto` with `snap-x`, no dropdown (a dropdown is a new component; horizontal scroll is not) |
| Curriculum | 6 week groups, each an orange-eyebrow label, then module accordion cards |
| Labs | Card grid, `md:grid-cols-2 lg:grid-cols-3` |
| Capstone | Dark band (`#0a1628 → #1e3a5f → #0f2440`), 12 stages as a numbered vertical rail |
| Career readiness | Reuses the `#career` component pattern verbatim, plus portfolio artifact list |
| Certification | Light section, plain copy + disclaimer footnote |
| Final CTA | Dark band, `Request Information` (orange) + `Explore Curriculum` (outline) |

### 5.4 Accordion — the one new interactive primitive

The site has no accordion today. Build it from card tokens so it reads as
native:

- Collapsed: the standard card (`bg-white border border-gray-200 rounded-2xl
  shadow-sm`), `p-7` header row, `ri-arrow-down-s-line` rotating 180° on
  `transition-transform duration-200` — the same duration the cards already use
- Module number in a `w-12 h-12 rounded-xl bg-[#1e3a5f]/8` tile, matching the
  program-card icon tile exactly
- Meta row: time · lessons · labs, `text-xs text-gray-500`
- Expanded: `h-px bg-gray-100` divider, then Topics / Hands-On / Skills
- **No nested cards** (explicit UX requirement) — expanded content uses dividers
  and spacing, never a card inside a card
- `<button aria-expanded aria-controls>` semantics; keyboard-operable; content
  in the DOM for SEO, collapsed via `grid-template-rows` transition rather than
  `display:none`

Module 08 (Vulnerability Management, 9–12 hrs, six topic groups) is the stress
test — its expanded body is the largest. Build the accordion against Module 08
first; if it holds there, it holds everywhere.

### 5.5 Public vs. enrolled — one component, two modes

The curriculum component takes a `mode` prop:

- `public` — all 12 modules listed and expandable, full topic detail visible.
  This is the sales argument: *this is a technical program, not a video library.*
  No status badges, no launch buttons.
- `enrolled` — adds status badge, progress ring, `Launch Lab` buttons, and
  `Locked` treatment for modules outside the entitlement.

One component, so the enrolled view can never visually drift from the public one.

---

## 5A. Four tracks — isolation model

The site already advertises four programs. All four get the same interface; only
the content differs. Each track has a different author filling it in against
their own contract, working in parallel. **Track isolation is therefore an
architectural requirement, not a nicety** — one author must not be able to break,
block, or merge-conflict another.

| Slug | Program | Icon | Owner |
|---|---|---|---|
| `it-support` | IT Help Desk & Career Accelerator | `ri-customer-service-2-line` | TBD |
| `soc-analyst` | Cybersecurity Operations — SOC Analyst | `ri-shield-keyhole-line` | **Alex** |
| `ai-ml` | Foundations of AI & Machine Learning | `ri-robot-2-line` | TBD |
| `electrical` | Electrical Engineering Essentials | `ri-flashlight-line` | TBD |

### 5A.1 The isolation rule

```
src/
├── content/
│   ├── types.ts                 SHARED — the Program schema. Platform-owned.
│   ├── schema.ts                SHARED — zod validator. Platform-owned.
│   ├── registry.ts              SHARED — imports the 4 tracks. Platform-owned.
│   └── programs/
│       ├── it-support.ts        ← owned by IT Support author, no one else edits
│       ├── soc-analyst.ts       ← owned by Alex
│       ├── ai-ml.ts             ← owned by AI/ML author
│       └── electrical.ts        ← owned by EE author
├── components/program/          SHARED — all rendering. Track authors never edit.
└── pages/                       SHARED
```

Four rules that make this hold:

1. **One file per track.** A track author edits exactly one file in `content/programs/`
   plus their own assets folder. Nothing else. Git conflicts become impossible
   between tracks.
2. **No track-specific components.** The program page is fully data-driven. If a
   track needs something the schema can't express, the schema gets extended for
   *all four* — never a `if (slug === 'ai-ml')` branch. That branch is how four
   clean tracks become one tangled page.
3. **Schema-validated at build.** `schema.ts` (zod) validates every track at build
   time and in CI. A malformed track fails its own build, loudly, with the field
   path — it never renders broken or silently drops a module.
4. **Independent publish.** `programs.is_published` gates each track separately.
   SOC Analyst can ship complete while the other three are still stubs, and an
   unfinished track renders its existing marketing card with no `Explore Program`
   CTA — exactly today's behaviour.

### 5A.2 The shared contract

```ts
// src/content/types.ts — the contract all four tracks fill in
export interface Program {
  slug: string;
  title: string;              // full title, used on detail page
  cardTitle: string;          // short title, used on the #programs card
  eyebrow: string;            // 'Hack Smarter'
  icon: string;               // ri-* class
  badge: string;              // existing card badge line
  tagline: string;            // 'Learn to Investigate. Detect. Respond.'
  description: string;        // card description (existing copy)
  intro: string[];            // detail-page hero paragraphs
  stats: Stat[];              // 5 overview stats
  skills: string[];           // chips
  weeks: Week[];              // week groups
  labs: Lab[];
  capstone: Capstone;
  careerReadiness: CareerReadiness;
  certification?: Certification;   // optional — not every track has one
  isPublished: boolean;
}

export interface Week   { number: number; label: string; modules: Module[] }
export interface Module {
  key: string;                // '<slug>-01' — globally unique, DB join key
  number: number;
  title: string;
  summary: string;
  estHours: [number, number]; // [6, 8] → "6–8 Hours"
  topics: TopicGroup[];       // flat list = one unnamed group
  handsOn: HandsOn[];
  skills: string[];
  labKeys: string[];
  isCapstone?: boolean;
}
export interface TopicGroup { label?: string; items: string[] }
export interface HandsOn    { title: string; steps?: string[]; note?: string }
```

`TopicGroup.label` is optional specifically because most modules have a flat
topic list while Module 08 (Vulnerability Management) has six named groups. One
type covers both — no second shape, no special case.

### 5A.3 Track authoring workflow

An author working their contract does exactly this:

```bash
git checkout -b track/soc-analyst
$EDITOR src/content/programs/soc-analyst.ts
npm run validate:content       # zod check, all four tracks
npm run dev                    # /programs/soc-analyst renders live
git commit && open PR
```

They write data. They never touch a component, a route, a query, or the schema.
If they need the schema changed, that's a platform ticket — which keeps all four
tracks structurally identical, which is what makes one set of components work.

`CODEOWNERS` enforces it:

```
/src/content/programs/soc-analyst.ts   @alex
/src/content/types.ts                  @platform
/src/components/                       @platform
```

### 5A.4 Seeding

One idempotent seed script reads `registry.ts` and upserts all four programs,
their modules, and their labs — keyed on `slug` and `module_key`, so re-running
it after a content edit updates rather than duplicates. Run it in CI on merge to
main. Track authors never write SQL.

```
npm run seed:catalogue          # upsert programs/modules/labs from content files
npm run seed:catalogue -- --only soc-analyst
```

---

## 6. Portal surface — login and entitlement

### 6.1 Content model

See §5A.2. `src/content/programs/<slug>.ts` is the single source of truth per
track — the public page, the portal, and the DB seed script all read it, and
`module_key` is the join back to Postgres.

### 6.2 Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | public | Email/password + magic link |
| `/signup` | public | Gated behind purchase, or open with no enrollments |
| `/auth/callback` | public | Supabase redirect handler |
| `/portal` | auth | Dashboard — **only enrolled programs** |
| `/portal/:slug` | auth + enrolled | Curriculum in `enrolled` mode |
| `/portal/:slug/module/:n` | auth + module access | Module player |
| `/portal/:slug/labs` | auth + enrolled | Labs grid |
| `/portal/:slug/capstone` | auth + module access (12) | Capstone |
| `/portal/:slug/portfolio` | auth + enrolled | Artifacts |
| `/lab/*` | auth + enrolled | Simulator (static, outside React) |

### 6.3 Login page

Built entirely from existing tokens — this is a new page, not a new design:

- Split layout: left `linear-gradient(135deg,#0a1628,#1e3a5f,#0f2440)` with the
  logo and one line of copy; right white form panel. Single column under `md:`.
- Inputs: `border border-gray-200 rounded-xl px-4 py-3 text-sm` with
  `focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10`. The site has no
  input style yet outside the waitlist form — check that form's classes when the
  repo lands and match it instead of this if it differs.
- Submit: the standard orange button, `w-full`.
- Errors: `text-sm text-[#dc2626]` inline. Never disclose whether an email exists.

### 6.4 The gating flow

```
/portal loads
  → supabase.auth.getSession()          (no session → /login?next=…)
  → select enrollments join programs where status='active'
      → 0 rows  → "No active programs" + Request Information CTA
      → 1 row   → redirect straight to /portal/:slug   (the common case)
      → n rows  → program picker
  → /portal/:slug
      → select modules for program
      → select module_progress for user
      → resolve access per module (RPC batch, see below)
      → render: accessible modules interactive, others Locked
```

Resolve access for all 12 modules in one call, not twelve:

```sql
create or replace function public.my_module_access(p_program_slug text)
returns table (module_id uuid, module_key text, has_access boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.module_key, public.has_module_access(m.id)
  from modules m join programs p on p.id = m.program_id
  where p.slug = p_program_slug
  order by m.sort_order;
$$;
```

**A locked module still shows its title, summary, and topic list.** Locking hides
lessons, labs, and the launch action — never the existence of the module. A
student who bought a partial track should be able to see what they didn't buy.

---

## 7. Simulator integration

### 7.1 What changes in this repo

Almost nothing structural. Three additions, no refactor:

| File | Purpose |
|---|---|
| `ui/hsl-session.js` | Reads the Supabase session from the shared origin; exposes `HSL.user`, `HSL.labKey`, `HSL.entitled`. Loads **first**, before `data.js`. |
| `ui/hsl-persistence.js` | Hydrate/flush shim (§7.2). Loads **immediately after** `hsl-session.js`, before any other script touches storage. |
| `ui/hsl-lab-harness.js` | Reads `?lab=<lab_key>` , seeds the scenario, watches for completion conditions, writes `lab_attempts`. Loads **last**, after `workflow-automation.js`. |

Script order in `ui/index.html` is load-bearing and documented in
`PROJECT_GUIDE_FOR_AI.md`. The two new head scripts must precede `data.js`;
the harness must follow `workflow-automation.js`, which already overrides a view
registered earlier.

### 7.2 The persistence shim — hydrate / run / flush

The constraint: 232 synchronous storage calls, no wrapper, and rewriting them is
both large and risky. So don't. Intercept at the boundary instead.

```
1. HYDRATE   (blocking, before data.js)
   • await supabase.from('sim_state').select()
       .eq('user_id', uid).in('namespace', ['global', 'lab:'+labKey])
   • clear any foreign 'defender-lab.*' keys from a previous user
   • write payload.local  → localStorage
     write payload.session → sessionStorage
   • mark hydrated

2. RUN
   • the simulator runs completely unmodified, fully synchronous
   • a Proxy over Storage.prototype.setItem/removeItem marks keys dirty
     and schedules a flush

3. FLUSH   (debounced 2s, plus on visibilitychange + beforeunload via sendBeacon)
   • collect all 'defender-lab.*' keys
   • route each to 'global' or 'lab:<key>' by a static key→namespace map
   • upsert into sim_state with schema_version
```

Design notes:

- **Blocking hydrate.** The simulator reads storage during its first render; a
  post-hoc sync would flash the previous user's state. A short branded splash
  covers the fetch.
- **Last-write-wins per namespace.** A student is in one tab. `updated_at` +
  `schema_version` detect a stale overwrite and prompt rather than merge. Do not
  build CRDT merge for a single-user training lab.
- **Multi-user machines are the real bug this prevents.** Today, two students on
  one browser share `defender-lab.*` silently. The hydrate step's "clear foreign
  keys" is what fixes that, and it must run on sign-out too.
- **Offline degrades to today's behaviour** — localStorage keeps working, flush
  retries. The lab is supplemental; a Supabase outage must not block coursework.

Key→namespace routing lives in one table in `hsl-persistence.js`:

```js
const NAMESPACE_RULES = [
  [/^defender-lab\.(suppression|kql-practice|copilot\.(promptbooks|knowledge|plugins|settings))/, 'global'],
  [/^defender-lab\.capstone\./,                                                                   'capstone'],
  [/^defender-lab\./,                                                                             'lab'],
];
```

Default is `lab` — scenario state is the common case, and a mis-routed key
degrades to "resets when the lab resets" rather than leaking between students.

### 7.3 Launch contract

```
/lab/index.html?lab=lab-email-triage&module=soc-07#/defender/incidents
```

The LMS knows only `labs.sim_entry` and `lab_key`. The simulator knows nothing
about enrollments — it asks `hsl-session.js`, which checks the session and
bounces to `/login?next=` if absent. Full-page navigation, not an iframe: the
simulator assumes `height: 100vh; overflow: hidden` on `body` and has its own
topbar, so an iframe produces two chrome bars and a broken viewport.

Return path: a persistent `← Back to Module 07` control injected into the
simulator topbar by the harness — the one visual change to the simulator shell.

### 7.4 Completion reporting

The harness watches for scenario conditions already modelled in the simulator
(device isolated, account disabled, indicator blocked, evidence hashed) and
writes `lab_attempts.result`. Nothing in `views.js` or `app.js` needs to know it
is being observed. This keeps the LMS↔simulator coupling to two files.

---

## 8. Build sequence

Detailed sprint and per-agent task packages: **`SPRINT_PLAN.md`**. Summary:

| Phase | Work | Depends on |
|---|---|---|
| **0** | Get the marketing site source into the HSL GitHub org and cloned here | — (**blocking, do first**) |
| **1** | Supabase project, schema, RLS, `has_module_access`, seed script | — (can start now) |
| **2** | `types.ts` + `schema.ts` + registry; then the 4 track content files in parallel | — (can start now) |
| **3** | Persistence shim + session module in this repo, tested against localStorage-only fallback | 1 |
| **4** | Program cards + `/programs/:slug` public detail page (all tracks, data-driven) | 0, 2 |
| **5** | `/login`, `/auth/callback`, session context, route guards | 0, 1 |
| **6** | `/portal` + `/portal/:slug` with entitlement gating | 5 |
| **7** | Labs grid + launch contract + harness | 3, 6 |
| **8** | Capstone flow, scoring view, completion screen | 7 |
| **9** | Portfolio artifacts + Storage | 8 |

Phases 1–3 are unblocked by the missing repo. Start there.

---

## 9. Decisions needed

1. **Program title** — spec says "Cybersecurity Operations — SOC Analyst"; the
   live card says "Security Operation Center (SOC) Analyst". One name everywhere.
2. **Secondary button style** — the site has none. §`HSL_DESIGN_TOKENS.md`
   proposes an outline variant derived from existing tokens. This is the only
   net-new visual element; confirm it.
3. **Purchase path** — is there a payment processor, or are enrollments created
   manually/by admin for now? Affects whether `/signup` is open or invite-only,
   and what writes `enrollments.order_ref`.
4. **Default `access_mode`** — recommend `full` for launch; `drip` is the cohort
   feature and can wait.
5. **CySA+ naming** — the brief permits naming it with a disclaimer. Confirm
   whether to name it publicly at all, given the no-endorsement constraint.

## 10. Constraints carried forward

- No proprietary Microsoft HTML/CSS/JS reproduced (`PROJECT_GUIDE_FOR_AI.md` rule 1)
- Simulator stays vanilla HTML/CSS/JS with no build step (rule 2)
- All simulator data stays fictional (rule 4)
- Existing simulator storage key names preserved (§4.4)
- `HANDOFF.md` updated after each work session (rule 7)
- `NAV_SPEC.md` read before any simulator navigation change (rule 8)
- Brand written exactly as **Hack Smarter Labs** in the
  simulator; the marketing site uses **Hack Smarter Labs**
- No CompTIA/Microsoft endorsement, partnership, or pass-guarantee language
