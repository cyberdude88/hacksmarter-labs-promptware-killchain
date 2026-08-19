# Product architecture cleanup plan

Date: 2026-08-05

Scope: organize the existing lab around current Microsoft product ownership and
portal boundaries. Keep the current product names and icons. Do not copy any
Microsoft HTML, CSS, JavaScript, or visual assets.

## Evidence base

The audit used the Microsoft Learn MCP server dynamically (`tools/list`, search,
then full-page fetch) and checked the live lab at 1440×900 and 1024×768.

- [Microsoft Defender portal](https://learn.microsoft.com/unified-secops/overview-defender-portal)
- [Microsoft Sentinel in the Defender portal](https://learn.microsoft.com/azure/sentinel/microsoft-sentinel-defender-portal)
- [Microsoft Purview portal](https://learn.microsoft.com/purview/purview-portal)
- [Defender for Cloud in the Defender portal](https://learn.microsoft.com/azure/defender-for-cloud/defender-portal/defender-for-cloud-defender-portal)
- [Navigating Security Copilot](https://learn.microsoft.com/copilot/security/navigating-security-copilot)
- [SC-200 study guide](https://learn.microsoft.com/credentials/certifications/resources/study-guides/sc-200)

## Target product map

```text
Hack Smarter Labs
├── Defender portal — primary SC-200 operating surface
│   ├── Home and Exposure management
│   ├── Unified investigation and response
│   │   ├── Incidents and alerts
│   │   ├── Advanced hunting and custom detections
│   │   └── Actions and submissions
│   ├── Threat intelligence and unified assets
│   ├── Sentinel capabilities
│   │   ├── Search and threat management
│   │   ├── Content management
│   │   ├── Configuration
│   │   └── Data lake exploration
│   ├── Identities, Endpoints, Email and collaboration, and Cloud apps
│   └── System settings
├── Azure portal — setup and resource-management context
│   └── Defender for Cloud onboarding, plans, policy, and environment settings
├── Purview portal — independent data security, governance, risk, and compliance
├── Security Copilot — standalone experience plus embedded Defender entry points
└── Supporting admin centers
    ├── Entra
    └── Microsoft 365
```

Defender for Cloud investigation data can appear in the Defender queues and
Exposure/Assets views, while Azure remains the specialist management path.
Existing route namespaces can remain as compatibility URLs; a route prefix must
no longer decide which portal shell owns the page.

## Current gaps

### P0 — fix the model

1. `sentinel/*` activates the Azure shell even though the current primary
   Sentinel experience is in Defender. The lab also presents a Sentinel subset
   inside Defender and a second full Sentinel menu.
2. Incidents, alerts, entity investigation, and hunting are duplicated instead
   of acting as unified Defender experiences with source/workspace filters.
3. Five independent registries (`PORTALS`, `CLOUD_NAV`, `CLOUD_APP_ROUTE`,
   `PORTAL_CONTEXT`, and `CLOUD_HIGHLIGHT`) drift from one another. Security
   Copilot exists as a route but is absent from the launcher mapping.
4. Purview is assigned to the Defender tab and its real `NAV.purview` tree is
   hidden on every Purview route.
5. The permanent 220 px Cloud rail duplicates the waffle. Together with the
   240 px product nav, it leaves about 536 px for content at 1024 px.

### P1 — put products in the right place

1. Defender places Endpoints, Email and collaboration, Cloud apps, Secure score,
   ASR, notifications, alert tuning, and AIR under one `Configuration` heading.
   Operational areas need their own sections; only controls belong in Settings.
2. Exposure Management is thin, while Vulnerability Management is isolated at
   the bottom of Endpoints. The existing exposure, TVM, cloud, and critical-asset
   fixtures should form one coherent hierarchy.
3. Sentinel uses conflicting names for Search and Hunting, keeps a separate Logs
   surface, and mixes data-lake jobs into threat hunting. Advanced hunting must
   become the shared SIEM+XDR query surface.
4. Sentinel Content hub and repositories have thin `defender/*` duplicates even
   though fuller `sentinel/*` routes already exist.
5. Defender for Cloud alerts are isolated from the unified Defender queue, while
   all Defender for Cloud pages are treated as Azure-only.
6. Defender identity investigation and Entra Identity Protection overlap without
   clearly explaining which product owns risky users/sign-ins versus unified
   identity entities.
7. Classic Purview governance is promoted beside the current portal even though
   it is now transition/support material.
8. Security Copilot is chat-first and hidden from the launcher. Preserve that
   experience, but add discoverable standalone navigation and current agent/history
   concepts with compatibility aliases.

### P2 — finish the shell

1. Clickable navigation list items and launcher tiles are not keyboard controls.
2. Page headers do not wrap reliably at 1024 px.
3. The 54 px fixed legal footer permanently reduces the application viewport.
   Keep the non-affiliation notice, but make its full text available without a
   large fixed layout tax.
4. The mechanical renderer currently reports 112/113 clean views and flags
   `purview/audit` as tiny/empty; this needs a harness-level check during QA.

## Delivery plan: 6 agents, 14 task packages

Build agents run sequentially because the main files are shared. Read-only audits
and final verification may run in parallel.

### Agent 20 — shell and route contract (2 packages)

- **20A Canonical surface registry:** one source for product identity, host
  context, landing route, shell mode, launcher availability, and navigation.
  Derive the waffle, active context, current product, and route aliases from it.
- **20B Host-aware responsive shell:** remove the permanent duplicated Cloud rail
  from normal product pages; keep one global launcher plus one contextual nav.
  Add host-aware Azure management mode and responsive behavior at 1440, 1024,
  and 820 px.

### Agent 21 — unified response (2 packages)

- **21A Unified queues:** make Defender incidents and alerts canonical; convert
  Sentinel and Defender for Cloud queue routes into filtered aliases with
  provider, workspace, and service-source filters.
- **21B Unified investigation:** embed the existing Sentinel Graph in incident
  investigation and consolidate Sentinel entity behavior into device/identity
  pages while preserving old deep links.

### Agent 22 — hunting and Sentinel operations (3 packages)

- **22A Unified Advanced hunting:** support Defender and Sentinel schemas,
  workspaces, saved queries, and practice exercises in one canonical surface.
- **22B Sentinel information architecture:** clearly separate Search jobs,
  Sentinel Hunting, Advanced hunting, Content management, Configuration, and
  analytics/custom-detection responsibilities. Remove duplicate placeholder
  routes from primary navigation.
- **22C Data lake and workspace transition:** group KQL, Notebook, and Graph jobs
  under Data lake exploration; distinguish notebook types; make current
  workspace/MTO behavior primary and label Workspace manager/Azure material as
  transition study content.

### Agent 23 — Defender product taxonomy and cloud ownership (3 packages)

- **23A Defender navigation:** create coherent Exposure, Assets, Identities,
  Endpoints, Email and collaboration, Cloud apps, Actions and submissions, and
  System settings sections. Consolidate specialist settings behind product hubs.
- **23B Exposure and assets:** integrate TVM, critical assets, cloud inventory,
  recommendations, and attack paths using the existing fixtures.
- **23C Defender for Cloud and identity boundaries:** split Azure management from
  Defender consumption, connect cloud alerts to unified queues, distinguish
  Defender identity entities from Entra risk workflows, and mark retired or
  transition-only threat-intelligence experiences clearly.

### Agent 24 — independent and supporting portals (2 packages)

- **24A Purview:** give Purview its own context and persistent single product nav;
  keep Home/Solutions as the main entry model and move classic governance under
  a Legacy/support disclosure.
- **24B Copilot and admin centers:** add Security Copilot to the launcher and
  distinguish standalone from embedded use; provide current agent/history
  navigation with aliases. Mark Entra and Microsoft 365 as security-relevant
  supporting subsets and give Azure an explicit management landing.

### Agent 25 — integration and QA (2 packages)

- **25A Invariants and regressions:** route/view/alias sweep, syntax checks,
  unified queue/entity/hunting pivots, guided scenarios, localStorage state, and
  the `purview/audit` renderer discrepancy.
- **25B Visual and accessibility QA:** screenshot matrix at 1440×900, 1024×768,
  and 820 px; keyboard/focus pass; overflow checks; update `HANDOFF.md`,
  `NODE_MAP.md`, and this plan with final route ownership.

## Waves and dependencies

1. **Foundation:** Agent 20.
2. **Core unification:** Agents 21, 22, and 23, applied sequentially against the
   route contract.
3. **Independent portals:** Agent 24.
4. **Verification:** Agent 25 last.

## Acceptance criteria

- Every `sentinel/*` route uses the Defender host context unless it is explicitly
  labeled as legacy Azure transition material.
- One incidents queue, one alerts queue, and one Advanced hunting surface are
  canonical; old URLs continue to resolve through filtered aliases.
- The waffle exposes every implemented portal, including Security Copilot.
- Purview has usable persistent navigation and is never labeled as Defender.
- Defender for Cloud clearly distinguishes Defender investigation/consumption
  from Azure setup/configuration.
- At 1024×768, normal pages retain a useful main content width without overlapping
  page actions or a second global navigation rail.
- Names and icons are unchanged, the non-affiliation notice remains available,
  and no proprietary Microsoft code or assets are introduced.
