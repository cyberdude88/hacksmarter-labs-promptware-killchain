// One-time migration of browser-storage keys.
//
// Lab state used to live under `defender-lab.*`, with vendor product names in
// the middle segments too (`.copilot.`, `.entra.`, `.sentinel.`,
// `.defender-cloud.`, `.m365.`). Keys are visible to anyone who opens devtools,
// so they follow the same no-vendor-names rule as the routes and the visible
// copy: everything now lives under `hsl.*` with the neutral workload ids.
//
// Renaming the keys alone would silently orphan the state of anyone who had
// already used the range — their filters, drafts, and created rules would still
// be in storage but under names nothing reads. This walks both stores once and
// carries that state across.
//
// Loads before every other script, so no reader can race it.
(function () {
  'use strict';

  var DONE = 'hsl.migrated.v1';
  var SEGMENTS = [
    ['.defender-cloud.', '.cloud.'],
    ['.sentinel.', '.siem.'],
    ['.copilot.', '.ai-agent.'],
    ['.entra.', '.identity.'],
    ['.m365.', '.workspace.'],
  ];

  function rename(key) {
    var out = 'hsl.' + key.slice('defender-lab.'.length);
    for (var i = 0; i < SEGMENTS.length; i++) {
      out = out.split(SEGMENTS[i][0]).join(SEGMENTS[i][1]);
    }
    return out;
  }

  function migrate(store) {
    var old = [];
    for (var i = 0; i < store.length; i++) {
      var k = store.key(i);
      if (k && k.indexOf('defender-lab.') === 0) old.push(k);
    }
    old.forEach(function (k) {
      var next = rename(k);
      // Never clobber state already written under the new name — a value the
      // current code produced is fresher than anything left behind.
      if (store.getItem(next) === null) store.setItem(next, store.getItem(k));
      store.removeItem(k);
    });
    return old.length;
  }

  try {
    if (localStorage.getItem(DONE)) return;
    migrate(localStorage);
    migrate(sessionStorage);
    localStorage.setItem(DONE, new Date().toISOString());
  } catch (_) {
    // Storage can be unavailable (private mode, blocked cookies). The range
    // still runs without persistence, so a failed migration is not fatal.
  }
})();
