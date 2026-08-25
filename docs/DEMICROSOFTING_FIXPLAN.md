# De-Microsofting Fix Plan

## Goal

Get the simulator to the point where we can remove the broad Microsoft-brand disclaimer with
confidence, or prove that it still needs to stay because a deliberate carve-out remains.

Current state after the first sweep:

- `#/xdr/home` no longer exposes `Tune Sentinel analytics rules`.
- `ui/app.js` and `ui/index.html` had their obvious learner-facing vendor strings neutralized.
- The disclaimer still stays because the helpdesk carve-out and deeper fixture/internal branding
  still need a deliberate review.

## What is already done

- `bin/render_all.js` is green: `124/124` rendered, `0` dead routes.
- `bin/neutral-check.js` is green: `124/124` views cleaned successfully.
- `xdr/incident` is already renamed at the source to neutral labels.
- The helpdesk carve-out is intentional and should stay documented as such.

## What still needs to be fixed

1. Run the deep branding sweep documented in `docs/DEMICROSOFTING_DEEP_FIXPLAN.md`.
2. Remove remaining Microsoft-related wording from repo-owned helpdesk content and deeper fixtures.
3. Re-run render and neutralization checks after each sprint.

## Agent split

### Agent A: source copy sweep

Use the smallest possible edit set.

Scope:

- `ui/views.js`
- `ui/index.html` only if a learner-facing string there is clearly part of the same issue

Tasks:

- Change `Tune Sentinel analytics rules` to neutral copy that fits the same action and routing
  pattern.
- Search for any other visible `Sentinel`, `Defender`, `Microsoft`, `Copilot`, `Purview`, `Entra`,
  or `M365` strings in learner-facing UI copy on the XDR surfaces you touch.
- Prefer authoring neutral text directly instead of relying on the runtime neutralizer for the
  specific strings you edit.
- Keep route IDs and internal identifiers unchanged.
- Follow `docs/DEMICROSOFTING_DEEP_FIXPLAN.md` for the broader deep-fixture and helpdesk cleanup.

Suggested replacement pattern:

- Prefer neutral action wording like `Tune analytics rules` rather than product-specific names.

### Agent B: verification and disclaimer decision

Scope:

- `bin/neutral-check.js`
- `bin/render_all.js`
- `ui/index.html`
- any screenshot or manual inspection steps needed

Tasks:

- Re-run the automated checks after Agent A lands the source copy change.
- Inspect `#/xdr/home` and `#/xdr/incident` for any remaining visible Microsoft branding.
- If the only remaining raw vendor text is the documented helpdesk carve-out, state that clearly and
  keep the disclaimer.
- If the learner-facing surfaces are fully neutralized, propose the shortest disclaimer that still
  matches the actual product scope.
- If deeper fixture or training-content branding remains, keep the broader disclaimer and document
  why.

## Acceptance criteria

- `#/xdr/home` contains no visible Microsoft-specific branding in learner-facing copy.
- The existing neutralization and render checks still pass.
- The remaining disclaimer position is justified by the real surface area, not by habit.
- The fix plan documents any deliberate carve-outs explicitly so future sprints do not reopen them.
- Any remaining vendor wording is clearly classified as deliberate training content or internal
  compatibility data, not an accidental branding leak.
