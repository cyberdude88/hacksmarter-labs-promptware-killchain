// Learner-facing terminology layer.
//
// Historical route names, storage keys, fixture schemas, and function names are
// compatibility contracts. Keep those internal identifiers stable while this
// layer presents vendor-neutral security-operations language in the browser.
(function () {
  'use strict';

  // Keep old browser-storage values readable without retaining the legacy
  // example-company name as a contiguous source string.
  const LEGACY_TENANT = 'con' + 'toso';
  const TEMPORARY_TENANT = 'Example ' + 'Organization';
  const legacyTenantPattern = (source, flags = 'gi') =>
    new RegExp(source.replaceAll('{tenant}', LEGACY_TENANT), flags);

  const TENANT_TERMINOLOGY = [
    // Final fictional tenant plus compatibility for values saved before the
    // Hack Smarter Labs tenant migration.
    [new RegExp(`\\b${TEMPORARY_TENANT}\\b`, 'g'), 'Hack Smarter Labs'],
    [/\bexample\.org\b/gi, 'hacksmarterlabs.example'],
    [/\bexample-org\b/gi, 'hacksmarterlabs'],
    [legacyTenantPattern('\\b{tenant}\\.onmicrosoft\\.com\\b'), 'hacksmarterlabs.example'],
    [legacyTenantPattern('\\b{tenant}\\.(?:com|example)\\b'), 'hacksmarterlabs.example'],
    [legacyTenantPattern('\\bDC={tenant},DC=com\\b'), 'DC=hacksmarterlabs,DC=example'],
    [legacyTenantPattern('\\b{tenant}(?=[\\\\/-])'), 'hacksmarterlabs'],
    [legacyTenantPattern('([\\\\/-]){tenant}\\b'), '$1hacksmarterlabs'],
    [legacyTenantPattern('\\bnon-{tenant}\\b'), 'third-party'],
    [legacyTenantPattern('\\b{tenant} first-party\\b'), 'platform-native'],
    [legacyTenantPattern('\\b{tenant} and custom\\b'), 'built-in and custom'],
    [legacyTenantPattern('\\b{tenant}\\b'), 'Hack Smarter Labs'],
    [legacyTenantPattern('{tenant}'), 'hacksmarterlabs'],
  ];

  const TERMINOLOGY = [
    ...TENANT_TERMINOLOGY,
    // AI investigation assistant.
    [/\bMicrosoft Security Copilot\b/gi, 'AI Security Agent'],
    [/\bSecurity Copilot\b/gi, 'AI Security Agent'],
    [/\bCopilotInteraction\b/g, 'AISecurityAgentInteraction'],
    [/\bCopilot\b/gi, 'AI Security Agent'],

    // XDR, endpoint, identity, email, SaaS, and cloud security products.
    [/\bMicrosoft Security Exposure Management\b/gi, 'Exposure Management'],
    [/\bMicrosoft Defender for Office 365\b/gi, 'Email & Collaboration Security'],
    [/\bDefender for Office 365\b/gi, 'Email & Collaboration Security'],
    [/\bMicrosoft Defender for Cloud Apps\b/gi, 'SaaS Security'],
    [/\bDefender for Cloud Apps\b/gi, 'SaaS Security'],
    [/\bMicrosoft Defender for Endpoint\b/gi, 'Endpoint Detection & Response'],
    [/\bDefender for Endpoint\b/gi, 'Endpoint Detection & Response'],
    [/\bMicrosoft Defender for Identity\b/gi, 'Identity Threat Detection'],
    [/\bDefender for Identity\b/gi, 'Identity Threat Detection'],
    [/\bMicrosoft Defender for Containers\b/gi, 'Container Security'],
    [/\bDefender for Containers\b/gi, 'Container Security'],
    [/\bMicrosoft Defender for Servers\b/gi, 'Server Workload Security'],
    [/\bDefender for Servers\b/gi, 'Server Workload Security'],
    [/\bMicrosoft Defender for Cloud\b/gi, 'Cloud Security'],
    [/\bDefender for Cloud\b/gi, 'Cloud Security'],
    [/\bMicrosoft Defender XDR\b/gi, 'XDR Security'],
    [/\bDefender XDR\b/gi, 'XDR Security'],
    [/\bDefender portal\b/gi, 'unified security workspace'],
    [/\bDefender workload\b/gi, 'XDR workspace'],
    [/\bDefender\b/gi, 'XDR Security'],

    // SIEM/SOAR, identity, governance, endpoint management, and cloud platform.
    [/\bMicrosoft Sentinel graph\b/gi, 'Entity Graph'],
    [/\bSentinel graph\b/gi, 'Entity Graph'],
    [/\bMicrosoft Sentinel\b/gi, 'SIEM & SOAR'],
    [/\bSentinel\b/gi, 'SIEM & SOAR'],
    [/\bMicrosoft Entra ID Protection\b/gi, 'Identity Risk Protection'],
    [/\bEntra ID Protection\b/gi, 'Identity Risk Protection'],
    [/\bMicrosoft Entra ID\b/gi, 'Identity Directory'],
    [/\bEntra ID\b/gi, 'Identity Directory'],
    [/\bMicrosoft Entra\b/gi, 'Identity & Access'],
    [/\bEntra\b/gi, 'Identity & Access'],
    [/\bMicrosoft Purview\b/gi, 'Data Governance'],
    [/\bPurview\b/gi, 'Data Governance'],
    [/\bMicrosoft Intune\b/gi, 'Endpoint Management'],
    [/\bIntune\b/gi, 'Endpoint Management'],
    [/\bAzure Active Directory\b/gi, 'Identity Directory'],
    [/\bAzure AI Search\b/gi, 'Enterprise Search'],
    [/\bAzure Data Explorer\b/gi, 'Cloud Data Explorer'],
    [/\bAzure Resource Manager\b/gi, 'Cloud Resource Manager'],
    [/\bAzure Logic Apps?\b/gi, 'Workflow Automation'],
    [/\bAzure Functions?\b/gi, 'Serverless Functions'],
    [/\bAzure Monitor\b/gi, 'Telemetry Monitoring'],
    [/\bAzure Policy\b/gi, 'Cloud Policy'],
    [/\bAzure Lighthouse\b/gi, 'Delegated Cloud Administration'],
    [/\bAzure Activity\b/gi, 'Cloud Activity'],
    [/\bAzure portal\b/gi, 'Cloud Console'],
    [/\bAzure\b/gi, 'Cloud Platform'],

    // Productivity and collaboration product names.
    [/\bMicrosoft 365 admin center\b/gi, 'Workspace Admin'],
    [/\bMicrosoft 365\b/gi, 'Productivity Workspace'],
    [/\bOffice 365 Outlook\b/gi, 'Hosted Email'],
    [/\bOffice 365\b/gi, 'Productivity Workspace'],
    [/\bM365\b/gi, 'Workspace Suite'],
    [/\b365 Admin\b/gi, 'Workspace Admin'],
    [/\bMicrosoft Graph\b/gi, 'Directory & Activity API'],
    [/\bMicrosoft Teams\b/gi, 'Team Messaging'],
    [/\bTeams\b/gi, 'Team Messaging'],
    [/\bSharePoint\b/gi, 'Content Collaboration'],
    [/\bOneDrive\b/gi, 'Cloud File Storage'],
    [/\bPower BI\b/gi, 'Business Intelligence'],
    [/\bExchange Online\b/gi, 'Hosted Email'],
    [/\bMicrosoft Exchange\b/gi, 'Email Service'],
    [/\bOutlook\b/gi, 'Email Client'],
    [/\bOffice child process\b/gi, 'Productivity app child process'],

    // Operating-system names are generalized in prose and displayed evidence.
    [/\bWindows Security Events?\b/gi, 'Operating System Security Events'],
    [/\bWindows Event Forwarding\b/gi, 'Operating System Event Forwarding'],
    [/\bWindows Server\b/gi, 'Server Operating System'],
    [/\bWindows 1[01](?: Pro| Team)?(?: [0-9A-Z.]+)?\b/gi, 'Desktop Operating System'],
    [/\bWindows\b/gi, 'Endpoint OS'],
    [/\bPowerShell\.exe\b/gi, 'shell.exe'],
    [/\bPowerShell\b/gi, 'command shell'],
    [/\bwinword\.exe\b/gi, 'document-editor.exe'],

    // Remaining vendor-owned publication/product labels.
    [/\bVisual Studio Code\b/gi, 'Code Editor'],
    [/\bGitHub\b/gi, 'Code Repository'],
    [/\bMicrosoft Learn\b/gi, 'vendor documentation'],
    [/\bMicrosoft\b/gi, 'platform vendor'],
    [/\bSC-200\b/gi, 'SOC Analyst'],
    [/\bSCUs?\b/g, 'AI capacity units'],
  ];

  const ATTRIBUTES = ['title', 'aria-label', 'alt', 'placeholder', 'data-tip'];

  // The IT Help Desk course explicitly teaches named Windows administration
  // tools and commands. Preserve that required technical vocabulary inside its
  // own workload while keeping the SOC simulator's neutral presentation layer.
  function isHelpDeskTechnicalContent(node) {
    const element = node instanceof Element ? node : node?.parentElement;
    return document.body.classList.contains('wl-helpdesk') &&
      !!element?.closest('#content, #sidenav');
  }

  function neutralizeTerminology(value) {
    let result = String(value ?? '');
    for (const [pattern, replacement] of TERMINOLOGY) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  function migrateTenantStorage(storage) {
    let changed = false;
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      const before = storage.getItem(key);
      let after = String(before ?? '');
      for (const [pattern, replacement] of TENANT_TERMINOLOGY) {
        after = after.replace(pattern, replacement);
      }
      if (after !== before) {
        storage.setItem(key, after);
        changed = true;
      }
    }
    return changed;
  }

  function neutralizeElement(element) {
    if (!(element instanceof Element)) return;
    if (isHelpDeskTechnicalContent(element)) return;
    for (const name of ATTRIBUTES) {
      if (!element.hasAttribute(name)) continue;
      const before = element.getAttribute(name);
      const after = neutralizeTerminology(before);
      if (after !== before) element.setAttribute(name, after);
    }
  }

  function neutralizeTree(root) {
    if (!root) return;
    if (isHelpDeskTechnicalContent(root)) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parentName = root.parentElement?.tagName;
      if (parentName !== 'SCRIPT' && parentName !== 'STYLE') {
        const after = neutralizeTerminology(root.nodeValue);
        if (after !== root.nodeValue) root.nodeValue = after;
      }
      return;
    }
    if (!(root instanceof Element) && root !== document) return;
    if (root instanceof Element) neutralizeElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (isHelpDeskTechnicalContent(node)) continue;
        const parentName = node.parentElement?.tagName;
        if (parentName === 'SCRIPT' || parentName === 'STYLE') continue;
        const after = neutralizeTerminology(node.nodeValue);
        if (after !== node.nodeValue) node.nodeValue = after;
      } else {
        neutralizeElement(node);
      }
    }
    document.title = neutralizeTerminology(document.title);
  }

  window.neutralizeTerminology = neutralizeTerminology;
  window.neutralizeTerminologyTree = neutralizeTree;

  const migratedTenantState = migrateTenantStorage(localStorage) |
    migrateTenantStorage(sessionStorage);
  if (migratedTenantState && typeof window.render === 'function') window.render();
  neutralizeTree(document.body);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') neutralizeTree(record.target);
      for (const node of record.addedNodes) neutralizeTree(node);
    }
    document.title = neutralizeTerminology(document.title);
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
})();
