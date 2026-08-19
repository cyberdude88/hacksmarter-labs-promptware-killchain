/* ====================================================================
   KQL editor — syntax highlighting, IntelliSense-style completion,
   line numbers, and draft persistence for the lab's query surfaces.

   attachKqlEditor(textarea, opts) wraps an existing <textarea class="kql">
   so every existing `el.value = ...` call in views.js keeps working: the
   instance's value setter is patched to re-render the highlight layer.

   Completion is schema-aware. Tables and columns are read live from
   mockKqlTables(), the same fixture set the mock executor runs against,
   so suggestions can never drift from what a query will actually return.
   Items the mock executor understands are tagged "lab"; the rest are
   real KQL kept for study value and tagged "ref".
   ==================================================================== */

(function () {
  'use strict';

  const escHtml = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // --- static vocabulary -------------------------------------------------
  // lab:true  → the bundled mock executor implements it end to end
  // lab:false → valid KQL, listed so the syntax stays learnable, but the
  //             mock executor ignores the clause instead of failing loudly
  const OPERATORS = [
    { label:'where',         insert:'where ',            detail:'Filter rows on a predicate', lab:true },
    { label:'project',       insert:'project ',          detail:'Keep and order named columns', lab:true },
    { label:'project-away',  insert:'project-away ',     detail:'Drop named columns', lab:true },
    { label:'extend',        insert:'extend ',           detail:'Add a calculated column', lab:true },
    { label:'summarize',     insert:'summarize ',        detail:'Aggregate rows, usually with by', lab:true },
    { label:'join',          insert:'join kind=inner (',  detail:'Join another table on a key', lab:true },
    { label:'union',         insert:'union ',            detail:'Combine rows from several tables', lab:true },
    { label:'order by',      insert:'order by ',         detail:'Sort rows (asc / desc)', lab:true },
    { label:'sort by',       insert:'sort by ',          detail:'Alias of order by', lab:true },
    { label:'top',           insert:'top 10 by ',        detail:'Sort then take the first N rows', lab:true },
    { label:'take',          insert:'take 10',           detail:'Return N arbitrary rows', lab:true },
    { label:'limit',         insert:'limit 10',          detail:'Alias of take', lab:false },
    { label:'parse',         insert:'parse ',            detail:'Extract fields from a text column', lab:true },
    { label:'render',        insert:'render ',           detail:'Chart the result set', lab:true },
    { label:'distinct',      insert:'distinct ',         detail:'Unique combinations of columns', lab:false },
    { label:'count',         insert:'count',             detail:'Row count as a single row', lab:false },
    { label:'mv-expand',     insert:'mv-expand ',        detail:'Expand a dynamic array into rows', lab:false },
    { label:'project-rename',insert:'project-rename ',   detail:'Rename a column in place', lab:false },
    { label:'evaluate',      insert:'evaluate ',         detail:'Invoke a plugin, e.g. bag_unpack', lab:false },
    { label:'lookup',        insert:'lookup ',           detail:'Enrich rows from a dimension table', lab:false },
    { label:'invoke',        insert:'invoke ',           detail:'Call a stored function', lab:false },
    { label:'serialize',     insert:'serialize ',        detail:'Fix row order for windowing functions', lab:false },
  ];

  const FUNCTIONS = [
    { label:'ago',            insert:'ago(1d)',            detail:'Time offset from now — ago(1d), ago(30m)', lab:true },
    { label:'now',            insert:'now()',              detail:'Current UTC time', lab:true },
    { label:'bin',            insert:'bin(TimeGenerated, 1h)', detail:'Round a value into fixed buckets', lab:true },
    { label:'datetime',       insert:'datetime(2026-07-06T00:00:00Z)', detail:'Datetime literal', lab:true },
    { label:'datetime_diff',  insert:'datetime_diff("minute", ',  detail:'Difference between two datetimes', lab:true },
    { label:'count',          insert:'count()',            detail:'Rows in the group', lab:true },
    { label:'countif',        insert:'countif(',           detail:'Rows in the group matching a predicate', lab:true },
    { label:'dcount',         insert:'dcount(',            detail:'Distinct values in the group', lab:true },
    { label:'sum',            insert:'sum(',               detail:'Sum a numeric column', lab:true },
    { label:'arg_max',        insert:'arg_max(',           detail:'Row holding the max of a column', lab:true },
    { label:'coalesce',       insert:'coalesce(',          detail:'First non-empty value', lab:true },
    { label:'isempty',        insert:'isempty(',           detail:'True when the value is empty', lab:true },
    { label:'isnull',         insert:'isnull(',            detail:'True when the value is null', lab:true },
    { label:'isnotempty',     insert:'isnotempty(',        detail:'True when the value is present', lab:false },
    { label:'tostring',       insert:'tostring(',          detail:'Cast to string', lab:true },
    { label:'toint',          insert:'toint(',             detail:'Cast to int', lab:true },
    { label:'tolower',        insert:'tolower(',           detail:'Lowercase a string', lab:true },
    { label:'toupper',        insert:'toupper(',           detail:'Uppercase a string', lab:true },
    { label:'trim',           insert:'trim(',              detail:'Trim whitespace', lab:true },
    { label:'split',          insert:'split(',             detail:'Split a string into an array', lab:true },
    { label:'extract',        insert:'extract("(\\\\w+)", 1, ', detail:'Regex capture group from a string', lab:true },
    { label:'parse_json',     insert:'parse_json(',        detail:'Parse a JSON string into dynamic', lab:true },
    { label:'strcat',         insert:'strcat(',            detail:'Concatenate strings', lab:false },
    { label:'substring',      insert:'substring(',         detail:'Slice a string', lab:false },
    { label:'iff',            insert:'iff(',               detail:'Inline conditional', lab:false },
    { label:'case',           insert:'case(',              detail:'Multi-branch conditional', lab:false },
    { label:'make_set',       insert:'make_set(',          detail:'Set of values in the group', lab:false },
    { label:'make_list',      insert:'make_list(',         detail:'List of values in the group', lab:false },
    { label:'avg',            insert:'avg(',               detail:'Average of a numeric column', lab:false },
    { label:'min',            insert:'min(',               detail:'Minimum in the group', lab:false },
    { label:'max',            insert:'max(',               detail:'Maximum in the group', lab:false },
    { label:'percentile',     insert:'percentile(',        detail:'Percentile of a numeric column', lab:false },
    { label:'format_datetime',insert:'format_datetime(',   detail:'Format a datetime', lab:false },
  ];

  // String / scalar operators offered right after a column in a where clause.
  const PREDICATE_OPS = [
    { label:'==',              insert:'== ',              detail:'Equals (case sensitive)', lab:true },
    { label:'!=',              insert:'!= ',              detail:'Not equals', lab:true },
    { label:'has',             insert:'has ',             detail:'Whole-term match — indexed and fast', lab:true },
    { label:'has_any',         insert:'has_any (',        detail:'Whole-term match against a list', lab:true },
    { label:'contains',        insert:'contains ',        detail:'Substring match — slower than has', lab:true },
    { label:'startswith',      insert:'startswith ',      detail:'Prefix match', lab:true },
    { label:'endswith',        insert:'endswith ',        detail:'Suffix match', lab:true },
    { label:'in',              insert:'in (',             detail:'Value is in a list', lab:true },
    { label:'!in',             insert:'!in (',            detail:'Value is not in a list', lab:true },
    { label:'matches regex',   insert:'matches regex ',   detail:'Regular-expression match', lab:true },
    { label:'between',         insert:'between (',        detail:'Inclusive range — between (a .. b)', lab:true },
  ];

  const KEYWORDS = [
    { label:'let',   insert:'let ',   detail:'Bind a name to a value or subquery', lab:true },
    { label:'and',   insert:'and ',   detail:'Logical and', lab:true },
    { label:'or',    insert:'or ',    detail:'Logical or', lab:true },
    { label:'not',   insert:'not ',   detail:'Logical negation', lab:true },
    { label:'by',    insert:'by ',    detail:'Group-by clause', lab:true },
    { label:'asc',   insert:'asc',    detail:'Ascending sort', lab:true },
    { label:'desc',  insert:'desc',   detail:'Descending sort', lab:true },
    { label:'on',    insert:'on ',    detail:'Join key clause', lab:true },
    { label:'kind',  insert:'kind=',  detail:'Join kind — inner / leftouter', lab:true },
  ];

  const RENDER_KINDS = [
    { label:'barchart',    insert:'barchart',    detail:'Horizontal bars', lab:true },
    { label:'columnchart', insert:'columnchart', detail:'Vertical bars', lab:true },
    { label:'timechart',   insert:'timechart',   detail:'Time series', lab:true },
    { label:'piechart',    insert:'piechart',    detail:'Share of total', lab:true },
  ];

  // Words highlighted as control keywords rather than plain identifiers.
  const KEYWORD_SET = new Set([
    'let','and','or','not','by','on','asc','desc','kind','in','has','has_any','contains',
    'startswith','endswith','matches','regex','between','true','false','null','union',
    'externaldata','workspace','with','step','from','to','hint',
  ]);
  const OPERATOR_WORDS = new Set(OPERATORS.flatMap(o => o.label.split(' ')));
  const FUNCTION_SET = new Set(FUNCTIONS.map(f => f.label));

  // --- schema, derived from the same fixtures the executor uses ----------
  let schemaCache = null;
  function schema() {
    if (schemaCache) return schemaCache;
    const tables = (typeof mockKqlTables === 'function') ? mockKqlTables() : {};
    const out = { tables: {}, allColumns: new Set() };
    Object.keys(tables).forEach(name => {
      const rows = Array.isArray(tables[name]) ? tables[name] : [];
      const columns = [];
      const seen = new Set();
      rows.slice(0, 200).forEach(row => Object.keys(row || {}).forEach(col => {
        if (!seen.has(col)) { seen.add(col); columns.push(col); out.allColumns.add(col); }
      }));
      out.tables[name] = { rows, columns };
    });
    schemaCache = out;
    return out;
  }
  function tableNames() { return Object.keys(schema().tables).sort(); }
  function columnsFor(table) {
    const t = schema().tables[table];
    return t ? t.columns : [];
  }
  function distinctValues(table, column) {
    const t = schema().tables[table];
    if (!t) return [];
    const seen = new Set();
    t.rows.forEach(row => {
      const v = row && row[column];
      if (v == null || v === '' || typeof v === 'object') return;
      seen.add(String(v));
    });
    return Array.from(seen).slice(0, 30);
  }
  function columnSet(table) {
    return new Set(table ? columnsFor(table) : Array.from(schema().allColumns));
  }

  // --- syntax highlighting ----------------------------------------------
  const TOKEN_RE = new RegExp([
    '(\\/\\/[^\\n]*)',                    // 1 comment
    '(@?"(?:[^"\\\\]|\\\\.)*"?|\'(?:[^\'\\\\]|\\\\.)*\'?)', // 2 string
    '(\\b\\d+(?:\\.\\d+)?(?:[smhdw]\\b)?)', // 3 number / timespan
    '(\\|)',                              // 4 pipe
    '([A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z]+)?)', // 5 identifier (project-away)
    '(==|!=|<=|>=|=~|!~|[-+*/<>=!,;.()\\[\\]{}])', // 6 punctuation
  ].join('|'), 'g');

  function highlight(text, sourceTable) {
    const cols = columnSet(sourceTable);
    const tables = new Set(tableNames());
    let out = '';
    let last = 0;
    let afterPipe = true;   // start of query counts as a clause head
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text))) {
      out += escHtml(text.slice(last, m.index));
      last = m.index + m[0].length;
      const raw = m[0];
      let cls = '';
      if (m[1]) cls = 'kt-com';
      else if (m[2]) cls = 'kt-str';
      else if (m[3]) cls = 'kt-num';
      else if (m[4]) { cls = 'kt-pipe'; afterPipe = true; out += `<span class="${cls}">${escHtml(raw)}</span>`; continue; }
      else if (m[5]) {
        const word = raw;
        const lower = word.toLowerCase();
        const next = text.slice(last).match(/^\s*\(/);
        if (afterPipe && OPERATOR_WORDS.has(lower)) cls = 'kt-op';
        else if (FUNCTION_SET.has(lower) && next) cls = 'kt-fn';
        else if (tables.has(word)) cls = 'kt-tbl';
        else if (KEYWORD_SET.has(lower)) cls = 'kt-kw';
        else if (cols.has(word)) cls = 'kt-col';
        else if (next) cls = 'kt-fn';
        else cls = 'kt-id';
        if (!/^\s*$/.test(word)) afterPipe = afterPipe && OPERATOR_WORDS.has(lower) && /^(order|sort)$/.test(lower);
      }
      else cls = 'kt-punc';
      out += `<span class="${cls}">${escHtml(raw)}</span>`;
    }
    out += escHtml(text.slice(last));
    return out;
  }

  // --- query context at the caret ---------------------------------------
  function sourceTableOf(text) {
    const body = String(text || '').replace(/^\s*let\s+[\s\S]*?;\s*/gi, '');
    const m = body.match(/^\s*(?:union\s+)?([A-Za-z_][A-Za-z0-9_]*)/);
    if (m && schema().tables[m[1]]) return m[1];
    const anyTable = tableNames().find(t => new RegExp(`\\b${t}\\b`).test(body));
    return anyTable || null;
  }

  function contextAt(text, caret) {
    const before = text.slice(0, caret);
    const lineStart = before.lastIndexOf('\n') + 1;
    const line = before.slice(lineStart);
    const table = sourceTableOf(text);

    // Inside a string literal → offer observed column values.
    const quotes = (line.match(/"/g) || []).length;
    if (quotes % 2 === 1) {
      const openIdx = line.lastIndexOf('"');
      const prefix = line.slice(openIdx + 1);
      const lead = line.slice(0, openIdx);
      const colMatch = lead.match(/([A-Za-z_][A-Za-z0-9_]*)\s*(?:==|!=|=~|has_any|has|contains|startswith|endswith|in|!in|,)?\s*\(?\s*$/);
      const column = colMatch ? colMatch[1] : null;
      return { kind:'value', prefix, replaceFrom: lineStart + openIdx + 1, table, column };
    }

    const wordMatch = line.match(/[A-Za-z_][A-Za-z0-9_-]*$/);
    const prefix = wordMatch ? wordMatch[0] : '';
    const replaceFrom = caret - prefix.length;
    const clause = line.replace(/^\s*/, '');
    const pipedBefore = /\|/.test(before);

    // Head of a piped clause → operators.
    if (/^\|\s*[A-Za-z_-]*$/.test(clause)) {
      return { kind:'operator', prefix, replaceFrom, table };
    }
    // Operator that owns this clause, if any.
    const clauseText = before.slice(before.lastIndexOf('|') + 1);
    const opMatch = clauseText.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)/);
    const op = opMatch ? opMatch[1].toLowerCase() : '';

    if (!pipedBefore && !/^\s*let\b/.test(clause)) {
      return { kind:'source', prefix, replaceFrom, table };
    }
    if (op === 'render') return { kind:'render', prefix, replaceFrom, table };
    if (op === 'join' || op === 'union') return { kind:'table', prefix, replaceFrom, table };

    // Directly after a bare column inside where → comparison operators.
    if (op === 'where' && !prefix) {
      const tail = clauseText.match(/([A-Za-z_][A-Za-z0-9_]*)\s+$/);
      if (tail && columnSet(table).has(tail[1])) {
        return { kind:'predicate', prefix, replaceFrom, table };
      }
    }
    return { kind:'column', prefix, replaceFrom, table, op };
  }

  function candidatesFor(ctx) {
    const asItems = (arr, kind) => arr.map(i => ({ ...i, kind }));
    const cols = () => asItems(
      columnsFor(ctx.table).map(c => ({ label:c, insert:c, detail:`${ctx.table} column`, lab:true })), 'column');

    switch (ctx.kind) {
      case 'operator':
        return asItems(OPERATORS, 'operator');
      case 'render':
        return asItems(RENDER_KINDS, 'render');
      case 'table':
        return asItems(tableNames().map(t => ({ label:t, insert:t, detail:`${columnsFor(t).length} columns · ${schema().tables[t].rows.length} rows`, lab:true })), 'table');
      case 'source':
        return [
          ...asItems(tableNames().map(t => ({ label:t, insert:t, detail:`${columnsFor(t).length} columns · ${schema().tables[t].rows.length} rows`, lab:true })), 'table'),
          ...asItems(KEYWORDS.filter(k => k.label === 'let'), 'keyword'),
          { label:'union', insert:'union ', detail:'Combine rows from several tables', lab:true, kind:'operator' },
          { label:'externaldata', insert:'externaldata (Field:string) [ ]', detail:'Read the bundled CSV fixture', lab:true, kind:'operator' },
        ];
      case 'predicate':
        return asItems(PREDICATE_OPS, 'predicate');
      case 'value': {
        const values = ctx.column ? distinctValues(ctx.table, ctx.column) : [];
        return values.map(v => ({ label:v, insert:v, detail:`observed in ${ctx.table}.${ctx.column}`, lab:true, kind:'value' }));
      }
      default: {
        const items = [...cols(), ...asItems(FUNCTIONS, 'function'), ...asItems(KEYWORDS, 'keyword')];
        if (ctx.op === 'where') items.push(...asItems(PREDICATE_OPS, 'predicate'));
        return items;
      }
    }
  }

  function rank(items, prefix) {
    if (!prefix) return items.slice(0, 40);
    const p = prefix.toLowerCase();
    return items
      .map(item => {
        const l = item.label.toLowerCase();
        if (l === p) return { item, score: 0 };
        if (l.startsWith(p)) return { item, score: 1 };
        if (l.includes(p)) return { item, score: 2 };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.item.label.length - b.item.label.length)
      .map(r => r.item)
      .slice(0, 40);
  }

  // --- the editor --------------------------------------------------------
  function attachKqlEditor(textarea, opts) {
    if (!textarea || textarea.dataset.kqlEditor === '1') return textarea && textarea._kqlEditor;
    const options = opts || {};
    textarea.dataset.kqlEditor = '1';

    const wrap = document.createElement('div');
    wrap.className = 'kql-editor';
    textarea.parentNode.insertBefore(wrap, textarea);

    const gutter = document.createElement('div');
    gutter.className = 'kql-gutter';

    const surface = document.createElement('div');
    surface.className = 'kql-surface';

    const layer = document.createElement('pre');
    layer.className = 'kql-highlight';
    layer.setAttribute('aria-hidden', 'true');

    surface.appendChild(layer);
    surface.appendChild(textarea);
    wrap.appendChild(gutter);
    wrap.appendChild(surface);

    const popup = document.createElement('div');
    popup.className = 'kql-ac';
    popup.setAttribute('role', 'listbox');
    popup.hidden = true;
    wrap.appendChild(popup);

    const status = document.createElement('div');
    status.className = 'kql-editor-status';
    wrap.appendChild(status);

    textarea.classList.add('kql-input');
    textarea.setAttribute('spellcheck', 'false');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.setAttribute('wrap', 'off');

    const valueDesc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    const readValue = () => valueDesc.get.call(textarea);
    const writeValue = v => valueDesc.set.call(textarea, v);

    let items = [];
    let active = 0;
    let ctx = null;
    let saveTimer = null;
    let pipePadAt = -1;   // caret spot where a typed "|" already added padding

    function persist() {
      if (!options.storageKey) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem(options.storageKey + '.draft', readValue()); } catch {}
      }, 150);
    }

    function syncScroll() {
      layer.scrollTop = textarea.scrollTop;
      layer.scrollLeft = textarea.scrollLeft;
      gutter.scrollTop = textarea.scrollTop;
    }

    function renderStatus() {
      const value = readValue();
      const caret = textarea.selectionStart;
      const before = value.slice(0, caret);
      const ln = before.split('\n').length;
      const col = caret - (before.lastIndexOf('\n') + 1) + 1;
      const lines = value.split('\n').length;
      status.innerHTML =
        `<span>Ln ${ln}, Col ${col}</span><span>${lines} line${lines === 1 ? '' : 's'}</span>` +
        `<span class="kql-editor-hint">Ctrl+Space suggestions · Tab/Enter accept · Ctrl+Enter run</span>`;
    }

    function render() {
      const value = readValue();
      layer.innerHTML = highlight(value, sourceTableOf(value)) + '\n';
      const lines = value.split('\n').length;
      let g = '';
      for (let i = 1; i <= lines; i++) g += `<span>${i}</span>`;
      gutter.innerHTML = g;
      syncScroll();
      renderStatus();
    }

    // Caret pixel position. The layer is monospace with white-space:pre, so a
    // measured character width plus the computed line height is exact.
    let metrics = null;
    function measure() {
      const cs = getComputedStyle(textarea);
      const canvas = measure.canvas || (measure.canvas = document.createElement('canvas'));
      const c = canvas.getContext('2d');
      c.font = `${cs.fontSize} ${cs.fontFamily}`;
      metrics = {
        charWidth: c.measureText('M').width || 7.8,
        lineHeight: parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.5),
        padLeft: parseFloat(cs.paddingLeft) || 0,
        padTop: parseFloat(cs.paddingTop) || 0,
      };
      return metrics;
    }

    function caretPoint() {
      const m = metrics || measure();
      const value = readValue();
      const caret = textarea.selectionStart;
      const before = value.slice(0, caret);
      const line = before.split('\n').length - 1;
      const col = caret - (before.lastIndexOf('\n') + 1);
      return {
        x: m.padLeft + col * m.charWidth - textarea.scrollLeft + gutter.offsetWidth,
        y: m.padTop + (line + 1) * m.lineHeight - textarea.scrollTop,
      };
    }

    function closePopup() {
      popup.hidden = true;
      items = [];
      textarea.removeAttribute('aria-activedescendant');
    }

    function renderPopup() {
      popup.innerHTML = items.map((item, i) => `
        <div class="kql-ac-item${i === active ? ' active' : ''}" data-i="${i}" role="option" aria-selected="${i === active}">
          <span class="kql-ac-kind k-${escHtml(item.kind)}">${escHtml(kindLabel(item.kind))}</span>
          <span class="kql-ac-label">${escHtml(item.label)}</span>
          <span class="kql-ac-detail">${escHtml(item.detail || '')}</span>
          ${item.lab === false ? '<span class="kql-ac-flag">ref</span>' : ''}
        </div>`).join('');
      const point = caretPoint();
      const maxLeft = Math.max(0, wrap.clientWidth - 360);
      popup.style.left = Math.min(point.x, maxLeft) + 'px';
      popup.style.top = (point.y + 4) + 'px';
      popup.hidden = false;
      const activeEl = popup.querySelector('.kql-ac-item.active');
      if (activeEl) activeEl.scrollIntoView({ block:'nearest' });
    }

    function kindLabel(kind) {
      switch (kind) {
        case 'operator': return 'op';
        case 'column': return 'col';
        case 'table': return 'tbl';
        case 'function': return 'fn';
        case 'keyword': return 'kw';
        case 'predicate': return 'cmp';
        case 'value': return 'val';
        case 'render': return 'viz';
        default: return kind;
      }
    }

    function openPopup(force) {
      const value = readValue();
      ctx = contextAt(value, textarea.selectionStart);
      const all = candidatesFor(ctx);
      const filtered = rank(all, ctx.prefix);
      // Without an explicit request, stay quiet until there is something to go on.
      if (!force && !ctx.prefix && ctx.kind !== 'operator' && ctx.kind !== 'value' && ctx.kind !== 'predicate' && ctx.kind !== 'render') {
        return closePopup();
      }
      if (!filtered.length) return closePopup();
      items = filtered;
      active = 0;
      renderPopup();
    }

    function accept(index) {
      const item = items[index];
      if (!item || !ctx) return;
      const value = readValue();
      const from = ctx.replaceFrom;
      const to = textarea.selectionStart;
      let insert = item.insert != null ? item.insert : item.label;
      if (ctx.kind === 'value') {
        // Close the string when the user is not already sitting on a quote.
        const after = value.slice(to);
        insert = insert + (after.startsWith('"') ? '' : '"');
      }
      const next = value.slice(0, from) + insert + value.slice(to);
      writeValue(next);
      const caret = from + insert.length;
      textarea.setSelectionRange(caret, caret);
      closePopup();
      render();
      persist();
      // Chained contexts: an operator or comparison expects an argument next.
      if (/\s$/.test(insert) || insert.endsWith('(')) setTimeout(() => openPopup(true), 0);
    }

    function insertText(text, caretOffset) {
      const value = readValue();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      writeValue(value.slice(0, start) + text + value.slice(end));
      const caret = start + (caretOffset == null ? text.length : caretOffset);
      textarea.setSelectionRange(caret, caret);
      render();
      persist();
    }

    textarea.addEventListener('keydown', e => {
      const open = !popup.hidden;
      if (open) {
        if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; return renderPopup(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); active = (active - 1 + items.length) % items.length; return renderPopup(); }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return accept(active); }
        if (e.key === 'Escape')    { e.preventDefault(); return closePopup(); }
      }
      if (e.key === ' ' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); return openPopup(true); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
        e.preventDefault();
        closePopup();
        if (typeof options.onRun === 'function') options.onRun(readValue());
        return;
      }
      if (e.key === 'Escape') return closePopup();
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); return insertText('    '); }

      // Auto-pairs, and skip-over when typing the closing character.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const value = readValue();
      const nextChar = value.slice(textarea.selectionStart, textarea.selectionStart + 1);
      const collapsed = textarea.selectionStart === textarea.selectionEnd;
      if (collapsed && (e.key === ')' || e.key === ']') && nextChar === e.key) {
        e.preventDefault();
        textarea.setSelectionRange(textarea.selectionStart + 1, textarea.selectionStart + 1);
        return;
      }
      if (collapsed && e.key === '"' && nextChar === '"') {
        e.preventDefault();
        textarea.setSelectionRange(textarea.selectionStart + 1, textarea.selectionStart + 1);
        return;
      }
      if (collapsed && (e.key === '(' || e.key === '[' || e.key === '"')) {
        e.preventDefault();
        const close = e.key === '(' ? ')' : e.key === '[' ? ']' : '"';
        insertText(e.key + close, 1);
        if (e.key === '"') setTimeout(() => openPopup(true), 0);
        return;
      }
      // Typing a pipe starts a new clause: pad it and offer the operators.
      if (collapsed && e.key === '|') {
        e.preventDefault();
        insertText('| ');
        pipePadAt = textarea.selectionStart;
        setTimeout(() => openPopup(true), 0);
        return;
      }
      // Swallow the space the analyst types next — the pipe already added one.
      if (collapsed && e.key === ' ' && pipePadAt === textarea.selectionStart) {
        e.preventDefault();
        pipePadAt = -1;
        return;
      }
      pipePadAt = -1;
    });

    textarea.addEventListener('input', () => {
      render();
      persist();
      openPopup(false);
    });
    textarea.addEventListener('scroll', () => { syncScroll(); if (!popup.hidden) renderPopup(); });
    textarea.addEventListener('click', () => { closePopup(); renderStatus(); });
    textarea.addEventListener('keyup', e => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) renderStatus();
    });
    textarea.addEventListener('blur', () => setTimeout(closePopup, 120));
    popup.addEventListener('mousedown', e => {
      const row = e.target.closest('.kql-ac-item');
      if (!row) return;
      e.preventDefault();
      accept(Number(row.dataset.i));
    });

    // Make every existing `el.value = ...` in views.js repaint the editor.
    Object.defineProperty(textarea, 'value', {
      configurable: true,
      get: readValue,
      set(v) { writeValue(v); render(); persist(); },
    });

    const api = {
      el: textarea,
      getValue: readValue,
      setValue(v, opt) {
        writeValue(v);
        render();
        if (!opt || opt.persist !== false) persist();
      },
      focus() { textarea.focus(); },
      refresh: render,
      restoreDraft() {
        if (!options.storageKey) return false;
        let draft = null;
        try { draft = localStorage.getItem(options.storageKey + '.draft'); } catch {}
        if (draft == null || !draft.trim()) return false;
        writeValue(draft);
        render();
        return true;
      },
      clearDraft() {
        if (!options.storageKey) return;
        try { localStorage.removeItem(options.storageKey + '.draft'); } catch {}
      },
    };
    textarea._kqlEditor = api;
    measure();
    render();
    return api;
  }

  // --- saved queries (the portal's Save / Save as, persisted locally) -----
  function savedQueryKey(storageKey) { return (storageKey || 'hsl.kql') + '.saved'; }
  function loadSavedKqlQueries(storageKey) {
    try {
      const raw = localStorage.getItem(savedQueryKey(storageKey));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  function writeSavedKqlQueries(storageKey, list) {
    try { localStorage.setItem(savedQueryKey(storageKey), JSON.stringify(list)); } catch {}
  }
  function saveKqlQuery(storageKey, name, query) {
    const list = loadSavedKqlQueries(storageKey);
    const existing = list.findIndex(q => q.name.toLowerCase() === name.toLowerCase());
    const entry = { name, query, savedAt: new Date().toISOString() };
    if (existing >= 0) list[existing] = entry; else list.push(entry);
    writeSavedKqlQueries(storageKey, list);
    return list;
  }
  function deleteSavedKqlQuery(storageKey, name) {
    const list = loadSavedKqlQueries(storageKey).filter(q => q.name !== name);
    writeSavedKqlQueries(storageKey, list);
    return list;
  }

  window.attachKqlEditor = attachKqlEditor;
  window.loadSavedKqlQueries = loadSavedKqlQueries;
  window.saveKqlQuery = saveKqlQuery;
  window.deleteSavedKqlQuery = deleteSavedKqlQuery;
})();
