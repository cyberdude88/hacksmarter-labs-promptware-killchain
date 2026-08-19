# Defender portal navigation — verified spec

Source of truth for `NAV.defender` in `ui/data.js`. Every row below is traceable
to a Microsoft Learn page, fetched in full (not search excerpts) on 2026-08-05.

**Read this before changing the left nav.** The recurring bug class in this repo
is a view that exists and works but has no nav entry, or a nav entry pointing at
a route the real portal doesn't have.

## Primary sources

| Ref | Page |
| --- | --- |
| [S] | https://learn.microsoft.com/azure/sentinel/microsoft-sentinel-defender-portal |
| [X] | https://learn.microsoft.com/defender-xdr/microsoft-365-defender-portal |
| [E] | https://learn.microsoft.com/defender-endpoint/../defender-xdr/microsoft-365-security-center-mde |
| [H] | https://learn.microsoft.com/defender-xdr/advanced-hunting-modes |
| [V] | https://learn.microsoft.com/defender-vulnerability-management/tvm-microsoft-secure-score-devices |
| [P] | https://learn.microsoft.com/unified-secops/overview-defender-portal |

## What the docs DO and DO NOT establish

**Established:** parentage — which node sits under which section. The [S]
"Quick reference" tables are explicit, e.g. every Content management row reads
`Microsoft Sentinel > Content management > …`.

**NOT established: ordering.** [S] states its tables are "organized as Microsoft
Sentinel is in the Azure portal" — that is Azure-blade order, *not* Defender nav
sequence. The authoritative artifact for sequence is a screenshot
(`navigation-defender-portal.png`) which is not machine-readable. **Section order
in `data.js` is a reasoned choice, not a cited fact.** Do not assert otherwise.

**Unverified placements** (no doc gives a nav location):
- `#/defender/mto` Multi-tenant management — [S] mentions MTO only as prose.
- `#/sentinel/graph` Sentinel Graph — absent from [S] tables, which predate it.
- `#/defender/alert-tuning` — [X] files Alert tuning under
  `Settings > Microsoft Defender XDR`; we place it under Investigation &
  response to match the view's own breadcrumb. Deliberate divergence.

## Verified structure

```
Home                                                        [P]
[Exposure management]                                       [P][V]
  Overview, Secure score, Vulnerability management
[Investigation & response]                                  [S]
  └ Incidents & alerts    Incidents, Alerts, Cases, Alert tuning
  └ Hunting               Advanced hunting, Custom detection rules, Hunting graph
  └ Actions & submissions Action center, AIR center
[Threat intelligence]                                       [S]
  Threat analytics, Intel explorer, Intel management
[Endpoints]                                                 [E]
  Endpoint security ops, ASR policies
[Email & collaboration]                                     [X]
  Email & collaboration, Threat explorer
[Cloud apps]                                                [P]
[Microsoft Sentinel]                                        [S]
  Overview, Search, Sentinel Graph
  └ Threat management     Workbooks, Hunting, Notebooks, MITRE ATT&CK
  └ Content management    Content hub, Repositories, Community
  └ Configuration         Data connectors, Analytics, Watchlists, Automation
[Other]
  Reports, Learning hub, Trials
[System]                                                    [X][E]
  Settings, Microsoft Sentinel, Device discovery,
  Suppression rules, Email notifications, Multi-tenant management
```

## Exact citations for contested rows

| Node | Defender portal path | Source |
| --- | --- | --- |
| Advanced hunting | `Investigation & response > Hunting > Advanced hunting` | [S] General; [H] |
| Custom detection rules | `Investigation and response > Hunting > Custom detection rules` | [S] Configuration |
| Incidents | `Investigation & response > Incidents & alerts > Incidents` | [S] Threat management |
| Workbooks / Hunting / Notebooks / MITRE | `Microsoft Sentinel > Threat management > …` | [S] Threat management |
| Content hub / Repositories / Community | `Microsoft Sentinel > Content management > …` | [S] Content management |
| Data connectors / Analytics / Watchlists / Automation | `Microsoft Sentinel > Configuration > …` | [S] Configuration |
| Search | `Microsoft Sentinel > Search` | [S] General |
| Intel management | `Threat intelligence > Intel management` | [S] Threat management |
| Sentinel settings | `System > Settings > Microsoft Sentinel` | [S] Configuration |
| Secure score | `Exposure management > Secure score` | [P] |
| Vulnerability management | moved under `Exposure management` | [V] |
| Device discovery | `Settings > Device discovery` | [E] |
| Suppression rules, Email notifications | `Settings > Endpoints > Rules` | [E] |

## Explicitly NOT in the Defender portal

Do not add these — [S] marks them unavailable:

- **News & guides** — `#/sentinel/news` may stay in the `sentinel` workload nav
  (which models the Azure blade) but must never appear in `NAV.defender`.
- **Workspace manager** — same rule, `#/sentinel/workspace-manager`.
- There is **no Defender-owned Content hub, Repositories, or Community.** Those
  are Sentinel nodes. Routes `#/defender/content-hub`, `#/defender/repositories`,
  `#/defender/community` were deleted on 2026-08-05; do not reintroduce them.

## Invariants to check after any nav edit

```bash
node --check ui/data.js
node bin/render_all.js          # expect: dead NAV routes: 0
```

Plus: every `#/sentinel/*` view that exists should be reachable from *some* nav.
The Automation bug (built, working, invisible for weeks) was exactly this.

```bash
node -e "
const fs=require('fs');
const NAV=(0,eval)(fs.readFileSync('ui/data.js','utf8')+'; NAV');
const reachable=new Set(Object.values(NAV).flat().filter(i=>i.route).map(i=>i.route.replace('#/','')));
const defined=[...fs.readFileSync('ui/views.js','utf8').matchAll(/VIEWS\['([^']+)'\]/g)].map(m=>m[1]);
const orphans=defined.filter(v=>!reachable.has(v));
console.log(orphans.length?'UNREACHABLE VIEWS:\n  '+orphans.join('\n  '):'every view reachable');
"
```
