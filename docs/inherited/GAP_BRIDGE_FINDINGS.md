# GAP_BRIDGE_FINDINGS — chunk-level study-app vs lab compare

Manager session, 2026-07-06. Method per `GAP_BRIDGE.md`: capability-level
regex probes over `~/sc-200_app/SC-200_manual.md` (79k lines, the full
corpus) cross-checked against `ui/data.js` + `ui/views.js` + `ui/app.js`,
seeded from the concept vocabulary and `COVERAGE_SWEEP.md`. Weight =
corpus regex hits (proxy for exam emphasis). Nav-vs-views sweep at start
of session: 83 NAV routes, 0 dead (clean).

## Findings

| Concept | Capability | Weight | Lab status | Nearest route | Fix | Agent |
|---|---|---|---|---|---|---|
| security copilot | Standalone portal experience | 61 | missing | Copilot side panel | L | 12 |
| security copilot | Promptbooks (library, run, custom) | 246 | missing | Copilot side panel | L | 12 |
| security copilot | Plugin management | 180 | missing | — | M | 12 |
| security copilot | Sessions & workspaces | 143 | missing | — | M | 12 |
| security copilot | SCU capacity / owner settings | 130 | missing | — | M | 12 |
| security copilot | Knowledge bases | 63 | missing | — | S | 12 |
| kql | `union` practice | 60 | partial (1 mention) | `#/defender/hunting` | M | 13 |
| kql | `render` / visualization operators | 17 | missing | `#/sentinel/workbooks` | M | 13 |
| kql | `externaldata` | 14 | missing | — | S | 13 |
| kql | join kinds beyond canned examples | 15 | partial | `#/defender/hunting` | M | 13 |
| data normalization | ASIM parsers beyond DNS (imAuthentication, imNetworkSession, …) | 22 | missing | `#/sentinel/hunting/dns` | M | 13 |
| threat hunting | Bookmarks workflow (create → triage → promote) | 128 | partial (3 mentions, no controls) | `#/sentinel/hunting` | M | 14 |
| threat hunting | Livestream | 40 | missing | `#/sentinel/hunting` | M | 14 |
| search jobs | Restore historical data | 55 | missing | `#/sentinel/search` | M | 14 |
| playbooks | Entity-trigger playbooks | 6 | missing | `#/sentinel/automation` | S | 14 |
| vulnerability management | TVM depth (307 corpus vs 13 lab mentions) | 307 | partial | `#/defender/exposure` | L | 15 |
| vulnerability management | Remediation requests | 51 | missing | — | M | 15 |
| vulnerability management | Recommendation exceptions | 9 | missing | — | S | 15 |
| defender for cloud | GCP connector onboarding | 209 | missing | `#/defender-cloud/setup` | M | 16 |
| defender for cloud | AWS connector onboarding | 82 | partial (2 mentions) | `#/defender-cloud/setup` | M | 16 |
| defender for cloud | File integrity monitoring | 5 | missing | — | S | 16 |
| microsoft purview | Audit (Premium) retention/policies | 150 | missing | `#/purview/audit` | M | 17 |
| microsoft purview | Audit export depth | 60 | partial | `#/purview/audit` | S | 17 |
| defender for office 365 | Threat Explorer | 10 | missing | `#/defender/email-collab` | M | 17 |
| sentinel workspaces | MSSP / Azure Lighthouse | 49 | missing | `#/sentinel/workspace-manager` | M | 18 |
| microsoft defender xdr | Multi-tenant management (MTO) | 17 | missing | — | M | 18 |
| log ingestion | Azure Data Explorer integration | 28 | missing | `#/sentinel/logs` | S | 18 |
| log ingestion | Basic/Auxiliary tier depth | 39 | partial (1 mention) | `#/sentinel/logs` | S | 18 |

## Checked and NOT gaps (don't rebuild)

Fusion (16 lab mentions), repositories (19), attack disruption (9),
custom detections (9), kql let/functions (32), parse/extract (14),
similar incidents (4), entity pages (5), exposure management (7),
DCR transforms, watchlist templates/incident tasks (negligible corpus
weight), attack simulation training + deception (0 corpus hits — out of
SC-200 scope in this corpus).

## Agent clustering

Agents 12–18 build (one portal surface each), Agent 19 is QA. Briefs
appended to `AGENTS.md`. Copilot standalone (Agent 12) is the largest
single gap in the corpus, matching COVERAGE_SWEEP's #1 call.
