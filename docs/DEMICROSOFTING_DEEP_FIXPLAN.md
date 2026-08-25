# Deep Branding Review Runbook

## Purpose

This runbook governs the deep branding sweep for `HACK SMARTER SOC`.

The rule is simple: if a Microsoft-related product word shows up anywhere in repo-owned text,
fixtures, UI copy, comments, or tests, remove it or replace it with neutral terminology.

This is not limited to the main XDR shell. It includes deep fixture content and the helpdesk
carve-out.

## What counts as in scope

- `ui/*.js`
- `ui/*.html`
- `ui/*.css` when visible labels or pseudo-content are involved
- `docs/*.md` that describe or mirror learner-facing behavior
- fixture text and test data that renders in the app
- comments that are user-visible through code snippets, snapshots, or generated copy

## What does not count as in scope

- Third-party notices and upstream license text
- Vendored dependency code under `node_modules`
- External documentation mirrors that are intentionally quoted as source material

If a string is only present in one of those excluded areas, leave it alone and document why.

## Terms to remove

Scan for and remove these terms whenever they appear in repo-owned text:

- Microsoft
- Microsoft 365
- M365
- Azure
- Sentinel
- Defender
- Copilot
- Purview
- Entra
- Teams
- SharePoint
- OneDrive
- Outlook
- Exchange
- Windows
- Office 365
- Microsoft Learn

If a page needs the concept but not the vendor name, rewrite it with generic product language.

## Helpdesk carve-out

The helpdesk workload is not exempt from cleanup.

Treat helpdesk as the same branding standard as the rest of the app:

- Remove vendor names from learner-facing labels and help text.
- Keep the workflow behavior intact.
- If a real product label is needed for the exercise to make sense, move that explanation into the
  documentation instead of leaving it in the UI.
- If a fixture or scenario still depends on vendor wording, convert it to neutral language and note
  the replacement in the sprint log.

## Agent workflow

Use one agent per sprint.

If Goose-local is available in the environment, use it for the sprint worker. If it is not
available, use the closest single-agent fallback and keep the same one-agent-per-sprint rule.

For each sprint:

1. Read this runbook and the current progress doc before editing.
2. Search the assigned file slice for every Microsoft-related term.
3. Replace the visible wording with neutral copy.
4. Preserve route IDs, storage keys, and compatibility contracts unless the sprint explicitly says
   otherwise.
5. Run the local verification checks for the touched slice.
6. Update the progress doc with what changed, what remains, and whether the disclaimer can be
   shortened yet.

Do not split one sprint across multiple agents unless the write sets are completely disjoint.

## Suggested sprint order

### Sprint 1: helpdesk carve-out sweep

Target the helpdesk views, fixtures, and help text first. Remove vendor wording from the carve-out
itself instead of treating it as a permanent exception.

### Sprint 2: deep fixture sweep

Target `ui/views.js`, `ui/app.js`, `ui/data.js`, and any rendered docs or fixture-backed copy that
still carries Microsoft terminology.

### Sprint 3: documentation and comments sweep

Target the progress docs, handoff docs, and source comments that still preserve vendor names in a
way that leaks into the product narrative.

### Sprint 4: verification

Run render and terminology checks, then inspect the remaining disclaimer text. If no repo-owned
learner-facing Microsoft wording remains, shorten or remove the disclaimer. If any remains, record
the exact files and keep the disclaimer.

## Acceptance criteria

- No repo-owned learner-facing text contains Microsoft-related branding words.
- Helpdesk content is neutralized instead of carved out forever.
- The UI still renders cleanly and route coverage stays intact.
- The disclaimer is either justified by a documented remaining exception or removed/shortened after
  the sweep is complete.

