# SC-200 Learn-Link Coverage Sweep

Agent 11 report, 2026-07-07. This report supersedes the 2026-07-06 sweep.
Source corpus: `/home/alex/sc-200_app/sc-200_microsoft_learn_links.txt`
(generated 2026-07-03). Emphasis weighting for the remaining-gaps list
uses `/home/alex/sc-200_app/concepts.jsonl` (3,853 chunks).

This is a report-only sweep. No `ui/` files were changed.

Coverage meanings:

- **Full**: an interactive lab surface exists that lets the learner practice
  the topic locally.
- **Partial**: the lab has a fixture, study card, adjacent workflow, or
  embedded/static experience, but not the whole topic end-to-end.
- **Missing**: no clear lab surface exists.

## 1. Official SC-200 Hub / Exam / Certification Links

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Study guide for Exam SC-200 | Full | `ExamObjectives.md`, `OBJECTIVES_DELTA.md` | Local scope docs track the current guide and delta notes. |
| Certification, exam, course, renewal, practice assessment, exam sandbox | Missing | None | These are exam logistics and external learning assets, not simulated portal workflows. |

## 2. SC-200 Exam Readiness Zone Videos

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Manage a security operations environment | Full | `#/defender/settings`, `#/sentinel/data-connectors`, `#/sentinel/workspace-manager` | Environment setup, roles, workspaces, and connector plumbing are represented. |
| Configure protections and detections | Full | `#/defender/asr-policy`, `#/defender/custom-detections`, `#/sentinel/analytics`, `#/sentinel/anomalies` | Detection and protection workflows are interactive. |
| Manage incident response | Full | `#/defender/incidents`, `#/defender/incident`, `#/defender/action-center`, `#/sentinel/incidents` | Incident queues, side panels, and action review are present. |
| Manage security threats | Full | `#/defender/hunting`, `#/defender/hunting-graph`, `#/sentinel/hunting`, `#/sentinel/graph` | Threat hunting and graph investigation are covered. |

## 3. SC-200 Microsoft Learn Training Paths

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Mitigate threats using Microsoft Defender XDR | Full | `#/defender/home`, `#/defender/incidents`, `#/defender/alerts`, `#/defender/hunting`, `#/defender/air`, `#/defender/settings`, `#/defender/cloud-apps`, `#/defender/identity-protection`, `#/defender/threat-analytics`, `#/defender/reports` | Incidents, alerts, automation, hunting, identity, Cloud Apps, and portal configuration are all represented. |
| Mitigate threats using Microsoft Defender for Endpoint | Full | `#/defender/endpoints`, `#/defender/devices`, `#/defender/device`, `#/defender/asr-policy`, `#/defender/action-center`, `#/defender/vulnerabilities`, `#/defender/settings` | Device inventory, response actions, ASR, automation, and TVM are interactive. |
| Mitigate threats using Microsoft Defender for Cloud | Full | `#/defender-cloud/overview`, `#/defender-cloud/setup`, `#/defender-cloud/environment`, `#/defender-cloud/inventory`, `#/defender-cloud/alerts`, `#/defender-cloud/attack-paths`, `#/defender-cloud/recommendations`, `#/defender-cloud/workbooks` | Azure and non-Azure onboarding, posture, alerts, and attack paths are covered. |
| Mitigate threats using Microsoft Purview | Full | `#/purview/home`, `#/purview/dlp`, `#/purview/information-protection`, `#/purview/insider-risk`, `#/purview/communication-compliance`, `#/purview/ediscovery`, `#/purview/audit`, `#/purview/graph-activity`, `#/purview/records`, `#/purview/lifecycle` | DLP, labels, insider risk, audit, eDiscovery, and retention-style topics are covered. |
| Mitigate threats using Microsoft Security Copilot | Partial | `#/copilot/home`, `#/copilot/sessions`, `#/copilot/promptbooks`, `#/copilot/plugins`, `#/copilot/knowledge`, `#/copilot/settings`, topbar Copilot panel, guided scenario overlay | The standalone Copilot surface is complete; embedded experiences are still thinner for some host apps, especially Intune and Defender for Cloud. |
| Configure your Microsoft Sentinel environment | Full | `#/sentinel/home`, `#/sentinel/settings`, `#/sentinel/workspace-manager`, `#/sentinel/logs`, `#/sentinel/watchlist`, `#/sentinel/threat-intel`, `#/sentinel/data-connectors`, `#/sentinel/content-hub` | Workspaces, roles, logs, watchlists, TI, connectors, and content management are covered. |
| Create queries for Microsoft Sentinel using KQL | Partial | `#/sentinel/hunting`, `#/sentinel/logs`, `#/defender/hunting`, `#/sentinel/hunting/dns`, `#/sentinel/hunting/authentication`, `#/sentinel/hunting/network-session` | The evaluator now supports a broader local subset, but the language surface is still intentionally bounded. |
| Connect logs to Microsoft Sentinel | Full | `#/sentinel/data-connectors`, `#/sentinel/logs`, `#/sentinel/hunting` | Microsoft services, Windows, CEF, Syslog, TI, and custom logs are all represented. |
| Create detections and perform investigations using Microsoft Sentinel | Full | `#/sentinel/analytics`, `#/sentinel/automation`, `#/sentinel/incidents`, `#/sentinel/entity-behavior`, `#/sentinel/anomalies`, `#/sentinel/workbooks`, `#/sentinel/content-hub` | Analytics rules, automation, incidents, UEBA, anomalies, and workbooks are interactive. |
| Perform threat hunting in Microsoft Sentinel | Full | `#/sentinel/hunting`, `#/sentinel/search`, `#/sentinel/notebooks`, `#/sentinel/data-lake-jobs`, `#/sentinel/graph`, `#/sentinel/mitre`, `#/sentinel/hunting/dns`, `#/sentinel/hunting/authentication`, `#/sentinel/hunting/network-session` | Hunting, search jobs, notebooks, restore flows, ASIM views, and graph analysis are covered. |

## 4. Microsoft Defender XDR Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Introduction to Microsoft Defender XDR threat protection | Full | `#/defender/home`, workload shell, app switcher | The landing surface mirrors a SOC start-of-shift view. |
| Mitigate incidents using Microsoft Defender | Full | `#/defender/incidents`, `#/defender/incident`, `#/defender/alerts`, `#/defender/action-center`, `#/defender/custom-detections`, `#/defender/air` | Incident queues, investigation panels, alerts, and response are covered. |
| Remediate threats using Microsoft Defender | Full | `#/defender/hunting`, `#/defender/custom-detections`, `#/defender/alert-tuning`, `#/defender/notifications`, `#/defender/identity-protection` | Hunting, tuning, alerts, and identity response are represented. |
| Manage Microsoft Entra Identity Protection | Full | `#/defender/identity-protection`, `#/defender/identities`, `#/defender/identity` | Risky sign-ins, detections, and remediation decisions are interactive. |
| Safeguard your environment with Microsoft Defender for Identity | Full | `#/defender/identities`, incident side panel | Identity-attack investigation and entity pivots exist. |
| Secure your cloud apps and services with Microsoft Defender for Cloud Apps | Full | `#/defender/cloud-apps` | Risky OAuth app investigation is tied to the phishing scenario. |

## 5. Microsoft Defender for Endpoint Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Protect against threats with Microsoft Defender for Endpoint | Full | `#/defender/endpoints`, `#/defender/devices`, `#/defender/device`, `#/defender/settings` | Endpoint deployment, inventory, and protection context are covered. |
| Deploy the Microsoft Defender for Endpoint environment | Full | `#/defender/settings`, `#/defender/endpoints` | Roles, device groups, advanced features, and permissions are present. |
| Implement Windows security enhancements with Microsoft Defender for Endpoint | Full | `#/defender/asr-policy` | Audit/block modes, exclusions, and per-rule state are interactive. |
| Perform device investigations in Microsoft Defender for Endpoint | Full | `#/defender/devices`, `#/defender/device` | Device timeline, process tree, flags, and investigation tabs are present. |
| Perform actions on a device using Microsoft Defender for Endpoint | Full | `#/defender/device`, `#/defender/action-center` | Live response, investigation package, and response actions are covered. |
| Perform evidence and entities investigations using Microsoft Defender for Endpoint | Full | `#/defender/incident`, `#/defender/hunting-graph`, `#/defender/identity` | File, user, IP, and domain pivots exist through incident and graph views. |
| Configure and manage automation using Microsoft Defender for Endpoint | Full | `#/defender/settings`, `#/defender/air` | Automation levels and AIR-style response flows are represented. |
| Configure for alerts and detections in Microsoft Defender for Endpoint | Full | `#/defender/alert-tuning`, `#/defender/notifications`, `#/defender/suppression` | Notification, suppression, and tuning flows are interactive. |
| Utilize Vulnerability Management in Microsoft Defender for Endpoint | Full | `#/defender/vulnerabilities`, `#/defender/device`, `#/defender/exposure` | Exposure, software inventory, CVEs, remediation, and device-level TVM are covered. |

## 6. Microsoft Defender for Cloud Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Plan for cloud workload protections using Microsoft Defender for Cloud | Full | `#/defender-cloud/setup`, `#/defender-cloud/cloud-security`, `#/defender-cloud/environment` | Plans, workload categories, and environment settings are represented. |
| Connect Azure assets to Microsoft Defender for Cloud | Full | `#/defender-cloud/setup`, `#/defender-cloud/inventory`, `#/defender-cloud/environment` | Azure inventory and provisioning context are covered. |
| Connect non-Azure resources to Microsoft Defender for Cloud | Full | `#/defender-cloud/environment`, `#/defender-cloud/setup`, `#/defender-cloud/inventory` | AWS and GCP onboarding wizards now exist as local workflows. |
| Manage your cloud security posture management | Full | `#/defender-cloud/overview`, `#/defender-cloud/recommendations`, `#/defender-cloud/regulatory`, `#/defender-cloud/workbooks` | Secure score, recommendations, compliance, and workbook context are present. |
| Explain cloud workload protections in Microsoft Defender for Cloud | Full | `#/defender-cloud/alerts`, `#/defender-cloud/inventory`, `#/defender-cloud/attack-paths` | Workload alerts and attack path analysis are covered. |
| Remediate security alerts using Microsoft Defender for Cloud | Full | `#/defender-cloud/alerts`, `#/defender-cloud/inventory`, `#/defender-cloud/workflow` | Alert triage and response flows exist. |

## 7. Microsoft Purview Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Investigate and respond to Microsoft Purview DLP alerts | Full | `#/purview/dlp`, `#/defender/email-collab` | DLP queue, evidence, policy tips, and response/escalation are represented. |
| Investigate insider risk alerts and related activity | Full | `#/purview/insider-risk`, `#/purview/ediscovery` | Risk factors, case evidence, and eDiscovery escalation are interactive. |
| Search and investigate with Microsoft Purview Audit | Full | `#/purview/audit` | Search, filters, retention-policy setup, export, and premium audit concepts are covered. |
| Search for content with Microsoft Purview eDiscovery | Full | `#/purview/ediscovery` | Search-build, preview, and export flow exists. |

## 8. Microsoft Security Copilot Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Introduction to generative AI and agents | Full | `#/copilot/home`, `#/copilot/promptbooks` | Prompt entry, canned sessions, and agentic concepts are present. |
| Describe Microsoft Security Copilot | Full | `#/copilot/home`, `#/copilot/settings`, `#/copilot/plugins` | Capacity, ownership, sessions, and plugin behavior are modeled locally. |
| Describe the core features of Microsoft Security Copilot | Full | `#/copilot/home`, `#/copilot/sessions`, `#/copilot/promptbooks`, `#/copilot/plugins`, `#/copilot/knowledge` | Standalone experience, sessions, promptbooks, plugins, and grounding are covered. |
| Describe the embedded experiences of Microsoft Security Copilot | Partial | Topbar Copilot panel, `#/purview/ai-hub`, selected Defender surfaces | Embedded help exists, but not every host-app path in the Learn set is modeled equally. |
| Experience Security Copilot through guided simulations | Full | Guided scenario overlay, `#/copilot/sessions`, topbar Copilot panel | The lab includes a static guided investigation flow and deep-links into the standalone surface. |

## 9. Microsoft Sentinel Environment Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Introduction to Microsoft Sentinel | Full | `#/sentinel/home` | Overview, data flow, and active lab flows are represented. |
| Create and manage Microsoft Sentinel workspaces | Full | `#/sentinel/settings`, `#/sentinel/workspace-manager` | Settings, UEBA enablement, workspace membership, and publish status are covered. |
| Query logs in Microsoft Sentinel | Full | `#/sentinel/logs`, `#/sentinel/hunting`, `#/sentinel/hunting/dns` | Table plans, custom tables, and ASIM-style rows exist. |
| Use watchlists in Microsoft Sentinel | Full | `#/sentinel/watchlist` | Watchlist rows and detection use are represented. |
| Utilize threat intelligence in Microsoft Sentinel | Full | `#/sentinel/threat-intel`, `#/sentinel/data-connectors`, `#/sentinel/logs` | Indicator management, connector integration, and KQL rows are present. |
| Integrate Microsoft Defender XDR with Microsoft Sentinel | Full | `#/sentinel/incidents`, `#/sentinel/workspace-manager`, `#/defender/incidents` | Unified queue and Defender-lens handoff are called out. |

## 10. KQL for Microsoft Sentinel Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Construct Kusto Query Language statements | Full | `#/sentinel/hunting`, `#/sentinel/hunting/dns`, `#/defender/hunting` | Search, where, let, project, order, and take-style practice is present. |
| Analyze query results using KQL | Full | `#/sentinel/logs`, `#/sentinel/workbooks`, `#/defender/hunting` | Summarize and result-analysis scenarios are represented. |
| Build multi-table statements using KQL | Full | `#/sentinel/hunting`, saved-query fixtures | Union and join practice is now supported by the local evaluator. |
| Work with data in Microsoft Sentinel using Kusto Query Language | Partial | `#/sentinel/hunting`, `#/sentinel/logs`, `#/sentinel/hunting/dns`, `#/sentinel/hunting/authentication`, `#/sentinel/hunting/network-session` | The lab now covers parse/extract-style examples and a tiny external-data fixture, but the language surface is still not exhaustive. |

## 11. Microsoft Sentinel Data Connector Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Connect data to Microsoft Sentinel using data connectors | Full | `#/sentinel/data-connectors`, `#/sentinel/content-hub` | Connector rows and solution install states exist. |
| Connect Microsoft services to Microsoft Sentinel | Full | `#/sentinel/data-connectors`, `#/sentinel/logs` | Microsoft 365, Entra, Identity Protection, Azure Activity, and Defender XDR concepts are represented. |
| Connect Microsoft Defender XDR to Microsoft Sentinel | Full | `#/sentinel/data-connectors`, `#/sentinel/incidents`, `#/defender/incidents` | Defender XDR integration is explicit. |
| Connect Windows hosts to Microsoft Sentinel | Full | `#/sentinel/data-connectors`, `#/sentinel/content-hub` | Windows Security Events via AMA and DCR scoping are interactive. |
| Connect Common Event Format logs to Microsoft Sentinel | Full | `#/sentinel/data-connectors`, `#/sentinel/logs` | CEF workflow and `CommonSecurityLog` fixtures exist. |
| Connect syslog data sources to Microsoft Sentinel | Full | `#/sentinel/data-connectors` | Syslog via AMA workflow is present. |
| Connect threat indicators to Microsoft Sentinel | Full | `#/sentinel/threat-intel`, `#/sentinel/data-connectors`, `#/sentinel/logs` | Defender TI, TAXII, upload/API, and indicator rows are covered. |
| Create custom logs in Azure Monitor / Log Analytics | Full | `#/sentinel/data-connectors`, `#/sentinel/logs` | App registration, role, DCE/DCR choices, streams, transforms, and `_CL` output are represented. |

## 12. Microsoft Sentinel Detection / Investigation Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Threat detection with Microsoft Sentinel analytics | Full | `#/sentinel/analytics`, `#/sentinel/content-hub`, `#/sentinel/mitre` | Scheduled, NRT, TI, and ML-style rule types are represented. |
| Automation in Microsoft Sentinel | Full | `#/sentinel/automation` | Automation rule details and playbook selection exist. |
| Threat response with Microsoft Sentinel playbooks | Full | `#/sentinel/automation` | Trigger and on-demand playbook examples are present. |
| Security incident management in Microsoft Sentinel | Full | `#/sentinel/incidents`, `#/sentinel/graph`, incident side panel | Incident queue, Defender lens, and entity graph exist. |
| Identify threats with Behavioral Analytics | Full | `#/sentinel/entity-behavior`, `#/sentinel/settings`, `#/sentinel/anomalies` | UEBA enablement, entity risk, and anomalies are covered. |
| Data normalization in Microsoft Sentinel | Full | `#/sentinel/hunting/dns`, `#/sentinel/hunting/authentication`, `#/sentinel/hunting/network-session`, `#/sentinel/data-connectors` | ASIM parser-style hunting and normalization notes are present. |
| Query, visualize, and monitor data in Microsoft Sentinel | Full | `#/sentinel/workbooks`, `#/sentinel/logs` | Workbook detail panels, charts, and data rows exist. |
| Manage content in Microsoft Sentinel | Full | `#/sentinel/content-hub`, `#/sentinel/repositories`, `#/sentinel/workspace-manager` | Content hub is hands-on; repositories are a secondary/support surface. |

## 13. Microsoft Sentinel Threat Hunting Modules

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Explain threat hunting concepts in Microsoft Sentinel | Full | `#/sentinel/hunting`, `#/sentinel/mitre`, guided scenario overlay | Hunting hypotheses and MITRE mapping are represented. |
| Threat hunting with Microsoft Sentinel | Full | `#/sentinel/hunting`, `#/sentinel/search`, `#/sentinel/hunting/dns`, `#/sentinel/hunting/authentication`, `#/sentinel/hunting/network-session` | Saved queries, ASIM hunts, and search workflows exist. |
| Use Search jobs in Microsoft Sentinel | Full | `#/sentinel/search`, `#/sentinel/data-lake-jobs` | Search/Data Lake job concepts and restore-style flows are represented. |
| Hunt for threats using notebooks in Microsoft Sentinel | Full | `#/sentinel/notebooks` | Notebook use cases and Sentinel MCP notes are present. |

## 14. Primary Official Documentation Hubs

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Security, Defender XDR, Defender for Cloud, Sentinel, Purview, Security Copilot, KQL documentation hubs | Partial | `README.md`, `ExamObjectives.md`, local study cards, workload routes | The lab mirrors the major product surfaces, but it does not ship a full docs-portal clone or a complete documentation-link index. |

## 15. Objective-Mapped Documentation Links

| Topic | Coverage | Lab route(s) | Notes |
| --- | --- | --- | --- |
| Defender XDR configuration, automation, incidents, hunting | Full | `#/defender/settings`, `#/defender/notifications`, `#/defender/alert-tuning`, `#/defender/air`, `#/defender/incidents`, `#/defender/hunting`, `#/defender/custom-detections` | Objective-mapped XDR docs are covered by interactive surfaces. |
| Defender for Endpoint | Full | `#/defender/endpoints`, `#/defender/settings`, `#/defender/devices`, `#/defender/device`, `#/defender/asr-policy`, `#/defender/vulnerabilities` | Endpoint configuration, actions, and investigations are covered. |
| Defender for Office 365 | Full | `#/defender/email-collab`, `#/defender/email-collab/threat-explorer/campaigns`, `#/defender/incidents` | Mail investigation, threat explorer, and response are represented. |
| Defender for Identity | Full | `#/defender/identities`, `#/defender/identity`, incident side panel | Identity-alert investigation is covered. |
| Defender for Cloud Apps | Full | `#/defender/cloud-apps` | Cloud app alert and OAuth investigation is covered. |
| Defender for Cloud | Full | `#/defender-cloud/alerts`, `#/defender-cloud/inventory`, `#/defender-cloud/attack-paths`, `#/defender-cloud/recommendations`, `#/defender-cloud/environment` | Workload alerts, onboarding, and posture topics exist. |
| Entra ID / Identity Protection | Full | `#/defender/identity-protection`, `#/defender/identities` | Risk investigation and detections are covered. |
| Purview | Full | `#/purview/audit`, `#/purview/ediscovery`, `#/purview/insider-risk`, `#/purview/dlp`, `#/purview/graph-activity`, `#/purview/information-protection` | Audit, Content search, DLP, insider risk, labels, and Graph activity are covered. |
| Sentinel SIEM and platform | Full | `#/sentinel/home`, `#/sentinel/settings`, `#/sentinel/data-connectors`, `#/sentinel/analytics`, `#/sentinel/incidents`, `#/sentinel/automation`, `#/sentinel/workbooks`, `#/sentinel/watchlist`, `#/sentinel/notebooks`, `#/sentinel/entity-behavior`, `#/sentinel/content-hub`, `#/sentinel/soc-optimization` | Platform, ingestion, detection, investigation, and content topics are covered. |
| KQL and Advanced Hunting docs | Partial | `#/defender/hunting`, `#/sentinel/hunting`, `#/sentinel/hunting/dns`, `#/sentinel/logs` | Schema/table selection is strong, but the local query engine still does not model the full language. |

## Biggest Remaining Gaps

Ranked by lab impact and the concept-corpus weight behind the missing surface:

1. **Security Copilot embedded experiences outside the current local matrix**. The standalone Copilot workload is now complete, but the embedded-product story still has holes for some host-app entry points. The corpus weight is high: `security copilot` 241 chunks, with adjacent embedded-host concepts spread across `microsoft purview` 221 and `sentinel solutions` 171.
2. **KQL breadth beyond the current mocked evaluator**. The lab now handles more than before, but it is still a bounded subset rather than a full KQL engine. The heaviest concept clusters here are `kql parsing` 182, `kql summarize` 171, `kql basics` 122, `kql joins` 64, and `advanced hunting` 141.
3. **Exam logistics surfaces**. Certification, renewal, practice assessment, and sandbox links remain outside the simulator. This is a lower-weight gap, but it is still a clean future wave candidate because it would round out the top-of-funnel study experience. The relevant corpus signal is `exam preparation` 36.
4. **Full docs-portal mirroring**. The lab has support surfaces and study cards, but not a dedicated documentation hub that organizes the official Learn destinations by topic the way the index does. This is structurally useful rather than concept-heavy, so it is lower priority than the product-workflow gaps above.

