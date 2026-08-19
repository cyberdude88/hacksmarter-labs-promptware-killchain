/* Hack Smarter IT Help Desk workload.
 * Loaded after app.js so it can register against the simulator's existing
 * router and chrome without changing the student-portal architecture. */

PORTALS.push({ id:'helpdesk', name:'IT Service Desk', tag:'Enterprise support · tickets, endpoints, directory, servers', color:'#1f6f78', initial:'IT' });
CLOUD_NAV.push({ label:'IT Service Desk', icon:'🎧' });
NAV.helpdesk = [
  { route:'#/helpdesk/dashboard', label:'Help Desk Dashboard', icon:'▦' },
  { route:'#/helpdesk/tickets', label:'Ticket Queue', icon:'🎫' },
  { section:'People & access' },
  { route:'#/helpdesk/directory', label:'User Directory', icon:'👥' },
  { route:'#/helpdesk/active-directory', label:'Active Directory', icon:'🗂' },
  { section:'Endpoints & remote support' },
  { route:'#/helpdesk/windows', label:'Windows Desktop', icon:'🪟' },
  { route:'#/helpdesk/event-viewer', label:'Event Viewer', icon:'📋' },
  { route:'#/helpdesk/powershell', label:'PowerShell', icon:'>_' },
  { route:'#/helpdesk/remote-support', label:'Remote Support', icon:'🖥' },
  { route:'#/helpdesk/endpoint-security', label:'Endpoint Security', icon:'🛡' },
  { section:'Enterprise infrastructure' },
  { route:'#/helpdesk/server-manager', label:'Server Manager', icon:'🗄' },
  { route:'#/helpdesk/dns', label:'DNS', icon:'🌐' },
  { route:'#/helpdesk/dhcp', label:'DHCP', icon:'📡' },
  { route:'#/helpdesk/group-policy', label:'Group Policy', icon:'📜' },
  { route:'#/helpdesk/file-server', label:'File Server', icon:'📁' },
  { route:'#/helpdesk/printers', label:'Printer Management', icon:'🖨' },
  { section:'Knowledge & shift tools' },
  { route:'#/helpdesk/knowledge-base', label:'Knowledge Base', icon:'📚' },
  { route:'#/helpdesk/environment', label:'Enterprise Map', icon:'🧭' },
];
PORTAL_CONTEXT.helpdesk = 'admin';
CLOUD_HIGHLIGHT.helpdesk = 'IT Service Desk';
CLOUD_APP_ROUTE['IT Service Desk'] = '#/helpdesk/dashboard';

const HD_STATE_KEY = 'defender-lab.helpdesk.state.v1';
const HD_SHIFT_NOW = new Date('2026-08-17T13:00:00Z');
const HD_STATUSES = ['New', 'Assigned', 'In Progress', 'Pending User', 'Pending Vendor', 'Escalated', 'Resolved', 'Closed'];
const HD_STATUS_NEXT = {
  'New':['Assigned'],
  'Assigned':['In Progress','Escalated'],
  'In Progress':['Pending User','Pending Vendor','Escalated','Resolved'],
  'Pending User':['In Progress','Resolved'],
  'Pending Vendor':['In Progress','Escalated','Resolved'],
  'Escalated':['In Progress','Resolved'],
  'Resolved':['Closed','In Progress'],
  'Closed':[],
};
const HD_DIAGNOSIS_OVERRIDES = {
  'HD-2109':'Corrupt profile mapping',
  'HD-2118':'NTFS permission',
  'SEC-2115':'Malicious extension',
};

function hdClone(value) { return JSON.parse(JSON.stringify(value)); }
function hdSeededOrder(items, seed) {
  let n = seed || 8172026;
  return items.map(item => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return { item, sort:n / 4294967296 };
  }).sort((a, b) => a.sort - b.sort).map(row => row.item);
}
function hdFreshState() {
  const seed = Math.floor(Math.random() * 0x7fffffff) || 8172026;
  const independent = HD_TICKET_TEMPLATES.filter(t => !t.correlationKey);
  const correlated = HD_TICKET_TEMPLATES.filter(t => t.correlationKey);
  const tickets = hdSeededOrder([...independent, ...correlated], seed).map((ticket, index) => ({
    ...hdClone(ticket),
    createdTimestamp: new Date(HD_SHIFT_NOW.getTime() - (ticket.createdMinutesAgo + (index % 4)) * 60000).toISOString(),
    troubleshootingHistory: [{ time:'Created', action:'Ticket received from monitoring, portal, phone, or email intake.' }],
    diagnosis:'', diagnosisCorrect:false, linkedProblem:'',
  }));
  return {
    version:1, seed, tickets, selectedTicketId:tickets[0].id,
    queueFilter:'Open', priorityFilter:'All', adTab:'users', selectedUserId:'u-1005',
    selectedComputer:'NS-LT-0131', selectedServer:'NS-PRINT01',
    userOverrides:{}, computerOverrides:{}, printerOverrides:{},
    powershell:[{ type:'system', text:'Northstar Enterprise Support Shell · training subset\nType Get-Help to list supported commands.' }],
  };
}
function hdLoadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(HD_STATE_KEY) || 'null');
    if (saved && saved.version === 1 && Array.isArray(saved.tickets)) return saved;
  } catch (_) {}
  const fresh = hdFreshState();
  localStorage.setItem(HD_STATE_KEY, JSON.stringify(fresh));
  return fresh;
}
let hdState = hdLoadState();
function hdSave() { localStorage.setItem(HD_STATE_KEY, JSON.stringify(hdState)); }
function hdRerender() { hdSave(); render(); }
function hdEsc(value) { return escHtml(String(value == null ? '' : value)); }
function hdTicketById(id) { return hdState.tickets.find(ticket => ticket.id === id); }
function hdCurrentTicket() { return hdTicketById(hdState.selectedTicketId) || hdState.tickets[0]; }
function hdUserById(id) {
  const base = HD_USERS.find(user => user.id === id);
  return base ? { ...base, ...(hdState.userOverrides[id] || {}) } : null;
}
function hdComputerByName(name) {
  const base = HD_COMPUTERS.find(computer => computer.name === name);
  return base ? { ...base, ...(hdState.computerOverrides[name] || {}) } : null;
}
function hdOpenTickets() { return hdState.tickets.filter(t => !['Resolved','Closed'].includes(t.status)); }
function hdSlaMinutes(ticket) { return { P1:15, P2:120, P3:480, P4:1440 }[ticket.priority] || 480; }
function hdAgeMinutes(ticket) { return Math.max(0, Math.round((HD_SHIFT_NOW - new Date(ticket.createdTimestamp)) / 60000)); }
function hdSlaState(ticket) {
  if (['Resolved','Closed'].includes(ticket.status)) return { label:'Met / stopped', cls:'ok' };
  const ratio = hdAgeMinutes(ticket) / hdSlaMinutes(ticket);
  if (ratio >= 1) return { label:'Breached', cls:'bad' };
  if (ratio >= .7) return { label:'At risk', cls:'warn' };
  return { label:`${Math.max(1, hdSlaMinutes(ticket) - hdAgeMinutes(ticket))}m left`, cls:'ok' };
}
function hdBadge(value, kind) { return `<span class="hd-badge ${kind || String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${hdEsc(value)}</span>`; }
function hdPageHeader(title, subtitle, actions) {
  return `<div class="page-header"><div><div class="breadcrumb">IT Service Desk › ${hdEsc(title)}</div><h1>${hdEsc(title)}</h1><div class="page-subtitle">${hdEsc(subtitle)}</div></div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
}
function hdList(items, ordered) {
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag} class="hd-list">${(items || []).map(item => `<li>${hdEsc(item)}</li>`).join('')}</${tag}>`;
}
function hdMetric(label, value, detail, tone) {
  return `<div class="card hd-metric ${tone || ''}"><div class="card-body"><span class="muted">${hdEsc(label)}</span><strong>${hdEsc(value)}</strong><small>${hdEsc(detail)}</small></div></div>`;
}
function hdHistory(ticket, action) {
  ticket.troubleshootingHistory.push({ time:new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), action });
}

function hdSelectTicket(id) {
  hdState.selectedTicketId = id;
  hdSave();
  navigate('#/helpdesk/ticket');
}
function hdSetQueueFilter(value) { hdState.queueFilter = value; hdRerender(); }
function hdSetPriorityFilter(value) { hdState.priorityFilter = value; hdRerender(); }
function hdAssignTicket(id) {
  const ticket = hdTicketById(id); if (!ticket) return;
  ticket.assignedTechnician = 'Riley Morgan';
  if (ticket.status === 'New') ticket.status = 'Assigned';
  hdHistory(ticket, 'Assigned to Riley Morgan.'); hdRerender();
}
function hdTransitionTicket(id, status) {
  const ticket = hdTicketById(id); if (!ticket || !HD_STATUS_NEXT[ticket.status].includes(status)) {
    toast('That state transition is not valid from the current ticket state.'); return;
  }
  ticket.status = status; hdHistory(ticket, `Status changed to ${status}.`); hdRerender();
}
function hdSetTicketPriority(id, priority) {
  const ticket = hdTicketById(id); if (!ticket) return;
  ticket.priority = priority; hdHistory(ticket, `Priority set to ${priority} after impact and urgency review.`); hdRerender();
}
function hdAddNote(id) {
  const ticket = hdTicketById(id); const input = document.getElementById('hd-note-input');
  const text = input && input.value.trim(); if (!ticket || !text) { toast('Enter a useful troubleshooting note first.'); return; }
  ticket.notes.push({ time:new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), author:'Riley Morgan', text });
  hdHistory(ticket, 'Technician work note added.'); hdRerender();
}
function hdContactRequester(id) {
  const ticket = hdTicketById(id); if (!ticket) return;
  const message = `Contacted ${ticket.requester}: acknowledged the ticket, confirmed impact, and set the next update expectation.`;
  ticket.notes.push({ time:new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), author:'Customer update', text:message });
  hdHistory(ticket, 'Requester contacted; impact and next-update time confirmed.');
  toast('Simulated requester contact recorded.'); hdRerender();
}
function hdSubmitDiagnosis(id) {
  const ticket = hdTicketById(id); const select = document.getElementById('hd-diagnosis');
  if (!ticket || !select || !select.value) { toast('Select the most likely cause first.'); return; }
  ticket.diagnosis = select.value;
  const expectedDiagnosis = HD_DIAGNOSIS_OVERRIDES[ticket.id] || ticket.plausibleCauses[ticket.plausibleCauses.length - 1];
  ticket.diagnosisCorrect = select.value === expectedDiagnosis;
  hdHistory(ticket, `Diagnosis submitted: ${select.value}.`);
  hdSave(); render();
}
function hdResolveTicket(id) {
  const ticket = hdTicketById(id); if (!ticket) return;
  if (!ticket.diagnosisCorrect && !['Service Request'].includes(ticket.category)) { toast('Validate the root cause before resolving this ticket.'); return; }
  ticket.resolution = ticket.expectedResolution;
  ticket.closureCode = ticket.category === 'Service Request' ? 'Request fulfilled' : ticket.category === 'Security Incident' ? 'Escalated to Security' : 'Resolved by support';
  if (ticket.category === 'Security Incident' || ticket.escalationCriteria.some(x => x.startsWith('Always'))) {
    ticket.status = 'Escalated'; ticket.assignedTechnician = ticket.category === 'Security Incident' ? 'Cybersecurity Operations' : 'Enterprise Infrastructure';
    hdHistory(ticket, `Warm escalation accepted by ${ticket.assignedTechnician}.`);
  } else {
    ticket.status = 'Resolved'; hdHistory(ticket, 'Resolution applied and awaiting requester confirmation.');
  }
  hdRerender();
}
function hdLinkProblem(id) {
  const ticket = hdTicketById(id); if (!ticket || !ticket.correlationKey) return;
  hdState.tickets.filter(t => t.correlationKey === ticket.correlationKey).forEach(t => {
    t.linkedProblem = 'PRB-0081'; hdHistory(t, 'Linked to PRB-0081 · Purchasing TLS certificate expiry.');
  });
  hdRerender();
}
function hdResetShift() {
  if (!confirm('Reset the Help Desk shift and discard only Help Desk simulator progress?')) return;
  hdState = hdFreshState(); hdRerender();
}

function hdQueueRows(tickets) {
  return tickets.map(ticket => {
    const sla = hdSlaState(ticket);
    return `<tr class="hd-ticket-row" tabindex="0" onclick="hdSelectTicket('${ticket.id}')" onkeydown="if(event.key==='Enter')hdSelectTicket('${ticket.id}')">
      <td><strong>${hdEsc(ticket.id)}</strong>${ticket.linkedProblem ? `<small>${hdEsc(ticket.linkedProblem)}</small>` : ''}</td>
      <td>${hdBadge(ticket.priority, ticket.priority.toLowerCase())}</td>
      <td><strong>${hdEsc(ticket.requester)}</strong><small>${hdEsc(ticket.department)}</small></td>
      <td><strong>${hdEsc(ticket.subcategory)}</strong><small>${hdEsc(ticket.description)}</small></td>
      <td>${hdBadge(ticket.status)}</td><td>${hdBadge(sla.label, sla.cls)}</td><td>${hdEsc(ticket.assignedTechnician)}</td>
    </tr>`;
  }).join('');
}

VIEWS['helpdesk/dashboard'] = () => {
  const open = hdOpenTickets();
  const p1 = open.filter(t => t.priority === 'P1');
  const risk = open.filter(t => ['At risk','Breached'].includes(hdSlaState(t).label));
  const cluster = open.filter(t => t.correlationKey === 'APP-CERT-EXPIRY-01');
  const urgent = [...open].sort((a,b) =>
    ({P1:1,P2:2,P3:3,P4:4}[a.priority] - {P1:1,P2:2,P3:3,P4:4}[b.priority]) ||
    hdAgeMinutes(b) - hdAgeMinutes(a)
  ).slice(0,7);
  return `${hdPageHeader('Help Desk Dashboard', `${HD_ORG.name} · ${HD_ORG.domain} · simulated shift`, `<button class="btn btn-secondary" onclick="hdResetShift()">Reset shift</button><button class="btn btn-primary" onclick="navigate('#/helpdesk/tickets')">Open queue</button>`)}
    <div class="hd-metric-grid">${hdMetric('Open tickets', open.length, `${hdState.tickets.length} received this shift`)}${hdMetric('Priority 1', p1.length, 'Immediate response required','danger')}${hdMetric('SLA risk', risk.length, 'At risk or breached','warning')}${hdMetric('Correlated reports', cluster.length, 'Possible shared incident','info')}</div>
    <div class="two-col hd-dashboard-grid">
      <div class="card"><div class="card-header"><strong>Priority work</strong><button class="btn btn-ghost btn-sm" onclick="navigate('#/helpdesk/tickets')">View all</button></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Priority</th><th>Requester</th><th>Issue</th><th>Status</th><th>SLA</th><th>Owner</th></tr></thead><tbody>${hdQueueRows(urgent)}</tbody></table></div></div>
      <div class="hd-side-stack">
        <div class="card hd-correlation"><div class="card-header"><strong>Correlation opportunity</strong>${hdBadge(`${cluster.length} reports`,'warn')}</div><div class="card-body"><h3>Purchasing sign-in failures</h3><p>Users in five departments report the same secure-connection error. Treat the shared timing and evidence as a possible broader incident.</p><button class="btn btn-primary btn-sm" onclick="hdSelectTicket('${cluster[0] ? cluster[0].id : ''}')">Investigate cluster</button></div></div>
        <div class="card"><div class="card-header"><strong>Shift discipline</strong></div><div class="card-body">${hdList(['Prioritize business impact and urgency','Own every handoff until accepted','Preserve security evidence','Verify fixes from the user perspective','Close with complete resolution notes'])}</div></div>
      </div>
    </div>`;
};

VIEWS['helpdesk/tickets'] = () => {
  let tickets = hdState.tickets;
  if (hdState.queueFilter === 'Open') tickets = tickets.filter(t => !['Resolved','Closed'].includes(t.status));
  else if (hdState.queueFilter !== 'All') tickets = tickets.filter(t => t.status === hdState.queueFilter);
  if (hdState.priorityFilter !== 'All') tickets = tickets.filter(t => t.priority === hdState.priorityFilter);
  return `${hdPageHeader('Ticket Queue', 'Classify, prioritize, own, investigate, communicate, resolve, and close.', `<button class="btn btn-secondary" onclick="hdResetShift()">Generate new shift</button>`)}
    <div class="filterbar"><label>Status <select class="select" onchange="hdSetQueueFilter(this.value)">${['All','Open',...HD_STATUSES].map(v => `<option ${v===hdState.queueFilter?'selected':''}>${v}</option>`).join('')}</select></label><label>Priority <select class="select" onchange="hdSetPriorityFilter(this.value)">${['All','P1','P2','P3','P4'].map(v => `<option ${v===hdState.priorityFilter?'selected':''}>${v}</option>`).join('')}</select></label><span class="muted">${tickets.length} shown · roots remain hidden until diagnosed</span></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Ticket</th><th>Priority</th><th>Requester</th><th>Category / summary</th><th>Status</th><th>SLA</th><th>Assigned</th></tr></thead><tbody>${hdQueueRows(tickets)}</tbody></table></div></div>`;
};

VIEWS['helpdesk/ticket'] = () => {
  const ticket = hdCurrentTicket();
  if (!ticket) return hdPageHeader('Ticket', 'No ticket selected.');
  const sla = hdSlaState(ticket);
  const related = ticket.correlationKey ? hdState.tickets.filter(t => t.correlationKey === ticket.correlationKey) : [];
  const nextStates = HD_STATUS_NEXT[ticket.status] || [];
  const diagnosisOptions = ticket.plausibleCauses;
  return `${hdPageHeader(ticket.id, `${ticket.category} · ${ticket.subcategory}`, `<button class="btn btn-secondary" onclick="navigate('#/helpdesk/tickets')">← Queue</button>${ticket.assignedTechnician==='Unassigned'?`<button class="btn btn-primary" onclick="hdAssignTicket('${ticket.id}')">Assign to me</button>`:''}`)}
    ${related.length > 1 ? `<div class="callout warning hd-related"><strong>${related.length} related reports detected.</strong> Same application, symptom, and time window. ${ticket.linkedProblem ? `Linked to ${hdEsc(ticket.linkedProblem)}.` : `<button class="btn btn-sm btn-secondary" onclick="hdLinkProblem('${ticket.id}')">Link to problem record</button>`}</div>` : ''}
    <div class="hd-ticket-layout">
      <div class="hd-ticket-main">
        <div class="card"><div class="card-header"><strong>Requester statement</strong>${hdBadge(ticket.priority,ticket.priority.toLowerCase())}${hdBadge(ticket.status)}${hdBadge(sla.label,sla.cls)}</div><div class="card-body"><blockquote class="hd-request">${hdEsc(ticket.description)}</blockquote><div class="hd-field-grid"><div><span>Requester</span><strong>${hdEsc(ticket.requester)}</strong></div><div><span>Department</span><strong>${hdEsc(ticket.department)}</strong></div><div><span>Business impact</span><strong>${hdEsc(ticket.businessImpact)}</strong></div><div><span>SLA target</span><strong>${hdEsc(ticket.sla)}</strong></div><div><span>Created</span><strong>${new Date(ticket.createdTimestamp).toLocaleString()}</strong></div><div><span>Assigned technician</span><strong>${hdEsc(ticket.assignedTechnician)}</strong></div></div></div></div>
        <div class="two-col"><div class="card"><div class="card-header"><strong>Observable symptoms</strong></div><div class="card-body">${hdList(ticket.symptoms)}</div></div><div class="card"><div class="card-header"><strong>Relevant system state</strong></div><div class="card-body">${hdList(ticket.systemState)}</div></div></div>
        <div class="card"><div class="card-header"><strong>Available logs and evidence</strong><span class="muted">Investigate; do not infer beyond the evidence.</span></div><div class="card-body"><pre class="hd-evidence">${ticket.logs.map(hdEsc).join('\n')}</pre></div></div>
        <div class="card"><div class="card-header"><strong>Troubleshooting path</strong><span class="muted">Record what you actually checked.</span></div><div class="card-body"><div class="hd-path">${ticket.correctPath.map((step,index) => `<label><input type="checkbox"> <span>${index+1}</span>${hdEsc(step)}</label>`).join('')}</div></div></div>
        <div class="card"><div class="card-header"><strong>Diagnosis checkpoint</strong></div><div class="card-body"><div class="hd-diagnosis-row"><select id="hd-diagnosis" class="select"><option value="">Choose the most likely cause…</option>${diagnosisOptions.map(value => `<option ${ticket.diagnosis===value?'selected':''}>${hdEsc(value)}</option>`).join('')}</select><button class="btn btn-primary" onclick="hdSubmitDiagnosis('${ticket.id}')">Check diagnosis</button></div>${ticket.diagnosis ? `<div class="callout ${ticket.diagnosisCorrect?'success':'warning'}">${ticket.diagnosisCorrect ? `<strong>Supported by the evidence.</strong> ${hdEsc(ticket.hiddenRootCause)}` : '<strong>Not sufficiently supported.</strong> Recheck the evidence and test a different hypothesis.'}</div>` : ''}${ticket.diagnosisCorrect ? `<div class="hd-resolution"><strong>Expected resolution</strong><p>${hdEsc(ticket.expectedResolution)}</p></div>` : ''}</div></div>
        <div class="card"><div class="card-header"><strong>Work notes</strong><span class="muted">Facts, commands, results, interpretation, next action.</span></div><div class="card-body"><div class="hd-note-list">${ticket.notes.length ? ticket.notes.map(note => `<div><strong>${hdEsc(note.author)} · ${hdEsc(note.time)}</strong><p>${hdEsc(note.text)}</p></div>`).join('') : '<p class="muted">No technician notes yet.</p>'}</div><textarea id="hd-note-input" class="textarea" rows="3" placeholder="Document the action you took and what the result proved…"></textarea><button class="btn btn-secondary" onclick="hdAddNote('${ticket.id}')">Add work note</button></div></div>
      </div>
      <aside class="hd-ticket-side">
        <div class="card"><div class="card-header"><strong>Ticket controls</strong></div><div class="card-body hd-control-stack"><label>Priority<select class="select" onchange="hdSetTicketPriority('${ticket.id}',this.value)">${['P1','P2','P3','P4'].map(v=>`<option ${ticket.priority===v?'selected':''}>${v}</option>`).join('')}</select></label>${nextStates.length?`<label>Next state<select class="select" onchange="if(this.value)hdTransitionTicket('${ticket.id}',this.value)"><option value="">Choose…</option>${nextStates.map(v=>`<option>${v}</option>`).join('')}</select></label>`:''}<button class="btn btn-secondary" onclick="hdContactRequester('${ticket.id}')">Contact requester</button><button class="btn btn-primary" onclick="hdResolveTicket('${ticket.id}')">${ticket.category==='Security Incident'?'Warm escalate':'Resolve / escalate'}</button></div></div>
        <div class="card"><div class="card-header"><strong>Escalation criteria</strong></div><div class="card-body">${hdList(ticket.escalationCriteria)}</div></div>
        <div class="card"><div class="card-header"><strong>History</strong></div><div class="card-body hd-history">${ticket.troubleshootingHistory.slice().reverse().map(row=>`<div><time>${hdEsc(row.time)}</time><p>${hdEsc(row.action)}</p></div>`).join('')}</div></div>
        ${ticket.resolution ? `<div class="card"><div class="card-header"><strong>Resolution</strong>${hdBadge(ticket.closureCode,'ok')}</div><div class="card-body"><p>${hdEsc(ticket.resolution)}</p></div></div>` : ''}
      </aside>
    </div>`;
};

function hdDirectoryTable(users) {
  return `<div class="table-wrap"><table><thead><tr><th>User</th><th>Department</th><th>Account</th><th>MFA</th><th>OU</th><th></th></tr></thead><tbody>${users.map(user=>`<tr><td><strong>${hdEsc(user.name)}</strong><small>${hdEsc(user.email)}</small></td><td>${hdEsc(user.department)}</td><td>${user.enabled?hdBadge(user.locked?'Locked':'Enabled',user.locked?'bad':'ok'):hdBadge('Disabled','bad')}</td><td>${hdBadge(user.mfa,user.mfa==='Registered'?'ok':'warn')}</td><td><code>${hdEsc(user.ou)}</code></td><td><button class="btn btn-sm btn-secondary" onclick="hdOpenUser('${user.id}')">Open</button></td></tr>`).join('')}</tbody></table></div>`;
}
function hdOpenUser(id) { hdState.selectedUserId=id; hdState.adTab='users'; hdSave(); navigate('#/helpdesk/active-directory'); }
function hdSetAdTab(tab) { hdState.adTab=tab; hdRerender(); }
function hdAdAction(action) {
  const user = hdUserById(hdState.selectedUserId); if (!user) return;
  const patch = hdState.userOverrides[user.id] || {};
  if (action === 'unlock') patch.locked=false;
  if (action === 'disable') patch.enabled=false;
  if (action === 'enable') patch.enabled=true;
  if (action === 'reset') patch.passwordAge=0;
  if (action === 'add-hr') patch.groups=[...new Set([...(user.groups||[]),'GG-HR-Contributors'])];
  hdState.userOverrides[user.id]=patch; hdSave(); toast(`Active Directory action completed in the simulation: ${action}.`); render();
}
VIEWS['helpdesk/directory'] = () => `${hdPageHeader('User Directory', 'Search fictional employees, departments, managers, account state, and MFA registration.')}<div class="card">${hdDirectoryTable(HD_USERS.map(user=>hdUserById(user.id)))}</div>`;
VIEWS['helpdesk/active-directory'] = () => {
  const selected = hdUserById(hdState.selectedUserId) || hdUserById('u-1005');
  return `${hdPageHeader('Active Directory', `${HD_ORG.domain} · Users, groups, computers, and delegated help desk tasks`)}<div class="tabs"><button class="tab ${hdState.adTab==='users'?'active':''}" onclick="hdSetAdTab('users')">Users</button><button class="tab ${hdState.adTab==='groups'?'active':''}" onclick="hdSetAdTab('groups')">Groups</button><button class="tab ${hdState.adTab==='computers'?'active':''}" onclick="hdSetAdTab('computers')">Computers</button></div>
    ${hdState.adTab==='users'?`<div class="hd-admin-layout"><div class="card">${hdDirectoryTable(HD_USERS.map(user=>hdUserById(user.id)))}</div><aside class="card hd-object-pane"><div class="card-header"><strong>${hdEsc(selected.name)}</strong>${selected.locked?hdBadge('Locked','bad'):hdBadge(selected.enabled?'Enabled':'Disabled',selected.enabled?'ok':'bad')}</div><div class="card-body"><dl class="hd-dl"><dt>Username</dt><dd>${hdEsc(HD_ORG.netbios+'\\'+selected.username)}</dd><dt>OU</dt><dd>${hdEsc(selected.ou)}</dd><dt>Manager</dt><dd>${hdEsc(selected.manager)}</dd><dt>Password age</dt><dd>${selected.passwordAge} days</dd><dt>Groups</dt><dd>${selected.groups.map(group=>hdBadge(group)).join(' ')}</dd></dl><div class="hd-action-grid"><button class="btn btn-secondary" onclick="hdAdAction('unlock')">Unlock</button><button class="btn btn-secondary" onclick="hdAdAction('reset')">Reset password</button><button class="btn btn-secondary" onclick="hdAdAction('${selected.enabled?'disable':'enable'}')">${selected.enabled?'Disable':'Enable'}</button><button class="btn btn-secondary" onclick="hdAdAction('add-hr')">Add approved group</button></div><div class="callout info">Verify identity and approval before any account or access action. Never place passwords in ticket notes.</div></div></aside></div>`:''}
    ${hdState.adTab==='groups'?`<div class="card"><div class="table-wrap"><table><thead><tr><th>Group</th><th>Scope</th><th>Type</th><th>Members</th><th>Resource / purpose</th></tr></thead><tbody>${HD_GROUPS.map(g=>`<tr><td><strong>${hdEsc(g.name)}</strong></td><td>${hdEsc(g.scope)}</td><td>${hdEsc(g.type)}</td><td>${g.members}</td><td>${hdEsc(g.resource)}</td></tr>`).join('')}</tbody></table></div></div>`:''}
    ${hdState.adTab==='computers'?`<div class="card"><div class="table-wrap"><table><thead><tr><th>Computer</th><th>User</th><th>OU</th><th>Trust</th><th>BitLocker</th><th>Health</th></tr></thead><tbody>${HD_COMPUTERS.map(c=>{const x=hdComputerByName(c.name);return `<tr><td><strong>${hdEsc(x.name)}</strong><small>${hdEsc(x.ip)}</small></td><td>${hdEsc(x.user)}</td><td><code>${hdEsc(x.ou)}</code></td><td>${hdBadge(x.trust,x.trust==='Healthy'?'ok':'bad')}</td><td>${hdBadge(x.bitlocker,x.bitlocker==='Protected'?'ok':'warn')}</td><td>${hdEsc(x.health)}</td></tr>`}).join('')}</tbody></table></div></div>`:''}`;
};

function hdSelectComputer(name, route) { hdState.selectedComputer=name; hdSave(); if(route) navigate(route); else render(); }
function hdEndpointCards() { return HD_COMPUTERS.map(base=>{const c=hdComputerByName(base.name);return `<button class="hd-device-card ${hdState.selectedComputer===c.name?'active':''}" onclick="hdSelectComputer('${c.name}')"><strong>${hdEsc(c.name)}</strong><span>${hdEsc(c.user)}</span><small>${hdEsc(c.health)} · ${hdEsc(c.lastSeen)}</small></button>`}).join(''); }
VIEWS['helpdesk/windows'] = () => { const c=hdComputerByName(hdState.selectedComputer)||hdComputerByName('NS-LT-0042'); return `${hdPageHeader('Windows Desktop', 'Inspect a managed Windows 11 endpoint before choosing a repair.')}<div class="hd-endpoint-layout"><aside class="card"><div class="card-header"><strong>Endpoints</strong></div><div class="hd-device-list">${hdEndpointCards()}</div></aside><div class="hd-windows-screen"><div class="hd-window-bar"><span>${hdEsc(c.name)} · Remote session</span><span>— □ ×</span></div><div class="hd-window-body"><div class="hd-desktop-hero"><strong>Windows 11 Enterprise</strong><span>${hdEsc(c.os)}</span></div><div class="hd-field-grid"><div><span>Signed-in user</span><strong>${hdEsc(c.user)}</strong></div><div><span>IPv4</span><strong>${hdEsc(c.ip)}</strong></div><div><span>Domain trust</span><strong>${hdEsc(c.trust)}</strong></div><div><span>BitLocker</span><strong>${hdEsc(c.bitlocker)}</strong></div><div><span>OU</span><strong>${hdEsc(c.ou)}</strong></div><div><span>Health</span><strong>${hdEsc(c.health)}</strong></div></div><div class="hd-tool-grid"><button onclick="navigate('#/helpdesk/event-viewer')">📋 Event Viewer</button><button onclick="navigate('#/helpdesk/powershell')">&gt;_ PowerShell</button><button onclick="navigate('#/helpdesk/active-directory')">🗂 Directory</button><button onclick="navigate('#/helpdesk/remote-support')">🖥 Remote Support</button></div></div></div></div>`; };

const HD_EVENTS = [
  { level:'Error', time:'08:42:17', source:'NETLOGON', id:'3210', computer:'NS-LT-0131', message:'Failed to authenticate with domain controller NS-DC01.' },
  { level:'Warning', time:'08:36:04', source:'User Profile Service', id:'1511', computer:'NS-LT-0081', message:'Windows logged the user on with a temporary profile.' },
  { level:'Error', time:'08:29:51', source:'PrintService', id:'372', computer:'NS-PRINT01', message:'Print processor for LabelPro 3.8 failed.' },
  { level:'Information', time:'08:21:30', source:'GroupPolicy', id:'5312', computer:'NS-LT-0145', message:'Applied GPO list does not include Operations Drive Mapping.' },
  { level:'Warning', time:'08:14:02', source:'Disk', id:'2013', computer:'NS-FILE01', message:'The D: volume is below the configured free-space threshold.' },
  { level:'Error', time:'08:11:18', source:'Security', id:'4740', computer:'NS-DC01', message:'Account jbell was locked out; caller computer NS-LT-0117.' },
];
VIEWS['helpdesk/event-viewer'] = () => `${hdPageHeader('Event Viewer', 'Filter event evidence by endpoint, server, severity, source, and event ID.')}<div class="callout info">An event ID is evidence, not automatically the root cause. Correlate time, scope, recent change, and system state.</div><div class="card"><div class="table-wrap"><table><thead><tr><th>Level</th><th>Time</th><th>Source</th><th>Event ID</th><th>Computer</th><th>Message</th></tr></thead><tbody>${HD_EVENTS.map(e=>`<tr><td>${hdBadge(e.level,e.level==='Error'?'bad':e.level==='Warning'?'warn':'ok')}</td><td>${e.time}</td><td>${hdEsc(e.source)}</td><td>${e.id}</td><td>${hdEsc(e.computer)}</td><td>${hdEsc(e.message)}</td></tr>`).join('')}</tbody></table></div></div>`;

function hdPowerShellOutput(command) {
  const normalized=command.trim().toLowerCase(); const computer=hdComputerByName(hdState.selectedComputer)||HD_COMPUTERS[0];
  if(normalized==='get-help') return 'Supported: Get-ComputerInfo, Get-Service, Get-Process, Get-Volume, Get-Disk, Get-NetIPConfiguration, Get-WinEvent, Get-LocalUser, Get-LocalGroup, Get-ADUser, Get-ADGroup, Get-ADComputer, Resolve-DnsName, Test-NetConnection, gpresult /r, Clear-Host';
  if(normalized==='get-computerinfo') return `CsName: ${computer.name}\nWindowsProductName: Windows 11 Enterprise\nOsVersion: 10.0.26100\nCsDomain: ${HD_ORG.domain}`;
  if(normalized==='get-netipconfiguration') return `InterfaceAlias: Wi-Fi\nIPv4Address: ${computer.ip}\nIPv4DefaultGateway: ${computer.ip.startsWith('169.254')?'(none)':'10.20.10.1'}\nDNSServer: ${computer.ip.startsWith('169.254')?'(none)':'10.20.0.10, 10.20.0.11'}`;
  if(normalized==='get-service') return 'Status   Name          DisplayName\nRunning  EventLog      Windows Event Log\nRunning  WinDefend     Endpoint Protection\nStopped  Spooler       Print Spooler';
  if(normalized==='get-process') return 'Handles  CPU(s)  Id    ProcessName\n412      8.4     1148  explorer\n690      11.1    2480  browser\n221      2.7     3312  vpnclient';
  if(normalized==='get-volume') return 'DriveLetter FileSystemLabel HealthStatus SizeRemaining\nC           Windows         Healthy      118 GB\nD           Data            Warning      81 GB';
  if(normalized==='get-disk') return 'Number FriendlyName        HealthStatus OperationalStatus Size\n0      NVMe Enterprise SSD  Healthy      Online            476 GB';
  if(normalized.startsWith('get-winevent')) return HD_EVENTS.slice(0,4).map(e=>`${e.time} ${e.level} ${e.source} ${e.id} ${e.message}`).join('\n');
  if(normalized==='get-localuser') return 'Name             Enabled Description\nAdministrator    False   Built-in account\nHSL-Support      True    Managed local support';
  if(normalized==='get-localgroup') return 'Administrators\nRemote Desktop Users\nUsers';
  if(normalized.startsWith('get-aduser')) return HD_USERS.slice(0,8).map(u=>`${u.username.padEnd(12)} ${u.name.padEnd(20)} Enabled=${hdUserById(u.id).enabled}`).join('\n');
  if(normalized.startsWith('get-adgroup')) return HD_GROUPS.map(g=>`${g.name.padEnd(26)} ${g.scope} ${g.type}`).join('\n');
  if(normalized.startsWith('get-adcomputer')) return HD_COMPUTERS.map(c=>`${c.name.padEnd(14)} ${c.trust}`).join('\n');
  if(normalized.startsWith('resolve-dnsname')) return 'Name                              Type TTL Section IPAddress\npurchasing.northstar.example      A    300 Answer  10.20.0.50';
  if(normalized.startsWith('test-netconnection')) return 'ComputerName: purchasing.northstar.example\nRemotePort: 443\nInterfaceAlias: Wi-Fi\nTcpTestSucceeded: True';
  if(normalized==='gpresult /r') return `COMPUTER SETTINGS\nCN=${computer.name},${computer.ou}\nApplied Group Policy Objects: Workstation Security Baseline\n${computer.ou==='CN=Computers'?'The following GPOs were not applied: Operations Drive Mapping (link out of scope)':'Operations Drive Mapping: Applied'}`;
  return `The term '${command}' is outside this training shell. Type Get-Help for supported commands.`;
}
function hdRunPowerShell(event) {
  event.preventDefault(); const input=document.getElementById('hd-ps-input'); const command=input.value.trim(); if(!command)return;
  if(command.toLowerCase()==='clear-host'){hdState.powershell=[];} else {hdState.powershell.push({type:'command',text:`PS C:\\Support> ${command}`},{type:'output',text:hdPowerShellOutput(command)});}
  hdSave(); render();
}
VIEWS['helpdesk/powershell'] = () => `${hdPageHeader('PowerShell', `Connected to ${hdEsc(hdState.selectedComputer)} · approved read-only training commands`)}<div class="hd-terminal"><div class="hd-terminal-title">Northstar Enterprise Support Shell</div><div class="hd-terminal-output">${hdState.powershell.map(row=>`<pre class="${row.type}">${hdEsc(row.text)}</pre>`).join('')}</div><form onsubmit="hdRunPowerShell(event)" class="hd-terminal-input"><span>PS C:\\Support&gt;</span><input id="hd-ps-input" autocomplete="off" spellcheck="false" placeholder="Get-Help" autofocus><button>Run</button></form></div><div class="callout info">Command-line output is simulated and limited to the course fixtures. Use it to collect repeatable evidence for ticket notes.</div>`;

VIEWS['helpdesk/server-manager'] = () => `${hdPageHeader('Server Manager', 'Inspect Windows Server 2022 roles, services, health, and endpoint dependencies.')}<div class="hd-metric-grid">${hdMetric('Servers',HD_SERVERS.length,'2 domain controllers')}${hdMetric('Online',HD_SERVERS.filter(s=>s.status==='Online').length,'Responding to management')}${hdMetric('Degraded',HD_SERVERS.filter(s=>s.status==='Degraded').length,'Service investigation required','warning')}${hdMetric('Critical roles','AD DS · DNS · DHCP','Authentication and connectivity')}</div><div class="card"><div class="table-wrap"><table><thead><tr><th>Server</th><th>Role</th><th>Address</th><th>Status</th><th>CPU</th><th>Memory</th><th>Role / service health</th></tr></thead><tbody>${HD_SERVERS.map(s=>`<tr><td><strong>${s.name}</strong><small>${s.os}</small></td><td>${s.role}</td><td><code>${s.ip}</code></td><td>${hdBadge(s.status,s.status==='Online'?'ok':'warn')}</td><td>${s.cpu}</td><td>${s.memory}</td><td>${s.service}</td></tr>`).join('')}</tbody></table></div></div>`;
VIEWS['helpdesk/dns'] = () => `${hdPageHeader('DNS Manager', 'Validate forward records and connect name-resolution evidence to client symptoms.')}<div class="two-col"><div class="card"><div class="card-header"><strong>Forward lookup zone · ${HD_ORG.domain}</strong></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Value</th><th>TTL</th><th>Status</th></tr></thead><tbody>${HD_DNS_RECORDS.map(r=>`<tr><td><strong>${r.name}</strong></td><td>${r.type}</td><td><code>${r.value}</code></td><td>${r.ttl}</td><td>${hdBadge(r.status,r.status==='Healthy'?'ok':'warn')}</td></tr>`).join('')}</tbody></table></div></div><div class="card"><div class="card-header"><strong>Diagnostic decision</strong></div><div class="card-body">${hdList(['Confirm the client resolver, not only network reachability','Compare hostname and IP tests','Query the authoritative/internal resolver directly','Avoid hosts-file workarounds','Escalate when multiple clients or zones are affected'],true)}<pre class="hd-evidence">Resolve-DnsName purchasing.northstar.example\nServer: 10.20.0.10\nAddress: 10.20.0.50</pre></div></div></div>`;
VIEWS['helpdesk/dhcp'] = () => `${hdPageHeader('DHCP Manager', 'Inspect scope utilization, leases, reservations, and APIPA evidence.')}<div class="card"><div class="table-wrap"><table><thead><tr><th>Scope</th><th>Range</th><th>VLAN</th><th>Leased</th><th>Free</th><th>Utilization</th><th>Status</th></tr></thead><tbody>${HD_DHCP_SCOPES.map(s=>`<tr><td><strong>${s.name}</strong></td><td><code>${s.range}</code></td><td>${s.vlan}</td><td>${s.leased}</td><td>${s.free}</td><td><div class="hd-progress"><i style="width:${s.utilization}"></i></div>${s.utilization}</td><td>${hdBadge(s.status,s.status==='Active'?'ok':'warn')}</td></tr>`).join('')}</tbody></table></div></div><div class="callout warning"><strong>APIPA investigation:</strong> 169.254.44.19 on NS-LT-0094 has no lease. One device is affected; test the client interfaces before declaring a DHCP-server outage.</div>`;
VIEWS['helpdesk/group-policy'] = () => `${hdPageHeader('Group Policy Management', 'Inspect policy links, scope, versions, and resultant policy before changing configuration.')}<div class="card"><div class="table-wrap"><table><thead><tr><th>GPO</th><th>Linked to</th><th>Security filtering</th><th>Version</th><th>Status</th><th>Purpose</th></tr></thead><tbody>${HD_GPOS.map(g=>`<tr><td><strong>${g.name}</strong></td><td><code>${hdEsc(g.link)}</code></td><td>${g.scope}</td><td>${g.version}</td><td>${hdBadge(g.status,'ok')}</td><td>${g.purpose}</td></tr>`).join('')}</tbody></table></div></div><div class="two-col"><div class="card"><div class="card-header"><strong>gpresult · NS-LT-0145</strong></div><div class="card-body"><pre class="hd-evidence">Computer DN: CN=NS-LT-0145,CN=Computers\nApplied: Default Domain Policy\nDenied: Operations Drive Mapping\nReason: Link out of scope</pre></div></div><div class="card"><div class="card-header"><strong>Safe policy workflow</strong></div><div class="card-body">${hdList(['Define outcome and rollback','Confirm target OU and filtering','Test one scoped endpoint','Use gpupdate to refresh','Use gpresult to prove application','Record the change and verification'],true)}</div></div></div>`;
VIEWS['helpdesk/file-server'] = () => `${hdPageHeader('File Server', 'Calculate effective access across share permissions, NTFS permissions, groups, and inheritance.')}<div class="two-col"><div class="card"><div class="card-header"><strong>Shares · NS-FILE01</strong></div><div class="table-wrap"><table><thead><tr><th>Share</th><th>UNC path</th><th>Share permission</th><th>NTFS model</th><th>Status</th></tr></thead><tbody><tr><td>Finance</td><td><code>\\NS-FILE01\Finance</code></td><td>Authenticated Users · Change</td><td>GG-Finance-Contributors · Modify</td><td>${hdBadge('Warning','warn')}</td></tr><tr><td>HR</td><td><code>\\NS-FILE01\HR</code></td><td>HR Users · Change</td><td>Readers / Contributors groups</td><td>${hdBadge('Healthy','ok')}</td></tr><tr><td>Operations</td><td><code>\\NS-FILE01\Operations</code></td><td>Operations Users · Change</td><td>GG-Operations-Drive · Modify</td><td>${hdBadge('Healthy','ok')}</td></tr></tbody></table></div></div><div class="card"><div class="card-header"><strong>Effective access · Evan Parker</strong></div><div class="card-body"><dl class="hd-dl"><dt>Share</dt><dd>Change</dd><dt>NTFS</dt><dd>Read &amp; Execute</dd><dt>Effective network access</dt><dd>${hdBadge('Read only','warn')}</dd><dt>Evidence</dt><dd>Not a member of GG-Finance-Contributors</dd></dl><div class="callout info">Use an approved security group. Do not add a direct user ACL to bypass the access model.</div></div></div></div>`;
function hdPrinter(name){const base=HD_PRINTERS.find(p=>p.name===name);return {...base,...(hdState.printerOverrides[name]||{})};}
function hdPrinterAction(name,action){const p=hdPrinter(name);const patch=hdState.printerOverrides[name]||{};if(action==='resume'){patch.status='Ready';}if(action==='clear'){patch.queue=0;}hdState.printerOverrides[name]=patch;hdSave();toast(`${name}: ${action} completed in the simulation.`);render();}
VIEWS['helpdesk/printers'] = () => `${hdPageHeader('Printer Management', 'Inspect print servers, access groups, drivers, ports, and queued jobs.')}<div class="card"><div class="table-wrap"><table><thead><tr><th>Printer</th><th>Location</th><th>Server</th><th>Driver</th><th>Jobs</th><th>Access group</th><th>Status</th><th>Actions</th></tr></thead><tbody>${HD_PRINTERS.map(base=>{const p=hdPrinter(base.name);return `<tr><td><strong>${p.name}</strong></td><td>${p.location}</td><td>${p.server}</td><td>${p.driver}</td><td>${p.queue}</td><td>${p.group}</td><td>${hdBadge(p.status,p.status==='Ready'?'ok':p.status==='Paused'?'warn':'bad')}</td><td><button class="btn btn-sm btn-secondary" onclick="hdPrinterAction('${p.name}','resume')">Resume</button> <button class="btn btn-sm btn-ghost" onclick="hdPrinterAction('${p.name}','clear')">Clear training jobs</button></td></tr>`}).join('')}</tbody></table></div></div><div class="callout warning">Preserve confidential jobs and print-service evidence before clearing a production queue. The warehouse failure points to a driver crash, not a network outage.</div>`;
VIEWS['helpdesk/endpoint-security'] = () => `${hdPageHeader('Endpoint Security', 'Help desk technicians gather facts and perform approved first response; cybersecurity owns incident investigation.')}<div class="card"><div class="table-wrap"><table><thead><tr><th>Alert</th><th>Severity</th><th>User / device</th><th>Signal</th><th>Status</th><th>Owner</th></tr></thead><tbody>${HD_SECURITY_ALERTS.map(a=>`<tr><td><strong>${a.title}</strong><small>${a.id}</small></td><td>${hdBadge(a.severity,a.severity==='High'?'bad':'warn')}</td><td>${a.user}<small>${a.device}</small></td><td>${a.signal}</td><td>${hdBadge(a.status,a.status==='Needs escalation'?'bad':'warn')}</td><td>${a.owner}</td></tr>`).join('')}</tbody></table></div></div><div class="three-col">${['Preserve evidence','Protect the account or endpoint only within authority','Warm hand off with facts, timestamps, impact, and actions'].map((x,i)=>`<div class="card"><div class="card-body"><strong>${i+1}. ${x}</strong><p class="muted">${['Do not delete messages, extensions, files, or logs.','Follow the approved response runbook; do not improvise containment.','Never promise that a device or account is safe before security validates it.'][i]}</p></div></div>`).join('')}</div>`;
VIEWS['helpdesk/knowledge-base'] = () => `${hdPageHeader('Knowledge Base', 'Use approved runbooks, then improve them with validated symptoms, evidence, resolution, and escalation boundaries.')}<div class="hd-kb-grid">${HD_KB_ARTICLES.map(k=>`<article class="card"><div class="card-header"><strong>${k.id}</strong>${hdBadge(k.category)}</div><div class="card-body"><h3>${k.title}</h3><p>${k.summary}</p><small>${k.audience} · Updated ${k.updated}</small></div></article>`).join('')}</div>`;
VIEWS['helpdesk/remote-support'] = () => {const c=hdComputerByName(hdState.selectedComputer)||HD_COMPUTERS[0];return `${hdPageHeader('Remote Support', 'Obtain consent, explain actions, protect privacy, and leave the endpoint in a verified state.')}<div class="two-col"><div class="card"><div class="card-header"><strong>Session target</strong>${hdBadge(c.health,c.health==='Healthy'?'ok':'warn')}</div><div class="card-body"><select class="select" onchange="hdSelectComputer(this.value,'#/helpdesk/remote-support')">${HD_COMPUTERS.map(x=>`<option ${x.name===c.name?'selected':''}>${x.name}</option>`).join('')}</select><dl class="hd-dl"><dt>User</dt><dd>${c.user}</dd><dt>Last seen</dt><dd>${c.lastSeen}</dd><dt>Address</dt><dd>${c.ip}</dd><dt>Domain trust</dt><dd>${c.trust}</dd></dl><button class="btn btn-primary" onclick="toast('Consent request sent to ${hdEsc(c.user)}.')">Request session consent</button></div></div><div class="card"><div class="card-header"><strong>Remote-support checklist</strong></div><div class="card-body">${hdList(['Verify the requester and ticket','Explain what you need to inspect','Ask before viewing personal or sensitive content','Narrate material actions','Stop if security indicators appear','Verify the fix with the user','End the session and document it'],true)}</div></div></div>`;};
VIEWS['helpdesk/environment'] = () => `${hdPageHeader('Enterprise Map', `${HD_ORG.name} · persistent fictional training environment`)}<div class="three-col"><div class="card"><div class="card-header"><strong>Identity</strong></div><div class="card-body"><h2>${HD_USERS.length} users</h2><p>${HD_GROUPS.length} modeled groups · ${HD_ORG.domain}</p><button class="btn btn-secondary" onclick="navigate('#/helpdesk/active-directory')">Open directory</button></div></div><div class="card"><div class="card-header"><strong>Endpoints</strong></div><div class="card-body"><h2>${HD_COMPUTERS.length} Windows devices</h2><p>Managed Windows 11 laptops and workstations</p><button class="btn btn-secondary" onclick="navigate('#/helpdesk/windows')">Open endpoints</button></div></div><div class="card"><div class="card-header"><strong>Infrastructure</strong></div><div class="card-body"><h2>${HD_SERVERS.length} servers</h2><p>AD DS, DNS, DHCP, file, print, and applications</p><button class="btn btn-secondary" onclick="navigate('#/helpdesk/server-manager')">Open servers</button></div></div></div><div class="card"><div class="card-header"><strong>Support model</strong></div><div class="table-wrap"><table><thead><tr><th>Tier</th><th>Owner</th><th>Typical scope</th></tr></thead><tbody>${HD_ORG.supportTiers.map(t=>`<tr><td><strong>${t.tier}</strong></td><td>${t.owner}</td><td>${t.scope}</td></tr>`).join('')}</tbody></table></div></div><div class="card"><div class="card-header"><strong>SLA model</strong></div><div class="table-wrap"><table><thead><tr><th>Priority</th><th>Response</th><th>Resolution target</th><th>Use when</th></tr></thead><tbody>${HD_ORG.slas.map(s=>`<tr><td>${hdBadge(s.priority,s.priority.toLowerCase())}</td><td>${s.response}</td><td>${s.resolve}</td><td>${s.use}</td></tr>`).join('')}</tbody></table></div></div>`;

window.hdSelectTicket=hdSelectTicket; window.hdSetQueueFilter=hdSetQueueFilter; window.hdSetPriorityFilter=hdSetPriorityFilter;
window.hdAssignTicket=hdAssignTicket; window.hdTransitionTicket=hdTransitionTicket; window.hdSetTicketPriority=hdSetTicketPriority;
window.hdAddNote=hdAddNote; window.hdContactRequester=hdContactRequester; window.hdSubmitDiagnosis=hdSubmitDiagnosis; window.hdResolveTicket=hdResolveTicket;
window.hdLinkProblem=hdLinkProblem; window.hdResetShift=hdResetShift; window.hdOpenUser=hdOpenUser;
window.hdSetAdTab=hdSetAdTab; window.hdAdAction=hdAdAction; window.hdSelectComputer=hdSelectComputer;
window.hdRunPowerShell=hdRunPowerShell; window.hdPrinterAction=hdPrinterAction;
