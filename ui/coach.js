// The Hack Smarter coach — a docked guide that turns the full simulator into
// a module-sized mini environment.
//
// Why an overlay instead of a second, smaller app: the simulator already holds
// every view a module needs. A separate "beginner build" would fork the shell,
// the nav, and the fixtures, and the two copies would drift. So the coach adds
// two things on top of the untouched app and nothing else:
//
//   1. step-by-step instructions that spotlight real elements in real views
//   2. a scope lock — while a coach runs, only its `allow` routes are reachable
//
// It hooks the app at exactly two points, both in app.js: navigate() asks
// coachAllowsRoute() before moving, and render() calls coachAfterRender().
// Everything else here is self-contained.
//
// Entry: ?coach=<id> on the simulator URL (the portal module page links that
// way). State survives reload in sessionStorage.

(function () {
  'use strict';

  const STATE_KEY = 'hsl.coach.state';
  let state = null;           // { id, step }
  let lastDeniedAt = 0;

  const coachById = id => (typeof MODULE_COACHES === 'undefined' ? [] : MODULE_COACHES)
    .find(c => c.id === id) || null;
  const activeCoach = () => (state ? coachById(state.id) : null);
  const activeStep = () => {
    const coach = activeCoach();
    return coach ? coach.steps[state.step] || null : null;
  };

  function saveState() {
    try {
      if (state) sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
      else sessionStorage.removeItem(STATE_KEY);
    } catch { /* private mode — the coach still works, it just forgets on reload */ }
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return coachById(parsed && parsed.id) ? parsed : null;
    } catch { return null; }
  }

  // The portal half of the app, derived the same way portal/app.js derives the
  // simulator: local development is two ports, deployment is one origin with
  // the simulator mounted under /sim/.
  function portalUrl(hash, completionToken) {
    const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
    const base = local
      ? `${location.protocol}//${location.hostname}:8768/`
      : location.origin + location.pathname.replace(/sim\/?$/, '');
    const completion = completionToken ? `?coachComplete=${encodeURIComponent(completionToken)}` : '';
    return base + completion + (hash || '');
  }

  // ---------- scope lock ----------

  // Called by navigate(). Returns false for anything outside the running
  // coach's mini environment, which is what makes this a slice of the app
  // rather than the whole console with advice on top.
  function coachAllowsRoute(hash) {
    const coach = activeCoach();
    if (!coach || !coach.allow) return true;
    if (coach.allow.includes(hash)) return true;
    // Debounced: a blocked click can fire twice through nav and hashchange.
    if (Date.now() - lastDeniedAt > 400) {
      lastDeniedAt = Date.now();
      if (typeof toast === 'function') {
        const pages = coach.allow.length === 1 ? 'the one page' : `the ${coach.allow.length} pages`;
        toast(`Module ${coach.module} lab: stay in ${pages} this lab uses. Exit the coach to explore freely.`);
      }
    }
    return false;
  }

  // Dim what the lock excludes, so the boundary is visible instead of just
  // being felt when a click does nothing.
  function applyScopeLock() {
    const coach = activeCoach();
    document.body.classList.toggle('coach-locked', Boolean(coach && coach.allow));
    document.querySelectorAll('#sidenav .navitem').forEach(li => {
      const route = li.dataset.route;
      const blocked = Boolean(coach && coach.allow && route && !coach.allow.includes(route));
      li.classList.toggle('coach-out-of-scope', blocked);
    });
  }

  // ---------- rendering ----------

  function clearSpotlight() {
    document.querySelectorAll('.coach-spotlight').forEach(el => el.classList.remove('coach-spotlight'));
    document.querySelectorAll('.coach-required').forEach(el => el.classList.remove('coach-required'));
    document.body.classList.remove('coach-focus-lock');
    const scrim = document.getElementById('coach-scrim');
    if (scrim) scrim.hidden = true;
  }

  // ---------- required-action lock ----------
  //
  // A step marked `require` is the student's to perform. The console stays
  // readable — dimmed, not hidden, so they still see what a real queue looks
  // like — but only the highlighted control answers to the mouse. Without this
  // a "click the alert" step turns into a tour of the whole console, which is
  // the capstone's freedom handed to someone in their first hour.
  function requiredStep() {
    const step = activeStep();
    return state && step && step.require && step.target ? step : null;
  }

  function applyRequiredLock() {
    const step = requiredStep();
    document.body.classList.toggle('coach-focus-lock', Boolean(step));
    const scrim = document.getElementById('coach-scrim');
    if (scrim) scrim.hidden = !step;
    if (!step) return;
    document.querySelectorAll(step.target).forEach(el => el.classList.add('coach-required'));
  }

  // Capture phase: the simulator wires most actions as inline onclick, which
  // fire at the target, so stopping the event on the way down is what actually
  // blocks them.
  function guardClick(event) {
    const step = requiredStep();
    if (!step) return;
    const node = event.target.nodeType === 1 ? event.target : event.target.parentElement;
    if (node && node.closest('.coach-required, #coach-panel, #toast')) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof toast === 'function') {
      toast(step.nudge || 'This step is yours — use the highlighted control.');
    }
  }

  // Side panels open against the right edge, which is where the dock lives. When
  // a step's evidence is inside one, the dock gets out of its way instead of
  // covering the thing it just told the student to read.
  function avoidSidePanels() {
    const open = document.querySelector('.sidepanel:not(.hidden)');
    document.body.classList.toggle('coach-shift-left', Boolean(state && open));
  }

  function applySpotlight() {
    avoidSidePanels();
    clearSpotlight();
    const step = activeStep();
    if (!step || !step.target) return;
    const targets = document.querySelectorAll(step.target);
    targets.forEach(el => el.classList.add('coach-spotlight'));
    applyRequiredLock();
    if (targets[0] && typeof targets[0].scrollIntoView === 'function') {
      targets[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function panelEl() { return document.getElementById('coach-panel'); }

  function renderSteps() {
    const coach = activeCoach();
    const step = activeStep();
    if (!step) { stop(); return; }
    panelEl().classList.add('coach-bar');
    document.body.classList.add('coach-bar-open');
    const last = state.step === coach.steps.length - 1;
    const gated = typeof step.check === 'function' && !step.check() && typeof step.do === 'function';
    const demoOnly = !step.check && typeof step.do === 'function' && !step._done;
    // A step with `check` and no `do` is the student's to perform: the coach
    // spotlights the control and waits. The button stays live rather than
    // disabled so it can answer "have I done it yet?" instead of dead-ending.
    const waiting = typeof step.check === 'function' && !step.check() && typeof step.do !== 'function';

    // One line of instruction, the dots, and a way out. The teaching text lives
    // behind "Why this matters" so the bar never competes with the console it is
    // pointing at, and an action step carries no Next button at all: doing the
    // thing is what advances it.
    const done = i => i < state.step;
    panelEl().innerHTML = `
      <div class="coach-bar-dots" role="progressbar" aria-label="Walkthrough progress"
           aria-valuemin="1" aria-valuemax="${coach.steps.length}" aria-valuenow="${state.step + 1}">
        ${coach.steps.map((_, i) => `<span class="${done(i) ? 'done' : i === state.step ? 'on' : ''}"></span>`).join('')}
      </div>
      <div class="coach-bar-main">
        <p class="coach-bar-kicker">Module ${String(coach.module).padStart(2, '0')} · step ${state.step + 1} of ${coach.steps.length}${
          waiting ? ' · your move' : ''}</p>
        <p class="coach-bar-instruction">${step.instruction || step.title}</p>
        ${step.body ? `<details class="coach-bar-why"><summary>Why this matters</summary><p>${step.body}</p></details>` : ''}
      </div>
      <div class="coach-bar-actions">
        ${last && step.finish
          ? `<button class="coach-btn primary" type="button" data-coach="finish">${step.finish.label}</button>`
          : waiting
            ? `<span class="coach-bar-waiting"><i class="coach-bar-pulse" aria-hidden="true"></i>${
                step.waitLabel || 'Waiting for you'}</span>`
            : `<button class="coach-btn primary" type="button" data-coach="next">${
                gated || demoOnly ? step.actionLabel || 'Show me'
                  : (last ? 'Finish' : step.continueLabel || 'Continue')}</button>`}
        <button class="coach-btn ghost" type="button" data-coach="exit">Exit lab</button>
      </div>`;
    watchForStepCompletion();
  }

  // A step the student performs advances itself. The console re-renders on most
  // actions, but a side panel opening does not always come back through
  // render(), so the check is also polled while such a step is on screen.
  let completionTimer = 0;
  function watchForStepCompletion() {
    clearInterval(completionTimer);
    const step = activeStep();
    if (!state || !step || typeof step.check !== 'function' || typeof step.do === 'function') return;
    completionTimer = setInterval(() => {
      const current = activeStep();
      if (!state || !current || typeof current.check !== 'function') { clearInterval(completionTimer); return; }
      if (!current.check()) return;
      clearInterval(completionTimer);
      const dots = panelEl().querySelectorAll('.coach-bar-dots span');
      if (dots[state.step]) dots[state.step].className = 'done';
      const waitingLabel = panelEl().querySelector('.coach-bar-waiting');
      if (waitingLabel) waitingLabel.innerHTML = '<i class="coach-bar-tick" aria-hidden="true">✓</i>Done';
      setTimeout(() => {
        if (!state) return;
        if (state.step >= activeCoach().steps.length - 1) { renderPanel(); return; }
        goToStep(state.step + 1);
      }, 650);
    }, 300);
  }

  function renderPanel() {
    if (!panelEl()) return;
    const open = Boolean(state);
    panelEl().hidden = !open;
    if (!open) return;
    renderSteps();
  }

  // ---------- step flow ----------

  function goToStep(index) {
    const coach = activeCoach();
    if (!coach) return;
    state.step = Math.max(0, Math.min(index, coach.steps.length - 1));
    saveState();
    const step = activeStep();
    if (state.step === coach.steps.length - 1) reportCompletion();
    if (step.route && location.hash !== step.route) {
      if (typeof hidePanels === 'function') hidePanels();
      navigate(step.route);           // render() calls back into coachAfterRender
    } else {
      renderPanel();
      setTimeout(applySpotlight, 30);
    }
  }

  function next() {
    const coach = activeCoach();
    const step = activeStep();
    if (!coach || !step) return;

    // A step the student must perform holds the coach here until they have.
    const gated = typeof step.check === 'function' && !step.check();
    const demoOnly = !step.check && typeof step.do === 'function' && !step._done;
    if (gated && typeof step.do !== 'function') {
      if (typeof toast === 'function') toast(step.nudge || 'Not yet — follow the highlighted control, then press again.');
      renderPanel();
      setTimeout(applySpotlight, 60);
      return;
    }
    if ((gated || demoOnly) && typeof step.do === 'function') {
      step._done = true;
      step.do();
      renderPanel();
      setTimeout(applySpotlight, 60);
      return;
    }
    if (state.step >= coach.steps.length - 1) { stop(); return; }
    goToStep(state.step + 1);
  }

  // A tab holding an older cached copy of views.js has no view for a route a
  // newer coach script points at, and the student just sees "Page not found".
  // Detect it before the first step instead, and offer the one fix that works.
  function missingRoutes(coach) {
    if (typeof VIEWS === 'undefined') return [];
    return [...new Set(coach.steps.map(s => s.route).filter(Boolean))]
      .filter(route => !VIEWS[route.replace(/^#\//, '')]);
  }

  function renderStale(coach, missing) {
    panelEl().hidden = false;
    panelEl().innerHTML = `
      <div class="coach-head">
        <div>
          <div class="coach-kicker">Module ${String(coach.module).padStart(2, '0')}</div>
          <h2>This tab is running an older console</h2>
        </div>
      </div>
      <div class="coach-body">
        <p>The walkthrough needs ${missing.length} page${missing.length === 1 ? '' : 's'} this tab has not loaded
        (${missing.map(r => `<code>${r}</code>`).join(', ')}). That happens when the browser reuses a cached copy
        after the console is updated. Reloading fetches the current one.</p>
      </div>
      <div class="coach-foot">
        <button class="coach-btn primary" type="button" data-coach="refresh">Reload the console</button>
      </div>`;
  }

  // A plain reload can be answered from cache again. A one-off query parameter
  // cannot be, so the document — and the versioned scripts it names — come from
  // the server.
  function hardReload() {
    const params = new URLSearchParams(location.search);
    params.set('_v', String(Date.now()));
    location.replace(`${location.pathname}?${params.toString()}${location.hash}`);
  }

  function start(id) {
    const coach = coachById(id);
    if (!coach) return;
    const missing = missingRoutes(coach);
    if (missing.length) { renderStale(coach, missing); return; }
    coach.steps.forEach(s => { s._done = false; });
    state = { id, step: 0 };
    saveState();
    goToStep(0);
    applyScopeLock();
  }

  function stop() {
    const coach = activeCoach();
    state = null;
    saveState();
    clearInterval(completionTimer);
    panelEl().classList.remove('coach-bar');
    document.body.classList.remove('coach-bar-open');
    clearSpotlight();
    applyScopeLock();
    renderPanel();
    if (coach && typeof toast === 'function') {
      toast('Coach closed — the full console is available again.');
    }
  }

  // Completion is earned by reaching the last step, not by pressing the return
  // button. A student who reads the final step and switches back to the module
  // tab by hand — or closes this one — has still done the walkthrough, and the
  // module must not stay locked behind a button they never saw the point of.
  let reportedToken = '';
  function reportCompletion() {
    const coach = activeCoach();
    if (!coach || !coach.completionToken || reportedToken === coach.completionToken) return;
    if (!window.opener || window.opener.closed) return;
    reportedToken = coach.completionToken;
    window.opener.postMessage({ type: 'hsl-coach-complete', id: coach.completionToken },
      new URL(portalUrl('')).origin);
  }

  function finish() {
    const coach = activeCoach();
    const step = activeStep();
    const href = (step && step.finish && step.finish.href)
      || portalUrl(`#/program/soc-analyst/module/${coach ? coach.module : 1}`, coach && coach.completionToken);
    const completionToken = coach && coach.completionToken;
    stop();
    if (completionToken && window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'hsl-coach-complete', id: completionToken }, new URL(href).origin);
      window.opener.focus();
      setTimeout(() => { if (!window.closed) window.location.href = href; }, 250);
      window.close();
      return;
    }
    window.location.href = href;
  }

  // ---------- mount ----------

  function mount() {
    if (panelEl()) return;

    const scrim = document.createElement('div');
    scrim.id = 'coach-scrim';
    scrim.hidden = true;
    document.body.appendChild(scrim);
    document.addEventListener('click', guardClick, true);

    const panel = document.createElement('aside');
    panel.id = 'coach-panel';
    panel.className = 'coach-panel';
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    panel.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-coach]');
      if (!btn) return;
      const action = btn.dataset.coach;
      if (action === 'next') next();
      if (action === 'exit') stop();
      if (action === 'finish') finish();
      if (action === 'refresh') hardReload();
    });

    document.body.appendChild(panel);

    // Panels open and close through several paths (row clicks, ✕, the scrim),
    // none of which re-render. One deferred check per click keeps the dock's
    // position honest without polling.
    document.addEventListener('click', () => setTimeout(avoidSidePanels, 60), true);
  }

  // Called at the end of every render(): the DOM the previous step pointed at
  // has just been replaced, so the spotlight and the scope lock are reapplied.
  function coachAfterRender() {
    // The back button and direct hash edits never pass through navigate(), so
    // the lock is re-checked here too and bounces back to the current step.
    const coach = activeCoach();
    const step = activeStep();
    if (coach && coach.allow && step && step.route
        && !coach.allow.includes(location.hash || '')) {
      navigate(step.route);
      return;
    }
    applyScopeLock();
    renderPanel();
    if (state) setTimeout(applySpotlight, 30);
  }

  function boot() {
    mount();
    const search = new URLSearchParams(location.search);
    const requested = search.get('coach');
    const restart = search.get('restart') === '1';
    const restored = loadState();
    if (requested && coachById(requested)) {
      const requestedCoach = coachById(requested);
      if (restart && typeof requestedCoach.resetState === 'function') requestedCoach.resetState();
      if (!restart && restored && restored.id === requested) {
        state = restored;
        saveState();
        goToStep(state.step);
      } else {
        start(requested);
      }
    } else if (restored) {
      state = restored;
      goToStep(state.step);
    }
    coachAfterRender();
  }

  window.coachAllowsRoute = coachAllowsRoute;
  window.coachAfterRender = coachAfterRender;
  window.startModuleCoach = start;
  window.stopModuleCoach = stop;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
