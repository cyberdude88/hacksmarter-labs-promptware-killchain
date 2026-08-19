# SC-200 — Legacy Exam Objectives Reference

> **Current status:** Retained from the source project for historical and
> optional product-reference use. This is no longer the scope authority for the
> hacksmarter-labs. See `LATEST_PROGRESS.md`.

**Certification:** Microsoft Certified: Security Operations Analyst Associate
**Exam:** SC-200
**Level:** Intermediate · **Role:** Security Operations Analyst · **Renewal:** 12 months
**Reference checked:** Microsoft Learn SC-200 study guide, page last-updated
2026-06-26; skills measured outline effective 2026-07-28.

This document is the **source of truth for what the SC-200_lab must simulate.**
Every lab view, mock dataset, and scenario should map back to one of the
skill areas or product surfaces below.

## Candidate profile (what the exam assumes you can do)
- Reduce organizational risk through **triage, incident response,
  threat hunting, and detection engineering**.
- Monitor, identify, investigate, and respond to threats across
  **multi-cloud + on-prem** using the products listed below.
- Hunt with **KQL** and **Sentinel Graph**.
- Automate response to threats (playbooks, automation rules).
- Collaborate with security leadership on standards and posture.

Assumed familiarity: Microsoft security/compliance/identity solutions,
M365, Azure cloud services, AI agents/Copilots, Windows / Linux / mobile OS.

## Exam domains (three skill areas)
1. **Manage a security operations environment (40-45%)** — onboarding workloads
   and data sources, configuring connectors and policies, tuning alerts
   (suppression rules, exclusions), managing roles/RBAC, content/solutions
   in Sentinel, posture configuration in Defender for Cloud, Purview
   policy setup.
2. **Respond to security incidents (35-40%)** — triage queues across Defender XDR
   and Sentinel, multi-alert incident correlation, MITRE ATT&CK mapping,
   evidence/entity review, manual + automated response actions, case
   classification and closure.
3. **Perform threat hunting (20-25%)** — KQL across DeviceProcessEvents /
   EmailEvents / SigninLogs / CloudAppEvents / etc., saved/scheduled
   queries, hunting bookmarks, Sentinel Graph for entity-centric pivoting,
   custom analytics rules from hunting queries.

## July 2026 coverage checklist
These syllabus points must be represented as lab views, scenario steps, or
explicit study notes. Keep the wording local to this project; do not copy
Microsoft Learn text.

### Manage a security operations environment
- Configure Defender XDR/MDE settings: advanced features, rules settings,
  custom data collection, device groups, permissions/roles, and automation
  levels.
- Configure attack surface reduction policy behavior, including audit/block
  mode choices, per-rule states, and exclusions.
- Create and tune notification rules for incidents, actions, and threat
  analytics.
- Explain alert correlation and tuning beyond suppression, including how
  alerts roll up into incidents.
- Manage automated investigation and response and show automatic attack
  disruption behavior.
- Manage Sentinel retention and table choices across Analytics, Data lake,
  and XDR tiers.
- Use SOC optimization recommendations to reason about coverage and data
  value.
- Ingest Windows Security Events through AMA and data collection rules.
- Compare Windows Event Forwarding with AMA-based collection planning.
- Ingest CEF through AMA and validate rows in `CommonSecurityLog`.
- Collect Azure Activity through Azure Policy and diagnostic settings.
- Create custom log tables through the Logs Ingestion API, including app
  registration, Monitoring Metrics Publisher permissions, DCE/DCR endpoint
  choices, stream declarations, transform KQL, and `_CL` table output.

### Detection engineering
- Create Defender XDR custom detections from Advanced hunting queries.
- Build Sentinel analytics rules for scheduled, near-real-time, threat
  intelligence, and machine-learning behavior analytics use cases.
- Use MITRE ATT&CK coverage views to identify detection gaps.
- Configure Sentinel anomaly rules and explain how anomalies feed hunting
  and detections.

### Respond to security incidents
- Investigate Defender for Cloud Apps alerts, including risky OAuth app
  consent.
- Investigate compromised identities in Entra ID, using risky sign-ins and
  risk detections, then confirm or dismiss risk.
- Investigate Defender for Identity alerts such as directory replication
  abuse.
- View Sentinel alerts and incidents through the Defender XDR response lens.
- Use embedded Copilot-style assistance for a static, agentic investigation
  walkthrough.
- Work multi-stage, cross-domain attacks with lateral movement and entity
  pivots.
- Manage cases with tasks, owners, linked incidents, and closure context.
- Use Defender for Endpoint response actions: device timelines, live
  response sessions, investigation packages, evidence/entity review, and
  automatic attack disruption.

### Perform threat hunting and investigation
- Select the correct Advanced hunting or Sentinel table before writing KQL.
- Interpret Defender XDR threat analytics reports, affected assets, related
  incidents, and analyst guidance.
- Use hunting graphs and blast-radius views for relationship analysis.
- Use Sentinel Graph for entity relationship investigation.
- Run Sentinel KQL jobs in Data lake and contrast them with Basic-table
  search jobs.
- Create and query summary rule tables for high-volume data.
- Use Sentinel notebooks and note where Sentinel MCP Server integration fits.
- Search Purview Audit and eDiscovery Content search during an
  investigation.
- Investigate Microsoft Graph activity logs and understand that collection is
  enabled through diagnostic settings.

## Product surfaces the lab must mirror
- **Microsoft Defender XDR** (`security.microsoft.com`)
  Incidents · Alerts · Advanced hunting · Threat analytics · Secure score ·
  Action center · Submissions · Suppression rules · Email & collab ·
  Endpoints · Identities · Cloud apps · Attack surface management.
- **Microsoft Defender for Endpoint** (folded into XDR view)
  Device inventory · Investigations · Live response · Indicators ·
  Web content filtering · Custom detection rules.
- **Microsoft Sentinel** (in Azure portal, but with its own chrome)
  Overview · Incidents · Workbooks · Hunting · Notebooks · Entity behavior ·
  Threat intelligence · MITRE ATT&CK · Content hub · Repositories ·
  Workspace manager · Data connectors · Analytics rules · Watchlists ·
  Automation (playbooks + rules) · Sentinel Graph.
- **Microsoft Defender for Cloud** (Azure portal)
  Workload protections · Security alerts · Inventory · DevOps security ·
  supporting study views for posture, secure score, recommendations, and
  regulatory compliance.
- **Microsoft Purview** (`purview.microsoft.com`)
  Audit · eDiscovery Content search · Microsoft Graph activity logs ·
  supporting study views for data loss prevention and insider risk ·
  Information protection (sensitivity labels) · Communication compliance ·
  Records management · Data lifecycle management.
- **Microsoft Entra ID** (identity surface used in many scenarios)
  Sign-in logs · Audit logs · Risky users / sign-ins (Identity Protection) ·
  Conditional Access overview · Role assignments.
- **Microsoft Security Copilot** (AI-assisted investigation)
  Prompt-based incident summarization, KQL drafting, hunting expansion,
  cross-product Q&A. Optional in the lab — represent with a side panel.

## Scenario archetypes the lab should support
These are the recurring patterns SC-200 questions test, and they should
be playable in the lab as walk-throughs:

1. **Tune a noisy detection** — alert suppression rules with multi-
   condition logic (AND), exclusions, and the gotcha of pinning rules
   on volatile indicators (hashes that rotate on vendor update).
   _Already implemented as the scanner.exe scenario._
2. **Triage a multi-alert incident** — open an incident that bundles
   2–4 alerts, walk through evidence, classify, assign, resolve.
3. **DCSync / identity attack** — Defender for Identity alert for
   directory replication from a non-admin account; pivot to user, device,
   IP entities; recommend response.
4. **Phishing → OAuth consent abuse** — MDO alert on URL click + MDA
   alert on risky consent grant, correlated into one incident; revoke
   tokens, remove consent.
5. **Hunt across endpoints with KQL** — find suspicious processes in
   `C:\Users\Public`, join with sign-in data, save as a custom detection.
6. **Promote hunt to analytics rule (Sentinel)** — take a KQL query,
   schedule it, set entity mappings, MITRE tactics.
7. **Posture remediation (Defender for Cloud, supporting study content)** —
   review a high-severity
   recommendation (e.g. "Storage accounts should disable public network
   access"), see affected resources, mark exemption.
8. **DLP policy match (Purview, supporting study content)** — file with
   credit-card content blocked from external share; review DLP incident,
   override workflow.
9. **Insider risk (Purview, supporting study content)** — departing user
   downloads large volume from SharePoint; review the case, escalate to
   eDiscovery.
10. **Audit search** — search M365 audit log for a specific operation
    and user across a time window.

## Front-portal experience (lab landing)
The lab opens on **Defender XDR Home** — the same view an analyst would
see when starting a shift. That landing must show, at minimum:
- Active incident count by severity, with click-through to queue
- New alert count + a small preview list
- Secure score donut (Defender for Cloud + identity)
- Threat analytics teaser tiles for active campaigns
- A "Copilot" prompt entry (decorative)
- App switcher (waffle) to jump to Sentinel / Defender for Cloud / Purview

## What this drives in the build
Each scenario archetype above needs at least one mock dataset entry
and a view that lets the user click through it. Routes already planned
in HANDOFF.md cover these surfaces. When a route doesn't yet exist for
a scenario, add it.

## Out of scope for the lab
- Real authentication, real Graph/ARM calls, real KQL execution
- Anything beyond the SC-200 syllabus (no Intune device config, no
  Power Platform admin, no Defender for IoT deep dives)
- Reproducing Microsoft's proprietary portal code — the lab is built
  from scratch as a faithful look-alike
