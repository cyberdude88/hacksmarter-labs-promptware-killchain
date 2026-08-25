# Hack Smarter SOC de-Microsofting plan

## Goal

Convert the current simulator from Microsoft-branded terminology to neutral industry-standard security operations language so the experience reads as a generic SOC / cloud security training product rather than a Microsoft product shell.

This is a content and product-structure pass, not just a copy edit. Some views will need renamed labels, some workflows will need rewritten affordances, and a few Microsoft-specific concepts should be removed or generalized entirely.

## Naming direction

Use these umbrella terms consistently:

- `Security Operations Workspace` for the main incident / hunting shell
- `SIEM & SOAR` for alerting, correlation, automation, and investigations
- `Endpoint Security` for device-centric pages
- `Identity Security` for directory, sign-in, and access policy flows
- `Cloud Security` for posture, exposure, and attack-path style surfaces
- `Data Governance` for compliance, discovery, classification, and audit-style surfaces
- `AI Security Assistant` or `Security Assistant` for the embedded assistant
- `Tenant operations` or `Workspace administration` for admin surfaces

## Rename map

Use this as the primary replacement matrix for visible UI text, route labels, breadcrumbs, and documentation copy.

| Current term | Replace with |
| --- | --- |
| Microsoft | platform vendor / vendor |
| Microsoft Security Copilot | AI Security Assistant |
| Copilot | Assistant |
| Defender XDR | XDR Security / Security Operations Workspace |
| Microsoft Sentinel | SIEM & SOAR |
| Sentinel | SIEM & SOAR |
| Microsoft Purview | Data Governance |
| Purview | Data Governance |
| Microsoft Entra | Identity & Access |
| Entra | Identity & Access |
| Azure | Cloud Platform / Cloud Console / Cloud Security |
| Microsoft 365 | Productivity Workspace / Workspace Suite |
| M365 | Workspace Suite |
| Microsoft Teams | Team Messaging |
| SharePoint | Content Collaboration |
| OneDrive | Cloud File Storage |
| Exchange | Hosted Email |
| Defender portal | Security Operations Workspace |

## UI areas that should change

### Top-level shell

- Replace any Microsoft product names in the top bar, page title, and wordmark copy with neutral branding.
- Keep `HACK SMARTER SOC` or another fictional tenant brand, but avoid pairing it with Microsoft product names in the shell.
- Remove Microsoft-looking glyphs or product-specific icons where they imply a real vendor app.

### Navigation and routes

- Rename routes and breadcrumb labels so they describe tasks, not vendor products.
- Prefer task-based labels like `Investigate`, `Detect`, `Respond`, `Protect`, `Audit`, `Admin`, and `Assist`.
- Remove route names that directly mirror Microsoft product centers unless the underlying behavior is also generalized.

### Assistant surfaces

- Rename `AI Security Agent` or `Security Copilot` to `Security Assistant`.
- Remove Copilot-specific naming from session, promptbook, plugin, and knowledge pages.
- If the assistant remains, treat it as a generic in-app helper rather than a branded Microsoft feature.

### Identity surfaces

- Replace `Entra` terminology with `Identity` / `Identity & Access`.
- Keep identity tasks such as users, sign-ins, risky logins, conditional access, and roles, but rename the shell and headings.

### Cloud security surfaces

- Replace `Azure` terminology with `Cloud Platform` or `Cloud Console`.
- Generalize environment, policy, and workload names so they no longer depend on Microsoft Azure concepts.

### Productivity and admin surfaces

- Replace `Microsoft 365` / `M365` terminology with `Workspace Suite` or `Productivity Workspace`.
- Replace `Teams`, `SharePoint`, and `Exchange` with neutral equivalents only if the page is intended to remain in the product.
- If those workflows stay, rename them to generic services such as `Team Messaging`, `Content Collaboration`, and `Hosted Email`.

## Functional changes needed

Some labels can be changed without altering behavior. Others need real product changes.

### Can be changed mostly by copy

- Header text
- Breadcrumbs
- Page subtitles
- Button labels
- Tooltip text
- Empty states
- Disclaimer text

### Need functional refactoring

- Any screen that is explicitly teaching a Microsoft product workflow should either be generalized or removed.
- Any iconography or copy that depends on real Microsoft brand recognition should be replaced.
- Any view that says `open in Defender`, `open in Sentinel`, `open in Purview`, or `open in Entra` should be rewritten to generic security product language.
- Any assistant branding that still says `Copilot` should be fully renamed, including storage keys, route names, and UI labels where necessary.

## Recommended removal candidates

These are the areas most likely to keep the app reading as Microsoft-specific even after a copy pass:

- `Security Copilot` language in assistant-related routes and views
- `Defender XDR` terminology in incident, endpoint, and hunting views
- `Sentinel` terminology in SIEM, automation, and hunting views
- `Entra` terminology in identity views
- `Purview` terminology in governance and compliance views
- `Azure` terminology in cloud-related views
- `Microsoft 365` / `M365` terminology in workspace administration views

## Suggested product vocabulary

If you want a single naming system, use this one consistently:

- `Security Operations Workspace`
- `SIEM & SOAR`
- `Endpoint Security`
- `Identity Security`
- `Cloud Security`
- `Data Governance`
- `Workspace Administration`
- `Security Assistant`

## Disclaimer guidance

If the app is fully de-Microsofted, the disclaimer can be shortened.

Suggested replacement:

```text
HACK SMARTER SOC is an independent fictional training simulator. All data and workflows are fictional and do not represent any real vendor product.
```

If any Microsoft terminology remains in the product for training parity, keep a stronger non-affiliation statement.

## Implementation order

1. Rename visible shell branding and top-level navigation terms.
2. Rename assistant surfaces and remove Copilot language completely.
3. Rename identity, cloud, governance, and admin view labels.
4. Replace Microsoft vendor names in route labels, breadcrumbs, and empty states.
5. Rework any features that exist only to mimic a Microsoft product page.
6. Revisit the disclaimer after the product language is fully neutral.

## Acceptance criteria

The simulator is sufficiently de-Microsofted when:

- No visible UI label uses Microsoft, Defender, Sentinel, Purview, Entra, Azure, Copilot, or M365.
- All major pages use generic industry vocabulary.
- Assistant, identity, cloud, governance, and admin surfaces still function, but no longer read as Microsoft-specific.
- The disclaimer is shortened or removed because the remaining copy no longer implies a Microsoft product imitation.

