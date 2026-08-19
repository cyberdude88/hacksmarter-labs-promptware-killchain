// SC-200_lab — router, suppression engine, panel wiring.

// ---------- suppression engine (AND semantics) ----------
let alerts = SEED_ALERTS.map(a => ({ ...a, event: { ...a.event } }));
let rules = loadRules();
let lastAttackStorySelection = null;

function loadRules() {
  const raw = localStorage.getItem('defender-lab.rules');
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return [DEFAULT_SUPPRESSION_RULE];
}
function saveRules() {
  localStorage.setItem('defender-lab.rules', JSON.stringify(rules));
}
function matchedRule(alert) {
  return rules.find(r =>
    r.enabled !== false &&
    r.conditions.length > 0 &&
    r.conditions.every(c => c.op === 'equals' && alert.event[c.field] === c.value)
  );
}

// ---------- router ----------
const DEFAULT_ROUTE = '#/xdr/home';
const LAB_BRAND = 'Hack Smarter Labs';

function currentRoute() {
  return (location.hash || DEFAULT_ROUTE).replace(/^#\//, '');   // e.g. "xdr/home"
}
function workloadOf(route) {
  const id = route.split('/')[0];
  return PORTALS.find(p => p.id === id) ? id : 'xdr';
}
function navigate(hash) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  // A running module coach can restrict the app to its own set of pages.
  if (typeof coachAllowsRoute === 'function' && !coachAllowsRoute(hash)) return;
  if (location.hash === hash) render();
  else location.hash = hash;
}

function render() {
  finalizeSentinelRestoreJobIfReady();
  const route = currentRoute();
  const wl    = workloadOf(route);
  const portal = PORTALS.find(p => p.id === wl);

  document.body.className = 'wl-' + wl + ' route-' + route.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  // Keep the publisher prominent and present every workload with neutral,
  // transferable security-operations terminology.
  document.getElementById('portal-name').textContent = LAB_BRAND;
  document.getElementById('portal-context').textContent = `· ${portal.name}`;
  document.title = `${LAB_BRAND} — ${portal.name}`;

  const shell = document.getElementById('shell');
  const azurePane = document.getElementById('pane-azure');
  const bladePane = document.getElementById('pane-blade');
  const cleanPortal = wl === 'governance';
  const singlePanePortal = wl === 'workspace';
  shell.classList.remove('no-azure', 'clean-portal');
  shell.classList.toggle('clean-portal', cleanPortal);
  shell.classList.toggle('no-azure', singlePanePortal);
  azurePane.hidden = cleanPortal;
  bladePane.hidden = cleanPortal;

  if (!cleanPortal) {
    azurePane.hidden = singlePanePortal;
    bladePane.hidden = false;
    if (!singlePanePortal) renderAzurePane(wl);
    document.getElementById('blade-title').textContent = portal.name;
    renderSidenav(wl, '#/' + route);
    applyPaneCollapseState();
  }
  renderPortalTabs(wl);
  mountView(route);
  scheduleGuideRefresh();
  if (typeof coachAfterRender === 'function') coachAfterRender();
}

// Top-of-page neutral simulator context strip.
// XDR and governance workloads use the XDR Security context; SIEM and cloud
// security workloads use Cloud Console.
const PORTAL_CONTEXT = {
  'xdr':        'xdr',
  'governance': 'xdr',
  'siem':       'cloud',
  'cloud':      'cloud',
  'ai-agent':   'xdr',
  'identity':   'admin',
  'workspace':  'admin',
};
const PORTAL_CONTEXT_HOME = {
  'xdr':   '#/xdr/home',
  'cloud': '#/cloud/overview',
  'admin': '#/workspace/home',
};
function renderPortalTabs(wl) {
  const active = PORTAL_CONTEXT[wl];
  document.querySelectorAll('.portal-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.portal === active);
  });
}
function switchPortalContext(ctx) {
  const wl = workloadOf(currentRoute());
  if (PORTAL_CONTEXT[wl] === ctx) return;
  navigate(PORTAL_CONTEXT_HOME[ctx]);
}
window.switchPortalContext = switchPortalContext;

// Which Cloud app to highlight for the active workload.
const CLOUD_HIGHLIGHT = {
  'xdr':        'XDR Security',
  'siem':       'SIEM & SOAR',
  'cloud':      'Cloud Console',
  'governance': 'Data Governance',
  'identity':   'Identity & Access',
  'workspace':  'Workspace Admin',
};
function renderAzurePane(wl) {
  const target = CLOUD_HIGHLIGHT[wl];
  const ul = CLOUD_NAV.map(item => {
    const route = CLOUD_APP_ROUTE[item.label];
    const cls = (item.label === target) ? ' class="current-app"' : '';
    const onclick = route ? ` onclick="navigate('${route}')"` : '';
    // data-tip feeds the hover tooltip that stands in for the label once the pane
    // is collapsed to an icon rail.
    return `<li${cls}${onclick} data-tip="${escHtml(item.label)}">
              <span class="navicon">${item.icon || ''}</span><span class="navlabel">${item.label}</span>
            </li>`;
  }).join('');
  document.getElementById('sidenav-azure').innerHTML = ul;
}

// Subsection collapse state is namespaced by its parent so the same label
// (e.g. "Hunting") can appear under more than one section.
function subKey(section, subsection) {
  return `${section || '_'} / ${subsection}`;
}

function navSectionKey(wl, section) {
  return `defender-lab.nav.section.${wl}.${section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function navSectionExpanded(wl, section) {
  return localStorage.getItem(navSectionKey(wl, section)) !== 'collapsed';
}

function setNavSectionExpanded(wl, section, expanded) {
  localStorage.setItem(navSectionKey(wl, section), expanded ? 'expanded' : 'collapsed');
}

function renderSidenav(wl, activeHash) {
  const items = NAV[wl] || [];

  let currentSection = null;
  let sectionExpanded = true;
  let currentSub = null;
  let subExpanded = true;
  const ul = items.map(item => {
    if (item.section) {
      currentSection = item.section;
      sectionExpanded = navSectionExpanded(wl, currentSection);
      // A new top-level section ends any subsection scope from the previous one.
      currentSub = null;
      subExpanded = true;
      const caret = sectionExpanded ? '▾' : '▸';
      return `<li class="navsection">
        <button type="button" class="navsection-toggle" aria-expanded="${sectionExpanded}"
          data-workload="${escHtml(wl)}" data-section="${escHtml(item.section)}"
          onclick="toggleNavSection(this.dataset.workload, this.dataset.section)">
          <span class="navcaret">${caret}</span><span>${escHtml(item.section)}</span>
        </button>
      </li>`;
    }
    if (item.subsection) {
      currentSub = subKey(currentSection, item.subsection);
      subExpanded = navSectionExpanded(wl, currentSub);
      const caret = subExpanded ? '▾' : '▸';
      const hidden = !sectionExpanded ? ' section-hidden' : '';
      return `<li class="navsubsection${hidden}">
        <button type="button" class="navsubsection-toggle" aria-expanded="${subExpanded}"
          data-workload="${escHtml(wl)}" data-section="${escHtml(currentSub)}"
          onclick="toggleNavSection(this.dataset.workload, this.dataset.section)">
          <span class="navcaret">${caret}</span><span>${escHtml(item.subsection)}</span>
        </button>
      </li>`;
    }
    const classes = ['navitem'];
    if (item.route === activeHash) classes.push('active');
    if (currentSub) classes.push('navitem-nested');
    // Hidden when either its own section or its enclosing subsection is collapsed.
    if ((currentSection && !sectionExpanded) || (currentSub && !subExpanded)) classes.push('section-hidden');
    return `<li class="${classes.join(' ')}" onclick="navigate('${item.route}')"
                data-route="${escHtml(item.route)}" data-tip="${escHtml(item.label)}">
              <span class="navicon">${item.icon || ''}</span><span class="navlabel">${item.label}</span>
            </li>`;
  }).join('');
  document.getElementById('sidenav').innerHTML = ul;
}

function toggleNavSection(wl, section) {
  const expanded = !navSectionExpanded(wl, section);
  setNavSectionExpanded(wl, section, expanded);
  renderSidenav(workloadOf(currentRoute()), '#/' + currentRoute());
}

function applyPaneCollapseState() {
  const azCollapsed = localStorage.getItem('defender-lab.pane.azure') === 'collapsed';
  const blCollapsed = localStorage.getItem('defender-lab.pane.blade') === 'collapsed';
  document.getElementById('pane-azure').classList.toggle('collapsed', azCollapsed);
  document.getElementById('pane-blade').classList.toggle('collapsed', blCollapsed);
  document.getElementById('toggle-azure').textContent = azCollapsed ? '»' : '«';
  document.getElementById('toggle-blade').textContent = blCollapsed ? '»' : '«';
}
function togglePane(which) {
  const key = 'defender-lab.pane.' + which;
  const cur = localStorage.getItem(key);
  localStorage.setItem(key, cur === 'collapsed' ? 'expanded' : 'collapsed');
  applyPaneCollapseState();
  hideTooltip();
}

// ---------- Hover tooltips for icon-only controls ----------
// A collapsed pane hides its labels, so the bare icons need the name on hover the
// way the real portal does it. Only elements whose label is currently off screen
// qualify — if the words are already next to the icon there is nothing to explain.
// The tooltip lives on <body> because the panes scroll, and an absolutely
// positioned child would be clipped by their overflow.
const TOOLTIP_DELAY_MS = 450;
let tooltipEl = null;
let tooltipTimer = null;
let tooltipTarget = null;

function tooltipNode() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'hover-tip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.hidden = true;
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

// An element is "icon only" when it carries a label that is not being rendered.
function iconOnlyTipTarget(node) {
  const el = node && node.closest ? node.closest('[data-tip]') : null;
  if (!el || !el.dataset.tip) return null;
  const label = el.querySelector('.navlabel');
  if (label && label.offsetParent !== null) return null;
  return el;
}

function showTooltip(el) {
  const tip = tooltipNode();
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  tip.classList.remove('visible');

  // Sit to the right of the icon, flipping to the left if the viewport runs out.
  const anchor = el.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  let left = anchor.right + 8;
  if (left + box.width > window.innerWidth - 8) left = Math.max(8, anchor.left - box.width - 8);
  const top = Math.min(
    Math.max(8, anchor.top + anchor.height / 2 - box.height / 2),
    window.innerHeight - box.height - 8);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
  // Next frame so the fade-in actually animates; the timer is a fallback for
  // frames that never run (background tabs).
  const reveal = () => { if (tooltipTarget === el) tip.classList.add('visible'); };
  requestAnimationFrame(reveal);
  setTimeout(reveal, 60);
}

function hideTooltip() {
  clearTimeout(tooltipTimer);
  tooltipTimer = null;
  tooltipTarget = null;
  if (!tooltipEl) return;
  tooltipEl.classList.remove('visible');
  tooltipEl.hidden = true;
}

function initTooltips() {
  document.addEventListener('mouseover', e => {
    const el = iconOnlyTipTarget(e.target);
    if (el === tooltipTarget) return;
    hideTooltip();
    if (!el) return;
    tooltipTarget = el;
    tooltipTimer = setTimeout(() => { if (tooltipTarget === el) showTooltip(el); }, TOOLTIP_DELAY_MS);
  });
  document.addEventListener('mouseout', e => {
    if (tooltipTarget && !tooltipTarget.contains(e.relatedTarget)) hideTooltip();
  });
  // Any movement of the thing being pointed at invalidates the position.
  document.addEventListener('click', hideTooltip, true);
  document.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('blur', hideTooltip);
}

function mountView(route) {
  const main = document.getElementById('content');
  const fn = VIEWS[route];
  if (!fn) {
    main.innerHTML = `
      <div class="page-header"><div><h1>Page not found</h1>
        <div class="page-subtitle">No view registered for <code>#/${esc(route)}</code>.</div>
      </div></div>`;
    return;
  }
  const out = fn();
  if (typeof out === 'string') {
    main.innerHTML = out;
  } else {
    main.innerHTML = out.html;
    if (typeof out.onMount === 'function') out.onMount();
  }
}

// ---------- panel helpers ----------
function showPanel(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('scrim').classList.remove('hidden');
}
function hidePanels() {
  document.querySelectorAll('.sidepanel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.wizard-window').forEach(p => p.classList.add('hidden'));
  document.getElementById('scrim').classList.add('hidden');
}

function openAlert(id) {
  const a = alerts.find(x => x.id === id);
  if (!a) return;
  document.getElementById('alert-title').textContent = a.title;
  document.getElementById('alert-body').innerHTML = renderAlertDetail(a);
  showPanel('panel-alert');
}

// Embedded script analysis pane, opened from a script-based alert. The MITRE
// technique list is hidden until the analyst selects "Show MITRE techniques".
function openScriptAnalysis(alertId) {
  const a = alerts.find(x => x.id === alertId);
  if (!a || !a.scriptAnalysis) return;
  const s = a.scriptAnalysis;
  document.getElementById('script-title').textContent = `Script analysis — ${s.fileName}`;
  document.getElementById('script-body').innerHTML = `
    <div class="pill-row">
      <span class="tag">${esc(s.fileName)}</span>
      <span class="tag">Spawned by ${esc(s.spawnedBy)}</span>
      <span class="sev high">${esc(s.verdict)}</span>
    </div>
    <p class="muted" style="line-height:1.45;">${esc(s.summary)}</p>

    <div class="alert-section-title">Deobfuscated script</div>
    <pre class="kql" style="min-height:auto;white-space:pre-wrap;">${s.decoded.map(esc).join('\n')}</pre>

    <div class="alert-section-title">Key findings</div>
    <ul class="attack-evidence-list">${s.findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul>

    <div class="alert-section-title" style="display:flex;align-items:center;justify-content:space-between;">
      <span>MITRE ATT&amp;CK techniques</span>
      <button class="btn btn-primary btn-sm" id="script-mitre-btn"
        onclick="toggleScriptMitre('${esc(alertId)}')">Show MITRE techniques</button>
    </div>
    <div id="script-mitre-list" class="hidden"></div>

    <div class="callout info" style="margin-top:16px;">
      Selecting <strong>Show MITRE techniques</strong> reveals the ATT&amp;CK techniques the analyzed
      script maps to, so you can see the tactics used and how they impact the environment.
    </div>`;
  showPanel('panel-script');
}

function toggleScriptMitre(alertId) {
  const a = alerts.find(x => x.id === alertId);
  if (!a || !a.scriptAnalysis) return;
  const list = document.getElementById('script-mitre-list');
  const btn = document.getElementById('script-mitre-btn');
  if (!list.classList.contains('hidden')) {
    list.classList.add('hidden');
    btn.textContent = 'Show MITRE techniques';
    return;
  }
  const byTactic = {};
  a.scriptAnalysis.techniques.forEach(t => { (byTactic[t.tactic] = byTactic[t.tactic] || []).push(t); });
  list.innerHTML = Object.entries(byTactic).map(([tactic, techs]) => `
    <div class="alert-section-title" style="margin-top:12px;">${esc(tactic)}</div>
    ${techs.map(t => `
      <div class="card card-body" style="margin-bottom:8px;">
        <div class="pill-row"><span class="tag">${esc(t.id)}</span><strong>${esc(t.name)}</strong></div>
        <div class="muted" style="margin-top:4px;">${esc(t.detail)}</div>
      </div>`).join('')}
  `).join('');
  list.classList.remove('hidden');
  btn.textContent = 'Hide MITRE techniques';
}

function openIncident(id) {
  const inc = INCIDENTS.find(i => i.id === id);
  if (!inc) return;
  document.getElementById('incident-title').textContent = inc.title;
  document.getElementById('incident-body').innerHTML = renderIncidentDetail(inc);
  showPanel('panel-incident');
  setAttackStoryStep(id, 0);
}

function openIncidentPage(id) {
  sessionStorage.setItem('defender-lab.incident.id', id);
  sessionStorage.setItem('defender-lab.incident.tab', 'attack-story');
  hidePanels();
  navigate('#/xdr/incident');
}
function setIncidentTab(tab) {
  sessionStorage.setItem('defender-lab.incident.tab', tab);
  render();
}
window.setIncidentTab = setIncidentTab;

let attackStoryTimer = null;

function attackStoryPanel(incidentId) {
  return document.querySelector(`.attack-story[data-incident-id="${CSS.escape(incidentId)}"]`);
}

function readAttackStory(panel) {
  if (!panel) return null;
  const holder = panel.querySelector('[data-story-json]');
  if (!holder) return null;
  try { return JSON.parse(holder.dataset.storyJson); }
  catch { return null; }
}

function setAttackStoryStep(incidentId, stepIndex = 0) {
  const panel = attackStoryPanel(incidentId);
  const story = readAttackStory(panel);
  if (!panel || !story || !story.steps.length) return;

  const index = Math.max(0, Math.min(story.steps.length - 1, stepIndex));
  const step = story.steps[index];
  const currentNodeIndex = story.nodes.findIndex(n => n.id === step.node);
  const activeNodes = new Set(
    story.nodes
      .slice(0, currentNodeIndex >= 0 ? currentNodeIndex + 1 : 0)
      .map(n => n.id)
  );
  story.steps.slice(0, index + 1).forEach(s => {
    if (s.node) activeNodes.add(s.node);
  });
  const activeEdges = new Set(
    story.edges
      .filter(edge => activeNodes.has(edge.from) && activeNodes.has(edge.to))
      .map(edge => edge.from + '>' + edge.to)
  );

  panel.querySelectorAll('.attack-web-node').forEach(node => {
    const id = node.dataset.nodeId;
    node.classList.toggle('seen', activeNodes.has(id));
    node.classList.toggle('active', id === step.node);
  });
  panel.querySelectorAll('.attack-web-line').forEach(edge => {
    const key = edge.dataset.edgeFrom + '>' + edge.dataset.edgeTo;
    edge.classList.toggle('active', activeEdges.has(key));
  });
  panel.querySelectorAll('[data-story-step]').forEach(item => {
    item.classList.toggle('active', Number(item.dataset.storyStep) === index);
    item.classList.toggle('seen', Number(item.dataset.storyStep) <= index);
  });
  panel.querySelectorAll('[data-story-alert]').forEach(item => {
    item.classList.toggle('active', item.dataset.storyAlert === step.alertId);
  });

  const now = panel.querySelector('[data-story-now]');
  if (now) {
    const node = story.nodes.find(n => n.id === step.node) || {};
    const remediation = step.remediation || node.remediation || 'Review the entity details and choose the least disruptive containment action.';
    now.innerHTML = `
      <div class="t-time">${fmtTime(step.time)}</div>
      <div class="t-title">${esc(step.title)}</div>
      <p>${esc(step.detail)}</p>
      <div class="attack-story-actions-inline">
        <button class="btn btn-secondary btn-sm" onclick="openAlert('${esc(step.alertId)}')">Open alert</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/xdr/hunting')">Go hunt</button>
      </div>
      <div class="attack-story-remediation"><strong>Response action:</strong> ${esc(remediation)}</div>
    `;
  }

  updateAttackStoryEntity(panel, story, step.node, step.alertId);
}

function playAttackStory(incidentId) {
  const panel = attackStoryPanel(incidentId);
  const story = readAttackStory(panel);
  if (!panel || !story || !story.steps.length) return;

  clearInterval(attackStoryTimer);
  let index = 0;
  setAttackStoryStep(incidentId, index);
  attackStoryTimer = setInterval(() => {
    index += 1;
    if (index >= story.steps.length) {
      clearInterval(attackStoryTimer);
      attackStoryTimer = null;
      return;
    }
    setAttackStoryStep(incidentId, index);
  }, 1200);
}

function selectAttackStoryNode(incidentId, nodeId) {
  const panel = attackStoryPanel(incidentId);
  const story = readAttackStory(panel);
  if (!panel || !story) return;
  lastAttackStorySelection = { incidentId, nodeId };
  const firstRelatedStep = story.steps.findIndex(step => step.node === nodeId);
  if (firstRelatedStep >= 0) {
    setAttackStoryStep(incidentId, firstRelatedStep);
    return;
  }

  panel.querySelectorAll('.attack-web-node').forEach(node => {
    node.classList.toggle('active', node.dataset.nodeId === nodeId);
  });
  panel.querySelectorAll('.attack-web-line').forEach(edge => {
    edge.classList.toggle('active', edge.dataset.edgeFrom === nodeId || edge.dataset.edgeTo === nodeId);
  });
  panel.querySelectorAll('[data-story-alert]').forEach(item => item.classList.remove('active'));
  updateAttackStoryEntity(panel, story, nodeId, '');
}

function updateAttackStoryEntity(panel, story, nodeId, activeAlertId) {
  const holder = panel.querySelector('[data-story-entity]');
  if (!holder) return;
  const node = story.nodes.find(n => n.id === nodeId) || story.nodes[0] || {};
  lastAttackStorySelection = { incidentId: panel.dataset.incidentId, nodeId: node.id };
  const relatedSteps = story.steps.filter(step => step.node === node.id);
  const evidence = node.evidence || relatedSteps.map(step => step.title);
  const remediation = node.remediation || relatedSteps.find(step => step.remediation)?.remediation || 'Review evidence, validate verdict, then contain or dismiss.';
  const hasDevice = node.type === 'Device' && DEVICES.some(d => d.id === node.label || d.name === node.label);
  holder.innerHTML = `
    <div class="attack-entity-kicker">${esc(node.type || 'Entity')}</div>
    <div class="attack-entity-title">${esc(node.label || 'No entity selected')}</div>
    <dl class="attack-entity-meta">
      <dt>Related alerts</dt><dd>${relatedSteps.length || 'None highlighted'}</dd>
      <dt>Verdict</dt><dd>${esc(node.verdict || (relatedSteps.length ? 'Suspicious' : 'Unknown'))}</dd>
      <dt>Remediation</dt><dd>${esc(remediation)}</dd>
    </dl>
    <div class="attack-entity-subtitle">Evidence and response</div>
    <div class="attack-entity-actions">
      ${hasDevice
        ? `<button class="btn btn-primary btn-sm" onclick="openDevice('${esc(node.label)}')">Open device page</button>`
        : `<button class="btn btn-secondary btn-sm" onclick="openEntityPivot('${esc(node.type || 'Entity')}', '${esc(node.label || '')}')">Open entity page</button>`}
      <button class="btn btn-primary btn-sm" onclick="viewBlastRadius('${esc(panel.dataset.incidentId)}', '${esc(node.id || '')}')">View blast radius</button>
      <button class="btn btn-secondary btn-sm" onclick="runSentinelEntityPlaybook('${esc(node.label || panel.dataset.incidentId)}', 'Defender incident side panel')">Run playbook (entity)</button>
      <button class="btn btn-secondary btn-sm" onclick="navigate('#/xdr/hunting')">Go hunt</button>
    </div>
    <ul class="attack-evidence-list">
      ${(evidence.length ? evidence : ['No evidence attached to this entity.']).map(item => `<li>${esc(item)}</li>`).join('')}
    </ul>
    <div class="attack-related-alerts">
      ${story.steps.map(step => `
        <button class="${step.alertId === activeAlertId || step.node === node.id ? 'active' : ''}" data-story-alert="${esc(step.alertId)}"
          onclick="setAttackStoryStep('${esc(panel.dataset.incidentId)}', ${story.steps.indexOf(step)})">
          ${esc(step.alertId)} · ${esc(step.title)}
        </button>
      `).join('')}
    </div>
  `;
}

function viewBlastRadius(incidentId, nodeId) {
  const panel = attackStoryPanel(incidentId);
  const story = readAttackStory(panel);
  if (!panel || !story) return;
  lastAttackStorySelection = { incidentId, nodeId };
  panel.querySelectorAll('.attack-web-node').forEach(node => {
    node.classList.toggle('active', node.dataset.nodeId === nodeId);
  });
  panel.querySelectorAll('.attack-web-line').forEach(edge => {
    edge.classList.toggle('active', edge.dataset.edgeFrom === nodeId || edge.dataset.edgeTo === nodeId || edge.classList.contains('blast'));
  });
  const holder = panel.querySelector('[data-story-entity]');
  if (holder) holder.innerHTML = renderBlastRadiusGraph(story, nodeId);
}

function restoreAttackStoryEntity() {
  const selected = lastAttackStorySelection;
  if (!selected) return;
  const panel = attackStoryPanel(selected.incidentId);
  const story = readAttackStory(panel);
  if (!panel || !story) return;
  updateAttackStoryEntity(panel, story, selected.nodeId, '');
}

function openEntityPivot(type, name) {
  if (type === 'Device' && DEVICES.some(d => d.id === name || d.name === name)) {
    openDevice(name);
    return;
  }
  toast(`${type} entity page opened for ${name} (lab stub).`);
}

function openRulePanel(fromAlertId) {
  const a = fromAlertId ? alerts.find(x => x.id === fromAlertId) : null;
  const initial = a
    ? [{ field:'file_name', value:a.event.file_name },
       { field:'sha256',    value:a.event.sha256 }]
    : DEFAULT_SUPPRESSION_RULE.conditions.map(c => ({ field:c.field, value:c.value }));
  document.getElementById('rule-name').value =
    a ? `Suppress: ${a.title}` : 'Suppress legitimate vulnerability scanner';
  renderConditions(initial);
  showPanel('panel-rule');
}

function renderConditions(initial) {
  const wrap = document.getElementById('conditions');
  wrap.innerHTML = '';
  (initial || []).forEach(c => addConditionRow(c.field, c.value));
}
function addConditionRow(field = 'file_name', value = '') {
  const wrap = document.getElementById('conditions');
  const row = document.createElement('div');
  row.className = 'cond-row';
  row.innerHTML = `
    <select class="ipt cond-field">
      ${FIELDS.map(f => `<option value="${f.key}" ${f.key===field?'selected':''}>${f.label}</option>`).join('')}
    </select>
    <select class="ipt cond-op"><option>equals</option></select>
    <input class="ipt cond-value" type="text" value="${esc(value)}" />
    <button class="cond-del" title="Remove condition">✕</button>`;
  row.querySelector('.cond-del').addEventListener('click', () => row.remove());
  wrap.appendChild(row);
}

function readConditions() {
  return [...document.querySelectorAll('#conditions .cond-row')].map(row => ({
    field: row.querySelector('.cond-field').value,
    op:    row.querySelector('.cond-op').value,
    value: row.querySelector('.cond-value').value,
  })).filter(c => c.value.length > 0);
}

function deleteRule(id) {
  rules = rules.filter(r => r.id !== id);
  saveRules();
  render();
}

function replayScenario() {
  alerts = SEED_ALERTS.map(a => ({ ...a, event: { ...a.event } }));
  render();
  toast('Replayed 5 detection events through current suppression rules.');
}

function toggleSettingState(input) {
  const row = input.closest('.setting-row');
  const state = row?.querySelector('em');
  if (state) state.textContent = input.checked ? 'On' : 'Off';
}
window.toggleSettingState = toggleSettingState;

function showNotificationComposer() {
  const composer = document.getElementById('notification-composer');
  if (!composer) return;
  composer.classList.add('active');
  composer.scrollIntoView({ behavior:'smooth', block:'center' });
  setTimeout(() => document.getElementById('notif-name')?.focus(), 150);
}
window.showNotificationComposer = showNotificationComposer;

function createNotificationRule() {
  const result = document.getElementById('notification-result');
  const name = document.getElementById('notif-name')?.value || 'Untitled notification';
  const trigger = document.getElementById('notif-trigger')?.value || 'Incident created or updated';
  if (!result) return;
  result.classList.remove('hidden');
  result.innerHTML = `<strong>Created:</strong> ${esc(name)} listens for "${esc(trigger)}" in this lab session.`;
  toast('Created email notification rule in the lab.');
}
window.createNotificationRule = createNotificationRule;

function openSentinelRule(i) {
  const r = SENTINEL_RULES[i];
  if (!r) return;
  const tgt = document.getElementById('rule-preview');
  if (!tgt) return;
  tgt.innerHTML = `
    <div class="card">
      <div class="card-toolbar">
        <strong>${esc(r.name)}</strong>
        <span><span class="sev ${r.severity}">${cap(r.severity)}</span> · ${esc(r.frequency)}</span>
      </div>
      <div class="card-body">
        <div class="alert-section-title">Tactics</div>
        <div>${r.tactics.map(t=>`<span class="mitre">${esc(t)}</span>`).join('')}</div>
        ${r.techniques?.length ? `
          <div class="alert-section-title">Techniques</div>
          <div>${r.techniques.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
        ` : ''}
        ${r.entities?.length ? `
          <div class="alert-section-title">Entity mapping</div>
          <div>${r.entities.map(e=>`<span class="entity-chip">${esc(e)}</span>`).join('')}</div>
        ` : ''}
        <div class="alert-section-title">KQL query</div>
        <textarea class="kql" readonly>${esc(r.query)}</textarea>
      </div>
    </div>`;
  tgt.scrollIntoView({ behavior:'smooth' });
}

function openAnalyticsWizard() {
  selectAnalyticsRuleType('scheduled');
  analyticsWizardStep = 0;
  showPanel('panel-analytics-wizard');
  initAnalyticsWizard();
  document.getElementById('analytics-wizard-results')?.classList.add('hidden');
  const query = document.getElementById('analytics-rule-query');
  setTimeout(() => query.focus(), 0);
}

function toggleWizardAccordion(row) {
  row.classList.toggle('active');
}

let analyticsEntityMappings = [];
let analyticsWizardStep = 0;
const ANALYTICS_WIZARD_STEPS = [
  'General',
  'Set rule logic',
  'Incident settings',
  'Automated response',
  'Review and create',
];

function initAnalyticsWizard() {
  if (!analyticsEntityMappings.length) {
    analyticsEntityMappings = [
      { type:'Account', fields:[{ identifier:'Name', column:'UserPrincipalName' }] },
      { type:'IP', fields:[{ identifier:'Address', column:'IPAddress' }] },
      { type:'Host', fields:[{ identifier:'HostName', column:'DeviceName' }] },
    ];
  }
  renderAnalyticsRuleTypes();
  renderEntityCatalog();
  renderEntityMappings();
  setAnalyticsWizardStep(analyticsWizardStep);
}

function currentAnalyticsRuleType() {
  const id = document.getElementById('analytics-rule-type')?.value || 'scheduled';
  return SENTINEL_ANALYTICS_RULE_TYPES.find(t => t.id === id) || SENTINEL_ANALYTICS_RULE_TYPES[0];
}

function renderAnalyticsRuleTypes() {
  const list = document.getElementById('analytics-rule-type-list');
  const detail = document.getElementById('analytics-rule-type-detail');
  if (!list || !detail) return;
  const selected = currentAnalyticsRuleType();
  list.innerHTML = SENTINEL_ANALYTICS_RULE_TYPES.map(type => `
    <button class="rule-type-card ${type.id === selected.id ? 'active' : ''}" type="button" onclick="selectAnalyticsRuleType('${esc(type.id)}')">
      <span class="rule-type-badge">${esc(type.badge)}</span>
      <strong>${esc(type.name)}</strong>
      <span>${esc(type.summary)}</span>
    </button>
  `).join('');
  detail.innerHTML = `
    <strong>${esc(selected.name)}</strong>
    <span>${esc(selected.bestFor)}</span>
  `;
  const limits = document.getElementById('analytics-rule-type-limits');
  if (limits) {
    limits.innerHTML = selected.limits.map(item => `<span>${esc(item)}</span>`).join('');
  }
}

function selectAnalyticsRuleType(id) {
  const type = SENTINEL_ANALYTICS_RULE_TYPES.find(t => t.id === id) || SENTINEL_ANALYTICS_RULE_TYPES[0];
  const typeInput = document.getElementById('analytics-rule-type');
  if (typeInput) typeInput.value = type.id;
  const title = document.getElementById('analytics-wizard-title');
  if (title) title.textContent = `Analytics rule wizard - Create ${type.name}`;
  const name = document.getElementById('analytics-rule-name');
  const severity = document.getElementById('analytics-rule-severity');
  const tactics = document.getElementById('analytics-rule-tactics');
  const query = document.getElementById('analytics-rule-query');
  const runEvery = document.getElementById('analytics-run-every');
  const lookback = document.getElementById('analytics-lookback');
  const start = document.getElementById('analytics-start');
  if (name) name.value = type.defaults.name;
  if (severity) severity.value = type.defaults.severity;
  if (tactics) tactics.value = type.defaults.tactics;
  if (query) {
    query.value = type.defaults.query;
    query.readOnly = type.id === 'fusion';
  }
  if (runEvery) {
    runEvery.value = type.defaults.runEvery;
    runEvery.readOnly = type.id === 'fusion' || type.id === 'nrt';
  }
  if (lookback) {
    lookback.value = type.defaults.lookback;
    lookback.readOnly = type.id === 'fusion' || type.id === 'nrt';
  }
  if (start) start.value = type.defaults.start;
  const intro = document.getElementById('analytics-logic-intro');
  if (intro) intro.textContent = type.id === 'fusion'
    ? 'Review the built-in machine-learning behavior analytics rule behavior and required data coverage.'
    : 'Define the detection logic for this analytics rule.';
  document.getElementById('analytics-wizard-results')?.classList.add('hidden');
  renderAnalyticsRuleTypes();
}

function setAnalyticsWizardStep(step) {
  analyticsWizardStep = Math.max(0, Math.min(ANALYTICS_WIZARD_STEPS.length - 1, step));
  document.querySelectorAll('#panel-analytics-wizard .wizard-step').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.wizardStep) === analyticsWizardStep);
  });
  document.querySelectorAll('#panel-analytics-wizard .wizard-tab').forEach((tab, index) => {
    tab.classList.toggle('active', index === analyticsWizardStep);
    tab.setAttribute('aria-current', index === analyticsWizardStep ? 'step' : 'false');
  });

  const prev = document.getElementById('analytics-wizard-prev');
  const next = document.getElementById('analytics-wizard-next');
  if (prev) prev.disabled = analyticsWizardStep === 0;
  if (next) {
    next.textContent = analyticsWizardStep === ANALYTICS_WIZARD_STEPS.length - 1
      ? 'Create'
      : `Next: ${ANALYTICS_WIZARD_STEPS[analyticsWizardStep + 1]} >`;
  }
  if (analyticsWizardStep === ANALYTICS_WIZARD_STEPS.length - 1) renderAnalyticsReview();
}

function readCreatedAnalyticsRules() {
  try { return JSON.parse(localStorage.getItem('defender-lab.sentinel.analytics.created') || '[]'); }
  catch { return []; }
}
function deleteAnalyticsRule(id) {
  const rules = readCreatedAnalyticsRules().filter(r => r.id !== id);
  localStorage.setItem('defender-lab.sentinel.analytics.created', JSON.stringify(rules));
  toast('Deleted analytics rule.');
  render();
}
/* ---- Anomaly rule customization (mimics Analytics → Anomalies tab) ----
   Real Sentinel: you don't author anomaly rules from blank. You duplicate a
   built-in template to get ONE customizable copy, which runs in Flighting
   alongside the Production original. Promoting the copy to Production flips
   the original to Flighting. Only one copy per rule is allowed. */
const ANOMALY_DUP_KEY = 'defender-lab.sentinel.anomaly.duplicates';
function readAnomalyDuplicates() {
  try { return JSON.parse(localStorage.getItem(ANOMALY_DUP_KEY) || '[]'); }
  catch { return []; }
}
function writeAnomalyDuplicates(list) {
  localStorage.setItem(ANOMALY_DUP_KEY, JSON.stringify(list));
}
function duplicateAnomalyRule(i) {
  const tmpl = SENTINEL_ANOMALY_RULES[i];
  if (!tmpl) return;
  const list = readAnomalyDuplicates();
  if (list.some(d => d.source === tmpl.name)) {
    toast('Only one customized copy of an anomaly rule is allowed. Edit the existing copy to test different settings.');
    return;
  }
  list.push({ id: 'anom-' + Date.now(), source: tmpl.name, threshold: tmpl.threshold, mode: 'Flighting', status: 'Enabled' });
  writeAnomalyDuplicates(list);
  toast(`Customized copy of "${tmpl.name}" created in Flighting mode.`);
  render();
}
function editAnomalyThreshold(id) {
  const list = readAnomalyDuplicates();
  const dup = list.find(d => d.id === id);
  if (!dup) return;
  const next = prompt('Edit the threshold on this customized copy (this is how you test different settings — you cannot make a second duplicate):', dup.threshold);
  if (next === null) return;
  dup.threshold = next.trim() || dup.threshold;
  writeAnomalyDuplicates(list);
  toast('Threshold updated on the customized copy.');
  render();
}
function promoteAnomalyRule(id) {
  const list = readAnomalyDuplicates();
  const dup = list.find(d => d.id === id);
  if (!dup) return;
  dup.mode = 'Production';
  writeAnomalyDuplicates(list);
  toast('Customized copy promoted to Production. The built-in original now runs in Flighting.');
  render();
}
function deleteAnomalyDuplicate(id) {
  writeAnomalyDuplicates(readAnomalyDuplicates().filter(d => d.id !== id));
  toast('Deleted customized copy. You can now create a new duplicate of that rule.');
  render();
}

function moveAnalyticsWizardStep(delta) {
  if (analyticsWizardStep === ANALYTICS_WIZARD_STEPS.length - 1 && delta > 0) {
    const type = currentAnalyticsRuleType();
    const ws = currentWorkspace();
    const val = (id) => document.getElementById(id)?.value;
    const name = (val('analytics-rule-name') || type.defaults.name).trim();
    const severity = (val('analytics-rule-severity') || 'Medium').toLowerCase();
    const tactics = (val('analytics-rule-tactics') || '').split(',').map(s => s.trim()).filter(Boolean);
    const runEvery = val('analytics-run-every') || type.defaults.runEvery || '5 minutes';
    const frequency = /^every/i.test(runEvery) ? runEvery : `Every ${runEvery}`;
    const query = val('analytics-rule-query') || type.defaults.query || '';

    const rule = { id: 'ar-' + Date.now(), workspaceId: ws.id, name, type: type.badge, severity, enabled: true, frequency, tactics, query };
    const rules = readCreatedAnalyticsRules();
    rules.push(rule);
    localStorage.setItem('defender-lab.sentinel.analytics.created', JSON.stringify(rules));

    hidePanels();
    toast(`Created "${name}" — added to ${ws.name}.`);
    render();
    return;
  }
  setAnalyticsWizardStep(analyticsWizardStep + delta);
}
window.readCreatedAnalyticsRules = readCreatedAnalyticsRules;
window.deleteAnalyticsRule = deleteAnalyticsRule;

function renderAnalyticsReview() {
  const target = document.getElementById('analytics-review');
  if (!target) return;
  const query = document.getElementById('analytics-rule-query')?.value || '';
  const type = currentAnalyticsRuleType();
  const name = document.getElementById('analytics-rule-name')?.value || 'Untitled analytics rule';
  const severity = document.getElementById('analytics-rule-severity')?.value || 'Medium';
  const frequency = document.getElementById('analytics-run-every')?.value || '5 minutes';
  const lookback = document.getElementById('analytics-lookback')?.value || '5 minutes';
  target.innerHTML = `
    <div class="review-grid">
      <div><span class="muted">Rule type</span><strong>${esc(type.name)}</strong></div>
      <div><span class="muted">Name</span><strong>${esc(name)}</strong></div>
      <div><span class="muted">Severity</span><strong>${esc(severity)}</strong></div>
      <div><span class="muted">Schedule</span><strong>Every ${esc(frequency)}</strong></div>
      <div><span class="muted">Lookback</span><strong>${esc(lookback)}</strong></div>
      <div><span class="muted">Mapped entities</span><strong>${analyticsEntityMappings.length}</strong></div>
    </div>
    <div class="alert-section-title">Query</div>
    <textarea class="kql" readonly>${esc(query)}</textarea>
  `;
}

function toggleEntityCatalog(force) {
  const catalog = document.getElementById('entity-catalog');
  if (!catalog) return;
  const show = typeof force === 'boolean' ? force : catalog.classList.contains('hidden');
  catalog.classList.toggle('hidden', !show);
}

function renderEntityCatalog() {
  const list = document.getElementById('entity-catalog-list');
  if (!list) return;
  list.innerHTML = SENTINEL_ENTITY_TYPES.map(entity => `
    <button class="entity-option" type="button" onclick="addEntityMapping('${esc(entity.type)}')">
      <span class="entity-option-icon">${esc(entity.icon)}</span>
      <span>${esc(entity.type)}</span>
    </button>
  `).join('');
}

function addEntityMapping(type = 'Account') {
  if (analyticsEntityMappings.length >= 10) {
    toast('Sentinel analytics rules can map up to 10 entities.');
    toggleEntityCatalog(false);
    return;
  }
  const entity = SENTINEL_ENTITY_TYPES.find(e => e.type === type) || SENTINEL_ENTITY_TYPES[0];
  analyticsEntityMappings.push({
    type: entity.type,
    fields: [{ identifier: entity.identifiers[0], column: suggestedEntityColumn(entity.type) }],
  });
  toggleEntityCatalog(false);
  renderEntityMappings();
}

function removeEntityMapping(index) {
  analyticsEntityMappings.splice(index, 1);
  renderEntityMappings();
}

function changeEntityType(index, type) {
  const entity = SENTINEL_ENTITY_TYPES.find(e => e.type === type);
  if (!entity) return;
  analyticsEntityMappings[index] = {
    type: entity.type,
    fields: [{ identifier: entity.identifiers[0], column: suggestedEntityColumn(entity.type) }],
  };
  renderEntityMappings();
}

function updateEntityField(index, fieldIndex, key, value) {
  const mapping = analyticsEntityMappings[index];
  if (!mapping || !mapping.fields[fieldIndex]) return;
  mapping.fields[fieldIndex][key] = value;
}

function addEntityIdentifier(index) {
  const mapping = analyticsEntityMappings[index];
  const entity = SENTINEL_ENTITY_TYPES.find(e => e.type === mapping?.type);
  if (!mapping || !entity || mapping.fields.length >= 3) return;
  const used = new Set(mapping.fields.map(f => f.identifier));
  const identifier = entity.identifiers.find(id => !used.has(id)) || entity.identifiers[0];
  mapping.fields.push({ identifier, column:'' });
  renderEntityMappings();
}

function removeEntityIdentifier(index, fieldIndex) {
  const mapping = analyticsEntityMappings[index];
  if (!mapping) return;
  mapping.fields.splice(fieldIndex, 1);
  if (!mapping.fields.length) removeEntityMapping(index);
  else renderEntityMappings();
}

function suggestedEntityColumn(type) {
  return ({
    Account:'UserPrincipalName',
    Host:'DeviceName',
    IP:'IPAddress',
    URL:'Url',
    'Azure Resource':'ResourceId',
    'Cloud Application':'ApplicationId',
    'DNS Resolution':'DomainName',
    File:'FileName',
    FileHash:'SHA256',
    Malware:'ThreatName',
    Process:'ProcessCommandLine',
    'Registry Key':'RegistryKey',
    'Registry Value':'RegistryValue',
    'Security Group':'GroupSid',
    Mailbox:'MailboxPrimaryAddress',
    'Mail Cluster':'NetworkMessageId',
    'Mail Message':'NetworkMessageId',
    'Submission Mail':'SubmissionId',
  })[type] || '';
}

function renderEntityMappings() {
  const wrap = document.getElementById('entity-mapping-list');
  const count = document.getElementById('entity-limit');
  if (!wrap) return;
  wrap.innerHTML = analyticsEntityMappings.map((mapping, index) => {
    const entity = SENTINEL_ENTITY_TYPES.find(e => e.type === mapping.type) || SENTINEL_ENTITY_TYPES[0];
    return `
      <div class="entity-map-card">
        <div class="entity-map-head">
          <label>
            <span>Entity type</span>
            <select class="ipt" onchange="changeEntityType(${index}, this.value)">
              ${SENTINEL_ENTITY_TYPES.map(e => `<option value="${esc(e.type)}" ${e.type===mapping.type?'selected':''}>${esc(e.type)}</option>`).join('')}
            </select>
          </label>
          <button class="iconbtn" type="button" title="Remove entity" onclick="removeEntityMapping(${index})">x</button>
        </div>
        <div class="entity-identifier-list">
          ${mapping.fields.map((field, fieldIndex) => `
            <div class="entity-identifier-row">
              <label>
                <span>Identifier</span>
                <select class="ipt" onchange="updateEntityField(${index}, ${fieldIndex}, 'identifier', this.value)">
                  ${entity.identifiers.map(id => `<option value="${esc(id)}" ${id===field.identifier?'selected':''}>${esc(id)}</option>`).join('')}
                </select>
              </label>
              <label>
                <span>Query column</span>
                <input class="ipt" value="${esc(field.column)}" oninput="updateEntityField(${index}, ${fieldIndex}, 'column', this.value)">
              </label>
              <button class="iconbtn" type="button" title="Remove identifier" onclick="removeEntityIdentifier(${index}, ${fieldIndex})">x</button>
            </div>
          `).join('')}
        </div>
        <button class="wizard-link" type="button" ${mapping.fields.length>=3?'disabled':''} onclick="addEntityIdentifier(${index})">+ Add identifier</button>
      </div>
    `;
  }).join('');
  if (count) count.textContent = `${analyticsEntityMappings.length} of 10 entities mapped`;
}

function previewAnalyticsWizardResults() {
  const query = document.getElementById('analytics-rule-query').value;
  const type = currentAnalyticsRuleType();
  if (type.id === 'fusion') {
    document.getElementById('analytics-wizard-results').innerHTML = `
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>Built-in ML correlation</strong>
        <span class="muted">No custom query preview</span>
      </div>
      <p class="muted">Fusion-style behavior analytics rules correlate supported signals and generate incidents from the built-in model. Validate connector coverage and review generated incidents instead of previewing KQL rows.</p>`;
    document.getElementById('analytics-wizard-results').classList.remove('hidden');
    return;
  }
  const table = HUNTING_TABLES.find(t => query.trimStart().startsWith(t)) || 'SigninLogs';
  const where = [...query.matchAll(/\|\s*where\s+([A-Za-z_][A-Za-z0-9_]*)\s*==\s*"([^"]*)"/gi)]
    .map(m => ({ field:m[1], value:m[2] }));
  const rows = where.reduce((acc, f) =>
    acc.filter(r => String(r[f.field] ?? '') === f.value), MOCK_QUERY_RESULTS[table] || []);
  const cols = rows.length ? Object.keys(rows[0]) : ['Result'];
  document.getElementById('analytics-wizard-results').innerHTML = `
    <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
      <strong>${rows.length} preview rows</strong>
      <span class="muted">${esc(table)}</span>
    </div>
    <table class="grid">
      <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="kv">${esc(r[c] ?? '')}</td>`).join('')}</tr>`).join('') || '<tr><td>No matching fixture rows.</td></tr>'}</tbody>
    </table>`;
  document.getElementById('analytics-wizard-results').classList.remove('hidden');
}

// ---------- Defender hunting graph ----------
const HUNTING_GRAPH_STATE_KEY = 'defender-lab.huntingGraph.state';

function emptyHuntingGraphState() {
  return {
    panelOpen:false,
    scenarioId:'',
    inputs:{},
    shortestOnly:true,
    sourceFilter:'any',
    targetFilter:'any',
    edgeFilter:'all',
    resultScenarioId:'',
    selectedNodeId:'',
    error:'',
  };
}

function currentHuntingGraphState() {
  try {
    return { ...emptyHuntingGraphState(), ...JSON.parse(sessionStorage.getItem(HUNTING_GRAPH_STATE_KEY) || '{}') };
  } catch {
    return emptyHuntingGraphState();
  }
}

function saveHuntingGraphState(next) {
  sessionStorage.setItem(HUNTING_GRAPH_STATE_KEY, JSON.stringify({ ...currentHuntingGraphState(), ...next }));
}

function huntingGraphScenario(id = currentHuntingGraphState().scenarioId) {
  return HUNTING_GRAPH_SCENARIOS.find(s => s.id === id) || null;
}

function openHuntingGraphScenarios() {
  saveHuntingGraphState({ panelOpen:true, error:'' });
  render();
}

function closeHuntingGraphScenarios() {
  saveHuntingGraphState({ panelOpen:false, error:'' });
  render();
}

function selectHuntingGraphScenario(id) {
  if (!huntingGraphScenario(id)) return;
  saveHuntingGraphState({
    panelOpen:true,
    scenarioId:id,
    inputs:{},
    resultScenarioId:'',
    selectedNodeId:'',
    error:'',
  });
  render();
}

function setHuntingGraphInput(key, value) {
  const state = currentHuntingGraphState();
  saveHuntingGraphState({ inputs:{ ...state.inputs, [key]:value }, resultScenarioId:'', selectedNodeId:'', error:'' });
  render();
}

function setHuntingGraphFilter(key, value) {
  if (!['shortestOnly','sourceFilter','targetFilter','edgeFilter'].includes(key)) return;
  saveHuntingGraphState({
    [key]:key === 'shortestOnly' ? Boolean(value) : value,
    resultScenarioId:'',
    selectedNodeId:'',
    error:'',
  });
  render();
}

function runHuntingGraphScenario() {
  const state = currentHuntingGraphState();
  const scenario = huntingGraphScenario();
  if (!scenario) {
    saveHuntingGraphState({ panelOpen:true, error:'Select a predefined scenario before running the graph.' });
    render();
    return;
  }
  const missing = scenario.inputs.filter(input => !state.inputs[input.key]);
  if (missing.length) {
    saveHuntingGraphState({ panelOpen:true, error:`Select ${missing.map(i => i.label.toLowerCase()).join(' and ')}.` });
    render();
    return;
  }
  saveHuntingGraphState({
    panelOpen:false,
    resultScenarioId:scenario.id,
    selectedNodeId:'',
    error:'',
  });
  render();
}

function resetHuntingGraph() {
  sessionStorage.setItem(HUNTING_GRAPH_STATE_KEY, JSON.stringify({ ...emptyHuntingGraphState(), panelOpen:true }));
  render();
}

function selectHuntingGraphNode(id) {
  const result = buildHuntingGraphResult();
  if (!result?.nodes.some(node => node.id === id)) return;
  saveHuntingGraphState({ selectedNodeId:id });
  render();
}

function huntingGraphReachableNodes(nodes, edges, attribute, reverse = false) {
  if (attribute === 'any') return new Set(nodes.map(node => node.id));
  const reached = new Set(nodes.filter(node => Boolean(node[attribute])).map(node => node.id));
  let changed = true;
  while (changed) {
    changed = false;
    edges.forEach(edge => {
      const start = reverse ? edge.to : edge.from;
      const end = reverse ? edge.from : edge.to;
      if (reached.has(start) && !reached.has(end)) {
        reached.add(end);
        changed = true;
      }
    });
  }
  return reached;
}

function buildHuntingGraphResult() {
  const state = currentHuntingGraphState();
  const scenario = huntingGraphScenario(state.resultScenarioId);
  if (!scenario || state.resultScenarioId !== state.scenarioId) return null;

  const replacements = {};
  scenario.inputs.forEach(input => {
    if (state.inputs[input.key]) replacements[input.bindNode] = state.inputs[input.key];
  });
  const replaceId = id => replacements[id] || id;
  const entityById = Object.fromEntries(HUNTING_GRAPH_ENTITIES.map(entity => [entity.id, entity]));
  const nodeIds = [...new Set(scenario.nodes.map(replaceId))];
  let nodes = nodeIds.map(id => entityById[id]).filter(Boolean).map(node => ({ ...node }));
  let edges = scenario.edges.map(edge => ({ ...edge, from:replaceId(edge.from), to:replaceId(edge.to) }));

  if (state.shortestOnly) edges = edges.filter(edge => edge.shortest !== false);

  const sourceReachable = huntingGraphReachableNodes(nodes, edges, state.sourceFilter, false);
  const targetReachable = huntingGraphReachableNodes(nodes, edges, state.targetFilter, true);
  edges = edges.filter(edge => sourceReachable.has(edge.from) && sourceReachable.has(edge.to)
    && targetReachable.has(edge.from) && targetReachable.has(edge.to));

  if (state.edgeFilter !== 'all') edges = edges.filter(edge => edge.label === state.edgeFilter);

  const connected = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  nodes = nodes.filter(node => connected.has(node.id));
  return { scenario, nodes, edges };
}

window.currentHuntingGraphState = currentHuntingGraphState;
window.huntingGraphScenario = huntingGraphScenario;
window.buildHuntingGraphResult = buildHuntingGraphResult;
window.openHuntingGraphScenarios = openHuntingGraphScenarios;
window.closeHuntingGraphScenarios = closeHuntingGraphScenarios;
window.selectHuntingGraphScenario = selectHuntingGraphScenario;
window.setHuntingGraphInput = setHuntingGraphInput;
window.setHuntingGraphFilter = setHuntingGraphFilter;
window.runHuntingGraphScenario = runHuntingGraphScenario;
window.resetHuntingGraph = resetHuntingGraph;
window.selectHuntingGraphNode = selectHuntingGraphNode;

// ---------- guided scenarios ----------
let guideState = null;

function startGuidedScenario(id) {
  const scenario = GUIDED_SCENARIOS.find(s => s.id === id);
  if (!scenario) return;
  scenario.steps.forEach(step => { step._actionUsed = false; });
  guideState = { scenario, stepIndex: 0 };
  applyGuideStep();
}

function applyGuideStep() {
  if (!guideState) return;
  const step = guideState.scenario.steps[guideState.stepIndex];
  if (!step) { closeGuide(); return; }
  const routeChanged = step.route && location.hash !== step.route;
  if (routeChanged) {
    hidePanels();
    navigate(step.route);
  }
  setTimeout(renderGuide, routeChanged ? 80 : 0);
}

function runGuideAction(step) {
  if (!step.action) return;
  const [kind, id] = step.action.split(':');
  if (kind === 'openAlert') openAlert(id);
  if (kind === 'openIncident') openIncident(id);
  if (kind === 'openRulePanel') openRulePanel(id || undefined);
  if (kind === 'openCopilotSession') openCopilotSession(id);
}

function renderGuide() {
  if (!guideState) return;
  const panel = document.getElementById('panel-guide');
  const step = guideState.scenario.steps[guideState.stepIndex];
  const count = guideState.scenario.steps.length;
  const atEnd = guideState.stepIndex === count - 1;

  document.querySelectorAll('.guide-focus').forEach(el => el.classList.remove('guide-focus'));
  if (step.target) {
    const target = document.querySelector(step.target);
    if (target) target.classList.add('guide-focus');
  }

  document.getElementById('guide-kicker').textContent =
    `${guideState.scenario.name} · Step ${guideState.stepIndex + 1} of ${count}`;
  document.getElementById('guide-title').textContent = step.title;
  document.getElementById('guide-body').textContent = step.body;
  document.getElementById('btn-guide-prev').disabled = guideState.stepIndex === 0;
  document.getElementById('btn-guide-next').textContent =
    (step.actionLabel && !step._actionUsed) ? step.actionLabel : (atEnd ? 'Finish' : 'Next');
  panel.classList.remove('hidden');
}

function guideNext() {
  if (!guideState) return;
  const step = guideState.scenario.steps[guideState.stepIndex];
  if (step.action && !step._actionUsed) {
    step._actionUsed = true;
    runGuideAction(step);
    renderGuide();
    return;
  }
  if (guideState.stepIndex >= guideState.scenario.steps.length - 1) {
    closeGuide();
    return;
  }
  guideState.stepIndex += 1;
  applyGuideStep();
}

function guidePrev() {
  if (!guideState || guideState.stepIndex === 0) return;
  guideState.stepIndex -= 1;
  applyGuideStep();
}

function closeGuide() {
  guideState = null;
  document.querySelectorAll('.guide-focus').forEach(el => el.classList.remove('guide-focus'));
  document.getElementById('panel-guide').classList.add('hidden');
}

function scheduleGuideRefresh() {
  if (!guideState) return;
  setTimeout(renderGuide, 80);
}

// ---------- Security Copilot ----------
function readCopilotStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCopilotStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function findCopilotPromptIndexForSession(sessionId) {
  if (!sessionId) return -1;
  return COPILOT_PROMPTS.findIndex(p => p.sessionId === sessionId || p.flow === sessionId);
}

function openCopilot(promptIndex = 0) {
  const prompts = document.getElementById('copilot-prompts');
  if (!prompts) return;
  prompts.innerHTML = COPILOT_PROMPTS.map((p, i) => `
    <button class="copilot-prompt ${i === promptIndex ? 'active' : ''}" onclick="selectCopilotPrompt(${i})">
      ${esc(p.title)}
      ${p.sessionId ? `<span class="copilot-prompt-meta">${esc(p.sessionId)}</span>` : ''}
    </button>
  `).join('');
  selectCopilotPrompt(promptIndex);
  showPanel('panel-copilot');
}

function openCopilotSession(sessionId) {
  if (!sessionId) return;
  sessionStorage.setItem('defender-lab.copilot.session.id', sessionId);
  hidePanels();
  navigate('#/ai-agent/session');
}

function openCopilotPromptForSession(sessionId) {
  const promptIndex = Math.max(0, findCopilotPromptIndexForSession(sessionId));
  openCopilot(promptIndex);
}

function selectCopilotPrompt(i) {
  const p = COPILOT_PROMPTS[i] || COPILOT_PROMPTS[0];
  document.querySelectorAll('.copilot-prompt').forEach((btn, idx) =>
    btn.classList.toggle('active', idx === i));
  const sessionId = p.sessionId || COPILOT_AGENTIC_FLOW.sessionId;
  const body = document.getElementById('copilot-answer');
  if (!body) return;
  if (p.flow === 'agentic-investigation') {
    const flow = COPILOT_AGENTIC_FLOW;
    body.innerHTML = `
      <div class="alert-section-title">Prompt</div>
      <div class="copilot-user">${esc(flow.prompt)}</div>
      <div class="alert-section-title">Agent plan</div>
      <ol class="copilot-plan">
        ${flow.plan.map(step => `<li>${esc(step)}</li>`).join('')}
      </ol>
      <div class="alert-section-title">Tool calls</div>
      <div class="copilot-toolcalls">
        ${flow.toolCalls.map(call => `
          <div class="copilot-toolcall">
            <strong>${esc(call.tool)}</strong>
            <span>Input: ${esc(call.input)}</span>
            <em>${esc(call.output)}</em>
          </div>
        `).join('')}
      </div>
      <div class="alert-section-title">Verdict</div>
      <div class="copilot-response">${esc(flow.verdict)}</div>
      <div class="sidepanel-footer">
        <button class="btn btn-primary" onclick="openCopilotSession('${esc(sessionId)}')">Open standalone session</button>
        <button class="btn btn-primary" onclick="openIncidentPage('INC-1042')">Open incident</button>
        <button class="btn btn-secondary" onclick="navigate('#/xdr/cases'); hidePanels();">Open case</button>
      </div>
    `;
    return;
  }
  body.innerHTML = `
    <div class="alert-section-title">Prompt</div>
    <div class="copilot-user">${esc(p.title)}</div>
    <div class="alert-section-title">Answer</div>
    <div class="copilot-response">${esc(p.answer)}</div>
    ${sessionId ? `
      <div class="sidepanel-footer">
        <button class="btn btn-primary" onclick="openCopilotSession('${esc(sessionId)}')">Open standalone session</button>
      </div>
    ` : ''}
  `;
}

function getCopilotSessionState() {
  const id = sessionStorage.getItem('defender-lab.copilot.session.id') || getCopilotSessions()[0]?.id;
  return getCopilotSession(id);
}

function persistCopilotSession(session, transcriptSteps) {
  const sessions = readCopilotStorage('defender-lab.copilot.sessions.custom', []);
  const transcripts = readCopilotStorage('defender-lab.copilot.transcripts.custom', []);
  sessions.unshift(session);
  transcripts.unshift({ sessionId: session.id, steps: transcriptSteps });
  writeCopilotStorage('defender-lab.copilot.sessions.custom', sessions);
  writeCopilotStorage('defender-lab.copilot.transcripts.custom', transcripts);
}

function promptbookPluginSelection(book) {
  const title = `${book.name} ${book.source || ''}`.toLowerCase();
  if (title.includes('email') || title.includes('governance') || title.includes('dlp')) return ['Purview', 'Defender XDR'];
  if (title.includes('vulnerability')) return ['Defender XDR', 'Sentinel'];
  if (title.includes('hunting') || title.includes('threat')) return ['Sentinel', 'Defender Threat Intelligence'];
  return ['Defender XDR'];
}

function runCopilotPromptbook(bookId) {
  const book = getCopilotPromptbooks().find(pb => pb.id === bookId);
  if (!book) return;
  const sessionId = `cs-run-${book.id}-${Date.now().toString(36)}`;
  const steps = [];
  book.prompts.forEach((prompt, index) => {
    const analyst = prompt.replace(/<[^>]+>/g, 'input');
    const copilot = `Canned answer ${index + 1} for ${book.name}: use the lab fixtures and summarize the requested entity or event before deciding on response actions.`;
    steps.push({ role:'analyst', text: analyst, plugin:'none', skill:'Promptbook input', pinned:index === 0 });
    steps.push({ role:'copilot', text: copilot, plugin: promptbookPluginSelection(book)[0], skill:'Promptbook run', pinned:index === 0 });
  });
  persistCopilotSession({
    id: sessionId,
    name: `${book.name} run`,
    owner: 'You',
    workspace: 'Primary',
    lastActivity: new Date().toISOString(),
    promptCount: book.prompts.length,
    plugins: promptbookPluginSelection(book),
    pinned: true,
    generatedFrom: book.id,
  }, steps);
  sessionStorage.setItem('defender-lab.copilot.session.id', sessionId);
  toast(`Ran promptbook ${book.name} and created a canned session.`);
  navigate('#/ai-agent/session');
}

function saveCopilotPromptbook() {
  const name = document.getElementById('copilot-pb-name')?.value.trim();
  const description = document.getElementById('copilot-pb-description')?.value.trim();
  const inputs = (document.getElementById('copilot-pb-inputs')?.value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const prompts = (document.getElementById('copilot-pb-prompts')?.value || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (!name || !prompts.length) {
    toast('Add a name and at least one prompt before saving.');
    return;
  }
  const custom = readCopilotStorage('defender-lab.copilot.promptbooks.custom', []);
  const book = {
    id: `pb-custom-${Date.now().toString(36)}`,
    name,
    source: 'Custom',
    description: description || 'User-created promptbook',
    inputs,
    prompts,
  };
  custom.unshift(book);
  writeCopilotStorage('defender-lab.copilot.promptbooks.custom', custom);
  sessionStorage.setItem('defender-lab.copilot.promptbook.tab', 'Custom');
  sessionStorage.setItem('defender-lab.copilot.promptbook.id', book.id);
  toast(`Saved promptbook ${name}.`);
  render();
}

function selectCopilotPromptbook(id) {
  const book = getCopilotPromptbooks().find(pb => pb.id === id);
  sessionStorage.setItem('defender-lab.copilot.promptbook.id', id);
  if (book?.source) sessionStorage.setItem('defender-lab.copilot.promptbook.tab', book.source);
  render();
}

function toggleCopilotPlugin(id) {
  const enabled = readCopilotStorage('defender-lab.copilot.plugins.enabled', {});
  enabled[id] = !enabled[id];
  writeCopilotStorage('defender-lab.copilot.plugins.enabled', enabled);
  render();
}

function selectCopilotPlugin(id) {
  sessionStorage.setItem('defender-lab.copilot.plugin.id', id);
  render();
}

function updateCopilotSetting(key, value) {
  const settings = readCopilotStorage('defender-lab.copilot.settings', { ...COPILOT_SETTINGS_DEFAULTS });
  settings[key] = value;
  writeCopilotStorage('defender-lab.copilot.settings', settings);
  render();
}

function addCopilotKnowledgeSource(kind) {
  const custom = readCopilotStorage('defender-lab.copilot.knowledge.custom', []);
  const stamp = new Date().toISOString();
  custom.unshift({
    id: `kb-custom-${Date.now().toString(36)}`,
    name: kind === 'search' ? 'Grounding search source' : 'Uploaded file bundle',
    type: kind === 'search' ? 'Azure AI Search index' : 'File upload',
    items: kind === 'search' ? 128 : 1,
    status: kind === 'search' ? 'Ready' : 'Indexing',
    scope: 'Current lab tenant',
    addedBy: 'You',
    createdAt: stamp,
  });
  writeCopilotStorage('defender-lab.copilot.knowledge.custom', custom);
  toast(kind === 'search' ? 'Added a mock Azure AI Search source.' : 'Added a mock file upload source.');
  render();
}

function exportCopilotSession(sessionId) {
  const session = getCopilotSession(sessionId);
  const transcript = getCopilotTranscript(sessionId);
  if (!session) return;
  const payload = {
    session,
    transcript,
  };
  if (!navigator.clipboard?.writeText) {
    toast('Transcript export preview is ready, but clipboard access is not available.');
    return;
  }
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    .then(() => toast('Copied the canned transcript JSON.'))
    .catch(() => toast('Transcript export is available in this browser only as a preview.'));
}

function copyCopilotSessionLink(sessionId) {
  const text = `#/ai-agent/session :: ${sessionId}`;
  if (!navigator.clipboard?.writeText) {
    toast(`Session reference: ${text}`);
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied the local session reference.'))
    .catch(() => toast(`Session reference: ${text}`));
}

function editCopilotPrompt(sessionId) {
  const value = document.getElementById('copilot-prompt-edit')?.value || '';
  sessionStorage.setItem(`defender-lab.copilot.prompt.${sessionId}`, value);
  toast('Saved the prompt draft locally.');
  render();
}

function rerunCopilotPrompt(sessionId) {
  const value = document.getElementById('copilot-prompt-edit')?.value || '';
  sessionStorage.setItem(`defender-lab.copilot.rerun.${sessionId}`, value);
  toast('Queued a canned rerun of the prompt in the lab.');
  render();
}

// ---------- app switcher ----------
// Map Cloud app labels to the workloads navigable in this lab.
const CLOUD_APP_ROUTE = {
  'XDR Security':      '#/xdr/home',
  'Cloud Console':     '#/cloud/overview',
  'Data Governance':   '#/governance/home',
  'SIEM & SOAR':       '#/siem/home',
  'Identity & Access': '#/identity/overview',
  'Workspace Admin':   '#/workspace/home',
};
function renderSwitcher() {
  const grid = document.getElementById('switcher-grid');
  const wl = workloadOf(currentRoute());
  const currentLabel = CLOUD_HIGHLIGHT[wl];
  grid.innerHTML = CLOUD_NAV.map(item => {
    const route = CLOUD_APP_ROUTE[item.label];
    const onclick = route ? ` onclick="navigate('${route}'); hidePanels();"` : '';
    const cur = item.label === currentLabel ? ' current' : '';
    const dim = route ? '' : ' dim';
    return `
      <div class="switcher-tile${cur}${dim}"${onclick}>
        <div class="switcher-icon">${item.icon}</div>
        <span class="switcher-label">${esc(item.label)}</span>
      </div>`;
  }).join('');
}

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    Object.assign(t.style, {
      position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
      background:'#323130', color:'#fff', padding:'10px 16px', fontSize:'13px',
      borderRadius:'2px', zIndex:200, boxShadow:'var(--shadow-2)',
      transition:'opacity 0.4s',
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
}

// ---------- Sentinel automation lab ----------
function grantPlaybookPermissions() {
  localStorage.setItem('defender-lab.sentinel.playbook1Permission', 'granted');
  toast('Granted Sentinel access to RG-Playbooks.');
  render();
}
function resetPlaybookPermissions() {
  localStorage.removeItem('defender-lab.sentinel.playbook1Permission');
  toast('Reset: Playbook1 is grayed out until Sentinel gets resource group access.');
  render();
}
function explainDisabledPlaybook() {
  toast('Playbook1 is grayed out because Sentinel lacks Automation Contributor on RG-Playbooks.');
}
function selectSentinelPlaybook(name) {
  toast(`${name} selected for the Run playbook action.`);
}
function selectAutomationTrigger(value) {
  sessionStorage.setItem('defender-lab.sentinel.rule.trigger', value);
  if (value === 'When alert is created') {
    toast('Alert trigger: only the Run playbook action is available.');
  } else {
    toast(`${value}: incident-level actions (status, severity, owner, tags, tasks) become available.`);
  }
  render();
}
function selectConditionProperty(value) {
  sessionStorage.setItem('defender-lab.sentinel.rule.condProp', value);
  render();
}
function readCreatedRules() {
  try { return JSON.parse(localStorage.getItem('defender-lab.sentinel.rules.created') || '[]'); }
  catch { return []; }
}
function createAutomationRule() {
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const name = val('newRuleName');
  if (!name) { toast('Enter an automation rule name first.'); return; }

  const trigger = sessionStorage.getItem('defender-lab.sentinel.rule.trigger') || 'When incident is created';
  const isAlert = trigger === 'When alert is created';
  // Alert trigger allows only Run playbook, regardless of what the disabled dropdown shows.
  const action = isAlert ? 'Run playbook' : (val('newRuleAction') || 'Run playbook');

  const condProp = isAlert ? 'Analytic rule name' : (val('newRuleCondProp') || 'Incident provider');
  const condOp = val('newRuleCondOp') || 'Equals';
  const condVal = val('newRuleCondValue') || '(any)';
  const condition = `If ${condProp} ${condOp} ${condVal}`;

  const hasPermission = localStorage.getItem('defender-lab.sentinel.playbook1Permission') === 'granted';
  let actions, status;
  if (action === 'Run playbook') {
    const playbook = sessionStorage.getItem('defender-lab.sentinel.playbook.selected') || (hasPermission ? 'Playbook1' : '(not selected)');
    actions = `Run playbook: ${playbook}`;
    // A Run playbook rule can't run until Sentinel has permission on the playbook's resource group.
    status = hasPermission ? 'Enabled' : 'Disabled';
  } else {
    actions = action;
    status = 'Enabled';
  }

  const rules = readCreatedRules();
  rules.push({ name, trigger, condition, actions, status });
  localStorage.setItem('defender-lab.sentinel.rules.created', JSON.stringify(rules));
  toast(`Created "${name}" — ${trigger} · ${condition}`);
  render();
}
function deleteAutomationRule(index) {
  const rules = readCreatedRules();
  const [removed] = rules.splice(index, 1);
  localStorage.setItem('defender-lab.sentinel.rules.created', JSON.stringify(rules));
  toast(removed ? `Deleted "${removed.name}".` : 'Rule deleted.');
  render();
}
function resetCreatedRules() {
  localStorage.removeItem('defender-lab.sentinel.rules.created');
  toast('Cleared all created automation rules.');
  render();
}
// ---------- Entra Conditional Access lab ----------
function selectCaGrant(id) {
  sessionStorage.setItem('defender-lab.entra.ca.grant', id);
  render();
}
function selectCaState(value) {
  sessionStorage.setItem('defender-lab.entra.ca.state', value);
  render();
}
function toggleCaRisk(level) {
  const csv = sessionStorage.getItem('defender-lab.entra.ca.risk');
  const set = new Set((csv === null ? 'High,Medium' : csv).split(',').filter(Boolean));
  if (set.has(level)) set.delete(level); else set.add(level);
  sessionStorage.setItem('defender-lab.entra.ca.risk', [...set].join(','));
  render();
}
function readCaPolicies() {
  try { return JSON.parse(localStorage.getItem('defender-lab.entra.ca.policies.created') || '[]'); }
  catch { return []; }
}
// Persist the name field as the user types so re-renders (toggling risk/grant) don't wipe it.
function setCaName(value) {
  sessionStorage.setItem('defender-lab.entra.ca.name', value);
}
function caGrantIdFromLabel(label) {
  const g = ENTRA_CA_GRANTS.find(x => x.label === label);
  return g ? g.id : '';
}
// Load a policy's values into the blade's working state.
function loadCaWorkingFrom(p) {
  sessionStorage.setItem('defender-lab.entra.ca.name', p.name || '');
  sessionStorage.setItem('defender-lab.entra.ca.grant', caGrantIdFromLabel(p.grant));
  const m = /sign-in risk:\s*(.+)$/i.exec(p.conditions || '');
  const risk = m ? m[1].split(',').map(s => s.trim()).filter(x => ['High', 'Medium', 'Low'].includes(x)).join(',') : '';
  sessionStorage.setItem('defender-lab.entra.ca.risk', risk);
  sessionStorage.setItem('defender-lab.entra.ca.state', p.state || 'On');
}
function selectCaPolicy(source, index) {
  const p = source === 'seed' ? ENTRA_CA_POLICIES[index] : readCaPolicies()[index];
  if (!p) return;
  sessionStorage.setItem('defender-lab.entra.ca.selected', source + ':' + index);
  loadCaWorkingFrom(p);
  render();
}
function newCaPolicy() {
  ['selected', 'name', 'grant', 'risk', 'state'].forEach(k => sessionStorage.removeItem('defender-lab.entra.ca.' + k));
  render();
}
// Build a policy object from the current blade state, or null (with a toast) if invalid.
function buildCaPolicyFromForm() {
  const name = (document.getElementById('caName')?.value || '').trim();
  if (!name) { toast('Enter a policy name first.'); return null; }
  const grantId = sessionStorage.getItem('defender-lab.entra.ca.grant') || '';
  if (!grantId) { toast('Select a grant control first.'); return null; }
  const grant = (ENTRA_CA_GRANTS.find(g => g.id === grantId) || {}).label || 'Grant access';
  const csv = sessionStorage.getItem('defender-lab.entra.ca.risk');
  const risk = (csv === null ? 'High,Medium' : csv).split(',').filter(Boolean);
  const conditions = risk.length ? `Sign-in risk: ${risk.join(', ')}` : 'Sign-in risk: (none selected)';
  const state = sessionStorage.getItem('defender-lab.entra.ca.state') || 'On';
  return { policy: { name, assignment: 'All users (excl. break-glass)', conditions, grant, state }, grantId };
}
function createCaPolicy() {
  const built = buildCaPolicyFromForm();
  if (!built) return;
  const policies = readCaPolicies();
  policies.push(built.policy);
  localStorage.setItem('defender-lab.entra.ca.policies.created', JSON.stringify(policies));
  sessionStorage.setItem('defender-lab.entra.ca.selected', 'created:' + (policies.length - 1));
  if (built.grantId === 'mfa') toast(`Created "${built.policy.name}" — users can self-remediate sign-in risk with MFA.`);
  else toast(`Created "${built.policy.name}" — note: ${built.policy.grant} does not self-remediate sign-in risk.`);
  render();
}
function saveCaPolicy() {
  const ptr = sessionStorage.getItem('defender-lab.entra.ca.selected') || '';
  if (!ptr.startsWith('created:')) { toast('Only created policies can be saved. Use Duplicate as new.'); return; }
  const index = Number(ptr.split(':')[1]);
  const policies = readCaPolicies();
  if (!policies[index]) { toast('Policy not found.'); return; }
  const built = buildCaPolicyFromForm();
  if (!built) return;
  policies[index] = built.policy;
  localStorage.setItem('defender-lab.entra.ca.policies.created', JSON.stringify(policies));
  toast(`Saved "${built.policy.name}".`);
  render();
}
function deleteCaPolicy(index) {
  const policies = readCaPolicies();
  const [removed] = policies.splice(index, 1);
  localStorage.setItem('defender-lab.entra.ca.policies.created', JSON.stringify(policies));
  // If the open policy was deleted or shifted, drop the selection to avoid pointing at the wrong row.
  const ptr = sessionStorage.getItem('defender-lab.entra.ca.selected') || '';
  if (ptr.startsWith('created:')) newCaPolicy();
  toast(removed ? `Deleted "${removed.name}".` : 'Policy deleted.');
  render();
}
function resetCaPolicies() {
  localStorage.removeItem('defender-lab.entra.ca.policies.created');
  toast('Cleared created Conditional Access policies.');
  render();
}
window.selectCaGrant = selectCaGrant;
window.selectCaState = selectCaState;
window.toggleCaRisk = toggleCaRisk;
window.setCaName = setCaName;
window.selectCaPolicy = selectCaPolicy;
window.newCaPolicy = newCaPolicy;
window.createCaPolicy = createCaPolicy;
window.saveCaPolicy = saveCaPolicy;
window.deleteCaPolicy = deleteCaPolicy;
window.resetCaPolicies = resetCaPolicies;

function selectSentinelAutomationPlaybook(name) {
  sessionStorage.setItem('defender-lab.sentinel.playbook.selected', name);
  if (name === 'PB-ContainEntity') {
    sessionStorage.setItem('defender-lab.sentinel.playbook.entity', sentinelEntityPlaybookContext().entityName || sessionStorage.getItem('defender-lab.sentinel.playbook.entity') || '');
  }
  render();
}
window.selectAutomationTrigger = selectAutomationTrigger;
window.selectConditionProperty = selectConditionProperty;
window.createAutomationRule = createAutomationRule;
window.deleteAutomationRule = deleteAutomationRule;
window.resetCreatedRules = resetCreatedRules;
window.grantPlaybookPermissions = grantPlaybookPermissions;
window.resetPlaybookPermissions = resetPlaybookPermissions;
window.explainDisabledPlaybook = explainDisabledPlaybook;
window.selectSentinelPlaybook = selectSentinelPlaybook;
window.selectSentinelAutomationPlaybook = selectSentinelAutomationPlaybook;

// ---------- Sentinel incident graph learning state ----------
const SENTINEL_GRAPH_STATE_KEY = 'defender-lab.sentinel.graph.state';

function defaultSentinelGraphState() {
  return {
    visibleNodeIds:[...SENTINEL_GRAPH.initialNodeIds],
    selectedNodeId:'',
    selectedEdgeKey:'',
    detailTab:'overview',
    filter:'all',
    layout:'relationship',
    grouped:false,
    showBlastList:false,
    completedTasks:[],
    actions:[],
    zoom:null,
    fitZoom:0.8,
    panX:0,
    panY:0,
  };
}

function loadSentinelGraphState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SENTINEL_GRAPH_STATE_KEY) || 'null');
    if (saved && Array.isArray(saved.visibleNodeIds)) {
      return { ...defaultSentinelGraphState(), ...saved };
    }
  } catch {}
  return defaultSentinelGraphState();
}

let sentinelGraphState = loadSentinelGraphState();

function saveSentinelGraphState() {
  sessionStorage.setItem(SENTINEL_GRAPH_STATE_KEY, JSON.stringify(sentinelGraphState));
}

function currentSentinelGraphState() {
  return sentinelGraphState;
}

function completeSentinelGraphTask(taskId) {
  if (!sentinelGraphState.completedTasks.includes(taskId)) {
    sentinelGraphState.completedTasks.push(taskId);
  }
}

function selectSentinelGraphNode(nodeId) {
  const node = SENTINEL_GRAPH.nodes.find(item => item.id === nodeId);
  if (!node) return;
  sentinelGraphState.selectedNodeId = nodeId;
  sentinelGraphState.selectedEdgeKey = '';
  sentinelGraphState.showBlastList = false;
  sentinelGraphState.detailTab = 'overview';
  if (nodeId === SENTINEL_GRAPH.sourceNodeId) completeSentinelGraphTask('inspect-user');
  if (nodeId === 'app-docviewer' || nodeId === 'consent-grant') completeSentinelGraphTask('trace-app');
  saveSentinelGraphState();
  render();
}

function selectSentinelGraphEdge(edgeKey) {
  const edge = SENTINEL_GRAPH.edges.find(item => `${item.from}|${item.to}` === edgeKey);
  if (!edge) return;
  sentinelGraphState.selectedNodeId = '';
  sentinelGraphState.selectedEdgeKey = edgeKey;
  sentinelGraphState.showBlastList = false;
  if (edge.kind === 'attack') completeSentinelGraphTask('trace-app');
  saveSentinelGraphState();
  render();
}

function closeSentinelGraphDetails() {
  sentinelGraphState.selectedNodeId = '';
  sentinelGraphState.selectedEdgeKey = '';
  sentinelGraphState.showBlastList = false;
  saveSentinelGraphState();
  render();
}

function setSentinelGraphDetailTab(tab) {
  sentinelGraphState.detailTab = ['overview','evidence','timeline'].includes(tab) ? tab : 'overview';
  saveSentinelGraphState();
  render();
}

function expandSentinelGraphNode(nodeId) {
  const connected = SENTINEL_GRAPH.edges
    .filter(edge => edge.from === nodeId || edge.to === nodeId)
    .map(edge => edge.from === nodeId ? edge.to : edge.from);
  const visible = new Set(sentinelGraphState.visibleNodeIds);
  const newlyVisible = connected.filter(id => !visible.has(id));
  newlyVisible.forEach(id => visible.add(id));
  sentinelGraphState.visibleNodeIds = [...visible];
  sentinelGraphState.selectedNodeId = nodeId;
  sentinelGraphState.selectedEdgeKey = '';
  if (newlyVisible.some(id => SENTINEL_GRAPH.criticalNodeIds.includes(id))) {
    completeSentinelGraphTask('run-blast');
  }
  saveSentinelGraphState();
  render();
  toast(newlyVisible.length ? `${newlyVisible.length} connected asset${newlyVisible.length === 1 ? '' : 's'} added to the graph.` : 'All connected assets are already visible.');
}

function showSentinelGraphBlastRadius() {
  sentinelGraphState.visibleNodeIds = SENTINEL_GRAPH.nodes.map(node => node.id);
  sentinelGraphState.selectedNodeId = '';
  sentinelGraphState.selectedEdgeKey = '';
  sentinelGraphState.showBlastList = true;
  sentinelGraphState.grouped = false;
  completeSentinelGraphTask('run-blast');
  saveSentinelGraphState();
  render();
}

function setSentinelGraphFilter(filter) {
  sentinelGraphState.filter = filter || 'all';
  sentinelGraphState.selectedNodeId = '';
  sentinelGraphState.selectedEdgeKey = '';
  saveSentinelGraphState();
  render();
}

function toggleSentinelGraphGrouping() {
  sentinelGraphState.grouped = !sentinelGraphState.grouped;
  sentinelGraphState.selectedNodeId = '';
  sentinelGraphState.selectedEdgeKey = '';
  saveSentinelGraphState();
  render();
}

function setSentinelGraphLayout(layout) {
  sentinelGraphState.layout = layout === 'risk' ? 'risk' : 'relationship';
  sentinelGraphState.panX = 0;
  sentinelGraphState.panY = 0;
  sentinelGraphState.zoom = null;
  saveSentinelGraphState();
  render();
}

function sentinelGraphRespond(nodeId, action) {
  const node = SENTINEL_GRAPH.nodes.find(item => item.id === nodeId);
  if (!node) return;
  if (!sentinelGraphState.actions.some(item => item.nodeId === nodeId && item.action === action)) {
    sentinelGraphState.actions.push({ nodeId, action, time:new Date().toISOString() });
  }
  completeSentinelGraphTask('respond');
  saveSentinelGraphState();
  render();
  toast(`${action} recorded for ${node.label} in this lab investigation.`);
}

function resetSentinelGraphLearning() {
  sentinelGraphState = defaultSentinelGraphState();
  saveSentinelGraphState();
  render();
  toast('Incident graph exercise reset.');
}

function applySentinelGraphTransform() {
  const viewport = document.querySelector('[data-sentinel-graph-viewport]');
  const world = document.querySelector('[data-sentinel-graph-world]');
  if (!viewport || !world) return;
  let zoom = sentinelGraphState.zoom;
  if (!Number.isFinite(zoom)) {
    zoom = Math.min(1, Math.max(0.68, (viewport.clientWidth - 24) / 1080));
    sentinelGraphState.fitZoom = zoom;
  }
  world.style.transform = `translate(calc(-50% + ${sentinelGraphState.panX}px), calc(-50% + ${sentinelGraphState.panY}px)) scale(${zoom})`;
  const label = document.querySelector('[data-sentinel-zoom-label]');
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
}

function sentinelGraphZoom(delta) {
  const base = Number.isFinite(sentinelGraphState.zoom) ? sentinelGraphState.zoom : sentinelGraphState.fitZoom;
  sentinelGraphState.zoom = Math.max(0.45, Math.min(1.6, base + delta));
  saveSentinelGraphState();
  applySentinelGraphTransform();
}

function fitSentinelGraph() {
  sentinelGraphState.zoom = null;
  sentinelGraphState.panX = 0;
  sentinelGraphState.panY = 0;
  saveSentinelGraphState();
  applySentinelGraphTransform();
}

function wireSentinelGraphCanvas() {
  const viewport = document.querySelector('[data-sentinel-graph-viewport]');
  if (!viewport) return;
  requestAnimationFrame(applySentinelGraphTransform);
  let drag = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('button, select, a')) return;
    const baseZoom = Number.isFinite(sentinelGraphState.zoom) ? sentinelGraphState.zoom : sentinelGraphState.fitZoom;
    sentinelGraphState.zoom = baseZoom;
    drag = { x:event.clientX, y:event.clientY, panX:sentinelGraphState.panX, panY:sentinelGraphState.panY };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag) return;
    sentinelGraphState.panX = drag.panX + event.clientX - drag.x;
    sentinelGraphState.panY = drag.panY + event.clientY - drag.y;
    applySentinelGraphTransform();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    viewport.classList.remove('dragging');
    saveSentinelGraphState();
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
}

function openSentinelGraphHunt(nodeId) {
  const node = SENTINEL_GRAPH.nodes.find(item => item.id === nodeId);
  const meta = SENTINEL_GRAPH.nodeMeta[nodeId] || {};
  if (!node) return;
  const value = String(node.label).replace(/"/g, '\\"');
  loadSentinelLogsQuery(`${meta.table || 'CloudAppEvents'}\n| where tostring(ActorName) contains "${value}" or tostring(TargetName) contains "${value}"\n| take 50`);
}

window.currentSentinelGraphState = currentSentinelGraphState;
window.selectSentinelGraphNode = selectSentinelGraphNode;
window.selectSentinelGraphEdge = selectSentinelGraphEdge;
window.closeSentinelGraphDetails = closeSentinelGraphDetails;
window.setSentinelGraphDetailTab = setSentinelGraphDetailTab;
window.expandSentinelGraphNode = expandSentinelGraphNode;
window.showSentinelGraphBlastRadius = showSentinelGraphBlastRadius;
window.setSentinelGraphFilter = setSentinelGraphFilter;
window.toggleSentinelGraphGrouping = toggleSentinelGraphGrouping;
window.setSentinelGraphLayout = setSentinelGraphLayout;
window.sentinelGraphRespond = sentinelGraphRespond;
window.resetSentinelGraphLearning = resetSentinelGraphLearning;
window.sentinelGraphZoom = sentinelGraphZoom;
window.fitSentinelGraph = fitSentinelGraph;
window.wireSentinelGraphCanvas = wireSentinelGraphCanvas;
window.openSentinelGraphHunt = openSentinelGraphHunt;

// ---------- wire-up ----------
document.addEventListener('DOMContentLoaded', () => {
  renderSwitcher();
  render();
  initTooltips();

  window.addEventListener('hashchange', render);

  document.getElementById('btn-waffle').addEventListener('click', () => {
    renderSwitcher();
    showPanel('panel-switcher');
  });
  document.getElementById('toggle-azure').addEventListener('click', () => togglePane('azure'));
  document.getElementById('toggle-blade').addEventListener('click', () => togglePane('blade'));
  document.getElementById('btn-copilot').addEventListener('click', () => openCopilot());
  document.getElementById('btn-guide-next').addEventListener('click', guideNext);
  document.getElementById('btn-guide-prev').addEventListener('click', guidePrev);
  document.getElementById('btn-guide-close').addEventListener('click', closeGuide);

  document.getElementById('btn-add-cond').addEventListener('click', () => addConditionRow());
  document.getElementById('btn-save-rule').addEventListener('click', () => {
    const name = document.getElementById('rule-name').value.trim() || 'Untitled rule';
    const conds = readConditions();
    if (conds.length === 0) { toast('Add at least one condition.'); return; }
    rules.push({
      id: 'R' + Date.now(),
      name, scope: 'All devices in organization',
      createdAt: new Date().toISOString(),
      enabled: true,
      conditions: conds,
    });
    saveRules();
    hidePanels();
    render();
    toast(`Saved rule "${name}". ${conds.length} condition${conds.length !== 1 ? 's' : ''} joined with AND.`);
  });

  document.querySelectorAll('[data-close]').forEach(btn =>
    btn.addEventListener('click', hidePanels));
  document.getElementById('scrim').addEventListener('click', hidePanels);

  wireGlobalSearch();
  wireHuntingResults();
});

// ---------- Global topbar search (command-palette-style nav jump) ----------
// Indexes every sidenav route across all workloads plus the workload portal
// roots, then renders an autocomplete dropdown matching the 365
// portal pattern. Substring match on label/route, grouped by workload.
function buildSearchIndex() {
  const idx = [];
  for (const [wl, items] of Object.entries(NAV)) {
    const portal = PORTALS.find(p => p.id === wl);
    const workloadName = portal ? portal.name : wl;
    let section = '';
    for (const item of items) {
      if (item.section) { section = item.section; continue; }
      if (!item.route) continue;
      idx.push({
        label: item.label,
        route: item.route,
        icon: item.icon || '•',
        workload: wl,
        workloadName,
        section,
        haystack: (item.label + ' ' + item.route + ' ' + workloadName + ' ' + section).toLowerCase(),
      });
    }
  }
  // Also surface workload homes so "purview" / "sentinel" jump straight there.
  for (const p of PORTALS) {
    const first = (NAV[p.id] || []).find(it => it.route);
    if (!first) continue;
    idx.push({
      label: p.name + ' — home',
      route: first.route,
      icon: p.initial,
      workload: p.id,
      workloadName: p.name,
      section: 'Workload',
      haystack: (p.name + ' home ' + p.id).toLowerCase(),
    });
  }
  return idx;
}
let SEARCH_INDEX = null;
let searchActiveIndex = -1;
let searchMatches = [];

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function highlightMatch(label, terms) {
  let out = escHtml(label);
  for (const t of terms) {
    if (!t) continue;
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(re, '<mark>$1</mark>');
  }
  return out;
}
function renderSearchDropdown(query) {
  const dd = document.getElementById('global-search-dropdown');
  const q = query.trim().toLowerCase();
  if (!q) { dd.hidden = true; dd.innerHTML = ''; searchMatches = []; searchActiveIndex = -1; return; }
  if (!SEARCH_INDEX) SEARCH_INDEX = buildSearchIndex();
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = SEARCH_INDEX
    .map(item => {
      let score = 0;
      for (const t of terms) {
        if (!item.haystack.includes(t)) return null;
        if (item.label.toLowerCase().startsWith(t)) score += 5;
        if (item.label.toLowerCase().includes(t)) score += 3;
        score += 1;
      }
      return { item, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, 12);
  searchMatches = scored.map(s => s.item);
  searchActiveIndex = searchMatches.length ? 0 : -1;
  if (!searchMatches.length) {
    dd.innerHTML = `<div class="search-dropdown-empty">No matches for "${escHtml(query)}". Try a workload (Sentinel, Purview) or page name (alerts, hunting, DLP).</div>`;
    dd.hidden = false;
    return;
  }
  // Group by workload, preserving sorted order.
  const groups = [];
  const seenWl = new Set();
  for (const item of searchMatches) {
    if (!seenWl.has(item.workload)) {
      seenWl.add(item.workload);
      groups.push({ workload: item.workload, name: item.workloadName, items: [] });
    }
    groups.find(g => g.workload === item.workload).items.push(item);
  }
  let html = '';
  let i = 0;
  for (const g of groups) {
    html += `<div class="search-group-label">${escHtml(g.name)}</div>`;
    for (const item of g.items) {
      const active = i === searchActiveIndex ? ' active' : '';
      const crumb = item.section ? escHtml(item.section) + ' › ' : '';
      html += `
        <button type="button" class="search-result${active}" role="option" data-search-index="${i}" data-route="${escHtml(item.route)}">
          <span class="search-result-icon">${escHtml(item.icon)}</span>
          <span class="search-result-text">
            <span class="search-result-label">${highlightMatch(item.label, terms)}</span>
            <span class="search-result-crumb">${crumb}<span class="search-result-route">${escHtml(item.route)}</span></span>
          </span>
        </button>`;
      i++;
    }
  }
  dd.innerHTML = html;
  dd.hidden = false;
}
function commitSearchSelection(idx) {
  const item = searchMatches[idx];
  if (!item) return;
  const input = document.getElementById('global-search');
  const dd = document.getElementById('global-search-dropdown');
  input.value = '';
  input.blur();
  dd.hidden = true;
  dd.innerHTML = '';
  searchMatches = [];
  searchActiveIndex = -1;
  navigate(item.route);
}
function setSearchActive(idx) {
  const dd = document.getElementById('global-search-dropdown');
  searchActiveIndex = idx;
  dd.querySelectorAll('.search-result').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
    if (i === idx) el.scrollIntoView({ block: 'nearest' });
  });
}
function wireGlobalSearch() {
  const input = document.getElementById('global-search');
  const dd = document.getElementById('global-search-dropdown');
  if (!input || !dd) return;
  input.addEventListener('input', e => renderSearchDropdown(e.target.value));
  input.addEventListener('focus', e => {
    if (e.target.value.trim()) renderSearchDropdown(e.target.value);
  });
  input.addEventListener('keydown', e => {
    if (dd.hidden || !searchMatches.length) {
      if (e.key === 'Escape') { input.value = ''; dd.hidden = true; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchActive((searchActiveIndex + 1) % searchMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchActive((searchActiveIndex - 1 + searchMatches.length) % searchMatches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitSearchSelection(searchActiveIndex >= 0 ? searchActiveIndex : 0);
    } else if (e.key === 'Escape') {
      input.value = ''; dd.hidden = true; searchMatches = []; searchActiveIndex = -1;
    }
  });
  dd.addEventListener('mousedown', e => {
    // Use mousedown so the click registers before the input's blur hides us.
    const btn = e.target.closest('.search-result');
    if (!btn) return;
    e.preventDefault();
    commitSearchSelection(+btn.dataset.searchIndex);
  });
  input.addEventListener('blur', () => {
    // Defer so a click on a result still fires before we hide.
    setTimeout(() => { dd.hidden = true; }, 120);
  });
}

// ---------- Device inventory tabs / discovery ----------
function currentInventoryTab() {
  return sessionStorage.getItem('defender-lab.inventory.tab') || 'computers';
}
// Facet selections: { <group key>: [<checked option>, ...] }.
function currentInventoryFacets() {
  const raw = sessionStorage.getItem('defender-lab.inventory.facets');
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return {};
}
function saveInventoryFacets(facets) {
  sessionStorage.setItem('defender-lab.inventory.facets', JSON.stringify(facets));
  setInventoryPage(1, false); // a new result set always starts at the first page
}
// The inventory runs to hundreds of rows, so it pages like the real portal.
const INVENTORY_PAGE_SIZE = 50;
function currentInventoryPage() {
  const n = Number(sessionStorage.getItem('defender-lab.inventory.page') || 1);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}
function setInventoryPage(page, rerender = true) {
  sessionStorage.setItem('defender-lab.inventory.page', String(Math.max(1, page)));
  if (rerender) render();
}
function currentInventoryRange() {
  return sessionStorage.getItem('defender-lab.inventory.range') || '30 days';
}
function setInventoryRange() {
  const next = INVENTORY_RANGES[(INVENTORY_RANGES.indexOf(currentInventoryRange()) + 1) % INVENTORY_RANGES.length];
  sessionStorage.setItem('defender-lab.inventory.range', next);
  render();
}
function setInventoryTab(tab) {
  sessionStorage.setItem('defender-lab.inventory.tab', tab);
  // Facets from the previous tab may match nothing here (a switch has no Windows 10
  // version), which would read as an empty inventory rather than a tab change.
  // Clear them so a tab always lands on visible rows.
  saveInventoryFacets({});
  if (currentRoute() === 'xdr/devices') render();
}
function toggleInventoryFacet(group, option) {
  const facets = currentInventoryFacets();
  const picked = facets[group] || [];
  facets[group] = picked.includes(option) ? picked.filter(v => v !== option) : [...picked, option];
  saveInventoryFacets(facets);
  render();
  if (!document.getElementById('panel-inventory-filter').classList.contains('hidden')) renderInventoryFilterPanel();
}
// "Select all" is a toggle: checks every option in the group, or clears the group
// if they are already all checked.
function selectAllInventoryFacet(group) {
  const g = INVENTORY_FILTER_GROUPS.find(x => x.key === group);
  const facets = currentInventoryFacets();
  const all = (facets[group] || []).length === g.options.length;
  facets[group] = all ? [] : [...g.options];
  saveInventoryFacets(facets);
  render();
  renderInventoryFilterPanel();
}
function clearInventoryFilters() {
  saveInventoryFacets({});
  render();
  if (!document.getElementById('panel-inventory-filter').classList.contains('hidden')) renderInventoryFilterPanel();
}
function renderInventoryFilterPanel() {
  const facets = currentInventoryFacets();
  const total = Object.values(facets).reduce((n, v) => n + v.length, 0);
  document.getElementById('inventory-filter-body').innerHTML = `
    <p class="muted">Narrow the inventory. Filters within a group match any of the checked values; separate groups must all match.</p>
    ${INVENTORY_FILTER_GROUPS.map(g => {
      const picked = facets[g.key] || [];
      return `
      <div class="filter-group">
        <div class="alert-section-title">${esc(g.icon)} ${esc(g.label)}</div>
        <label class="filter-check">
          <input type="checkbox" ${picked.length === g.options.length ? 'checked' : ''}
                 onchange="selectAllInventoryFacet('${g.key}')">
          <span><strong>Select all</strong></span>
        </label>
        ${g.options.map(o => `
          <label class="filter-check">
            <input type="checkbox" ${picked.includes(o) ? 'checked' : ''}
                   onchange="toggleInventoryFacet('${g.key}','${esc(o)}')">
            <span>${esc(o)}</span>
          </label>`).join('')}
      </div>`;
    }).join('')}
    <div class="filter-actions">
      <button class="btn btn-primary" onclick="hidePanels()">Apply${total ? ` (${total})` : ''}</button>
      <button class="btn btn-secondary" onclick="clearInventoryFilters()">Reset</button>
    </div>
  `;
}
function openInventoryFilters() {
  renderInventoryFilterPanel();
  showPanel('panel-inventory-filter');
}

// Export exactly what the table currently shows — same columns, same filters.
// Cell renderers emit HTML, so strip tags back down to the underlying text.
function exportInventoryCsv() {
  const cols = visibleInventoryColumns();
  const rows = applyInventoryFilters(inventoryRows(currentInventoryTab()), currentInventoryFacets());
  const cell = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const csv = [
    cols.map(c => `"${c.label}"`).join(','),
    ...rows.map(r => cols.map(c => `"${cell(c.render(r)).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `device-inventory-${currentInventoryTab()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${rows.length} device${rows.length === 1 ? '' : 's'} to CSV.`);
}

// Column picker. null = never customized, so the view falls back to each column's
// own default rather than to an empty table.
function currentInventoryColumns() {
  const raw = sessionStorage.getItem('defender-lab.inventory.columns');
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return null;
}
function toggleInventoryColumn(key) {
  const current = currentInventoryColumns() || INVENTORY_COLUMNS.filter(c => c.on).map(c => c.key);
  const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
  sessionStorage.setItem('defender-lab.inventory.columns', JSON.stringify(next));
  render();
  renderInventoryColumnsPanel();
}
function resetInventoryColumns() {
  sessionStorage.removeItem('defender-lab.inventory.columns');
  render();
  renderInventoryColumnsPanel();
}
function renderInventoryColumnsPanel() {
  const visible = visibleInventoryColumns().map(c => c.key);
  document.getElementById('inventory-columns-body').innerHTML = `
    <p class="muted">Pick the columns shown in the device inventory. Device name is always shown.</p>
    <div class="filter-group">
      ${INVENTORY_COLUMNS.map(c => `
        <label class="filter-check ${c.locked ? 'locked' : ''}">
          <input type="checkbox" ${visible.includes(c.key) ? 'checked' : ''} ${c.locked ? 'disabled' : ''}
                 onchange="toggleInventoryColumn('${c.key}')">
          <span>${esc(c.label)}${c.locked ? ' <span class="muted">(always shown)</span>' : ''}</span>
        </label>`).join('')}
    </div>
    <div class="filter-actions">
      <button class="btn btn-primary" onclick="hidePanels()">Apply (${visible.length})</button>
      <button class="btn btn-secondary" onclick="resetInventoryColumns()">Reset to default</button>
    </div>
  `;
}
function openInventoryColumns() {
  renderInventoryColumnsPanel();
  showPanel('panel-inventory-columns');
}
function setDiscoveryMode(mode) {
  DEVICE_DISCOVERY_SETTINGS.mode = mode;
  render();
  toast(mode === 'Standard'
    ? 'Standard discovery selected. Onboarded devices will actively probe unmanaged assets for richer classification.'
    : 'Basic discovery selected. Probing stops — only passively observed devices will be classified.');
}

// Unmanaged assets get their own full page, mirroring how every onboarded device
// has a device page — a side pane isn't enough room to triage an onboarding decision.
function openDiscoveredDevice(id) {
  sessionStorage.setItem('defender-lab.discovered.id', id);
  sessionStorage.setItem('defender-lab.discovered.tab', 'overview');
  hidePanels();
  navigate('#/xdr/discovered-device');
}
function currentDiscoveredDevice() {
  const id = sessionStorage.getItem('defender-lab.discovered.id');
  return DISCOVERED_DEVICES.find(d => d.id === id) || DISCOVERED_DEVICES[0];
}
function currentDiscoveredTab() {
  return sessionStorage.getItem('defender-lab.discovered.tab') || 'overview';
}
function setDiscoveredTab(tab) {
  sessionStorage.setItem('defender-lab.discovered.tab', tab);
  render();
}

// ---------- Defender for Endpoint device pages ----------
function openDevice(id, tab) {
  sessionStorage.setItem('defender-lab.device.id', id);
  sessionStorage.setItem('defender-lab.device.tab', tab || 'overview');
  hidePanels();
  navigate('#/xdr/device');
}
function setDeviceTab(tab) {
  sessionStorage.setItem('defender-lab.device.tab', tab);
  render();
}

// Open the MITRE technique side pane from a Timeline technique marker.
function openTechnique(deviceId, index) {
  const events = (DEVICE_TIMELINE_EVENTS[deviceId] || [])
    .slice().sort((a,b) => new Date(b.time) - new Date(a.time));
  const row = events[index];
  if (!row || row.kind !== 'technique') return;
  const tactic = row.tactic || TECHNIQUE_TACTIC_LOOKUP[row.techniqueId] || 'Unknown tactic';
  const device = DEVICES.find(d => d.id === deviceId) || { name: deviceId };
  // Count underlying event rows on this device that map back to the technique.
  const relatedCount = events.filter(e => e.kind === 'event' && e.techniqueId === row.techniqueId).length;

  document.getElementById('technique-title').textContent =
    `${row.techniqueId} — ${row.techniqueName}`;
  document.getElementById('technique-body').innerHTML = `
    <div class="alert-section-title">Technique information</div>
    <div class="pill-row">
      <span class="tag">${esc(row.techniqueId)}</span>
      <span class="tag">${esc(row.techniqueName)}</span>
      <span class="tag">${esc(tactic)}</span>
      <span class="tag">MITRE ATT&amp;CK</span>
    </div>

    <div class="alert-section-title">Description</div>
    <p class="muted" style="line-height:1.45;">${esc(row.description || 'Technique detected from device telemetry.')}</p>

    <div class="alert-section-title">Observed on</div>
    <dl class="kv-list">
      <dt>Device</dt><dd>${esc(device.name)}</dd>
      <dt>First sighting (this view)</dt><dd>${fmtTime(row.time)}</dd>
      <dt>Underlying events on this device</dt><dd>${relatedCount}</dd>
    </dl>

    <div class="sidepanel-footer">
      <button class="btn btn-primary"
        onclick='huntRelatedEvents(${JSON.stringify({
          deviceId,
          deviceName: device.name,
          techniqueId: row.techniqueId,
          techniqueName: row.techniqueName,
          time: row.time,
        }).replace(/'/g,"&#39;")})'>Hunt for related events</button>
      <button class="btn btn-secondary"
        onclick="navigator.clipboard.writeText('${esc(row.techniqueId)}'); toast('Copied ${esc(row.techniqueId)}.')">Copy technique ID</button>
    </div>

    <div class="callout info" style="margin-top:18px;">
      <strong>What hunting will return:</strong> the underlying endpoint events related to
      <code>${esc(row.techniqueId)}</code> on <code>${esc(device.name)}</code> within a time window
      around the selected event. <em>The Technique marker row itself is not included in the query results.</em>
    </div>
  `;
  showPanel('panel-technique');
}

function responsePanel(title, html) {
  document.getElementById('device-response-title').textContent = title;
  document.getElementById('device-response-body').innerHTML = html;
  showPanel('panel-device-response');
}

function openDeviceLiveResponse(deviceId) {
  const device = DEVICES.find(d => d.id === deviceId) || { name: deviceId };
  const session = DEVICE_LIVE_RESPONSE[deviceId] || {
    operator:'Me',
    started:new Date().toISOString(),
    status:'Ready',
    transcript:[
      { prompt:`connect ${deviceId}`, output:'Session prepared. Select a scoped device with active MDE sensor telemetry.' },
      { prompt:'dir C:\\', output:'Canned lab transcript is not available for this device.' },
    ],
    log:['Session template opened'],
  };
  responsePanel(`Live response - ${device.name}`, `
    <div class="alert-section-title">Session</div>
    <dl class="kv-list">
      <dt>Device</dt><dd>${esc(device.name)}</dd>
      <dt>Status</dt><dd><span class="tag green">${esc(session.status)}</span></dd>
      <dt>Operator</dt><dd>${esc(session.operator)}</dd>
      <dt>Started</dt><dd>${fmtTime(session.started)}</dd>
    </dl>
    <div class="alert-section-title">Lab console transcript</div>
    <div class="response-console">
      ${session.transcript.map(step => `
        <div><span class="console-prompt">LR&gt; ${esc(step.prompt)}</span><pre>${esc(step.output)}</pre></div>
      `).join('')}
    </div>
    <div class="alert-section-title">Session log</div>
    <ul class="response-list">${session.log.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    <div class="callout info">Live response is for scoped investigation commands such as <code>dir</code>, <code>getfile</code>, and approved scripts. This lab transcript is static and never runs commands on the host.</div>
  `);
}

function openInvestigationPackage(deviceId) {
  const device = DEVICES.find(d => d.id === deviceId) || { name: deviceId };
  const pkg = DEVICE_INVESTIGATION_PACKAGES[deviceId] || {
    status:'Ready',
    collected:new Date().toISOString(),
    reason:'Collect host evidence before remediation.',
    contents:['Autoruns','Process list','Network summary','Defender sensor diagnostics'],
    guidance:['Use the package to preserve host-level evidence before rebuild or wipe.'],
  };
  responsePanel(`Investigation package - ${device.name}`, `
    <div class="alert-section-title">Collection flow</div>
    <div class="response-flow">
      <div><strong>1. Request</strong><span>Analyst starts package collection from the device action strip.</span></div>
      <div><strong>2. Collect</strong><span>MDE sensor gathers triage artifacts from the endpoint.</span></div>
      <div><strong>3. Review</strong><span>Analyst downloads the package and correlates contents with Timeline and hunting rows.</span></div>
    </div>
    <dl class="kv-list">
      <dt>Status</dt><dd>${esc(pkg.status)}</dd>
      <dt>Collected</dt><dd>${fmtTime(pkg.collected)}</dd>
      <dt>Use case</dt><dd>${esc(pkg.reason)}</dd>
    </dl>
    <div class="alert-section-title">Package contents</div>
    <ul class="response-list">${pkg.contents.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    <div class="alert-section-title">When to use it</div>
    <ul class="response-list">${pkg.guidance.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
  `);
}

function openDeviceTimelineEvent(deviceId, index) {
  const events = (DEVICE_TIMELINE_EVENTS[deviceId] || [])
    .slice().sort((a,b) => new Date(b.time) - new Date(a.time));
  const row = events[index];
  if (!row || row.kind !== 'event') return;
  const device = DEVICES.find(d => d.id === deviceId) || { name: deviceId };
  const tree = DEVICE_PROCESS_TREES[deviceId] || [];
  responsePanel(`Timeline event - ${device.name}`, `
    <div class="alert-section-title">${esc(row.title || row.actionType || 'Timeline event')}</div>
    <dl class="kv-list">
      <dt>Time</dt><dd>${fmtTime(row.time)}</dd>
      <dt>Table</dt><dd>${esc(row.table || 'DeviceEvents')}</dd>
      <dt>Action type</dt><dd>${esc(row.actionType || 'Event')}</dd>
      <dt>Account</dt><dd>${esc(row.account || '—')}</dd>
      <dt>Command line</dt><dd><code>${esc(row.cmdline || '—')}</code></dd>
      <dt>SHA1 / hash</dt><dd><code>${esc(row.sha256 || 'not present in this fixture')}</code></dd>
    </dl>
    <div class="alert-section-title">Process tree</div>
    <div class="process-tree">
      ${tree.map(p => `
        <div class="process-row depth-${Math.min(p.depth, 3)}">
          <strong>${esc(p.name)}</strong><span>${esc(p.detail)}</span>
        </div>
      `).join('') || '<div class="muted">No process tree captured for this fixture row.</div>'}
    </div>
    <div class="sidepanel-footer">
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${esc(row.cmdline || '')}'); toast('Copied command line.')">Copy command line</button>
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${esc(row.sha256 || '')}'); toast('Copied hash value.')">Copy SHA1</button>
    </div>
  `);
}

// ---------- Defender Vulnerability Management ----------
const TVM_STATE_KEY = 'defender-lab.tvm';
const TVM_PANEL_RECOMMENDATION_KEY = 'defender-lab.tvm.recommendation';
const TVM_PANEL_MODE_KEY = 'defender-lab.tvm.mode';

function currentTvmState() {
  return readStoredJson(TVM_STATE_KEY, { tickets: [], exceptions: [] });
}
function saveTvmState(next) {
  localStorage.setItem(TVM_STATE_KEY, JSON.stringify({ ...currentTvmState(), ...next }));
}
function currentTvmTickets() {
  return currentTvmState().tickets || [];
}
function currentTvmExceptions() {
  return currentTvmState().exceptions || [];
}
function currentTvmRecommendations() {
  const tickets = currentTvmTickets();
  const exceptions = currentTvmExceptions();
  return TVM_RECOMMENDATIONS.map(rec => {
    const ticket = tickets.find(item => item.recommendationId === rec.id);
    const exception = exceptions.find(item => item.recommendationId === rec.id);
    return { ...rec, ticket, exception, status: exception ? 'Exception' : ticket ? ticket.status : rec.status };
  });
}
function currentTvmTracker() {
  const merged = new Map(TVM_REMEDIATION_TRACKER.map(item => [item.recommendationId, { ...item }]));
  for (const ticket of currentTvmTickets()) {
    const existing = merged.get(ticket.recommendationId);
    merged.set(ticket.recommendationId, existing ? { ...existing, ...ticket, id: existing.id } : { ...ticket });
  }
  return [...merged.values()];
}
function currentTvmExceptionsWithDefaults() {
  const merged = new Map(TVM_EXCEPTIONS.map(item => [item.recommendationId, { ...item }]));
  for (const exception of currentTvmExceptions()) {
    const existing = merged.get(exception.recommendationId);
    merged.set(exception.recommendationId, existing ? { ...existing, ...exception, id: existing.id } : { ...exception });
  }
  return [...merged.values()];
}
function currentTvmDeviceVulns(deviceId) {
  return TVM_DEVICE_VULNS[deviceId] || { exposureScore: 0, software: [], vulnerabilities: [], recommendations: [] };
}
function currentTvmRecommendation(id) {
  return currentTvmRecommendations().find(rec => rec.id === id) || TVM_RECOMMENDATIONS[0];
}
function currentTvmSoftware(id) {
  return TVM_SOFTWARE.find(item => item.id === id || item.name === id) || TVM_SOFTWARE[0];
}
function currentTvmCve(id) {
  return TVM_CVES.find(item => item.id === id || item.cve === id) || TVM_CVES[0];
}
function openTvmPanel(title, bodyHtml) {
  document.getElementById('tvm-title').textContent = title;
  document.getElementById('tvm-body').innerHTML = bodyHtml;
  showPanel('panel-tvm');
}
function tvmStatusClass(status) {
  if (status === 'Completed') return 'good';
  if (status === 'Exception' || status === 'Failed') return 'bad';
  if (status === 'Waiting on approval' || status === 'Draft' || status === 'In progress') return 'warn';
  return 'info';
}
function openTvmRecommendation(id) {
  const rec = currentTvmRecommendation(id);
  sessionStorage.setItem(TVM_PANEL_RECOMMENDATION_KEY, rec.id);
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'detail');
  const software = currentTvmSoftware(rec.software);
  const cves = TVM_CVES.filter(cve => cve.software === rec.software);
  const exception = currentTvmExceptionsWithDefaults().find(item => item.recommendationId === rec.id);
  const tracker = currentTvmTracker().filter(item => item.recommendationId === rec.id);
  openTvmPanel(`Recommendation - ${rec.title}`, `
    <div class="alert-section-title">Recommendation summary</div>
    <dl class="tvm-detail-list">
      <dt>Status</dt><dd><span class="tvm-chip ${tvmStatusClass(rec.status)}">${esc(rec.status)}</span></dd>
      <dt>Owner</dt><dd>${esc(rec.owner || 'Unassigned')}</dd>
      <dt>Due</dt><dd>${fmtTime(rec.due)}</dd>
      <dt>Scope</dt><dd>${esc(rec.scope || 'Tenant-wide')}</dd>
      <dt>Handoff</dt><dd>${esc(rec.handoff || 'No handoff note recorded.')}</dd>
    </dl>
    <div class="tvm-tag-row">
      <span class="tag">${esc(rec.software)}</span>
      <span class="tag">${rec.exposedDevices} exposed devices</span>
      <span class="tag">Impact ${rec.impact}</span>
      ${exception ? '<span class="tag orange">Exception in effect</span>' : ''}
      ${tracker.length ? `<span class="tag green">${tracker.length} tracker item${tracker.length === 1 ? '' : 's'}</span>` : ''}
    </div>
    <div class="alert-section-title">Related software</div>
    <p class="muted">${esc(software.name)} ${esc(software.version)} by ${esc(software.vendor)} affects ${software.deviceCount} device group${software.deviceCount === 1 ? '' : 's'} in this lab.</p>
    <div class="alert-section-title">Related CVEs</div>
    <table class="grid tvm-side-table">
      <thead><tr><th>CVE</th><th>Severity</th><th>CVSS</th><th>Exploit</th><th>Affected devices</th></tr></thead>
      <tbody>
        ${cves.map(cve => `
          <tr>
            <td><a class="tvm-soft-link" onclick="openTvmCve('${esc(cve.id)}')">${esc(cve.cve)}</a></td>
            <td><span class="sev ${cve.severity === 'Critical' ? 'high' : cve.severity === 'High' ? 'medium' : 'low'}">${esc(cve.severity)}</span></td>
            <td>${esc(cve.cvss)}</td>
            <td>${cve.exploitAvailable ? '<span class="tvm-chip bad">Exploit available</span>' : '<span class="tvm-chip good">No known exploit</span>'}</td>
            <td>${esc(cve.affectedDevices)}</td>
          </tr>
        `).join('') || '<tr><td colspan="5" class="muted">No CVE detail rows.</td></tr>'}
      </tbody>
    </table>
    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="openTvmRemediationFlow('${esc(rec.id)}')">Request remediation</button>
      <button class="btn btn-secondary" onclick="openTvmExceptionFlow('${esc(rec.id)}')">File exception</button>
    </div>
  `);
}
function openTvmSoftware(id) {
  const software = currentTvmSoftware(id);
  const rec = currentTvmRecommendation(software.recommendationId);
  const cves = TVM_CVES.filter(item => item.software === software.name);
  const deviceVulns = Object.entries(TVM_DEVICE_VULNS)
    .filter(([, item]) => item.software.some(s => s.name === software.name))
    .map(([deviceId, item]) => ({ deviceId, ...item }));
  sessionStorage.setItem(TVM_PANEL_RECOMMENDATION_KEY, rec.id);
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'detail');
  openTvmPanel(`Software - ${software.name}`, `
    <div class="alert-section-title">Software profile</div>
    <dl class="tvm-detail-list">
      <dt>Vendor</dt><dd>${esc(software.vendor)}</dd>
      <dt>Version</dt><dd>${esc(software.version)}</dd>
      <dt>Weaknesses</dt><dd>${esc(software.weaknesses)}</dd>
      <dt>Exposed devices</dt><dd>${esc(software.exposedDevices)}</dd>
      <dt>Threat insight</dt><dd>${esc(software.threatInsight)}</dd>
    </dl>
    <div class="tvm-tag-row">
      <span class="tag">${esc(rec.status)}</span>
      <span class="tag">${software.deviceCount} device group${software.deviceCount === 1 ? '' : 's'}</span>
      <span class="tag">${software.topCves.length} top CVE${software.topCves.length === 1 ? '' : 's'}</span>
    </div>
    <div class="alert-section-title">Top vulnerabilities</div>
    <table class="grid tvm-side-table">
      <thead><tr><th>CVE</th><th>Severity</th><th>CVSS</th><th>Exploit</th><th>Action</th></tr></thead>
      <tbody>
        ${cves.map(cve => `
          <tr>
            <td><a class="tvm-soft-link" onclick="openTvmCve('${esc(cve.id)}')">${esc(cve.cve)}</a></td>
            <td><span class="sev ${cve.severity === 'Critical' ? 'high' : cve.severity === 'High' ? 'medium' : 'low'}">${esc(cve.severity)}</span></td>
            <td>${esc(cve.cvss)}</td>
            <td>${cve.exploitAvailable ? 'Yes' : 'No'}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="openTvmRemediationFlow('${esc(rec.id)}')">Request remediation</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="alert-section-title">Affected devices</div>
    <div class="tvm-pill-list">
      ${deviceVulns.map(item => `<span class="tag">${esc(item.deviceId)} · ${esc(item.exposureScore)} score</span>`).join('')}
    </div>
    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="openTvmRemediationFlow('${esc(rec.id)}')">Request remediation</button>
      <button class="btn btn-secondary" onclick="openTvmExceptionFlow('${esc(rec.id)}')">File exception</button>
    </div>
  `);
}
function openTvmCve(id) {
  const cve = currentTvmCve(id);
  const rec = currentTvmRecommendation(currentTvmSoftware(cve.software).recommendationId);
  const affectedDevices = cve.affectedDevices || [];
  sessionStorage.setItem(TVM_PANEL_RECOMMENDATION_KEY, rec.id);
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'detail');
  openTvmPanel(`CVE - ${cve.cve}`, `
    <div class="alert-section-title">CVE summary</div>
    <dl class="tvm-detail-list">
      <dt>Software</dt><dd>${esc(cve.software)}</dd>
      <dt>Severity</dt><dd><span class="sev ${cve.severity === 'Critical' ? 'high' : cve.severity === 'High' ? 'medium' : 'low'}">${esc(cve.severity)}</span></dd>
      <dt>CVSS</dt><dd>${esc(cve.cvss)}</dd>
      <dt>Exploit available</dt><dd>${cve.exploitAvailable ? 'Yes' : 'No'}</dd>
      <dt>Remediation</dt><dd>${esc(cve.remediation || 'Patch the affected build.')}</dd>
      <dt>Summary</dt><dd>${esc(cve.summary || 'Synthetic CVE detail for SC-200 study.')}</dd>
    </dl>
    <div class="tvm-tag-row">
      <span class="tag">${affectedDevices.length} affected device${affectedDevices.length === 1 ? '' : 's'}</span>
      ${cve.exploitAvailable ? '<span class="tag orange">Exploit available</span>' : '<span class="tag">No public exploit</span>'}
    </div>
    <div class="alert-section-title">Affected devices</div>
    <div class="tvm-pill-list">
      ${affectedDevices.map(device => `<span class="tag">${esc(device)}</span>`).join('')}
    </div>
    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="openTvmRemediationFlow('${esc(rec.id)}')">Request remediation</button>
      <button class="btn btn-secondary" onclick="openTvmExceptionFlow('${esc(rec.id)}')">File exception</button>
    </div>
  `);
}
function openTvmRemediationFlow(id) {
  const rec = currentTvmRecommendation(id);
  sessionStorage.setItem(TVM_PANEL_RECOMMENDATION_KEY, rec.id);
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'remediation');
  openTvmPanel(`Request remediation - ${rec.title}`, `
    <div class="callout info">Create a remediation ticket with a due date and an Intune handoff note. The tracker updates locally and survives refresh.</div>
    <div class="tvm-form-grid">
      <label class="lbl">Ticket title<input class="ipt" id="tvm-rem-title" value="${esc(rec.title)}"></label>
      <div class="tvm-form-grid two">
        <label class="lbl">Owner<input class="ipt" id="tvm-rem-owner" value="${esc(rec.owner || 'Endpoint engineering')}"></label>
        <label class="lbl">Due date<input class="ipt" id="tvm-rem-due" value="${esc(rec.due || '2026-07-12T16:00:00Z')}"></label>
      </div>
      <label class="lbl">Scope<select class="ipt" id="tvm-rem-scope">
        <option ${rec.scope === 'Finance workstation group' ? 'selected' : ''}>Finance workstation group</option>
        <option ${rec.scope === 'Office users' ? 'selected' : ''}>Office users</option>
        <option ${rec.scope === 'Video editors' ? 'selected' : ''}>Video editors</option>
        <option ${rec.scope === 'Finance servers and analysis workstations' ? 'selected' : ''}>Finance servers and analysis workstations</option>
        <option ${rec.scope === 'Domain controllers' ? 'selected' : ''}>Domain controllers</option>
        <option ${rec.scope === 'Audio editing workstations' ? 'selected' : ''}>Audio editing workstations</option>
        <option ${rec.scope === 'Tier 0 servers and priority workstations' ? 'selected' : ''}>Tier 0 servers and priority workstations</option>
        <option ${rec.scope === 'Image processing workstations' ? 'selected' : ''}>Image processing workstations</option>
        <option ${rec.scope === 'Finance file server' ? 'selected' : ''}>Finance file server</option>
      </select></label>
      <label class="lbl">Intune handoff note<textarea class="ipt" id="tvm-rem-handoff" rows="4">${esc(rec.handoff || 'Remediation will be staged through Intune.')}</textarea></label>
    </div>
    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="saveTvmRemediationRequest()">Save remediation ticket</button>
      <button class="btn btn-secondary" data-close="panel-tvm">Cancel</button>
    </div>
  `);
}
function openTvmExceptionFlow(id) {
  const rec = currentTvmRecommendation(id);
  sessionStorage.setItem(TVM_PANEL_RECOMMENDATION_KEY, rec.id);
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'exception');
  openTvmPanel(`File exception - ${rec.title}`, `
    <div class="callout warn">Exceptions keep the recommendation visible but scoped. Use them for short-lived business need, then revisit before expiry.</div>
    <div class="tvm-form-grid">
      <label class="lbl">Justification<textarea class="ipt" id="tvm-exc-justification" rows="4">Business owner accepted the risk while a vendor fix is staged.</textarea></label>
      <div class="tvm-form-grid two">
        <label class="lbl">Scope<select class="ipt" id="tvm-exc-scope">
          <option ${rec.scope === 'Finance workstation group' ? 'selected' : ''}>Finance workstation group</option>
          <option ${rec.scope === 'Finance file server' ? 'selected' : ''}>Finance file server</option>
          <option ${rec.scope === 'Office users' ? 'selected' : ''}>Office users</option>
          <option ${rec.scope === 'Audio editing workstations' ? 'selected' : ''}>Audio editing workstations</option>
          <option ${rec.scope === 'Tier 0 servers and priority workstations' ? 'selected' : ''}>Tier 0 servers and priority workstations</option>
          <option ${rec.scope === 'Finance servers and analysis workstations' ? 'selected' : ''}>Finance servers and analysis workstations</option>
          <option ${rec.scope === 'Image processing workstations' ? 'selected' : ''}>Image processing workstations</option>
          <option ${rec.scope === 'Video editors' ? 'selected' : ''}>Video editors</option>
        </select></label>
        <label class="lbl">Expiry<input class="ipt" id="tvm-exc-expiry" value="${esc(rec.due || '2026-07-31T23:59:00Z')}"></label>
      </div>
    </div>
    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="saveTvmExceptionRequest()">Save exception</button>
      <button class="btn btn-secondary" data-close="panel-tvm">Cancel</button>
    </div>
  `);
}
function saveTvmRemediationRequest() {
  const id = sessionStorage.getItem(TVM_PANEL_RECOMMENDATION_KEY);
  const rec = currentTvmRecommendation(id);
  const state = currentTvmState();
  const ticket = {
    id: `rt-${Date.now()}`,
    recommendationId: rec.id,
    title: document.getElementById('tvm-rem-title')?.value.trim() || rec.title,
    status: 'In progress',
    owner: document.getElementById('tvm-rem-owner')?.value.trim() || rec.owner || 'Endpoint engineering',
    due: document.getElementById('tvm-rem-due')?.value || rec.due,
    scope: document.getElementById('tvm-rem-scope')?.value || rec.scope,
    handoff: document.getElementById('tvm-rem-handoff')?.value.trim() || rec.handoff || '',
    progress: '0%',
    createdAt: new Date().toISOString(),
  };
  saveTvmState({ tickets: [...state.tickets, ticket] });
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'detail');
  hidePanels();
  render();
  toast(`Remediation ticket created for ${rec.title}.`);
}
function saveTvmExceptionRequest() {
  const id = sessionStorage.getItem(TVM_PANEL_RECOMMENDATION_KEY);
  const rec = currentTvmRecommendation(id);
  const state = currentTvmState();
  const exception = {
    id: `ex-${Date.now()}`,
    recommendationId: rec.id,
    title: rec.title,
    justification: document.getElementById('tvm-exc-justification')?.value.trim() || 'Business-approved exception.',
    scope: document.getElementById('tvm-exc-scope')?.value || rec.scope,
    expires: document.getElementById('tvm-exc-expiry')?.value || rec.due,
    owner: 'Me',
    status: 'Approved',
    createdAt: new Date().toISOString(),
  };
  saveTvmState({ exceptions: [...state.exceptions, exception] });
  sessionStorage.setItem(TVM_PANEL_MODE_KEY, 'detail');
  hidePanels();
  render();
  toast(`Exception saved for ${rec.title}.`);
}
function openTvmDeviceTab(deviceId) {
  openDevice(deviceId, 'vulnerabilities');
}

function huntTime(baseIso, seconds) {
  return new Date(new Date(baseIso).getTime() + seconds * 1000).toISOString();
}

function syntheticHuntRows(payload, sourceEvents) {
  const device = DEVICES.find(d => d.id === payload.deviceId) || {};
  const primary = sourceEvents[0] || {};
  const common = {
    DeviceId: payload.deviceId,
    DeviceName: payload.deviceName,
    AccountName: primary.account || device.primaryUser || '',
    AttackTechniques: payload.techniqueId,
    HuntSource: 'Timeline side pane',
  };
  const row = (seconds, sourceTable, actionType, extra) => ({
    Timestamp: huntTime(payload.time, seconds),
    SourceTable: sourceTable,
    ActionType: actionType,
    ...common,
    ...extra,
  });

  const processName = primary.fileName || (payload.deviceId === 'FIN-FS-02' ? 'locker.exe' : 'scanner.exe');
  const processPath = primary.folder || (payload.deviceId === 'FIN-FS-02'
    ? `C:\\ProgramData\\${processName}`
    : `C:\\Users\\Public\\${processName}`);
  const commandLine = primary.cmdline || processName;

  const scenarios = {
    T1036: [
      row(-19, 'DeviceFileEvents', 'FileCreated', {
        FileName: processName, FolderPath: processPath, SHA256: primary.sha256 || ROGUE_HASH,
        AdditionalFields: 'ZoneId=3; OriginalFileName=svchost.exe; Signer=(unsigned)',
      }),
      row(-17, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: processName, FolderPath: processPath, ProcessCommandLine: commandLine,
        InitiatingProcessFileName: 'explorer.exe',
      }),
      row(-13, 'DeviceImageLoadEvents', 'ImageLoaded', {
        FileName: 'amsi.dll', FolderPath: 'C:\\Windows\\System32\\amsi.dll',
        InitiatingProcessFileName: processName,
      }),
      row(-8, 'DeviceRegistryEvents', 'RegistryValueSet', {
        RegistryKey: 'HKCU\\Software\\ExampleOrg\\OS\\CurrentVersion\\Run',
        RegistryValueName: 'OneDrive Update', RegistryValueData: processPath,
      }),
      row(7, 'DeviceNetworkEvents', 'ConnectionSuccess', {
        InitiatingProcessFileName: processName, RemoteIP: '185.199.111.12',
        RemotePort: 443, RemoteUrl: 'cdn-checkin.example',
      }),
    ],
    T1071: [
      row(-10, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: processName, FolderPath: processPath, ProcessCommandLine: commandLine,
        InitiatingProcessFileName: 'explorer.exe',
      }),
      row(-4, 'DeviceNetworkEvents', 'DnsQuery', {
        InitiatingProcessFileName: processName, RemoteUrl: 'cdn-checkin.example',
        AdditionalFields: 'QueryType=A; ResponseCode=NoError',
      }),
      row(0, 'DeviceNetworkEvents', 'ConnectionSuccess', {
        InitiatingProcessFileName: processName, RemoteIP: primary.remoteIP || '185.199.111.12',
        RemotePort: primary.remotePort || 443, RemoteUrl: 'cdn-checkin.example',
      }),
      row(4, 'DeviceNetworkEvents', 'TlsHandshake', {
        InitiatingProcessFileName: processName, RemoteIP: primary.remoteIP || '185.199.111.12',
        RemotePort: 443, AdditionalFields: 'Sni=cdn-checkin.example; JA3=72a589da586844d7f0818ce684948eea',
      }),
    ],
    T1110: [
      row(-7, 'DeviceLogonEvents', 'LogonFailed', {
        LogonType: 'Interactive', FailureReason: 'BadPassword', AccountName: primary.account || 'jdoe',
      }),
      row(-3, 'DeviceLogonEvents', 'LogonFailed', {
        LogonType: 'Interactive', FailureReason: 'BadPassword', AccountName: primary.account || 'jdoe',
      }),
      row(0, 'DeviceLogonEvents', 'LogonSuccess', {
        LogonType: 'Interactive', AccountName: primary.account || 'jdoe',
      }),
      row(9, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: 'cmd.exe', FolderPath: 'C:\\Windows\\System32\\cmd.exe',
        ProcessCommandLine: 'cmd.exe /c whoami && hostname',
      }),
    ],
    T1490: [
      row(-8, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: 'vssadmin.exe', FolderPath: 'C:\\Windows\\System32\\vssadmin.exe',
        ProcessCommandLine: 'vssadmin delete shadows /all /quiet',
      }),
      row(-4, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: 'wmic.exe', FolderPath: 'C:\\Windows\\System32\\wbem\\wmic.exe',
        ProcessCommandLine: 'wmic shadowcopy delete',
      }),
      row(3, 'DeviceEvents', 'RecoveryArtifactDeleted', {
        AdditionalFields: 'DeletedShadowCopies=12; Volume=C:',
      }),
    ],
    T1486: [
      row(-9, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: 'locker.exe', FolderPath: 'C:\\ProgramData\\locker.exe',
        ProcessCommandLine: 'locker.exe --encrypt --shares',
      }),
      row(-1, 'DeviceFileEvents', 'FileRenamed', {
        FileName: 'Q4_forecast.xlsx.locked', FolderPath: 'D:\\Finance\\Q4_forecast.xlsx.locked',
        PreviousFileName: 'Q4_forecast.xlsx',
      }),
      row(5, 'DeviceFileEvents', 'FileCreated', {
        FileName: 'RECOVER-FILES.txt', FolderPath: 'D:\\Finance\\RECOVER-FILES.txt',
      }),
    ],
    T1021: [
      row(-6, 'DeviceLogonEvents', 'LogonSuccess', {
        LogonType: 'RemoteInteractive', RemoteIP: primary.remoteIP || '10.20.7.14',
        RemoteDeviceName: 'WKS-03', Protocol: 'NTLM',
      }),
      row(0, 'DeviceNetworkEvents', 'InboundConnectionAccepted', {
        LocalPort: 3389, RemoteIP: primary.remoteIP || '10.20.7.14',
      }),
      row(8, 'DeviceProcessEvents', 'ProcessCreated', {
        FileName: 'cmd.exe', FolderPath: 'C:\\Windows\\System32\\cmd.exe',
        ProcessCommandLine: 'cmd.exe /c net use',
      }),
    ],
  };

  const rows = scenarios[payload.techniqueId] || sourceEvents.map((e, index) => row(index * 3, e.table || 'DeviceEvents', e.actionType || 'RelatedEvent', {
    FileName: e.fileName || '',
    FolderPath: e.folder || '',
    ProcessCommandLine: e.cmdline || '',
    RemoteIP: e.remoteIP || '',
    RemotePort: e.remotePort || '',
    AdditionalFields: e.description || '',
  }));

  return rows.map((r, index) => ({
    ReportId: `${payload.techniqueId}-${payload.deviceId}-${index + 1}`,
    ...r,
  }));
}

function seedSyntheticHuntRows(payload, sourceEvents) {
  const huntId = `${payload.deviceId}:${payload.techniqueId}:${payload.time}`;
  const generatedRows = syntheticHuntRows(payload, sourceEvents)
    .map(r => ({ ...r, SyntheticHuntId: huntId }));
  MOCK_QUERY_RESULTS.DeviceEvents = (MOCK_QUERY_RESULTS.DeviceEvents || [])
    .filter(r => r.SyntheticHuntId !== huntId)
    .concat(generatedRows);
  return huntId;
}

// Build the prefilled KQL and hand off to Advanced hunting.
function huntRelatedEvents(payload) {
  const ts = payload.time;
  const start = new Date(new Date(ts).getTime() - 30 * 60 * 1000).toISOString();
  const end   = new Date(new Date(ts).getTime() + 30 * 60 * 1000).toISOString();
  const events = (DEVICE_TIMELINE_EVENTS[payload.deviceId] || [])
    .filter(e => e.kind === 'event' && e.techniqueId === payload.techniqueId);
  const huntId = seedSyntheticHuntRows(payload, events);
  const kql =
`// Generated by: Timeline › ${payload.techniqueId} side pane › Hunt for related events
// Scope: device "${payload.deviceName}", technique ${payload.techniqueId} (${payload.techniqueName})
// Note: synthetic lab rows expand the underlying evidence across process, file, registry, network, image-load, and logon telemetry.
// The Technique marker row is NOT included in the query results.
DeviceEvents
| where Timestamp between (datetime(${start}) .. datetime(${end}))
| where DeviceId == "${payload.deviceId}"
| where AttackTechniques has "${payload.techniqueId}"
| where SyntheticHuntId == "${huntId}"
| project Timestamp, SourceTable, DeviceName, ActionType, FileName, FolderPath, ProcessCommandLine, AccountName, RemoteIP, RemoteUrl, RegistryKey, AdditionalFields, AttackTechniques
| sort by Timestamp desc`;
  sessionStorage.setItem('defender-lab.hunting.prefill', kql);
  sessionStorage.setItem('defender-lab.hunting.autorun', '1');
  hidePanels();
  navigate('#/xdr/hunting');
  toast(`Loaded hunt for ${payload.techniqueId} on ${payload.deviceName}.`);
}

// ---------- Advanced hunting: Inspect record ----------
// Selecting a result row opens the record panel; selecting an asset value in a
// row jumps straight to that entity's profile page, as the portal does.
function openInspectRecord(paneId, index) {
  const pane = HUNT_RESULT_PANES[paneId];
  if (!pane || !pane.rows[index]) return;
  document.getElementById('hunt-record-body').innerHTML = huntInspectRecordBody(paneId, index);
  document.querySelectorAll(`[data-hunt-pane="${paneId}"] .hunt-row`).forEach(tr =>
    tr.classList.toggle('selected', Number(tr.dataset.huntRow) === Number(index)));
  showPanel('panel-hunt-record');
}

// Append a filter on the inspected value to the pane's query, the way the
// three-dot menu on a column does in advanced hunting.
function huntAddFilter(paneId, index, col, op) {
  const pane = HUNT_RESULT_PANES[paneId];
  if (!pane || !pane.queryId) { toast('This results pane has no editable query.'); return; }
  const editor = document.getElementById(pane.queryId);
  if (!editor) { toast('Query editor is not on screen.'); return; }
  const raw = pane.rows[index]?.[col];
  if (raw && typeof raw === 'object') { toast('Filter on a scalar column instead of a JSON field.'); return; }
  const literal = (typeof raw === 'number' || typeof raw === 'boolean') ? String(raw) : `"${String(raw ?? '')}"`;
  editor.value = `${editor.value.replace(/\s+$/, '')}\n| where ${col} ${op} ${literal}`;
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  hidePanels();
  toast(`Added filter: where ${col} ${op} ${literal}`);
}

function huntCopyValue(paneId, index, col) {
  const raw = HUNT_RESULT_PANES[paneId]?.rows[index]?.[col];
  const text = raw && typeof raw === 'object' ? JSON.stringify(raw) : String(raw ?? '');
  if (!navigator.clipboard?.writeText) { toast('Clipboard API is not available in this browser session.'); return; }
  navigator.clipboard.writeText(text)
    .then(() => toast(`Copied ${col}.`))
    .catch(() => toast('Clipboard permission was not granted.'));
}

function wireHuntingResults() {
  document.addEventListener('click', event => {
    const entity = event.target.closest('.hunt-entity-link');
    if (entity) {
      // The entity link wins over the row's inspect action.
      event.stopPropagation();
      const id = entity.dataset.huntEntityId;
      if (entity.dataset.huntEntity === 'device') openDevice(id);
      else openIdentity(id);
      return;
    }
    const row = event.target.closest('.hunt-row');
    if (!row) return;
    const pane = row.closest('[data-hunt-pane]');
    if (!pane) return;
    openInspectRecord(pane.dataset.huntPane, Number(row.dataset.huntRow));
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest?.('.hunt-row');
    if (!row) return;
    const pane = row.closest('[data-hunt-pane]');
    if (!pane) return;
    event.preventDefault();
    openInspectRecord(pane.dataset.huntPane, Number(row.dataset.huntRow));
  });
}

// ---------- Defender for Identity ↔ XDR identity pages ----------
function openIdentity(id, tab) {
  sessionStorage.setItem('defender-lab.identity.id', id);
  sessionStorage.setItem('defender-lab.identity.tab', tab || 'overview');
  hidePanels();
  navigate('#/xdr/identity');
}
function setIdentityTab(tab) {
  sessionStorage.setItem('defender-lab.identity.tab', tab);
  render();
}

// Open the classification helper for an identity-timeline alert row.
// Reuses the panel-technique side pane (it's a generic right-side panel).
function openIdentityAlert(identityId, index) {
  const rows = IDENTITY_TIMELINE[identityId] || [];
  const row = rows[index];
  if (!row || row.kind !== 'alert') return;
  const ident = IDENTITIES.find(i => i.id === identityId) || { displayName: identityId };
  const sevCls = row.severity === 'high' ? 'high' : row.severity === 'medium' ? 'medium' : 'info';

  // Defender for Identity alert pages render an "Alert graph" mapping the
  // users/devices/domain controllers involved (per Product documentation). Build the
  // entity set from the identity plus the nearest related event's source/target,
  // then reuse the same renderer the Alerts-queue detail uses.
  const relEvent = rows.find(r => r.kind === 'event' && (r.sourceHost || r.target)) || {};
  const graphAlert = {
    asset: relEvent.target || ident.upn || identityId,
    event: {
      source: relEvent.sourceHost || undefined,
      user: ident.upn || ident.displayName || identityId,
      target: relEvent.target || undefined,
    },
  };
  const verdictTone = {
    'True positive': 'bad',
    'Benign true positive': 'warn',
    'False positive': 'info',
    'Pending': 'info',
  }[row.classification] || 'info';

  document.getElementById('technique-title').textContent =
    `${row.alertId} — ${row.title}`;
  document.getElementById('technique-body').innerHTML = `
    <div class="alert-section-title">Alert</div>
    <dl class="kv-list">
      <dt>ID</dt><dd>${esc(row.alertId)}</dd>
      <dt>Severity</dt><dd><span class="sev ${sevCls}">${cap(row.severity)}</span></dd>
      <dt>Source</dt><dd>${esc(row.source)}</dd>
      <dt>Identity</dt><dd>${esc(ident.displayName)} (${esc(ident.upn || '')})</dd>
      <dt>When</dt><dd>${fmtTime(row.time)}</dd>
    </dl>

    <div class="alert-section-title">Description</div>
    <p class="muted" style="line-height:1.45;">${esc(row.description)}</p>

    ${renderAlertGraph(graphAlert)}

    <div class="alert-section-title">Classification</div>
    <div class="callout ${verdictTone}">
      <strong>${esc(row.classification)}</strong> — ${esc(row.classificationWhy)}
    </div>
    ${row.classifyNote ? `<p class="muted" style="line-height:1.45; margin-top:8px;"><em>${esc(row.classifyNote)}</em></p>` : ''}

    <div class="alert-section-title">Classification choices (Defender XDR)</div>
    <table class="grid" style="font-size:12px;">
      <thead><tr><th>Verdict</th><th>When to pick it</th></tr></thead>
      <tbody>
        <tr><td><span class="sev high">True positive</span></td>
            <td>Real malicious activity confirmed.</td></tr>
        <tr><td><span class="sev medium">Benign true positive</span></td>
            <td>Detection is accurate (the behavior did occur) but the activity is expected — Entra Connect/MSOL_ sync, authorized red-team test, documented break-glass action.</td></tr>
        <tr><td><span class="sev info">False positive</span></td>
            <td>Detection was wrong — the behavior did NOT actually occur.</td></tr>
      </tbody>
    </table>

    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="toast('Marked ${esc(row.classification)} (lab stub).'); hidePanels();">Classify as ${esc(row.classification)}</button>
      <button class="btn btn-secondary" onclick="toast('Open in Defender (lab stub).')">Open alert page</button>
    </div>
  `;
  showPanel('panel-technique');
}

window.openIdentity      = openIdentity;
window.setIdentityTab    = setIdentityTab;
window.openIdentityAlert = openIdentityAlert;

// expose for inline handlers in views.js
window.openDevice        = openDevice;
window.setDeviceTab      = setDeviceTab;
window.setInventoryTab   = setInventoryTab;
window.currentInventoryTab = currentInventoryTab;
window.currentInventoryFacets = currentInventoryFacets;
window.currentInventoryRange = currentInventoryRange;
window.currentInventoryPage = currentInventoryPage;
window.setInventoryPage = setInventoryPage;
window.setDiscoveryMode  = setDiscoveryMode;
window.openDiscoveredDevice = openDiscoveredDevice;
window.currentDiscoveredDevice = currentDiscoveredDevice;
window.currentDiscoveredTab = currentDiscoveredTab;
window.setDiscoveredTab = setDiscoveredTab;
window.toggleInventoryFacet = toggleInventoryFacet;
window.selectAllInventoryFacet = selectAllInventoryFacet;
window.clearInventoryFilters = clearInventoryFilters;
window.openInventoryFilters = openInventoryFilters;
window.setInventoryRange = setInventoryRange;
window.currentInventoryColumns = currentInventoryColumns;
window.toggleInventoryColumn = toggleInventoryColumn;
window.resetInventoryColumns = resetInventoryColumns;
window.openInventoryColumns = openInventoryColumns;
window.exportInventoryCsv = exportInventoryCsv;
window.visibleInventoryColumns = visibleInventoryColumns;
window.openTechnique     = openTechnique;
window.openDeviceLiveResponse = openDeviceLiveResponse;
window.openInvestigationPackage = openInvestigationPackage;
window.openDeviceTimelineEvent = openDeviceTimelineEvent;
window.currentTvmState = currentTvmState;
window.currentTvmTickets = currentTvmTickets;
window.currentTvmExceptions = currentTvmExceptions;
window.currentTvmRecommendations = currentTvmRecommendations;
window.currentTvmTracker = currentTvmTracker;
window.currentTvmExceptionsWithDefaults = currentTvmExceptionsWithDefaults;
window.currentTvmDeviceVulns = currentTvmDeviceVulns;
window.currentTvmRecommendation = currentTvmRecommendation;
window.currentTvmSoftware = currentTvmSoftware;
window.currentTvmCve = currentTvmCve;
window.openTvmPanel = openTvmPanel;
window.openTvmRecommendation = openTvmRecommendation;
window.openTvmSoftware = openTvmSoftware;
window.openTvmCve = openTvmCve;
window.openTvmRemediationFlow = openTvmRemediationFlow;
window.openTvmExceptionFlow = openTvmExceptionFlow;
window.saveTvmRemediationRequest = saveTvmRemediationRequest;
window.saveTvmExceptionRequest = saveTvmExceptionRequest;
window.openTvmDeviceTab = openTvmDeviceTab;
window.huntRelatedEvents = huntRelatedEvents;
window.navigate          = navigate;
window.toggleNavSection  = toggleNavSection;
window.openAlert         = openAlert;
window.openIncident      = openIncident;
window.openIncidentPage  = openIncidentPage;
window.openEntityPivot   = openEntityPivot;
window.setAttackStoryStep = setAttackStoryStep;
window.playAttackStory   = playAttackStory;
window.selectAttackStoryNode = selectAttackStoryNode;
window.openRulePanel     = openRulePanel;
window.deleteRule        = deleteRule;
window.replayScenario    = replayScenario;
window.openSentinelRule  = openSentinelRule;
window.duplicateAnomalyRule = duplicateAnomalyRule;
window.editAnomalyThreshold = editAnomalyThreshold;
window.promoteAnomalyRule = promoteAnomalyRule;
window.deleteAnomalyDuplicate = deleteAnomalyDuplicate;
window.openAnalyticsWizard = openAnalyticsWizard;
window.setAnalyticsWizardStep = setAnalyticsWizardStep;
window.moveAnalyticsWizardStep = moveAnalyticsWizardStep;
window.toggleWizardAccordion = toggleWizardAccordion;
window.previewAnalyticsWizardResults = previewAnalyticsWizardResults;
window.toggleEntityCatalog = toggleEntityCatalog;
window.addEntityMapping = addEntityMapping;
window.removeEntityMapping = removeEntityMapping;
window.changeEntityType = changeEntityType;
window.updateEntityField = updateEntityField;
window.addEntityIdentifier = addEntityIdentifier;
window.removeEntityIdentifier = removeEntityIdentifier;
window.hidePanels        = hidePanels;
window.startGuidedScenario = startGuidedScenario;
window.openCopilot       = openCopilot;
window.selectCopilotPrompt = selectCopilotPrompt;

// ---------- Sentinel connector and DCR labs ----------
const SYSLOG_AMA_STATE_KEY = 'defender-lab.sentinel.syslogAma';
const SENTINEL_INGESTION_STATE_PREFIX = 'defender-lab.sentinel.ingestion.';
const DIAGNOSTIC_SETTINGS_PRACTICE_KEY = 'defender-lab.sentinel.diagnosticSettingsPractice';
function currentSyslogAmaState() {
  const empty = {
    solutionInstalled:false,
    connectorOpened:false,
    dcrCreated:false,
    daemonConfigured:false,
    verified:false,
  };
  const raw = localStorage.getItem(SYSLOG_AMA_STATE_KEY);
  if (!raw) return empty;
  try { return { ...empty, ...JSON.parse(raw) }; }
  catch { return empty; }
}
function saveSyslogAmaState(next) {
  localStorage.setItem(SYSLOG_AMA_STATE_KEY, JSON.stringify({ ...currentSyslogAmaState(), ...next }));
}
function installSentinelSolution(id) {
  if (id !== 'syslog') {
    toast('Solution opened in lab stub.');
    return;
  }
  saveSyslogAmaState({ solutionInstalled:true });
  toast('Syslog solution installed. The Syslog via AMA connector is now available.');
  render();
}
function openSyslogAmaConnector() {
  const state = currentSyslogAmaState();
  if (!state.solutionInstalled) {
    toast('Install the Syslog solution from Content hub first.');
    navigate('#/siem/content-hub');
    return;
  }
  saveSyslogAmaState({ connectorOpened:true });
  toast('Syslog via AMA connector opened. Create the DCR from this connector page.');
  navigate('#/siem/data-connectors');
}
function createSyslogAmaDcr() {
  const state = currentSyslogAmaState();
  if (!state.solutionInstalled || !state.connectorOpened) {
    toast('Open the Syslog via AMA connector after installing the Syslog solution.');
    return;
  }
  saveSyslogAmaState({ dcrCreated:true });
  toast('DCR-Syslog-VM1 created. AMA was deployed to VM1 by the connector workflow.');
  render();
}
function configureSyslogDaemon() {
  if (!currentSyslogAmaState().dcrCreated) {
    toast('Create the DCR and select VM1 before configuring rsyslog.');
    return;
  }
  saveSyslogAmaState({ daemonConfigured:true });
  toast('rsyslog on VM1 configured to receive appliance Syslog on port 514.');
  render();
}
function verifySyslogIngestion() {
  if (!currentSyslogAmaState().daemonConfigured) {
    toast('Configure rsyslog on VM1 before verifying ingestion.');
    return;
  }
  saveSyslogAmaState({ verified:true });
  toast('Syslog rows are arriving from VM1.');
  render();
}
function resetSyslogAmaLab() {
  localStorage.removeItem(SYSLOG_AMA_STATE_KEY);
  toast('Syslog via AMA lab reset.');
  render();
}
function currentDiagnosticSettingsPracticeState() {
  const empty = {
    configured:true,
    lastIngestedDays:21,
    guess:'',
  };
  const raw = localStorage.getItem(DIAGNOSTIC_SETTINGS_PRACTICE_KEY);
  if (!raw) return empty;
  try { return { ...empty, ...JSON.parse(raw) }; }
  catch { return empty; }
}
function saveDiagnosticSettingsPracticeState(next) {
  localStorage.setItem(
    DIAGNOSTIC_SETTINGS_PRACTICE_KEY,
    JSON.stringify({ ...currentDiagnosticSettingsPracticeState(), ...next })
  );
}
function diagnosticSettingsPracticeStatus(state = currentDiagnosticSettingsPracticeState()) {
  if (!state.configured) return 'Not configured';
  return state.lastIngestedDays <= DIAGNOSTIC_SETTINGS_PRACTICE.thresholdDays ? 'Connected' : 'Disconnected';
}
function setDiagnosticSettingsPracticeCase(mode) {
  const next = { guess:'' };
  if (mode === 'fresh') {
    next.configured = true;
    next.lastIngestedDays = 0;
  } else if (mode === 'not-configured') {
    next.configured = false;
    next.lastIngestedDays = null;
  } else {
    next.configured = true;
    next.lastIngestedDays = 21;
  }
  saveDiagnosticSettingsPracticeState(next);
  toast(mode === 'fresh'
    ? 'Fresh ingestion simulated. The connector should read Connected.'
    : mode === 'not-configured'
      ? 'Configuration cleared. The connector should read Not configured.'
      : 'Exam case replayed. The connector should read Disconnected.');
  render();
}
function answerDiagnosticSettingsPractice(answer) {
  const status = diagnosticSettingsPracticeStatus();
  saveDiagnosticSettingsPracticeState({ guess: answer });
  toast(answer === status ? `Correct. The connector status is ${status}.` : `Incorrect. The connector status is ${status}.`);
  render();
}
function emptyIngestionLabState() {
  return {
    solutionInstalled:false,
    connectorOpened:false,
    dcrCreated:false,
    scoped:false,
    daemonConfigured:false,
    policyConfigured:false,
    diagnosticConfigured:false,
    appRegistered:false,
    roleAssigned:false,
    endpointChosen:false,
    streamDeclared:false,
    tableCreated:false,
    verified:false,
  };
}
function ingestionLabById(id) {
  return SENTINEL_INGESTION_LABS.find(l => l.id === id);
}
function currentSentinelIngestionState(id) {
  const empty = emptyIngestionLabState();
  const raw = localStorage.getItem(SENTINEL_INGESTION_STATE_PREFIX + id);
  if (!raw) return empty;
  try { return { ...empty, ...JSON.parse(raw) }; }
  catch { return empty; }
}
function saveSentinelIngestionState(id, next) {
  localStorage.setItem(
    SENTINEL_INGESTION_STATE_PREFIX + id,
    JSON.stringify({ ...currentSentinelIngestionState(id), ...next })
  );
}
function installSentinelIngestionSolution(id) {
  const lab = ingestionLabById(id);
  if (!lab) return;
  saveSentinelIngestionState(id, { solutionInstalled:true });
  toast(`${lab.solution} solution ready. Open the connector next.`);
  render();
}
function openSentinelIngestionConnector(id) {
  const lab = ingestionLabById(id);
  if (!lab) return;
  const state = currentSentinelIngestionState(id);
  if (!state.solutionInstalled && lab.id !== 'azure-activity' && lab.id !== 'custom-logs') {
    toast(`Confirm the ${lab.solution} solution in Content hub first.`);
    navigate('#/siem/content-hub');
    return;
  }
  saveSentinelIngestionState(id, { connectorOpened:true });
  toast(`${lab.connector} connector opened.`);
  navigate('#/siem/data-connectors');
}
function advanceSentinelIngestionLab(id, step) {
  const lab = ingestionLabById(id);
  if (!lab) return;
  const state = currentSentinelIngestionState(id);
  const updates = {};
  const needsConnector = ['dcr', 'scope', 'daemon', 'verify'];
  if (needsConnector.includes(step) && !state.connectorOpened) {
    toast(`Open ${lab.connector} before this step.`);
    return;
  }
  if (step === 'dcr' && !state.solutionInstalled && lab.id !== 'azure-activity' && lab.id !== 'custom-logs') {
    toast(`Confirm the ${lab.solution} solution before creating the DCR.`);
    return;
  }
  if (step === 'scope' && !state.dcrCreated) {
    toast('Create the DCR before scoping events.');
    return;
  }
  if (step === 'daemon' && !state.dcrCreated) {
    toast('Create the DCR before configuring the forwarder.');
    return;
  }
  if (step === 'diagnostic' && !state.policyConfigured) {
    toast('Choose the Azure Policy or diagnostic settings path first.');
    return;
  }
  if (step === 'role' && !state.appRegistered) {
    toast('Create the app registration before assigning the role.');
    return;
  }
  if (step === 'endpoint' && !state.roleAssigned) {
    toast('Assign Monitoring Metrics Publisher before choosing the endpoint.');
    return;
  }
  if (step === 'stream' && !state.endpointChosen) {
    toast('Choose DCE or DCR direct endpoint before declaring streams.');
    return;
  }
  if (step === 'table' && !state.streamDeclared) {
    toast('Declare the stream and transform before creating the _CL table.');
    return;
  }
  if (step === 'verify') {
    const ready = lab.id === 'windows-security'
      ? state.scoped
      : lab.id === 'cef'
        ? state.daemonConfigured
        : lab.id === 'azure-activity'
          ? state.diagnosticConfigured || state.policyConfigured
          : state.tableCreated;
    if (!ready) {
      toast('Complete the ingestion configuration before verifying rows.');
      return;
    }
  }
  const keyByStep = {
    solution:'solutionInstalled',
    connector:'connectorOpened',
    dcr:'dcrCreated',
    scope:'scoped',
    daemon:'daemonConfigured',
    policy:'policyConfigured',
    diagnostic:'diagnosticConfigured',
    app:'appRegistered',
    role:'roleAssigned',
    endpoint:'endpointChosen',
    stream:'streamDeclared',
    table:'tableCreated',
    verify:'verified',
  };
  updates[keyByStep[step] || step] = true;
  saveSentinelIngestionState(id, updates);
  toast(`${lab.title}: ${step === 'verify' ? 'verification rows available' : 'step completed'}.`);
  render();
}
function resetSentinelIngestionLab(id) {
  localStorage.removeItem(SENTINEL_INGESTION_STATE_PREFIX + id);
  toast('Sentinel ingestion lab reset.');
  render();
}

// ---------- Defender for Cloud multicloud onboarding ----------
const DEFENDER_CLOUD_MULTICLOUD_STATE_KEY = 'defender-lab.defender-cloud.multicloud';

function defaultDefenderCloudMulticloudState() {
  const aws = MC_CONNECTORS.find(c => c.cloud === 'AWS') || {};
  const gcp = MC_CONNECTORS.find(c => c.cloud === 'GCP') || {};
  return {
    aws: {
      onboarded: true,
      accountId: aws.accountId || '111122223333',
      regions: ['us-east-1', 'eu-west-1'],
      plans: ['CSPM', 'Servers'],
      health: aws.health || 'Healthy',
      lastSync: aws.lastSync || '2026-06-15T12:00:00Z',
      bootstrap: 'CloudFormation-style stack',
    },
    gcp: {
      onboarded: true,
      projectId: gcp.accountId || 'proj-aaaa1111',
      regions: ['us-central1', 'europe-west3'],
      plans: ['CSPM', 'Containers', 'Databases'],
      health: gcp.health || 'Warning',
      lastSync: gcp.lastSync || '2026-06-14T18:30:00Z',
      bootstrap: 'Cloud Shell bootstrap script',
    },
    fim: {
      enabled: true,
      monitored: [
        '/etc/ssh/sshd_config',
        '/var/log/auth.log',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        'C:\\inetpub\\wwwroot\\web.config',
      ],
      recentChanges: [
        { item:'/etc/ssh/sshd_config', change:'Unexpected allow-list edit', source:'AWS workload' },
        { item:'C:\\Windows\\System32\\drivers\\etc\\hosts', change:'Local name resolution change', source:'GCP VM' },
        { item:'/var/log/auth.log', change:'Burst of failed logons', source:'AWS workload' },
      ],
    },
    jit: {
      enabled: true,
      vm:'i-0b8d41f7c9a2e6f35',
      ports:['3389', '22'],
      duration:'3 hours',
      requestState:'Approved',
      requestor:'cloud-admin@hacksmarterlabs.example',
      note:'Lab-only request surface; no real network access is opened.',
    },
  };
}

function currentDefenderCloudMulticloudState() {
  const fallback = defaultDefenderCloudMulticloudState();
  const raw = localStorage.getItem(DEFENDER_CLOUD_MULTICLOUD_STATE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      aws: { ...fallback.aws, ...(parsed.aws || {}) },
      gcp: { ...fallback.gcp, ...(parsed.gcp || {}) },
      fim: { ...fallback.fim, ...(parsed.fim || {}) },
      jit: { ...fallback.jit, ...(parsed.jit || {}) },
    };
  }
  catch { return fallback; }
}

function saveDefenderCloudMulticloudState(next) {
  localStorage.setItem(
    DEFENDER_CLOUD_MULTICLOUD_STATE_KEY,
    JSON.stringify({
      ...currentDefenderCloudMulticloudState(),
      ...next,
      aws: { ...currentDefenderCloudMulticloudState().aws, ...(next.aws || {}) },
      gcp: { ...currentDefenderCloudMulticloudState().gcp, ...(next.gcp || {}) },
      fim: { ...currentDefenderCloudMulticloudState().fim, ...(next.fim || {}) },
      jit: { ...currentDefenderCloudMulticloudState().jit, ...(next.jit || {}) },
    })
  );
}

function updateDefenderCloudConnector(cloud, patch) {
  const state = currentDefenderCloudMulticloudState();
  if (!state[cloud]) return;
  state[cloud] = { ...state[cloud], ...patch };
  localStorage.setItem(DEFENDER_CLOUD_MULTICLOUD_STATE_KEY, JSON.stringify(state));
  render();
}

function toggleDefenderCloudPlan(cloud, plan) {
  const state = currentDefenderCloudMulticloudState();
  const item = state[cloud];
  if (!item) return;
  const plans = new Set(item.plans || []);
  if (plans.has(plan)) plans.delete(plan);
  else plans.add(plan);
  updateDefenderCloudConnector(cloud, { plans: [...plans] });
}

function advanceDefenderCloudOnboarding(cloud) {
  const item = currentDefenderCloudMulticloudState()[cloud];
  if (!item) return;
  updateDefenderCloudConnector(cloud, {
    onboarded: true,
    health: cloud === 'aws' ? 'Healthy' : 'Warning',
    lastSync: new Date().toISOString(),
  });
  toast(`${cloud.toUpperCase()} connector validated in the lab.`);
}

function toggleDefenderCloudFim() {
  const state = currentDefenderCloudMulticloudState();
  state.fim = { ...state.fim, enabled: !state.fim.enabled };
  localStorage.setItem(DEFENDER_CLOUD_MULTICLOUD_STATE_KEY, JSON.stringify(state));
  toast(`File integrity monitoring ${state.fim.enabled ? 'enabled' : 'disabled'} in the lab.`);
  render();
}

function requestDefenderCloudJitAccess() {
  const state = currentDefenderCloudMulticloudState();
  state.jit = {
    ...state.jit,
    enabled: true,
    requestState: 'Approved',
    requestor: 'cloud-admin@hacksmarterlabs.example',
    approvedAt: new Date().toISOString(),
  };
  localStorage.setItem(DEFENDER_CLOUD_MULTICLOUD_STATE_KEY, JSON.stringify(state));
  toast(`JIT request approved for ${state.jit.vm} in the lab.`);
  render();
}

function resetDefenderCloudMulticloudState() {
  localStorage.removeItem(DEFENDER_CLOUD_MULTICLOUD_STATE_KEY);
  toast('Defender for Cloud multicloud lab reset.');
  render();
}

// ---------- Defender for Cloud: Azure plan setup ----------
// This state is deliberately separate from the AWS/GCP connector wizard. In
// the portal, Azure plan selection is scoped to a subscription (or supported
// workspace), while non-Azure coverage is configured on its cloud connector.
const DEFENDER_CLOUD_SETUP_STATE_KEY = 'defender-lab.defender-cloud.setup';

function defaultDefenderCloudSetupState() {
  return {
    scope: 'Hack-Smarter-Labs-Production',
    scopeType: 'Azure subscription',
    saved: true,
    lastSaved: '2026-08-02T18:45:00Z',
    plans: {
      cspm:       { enabled:false },
      servers:    { enabled:true, tier:'Plan 2', endpointProtection:true, agentlessScanning:true, fim:true },
      containers: { enabled:true, defenderSensor:true, registryAccess:true },
      storage:    { enabled:true, malwareScanning:true, sensitiveData:true },
      databases:  { enabled:false },
      appservice: { enabled:false },
      apis:       { enabled:false },
      ai:         { enabled:false },
    },
  };
}

function currentDefenderCloudSetupState() {
  const fallback = defaultDefenderCloudSetupState();
  try {
    const parsed = JSON.parse(localStorage.getItem(DEFENDER_CLOUD_SETUP_STATE_KEY));
    if (!parsed) return fallback;
    const plans = { ...fallback.plans };
    Object.keys(plans).forEach(id => {
      plans[id] = { ...plans[id], ...((parsed.plans || {})[id] || {}) };
    });
    return { ...fallback, ...parsed, plans };
  }
  catch { return fallback; }
}

function saveDefenderCloudSetupState(state) {
  localStorage.setItem(DEFENDER_CLOUD_SETUP_STATE_KEY, JSON.stringify(state));
}

function setDefenderCloudSetupPlan(id, enabled) {
  const state = currentDefenderCloudSetupState();
  if (!state.plans[id]) return;
  state.plans[id] = { ...state.plans[id], enabled:Boolean(enabled) };
  state.saved = false;
  saveDefenderCloudSetupState(state);
  render();
}

function setDefenderCloudServersTier(tier) {
  const state = currentDefenderCloudSetupState();
  state.plans.servers.tier = tier === 'Plan 1' ? 'Plan 1' : 'Plan 2';
  if (state.plans.servers.tier === 'Plan 1') {
    state.plans.servers.agentlessScanning = false;
    state.plans.servers.fim = false;
  }
  state.saved = false;
  saveDefenderCloudSetupState(state);
  render();
}

function setDefenderCloudSetupFeature(planId, feature, enabled) {
  const state = currentDefenderCloudSetupState();
  if (!state.plans[planId] || !(feature in state.plans[planId])) return;
  state.plans[planId][feature] = Boolean(enabled);
  state.saved = false;
  saveDefenderCloudSetupState(state);
  render();
}

function enableAllDefenderCloudSetupPlans() {
  const state = currentDefenderCloudSetupState();
  Object.values(state.plans).forEach(plan => { plan.enabled = true; });
  state.saved = false;
  saveDefenderCloudSetupState(state);
  toast('All represented plans are selected. Review scope and cost before saving.');
  render();
}

function commitDefenderCloudSetupPlans() {
  const state = currentDefenderCloudSetupState();
  state.saved = true;
  state.lastSaved = new Date().toISOString();
  saveDefenderCloudSetupState(state);
  toast('Defender plan changes saved in this local lab.');
  render();
}

function resetDefenderCloudSetupState() {
  localStorage.removeItem(DEFENDER_CLOUD_SETUP_STATE_KEY);
  toast('Azure Defender plan setup reset.');
  render();
}

// ---------- Defender for Cloud attack paths ----------
// Navigation/filter state is session-only. Recommendation progress persists so
// learners can observe a path move from Pending to In progress to Resolved.
const DEFENDER_CLOUD_ATTACK_PATH_UI_KEY = 'defender-lab.defender-cloud.attack-path-ui';
const DEFENDER_CLOUD_ATTACK_PATH_REMEDIATION_KEY = 'defender-lab.defender-cloud.attack-path-remediation';

function currentDefenderCloudAttackPathUi() {
  const fallback = {
    tab:'overview', selectedId:null, nodeId:null, detailTab:'insights',
    filters:{ risk:'any', asset:'any', status:'any', time:'90' },
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(DEFENDER_CLOUD_ATTACK_PATH_UI_KEY)) || {};
    return { ...fallback, ...saved, filters:{ ...fallback.filters, ...(saved.filters || {}) } };
  } catch { return fallback; }
}

function saveDefenderCloudAttackPathUi(next) {
  sessionStorage.setItem(DEFENDER_CLOUD_ATTACK_PATH_UI_KEY, JSON.stringify(next));
}

function setDefenderCloudAttackPathTab(tab) {
  const ui = currentDefenderCloudAttackPathUi();
  saveDefenderCloudAttackPathUi({ ...ui, tab, selectedId:null, nodeId:null });
  render();
}

function setDefenderCloudAttackPathFilter(field, value) {
  const ui = currentDefenderCloudAttackPathUi();
  saveDefenderCloudAttackPathUi({ ...ui, tab:'list', filters:{ ...ui.filters, [field]:value } });
  render();
}

function openDefenderCloudAttackPath(id) {
  const path = defenderCloudAttackPathById(id);
  if (!path) return;
  const ui = currentDefenderCloudAttackPathUi();
  saveDefenderCloudAttackPathUi({ ...ui, selectedId:id, nodeId:path.nodes[0]?.id || null, detailTab:'insights' });
  render();
  document.getElementById('content')?.scrollTo?.({ top:0, behavior:'auto' });
}

function closeDefenderCloudAttackPath() {
  const ui = currentDefenderCloudAttackPathUi();
  saveDefenderCloudAttackPathUi({ ...ui, selectedId:null, nodeId:null, tab:'list' });
  render();
}

function selectDefenderCloudAttackPathNode(nodeId) {
  const ui = currentDefenderCloudAttackPathUi();
  saveDefenderCloudAttackPathUi({ ...ui, nodeId, detailTab:'insights' });
  render();
}

function setDefenderCloudAttackPathDetailTab(detailTab) {
  const ui = currentDefenderCloudAttackPathUi();
  saveDefenderCloudAttackPathUi({ ...ui, detailTab });
  render();
}

function currentDefenderCloudAttackPathRemediation() {
  try { return JSON.parse(localStorage.getItem(DEFENDER_CLOUD_ATTACK_PATH_REMEDIATION_KEY)) || {}; }
  catch { return {}; }
}

function updateDefenderCloudAttackPathRecommendation(id, status) {
  const state = currentDefenderCloudAttackPathRemediation();
  state[id] = status;
  localStorage.setItem(DEFENDER_CLOUD_ATTACK_PATH_REMEDIATION_KEY, JSON.stringify(state));
  toast(`Recommendation marked ${status.toLowerCase()}.`);
  render();
}

function resetDefenderCloudAttackPathRemediation(pathId) {
  const path = defenderCloudAttackPathById(pathId);
  if (!path) return;
  const state = currentDefenderCloudAttackPathRemediation();
  path.recommendations.forEach(rec => delete state[rec.id]);
  localStorage.setItem(DEFENDER_CLOUD_ATTACK_PATH_REMEDIATION_KEY, JSON.stringify(state));
  toast('Attack path remediation progress reset.');
  render();
}

// ---------- Defender for Cloud security alerts ----------
// Alert status changes survive a refresh so the Dismissed/Resolved filter
// behavior is actually observable. Filters and the open pane are session
// state, so a new tab starts on the unfiltered list.
const DEFENDER_CLOUD_ALERT_STATUS_KEY = 'defender-lab.defender-cloud.alert-status';
const DEFENDER_CLOUD_ALERT_FILTER_KEY = 'defender-lab.defender-cloud.alert-filters';

function currentDefenderCloudAlertStatuses() {
  try { return JSON.parse(localStorage.getItem(DEFENDER_CLOUD_ALERT_STATUS_KEY)) || {}; }
  catch { return {}; }
}

function defenderCloudAlertFilters() {
  const fallback = { severity:'any', status:'any', cloud:'any' };
  try { return { ...fallback, ...(JSON.parse(sessionStorage.getItem(DEFENDER_CLOUD_ALERT_FILTER_KEY)) || {}) }; }
  catch { return fallback; }
}

function setDefenderCloudAlertFilter(field, value) {
  const next = { ...defenderCloudAlertFilters(), [field]: value };
  sessionStorage.setItem(DEFENDER_CLOUD_ALERT_FILTER_KEY, JSON.stringify(next));
  render();
}

function setCloudAlertStatus(id, status) {
  const map = currentDefenderCloudAlertStatuses();
  map[id] = status;
  localStorage.setItem(DEFENDER_CLOUD_ALERT_STATUS_KEY, JSON.stringify(map));
  toast(`Alert status changed to ${status}.`);
  render();
  openCloudAlert(id, sessionStorage.getItem('defender-lab.defender-cloud.alert-tab') || 'action');
}

function openCloudAlert(id, tab) {
  const alert = defenderCloudAlertById(id);
  if (!alert) return;
  sessionStorage.setItem('defender-lab.defender-cloud.alert-id', id);
  sessionStorage.setItem('defender-lab.defender-cloud.alert-tab', tab || 'details');
  document.getElementById('cloud-alert-title').textContent = alert.title;
  document.getElementById('cloud-alert-body').innerHTML = renderCloudAlertDetail(alert, tab || 'details');
  hidePanels();
  showPanel('panel-cloud-alert');
}

function openCloudRecommendation(id, tab) {
  const rec = DEFENDER_CLOUD_RECS.find(item => item.id === id);
  if (!rec) return;
  sessionStorage.setItem('defender-lab.defender-cloud.recommendation-id', id);
  sessionStorage.setItem('defender-lab.defender-cloud.recommendation-tab', tab || 'overview');
  document.getElementById('cloud-recommendation-title').textContent = rec.title;
  document.getElementById('cloud-recommendation-body').innerHTML = renderCloudRecommendationDetail(rec, tab || 'overview');
  hidePanels();
  showPanel('panel-cloud-recommendation');
}

function setCloudRecommendationTab(tab) {
  openCloudRecommendation(sessionStorage.getItem('defender-lab.defender-cloud.recommendation-id'), tab);
}

function openCloudResource(id, tab) {
  const asset = defenderCloudInventoryRows().find(item => item.id === id);
  if (!asset) return;
  sessionStorage.setItem('defender-lab.defender-cloud.resource-id', id);
  sessionStorage.setItem('defender-lab.defender-cloud.resource-tab', tab || 'overview');
  document.getElementById('cloud-resource-title').textContent = `${asset.name} — Resource health`;
  document.getElementById('cloud-resource-body').innerHTML = renderCloudResourceDetail(asset, tab || 'overview');
  hidePanels();
  showPanel('panel-cloud-resource');
}

function setCloudResourceTab(tab) {
  openCloudResource(sessionStorage.getItem('defender-lab.defender-cloud.resource-id'), tab);
}

function openCloudResourceByName(name, tab) {
  const target = String(name || '').toLowerCase();
  const asset = defenderCloudInventoryRows().find(item => cloudAssetKeys(item).includes(target));
  if (!asset) {
    hidePanels();
    navigate('#/cloud/inventory');
    toast(`No inventory asset is mapped to ${name}.`);
    return;
  }
  openCloudResource(asset.id, tab || 'overview');
}

function setCloudAlertTab(tab) {
  openCloudAlert(sessionStorage.getItem('defender-lab.defender-cloud.alert-id'), tab);
}

function openCloudIncident(id) {
  const incident = defenderCloudIncidentById(id);
  if (!incident) return;
  document.getElementById('cloud-incident-title').textContent = incident.name;
  document.getElementById('cloud-incident-body').innerHTML = renderCloudIncidentDetail(incident);
  hidePanels();
  showPanel('panel-cloud-incident');
}
window.currentDefenderCloudAttackPathUi = currentDefenderCloudAttackPathUi;
window.currentDefenderCloudAttackPathRemediation = currentDefenderCloudAttackPathRemediation;
window.setDefenderCloudAttackPathTab = setDefenderCloudAttackPathTab;
window.setDefenderCloudAttackPathFilter = setDefenderCloudAttackPathFilter;
window.openDefenderCloudAttackPath = openDefenderCloudAttackPath;
window.closeDefenderCloudAttackPath = closeDefenderCloudAttackPath;
window.selectDefenderCloudAttackPathNode = selectDefenderCloudAttackPathNode;
window.setDefenderCloudAttackPathDetailTab = setDefenderCloudAttackPathDetailTab;
window.updateDefenderCloudAttackPathRecommendation = updateDefenderCloudAttackPathRecommendation;
window.resetDefenderCloudAttackPathRemediation = resetDefenderCloudAttackPathRemediation;
window.currentDefenderCloudAlertStatuses = currentDefenderCloudAlertStatuses;
window.defenderCloudAlertFilters = defenderCloudAlertFilters;
window.setDefenderCloudAlertFilter = setDefenderCloudAlertFilter;
window.setCloudAlertStatus = setCloudAlertStatus;
window.openCloudAlert = openCloudAlert;
window.setCloudAlertTab = setCloudAlertTab;
window.openCloudIncident = openCloudIncident;
window.openCloudRecommendation = openCloudRecommendation;
window.setCloudRecommendationTab = setCloudRecommendationTab;
window.openCloudResource = openCloudResource;
window.setCloudResourceTab = setCloudResourceTab;
window.openCloudResourceByName = openCloudResourceByName;
window.currentSyslogAmaState = currentSyslogAmaState;
window.installSentinelSolution = installSentinelSolution;
window.openSyslogAmaConnector = openSyslogAmaConnector;
window.createSyslogAmaDcr = createSyslogAmaDcr;
window.configureSyslogDaemon = configureSyslogDaemon;
window.verifySyslogIngestion = verifySyslogIngestion;
window.resetSyslogAmaLab = resetSyslogAmaLab;
window.currentSentinelIngestionState = currentSentinelIngestionState;
window.installSentinelIngestionSolution = installSentinelIngestionSolution;
window.openSentinelIngestionConnector = openSentinelIngestionConnector;
window.advanceSentinelIngestionLab = advanceSentinelIngestionLab;
window.resetSentinelIngestionLab = resetSentinelIngestionLab;
window.currentDiagnosticSettingsPracticeState = currentDiagnosticSettingsPracticeState;
window.diagnosticSettingsPracticeStatus = diagnosticSettingsPracticeStatus;
window.setDiagnosticSettingsPracticeCase = setDiagnosticSettingsPracticeCase;
window.answerDiagnosticSettingsPractice = answerDiagnosticSettingsPractice;
window.resetDiagnosticSettingsPractice = function resetDiagnosticSettingsPractice() {
  localStorage.removeItem(DIAGNOSTIC_SETTINGS_PRACTICE_KEY);
  toast('Diagnostic settings practice reset.');
  render();
};
window.currentDefenderCloudMulticloudState = currentDefenderCloudMulticloudState;
window.toggleDefenderCloudPlan = toggleDefenderCloudPlan;
window.advanceDefenderCloudOnboarding = advanceDefenderCloudOnboarding;
window.toggleDefenderCloudFim = toggleDefenderCloudFim;
window.requestDefenderCloudJitAccess = requestDefenderCloudJitAccess;
window.resetDefenderCloudMulticloudState = resetDefenderCloudMulticloudState;
window.currentDefenderCloudSetupState = currentDefenderCloudSetupState;
window.setDefenderCloudSetupPlan = setDefenderCloudSetupPlan;
window.setDefenderCloudServersTier = setDefenderCloudServersTier;
window.setDefenderCloudSetupFeature = setDefenderCloudSetupFeature;
window.enableAllDefenderCloudSetupPlans = enableAllDefenderCloudSetupPlans;
window.commitDefenderCloudSetupPlans = commitDefenderCloudSetupPlans;
window.resetDefenderCloudSetupState = resetDefenderCloudSetupState;

// ---------- Sentinel hunting bookmarks / livestream / restore jobs ----------
const SENTINEL_HUNTING_TAB_KEY = 'defender-lab.sentinel.hunting.tab';
const SENTINEL_BOOKMARKS_KEY = 'defender-lab.sentinel.bookmarks';
const SENTINEL_LIVESTREAM_KEY = 'defender-lab.sentinel.livestream';
const SENTINEL_RESTORE_JOB_KEY = 'defender-lab.sentinel.restoreJob';
const SENTINEL_ENTITY_PLAYBOOK_KEY = 'defender-lab.sentinel.entity.playbook';
let sentinelLivestreamTimer = null;

function readSentinelJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return { ...fallback, ...JSON.parse(raw) }; }
  catch { return fallback; }
}

function writeSentinelJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function currentSentinelHuntingTab() {
  return sessionStorage.getItem(SENTINEL_HUNTING_TAB_KEY) || 'search';
}

function setSentinelHuntingTab(tab) {
  sessionStorage.setItem(SENTINEL_HUNTING_TAB_KEY, tab);
  render();
}

function currentSentinelBookmarks() {
  return readSentinelJSON(SENTINEL_BOOKMARKS_KEY, { items: [] }).items || [];
}

function saveSentinelBookmarks(items) {
  writeSentinelJSON(SENTINEL_BOOKMARKS_KEY, { items });
}

function bookmarkEntityMapping(row) {
  const mapping = [];
  const pairs = [
    ['Account', row.AccountDisplayName || row.UserPrincipalName || row.TargetUserName],
    ['Source IP', row.SrcIp || row.SrcIpAddr || row.IPAddress || row.SourceIp],
    ['Destination IP', row.DstIp || row.DstIpAddr || row.DestinationIP],
    ['App', row.AppId || row.ApplicationId || row.AppDisplayName],
    ['Domain', row.Domain || row.DnsQuery || row.DstHostname],
  ];
  pairs.forEach(([label, value]) => {
    if (value) mapping.push(`${label}: ${value}`);
  });
  return mapping;
}

function bookmarkTagsForRow(table, row) {
  const tags = new Set();
  if (table === 'CloudAppEvents') tags.add('OAuth');
  if (table === 'SigninLogs') tags.add('Identity');
  if (table === 'NetworkLogs_CL') tags.add('Network');
  if (table === 'ArchiveDns_RST') tags.add('Restore');
  if (row.ThreatIntelMatch) tags.add('Threat intel');
  if (row.RiskLevel === 'High' || row.RiskScore >= 80) tags.add('High');
  if (row.Action === 'Blocked' || row.ResultType === '0') tags.add('Investigation');
  return [...tags];
}

function bookmarkMitreForRow(table, row) {
  if (table === 'CloudAppEvents') return 'T1566';
  if (table === 'SigninLogs') return 'T1078';
  if (table === 'ArchiveDns_RST') return 'T1041';
  if (row.ThreatIntelMatch) return 'T1071';
  return 'T1041';
}

function bookmarkIncidentForRow(table, row) {
  if (table === 'CloudAppEvents') return 'INC-1042';
  if (table === 'SigninLogs' && String(row.UserPrincipalName || '').includes('sam.lee')) return 'INC-1053';
  if (table === 'NetworkLogs_CL') return 'INC-1054';
  if (table === 'ArchiveDns_RST') return 'INC-1054';
  return INCIDENTS[0]?.id || 'INC-1042';
}

function addSentinelBookmarkFromResult(table, queryName, queryText, row) {
  const bookmark = {
    id: 'bm-' + Date.now(),
    createdAt: new Date().toISOString(),
    table,
    queryName,
    query: queryText || SENTINEL_RESTORE_JOB.query,
    entityMapping: bookmarkEntityMapping(row),
    tags: bookmarkTagsForRow(table, row),
    mitre: bookmarkMitreForRow(table, row),
    row: { ...row },
    linkedIncidents: [bookmarkIncidentForRow(table, row)],
    note: row.ThreatIntelMatch || row.Signal || row.ActionType || 'Lab bookmark',
  };
  saveSentinelBookmarks([bookmark, ...currentSentinelBookmarks()]);
  toast(`Saved bookmark for ${bookmark.queryName}.`);
  render();
}

function addSentinelBookmarkFromButton(button, table, queryName, queryText) {
  let row = {};
  try { row = JSON.parse(button?.dataset?.row || '{}'); }
  catch { row = {}; }
  addSentinelBookmarkFromResult(table, queryName, queryText, row);
}

function addBookmarkToExistingIncident(bookmarkId, incidentId) {
  const items = currentSentinelBookmarks().map(item => item.id === bookmarkId
    ? { ...item, linkedIncidents: Array.from(new Set([...(item.linkedIncidents || []), incidentId])) }
    : item);
  saveSentinelBookmarks(items);
  toast(`Bookmark linked to incident ${incidentId}.`);
  render();
}

function promoteSentinelBookmark(bookmarkId) {
  const items = currentSentinelBookmarks();
  const item = items.find(entry => entry.id === bookmarkId);
  if (!item) return;
  const incidentId = 'INC-BM-' + String(Date.now()).slice(-4);
  if (!INCIDENTS.some(incident => incident.id === incidentId)) {
    INCIDENTS.unshift({
      id: incidentId,
      severity: item.tags.includes('High') ? 'high' : 'medium',
      title: `Bookmark promoted: ${item.queryName}`,
      status: 'New',
      assignedTo: 'Unassigned',
      classification: '',
      tactics: [item.mitre === 'T1566' ? 'Initial Access' : 'Discovery'],
      alertIds: [],
      entities: item.entityMapping.slice(0, 3).map(text => {
        const [type, value] = text.split(':').map(s => s.trim());
        return { type, name: value };
      }),
      createdAt: new Date().toISOString(),
      alertCount: 0,
      summary: `Created from a hunting bookmark on ${item.table}.`,
    });
  }
  saveSentinelBookmarks(items.map(entry => entry.id === bookmarkId
    ? { ...entry, promotedIncidentId: incidentId, linkedIncidents: Array.from(new Set([...(entry.linkedIncidents || []), incidentId])) }
    : entry));
  toast(`Promoted bookmark to incident ${incidentId}.`);
  render();
}

function currentSentinelLivestreamState() {
  return readSentinelJSON(SENTINEL_LIVESTREAM_KEY, {
    status: 'idle',
    cursor: 0,
    rows: [],
    startedAt: '',
    updatedAt: '',
    elevated: false,
    alertStub: null,
  });
}

function saveSentinelLivestreamState(next) {
  writeSentinelJSON(SENTINEL_LIVESTREAM_KEY, { ...currentSentinelLivestreamState(), ...next });
}

function clearSentinelLivestreamTimer() {
  if (sentinelLivestreamTimer) {
    clearInterval(sentinelLivestreamTimer);
    sentinelLivestreamTimer = null;
  }
}

function stepSentinelLivestream() {
  const state = currentSentinelLivestreamState();
  if (state.status !== 'running') return;
  if (state.cursor >= SENTINEL_LIVESTREAM_ROWS.length) {
    saveSentinelLivestreamState({ status: 'complete', updatedAt: new Date().toISOString() });
    clearSentinelLivestreamTimer();
    render();
    toast('Livestream finished.');
    return;
  }
  const nextRow = SENTINEL_LIVESTREAM_ROWS[state.cursor];
  saveSentinelLivestreamState({
    rows: [...state.rows, nextRow],
    cursor: state.cursor + 1,
    updatedAt: new Date().toISOString(),
  });
  render();
  if (state.cursor + 1 >= SENTINEL_LIVESTREAM_ROWS.length) {
    saveSentinelLivestreamState({ status: 'complete' });
    clearSentinelLivestreamTimer();
    toast('Livestream finished.');
  }
}

function startSentinelLivestream() {
  const state = currentSentinelLivestreamState();
  const reset = state.status === 'stopped' || state.cursor >= SENTINEL_LIVESTREAM_ROWS.length;
  saveSentinelLivestreamState({
    status: 'running',
    cursor: reset ? 0 : state.cursor,
    rows: reset ? [] : state.rows,
    startedAt: state.startedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  clearSentinelLivestreamTimer();
  stepSentinelLivestream();
  sentinelLivestreamTimer = setInterval(stepSentinelLivestream, 1600);
  render();
}

function pauseSentinelLivestream() {
  const state = currentSentinelLivestreamState();
  if (state.status !== 'running') return;
  saveSentinelLivestreamState({ status: 'paused', updatedAt: new Date().toISOString() });
  clearSentinelLivestreamTimer();
  toast('Livestream paused.');
  render();
}

function stopSentinelLivestream() {
  saveSentinelLivestreamState({ status: 'stopped', updatedAt: new Date().toISOString() });
  clearSentinelLivestreamTimer();
  toast('Livestream stopped.');
  render();
}

function elevateSentinelLivestreamToAlert() {
  const state = currentSentinelLivestreamState();
  const stub = {
    name: 'Livestreamed sign-in and app activity',
    severity: 'High',
    tactics: ['Initial Access', 'Credential Access'],
    query: SENTINEL_LIVESTREAM_QUERY,
    rows: state.rows.length,
    source: 'Hunting livestream',
  };
  saveSentinelLivestreamState({ elevated: true, alertStub: stub, updatedAt: new Date().toISOString() });
  writeSentinelJSON('defender-lab.sentinel.livestream.rule', stub);
  toast('Analytics rule stub created from the livestream.');
  render();
}

function currentSentinelRestoreJob() {
  return readSentinelJSON(SENTINEL_RESTORE_JOB_KEY, {
    status: 'idle',
    startedAt: '',
    completedAt: '',
    pendingCompleteAt: 0,
    sourceTable: SENTINEL_RESTORE_JOB.sourceTable,
    resultTable: SENTINEL_RESTORE_JOB.resultTable,
  });
}

function saveSentinelRestoreJob(next) {
  writeSentinelJSON(SENTINEL_RESTORE_JOB_KEY, { ...currentSentinelRestoreJob(), ...next });
}

function finalizeSentinelRestoreJobIfReady() {
  const state = currentSentinelRestoreJob();
  if (state.status !== 'running') return;
  if (!state.pendingCompleteAt || Date.now() < state.pendingCompleteAt) return;
  saveSentinelRestoreJob({ status: 'complete', completedAt: new Date().toISOString(), pendingCompleteAt: 0 });
}

function runSentinelRestoreJob() {
  saveSentinelRestoreJob({
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: '',
    pendingCompleteAt: Date.now() + 1200,
  });
  toast(`Restore job queued for ${SENTINEL_RESTORE_JOB.sourceTable}.`);
  render();
  setTimeout(() => {
    finalizeSentinelRestoreJobIfReady();
    if (currentSentinelRestoreJob().status === 'running') {
      saveSentinelRestoreJob({ status: 'complete', completedAt: new Date().toISOString(), pendingCompleteAt: 0 });
    }
    toast(`Restore job complete. ${SENTINEL_RESTORE_JOB.resultTable} is available for logs queries.`);
    render();
  }, 1300);
}

function runSentinelEntityPlaybook(entityName, source) {
  writeSentinelJSON(SENTINEL_ENTITY_PLAYBOOK_KEY, {
    entityName,
    source,
    playbookId: 'PB-ContainEntity',
  });
  sessionStorage.setItem('defender-lab.sentinel.playbook.selected', 'PB-ContainEntity');
  sessionStorage.setItem('defender-lab.sentinel.playbook.entity', entityName);
  toast(`Loaded PB-ContainEntity for ${entityName}.`);
  navigate('#/siem/automation');
}

function sentinelEntityPlaybookContext() {
  return readSentinelJSON(SENTINEL_ENTITY_PLAYBOOK_KEY, {
    entityName: '',
    source: '',
    playbookId: 'PB-ContainEntity',
  });
}

window.setSentinelHuntingTab = setSentinelHuntingTab;
window.addSentinelBookmarkFromButton = addSentinelBookmarkFromButton;
window.addSentinelBookmarkFromResult = addSentinelBookmarkFromResult;
window.addBookmarkToExistingIncident = addBookmarkToExistingIncident;
window.promoteSentinelBookmark = promoteSentinelBookmark;
window.currentSentinelBookmarks = currentSentinelBookmarks;
window.currentSentinelLivestreamState = currentSentinelLivestreamState;
window.startSentinelLivestream = startSentinelLivestream;
window.pauseSentinelLivestream = pauseSentinelLivestream;
window.stopSentinelLivestream = stopSentinelLivestream;
window.elevateSentinelLivestreamToAlert = elevateSentinelLivestreamToAlert;
window.currentSentinelRestoreJob = currentSentinelRestoreJob;
window.runSentinelRestoreJob = runSentinelRestoreJob;
window.sentinelEntityPlaybookContext = sentinelEntityPlaybookContext;
window.runSentinelEntityPlaybook = runSentinelEntityPlaybook;
window.finalizeSentinelRestoreJobIfReady = finalizeSentinelRestoreJobIfReady;

// ---------- Sentinel search jobs ----------
function runSentinelSearchJob() {
  localStorage.setItem('defender-lab.sentinel.networklogs.searchJob', 'complete');
  toast('Search job completed. Retained Basic table rows are available for analysis.');
  render();
}
window.runSentinelSearchJob = runSentinelSearchJob;

function runSentinelDataLakeJob() {
  localStorage.setItem('defender-lab.sentinel.dataLakeJob', 'complete');
  toast('Data lake KQL job completed. Results table is ready.');
  render();
}
window.runSentinelDataLakeJob = runSentinelDataLakeJob;

// ---------- Sentinel workspace selector ----------
function currentWorkspace() {
  const id = localStorage.getItem('defender-lab.sentinel.workspace');
  return SENTINEL_WORKSPACES.find(w => w.id === id) || SENTINEL_WORKSPACES[0];
}
function setWorkspace(id) {
  localStorage.setItem('defender-lab.sentinel.workspace', id);
  render();
}
window.currentWorkspace = currentWorkspace;
window.setWorkspace      = setWorkspace;

// ---------- MSSP / MTO state ----------
function currentMsspTenant() {
  const id = localStorage.getItem('defender-lab.sentinel.mssp.tenant');
  return MSSP_TENANTS.find(t => t.id === id) || MSSP_TENANTS[0];
}
function setMsspTenant(id) {
  localStorage.setItem('defender-lab.sentinel.mssp.tenant', id);
  render();
}
window.currentMsspTenant = currentMsspTenant;
window.setMsspTenant = setMsspTenant;

// Customer tenant details pane. In the real Workspace Manager / Azure Lighthouse
// MTO view, selecting a customer tenant opens a details blade showing the
// delegated workspaces, roles, cross-tenant incidents, and publish scope.
function openMsspTenant(id) {
  const t = MSSP_TENANTS.find(x => x.id === id);
  if (!t) return;
  const incidents = MTO_INCIDENTS.filter(i => i.tenant === t.name);
  const openIncidents = incidents.filter(i => i.status !== 'Resolved').length;
  const isActive = t.id === currentMsspTenant().id;
  const statusOk = t.status === 'Active';
  const sevClass = s => ({ High:'high', Medium:'medium', Low:'low', Informational:'info' }[s] || 'info');
  const incRows = incidents.length
    ? incidents.map(i => `
        <tr>
          <td><strong>${esc(i.title)}</strong><br><span class="muted">${esc(i.id)}</span></td>
          <td><span class="sev ${sevClass(i.severity)}">${esc(i.severity)}</span></td>
          <td>${esc(i.status)}</td>
          <td>${esc(i.assignedTo)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" class="muted">No incidents synced from this tenant.</td></tr>`;

  document.getElementById('tenant-title').textContent = t.name;
  document.getElementById('tenant-body').innerHTML = `
    <div class="pill-row" style="margin-bottom:12px;">
      <span class="tag ${statusOk ? 'green' : 'orange'}"><span class="status-dot ${statusOk ? 'resolved' : 'warn'}"></span>${esc(t.status)} delegation</span>
      ${isActive ? `<span class="tag green">Active publish target</span>` : ''}
    </div>
    <p class="muted" style="line-height:1.5;">Customer tenant onboarded through Azure Lighthouse. Delegated access lets the lab SOC view and act across the tenant's Sentinel workspaces without a directory switch.</p>

    <div class="resource-summary" style="margin-top:12px;">
      <div><span>Delegated workspaces</span><strong>${t.workspaces.length}</strong><small>${esc(t.workspaces.join(' · '))}</small></div>
      <div><span>Delegated roles</span><strong>${t.delegatedRoles.length}</strong><small>${esc(t.delegatedRoles.join(' · '))}</small></div>
      <div><span>Open incidents</span><strong>${openIncidents}</strong><small>${incidents.length} total synced</small></div>
    </div>

    <div class="alert-section-title" style="margin-top:16px;">Delegated roles (Azure Lighthouse)</div>
    <ul class="attack-evidence-list">${t.delegatedRoles.map(r => `<li>${esc(r)}</li>`).join('')}</ul>

    <div class="alert-section-title" style="margin-top:16px;">Cross-tenant incidents</div>
    <table class="grid">
      <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Owner</th></tr></thead>
      <tbody>${incRows}</tbody>
    </table>

    <div class="sidepanel-footer" style="margin-top:16px;">
      ${isActive
        ? `<button class="btn btn-secondary" disabled>Active publish target</button>`
        : `<button class="btn btn-primary" onclick="setMsspTenant('${esc(t.id)}')">Set as active tenant</button>`}
      <button class="btn btn-secondary" onclick="hidePanels();navigate('#/xdr/mto')">View all tenant incidents</button>
    </div>`;
  showPanel('panel-tenant');
}
window.openMsspTenant = openMsspTenant;

function loadSentinelLogsQuery(query) {
  sessionStorage.setItem('defender-lab.sentinel.logs.query', query);
  navigate('#/siem/logs');
}
window.loadSentinelLogsQuery = loadSentinelLogsQuery;

// ---------- 365 admin center: Message center reading pane ----------
const M365_MESSAGE_CENTER_STATE_KEY = 'defender-lab.m365.message-center';
const M365_MESSAGE_CENTER_TAB_KEY = 'defender-lab.m365.message-center.tab';

function currentM365MessageCenterState() {
  const fallback = { read:{}, favorites:{}, archived:{} };
  try {
    const parsed = JSON.parse(localStorage.getItem(M365_MESSAGE_CENTER_STATE_KEY));
    return {
      read: { ...fallback.read, ...((parsed || {}).read || {}) },
      favorites: { ...fallback.favorites, ...((parsed || {}).favorites || {}) },
      archived: { ...fallback.archived, ...((parsed || {}).archived || {}) },
    };
  }
  catch { return fallback; }
}

function saveM365MessageCenterState(state) {
  localStorage.setItem(M365_MESSAGE_CENTER_STATE_KEY, JSON.stringify(state));
}

function currentM365MessageCenterTab() {
  return sessionStorage.getItem(M365_MESSAGE_CENTER_TAB_KEY) === 'archive' ? 'archive' : 'active';
}

function setM365MessageCenterTab(tab) {
  sessionStorage.setItem(M365_MESSAGE_CENTER_TAB_KEY, tab === 'archive' ? 'archive' : 'active');
  render();
}

function renderM365MessageReadingPane(id) {
  const message = M365_MESSAGE_CENTER.find(item => item.id === id);
  const body = document.getElementById('m365-message-body');
  const title = document.getElementById('m365-message-title');
  if (!message || !body || !title) return false;

  const state = currentM365MessageCenterState();
  const archived = Boolean(state.archived[id]);
  const favorite = Boolean(state.favorites[id]);
  const visible = M365_MESSAGE_CENTER.filter(item => Boolean(state.archived[item.id]) === archived);
  const position = visible.findIndex(item => item.id === id);
  const previous = position > 0 ? visible[position - 1] : null;
  const next = position >= 0 && position < visible.length - 1 ? visible[position + 1] : null;
  title.textContent = message.title;
  body.innerHTML = `
    <div class="m365-message-nav">
      <span class="muted">${position + 1} of ${visible.length} ${archived ? 'archived' : 'active'} posts</span>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="moveM365Message(-1)" ${previous ? '' : 'disabled'} aria-label="Previous message">↑ Previous</button>
        <button class="btn btn-secondary btn-sm" onclick="moveM365Message(1)" ${next ? '' : 'disabled'} aria-label="Next message">↓ Next</button>
      </div>
    </div>
    <div class="m365-message-actions">
      <button class="btn ${favorite ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="toggleM365MessageFavorite('${esc(id)}')">${favorite ? '★ Favorite' : '☆ Favorite'}</button>
      <button class="btn btn-secondary btn-sm" onclick="markM365MessageUnread('${esc(id)}')">Mark unread</button>
      <button class="btn btn-secondary btn-sm" onclick="shareM365Message('${esc(id)}')">Share</button>
      <button class="btn btn-secondary btn-sm" onclick="toggleM365MessageArchive('${esc(id)}')">${archived ? 'Restore' : 'Archive'}</button>
    </div>
    <div class="m365-message-badges">
      <span class="tag ${message.impact === 'Action required' ? 'orange' : 'blue'}">${esc(message.impact)}</span>
      <span class="tag blue">${esc(message.tag)}</span>
      ${archived ? '<span class="tag">Archived</span>' : ''}
    </div>
    <dl class="m365-message-meta">
      <dt>Message ID</dt><dd>${esc(message.id)}</dd>
      <dt>Service</dt><dd>${esc(message.service)}</dd>
      <dt>Published / updated</dt><dd>${esc(message.published)} / ${esc(message.updated)}</dd>
      <dt>Timing of change</dt><dd>${esc(message.timing)}</dd>
      <dt>Act by</dt><dd>${esc(message.due)}</dd>
      <dt>Relevance</dt><dd>${esc(message.relevance)}</dd>
      <dt>Status for your org</dt><dd>${esc(message.orgStatus)}</dd>
      <dt>Platform</dt><dd>${esc(message.platform)}</dd>
      <dt>Monthly active users</dt><dd>${message.monthlyUsers} in this fictional tenant</dd>
    </dl>
    <section class="m365-message-section"><h3>What and why</h3><p>${esc(message.whatWhy)}</p></section>
    <section class="m365-message-section"><h3>Rollout schedule</h3><p>${esc(message.rollout)}</p></section>
    <section class="m365-message-section"><h3>Impact on your organization</h3><p>${esc(message.orgImpact)}</p></section>
    <section class="m365-message-section"><h3>Action required / recommendations</h3><ul>${message.actions.map(action => `<li>${esc(action)}</li>`).join('')}</ul></section>
    <section class="m365-message-section"><h3>Compliance considerations</h3><p>${esc(message.compliance)}</p></section>
    <div class="callout info">This is fictional study content. In the real Message center, use the post ID when sharing the change or contacting support.</div>`;
  return true;
}

function openM365Message(id) {
  const message = M365_MESSAGE_CENTER.find(item => item.id === id);
  if (!message) return;
  const state = currentM365MessageCenterState();
  state.read[id] = true;
  saveM365MessageCenterState(state);
  sessionStorage.setItem('defender-lab.m365.message-center.open', id);
  render();
  if (renderM365MessageReadingPane(id)) showPanel('panel-m365-message');
}

function moveM365Message(direction) {
  const id = sessionStorage.getItem('defender-lab.m365.message-center.open');
  const state = currentM365MessageCenterState();
  const archived = Boolean(state.archived[id]);
  const visible = M365_MESSAGE_CENTER.filter(item => Boolean(state.archived[item.id]) === archived);
  const index = visible.findIndex(item => item.id === id);
  const target = visible[index + Number(direction)];
  if (target) openM365Message(target.id);
}

function toggleM365MessageFavorite(id) {
  const state = currentM365MessageCenterState();
  state.favorites[id] = !state.favorites[id];
  saveM365MessageCenterState(state);
  render();
  renderM365MessageReadingPane(id);
}

function markM365MessageUnread(id) {
  const state = currentM365MessageCenterState();
  state.read[id] = false;
  saveM365MessageCenterState(state);
  render();
  renderM365MessageReadingPane(id);
  toast('Message marked unread in the local lab.');
}

function toggleM365MessageArchive(id) {
  const state = currentM365MessageCenterState();
  state.archived[id] = !state.archived[id];
  saveM365MessageCenterState(state);
  render();
  renderM365MessageReadingPane(id);
  toast(state.archived[id] ? 'Message archived in the local lab.' : 'Message restored to active posts.');
}

function shareM365Message(id) {
  const message = M365_MESSAGE_CENTER.find(item => item.id === id);
  if (message) toast(`Share draft prepared for ${message.id}; no message was sent.`);
}

window.currentM365MessageCenterState = currentM365MessageCenterState;
window.currentM365MessageCenterTab = currentM365MessageCenterTab;
window.setM365MessageCenterTab = setM365MessageCenterTab;
window.openM365Message = openM365Message;
window.moveM365Message = moveM365Message;
window.toggleM365MessageFavorite = toggleM365MessageFavorite;
window.markM365MessageUnread = markM365MessageUnread;
window.toggleM365MessageArchive = toggleM365MessageArchive;
window.shareM365Message = shareM365Message;

// ---------- Entra admin center: user detail ----------
// Opens the directory properties for a principal listed on #/identity/overview.
// Reuses the generic right-side panel. When the principal is onboarded to
// Defender for Identity, the footer offers the cross-portal pivot to its XDR
// identity page — the same pivot an analyst makes during a real investigation.
function openEntraUser(upn) {
  const u = ENTRA_USERS.find(x => x.upn === upn);
  if (!u) { toast(`${upn} is not in the lab directory.`); return; }

  const sevCls = u.riskLevel === 'High' ? 'high'
    : u.riskLevel === 'Medium' ? 'medium'
    : u.riskLevel === 'Low' ? 'low' : 'info';
  const signIns = ENTRA_RECENT_SIGNINS.filter(s => s.user === u.upn);
  const onboarded = Boolean(u.xdrIdentity && IDENTITIES.some(i => i.id === u.xdrIdentity));

  document.getElementById('technique-title').textContent = u.displayName;
  document.getElementById('technique-body').innerHTML = `
    <div class="entra-user-summary">
      <span class="sev ${sevCls}">${esc(u.riskState)}</span>
      ${u.enabled ? '' : '<span class="tag red">Account disabled</span>'}
      ${u.roles.length ? '<span class="tag">Privileged</span>' : ''}
    </div>

    <dl class="entra-kv">
      <dt>User principal name</dt><dd>${esc(u.upn)}</dd>
      <dt>Job title</dt><dd>${esc(u.jobTitle)}</dd>
      <dt>Department</dt><dd>${esc(u.department)}</dd>
      <dt>Type</dt><dd>${esc(u.userType)}</dd>
      <dt>Source</dt><dd>${esc(u.source)}</dd>
      <dt>Created</dt><dd>${fmtTime(u.created)}</dd>
      <dt>Last sign-in</dt><dd>${fmtTime(u.lastSignIn)}</dd>
      <dt>MFA method</dt><dd>${esc(u.mfa)}${u.mfa === 'Not registered' ? ' — risk policies cannot self-remediate this account' : ''}</dd>
      <dt>SSPR registered</dt><dd>${u.sspr ? 'Yes' : 'No'}</dd>
      <dt>Directory roles</dt><dd>${u.roles.length ? u.roles.map(esc).join(', ') : '—'}</dd>
      <dt>Licenses</dt><dd>${u.licenses.length ? u.licenses.map(esc).join(', ') : '—'}</dd>
      <dt>Devices / groups</dt><dd>${u.devices} devices · ${u.groups} groups</dd>
    </dl>

    ${u.riskDetail ? `<div class="callout ${u.riskState === 'None' ? 'info' : 'warn'}">
      <strong>Risk context:</strong> ${esc(u.riskDetail)}
    </div>` : ''}

    ${signIns.length ? `
      <div class="alert-section-title">Recent sign-ins</div>
      <table class="grid compact-grid">
        <thead><tr><th>Time</th><th>App</th><th>IP</th><th>Result</th><th>Risk</th></tr></thead>
        <tbody>${signIns.map(s => `
          <tr><td>${fmtTime(s.time)}</td><td>${esc(s.app)}</td><td>${esc(s.ip)}</td><td>${esc(s.result)}</td><td>${esc(s.risk)}</td></tr>
        `).join('')}</tbody>
      </table>` : ''}

    ${onboarded ? '' : `<div class="muted" style="font-size:12px;">Not onboarded to Defender for Identity — this principal exists in the Entra directory only.</div>`}

    <div class="sidepanel-footer entra-user-actions">
      ${onboarded ? `<button class="btn btn-primary" onclick="hidePanels(); openIdentity('${esc(u.xdrIdentity)}')">Defender XDR</button>` : ''}
      ${u.incidentId ? `<button class="btn btn-secondary" onclick="hidePanels(); openIncidentPage('${esc(u.incidentId)}')">${esc(u.incidentId)}</button>` : ''}
      <button class="btn btn-secondary" onclick="toast('Lab action: sessions revoked for ${esc(u.upn)}.')">Revoke sessions</button>
      <button class="btn btn-secondary" onclick="toast('Lab action: password reset required for ${esc(u.upn)}.')">Reset password</button>
    </div>
  `;
  showPanel('panel-technique');
}
window.openEntraUser = openEntraUser;

// ---------- sign-in logs (#/identity/sign-in-logs) ----------
// Filters live in sessionStorage so a coach step can navigate away and back
// without the learner losing the narrowing they just applied.
function setSigninFilter(kind, value) {
  sessionStorage.setItem('defender-lab.signin.' + kind, value || '');
  render();
}
function setSigninLogType(kind) {
  sessionStorage.setItem('defender-lab.signin.logtype', kind);
  render();
}

function clearSigninFilters() {
  sessionStorage.removeItem('defender-lab.signin.user');
  sessionStorage.removeItem('defender-lab.signin.result');
  render();
}

// One authentication attempt, expanded.
//
// The tab set follows the real console's activity-details pane — Basic info,
// Location, Device info, Authentication details, Conditional Access — because
// the split is the lesson: identity evidence is not one blob, and an analyst
// has to know which tab answers which question. Labels are the generic ones the
// vendor documentation uses to describe the panes; nothing branded is copied.
const SIGNIN_DETAIL_TABS = [
  { key: 'basic',    label: 'Basic info' },
  { key: 'location', label: 'Location' },
  { key: 'device',   label: 'Device info' },
  { key: 'auth',     label: 'Authentication details' },
  { key: 'ca',       label: 'Conditional Access' },
];

// The fixture keeps one readable string per fact (device, client, mfa, ca) and
// this expands them into the per-tab shape. The value space is closed and lives
// in SIGNIN_LOG_EVENTS, so parsing here stays honest and no fact is invented.
function signinDetailModel(e) {
  const failed = e.result === 'Failure';
  const managed = /\(managed\)/.test(e.device);
  const deviceName = managed ? e.device.replace(/\s*\(managed\)$/, '') : '—';
  const [clientKind, clientVersion] = e.client.split(' — ');
  const browser = clientVersion || clientKind;

  // Password first; a second factor only exists when one was actually reached.
  const authSteps = [{
    method: 'Password',
    result: failed ? 'Failure' : 'Success',
    detail: failed ? `Error ${e.code} — ${e.detail}` : 'Credential accepted',
  }];
  if (e.mfa && !['Not prompted', 'Not reached'].includes(e.mfa)) {
    authSteps.push({ method: e.mfa, result: 'Success', detail: 'Second factor satisfied' });
  }

  const caApplied = e.ca && e.ca !== 'Not applied';
  const policies = caApplied
    ? [{ name: e.ca.replace(/ satisfied$/, ''), result: 'Success' }]
    : [{ name: 'CA001 — Require multifactor authentication for all users', result: 'Not applied' }];

  return { failed, managed, deviceName, browser, clientKind, authSteps, caApplied, policies };
}

let signinDetailTab = 'basic';

function setSigninDetailTab(id, tab) {
  signinDetailTab = tab;
  openSigninEvent(id);
}

function signinDetailBody(e, m) {
  if (signinDetailTab === 'location') {
    return `<dl class="entra-kv">
      <dt>IP address</dt><dd>${esc(e.ip)}</dd>
      <dt>Location</dt><dd>${esc(e.location)}</dd>
      <dt>Network type</dt><dd>${m.managed ? 'Corporate network' : 'Unknown — outside any named location'}</dd>
    </dl>`;
  }
  if (signinDetailTab === 'device') {
    return `<dl class="entra-kv">
      <dt>Device name</dt><dd>${esc(m.deviceName)}</dd>
      <dt>Managed</dt><dd>${m.managed ? 'Yes — enrolled in device management' : 'No'}</dd>
      <dt>Compliant</dt><dd>${m.managed ? 'Yes' : 'Not evaluated — device is not registered'}</dd>
      <dt>Join type</dt><dd>${m.managed ? 'Directory joined' : 'Not registered'}</dd>
      <dt>Client app</dt><dd>${esc(m.clientKind)}</dd>
      <dt>Browser</dt><dd>${esc(m.browser)}</dd>
    </dl>`;
  }
  if (signinDetailTab === 'auth') {
    return `<table class="grid compact-grid">
      <thead><tr><th>#</th><th>Method</th><th>Result</th><th>Detail</th></tr></thead>
      <tbody>${m.authSteps.map((s, i) => `<tr>
        <td>${i + 1}</td><td>${esc(s.method)}</td>
        <td><span class="tag ${s.result === 'Failure' ? 'red' : 'green'}">${esc(s.result)}</span></td>
        <td>${esc(s.detail)}</td>
      </tr>`).join('')}</tbody>
    </table>
    ${m.authSteps.length === 1 ? `<div class="muted" style="font-size:12px;padding-top:8px;">
      Only one factor appears in this sequence. ${m.failed
        ? 'The password step failed, so no second factor was reached.'
        : 'The password alone completed the sign-in — no second factor was requested.'}
    </div>` : ''}`;
  }
  if (signinDetailTab === 'ca') {
    return `<table class="grid compact-grid">
      <thead><tr><th>Policy</th><th>Result</th></tr></thead>
      <tbody>${m.policies.map(p => `<tr>
        <td>${esc(p.name)}</td>
        <td><span class="tag ${p.result === 'Success' ? 'green' : 'orange'}">${esc(p.result)}</span></td>
      </tr>`).join('')}</tbody>
    </table>
    ${m.caApplied ? '' : `<div class="muted" style="font-size:12px;padding-top:8px;">
      Not applied means the sign-in never matched the policy's conditions — not that the policy passed.
    </div>`}`;
  }

  const priorSuccess = SIGNIN_LOG_EVENTS
    .filter(x => x.user === e.user && x.result === 'Success' && x.time < e.time)
    .sort((a, b) => b.time.localeCompare(a.time))[0];
  return `<dl class="entra-kv">
      <dt>User</dt><dd>${esc(e.user)}</dd>
      <dt>Application</dt><dd>${esc(e.app)}</dd>
      <dt>Status</dt><dd>${esc(e.detail)}${m.failed ? ` <span class="muted">(error ${esc(e.code)})</span>` : ''}</dd>
      <dt>Sign-in risk</dt><dd>${esc(e.risk)}</dd>
      <dt>Correlation ID</dt><dd><code>${esc(signinCorrelationId(e))}</code></dd>
    </dl>
    ${priorSuccess ? `<div class="muted" style="font-size:12px;">
      Previous successful sign-in for this account: ${fmtUtc(priorSuccess.time, { seconds:true })} UTC from
      ${esc(priorSuccess.ip)} (${esc(priorSuccess.location)}) on ${esc(priorSuccess.device)}.
    </div>` : ''}`;
}

// A stable synthetic identifier, so the same row always shows the same ID and a
// student can quote it in a case note the way a real correlation ID is quoted.
function signinCorrelationId(e) {
  let hash = 0;
  for (const ch of `${e.id}${e.time}${e.user}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hex = hash.toString(16).padStart(8, '0');
  return `${hex}-4f${hex.slice(0, 2)}-4b${hex.slice(2, 4)}-9${hex.slice(4, 7)}-${hex}${hex.slice(0, 4)}`;
}

function openSigninEvent(id) {
  const e = SIGNIN_LOG_EVENTS.find(x => x.id === id);
  if (!e) return;
  const m = signinDetailModel(e);

  document.getElementById('technique-title').textContent = `Sign-in ${e.id} — ${e.display}`;
  document.getElementById('technique-body').innerHTML = `
    <div class="signin-detail-head">
      <span class="tag ${m.failed ? 'red' : 'green'}">${esc(e.result)}</span>
      ${e.risk === 'None' ? '' : `<span class="sev ${String(e.risk).toLowerCase()}">${esc(e.risk)} risk</span>`}
      <span class="muted">${fmtUtc(e.time, { seconds:true })} UTC</span>
    </div>
    <div class="tabs signin-detail-tabs">
      ${SIGNIN_DETAIL_TABS.map(t => `<button class="tab ${t.key === signinDetailTab ? 'active' : ''}" type="button"
        onclick="setSigninDetailTab('${esc(e.id)}','${t.key}')">${esc(t.label)}</button>`).join('')}
    </div>
    ${signinDetailBody(e, m)}
  `;
  showPanel('panel-technique');
}
window.setSigninDetailTab = setSigninDetailTab;
window.setSigninFilter = setSigninFilter;
window.clearSigninFilters = clearSigninFilters;
window.setSigninLogType = setSigninLogType;
window.openSigninEvent = openSigninEvent;
