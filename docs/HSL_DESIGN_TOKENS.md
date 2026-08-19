# HSL Academy — Design Tokens (extracted from production)

Source: `https://mntacademy.com/` production bundle, captured 2026-08-17.

- `assets/index-M98hg5MO.css` — Tailwind 3 output
- `assets/index-D4rBjS-C.js` — React 18 + react-router-dom SPA

These are the **actual values shipping on the live site**, read out of the built
bundle — not an approximation. Anything new in `#programs` must use only what is
on this page. Do not invent a token.

## Stack facts

| Fact | Value |
|---|---|
| Build | Vite, ES module bundle, `crossorigin` |
| Framework | React 18 (`jsx` runtime), `react-router-dom` already present |
| CSS | Tailwind CSS 3, no custom `@layer` component classes |
| Custom colors | Written as arbitrary values (`bg-[#f97316]`), **not** a `theme.extend` palette |
| Icons | Remix Icon 3.5.0 (`ri-*`) + Font Awesome 6.4.0 (both CDN) |
| Fonts | Space Grotesk (300–700), Inter (300–600) via Google Fonts |
| Body font | `body { font-family: 'Space Grotesk', sans-serif; }` (inline in `index.html`) |
| Routing today | Single page of anchor sections + a catch-all 404 route |

## Color

| Role | Hex | Usage seen on site |
|---|---|---|
| Primary navy | `#1e3a5f` | Headings, icon glyphs, nav hover text, icon tiles at `/8` and `/10` |
| Navy — deep | `#0c1e32` | `#programs` gradient start |
| Navy — mid | `#162d4a` | `#programs` gradient end |
| Navy — darkest | `#0a1628` | CTA band gradient start |
| Navy — alt | `#0f2440` | CTA band gradient end |
| Navy — header spacer | `#0f2035` | Strip under fixed nav |
| Accent orange | `#f97316` | Buttons, eyebrow text, underline bars, badges, dot markers |
| Accent orange hover | `#ea580c` | Button hover only |
| Blue glow | `#3b82f6` | `bg-[#3b82f6]/8` decorative blur |
| Blue glow light | `#60a5fa` | Radial decorative glow |
| Surface | `#ffffff` | Cards, light sections |
| Surface tinted | `#f8fafc` | Career-readiness list rows |
| Border | `gray-200` | Card borders |
| Border light | `gray-100` | Nav bottom border, card dividers, tinted row borders |
| Body text | `gray-500` / `gray-600` | Card copy / section copy |
| On-dark heading | `#ffffff` | |
| On-dark body | `white/55` | Section subcopy |
| On-dark pill | `white/10` bg, `white/80` text, `white/15` border | Eyebrow pill |

Gradients, verbatim:

```css
/* #programs section */
background: linear-gradient(150deg, #0c1e32 0%, #1e3a5f 50%, #162d4a 100%);

/* dark CTA band */
background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 45%, #0f2440 100%);
```

### Constellation field

The live `#programs` section lays a 320×320 tiled SVG of stars and faint
connecting lines over its gradient — 11 nodes, 12 edges, one orange node at
(160,110) with an orange edge to (260,160). Node fills `rgba(255,255,255,0.2–0.25)`,
edges `rgba(255,255,255,0.07)`, orange node `rgba(249,115,22,0.4)`, orange edge
`rgba(249,115,22,0.12)`. It replaces the older 28px radial dot grid.

The portal ships both variants in `portal/index.html`:

| Token | Where |
|---|---|
| `.hsl-stars` | Absolute overlay on dark panels — the live tile, unchanged |
| `body` background | Same geometry in navy (`rgba(30,58,95,0.12–0.16)` nodes, `0.05` edges) on `#f9fbfd`, so light sections read as the same surface |
| `.hsl-band` | `rgba(255,255,255,0.6)` veil — replaces solid `#f8fafc` section bands so the star field carries through |
| `.hsl-locked` / `.hsl-locked-strong` | Grayscale + white veil for locked cards. Do **not** fade cards with `opacity`: it turns them see-through and runs the star field through their text |

## Type scale (as used)

| Element | Classes |
|---|---|
| Section heading | `text-3xl font-bold` |
| Card title | `font-bold text-base leading-snug` |
| Eyebrow / kicker | `text-xs font-semibold uppercase tracking-widest` |
| Card body | `text-sm leading-relaxed` |
| Section body | `text-base leading-loose` (light) / `text-base` (dark) |
| Nav link | `text-sm font-medium` |
| Button | `text-sm font-semibold` (nav) / `font-semibold` (section CTA) |

## Shape and depth

| Token | Value |
|---|---|
| Card radius | `rounded-2xl` (1rem) |
| Button radius | `rounded-xl` (0.75rem) |
| Icon tile radius | `rounded-xl` |
| Pill / badge radius | `rounded-full` |
| Card shadow | `shadow-sm` — the **only** shadow on cards |
| Card border | `border border-gray-200` |
| Divider | `<div class="h-px bg-gray-100">` inside cards |
| Heading underline | `<div class="w-12 h-1 bg-[#f97316] rounded-full">` |

## Spacing and layout

| Token | Value |
|---|---|
| Section padding | `py-24 px-8` (dark CTA band uses `py-28 px-8`) |
| Container — wide | `max-w-7xl mx-auto` (`#programs`) |
| Container — medium | `max-w-6xl mx-auto` (`#career`) |
| Container — narrow | `max-w-4xl mx-auto` (CTA band) |
| Card padding | `p-7` |
| Card internal gap | `flex flex-col gap-5` |
| Grid gap | `gap-6` |
| Header height | `h-16`, content offset `pt-16` |
| Heading block margin | `mb-16` below centered header block |

## Responsive breakpoints

Tailwind defaults, and the site only uses `md:` and `lg:`:

```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
hidden md:flex          /* desktop nav */
```

Mobile-first single column is the existing pattern.

## Component recipes (copy these exactly)

### Program card

```html
<div class="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col gap-5
            shadow-sm hover:-translate-y-1 transition-transform duration-200 cursor-default">
  <div class="w-12 h-12 flex items-center justify-center rounded-xl bg-[#1e3a5f]/8">
    <i class="ri-shield-keyhole-line text-2xl text-[#1e3a5f]"></i>
  </div>
  <div class="flex-1">
    <p class="text-[#f97316] text-xs font-semibold uppercase tracking-widest mb-1.5">Hack Smarter</p>
    <h3 class="text-[#1e3a5f] font-bold text-base leading-snug mb-3">…</h3>
    <p class="text-gray-500 text-sm leading-relaxed">…</p>
  </div>
  <div class="h-px bg-gray-100"></div>
  <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f97316] self-start">
    <i class="ri-arrow-right-circle-line text-sm"></i>…
  </span>
</div>
```

Note: current cards are `cursor-default` and non-interactive. Making the SOC card
clickable (`Explore Program`) is the one intentional behavior change; keep the
hover lift identical.

### Primary button

```html
<a class="inline-block bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold
          px-8 py-3.5 rounded-xl transition-all hover:-translate-y-0.5
          whitespace-nowrap cursor-pointer">Request Information</a>
```

Nav-sized variant: `text-sm font-semibold px-5 py-2 rounded-xl transition-colors`.

There is **no secondary button style on the site yet.** For `Explore Program` /
`Explore Curriculum`, derive one from existing tokens rather than importing a new
look — on light: `border border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/8
font-semibold px-8 py-3.5 rounded-xl transition-all`; on dark: `border
border-white/20 text-white hover:bg-white/10`. Flag this to the user as the only
net-new visual decision.

### Chip / tag — **already exists on the site**

Used in the `#about` section for "Veterans Focused", "Career Changers Welcome", etc.
This is the canonical chip. Use it for skill tags — do not invent a new one.

```html
<span class="bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium
             px-4 py-2 rounded-xl">SIEM</span>
```

Compact variant for in-card skill tags (same tokens, tighter):
`text-xs px-2.5 py-1 rounded-lg`.

### Section header block

```html
<div class="text-center mb-16">
  <div class="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold
              px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 border border-white/15">
    <span class="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>What We Offer
  </div>
  <h2 class="text-3xl font-bold text-white mb-4">Program Areas</h2>
  <div class="w-12 h-1 bg-[#f97316] rounded-full mx-auto mb-6"></div>
  <p class="text-white/55 text-base max-w-xl mx-auto">…</p>
</div>
```

Light-section variant of the eyebrow pill: `bg-[#f97316]/10 text-[#f97316]`
with no border.

### Nav link

```html
<a class="relative text-gray-600 hover:text-[#1e3a5f] text-sm font-medium
          transition-all duration-300 cursor-pointer px-4 py-2 rounded-lg
          hover:bg-[#1e3a5f]/8 group">
  Programs
  <span class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#f97316]
               rounded-full transition-all duration-300 group-hover:w-3/4"></span>
</a>
```

Header shell: `fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm
border-b border-gray-100`, inner `max-w-7xl mx-auto px-8 h-16 flex items-center
justify-between`, logo `img /logo.png h-10 w-auto`.

## Current site content (do not contradict)

- Nav: Programs · Career Readiness · About · **Join Waitlist** (`#waitlist`)
- The four program cards live in `#programs`, all with eyebrow "Hack Smarter":

| # | Title (live) | Icon | Badge |
|---|---|---|---|
| 1 | IT Help Desk & Career Accelerator | `ri-customer-service-2-line` | Launch into IT Support in 6 weeks |
| 2 | Security Operation Center (SOC) Analyst | `ri-shield-keyhole-line` | Secure a role in Cybersecurity Ops |
| 3 | Foundations of AI & Machine Learning | `ri-robot-2-line` | Pivot to the future of Data Science |
| 4 | Electrical Engineering Essentials | `ri-flashlight-line` | Rapid entry into Technical Trades |
- `#career` already exists: "Hack Smarter Career Readiness Core", 4 items
  (Resume/Portfolio, LinkedIn, Interview Prep, Professional Branding)
- Site is pre-launch/waitlist stage — there is no login, no account, no LMS today

## Naming — RESOLVED 2026-08-17

**The live site is the authority.** Where the build spec and the site disagree,
the site wins.

| Field | Value (canonical) |
|---|---|
| Program name | `Security Operation Center (SOC) Analyst` |
| Card description | `Train in live SIEM environments, packet analysis, and threat detection workflows used in modern Security Operations Centers.` |
| Badge | `Secure a role in Cybersecurity Ops` |
| Section eyebrow | `What We Offer` |
| Section heading | `Program Areas` |
| Section subcopy | `Accelerated, career-focused tracks designed to get you workforce-ready fast.` |

Use this name everywhere: card, detail page, portal, certificate, database.
The spec's "Cybersecurity Operations — SOC Analyst" is **retired** — do not
reintroduce it.

The spec's longer paragraph ("Prepare for entry-level cybersecurity operations
and SOC analyst roles through…") is kept as **detail-page intro copy only**. It
expands on the card without replacing it, so the two never contradict.

## Icon mapping (Remix Icon, already loaded)

| Concept | Icon |
|---|---|
| Program / SOC | `ri-shield-keyhole-line` |
| Weeks / duration | `ri-calendar-line` |
| Modules | `ri-stack-line` |
| Hours | `ri-time-line` |
| Labs | `ri-flask-line` |
| Capstone | `ri-flag-line` |
| Delivery / online | `ri-global-line` |
| Accordion expand | `ri-arrow-down-s-line` |
| Complete | `ri-checkbox-circle-fill` |
| In progress | `ri-progress-4-line` |
| Locked | `ri-lock-line` |
| Launch lab | `ri-play-circle-line` |
| Report / portfolio | `ri-file-text-line` |
| Career readiness | `ri-user-voice-line` |

Stay inside the `ri-*` set — no new icon library, no inline SVG icon system.
