# Hack Smarter Labs — Orchestration

Cold-start context for agents picking this up. Read `README.md` first, then your
lane below. **Lanes A–F are independent and may run in parallel**, except where
"depends on" says otherwise.

## Where the project stands

Done (this session, by hand — do not redo):

- Forked the academy's simulator half into `~/hacksmarter-labs`. Dropped
  `portal/`, `supabase/`, `local-tasks/`, the Pages workflow, and the
  portal-only bin scripts. The range is `ui/` and nothing else.
- Mechanical rebrand across all 51 text files: Mission Next Technical Academy →
  Hack Smarter Labs, `missionnextlabs` → `hacksmarterlabs`, `MNT`/`mnt-` →
  `HSL`/`hsl-`, `MISSIONNEXTLABS` domain → `HACKSMARTERLABS`. Zero leftovers.
- Logo: `ui/assets/hacksmarter-mark.png` (hooded mark, transparent) in the
  topbar at 52px, topbar grown 44px → 64px, `calc(100vh - …)` updated to match.
  Same mark on the dark square is the dash icon at
  `~/.local/share/icons/hacksmarter-labs.png`.
- Dash entry `~/.local/share/applications/hacksmarter-labs.desktop`, pinned to
  GNOME favorites, launching `bin/launch.sh` → `bin/dev.sh` → `:8777`.
- Verified: all 12 `ui/*.js` pass `node --check`; `bin/render_all.js` reports
  128/129 views clean and 0 dead NAV routes — byte-identical to what the
  upstream project reports, so the rebrand introduced no regressions.

Also done since: route namespaces neutralized, the DLP surface rebuilt as an
interactive lab, and `bin/render_all.js` taught about mount-time views — it now
reports **129/129 clean, 0 dead NAV routes, exit 0**. The old
`purview/audit: tiny/empty render` was never a defect; the harness could not
mount an `{ html, onMount }` view and mislabeled all ten of them.

Also done since: the three-sprint de-Microsofting project (`docs/DEMICROSOFTING_PLAN.md`
→ `docs/DEMICROSOFTING_PROGRESS.md`, all 3 sprints closed out) — this is what
finished Lane B below, removed promptbooks/Settings pages and merged
AI-assisted playbooks into `siem/automation`, and de-Microsofted the
`xdr/incident` page's own tab taxonomy and action-button copy (not just word-
level vendor names). Read `docs/DEMICROSOFTING_PROGRESS.md`'s closing summary
before assuming any further de-Microsofting work is needed — check its
"Reviewed and deliberately left alone" notes first, since several things that
look like leaks at a glance (helpdesk's raw "Defender"/"PowerShell"/"Windows,"
`AAD`-prefixed hostnames, bare "Graph") are documented, intentional carve-outs,
not gaps.

## Hard rules

1. **No vendor product names in learner-facing copy.** `ui/neutral-terminology.js`
   is the enforcement point. Adding a view that shows one means adding a mapping,
   never shipping the raw name. This is the single thing the user most values
   about this fork.
2. **No login, no curriculum, no module gating.** The range opens fully
   unlocked on first click. If a change would put a door in front of the
   environment, it is out of scope.
3. **No secrets, ever.** The repo is public. No tokens, keys, real hostnames,
   real people, or real tenant data — everything stays fictional.
4. Internal identifiers (routes, storage keys, fixture field names) are
   compatibility contracts. Rename visible strings, not those.

---

## Lane A — Brand sweep

Finish what the mechanical pass could not reach.

- [ ] Sweep `ui/styles.css` for colors inherited from the academy palette and
      reconcile them with the Hack Smarter mark (near-black `#020510`, white).
      `docs/HSL_DESIGN_TOKENS.md` documents the current tokens.
- [ ] Check the topbar at the two responsive breakpoints (`max-width: 1100px`
      and `820px`, `ui/styles.css` ~line 4018 and ~4042). The 820px rule sets
      `height: auto`, so the taller bar should be fine, but verify the 52px
      mark does not crowd the search field at 1100px.
- [ ] Audit every remaining `Hack Smarter` / `Hack Smarter Labs` string for
      places the substitution reads awkwardly in a sentence written for an
      academy ("your program", "your enrollment", "this course").
- [ ] Confirm the footer disclaimer still reads correctly for a range rather
      than a course.

## Lane B — Vendor-neutral terminology guard ✅ DONE

- [x] Read `ui/neutral-terminology.js` end to end (220 lines) and extend it to
      cover anything currently slipping through — walk the rendered DOM of all
      129 views, not just the source.
- [x] Write `bin/neutral-check.js`: render every view (reuse the harness in
      `bin/render_all.js`) and fail non-zero if any vendor product name reaches
      visible text. Wire it into `bin/qa-sweep.sh` and CI.
- [x] Decide the policy on names that are genuinely generic industry terms
      (KQL, MITRE ATT&CK, SPF/DKIM/DMARC) and write it down in the README so
      the next agent does not over-neutralize.

Done across `docs/DEMICROSOFTING_PLAN.md` / `docs/DEMICROSOFTING_PROGRESS.md`'s
three-sprint de-Microsofting project (full history and verification detail
lives there, not duplicated here):

- `bin/neutral-check.js` exists, is wired into `bin/qa-sweep.sh`, and is clean
  (124/124 views, 0 post-neutralization leaks) as of Sprint 3's close-out.
- `ui/neutral-terminology.js` was extended with 7 compound-identifier patterns
  (Sprint 1) and a corrected `.wl-helpdesk`/`#sidenav` carve-out scope
  (Sprint 1 — the old guard had started exempting the *entire* shared nav rail
  once `NAVIGATION_PROGRESS.md` Sprint 2 made `#sidenav` a single global rail;
  it's now scoped to only helpdesk's own `#/helpdesk/*` rows).
- The generic-industry-term policy (below) is the permanent answer to this
  bullet — read it before adding a new pattern to `neutral-terminology.js` or
  flagging something as a leak.

**Generic-industry-term policy — what stays un-neutralized, and why.** A term
is left alone (not added to `neutral-terminology.js`'s pattern list, not
flagged as a leak by `bin/neutral-check.js` or a manual audit) when it meets
all three:

1. It names a real, external standard, protocol, framework, or language —
   not a specific vendor's product, portal, or marketing-coined feature name.
   Examples already in the app and deliberately kept raw: KQL / Kusto Query
   Language, MITRE ATT&CK, SPF, DKIM, DMARC, CVE, CVSS, OAuth, SAML, RBAC,
   STIX/TAXII, IaaS/PaaS/SaaS.
2. Removing or renaming it would strip the exact vocabulary a working analyst
   needs on the job — i.e. the loss would be pedagogical, not just cosmetic
   de-branding. (This is why KQL stays even though Microsoft originated it:
   it is the field-standard name for the query language this app's own
   hunting surfaces teach, not a UI feature name.)
3. It is not a vendor-marketing-coined portal/feature name, even when the
   underlying mechanic is real and worth keeping. Contrast: "Attack story,"
   "Alert story," "Go hunt," and "Evidence and Response" were confirmed via
   live Microsoft Learn research (see `DEMICROSOFTING_PROGRESS.md` Sprint 3)
   to be Defender XDR's own coined names for generic capabilities (an
   incident timeline/graph, a hunting pivot, an evidence tab) and were
   renamed at the source ("Attack narrative," "Alert narrative,"
   "Investigate further," "Evidence and remediation") even though the
   underlying mechanic stayed identical. "Blast radius," by contrast, was
   judged generic-enough (common security/SRE postmortem vocabulary, not
   coined by or unique to Microsoft) and was kept.

Terms that must always render neutralized, never whitelisted: Microsoft,
Defender (+ variants), Sentinel, Purview, Entra, Azure (+ named services),
Copilot, Microsoft 365/M365/Office 365, Teams, SharePoint, OneDrive,
Exchange, Outlook, Windows (outside the helpdesk carve-out below), GitHub,
Intune, Microsoft Learn.

One standing carve-out: `ui/helpdesk.js` / `helpdesk-data.js` content behind
`isHelpDeskTechnicalContent` (real Windows-desktop-support vocabulary —
"Windows Desktop," "PowerShell," and GPO purpose text that names "Defender"
as an OS component) renders un-neutralized on purpose, because a helpdesk
simulation needs the real names of the OS features it's teaching. This is
the one place a blocked term (`Defender`) is known to survive raw in a live
render — confirmed and intentional, see `DEMICROSOFTING_PROGRESS.md` Sprint 1
and Sprint 3 notes. It is why Sprint 3 kept the stronger disclaimer instead
of shortening it.

## Lane C — Cut the last portal cords ✅ DONE

The coach layer is deleted, not made self-contained — Alex's call: no coach is
needed in the range. `ui/coach.js` and `ui/coach-data.js` are gone, along with
their script tags, the two `typeof coach… === 'function'` hooks in `app.js`, and
241 lines of coach CSS. No `8768`/`SIM_ORIGIN` reference survives anywhere.

Storage keys moved with it. Everything is under `hsl.*` now, with the vendor
names gone from the middle segments too (`.copilot.` → `.ai-agent.`, `.entra.` →
`.identity.`, `.sentinel.` → `.siem.`, `.defender-cloud.` → `.cloud.`, `.m365.`
→ `.workspace.`) so keys match the route ids. `ui/storage-keys.js` loads first
and carries any pre-existing `defender-lab.*` state across once, so nobody who
had already used the range loses their filters and drafts.

## Lane D — Docs triage

`docs/inherited/` is 17 files of academy-era planning, kept verbatim so nothing
was lost. Most of it does not describe this product.

- [ ] Triage each file: keep (move to `docs/`), or delete. Portal architecture,
      sprint plans, exam-objective mappings, and module standards are almost
      certainly delete.
- [ ] `docs/HANDOFF.md` is 115K of mixed portal and simulator history. Extract
      the parts that explain how the range's data and views actually work into a
      new `docs/RANGE_INTERNALS.md`; drop the rest.
- [ ] Delete `defender.py`, `run_scenario.sh`, `rules.json`, `events.jsonl` if
      they turn out to belong to the old SC-200 lab rather than this range —
      check before deleting.

## Lane E — QA and CI

- [ ] The ten mount-time views are unverified by CI — the harness reports them
      and moves on. Drive them with a real DOM (jsdom, or headless Chrome
      against `bin/dev.sh`) so an onMount that throws is caught.
- [ ] `bin/qa-sweep.sh` now logs to `docs/QA_LOG.md`; create that file's first
      entry so the path exists.
- [ ] Extend `bin/render_all.js` to also assert the topbar mark resolves and no
      asset 404s (the old `mission-next-logo.png` reference is gone, but a
      future one should fail loudly).
- [ ] Keep the Pages workflow green; it publishes `ui/` as the site root.

## Lane G — Bring the other surfaces up to the DLP bar

`governance/dlp` is now the reference for what "complete" means here: real
state, a triage workflow that records what the learner did, and one mechanic
the learner can only understand by manipulating it (policy state vs applied
action). Grounded in Microsoft Learn via the MCP server, then written in
neutral language.

Most other views are still read-only posters. Apply the same treatment, in
this order — worst offenders first:

- [ ] `governance/insider-risk` — cases with no triage path.
- [ ] `governance/communication-compliance` — review queue with no review.
- [ ] `governance/ediscovery`, `governance/records`, `governance/lifecycle`.
- [ ] The secondary study surfaces auto-registered at the bottom of `views.js`
      — every one of those is a placeholder.

Use the `microsoft-learn` MCP server for mechanics rather than recalling them;
it is free and current. Verify the neutral wording after, not before.

## Lane F — What a range needs that a course did not

Product direction, not cleanup. Propose before building.

- [ ] Scenario reset — a range gets replayed; a course did not. Today state
      lives in `localStorage` under `defender-lab.*` keys with no reset-all.
- [ ] Scoring or objectives that do not reintroduce module gating (Hard rule 2).
- [ ] Difficulty tiers over the same fixture environment.
- [ ] Consider whether the IT Service Desk workload belongs in a SOC range or
      should be split out.

---

## Conventions

- No build step. Edit `ui/*.js` and reload. `bin/serve.py` disables caching.
- Bump the `styles.css?v=` query in `ui/index.html` when changing CSS, so a
  hard-refresh is not needed.
- Run `node bin/render_all.js` before every commit.
- Per the standing rule: at the end of your lane, update this file so the next
  agent starts cold.
