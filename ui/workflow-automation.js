// Defender for Cloud > Workflow automation.
//
// Loaded after views.js and app.js, so it overrides the placeholder registration
// of VIEWS['defender-cloud/workflow'] without editing those files.
//
// Behaviour follows the Product documentation article "Workflow automation" for
// Defender for Cloud (ms.date 2025-10-19):
//   - the grid lets you "create new automation rules or enable, disable, or
//     delete existing ones", and scope is the subscription the automation is
//     deployed to;
//   - new rules are created from "Add workflow automation";
//   - the create pane takes a name and description, the triggers that initiate
//     the workflow, and the consumption logic app that runs when the trigger
//     conditions are met;
//   - the Actions section links out to the Logic Apps page, and Refresh
//     re-reads the logic app list;
//   - only three triggers are supported by the logic app designer (below).
//
// Nothing here calls a real Logic App. State is local to the browser.

const WORKFLOW_AUTOMATION_KEY = 'defender-lab.defender-cloud.workflow-automations';

// The exact trigger set the logic app designer supports. Attack paths are NOT a
// workflow automation trigger, despite being a Defender for Cloud feature — a
// rule cannot be built on them, which is a detail worth getting right.
const WORKFLOW_TRIGGERS = [
  { id:'alert',
    label:'When a Defender for Cloud Alert is created or triggered',
    filterLabel:'Alert severity',
    options:['High', 'Medium', 'Low', 'Informational'],
    defaults:['High'] },
  { id:'recommendation',
    label:'When a Defender for Cloud recommendation is created or triggered',
    filterLabel:'Recommendation severity',
    options:['High', 'Medium', 'Low'],
    defaults:['High'] },
  { id:'compliance',
    label:'When a Defender for Cloud regulatory compliance assessment is created or triggered',
    filterLabel:'Assessment state',
    options:['Failed', 'Passed', 'Skipped'],
    defaults:['Failed'] },
];

// Legacy trigger called out in the docs: it still exists in some tenants but
// Workflow automation will not open logic apps that use it.
const WORKFLOW_LEGACY_TRIGGER = 'When a response to a Defender for Cloud alert is triggered';

// Stand-ins for the consumption logic apps the dropdown would list. Only logic
// apps with a supporting Defender for Cloud connector appear in the real menu.
const WORKFLOW_LOGIC_APPS = [
  { name:'la-notify-soc-teams',        connector:'Teams',  rg:'RG-Playbooks' },
  { name:'la-open-remediation-ticket', connector:'ServiceNow',       rg:'RG-Playbooks' },
  { name:'la-email-cloud-responder',   connector:'Office 365 Outlook', rg:'RG-Playbooks' },
  { name:'la-isolate-workload',        connector:'Azure Resource Manager', rg:'RG-Response' },
];

const WORKFLOW_SUBSCRIPTIONS = ['sub-prod-001', 'sub-nonprod-002'];

function defaultWorkflowAutomations() {
  return [
    { id:'wf-1', name:'Notify SOC on high severity alerts',
      description:'Pages the on-call cloud responder for high severity workload protection alerts.',
      enabled:true, trigger:'alert', filters:['High'],
      logicApp:'la-notify-soc-teams', subscription:'sub-prod-001', rg:'RG-Playbooks' },
    { id:'wf-2', name:'Ticket public storage recommendations',
      description:'Opens a remediation ticket when a storage account is flagged as publicly reachable.',
      enabled:false, trigger:'recommendation', filters:['High', 'Medium'],
      logicApp:'la-open-remediation-ticket', subscription:'sub-prod-001', rg:'RG-Playbooks' },
    { id:'wf-3', name:'Escalate failed compliance controls',
      description:'Emails the compliance owner when a regulatory compliance assessment starts failing.',
      enabled:true, trigger:'compliance', filters:['Failed'],
      logicApp:'la-email-cloud-responder', subscription:'sub-prod-001', rg:'RG-Playbooks' },
  ];
}

function loadWorkflowAutomations() {
  try {
    const raw = localStorage.getItem(WORKFLOW_AUTOMATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* fall through to defaults on unreadable state */ }
  return defaultWorkflowAutomations();
}

function saveWorkflowAutomations(list) {
  localStorage.setItem(WORKFLOW_AUTOMATION_KEY, JSON.stringify(list));
}

let workflowAutomations = loadWorkflowAutomations();
let workflowSelection = new Set();

function workflowTrigger(id) {
  return WORKFLOW_TRIGGERS.find(t => t.id === id) || WORKFLOW_TRIGGERS[0];
}

function rerenderWorkflowView() {
  saveWorkflowAutomations(workflowAutomations);
  mountView(currentRoute());
}

// ---------- grid selection ----------
function toggleWorkflowRow(id, checked) {
  if (checked) workflowSelection.add(id); else workflowSelection.delete(id);
  syncWorkflowToolbar();
}

function toggleAllWorkflowRows(checked) {
  workflowSelection = checked ? new Set(workflowAutomations.map(a => a.id)) : new Set();
  document.querySelectorAll('.wf-row-check').forEach(cb => { cb.checked = checked; });
  syncWorkflowToolbar();
}

// Enable/Disable/Delete act on the current selection, so they stay disabled
// until at least one row is ticked.
function syncWorkflowToolbar() {
  const n = workflowSelection.size;
  ['wf-enable', 'wf-disable', 'wf-delete'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = n === 0;
  });
  const count = document.getElementById('wf-selected-count');
  if (count) count.textContent = n ? `${n} selected` : 'None selected';
  const all = document.getElementById('wf-check-all');
  if (all) {
    all.checked = n > 0 && n === workflowAutomations.length;
    all.indeterminate = n > 0 && n < workflowAutomations.length;
  }
}

function setWorkflowEnabled(enabled) {
  if (!workflowSelection.size) return;
  let changed = 0;
  workflowAutomations.forEach(a => {
    if (workflowSelection.has(a.id) && a.enabled !== enabled) { a.enabled = enabled; changed++; }
  });
  toast(changed
    ? `${changed} workflow automation${changed === 1 ? '' : 's'} ${enabled ? 'enabled' : 'disabled'}.`
    : `Already ${enabled ? 'enabled' : 'disabled'}.`);
  rerenderWorkflowView();
}

function deleteWorkflowSelection() {
  if (!workflowSelection.size) return;
  const n = workflowSelection.size;
  workflowAutomations = workflowAutomations.filter(a => !workflowSelection.has(a.id));
  workflowSelection = new Set();
  toast(`${n} workflow automation${n === 1 ? '' : 's'} deleted.`);
  rerenderWorkflowView();
}

// Row-level toggle, mirroring the enable/disable switch on a single rule.
function toggleWorkflowAutomation(id) {
  const a = workflowAutomations.find(x => x.id === id);
  if (!a) return;
  a.enabled = !a.enabled;
  toast(`"${a.name}" ${a.enabled ? 'enabled' : 'disabled'}.`);
  rerenderWorkflowView();
}

function resetWorkflowAutomations() {
  workflowAutomations = defaultWorkflowAutomations();
  workflowSelection = new Set();
  toast('Workflow automations reset to the lab defaults.');
  rerenderWorkflowView();
}

// ---------- create pane ----------
function ensureWorkflowPanel() {
  let panel = document.getElementById('panel-workflow');
  if (panel) return panel;
  panel = document.createElement('aside');
  panel.id = 'panel-workflow';
  panel.className = 'sidepanel wide hidden';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.innerHTML = `
    <div class="sidepanel-header">
      <h2>Add workflow automation</h2>
      <button class="iconbtn" data-close="panel-workflow" onclick="hidePanels()">✕</button>
    </div>
    <div id="workflow-panel-body" class="sidepanel-body"></div>`;
  document.body.appendChild(panel);
  return panel;
}

function openWorkflowPanel() {
  ensureWorkflowPanel();
  const t = WORKFLOW_TRIGGERS[0];
  document.getElementById('workflow-panel-body').innerHTML = `
    <div class="callout info">
      Creating an automation requires <strong>Security admin</strong> or <strong>Owner</strong> on the
      resource group, plus <strong>Logic App Contributor</strong> to create or edit a logic app.
      <strong>Logic App Operator</strong> can only run existing ones.
    </div>

    <div class="alert-section-title">Basics</div>
    <label class="field"><span>Name</span>
      <input id="wf-name" type="text" placeholder="Notify SOC on high severity alerts"></label>
    <label class="field"><span>Description</span>
      <textarea id="wf-desc" rows="2" placeholder="What this automation does and who it notifies."></textarea></label>
    <div class="detail-row">
      <label class="field"><span>Subscription</span>
        <select id="wf-sub">${WORKFLOW_SUBSCRIPTIONS.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
      <label class="field"><span>Resource group</span>
        <select id="wf-rg">${[...new Set(WORKFLOW_LOGIC_APPS.map(l => l.rg))].map(r => `<option>${esc(r)}</option>`).join('')}</select></label>
    </div>

    <div class="alert-section-title">Trigger conditions</div>
    <label class="field"><span>Defender for Cloud trigger</span>
      <select id="wf-trigger" onchange="onWorkflowTriggerChange()">
        ${WORKFLOW_TRIGGERS.map(x => `<option value="${x.id}">${esc(x.label)}</option>`).join('')}
      </select></label>
    <div id="wf-filter-wrap"></div>

    <div class="alert-section-title">Actions</div>
    <p class="muted">
      The dropdown lists only consumption logic apps that have a supporting Defender for Cloud
      connector. Created one just now? Select <strong>Refresh</strong> to pick it up.
    </p>
    <label class="field"><span>Logic app</span>
      <select id="wf-logicapp">
        ${WORKFLOW_LOGIC_APPS.map(l => `<option value="${esc(l.name)}">${esc(l.name)} — ${esc(l.connector)}</option>`).join('')}
      </select></label>
    <div class="detail-row" style="gap:8px;">
      <button class="btn btn-secondary btn-sm" onclick="refreshWorkflowLogicApps()">Refresh</button>
      <button class="btn btn-secondary btn-sm" onclick="visitLogicAppsPage()">Visit the Logic Apps page</button>
    </div>

    <div class="callout warn" style="margin-top:14px;">
      The legacy trigger “${esc(WORKFLOW_LEGACY_TRIGGER)}” is not offered here.
      Workflow automation will not open logic apps that still use it.
    </div>

    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="createWorkflowAutomation()">Create</button>
      <button class="btn btn-secondary" onclick="hidePanels()">Cancel</button>
    </div>`;
  renderWorkflowFilters(t.id);
  showPanel('panel-workflow');
}

function renderWorkflowFilters(triggerId) {
  const t = workflowTrigger(triggerId);
  const wrap = document.getElementById('wf-filter-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="field"><span>${esc(t.filterLabel)}</span>
      <div class="detail-row" style="flex-wrap:wrap; gap:12px;">
        ${t.options.map(o => `
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="wf-filter" value="${esc(o)}"
              ${t.defaults.includes(o) ? 'checked' : ''}>${esc(o)}
          </label>`).join('')}
      </div>
    </div>`;
}

function onWorkflowTriggerChange() {
  renderWorkflowFilters(document.getElementById('wf-trigger').value);
}

function refreshWorkflowLogicApps() {
  toast('Logic app list refreshed. Only apps with a Defender for Cloud connector are listed.');
}

function visitLogicAppsPage() {
  toast('In Azure this opens the Logic Apps page, where you select (+) Add, then Review + Create.');
}

function createWorkflowAutomation() {
  const name = (document.getElementById('wf-name').value || '').trim();
  if (!name) { toast('Enter a name for the automation.'); return; }
  const filters = [...document.querySelectorAll('.wf-filter:checked')].map(c => c.value);
  if (!filters.length) { toast('Select at least one trigger condition.'); return; }

  workflowAutomations.push({
    id:`wf-${Date.now()}`,
    name,
    description:(document.getElementById('wf-desc').value || '').trim() || 'No description provided.',
    enabled:true,
    trigger:document.getElementById('wf-trigger').value,
    filters,
    logicApp:document.getElementById('wf-logicapp').value,
    subscription:document.getElementById('wf-sub').value,
    rg:document.getElementById('wf-rg').value,
  });
  hidePanels();
  toast(`Workflow automation "${name}" created and enabled.`);
  rerenderWorkflowView();
}

// ---------- view ----------
VIEWS['defender-cloud/workflow'] = () => ({
  html: `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Defender for Cloud › Management › <strong>Workflow automation</strong></div>
      <h1>Workflow automation</h1>
      <div class="page-subtitle">Trigger consumption logic apps on security alerts, recommendations, and regulatory compliance changes.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-primary" onclick="openWorkflowPanel()">+ Add workflow automation</button>
    </div>
  </div>

  <section class="card">
    <div class="card-toolbar">
      <strong>Automation rules</strong>
      <span class="muted" id="wf-selected-count">None selected</span>
      <span style="flex:1"></span>
      <button class="btn btn-secondary btn-sm" id="wf-enable"  onclick="setWorkflowEnabled(true)"  disabled>Enable</button>
      <button class="btn btn-secondary btn-sm" id="wf-disable" onclick="setWorkflowEnabled(false)" disabled>Disable</button>
      <button class="btn btn-secondary btn-sm" id="wf-delete"  onclick="deleteWorkflowSelection()" disabled>Delete</button>
      <button class="btn btn-secondary btn-sm" onclick="resetWorkflowAutomations()">Reset lab data</button>
    </div>
    <table class="grid">
      <thead>
        <tr>
          <th style="width:34px;"><input type="checkbox" id="wf-check-all" onchange="toggleAllWorkflowRows(this.checked)"
              aria-label="Select all workflow automations"></th>
          <th>Name</th><th>Status</th><th>Trigger</th><th>Conditions</th><th>Action (logic app)</th><th>Scope</th>
        </tr>
      </thead>
      <tbody>
        ${workflowAutomations.length === 0 ? `
          <tr><td colspan="7" class="muted" style="padding:18px;">
            No workflow automations defined. Select <strong>+ Add workflow automation</strong> to create one.
          </td></tr>` :
        workflowAutomations.map(a => {
          const t = workflowTrigger(a.trigger);
          return `
          <tr>
            <td><input type="checkbox" class="wf-row-check" value="${esc(a.id)}"
                  ${workflowSelection.has(a.id) ? 'checked' : ''}
                  onchange="toggleWorkflowRow('${esc(a.id)}', this.checked)"
                  aria-label="Select ${esc(a.name)}"></td>
            <td><strong>${esc(a.name)}</strong><div class="muted">${esc(a.description)}</div></td>
            <td><button class="tag ${a.enabled ? 'green' : 'orange'}"
                  onclick="toggleWorkflowAutomation('${esc(a.id)}')"
                  title="Select to ${a.enabled ? 'disable' : 'enable'} this automation"
                  style="cursor:pointer; border:none;">${a.enabled ? 'Enabled' : 'Disabled'}</button></td>
            <td>${esc(t.label)}</td>
            <td>${a.filters.map(f => `<span class="tag">${esc(f)}</span>`).join(' ')}</td>
            <td>${esc(a.logicApp)}</td>
            <td>${esc(a.subscription)}<div class="muted">${esc(a.rg)}</div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </section>

  <div class="two-col">
    <section class="card card-body">
      <div class="alert-section-title">Supported triggers</div>
      <p class="muted">The logic app designer supports exactly these three. Attack paths are not a workflow automation trigger.</p>
      <ul>${WORKFLOW_TRIGGERS.map(t => `<li>${esc(t.label)}</li>`).join('')}</ul>
      <div class="callout warn">
        If an automation relies on a recommendation that is later deprecated or replaced, the
        automation stops working and the trigger has to be updated.
      </div>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">Beyond this page</div>
      <ul>
        <li><strong>Manual run:</strong> open any security alert or recommendation and select
            <strong>Trigger logic app</strong>.</li>
        <li><strong>At scale:</strong> assign the <code>DeployIfNotExist</code> Azure Policy definitions
            to a management group to roll automations out across subscriptions.</li>
        <li><strong>Permissions:</strong> Logic App Operator can run existing logic apps; creating or
            editing one needs Logic App Contributor.</li>
      </ul>
      <div class="callout info">Local lab only — no Logic App is ever invoked. State persists in this browser.</div>
    </section>
  </div>`,
  onMount: syncWorkflowToolbar,
});
