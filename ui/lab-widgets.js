// Reusable interaction primitives for locally-generated (goose) views.
// This is the ONLY place generated views may reach persistent state through;
// drafts themselves are banned from touching localStorage/document directly.
// All state lives under localStorage keys prefixed 'lab.' as JSON arrays/values.

function labList(key) {
  try { return JSON.parse(localStorage.getItem('lab.' + key)) || []; }
  catch { return []; }
}
function labGet(key, dflt) {
  try { const v = JSON.parse(localStorage.getItem('lab.' + key)); return v === null || v === undefined ? dflt : v; }
  catch { return dflt; }
}
function labSet(key, val, msg) {
  localStorage.setItem('lab.' + key, JSON.stringify(val));
  if (msg) toast(msg);
  window.dispatchEvent(new HashChangeEvent('hashchange')); // re-render current view
}
function labPush(key, obj, msg) {
  const l = labList(key); l.push(obj); labSet(key, l, msg);
}
function labRemoveAt(key, idx, msg) {
  const l = labList(key); l.splice(idx, 1); labSet(key, l, msg);
}
function labToggleFlag(key, id, msg) {
  // maintains a list of ids; membership = flag on
  const l = labList(key); const i = l.indexOf(id);
  if (i === -1) l.push(id); else l.splice(i, 1);
  labSet(key, l, msg);
}

// Render helpers for compiled/generated views (avoid nested template literals)
function labTag(text, tone) { return '<span class="tag ' + (tone || '') + '">' + esc(text) + '</span>'; }
function labSev(level) {
  const l = String(level).toLowerCase();
  const c = (l === 'critical' || l === 'high' || l === 'over') ? 'high' : (l === 'medium' ? 'medium' : 'low');
  return '<span class="sev ' + c + '">' + esc(level) + '</span>';
}
