# Attack Story Graph Fix

## Summary

The Defender incident "Attack story" graph had node bubbles and edge labels
overlapping. An earlier pass tweaked the radial magic numbers but overlap
persisted. This pass replaced the hand-tuned placement with geometry that is
**verified collision-free across every incident story**, keeping the bubble/radial
style.

## Root Cause

Nodes were positioned on two ellipses that were too close vertically
(`ring1 rY=28`, `ring2 rY=40` → ~54px gap) while node boxes are ~80px tall, so
every ring-1 node collided with the ring-2 node behind it. Measured: **30
overlapping node pairs** across the 10 stories. Edge labels were placed at the
edge midpoint with only an outward push, landing on node bodies in 16 cases.

## What Changed

- **Even angular distribution.** `graphPoint` now spreads a ring's nodes evenly
  by *count* across an arc instead of using fixed angle slots, so sparse rings no
  longer cluster on one side.
- **Wider ring separation + taller stage.** New radii (`ring1 25/22`,
  `ring2 44/40`) on a `1040×560` stage give every horizontally-overlapping node
  pair ≥104px of vertical clearance.
- **Collision-aware edge labels.** New `graphLabelPoint` nudges each label
  outward, then perpendicular to its edge, until it clears every node box.
- **Label line clamp.** Node labels clamp to 3 lines so a long name can't grow a
  bubble tall enough to touch a neighbor.
- **Fallback stories get rings.** Incidents without a predefined story previously
  stacked all nodes at the center (all ring 0); they now distribute across rings.
- **Mobile stage keeps verified dimensions** (`1040×560`) and scrolls, instead of
  shrinking to a size the math wasn't validated against.

## Files Changed

- `ui/views.js` — `graphPoint`, `graphLayout`, `graphBoundaryPoint`,
  `graphEdgeRoute`, new `graphLabelPoint`, `renderIncidentGraph`, `attackStoryFor`
- `ui/styles.css` — `.attack-web` stage size, `.attack-web-node-label` clamp,
  mobile override

## Verification

Ran the **actual edited functions** from `ui/views.js` against every story in
`ATTACK_STORIES` (`ui/data.js`), computing pixel positions on the `1040×560`
stage:

- Node–node overlaps: **0** (checked against worst-case 104px-tall boxes)
- Nodes clipped by the frame: **0**
- Edge labels landing on a node box: **0 / 98**

Also: `node --check` passes on `views.js` and `data.js`; the local server
(`:8765`) serves the updated assets (200) with the new code present.

Not done: a live pixel-level browser screenshot pass in this environment.
