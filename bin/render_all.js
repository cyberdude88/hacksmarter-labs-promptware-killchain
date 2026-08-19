#!/usr/bin/env node
// Render EVERY registered view in a node vm and report failures.
// Also sweeps NAV routes vs VIEWS registrations (the no-404 invariant).
// Usage: node bin/render_all.js   (exit 0 = all clean)
const fs = require('fs'), vm = require('vm'), path = require('path');
const UI = path.join(__dirname, '..', 'ui');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(`
var localStorage = { _s:{}, getItem(k){ return this._s[k] ?? null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
var sessionStorage = { _s:{}, getItem(k){ return this._s[k] ?? null; }, setItem(k,v){ this._s[k]=String(v); }, removeItem(k){ delete this._s[k]; } };
const elStub = () => new Proxy(function(){}, { get: (t, p) => {
  if (p === 'style' || p === 'dataset') return {};
  if (p === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
  if (p === 'children' || p === 'childNodes') return [];
  if (p === Symbol.toPrimitive || p === 'toString') return () => '';
  if (p === 'innerHTML' || p === 'textContent' || p === 'value' || p === 'id' || p === 'className') return '';
  return typeof p === 'symbol' ? undefined : ((...a) => elStub());
}, set: () => true, apply: () => elStub() });
var window = new Proxy({}, { get: (t, p) => {
  if (p === 'location') return { hash: '#/defender/home' };
  if (p === 'addEventListener' || p === 'dispatchEvent' || p === 'requestAnimationFrame') return () => {};
  return undefined;
}, set: () => true });
var document = new Proxy({}, { get: (t, p) => {
  if (p === 'querySelectorAll') return () => [];
  if (p === 'body' || p === 'documentElement') return elStub();
  if (p === 'addEventListener') return () => {};
  return (...a) => elStub();
}, set: () => true });
var location = { hash: '#/defender/home', reload(){} };
var history = { replaceState(){}, pushState(){} };
var navigator = { clipboard: null };
function requestAnimationFrame(){}
function setInterval(){ return 0; } function clearInterval(){}
function setTimeout(){ return 0; } function clearTimeout(){}
`, ctx);
// workflow-automation.js must load after app.js — it overrides a VIEWS entry.
for (const f of ['data.js', 'helpdesk-data.js', 'lab-widgets.js', 'views.js', 'app.js', 'workflow-automation.js', 'helpdesk.js']) {
  try { vm.runInContext(fs.readFileSync(path.join(UI, f), 'utf8'), ctx); }
  catch (e) { console.log(`load note (${f}): ${e.message.slice(0, 100)}`); }
}

const report = vm.runInContext(`
(() => {
  const out = { total: 0, fails: [], deadNav: [], rendered: 0 };
  const routes = [];
  for (const wl of Object.keys(NAV)) for (const it of NAV[wl]) if (it.route) routes.push(it.route.slice(2));
  for (const r of routes) if (!VIEWS[r]) out.deadNav.push(r);
  for (const key of Object.keys(VIEWS)) {
    out.total++;
    try {
      let v = VIEWS[key]();
      const html = typeof v === 'string' ? v : (v && v.html);
      if (typeof html !== 'string' || html.length < 100) { out.fails.push(key + ': tiny/empty render'); continue; }
      if (/>undefined</.test(html) || /undefined undefined/.test(html)) { out.fails.push(key + ': "undefined" in output'); continue; }
      out.rendered++;
    } catch (e) { out.fails.push(key + ': throws ' + e.message.slice(0, 90)); }
  }
  return JSON.stringify(out);
})()
`, ctx);
const r = JSON.parse(report);
console.log(`views: ${r.rendered}/${r.total} render clean; dead NAV routes: ${r.deadNav.length}`);
for (const d of r.deadNav) console.log('  DEAD NAV: #/' + d);
for (const f of r.fails) console.log('  FAIL: ' + f);
process.exit(r.fails.length || r.deadNav.length ? 1 : 0);
