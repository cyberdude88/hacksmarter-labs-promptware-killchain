# Hack Smarter SOC Navigation Restructure

## Goal

Keep every existing function, view, and route, but change the information architecture so the experience no longer reads like a near-copy of the Microsoft security portal.

This note records the current determination and the recommended restructure path.

## Determinations

### What is causing the mimicry

The current shell reproduces the same structural cues as the source platform:

- Portal tabs across the top.
- A persistent left rail for workload navigation.
- A second, narrower rail that behaves like a product/app switcher.
- Sectioned nav groups that mirror the source product's category hierarchy.
- Deep page breadcrumbs and panel terminology that closely follow the same mental model.

Those patterns are not individually bad, but together they recreate the source platform's navigation grammar too closely.

### What must stay

All existing capabilities must remain available:

- XDR-style investigation and response flows.
- SIEM-style hunting, analytics, and automation.
- Cloud posture and attack-path workflows.
- Data governance / audit / insider-risk flows.
- Identity and access views.
- Workspace admin and tenant management.
- The AI assistant surfaces.
- The help desk simulation.

The issue is not feature loss. It is the arrangement, naming, and navigation hierarchy.

## Recommended Structure

### 1. Replace product tabs with a single home hub

Remove the impression of "switching between vendor products" as the primary navigation act.

Use one landing hub with three first-order choices:

- `Investigate`
- `Govern`
- `Operate`

These become the top-level mental model. The existing workloads are then grouped underneath them as task surfaces, not as product clones.

### 2. Collapse the two-rail shell into one primary rail

Keep one persistent left rail only.

Move the second rail into one of these patterns:

- A contextual in-page subnav for the current task.
- A drawer opened only when deep navigation is needed.
- A command-palette jump surface for cross-area switching.

This preserves access while removing the "portal + blade" silhouette.

### 3. Reorganize around jobs, not products

The current route tree is product-shaped. Replace that with task-shaped grouping:

- `Triage`
- `Investigate`
- `Hunt`
- `Detect`
- `Respond`
- `Protect`
- `Audit`
- `Admin`

Each group should contain the same existing routes, but the labels should describe the operator's job, not the source vendor's feature taxonomy.

### 4. Make page-level navigation local

When a page has multiple subviews, keep that navigation inside the page body:

- Tabs
- Stepper
- Filter bar
- Local side index
- Card grid

Do not expose every subview in the global shell. That makes the shell feel like a product clone instead of a custom lab.

### 5. Use a single cross-app launcher, not a product catalog

The current app switcher reads like a vendor app launcher.

Replace it with one of these patterns:

- `Labs`
- `Workspaces`
- `Scenarios`
- `Shortcuts`

That keeps discovery but removes the "waffle launcher" association.

### 6. Rename visible navigation labels to neutral task language

Keep route ids and functionality stable, but change visible labels where they echo the source platform too closely.

Examples:

- `Incidents` -> `Case queue`
- `Alerts` -> `Signals`
- `Hunting` -> `Search & explore`
- `Threat explorer` -> `Mail investigation`
- `Action center` -> `Response queue`
- `Secure score` -> `Exposure score`
- `Identity protection` -> `Identity risk`
- `Conditional Access` -> `Access policy`
- `Workspace Admin` -> `Tenant operations`

The routes can stay the same; the labels do the work here.

## Suggested Shell Model

### Home

Use a home screen that is more like an operations dashboard than a portal index.

Recommended sections:

- Current cases
- Active hunts
- Risky identities
- Cloud findings
- Recent response actions
- Quick launch cards

### Global nav

Use one left rail with these buckets:

- `Investigate`
- `Detect`
- `Respond`
- `Protect`
- `Admin`
- `Learning`

Each bucket expands to the existing views relevant to that task.

### Context area

Use the page header for:

- Breadcrumbs
- Page actions
- Object context
- Local sub-navigation

This keeps the shell simple and shifts detail where it belongs.

## Route Mapping Strategy

Keep the current routes, but remap them into the new hierarchy.

### Example mapping

- `#/xdr/home`, `#/xdr/incidents`, `#/xdr/alerts`, `#/xdr/cases` -> `Investigate`
- `#/xdr/hunting`, `#/siem/search`, `#/siem/hunting`, `#/siem/graph` -> `Search & Detect`
- `#/xdr/action-center`, `#/xdr/air`, `#/siem/automation` -> `Respond`
- `#/xdr/exposure`, `#/xdr/secure-score`, `#/cloud/*` -> `Protect`
- `#/identity/*`, `#/workspace/*`, `#/helpdesk/*` -> `Admin`
- `#/ai-agent/*` -> `Assist`

This is a regrouping only. No route deletion is required.

## Implementation Shape

### Phase 1

- Keep routing intact.
- Replace the top portal tabs with a single home switcher.
- Remove the second rail as a permanent visual anchor.

### Phase 2

- Introduce the new task-based nav buckets.
- Re-label visible nav items.
- Move deep sub-navigation into page-local controls.

### Phase 3

- Audit all remaining labels and breadcrumbs.
- Remove any leftover wording that still implies the original platform structure.
- Confirm the helpdesk and AI surfaces still feel coherent inside the new shell.

## Constraints

- Do not change route ids unless absolutely necessary.
- Do not remove any feature surfaces.
- Do not reintroduce vendor-specific product wording in visible UI copy.
- Do not let the shell become a dense catalog; the goal is fewer persistent cues, not more.

## Decision

Proceed with a task-based shell that uses one primary rail, one home hub, and page-local secondary navigation.

That preserves the full app while breaking the source platform silhouette.

