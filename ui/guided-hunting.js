// Guided hunting query builder for the Advanced hunting page.
//
// The teaching point: every condition the analyst assembles from dropdowns is
// compiled straight to KQL and mirrored into the advanced-mode editor, so the
// mapping from "filter + operator + value" to `| where Column == "value"` is
// visible while you build. Switching to Advanced mode hands over the compiled
// query rather than starting from scratch.
//
// Table pinning: the first condition pins the table. Filters from other tables
// are then disabled until Clear all, which keeps emitted KQL single-table and
// runnable against the bundled fixtures — and makes "the schema decides the
// table" concrete.

const GUIDED_STATE_KEY = 'defender-lab.hunting.guided';

function guidedDefaultState() {
  return { domain: 'endpoints', allFilters: false, join: 'and', conditions: [] };
}

let guidedState = guidedDefaultState();

function guidedLoadState() {
  try {
    const raw = localStorage.getItem(GUIDED_STATE_KEY);
    if (!raw) return guidedDefaultState();
    const parsed = JSON.parse(raw);
    return { ...guidedDefaultState(), ...parsed,
             conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [] };
  } catch { return guidedDefaultState(); }
}

function guidedSaveState() {
  try { localStorage.setItem(GUIDED_STATE_KEY, JSON.stringify(guidedState)); } catch {}
}

// The table pinned by the current conditions, or null when nothing is set yet.
function guidedPinnedTable() {
  const first = guidedState.conditions.find(c => c.table);
  return first ? first.table : null;
}

function guidedFiltersForDomain() {
  const d = guidedState.domain;
  return GUIDED_HUNTING_FILTERS
    .filter(f => d === 'all' || f.domain === d)
    .filter(f => guidedState.allFilters || f.basic);
}

function guidedFilterByKey(key) {
  return GUIDED_HUNTING_FILTERS.find(f => `${f.table}.${f.column}` === key) || null;
}

// A value that isn't purely numeric is quoted; numbers and booleans are bare,
// matching how KQL treats them. Backslashes must be doubled inside a KQL
// double-quoted string — otherwise a Windows path like C:\Users\Public silently
// loses its separators, which is a classic hand-written-KQL bug worth showing.
function guidedFormatValue(filter, value) {
  const v = String(value ?? '');
  if (filter && filter.type === 'number' && v !== '' && !Number.isNaN(Number(v))) return v;
  if (filter && filter.type === 'bool' && (v === 'true' || v === 'false')) return v;
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Compile builder state to KQL. Returns '' when there is nothing to run yet.
function guidedBuildKql() {
  const table = guidedPinnedTable();
  if (!table) return '';
  const usable = guidedState.conditions.filter(c => c.column && c.op && String(c.value ?? '') !== '');
  if (!usable.length) return `${table}\n| take 30`;
  const joiner = guidedState.allFilters ? (guidedState.join === 'or' ? 'or' : 'and') : 'and';
  const parts = usable.map(c => {
    const f = guidedFilterByKey(`${c.table}.${c.column}`);
    return `${c.column} ${c.op} ${guidedFormatValue(f, c.value)}`;
  });
  const where = parts.length === 1 ? parts[0] : parts.join(`\n    ${joiner} `);
  return `${table}\n| where ${where}\n| take 30`;
}

function guidedSyncEditor() {
  const kql = guidedBuildKql();
  const preview = document.getElementById('guided-kql-preview');
  if (preview) {
    preview.textContent = kql || '// Add a filter to build a query.';
  }
  const editor = document.getElementById('kql');
  // Mirror into the advanced editor so switching modes carries the query over.
  if (editor && kql) editor.value = kql;
  const runBtn = document.getElementById('guided-run');
  if (runBtn) runBtn.disabled = !kql;
}

function guidedRender() {
  const host = document.getElementById('guided-builder');
  if (!host) return;
  const filters = guidedFiltersForDomain();
  const pinned = guidedPinnedTable();
  const bySection = {};
  filters.forEach(f => { (bySection[f.section] = bySection[f.section] || []).push(f); });
  const sections = Object.keys(bySection);

  const domainHint = (GUIDED_HUNTING_DOMAINS.find(d => d.id === guidedState.domain) || {}).hint || '';
  const noFixtures = !filters.length;

  const conditionRows = guidedState.conditions.map((c, i) => {
    const f = guidedFilterByKey(`${c.table}.${c.column}`);
    const ops = (f && GUIDED_HUNTING_OPERATORS[f.type]) || GUIDED_HUNTING_OPERATORS.string;
    const values = (f && f.values) || [];
    return `
      <div class="guided-condition" data-index="${i}">
        ${i > 0 ? `<span class="guided-joiner">${escHtml(guidedState.allFilters ? guidedState.join.toUpperCase() : 'AND')}</span>` : '<span class="guided-joiner">WHERE</span>'}
        <select class="ipt guided-filter-select" data-index="${i}" aria-label="Filter">
          ${sections.map(sec => `
            <optgroup label="${escHtml(sec)}">
              ${bySection[sec].map(o => {
                const key = `${o.table}.${o.column}`;
                const disabled = pinned && o.table !== pinned ? ' disabled' : '';
                return `<option value="${escHtml(key)}"${key === `${c.table}.${c.column}` ? ' selected' : ''}${disabled}>${escHtml(o.label)}</option>`;
              }).join('')}
            </optgroup>`).join('')}
        </select>
        <select class="ipt guided-op-select" data-index="${i}" aria-label="Operator">
          ${ops.map(op => `<option value="${escHtml(op)}"${op === c.op ? ' selected' : ''}>${escHtml(op)}</option>`).join('')}
        </select>
        <input class="ipt guided-value-input" data-index="${i}" list="guided-values-${i}"
               value="${escHtml(String(c.value ?? ''))}" placeholder="Value" aria-label="Value">
        <datalist id="guided-values-${i}">
          ${values.map(v => `<option value="${escHtml(v)}"></option>`).join('')}
        </datalist>
        <button type="button" class="btn btn-ghost btn-sm guided-remove" data-index="${i}" aria-label="Remove condition">✕</button>
      </div>`;
  }).join('');

  host.innerHTML = `
    <div class="guided-toolbar">
      <label class="lbl guided-domain">
        <span>Data domain</span>
        <select class="ipt" id="guided-domain">
          ${GUIDED_HUNTING_DOMAINS.map(d => `<option value="${escHtml(d.id)}"${d.id === guidedState.domain ? ' selected' : ''}>${escHtml(d.label)}</option>`).join('')}
        </select>
      </label>
      <label class="guided-toggle">
        <input type="checkbox" id="guided-all-filters" ${guidedState.allFilters ? 'checked' : ''}>
        <span>Toggle to see more filters and conditions</span>
      </label>
      <label class="lbl guided-samples">
        <span>Load sample queries</span>
        <select class="ipt" id="guided-sample">
          <option value="">Select a sample…</option>
          ${GUIDED_HUNTING_SAMPLES
            .filter(s => guidedState.domain === 'all' || s.domain === guidedState.domain)
            .map(s => `<option value="${escHtml(s.id)}">${escHtml(s.label)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="guided-domain-hint muted">${escHtml(domainHint)}</div>
    ${guidedState.allFilters ? `
      <div class="guided-join-row">
        <span class="muted">Combine conditions with</span>
        <button type="button" class="btn btn-sm ${guidedState.join === 'and' ? 'btn-primary' : 'btn-secondary'}" id="guided-join-and">AND</button>
        <button type="button" class="btn btn-sm ${guidedState.join === 'or' ? 'btn-primary' : 'btn-secondary'}" id="guided-join-or">OR</button>
      </div>` : `
      <div class="guided-join-row muted">Basic filters use AND only. Turn on all filters to use OR.</div>`}
    ${noFixtures ? `
      <div class="callout warn guided-empty">
        No bundled fixtures for this domain, so guided queries here return no rows.
        The domain is listed because the product offers it. Try Endpoints, Apps and identities, or Exposure management.
      </div>` : ''}
    ${pinned ? `<div class="guided-pinned muted">Table pinned to <strong>${escHtml(pinned)}</strong> by the first condition. Clear all to switch tables.</div>` : ''}
    <div class="guided-conditions">${conditionRows || '<div class="muted guided-no-conditions">No conditions yet. Add one to start building.</div>'}</div>
    <div class="guided-actions">
      <button type="button" class="btn btn-secondary btn-sm" id="guided-add" ${noFixtures ? 'disabled' : ''}>+ Add filter</button>
      <button type="button" class="btn btn-ghost btn-sm" id="guided-clear">Clear all</button>
      <button type="button" class="btn btn-primary btn-sm" id="guided-run">Run query</button>
    </div>
    <div class="guided-preview">
      <div class="guided-preview-head">
        <strong>Generated KQL</strong>
        <span class="muted">This is what guided mode hands to advanced mode.</span>
      </div>
      <pre class="guided-kql" id="guided-kql-preview"></pre>
    </div>`;

  guidedWire();
  guidedSyncEditor();
}

function guidedAddCondition() {
  const filters = guidedFiltersForDomain();
  const pinned = guidedPinnedTable();
  const pick = filters.find(f => !pinned || f.table === pinned);
  if (!pick) return;
  guidedState.conditions.push({
    table: pick.table, column: pick.column,
    op: (GUIDED_HUNTING_OPERATORS[pick.type] || ['=='])[0], value: '',
  });
  guidedSaveState();
  guidedRender();
}

function guidedWire() {
  const on = (id, evt, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); };

  on('guided-domain', 'change', e => {
    guidedState.domain = e.target.value;
    // Conditions belong to the previous domain's tables; start clean.
    guidedState.conditions = [];
    guidedSaveState(); guidedRender();
  });

  on('guided-all-filters', 'change', e => {
    guidedState.allFilters = e.target.checked;
    // Leaving all-filters mode drops OR back to AND, as the product does.
    if (!guidedState.allFilters) guidedState.join = 'and';
    guidedSaveState(); guidedRender();
  });

  on('guided-join-and', 'click', () => { guidedState.join = 'and'; guidedSaveState(); guidedRender(); });
  on('guided-join-or',  'click', () => { guidedState.join = 'or';  guidedSaveState(); guidedRender(); });
  on('guided-add', 'click', guidedAddCondition);
  on('guided-clear', 'click', () => {
    guidedState.conditions = [];
    guidedState.join = 'and';
    guidedSaveState(); guidedRender();
  });

  on('guided-sample', 'change', e => {
    const s = GUIDED_HUNTING_SAMPLES.find(x => x.id === e.target.value);
    if (!s) return;
    guidedState.domain = s.domain;
    guidedState.join = s.join || 'and';
    // Samples may use filters outside the basic set; reveal all filters so the
    // loaded conditions are actually visible, mirroring the product's behavior.
    guidedState.allFilters = s.conditions.some(c => {
      const f = guidedFilterByKey(`${s.table}.${c.column}`);
      return f && !f.basic;
    }) || guidedState.join === 'or';
    guidedState.conditions = s.conditions.map(c => ({ table: s.table, column: c.column, op: c.op, value: c.value }));
    guidedSaveState(); guidedRender();
  });

  document.querySelectorAll('.guided-filter-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const i = Number(e.target.dataset.index);
      const f = guidedFilterByKey(e.target.value);
      if (!f) return;
      const ops = GUIDED_HUNTING_OPERATORS[f.type] || GUIDED_HUNTING_OPERATORS.string;
      guidedState.conditions[i] = { table: f.table, column: f.column, op: ops[0], value: '' };
      guidedSaveState(); guidedRender();
    });
  });

  document.querySelectorAll('.guided-op-select').forEach(sel => {
    sel.addEventListener('change', e => {
      guidedState.conditions[Number(e.target.dataset.index)].op = e.target.value;
      guidedSaveState(); guidedSyncEditor();
    });
  });

  document.querySelectorAll('.guided-value-input').forEach(inp => {
    inp.addEventListener('input', e => {
      guidedState.conditions[Number(e.target.dataset.index)].value = e.target.value;
      guidedSaveState(); guidedSyncEditor();
    });
  });

  document.querySelectorAll('.guided-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      guidedState.conditions.splice(Number(e.currentTarget.dataset.index), 1);
      guidedSaveState(); guidedRender();
    });
  });

  on('guided-run', 'click', () => {
    const kql = guidedBuildKql();
    if (!kql) return;
    const editor = document.getElementById('kql');
    if (editor) editor.value = kql;
    if (typeof window.runKqlQuery === 'function') window.runKqlQuery();
  });
}

// Called by the hunting view's onMount.
function guidedHuntingInit() {
  guidedState = guidedLoadState();
  guidedRender();
}

function setHuntingMode(mode) {
  const guided = mode === 'guided';
  document.querySelectorAll('[data-hunting-mode]').forEach(el => {
    el.classList.toggle('active', el.dataset.huntingMode === mode);
    el.setAttribute('aria-selected', String(el.dataset.huntingMode === mode));
  });
  const g = document.getElementById('guided-panel');
  const a = document.getElementById('advanced-panel');
  if (g) g.classList.toggle('hidden', !guided);
  if (a) a.classList.toggle('hidden', guided);
  try { localStorage.setItem('defender-lab.hunting.mode', mode); } catch {}
  if (guided) guidedSyncEditor();
}
