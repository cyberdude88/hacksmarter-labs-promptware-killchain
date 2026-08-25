#!/usr/bin/env node
// Vendor-terminology leak check: render EVERY registered view in a node vm
// (same harness as bin/render_all.js), run the output through the live
// ui/neutral-terminology.js's neutralizeTerminology(), and fail non-zero if
// any of the plan's blocked terms (Microsoft, Defender, Sentinel, Purview,
// Entra, Azure, Copilot, M365 — see docs/DEMICROSOFTING_PLAN.md) survives
// post-neutralization, in ANY view.
//
// neutralizeTerminology() is a pure string function with no notion of the
// `.wl-helpdesk` DOM carve-out (isHelpDeskTechnicalContent) — that guard
// lives one layer up, in neutralizeElement/neutralizeTree, deciding whether
// to call neutralizeTerminology() on a given live DOM node at all. This vm
// harness has no live DOM and never calls that layer, so it always fully
// neutralizes every view's html, helpdesk included — meaning a clean run
// here does NOT by itself prove the carve-out is scoped correctly (a
// neutralizeTerminology() bug and a wrongly-scoped carve-out are different
// failure modes). This script instead verifies the carve-out itself
// statically: it re-reads isHelpDeskTechnicalContent's source and asserts
// it still gates on exactly `wl-helpdesk` + `#content, #sidenav` — see
// "carve-out scope check" below. It also reports, purely informationally,
// which blocked terms exist in helpdesk views' RAW pre-neutralization html
// (i.e. what the live carve-out is actually preserving on purpose).
//
// Also reports (informationally, does not affect exit code) any raw
// pre-neutralization occurrence of a broader rename-map term
// (docs/DEMICROSOFTING_PLAN.md's rename map table) that is still present,
// unchanged, after neutralization — i.e. a term with no pattern actually
// covering it, surfaced even when nothing on the blocked list currently
// depends on it.
//
// Usage: node bin/neutral-check.js   (exit 0 = clean)
const fs = require('fs'), vm = require('vm'), path = require('path');
const UI = path.join(__dirname, '..', 'ui');

// Same stub environment as render_all.js, with one fix: window/document
// targets are real objects the get/set traps read and write through (instead
// of an always-{} target), so `window.neutralizeTerminology = fn` set by
// neutral-terminology.js is actually retrievable afterward. Also adds the
// minimal Element/Node/NodeFilter/MutationObserver globals that file's
// module-load-time DOM sweep touches, so it loads without throwing.
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(`
var localStorage = { _s:{}, getItem(k){ return this._s[k] ?? null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; }, length:0, key(){ return null; } };
var sessionStorage = { _s:{}, getItem(k){ return this._s[k] ?? null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; }, length:0, key(){ return null; } };
const elStub = () => new Proxy(function(){}, { get: (t, p) => {
  if (p === 'style' || p === 'dataset') return {};
  if (p === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
  if (p === 'children' || p === 'childNodes') return [];
  if (p === Symbol.toPrimitive || p === 'toString') return () => '';
  if (p === 'innerHTML' || p === 'textContent' || p === 'value' || p === 'id' || p === 'className') return '';
  return typeof p === 'symbol' ? undefined : ((...a) => elStub());
}, set: () => true, apply: () => elStub() });
class Element {}
class Node { static TEXT_NODE = 3; }
var NodeFilter = { SHOW_ELEMENT: 1, SHOW_TEXT: 4 };
class MutationObserver { constructor(cb) { this.cb = cb; } observe(){} disconnect(){} }
const windowTarget = {};
var window = new Proxy(windowTarget, { get: (t, p) => {
  if (p in t) return t[p];
  if (p === 'location') return { hash: '#/defender/home' };
  if (p === 'addEventListener' || p === 'dispatchEvent' || p === 'requestAnimationFrame') return () => {};
  return undefined;
}, set: (t, p, v) => { t[p] = v; return true; } });
const documentTarget = { title: '' };
var document = new Proxy(documentTarget, { get: (t, p) => {
  if (p in t) return t[p];
  if (p === 'querySelectorAll') return () => [];
  if (p === 'body' || p === 'documentElement') return elStub();
  if (p === 'addEventListener') return () => {};
  if (p === 'createTreeWalker') return () => ({ nextNode: () => null });
  return (...a) => elStub();
}, set: (t, p, v) => { t[p] = v; return true; } });
var location = { hash: '#/xdr/home', reload(){} };
var history = { replaceState(){}, pushState(){} };
var navigator = { clipboard: null };
function requestAnimationFrame(){}
function setInterval(){ return 0; } function clearInterval(){}
function setTimeout(){ return 0; } function clearTimeout(){}
`, ctx);
// Same load order as render_all.js — workflow-automation.js after app.js
// (overrides a VIEWS entry), neutral-terminology.js last so it observes the
// fully-populated VIEWS/NAV world (it doesn't touch those directly, but this
// keeps load order identical to index.html).
for (const f of ['data.js', 'helpdesk-data.js', 'lab-widgets.js', 'views.js', 'app.js', 'workflow-automation.js', 'helpdesk.js', 'neutral-terminology.js']) {
  try { vm.runInContext(fs.readFileSync(path.join(UI, f), 'utf8'), ctx); }
  catch (e) { console.log(`load note (${f}): ${e.message.slice(0, 100)}`); }
}

const report = vm.runInContext(`
(() => {
  // The plan's Acceptance Criteria list, verbatim — the hard-fail set.
  const BLOCKED = ['Microsoft', 'Defender', 'Sentinel', 'Purview', 'Entra', 'Azure', 'Copilot', 'M365'];
  // Broader coverage watchlist, drawn from docs/DEMICROSOFTING_PLAN.md's rename
  // map table "Current term" column (informational only — never fails the run).
  const WATCH = [
    'Microsoft', 'Microsoft Security Copilot', 'Copilot', 'Defender XDR', 'Microsoft Sentinel',
    'Sentinel', 'Microsoft Purview', 'Purview', 'Microsoft Entra', 'Entra', 'Azure',
    'Microsoft 365', 'M365', 'Microsoft Teams', 'SharePoint', 'OneDrive', 'Exchange',
    'Defender portal',
  ];
  // Inline event-handler attributes (onclick="runSentinelEntityPlaybook(...)",
  // onchange="setM365UserFilter(...)", etc.) hold real internal JS identifiers
  // — function/variable names, a compatibility contract per Hard rule 4, never
  // learner-visible text. The live DOM neutralizer already only walks text
  // nodes plus a small display-attribute allowlist (title/aria-label/alt/
  // placeholder/data-tip) and never touches onXxx attributes either. Strip
  // them before scanning so this check measures the same "is this actually
  // shown to a learner" surface, not JS source text that happens to be
  // embedded in an HTML attribute.
  const stripHandlers = (s) => typeof s === 'string' ? s.replace(/\\son[a-z]+=("[^"]*"|'[^']*')/gi, '') : s;
  // Compound-identifier-aware match: scan every case-insensitive occurrence
  // of the term, but only count one whose immediate neighbor characters
  // (checked case-SENSITIVELY, deliberately not via a single case-insensitive
  // regex — a combined /i pattern can't tell an uppercase neighbor from a
  // lowercase one) are not lowercase a-z letters. A plain \\bTerm\\b would
  // miss real compound leaks the project already treats as in-scope
  // (CopilotInteraction, AzureAD, SentinelDataLake — no space, but a genuine
  // token boundary via case change/underscore/punctuation), while pure
  // substring search produces false positives from ordinary English words
  // that happen to contain the term ("Entra" inside "concentrated"/
  // "centralized"/"us-central1", "Azure" inside the color word "azure").
  // Rejecting only lowercase-letter adjacency threads that needle:
  // MSOL_AzureSync and SentinelDataLake still match (glued to "_"/
  // start-of-string and an uppercase letter), "concentrated" does not
  // (glued to lowercase "c" on both sides).
  const isLower = (ch) => !!ch && ch >= 'a' && ch <= 'z';
  function findMatch(s, t) {
    if (typeof s !== 'string') return -1;
    const hay = s.toLowerCase(), needle = t.toLowerCase();
    let from = 0;
    while (true) {
      const idx = hay.indexOf(needle, from);
      if (idx === -1) return -1;
      const before = s[idx - 1], after = s[idx + t.length];
      if (!isLower(before) && !isLower(after)) return idx;
      from = idx + 1;
    }
  }
  const has = (s, t) => findMatch(s, t) !== -1;
  const snippetAt = (s, t) => {
    const idx = findMatch(s, t);
    if (idx === -1) return '';
    return s.slice(Math.max(0, idx - 40), idx + t.length + 40).replace(/\\s+/g, ' ').trim();
  };

  const out = { totalViews: 0, checked: 0, noHtml: [], mountTime: [], hardFails: [], helpdeskRawTerms: [], infoGaps: [] };
  for (const key of Object.keys(VIEWS)) {
    out.totalViews++;
    let v;
    try { v = VIEWS[key](); } catch (e) { out.noHtml.push(key + ': throws ' + e.message.slice(0, 80)); continue; }
    const html = typeof v === 'string' ? v : (v && typeof v.html === 'string' ? v.html : null);
    if (html == null) { out.noHtml.push(key + ': no html returned'); continue; }
    const isMountTime = !!(v && typeof v.onMount === 'function');
    if (isMountTime) out.mountTime.push(key);
    out.checked++;

    const workload = key.split('/')[0];
    const isHelpdesk = workload === 'helpdesk';
    const visibleHtml = stripHandlers(html);
    const post = stripHandlers(window.neutralizeTerminology(html));

    // Uniform hard-fail check — neutralizeTerminology() itself has no
    // helpdesk awareness, so every view (helpdesk included) must come out
    // fully clean here. This is testing pattern coverage, not the separate
    // DOM carve-out (see file header).
    for (const term of BLOCKED) {
      if (has(post, term)) {
        out.hardFails.push({ route: key, term, snippet: snippetAt(post, term), mountTime: isMountTime });
      }
    }
    // Informational: which blocked terms exist in a helpdesk view's RAW
    // (pre-neutralization) html — i.e. what the live .wl-helpdesk carve-out
    // is actually choosing to preserve on purpose in the real browser.
    if (isHelpdesk) {
      for (const term of BLOCKED) {
        if (has(visibleHtml, term)) out.helpdeskRawTerms.push({ route: key, term, snippet: snippetAt(visibleHtml, term) });
      }
    }
    for (const term of WATCH) {
      if (BLOCKED.includes(term)) continue; // already reported above
      if (has(visibleHtml, term) && has(post, term)) {
        out.infoGaps.push({ route: key, term, snippet: snippetAt(post, term), helpdesk: isHelpdesk });
      }
    }
  }
  return JSON.stringify(out);
})()
`, ctx);

// Static carve-out scope check: isHelpDeskTechnicalContent must still gate on
// `wl-helpdesk`, exempt all of `#content` (the current view — only ever
// helpdesk content when wl-helpdesk is active), and — since #sidenav is a
// single global rail shared by every workload, not helpdesk-specific — only
// exempt #sidenav rows whose own `data-route` is a `#/helpdesk/...` route,
// not the whole rail. A blanket `#sidenav` match here would leak every OTHER
// workload's nav labels while a helpdesk page is open (this was a real,
// confirmed bug — see this file's Sprint 1 notes in
// docs/DEMICROSOFTING_PROGRESS.md). Re-reads the source rather than
// exercising it through a real DOM (which this vm harness does not have).
const ntSource = fs.readFileSync(path.join(UI, 'neutral-terminology.js'), 'utf8');
const guardMatch = ntSource.match(/function isHelpDeskTechnicalContent\([^)]*\)\s*\{([\s\S]*?)\n\s*\}/);
const guardBody = guardMatch ? guardMatch[1] : '';
const guardOk = /classList\.contains\(\s*['"]wl-helpdesk['"]\s*\)/.test(guardBody) &&
  /closest\(\s*['"]#content['"]\s*\)/.test(guardBody) &&
  /closest\(\s*['"]#sidenav \[data-route\]['"]\s*\)/.test(guardBody) &&
  /helpdesk/.test(guardBody) &&
  !/closest\(\s*['"]#content,\s*#sidenav['"]\s*\)/.test(guardBody);
console.log(`carve-out scope check: isHelpDeskTechnicalContent ${guardOk ? 'gates on .wl-helpdesk, all of #content, and only helpdesk-owned #sidenav rows (not the whole global rail)' : 'DOES NOT MATCH the expected scope — review ui/neutral-terminology.js'}`);
if (!guardOk) process.exitCode = 1;

const r = JSON.parse(report);
console.log(`neutral-check: ${r.checked}/${r.totalViews} views checked (${r.mountTime.length} mount-time — only their static html field is checked, onMount-injected content is not; ${r.noHtml.length} skipped, no html)`);
if (r.noHtml.length) for (const n of r.noHtml) console.log('  SKIP: ' + n);
if (r.helpdeskRawTerms.length) {
  console.log(`\nhelpdesk views' raw (pre-neutralization) blocked-term occurrences — what the live .wl-helpdesk carve-out is expected to preserve on purpose, informational only — ${r.helpdeskRawTerms.length} occurrence(s):`);
  for (const c of r.helpdeskRawTerms) console.log(`  #/${c.route}: "${c.term}" — ...${c.snippet}...`);
}
if (r.infoGaps.length) {
  console.log(`\nINFO — raw term present pre-neutralization with no pattern covering it (not a failure, review for a future pattern) — ${r.infoGaps.length} occurrence(s):`);
  for (const g of r.infoGaps) console.log(`  #/${g.route}${g.helpdesk ? ' (helpdesk)' : ''}: "${g.term}" — ...${g.snippet}...`);
}
if (r.hardFails.length) {
  console.log(`\nFAIL — blocked term survives neutralizeTerminology() — ${r.hardFails.length} occurrence(s):`);
  for (const f of r.hardFails) console.log(`  #/${f.route}${f.mountTime ? ' (mount-time, static html only)' : ''}: "${f.term}" — ...${f.snippet}...`);
} else {
  console.log('\nclean: no blocked term survives neutralizeTerminology() in any view.');
}
if (r.hardFails.length) process.exitCode = 1;
process.exit(process.exitCode || 0);
