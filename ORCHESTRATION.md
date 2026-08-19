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

## Lane B — Vendor-neutral terminology guard

- [ ] Read `ui/neutral-terminology.js` end to end (220 lines) and extend it to
      cover anything currently slipping through — walk the rendered DOM of all
      129 views, not just the source.
- [ ] Write `bin/neutral-check.js`: render every view (reuse the harness in
      `bin/render_all.js`) and fail non-zero if any vendor product name reaches
      visible text. Wire it into `bin/qa-sweep.sh` and CI.
- [ ] Decide the policy on names that are genuinely generic industry terms
      (KQL, MITRE ATT&CK, SPF/DKIM/DMARC) and write it down in the README so
      the next agent does not over-neutralize.

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
