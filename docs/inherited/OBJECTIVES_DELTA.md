# SC-200 objectives delta

Checked by Agent C on 2026-06-28 against Microsoft Learn.

## Sources checked
- Current Microsoft Learn study guide:
  https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-200
- SC-200T00 course page:
  https://learn.microsoft.com/en-us/training/courses/sc-200t00
- Microsoft Learn paths/docs used for scenario validation:
  - Defender XDR mitigation path:
    https://learn.microsoft.com/en-us/training/paths/sc-200-mitigate-threats-using-microsoft-365-defender/
  - Sentinel threat hunting path:
    https://learn.microsoft.com/en-us/training/paths/sc-200-perform-threat-hunting-azure-sentinel/
  - Purview threat mitigation path:
    https://learn.microsoft.com/en-us/training/paths/sc-200-mitigate-threats-using-microsoft-purview/
  - Defender for Cloud recommendations:
    https://learn.microsoft.com/en-us/azure/defender-for-cloud/review-security-recommendations
  - Defender for Cloud regulatory compliance:
    https://learn.microsoft.com/en-us/training/modules/examine-defender-cloud-regulatory-compliance-standards/
  - Defender for Identity XDR alerts:
    https://learn.microsoft.com/en-us/defender-for-identity/alerts-xdr
  - OAuth/app consent investigation:
    https://learn.microsoft.com/en-us/security/operations/incident-response-playbook-app-consent
  - Risky OAuth app investigation:
    https://learn.microsoft.com/en-us/defender-cloud-apps/investigate-risky-oauth

## Current study guide status
Microsoft Learn now publishes the SC-200 skills measured "as of July 28,
2026"; the page was last updated on 2026-06-26. `ExamObjectives.md` was
last checked against the 2026-04-16 page and already anticipated a
2026-07-28 refresh, so this is a real syllabus drift point.

Skill weights now shown explicitly:
- Manage a security operations environment: 40-45%
- Respond to security incidents: 35-40%
- Perform threat hunting: 20-25%

## Missing or under-specified objectives in `ExamObjectives.md`

Agent labels added 2026-07-06. `[Agent N]` = owner in `AGENTS.md` Sprint 2.
`[DONE]` = already built per `HANDOFF.md`; no agent needed.

- **[Agent 1]** Add Azure cloud services to the candidate familiarity list.
  The current profile names Azure cloud services separately from Microsoft
  365 and Microsoft security/compliance/identity solutions.
- Expand Defender XDR/MDE operations under "Manage a security operations
  environment":
  - **[Agent 2]** email notifications for incidents, actions, and threat
    analytics
  - **[Agent 2]** alert notification tuning and correlation (suppression is
    DONE — suppression engine already wired)
  - **[Agent 2]** MDE advanced features, rules settings, custom data
    collection, ASR policy configuration, device groups, permissions, and
    automation levels
  - **[Agent 2]** automated investigation and response plus automatic attack
    disruption
- Expand Sentinel platform management:
  - **[Agent 5]** XDR/Sentinel table retention across Analytics, Data lake,
    and XDR tiers (Analytics/Basic/Auxiliary plan cards + search job are
    DONE; Data lake and XDR tiers missing)
  - **[Agent 5]** SOC optimization recommendations
  - **[Agent 4]** Windows Security Events via AMA and data collection rules
  - **[Agent 4]** Windows Event Forwarding planning
  - **[Agent 4]** CEF via AMA (Syslog via AMA lab is DONE)
  - **[Agent 4]** Azure activity collection through Azure Policy and
    diagnostic settings
  - **[Agent 4]** custom log table creation via the Logs Ingestion API
    (DCR/DCE, app registration, `_CL` tables — threat indicator ingestion
    is DONE via the IOC/TAXII lab)
- Expand detection engineering:
  - **[DONE]** Defender XDR custom detections from Advanced Hunting
    (`#/defender/custom-detections`)
  - **[Agent 6]** Sentinel analytics rule types: near-real-time, threat
    intelligence, and machine learning (scheduled-rule wizard is DONE)
  - **[DONE]** MITRE ATT&CK matrix coverage analysis (`#/sentinel/mitre`)
  - **[Agent 6]** Sentinel anomalies
- Expand incident response:
  - **[Agent 7]** Microsoft Defender for Cloud Apps investigations
  - **[Agent 7]** compromised identities in Microsoft Entra ID (risky
    sign-in incident fixture is DONE; investigation surface missing)
  - **[DONE]** Defender for Identity alerts (DCSync incident + attack story)
  - **[Agent 7]** Microsoft Sentinel alerts/incidents from the Defender XDR
    response lens
  - **[Agent 7]** agentic AI / embedded Microsoft Security Copilot in
    incident work (static Copilot panel is DONE; agentic flow missing)
  - **[DONE]** complex multi-stage or cross-domain attacks and lateral
    movement (attack-story player)
  - **[Agent 7]** case management
- Expand Defender for Endpoint response:
  - **[DONE]** device timelines (`#/defender/device` Timeline → Hunt flow)
  - **[Agent 3]** live response (toast stub only today)
  - **[Agent 3]** investigation packages (toast stub only today)
  - **[DONE]** evidence and entity investigation (incident side panel)
  - **[Agent 3]** automatic attack disruption incidents
  - **[Agent 3]** `DEVICE_PAGE_PARITY.md` gap list (response-action strip,
    process tree, Effective settings tab, etc.)
- Expand Microsoft 365 activity investigation:
  - **[DONE]** Purview Audit (`#/purview/audit` search wired)
  - **[Agent 8]** Content search in Purview eDiscovery (route exists; no
    content-search workflow)
  - **[Agent 8]** Microsoft Graph activity logs
- Expand threat hunting:
  - **[DONE]** table selection in KQL (Advanced hunting schema pass)
  - **[Agent 8]** interpreting Defender XDR threat analytics
    (`#/defender/threat-analytics` exists but is thin — needs report
    detail + interpretation guidance)
  - **[DONE]** hunting graphs and blast radius (`#/defender/hunting-graph`)
  - **[Agent 7]** Sentinel Graph entity relationship analysis (node/edge
    fixtures for INC-1042 are DONE; no dedicated graph view)
  - **[Agent 5]** Sentinel KQL jobs in Data lake
  - **[Agent 5]** Summary rule tables
  - **[Agent 5]** Notebooks connected to Sentinel MCP Server (nav link
    exists at `data.js:1845` but no view — currently a dead route)

## Objectives that look de-emphasized or no longer explicit
- Defender for Cloud posture, recommendations, secure score, and regulatory
  compliance remain real Microsoft Learn/Defender for Cloud content, but the
  current SC-200 study guide foregrounds Defender for Cloud workload
  protection incident response more than posture management. Keep the lab
  routes, but treat posture as supporting context unless future syllabus text
  restores it as a first-class SC-200 objective.
- Purview DLP and Insider Risk are real Purview security operations content,
  but the current SC-200 guide phrases Purview mostly as investigation of
  threats/compromised entities plus Audit/eDiscovery search. Keep DLP and
  Insider Risk scenarios, but avoid over-weighting policy-authoring workflows.
- Sentinel Content hub, repositories, workspace manager, and watchlists are
  useful Sentinel surfaces but are not called out in the current skills list.
  They should be secondary screens, not core exam coverage.

No existing `ExamObjectives.md` scenario looks wholly invented, but several
need updated emphasis to match the July 2026 guide.

## Scenario validation

1. Tune a noisy detection: valid. The current guide explicitly includes
   Defender XDR alert tuning/suppression/correlation and Defender XDR custom
   detections.
2. Triage a multi-alert incident: valid. The current guide covers Defender
   XDR incidents, complex attacks, lateral movement, and case management.
3. DCSync / identity attack: valid. Defender for Identity XDR alert docs
   include DCSync replication alerts, and the current guide calls out
   Defender for Identity plus Entra compromised identities.
4. Phishing -> OAuth consent abuse: valid. Microsoft Learn has app consent
   investigation guidance and Defender for Cloud Apps OAuth investigation
   docs; the current guide includes Defender for Office 365 and Defender for
   Cloud Apps response.
5. Hunt across endpoints with KQL: valid. The current guide requires KQL
   table selection, Advanced Hunting queries, and Defender XDR threat hunting.
6. Promote hunt to analytics rule: valid. The current guide includes
   Sentinel analytics rule management and custom detection engineering.
7. Posture remediation in Defender for Cloud: valid Microsoft Learn content,
   but medium-confidence as a current SC-200 core scenario. The current guide
   references Defender for Cloud workload protections more directly than
   posture remediation.
8. DLP policy match in Purview: valid, medium-confidence. Purview threat
   mitigation training covers DLP-style security operations, but current
   SC-200 wording emphasizes investigation/remediation over deep DLP policy
   authoring.
9. Insider risk: valid, medium-confidence. Purview training includes Insider
   Risk Management; current SC-200 wording supports Purview threat
   investigation but does not name Insider Risk as explicitly as older scope
   docs did.
10. Audit search: valid. The current guide explicitly includes Purview Audit,
    eDiscovery Content search, and Microsoft Graph activity logs for threat
    investigation.

## Recommended follow-up edits
- Update `ExamObjectives.md` to reference the 2026-06-26 Learn page and the
  July 28, 2026 skill outline.
- Add the missing July 2026 objectives above as concise bullets.
- Rebalance future lab work toward:
  - Defender XDR/MDE automation and attack disruption
  - Sentinel ingestion, retention, Data lake, Summary rule tables, notebooks
  - Microsoft Graph activity logs
  - Copilot/agentic investigation
- Keep Defender for Cloud posture and Purview policy workflows, but label
  them as supporting study content unless the user wants broader portal
  realism beyond the strict study guide.
