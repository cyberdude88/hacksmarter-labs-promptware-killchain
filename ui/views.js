// SC-200_lab view rendering. Each VIEWS[route] is a function returning an HTML string.
// View functions may also return { html, onMount } if they need post-render wiring.

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false });
}
// Authentication evidence is read in UTC — a real sign-in log is stamped in UTC,
// and Module 01's alert narrative quotes those exact clock times. Rendering it
// in the browser's local zone would silently shift 09:09 to something else and
// break the student's ability to match the alert to the log line.
function fmtUtc(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { timeZone:'UTC', month:'short', day:'numeric' });
  const time = d.toLocaleTimeString('en-GB', { timeZone:'UTC', hour12:false, hour:'2-digit',
                                               minute:'2-digit', ...(opts.seconds ? { second:'2-digit' } : {}) });
  return `${date}, ${time}`;
}
function fieldLabel(k) { return (FIELDS.find(f => f.key === k) || { label:k }).label; }
function copyToClipboard(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.value || el.textContent || '';
  if (!navigator.clipboard?.writeText) {
    toast('Clipboard API is not available in this browser session.');
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => toast('Copied to clipboard.'))
    .catch(() => toast('Clipboard permission was not granted.'));
}

// Mock KQL evaluator used by the hunting, logs, and ASIM parser surfaces.
// Supported subset: let bindings, union, join (inner/leftouter), summarize
// with count/sum/dcount/countif/arg_max and bin(), parse/extend/project,
// render timechart/barchart/piechart, externaldata over a bundled CSV, and
// common where predicates (==, !=, in, has, contains, startswith, endswith,
// between, matches regex, isempty, isnull, and date comparisons).
function mockKqlTables() {
  return {
    ...MOCK_QUERY_RESULTS,
    KQLPractice_CL: KQL_PRACTICE_ROWS,
    _Im_Dns: IM_DNS,
    _Im_Authentication: ASIM_AUTHENTICATION_ROWS,
    _Im_NetworkSession: ASIM_NETWORK_SESSION_ROWS,
    SyntheticTransactions_CL: SYNTHETIC_TRANSACTIONS,
    ThreatIntelIndicators: THREAT_INTEL_INDICATORS,
  };
}
function mockKqlCloneRows(rows) {
  return rows.map(r => ({ ...r }));
}
function mockKqlStripComments(text) {
  return String(text || '').replace(/^\s*\/\/.*$/gm, '').trim();
}
function mockKqlTrimParens(text) {
  let out = String(text || '').trim();
  while (out.startsWith('(') && out.endsWith(')')) {
    let depth = 0, ok = true, quote = '';
    for (let i = 0; i < out.length; i++) {
      const ch = out[i];
      if (quote) {
        if (ch === quote && out[i - 1] !== '\\') quote = '';
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') {
        depth--;
        if (depth === 0 && i < out.length - 1) { ok = false; break; }
      }
    }
    if (!ok || depth !== 0) break;
    out = out.slice(1, -1).trim();
  }
  return out;
}
function mockKqlSplitTopLevel(text, needle) {
  const out = [];
  const src = String(text || '');
  const token = String(needle);
  let depth = 0, quote = '', cur = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      cur += ch;
      if (ch === quote && src[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (depth === 0 && src.slice(i, i + token.length) === token) {
      out.push(cur);
      cur = '';
      i += token.length - 1;
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function mockKqlCsvToRows(csvText) {
  const lines = String(csvText || '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parseLine = line => {
    const out = [];
    let cur = '', quote = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        if (ch === quote && line[i - 1] !== '\\') quote = '';
        else cur += ch;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === ',') { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map(v => v.trim());
  };
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}
function mockKqlMaybeDate(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}
function mockKqlComparable(value) {
  const dt = mockKqlMaybeDate(value);
  if (dt) return dt.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const num = Number(value);
  return Number.isNaN(num) ? String(value ?? '') : num;
}
function mockKqlValueList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const keys = Object.keys(item);
        if (keys.length === 1) return [item[keys[0]]];
        if ('Value' in item) return [item.Value];
        return [keys.length ? item[keys[0]] : item];
      }
      return [item];
    });
  }
  if (value && typeof value === 'object') return Object.values(value);
  if (value == null) return [];
  return [value];
}
function mockKqlDateUnit(unit) {
  const u = String(unit || '').toLowerCase();
  const m = u.match(/^(\d+)\s*(ms|s|m|h|d|w)$/);
  const amount = m ? parseInt(m[1], 10) : 1;
  const kind = m ? m[2] : u;
  if (kind.startsWith('ms')) return amount;
  if (kind.startsWith('s')) return amount * 1000;
  if (kind.startsWith('m')) return amount * 60e3;
  if (kind.startsWith('h')) return amount * 3600e3;
  if (kind.startsWith('d')) return amount * 86400e3;
  if (kind.startsWith('w')) return amount * 604800e3;
  return 1;
}
function mockKqlContext(row, bindings, cache) {
  const helper = {
    tostring: v => (v == null ? '' : String(v)),
    toint: v => parseInt(v, 10),
    tolong: v => parseInt(v, 10),
    todouble: v => parseFloat(v),
    tolower: v => String(v ?? '').toLowerCase(),
    toupper: v => String(v ?? '').toUpperCase(),
    trim: v => String(v ?? '').trim(),
    parse_json: v => {
      if (v && typeof v === 'object') return v;
      try { return JSON.parse(String(v || '{}')); } catch { return {}; }
    },
    split: (v, sep) => String(v ?? '').split(String(sep ?? ',')),
    extract: (pattern, idx, value) => {
      let re;
      try {
        const pat = String(pattern ?? '').replace(/^@/, '');
        re = new RegExp(pat);
      } catch { return null; }
      const match = String(value ?? '').match(re);
      const group = parseInt(idx, 10);
      return match ? (match[group] ?? null) : null;
    },
    bin: (value, period) => {
      const dt = mockKqlMaybeDate(value);
      if (!dt) return value;
      const size = mockKqlDateUnit(period);
      const rounded = Math.floor(dt.getTime() / size) * size;
      return new Date(rounded).toISOString();
    },
    ago: span => {
      const m = String(span || '').trim().match(/^(\d+)\s*([smhdw])$/i);
      const size = m ? mockKqlDateUnit(m[2]) : 0;
      const amount = m ? parseInt(m[1], 10) : 0;
      return new Date(Date.now() - amount * size);
    },
    now: () => new Date(),
    datetime: value => new Date(String(value ?? '')),
    datetime_diff: (unit, left, right) => {
      const a = mockKqlMaybeDate(left);
      const b = mockKqlMaybeDate(right);
      if (!a || !b) return 0;
      const divisor = mockKqlDateUnit(unit);
      return Math.round((a.getTime() - b.getTime()) / divisor);
    },
    coalesce: (...vals) => vals.find(v => v != null && v !== ''),
    isempty: v => v == null || v === '',
    isnull: v => v == null,
    hasText: (left, right) => String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase()),
    startsWithText: (left, right) => String(left ?? '').toLowerCase().startsWith(String(right ?? '').toLowerCase()),
    endsWithText: (left, right) => String(left ?? '').toLowerCase().endsWith(String(right ?? '').toLowerCase()),
    containsText: (left, right) => String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase()),
    inList: (left, list) => mockKqlValueList(list).some(v => String(v ?? '').toLowerCase() === String(left ?? '').toLowerCase()),
    notInList: (left, list) => !helper.inList(left, list),
    hasAny: (left, list) => mockKqlValueList(list).some(v => String(left ?? '').toLowerCase().includes(String(v ?? '').toLowerCase())),
    matchesRegex: (left, pattern) => {
      try { return new RegExp(String(pattern)).test(String(left ?? '')); } catch { return false; }
    },
    abs: value => Math.abs(Number(value) || 0),
  };
  return { ...helper, ...row };
}
function mockKqlRewriteScalarExpr(expr) {
  return String(expr || '')
    .replace(/@\s*"/g, '"')
    .replace(/\bago\(\s*(\d+\s*[smhdw])\s*\)/gi, (_, span) => `ago("${span.replace(/\s+/g, '')}")`)
    .replace(/\bdatetime\(\s*([0-9]{4}-[0-9T:\-\.Z]+)\s*\)/gi, (_, value) => `datetime("${value}")`)
    .replace(/\bbin\(\s*([^,]+),\s*(\d+\s*[smhdw])\s*\)/gi, (_, value, unit) => `bin(${value}, "${unit.replace(/\s+/g, '')}")`);
}
function mockKqlEvalScalar(expr, row, bindings, cache) {
  const js = mockKqlRewriteScalarExpr(expr);
  try {
    return Function('ctx', `with(ctx){ return (${js}); }`)(mockKqlContext(row, bindings, cache));
  } catch {
    return null;
  }
}
function mockKqlEvalList(expr, row, bindings, cache) {
  const trimmed = mockKqlTrimParens(String(expr || '').trim());
  if (!trimmed) return [];
  if (bindings[trimmed] != null) {
    const resolved = mockKqlResolveBinding(trimmed, bindings, cache);
    return mockKqlValueList(resolved);
  }
  return mockKqlSplitTopLevel(trimmed, ',').map(item => mockKqlEvalScalar(item.trim(), row, bindings, cache)).filter(v => v !== undefined);
}
function mockKqlCompare(left, right, op) {
  const lDate = mockKqlMaybeDate(left);
  const rDate = mockKqlMaybeDate(right);
  const l = lDate ? lDate.getTime() : mockKqlComparable(left);
  const r = rDate ? rDate.getTime() : mockKqlComparable(right);
  switch (op) {
    case '==': return l === r;
    case '!=': return l !== r;
    case '>': return l > r;
    case '>=': return l >= r;
    case '<': return l < r;
    case '<=': return l <= r;
    default: return false;
  }
}
// Process the escape sequences inside an already-unquoted KQL string literal.
function mockKqlUnescapeLiteral(s) {
  return String(s ?? '').replace(/\\(["'\\ntr])/g, (_, c) =>
    ({ n: '\n', t: '\t', r: '\r' }[c] || c));
}

function mockKqlEvalPredicate(expr, row, bindings, cache) {
  let text = mockKqlTrimParens(String(expr || '').trim());
  const orParts = mockKqlSplitTopLevel(text, ' or ');
  if (orParts.length > 1) return orParts.some(part => mockKqlEvalPredicate(part, row, bindings, cache));
  const andParts = mockKqlSplitTopLevel(text, ' and ');
  if (andParts.length > 1) return andParts.every(part => mockKqlEvalPredicate(part, row, bindings, cache));
  if (/^not\s+/i.test(text)) return !mockKqlEvalPredicate(text.replace(/^not\s+/i, ''), row, bindings, cache);

  let m;
  if ((m = text.match(/^isempty\((.+)\)$/i))) return !!mockKqlContext(row, bindings, cache).isempty(mockKqlEvalScalar(m[1], row, bindings, cache));
  if ((m = text.match(/^isnull\((.+)\)$/i))) return !!mockKqlContext(row, bindings, cache).isnull(mockKqlEvalScalar(m[1], row, bindings, cache));
  if ((m = text.match(/^(.+?)\s+between\s+\(\s*(.+?)\s*\.\.\s*(.+?)\s*\)$/i))) {
    const left = mockKqlEvalScalar(m[1], row, bindings, cache);
    return mockKqlCompare(left, mockKqlEvalScalar(m[2], row, bindings, cache), '>=') &&
      mockKqlCompare(left, mockKqlEvalScalar(m[3], row, bindings, cache), '<=');
  }
  if ((m = text.match(/^(.+?)\s+matches\s+regex\s+"([^"]*)"$/i))) return mockKqlContext(row, bindings, cache).matchesRegex(mockKqlEvalScalar(m[1], row, bindings, cache), m[2]);
  if ((m = text.match(/^(.+?)\s+(!?has_any)\s+\((.+)\)$/i))) {
    const left = mockKqlEvalScalar(m[1], row, bindings, cache);
    const values = mockKqlEvalList(m[3], row, bindings, cache);
    const matched = values.some(v => String(left ?? '').toLowerCase().includes(String(v ?? '').toLowerCase()));
    return m[2].startsWith('!') ? !matched : matched;
  }
  if ((m = text.match(/^(.+?)\s+(has|contains|startswith|endswith)\s+"([^"]*)"$/i))) {
    const left = mockKqlEvalScalar(m[1], row, bindings, cache);
    // This branch captures the literal raw, so escapes still need processing —
    // the == path gets it for free by evaluating the literal as JS. Without
    // this, `startswith "C:\\Users"` never matches a path containing `C:\Users`.
    const right = mockKqlUnescapeLiteral(m[3]);
    const ctx = mockKqlContext(row, bindings, cache);
    if (m[2].toLowerCase() === 'has') return ctx.hasText(left, right);
    if (m[2].toLowerCase() === 'contains') return ctx.containsText(left, right);
    if (m[2].toLowerCase() === 'startswith') return ctx.startsWithText(left, right);
    return ctx.endsWithText(left, right);
  }
  if ((m = text.match(/^(.+?)\s+(!?in)\s+\((.+)\)$/i))) {
    const left = mockKqlEvalScalar(m[1], row, bindings, cache);
    const values = mockKqlEvalList(m[3], row, bindings, cache);
    const matched = values.some(v => String(v ?? '').toLowerCase() === String(left ?? '').toLowerCase());
    return m[2].startsWith('!') ? !matched : matched;
  }
  if ((m = text.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/))) {
    const left = mockKqlEvalScalar(m[1], row, bindings, cache);
    const right = mockKqlEvalScalar(m[3], row, bindings, cache);
    return mockKqlCompare(left, right, m[2]);
  }

  const js = mockKqlRewriteScalarExpr(text)
    .replace(/\btrue\b/gi, 'true')
    .replace(/\bfalse\b/gi, 'false')
    .replace(/\bnull\b/gi, 'null')
    .replace(/\bnot\s+/gi, '!')
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+has_any\s+\(([^)]+)\)/gi, 'hasAny($1, [$2])')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+(!?in)\s+\(([^)]+)\)/gi, (_, left, op, list) => `${op.startsWith('!') ? 'notInList' : 'inList'}(${left}, [${list}])`)
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+has\s+"([^"]*)"/gi, 'hasText($1, "$2")')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+contains\s+"([^"]*)"/gi, 'containsText($1, "$2")')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+startswith\s+"([^"]*)"/gi, 'startsWithText($1, "$2")')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+endswith\s+"([^"]*)"/gi, 'endsWithText($1, "$2")')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+matches\s+regex\s+"([^"]*)"/gi, 'matchesRegex($1, "$2")')
    .replace(/([A-Za-z_][A-Za-z0-9_.]*)\s+between\s+\(\s*(.+?)\s*\.\.\s*(.+?)\s*\)/gi, 'betweenValues($1, $2, $3)');
  try {
    return Function('ctx', `with(ctx){ return (${js}); }`)({
      ...mockKqlContext(row, bindings, cache),
      betweenValues: (left, start, end) => mockKqlCompare(left, start, '>=') && mockKqlCompare(left, end, '<='),
    });
  } catch {
    return false;
  }
}
function mockKqlParseCsvSource(sourceName) {
  return mockKqlCsvToRows(KQL_EXTERNALDATA_CSV);
}
function mockKqlResolveBinding(name, bindings, cache) {
  if (cache.bindingResults[name] != null) return cache.bindingResults[name];
  const expr = bindings[name];
  if (expr == null) return null;
  const resolved = mockKqlEvaluate(expr, bindings, cache);
  cache.bindingResults[name] = resolved;
  return resolved;
}
// ASIM fixtures are a frozen telemetry snapshot. Relative parser parameters
// therefore use the newest row in that parser as the lab clock; evaluating
// ago(1d) against the learner's wall clock would make every saved query expire.
function mockKqlParserTime(value, rows, bindings, cache) {
  const expression = String(value || '').trim();
  const latest = rows.reduce((max, row) => {
    const time = new Date(row.TimeGenerated || row.Timestamp || '').getTime();
    return Number.isFinite(time) ? Math.max(max, time) : max;
  }, Number.NEGATIVE_INFINITY);
  if (/^now\(\)$/i.test(expression) && Number.isFinite(latest)) return new Date(latest);
  const ago = expression.match(/^ago\(\s*(\d+\s*(?:ms|s|m|h|d|w))\s*\)$/i);
  if (ago) {
    if (Number.isFinite(latest)) return new Date(latest - mockKqlDateUnit(ago[1]));
  }
  return mockKqlMaybeDate(mockKqlEvalScalar(value, {}, bindings, cache));
}

function mockKqlParserList(value, bindings, cache) {
  const name = String(value || '').trim();
  const expression = bindings[name] != null ? String(bindings[name]).trim() : name;
  const dynamic = expression.match(/^dynamic\s*\(\s*([\s\S]+)\s*\)$/i);
  if (dynamic) {
    try { return mockKqlValueList(JSON.parse(dynamic[1].replace(/'/g, '"'))); }
    catch { return []; }
  }
  return mockKqlValueList(mockKqlEvalScalar(expression, {}, bindings, cache));
}
function mockKqlEvaluateSource(expr, bindings, cache) {
  const source = mockKqlTrimParens(String(expr || '').trim());
  if (!source) return [];
  if (bindings[source] != null) return mockKqlResolveBinding(source, bindings, cache);
  if (/^union\b/i.test(source)) {
    const parts = mockKqlSplitTopLevel(source.replace(/^union\b\s*/i, ''), ',');
    return parts.flatMap(part => mockKqlNormalizeRows(mockKqlEvaluateSource(part.trim(), bindings, cache)));
  }
  if (/^externaldata\b/i.test(source)) return mockKqlParseCsvSource(source);
  const workspaceMatch = source.match(/^workspace\s*\(\s*["'][^"']+["']\s*\)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (workspaceMatch) return mockKqlCloneRows(mockKqlTables()[workspaceMatch[1]] || []);
  const fnMatch = source.match(/^(_Im_[A-Za-z0-9_]+)\s*\(([\s\S]*)\)$/);
  if (fnMatch) {
    const rows = mockKqlCloneRows(mockKqlTables()[fnMatch[1]] || []);
    const params = {};
    mockKqlSplitTopLevel(fnMatch[2], ',').forEach(part => {
      const eq = part.indexOf('=');
      if (eq < 0) return;
      params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
    });
    let out = rows;
    if (params.starttime) {
      const dt = mockKqlParserTime(params.starttime, rows, bindings, cache);
      if (dt) out = out.filter(row => mockKqlCompare(row.TimeGenerated || row.Timestamp, dt, '>='));
    }
    if (params.endtime) {
      const dt = mockKqlParserTime(params.endtime, rows, bindings, cache);
      if (dt) out = out.filter(row => mockKqlCompare(row.TimeGenerated || row.Timestamp, dt, '<='));
    }
    if (params.eventtype) {
      const ev = String(mockKqlEvalScalar(params.eventtype, {}, bindings, cache) ?? '').toLowerCase();
      out = out.filter(row => String(row.EventType ?? '').toLowerCase() === ev);
    }
    if (params.srcipaddr) {
      const ip = String(mockKqlEvalScalar(params.srcipaddr, {}, bindings, cache) ?? '');
      out = out.filter(row => String(row.SrcIpAddr ?? '') === ip);
    }
    if (params.dstipaddr) {
      const ip = String(mockKqlEvalScalar(params.dstipaddr, {}, bindings, cache) ?? '');
      out = out.filter(row => String(row.DstIpAddr ?? '') === ip);
    }
    if (params.responsecodename) {
      const code = String(mockKqlEvalScalar(params.responsecodename, {}, bindings, cache) ?? '').toLowerCase();
      out = out.filter(row => String(row.EventResultDetails ?? '').toLowerCase() === code);
    }
    if (params.domain_has_any) {
      const domains = mockKqlParserList(params.domain_has_any, bindings, cache).map(value => String(value).toLowerCase());
      out = out.filter(row => domains.some(domain => String(row.DnsQuery ?? '').toLowerCase().includes(domain)));
    }
    if (params.response_has_ipv4) {
      const ip = String(mockKqlEvalScalar(params.response_has_ipv4, {}, bindings, cache) ?? '');
      out = out.filter(row => String(row.DnsResponseName ?? '').includes(ip));
    }
    if (params.response_has_any_prefix) {
      const prefixes = mockKqlParserList(params.response_has_any_prefix, bindings, cache).map(String);
      out = out.filter(row => prefixes.some(prefix => String(row.DnsResponseName ?? '').startsWith(prefix)));
    }
    return out;
  }
  if (mockKqlTables()[source]) return mockKqlCloneRows(mockKqlTables()[source]);
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(source)) {
    const table = mockKqlTables()[source];
    return table ? mockKqlCloneRows(table) : [];
  }
  return mockKqlEvaluate(source, bindings, cache).rows;
}
function mockKqlNormalizeRows(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.rows)) return value.rows;
  return [];
}
function mockKqlFindTopLevelEquals(text) {
  let depth = 0, quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && ch === '=') return i;
  }
  return -1;
}
function mockKqlParseAssignments(text) {
  return mockKqlSplitTopLevel(text, ',').map(item => item.trim()).filter(Boolean).map(item => {
    const eq = mockKqlFindTopLevelEquals(item);
    if (eq >= 0) return { name: item.slice(0, eq).trim(), expr: item.slice(eq + 1).trim() };
    return { name: item, expr: item };
  });
}
function mockKqlApplyProject(rows, clause, bindings, cache, keepExisting) {
  const assignments = mockKqlParseAssignments(clause);
  return rows.map(row => {
    const base = keepExisting ? { ...row } : {};
    assignments.forEach(({ name, expr }) => {
      base[name] = mockKqlEvalScalar(expr, row, bindings, cache);
    });
    return base;
  });
}
function mockKqlApplyParse(rows, clause, bindings, cache) {
  const m = clause.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s+with\s+(.+)$/i);
  if (!m) return rows;
  const sourceField = m[1];
  const pattern = m[2];
  const tokens = [];
  let i = 0;
  while (i < pattern.length) {
    while (i < pattern.length && /\s/.test(pattern[i])) i++;
    if (i >= pattern.length) break;
    if (pattern[i] === '"' || pattern[i] === "'") {
      const quote = pattern[i++];
      let literal = '';
      while (i < pattern.length && pattern[i] !== quote) literal += pattern[i++];
      if (pattern[i] === quote) i++;
      tokens.push({ type:'literal', value:literal });
      continue;
    }
    let word = '';
    while (i < pattern.length && !/\s/.test(pattern[i])) word += pattern[i++];
    if (word) {
      if (word === '*') tokens.push({ type:'wildcard' });
      else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(word)) tokens.push({ type:'capture', value:word });
      else tokens.push({ type:'literal', value:word });
    }
  }
  return rows.map(row => {
    const text = String(row[sourceField] ?? '');
    const out = { ...row };
    let cursor = 0;
    for (let idx = 0; idx < tokens.length; idx++) {
      const token = tokens[idx];
      if (token.type === 'wildcard') continue;
      if (token.type === 'literal') {
        const pos = text.indexOf(token.value, cursor);
        if (pos < 0) return row;
        cursor = pos + token.value.length;
        continue;
      }
      const nextLiteral = tokens.slice(idx + 1).find(t => t.type === 'literal');
      if (!nextLiteral) {
        out[token.value] = text.slice(cursor).trim();
        cursor = text.length;
        continue;
      }
      const pos = text.indexOf(nextLiteral.value, cursor);
      if (pos < 0) return row;
      out[token.value] = text.slice(cursor, pos).trim();
      cursor = pos;
    }
    return out;
  });
}
function mockKqlApplyExtend(rows, clause, bindings, cache) {
  const assignments = mockKqlParseAssignments(clause);
  return rows.map(row => {
    const next = { ...row };
    assignments.forEach(({ name, expr }) => {
      next[name] = mockKqlEvalScalar(expr, row, bindings, cache);
    });
    return next;
  });
}
function mockKqlApplyWhere(rows, clause, bindings, cache) {
  return rows.filter(row => mockKqlEvalPredicate(clause, row, bindings, cache));
}
function mockKqlApplyJoin(leftRows, clause, bindings, cache) {
  const kindMatch = clause.match(/^kind\s*=\s*(inner|leftouter)\s+/i);
  const kind = kindMatch ? kindMatch[1].toLowerCase() : 'inner';
  const rest = kindMatch ? clause.slice(kindMatch[0].length).trim() : clause.trim();
  let rightExpr = '';
  let onExpr = '';
  if (rest.startsWith('(')) {
    let depth = 0, end = -1, quote = '';
    for (let i = 0; i < rest.length; i++) {
      const ch = rest[i];
      if (quote) {
        if (ch === quote && rest[i - 1] !== '\\') quote = '';
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    rightExpr = rest.slice(1, end).trim();
    onExpr = rest.slice(end + 1).trim().replace(/^on\s+/i, '');
  } else {
    const onIdx = rest.toLowerCase().lastIndexOf(' on ');
    if (onIdx >= 0) {
      rightExpr = rest.slice(0, onIdx).trim();
      onExpr = rest.slice(onIdx + 4).trim();
    } else {
      rightExpr = rest.trim();
    }
  }
  const rightRows = mockKqlNormalizeRows(mockKqlEvaluateSource(rightExpr, bindings, cache));
  const cond = onExpr || '';
  const explicit = cond.match(/^\$left\.([A-Za-z_][A-Za-z0-9_]*)\s*==\s*\$right\.([A-Za-z_][A-Za-z0-9_]*)$/i);
  const simple = !explicit && cond.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
  const out = [];
  leftRows.forEach(left => {
    const matches = rightRows.filter(right => {
      if (explicit) return String(left[explicit[1]] ?? '') === String(right[explicit[2]] ?? '');
      if (simple) return String(left[simple[1]] ?? '') === String(right[simple[1]] ?? '');
      return mockKqlEvalPredicate(cond, { ...left, $right: right }, bindings, cache);
    });
    if (matches.length) {
      matches.forEach(right => out.push({ ...left, ...right }));
    } else if (kind === 'leftouter') {
      out.push({ ...left });
    }
  });
  return out;
}
function mockKqlApplySummarize(rows, clause, bindings, cache) {
  const byIdx = clause.toLowerCase().lastIndexOf(' by ');
  const aggText = byIdx >= 0 ? clause.slice(0, byIdx).trim() : clause.trim();
  const byText = byIdx >= 0 ? clause.slice(byIdx + 4).trim() : '';
  const groupExprs = byText ? mockKqlSplitTopLevel(byText, ',').map(s => s.trim()).filter(Boolean) : [];
  const aggItems = mockKqlSplitTopLevel(aggText, ',').map(s => s.trim()).filter(Boolean);
  const groups = new Map();
  rows.forEach(row => {
    const keyParts = groupExprs.map(expr => {
      const bin = expr.match(/^bin\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([^)]+)\)$/i);
      if (bin) return { col: bin[1], value: mockKqlEvalScalar(expr, row, bindings, cache) };
      const alias = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (alias) return { col: alias[1], value: mockKqlEvalScalar(alias[2], row, bindings, cache) };
      return { col: expr, value: mockKqlEvalScalar(expr, row, bindings, cache) };
    });
    const key = JSON.stringify(keyParts.map(p => p.value));
    const bucket = groups.get(key) || { rows: [], keys: keyParts };
    bucket.rows.push(row);
    groups.set(key, bucket);
  });

  const result = [];
  groups.forEach(bucket => {
    const groupRow = {};
    bucket.keys.forEach(k => { groupRow[k.col] = k.value; });
    aggItems.forEach(item => {
      const alias = item.match(/^([A-Za-z_][A-Za-z0-9_]*|\([^)]+\))\s*=\s*(.+)$/);
      const name = alias ? alias[1] : null;
      const expr = alias ? alias[2] : item;
      let m;
      if ((m = expr.match(/^count\(\)$/i))) {
        groupRow[name || 'count_'] = bucket.rows.length;
      } else if ((m = expr.match(/^sum\(\s*([^)]+)\s*\)$/i))) {
        const field = m[1];
        const outName = name || field.replace(/[^\w]+/g, '_') + '_sum';
        groupRow[outName] = bucket.rows.reduce((n, row) => n + (Number(mockKqlEvalScalar(field, row, bindings, cache)) || 0), 0);
      } else if ((m = expr.match(/^dcount\(\s*([^)]+)\s*\)$/i))) {
        const field = m[1];
        const outName = name || field.replace(/[^\w]+/g, '_') + '_dcount';
        groupRow[outName] = new Set(bucket.rows.map(row => mockKqlEvalScalar(field, row, bindings, cache))).size;
      } else if ((m = expr.match(/^countif\(\s*(.+)\s*\)$/i))) {
        const outName = name || 'countif';
        groupRow[outName] = bucket.rows.filter(row => mockKqlEvalPredicate(m[1], row, bindings, cache)).length;
      } else if ((m = expr.match(/^arg_max\(\s*([^,]+)\s*,\s*(.+)\)$/i))) {
        const maxField = m[1].trim();
        const selectFields = m[2].trim();
        const best = bucket.rows.reduce((winner, row) => {
          if (!winner) return row;
          return mockKqlCompare(mockKqlEvalScalar(maxField, row, bindings, cache), mockKqlEvalScalar(maxField, winner, bindings, cache), '>') ? row : winner;
        }, null);
        const selected = selectFields === '*' ? best : null;
        if (name && name.startsWith('(') && name.endsWith(')')) {
          const cols = name.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
          const picks = selectFields === '*' ? cols : mockKqlSplitTopLevel(selectFields, ',').map(s => s.trim());
          cols.forEach((col, index) => {
            const pick = picks[index] || picks[0] || col;
            groupRow[col] = selectFields === '*' ? best?.[col] : mockKqlEvalScalar(pick, best || {}, bindings, cache);
          });
        } else {
          const outName = name || maxField.trim();
          groupRow[outName] = best ? mockKqlEvalScalar(selectFields === '*' ? maxField : selectFields.split(',')[0], best, bindings, cache) : null;
        }
      }
    });
    result.push(groupRow);
  });
  return result;
}
function mockKqlSortRows(rows, clause, bindings, cache) {
  const specs = mockKqlSplitTopLevel(clause, ',').map(spec => {
    const m = spec.trim().match(/^(.+?)\s+(asc|desc)$/i);
    return { field: (m ? m[1] : spec).trim(), dir: m ? m[2].toLowerCase() : 'asc' };
  });
  return rows.slice().sort((a, b) => {
    for (const spec of specs) {
      const av = mockKqlComparable(mockKqlEvalScalar(spec.field, a, bindings, cache) ?? a[spec.field]);
      const bv = mockKqlComparable(mockKqlEvalScalar(spec.field, b, bindings, cache) ?? b[spec.field]);
      if (av === bv) continue;
      return (av > bv ? 1 : -1) * (spec.dir === 'desc' ? -1 : 1);
    }
    return 0;
  });
}
function mockKqlTopRows(rows, clause, bindings, cache) {
  const m = clause.match(/^(\d+)\s+by\s+(.+?)(?:\s+(asc|desc))?$/i);
  if (!m) return rows.slice(0, parseInt(clause, 10) || rows.length);
  const limit = parseInt(m[1], 10);
  const sortClause = `${m[2].trim()} ${m[3] || 'desc'}`;
  return mockKqlSortRows(rows, sortClause, bindings, cache).slice(0, limit);
}
function mockKqlApplyPipeline(rows, pipeline, bindings, cache, result) {
  let current = rows;
  let render = result.render || null;
  for (const clause of pipeline) {
    const lower = clause.toLowerCase();
    if (lower.startsWith('where ')) current = mockKqlApplyWhere(current, clause.slice(6).trim(), bindings, cache);
    else if (lower.startsWith('extend ')) current = mockKqlApplyExtend(current, clause.slice(7).trim(), bindings, cache);
    else if (lower.startsWith('parse ')) current = mockKqlApplyParse(current, clause.slice(6).trim(), bindings, cache);
    else if (lower.startsWith('project ')) current = mockKqlApplyProject(current, clause.slice(8).trim(), bindings, cache, false);
    else if (lower.startsWith('project-away ')) {
      const drop = new Set(mockKqlSplitTopLevel(clause.slice(13).trim(), ',').map(s => s.trim()));
      current = current.map(row => {
        const next = { ...row };
        drop.forEach(field => { delete next[field]; });
        return next;
      });
    } else if (lower.startsWith('summarize ')) current = mockKqlApplySummarize(current, clause.slice(10).trim(), bindings, cache);
    else if (lower.startsWith('join ')) current = mockKqlApplyJoin(current, clause.slice(5).trim(), bindings, cache);
    else if (lower.startsWith('order by ')) current = mockKqlSortRows(current, clause.slice(9).trim(), bindings, cache);
    else if (lower.startsWith('sort by ')) current = mockKqlSortRows(current, clause.slice(8).trim(), bindings, cache);
    else if (lower.startsWith('top ')) current = mockKqlTopRows(current, clause.slice(4).trim(), bindings, cache);
    else if (lower.startsWith('take ')) current = current.slice(0, parseInt(clause.slice(5).trim(), 10) || 0);
    else if (lower.startsWith('render ')) render = { kind: clause.slice(7).trim().split(/\s+/)[0].toLowerCase() };
  }
  result.render = render;
  return current;
}
function mockKqlIsQueryLike(expr) {
  const text = mockKqlTrimParens(String(expr || '').trim());
  return /[|]/.test(text) || /^union\b/i.test(text) || /^externaldata\b/i.test(text) || /^[A-Za-z_][A-Za-z0-9_]*\s*\|/i.test(text);
}
function mockKqlEvaluate(expr, bindings = {}, cache = { bindingResults: {}, tables: mockKqlTables() }) {
  const text = mockKqlStripComments(expr);
  const localBindings = {};
  let body = text;
  while (true) {
    const m = body.match(/^\s*let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*?);\s*/i);
    if (!m) break;
    localBindings[m[1]] = m[2].trim();
    body = body.slice(m[0].length);
  }
  const mergedBindings = { ...bindings, ...localBindings };
  const segments = mockKqlSplitTopLevel(body.trim(), '|').map(s => s.trim()).filter(Boolean);
  if (!segments.length) return { rows: [], cols: ['(no rows)'], render: null, source: '' };
  const sourceExpr = segments.shift();
  const initialRows = mockKqlNormalizeRows(mockKqlEvaluateSource(sourceExpr, mergedBindings, cache));
  const result = { rows: [], cols: [], render: null, source: sourceExpr };
  result.rows = mockKqlApplyPipeline(initialRows, segments, mergedBindings, cache, result);
  result.cols = result.rows.length ? Object.keys(result.rows[0]) : (initialRows.length ? Object.keys(initialRows[0]) : ['(no rows)']);
  if (!result.rows.length && initialRows.length && !segments.length) result.rows = initialRows;
  if (!result.cols.length) result.cols = ['(no rows)'];
  return result;
}
function mockKqlResultSummary(result) {
  const cols = result.cols || [];
  return cols.length ? cols.join(' · ') : '(no columns)';
}
function mockKqlRenderChart(result) {
  const kind = (result.render && result.render.kind) || '';
  if (!kind || !result.rows.length) return '';
  const rows = result.rows.slice(0, 8);
  const cols = result.cols || [];
  const labelKey = cols[0];
  const numericKey = cols.find((col, index) => index > 0 && rows.some(row => !Number.isNaN(Number(row[col]))));
  if (kind === 'piechart') {
    const values = rows.map((row, index) => Number(row[numericKey || cols[1]] ?? (rows.length ? 1 : 0)) || 0);
    const total = values.reduce((n, v) => n + v, 0) || 1;
    const size = 180, r = 70, cx = 90, cy = 90;
    let start = -90;
    const slices = rows.map((row, index) => {
      const value = values[index] || 0;
      const sweep = (value / total) * 360;
      const end = start + sweep;
      const large = sweep > 180 ? 1 : 0;
      const color = ['#0078d4', '#50e6ff', '#107c10', '#ff8c00', '#d13438', '#8864d2'][index % 6];
      const startRad = start * Math.PI / 180;
      const endRad = end * Math.PI / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      start = end;
      return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}" opacity="0.92"></path>`;
    }).join('');
    return `
      <div class="kql-chart" style="margin:10px 0 14px; padding:10px; border:1px solid var(--border); border-radius:4px; background:#fff;">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>${esc(cap(kind))} chart</strong>
          <span class="muted">${esc(labelKey)}${numericKey ? ' · ' + esc(numericKey) : ''}</span>
        </div>
        <div style="display:flex; gap:16px; align-items:center;">
          <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="${esc(kind)} chart">${slices}<circle cx="90" cy="90" r="36" fill="#fff"></circle></svg>
          <div style="display:grid; gap:6px; min-width:0;">
            ${rows.map((row, index) => `<div style="display:flex; gap:8px; align-items:center;"><span class="tag" style="background:${['#0078d4','#50e6ff','#107c10','#ff8c00','#d13438','#8864d2'][index % 6]}; color:#fff;">${esc(row[labelKey] ?? labelKey)}</span><span class="muted">${esc(rows[index][numericKey] ?? values[index] ?? 0)}</span></div>`).join('')}
          </div>
        </div>
      </div>`;
  }
  const values = rows.map(row => Number(row[numericKey] ?? row.count_ ?? row.Events ?? 1) || 0);
  const max = Math.max(...values, 1);
  const width = 560, height = 180;
  const barWidth = width / rows.length;
  const chartBars = rows.map((row, index) => {
    const value = values[index];
    const barHeight = Math.max(8, Math.round((value / max) * 120));
    const x = index * barWidth + 18;
    const y = 135 - barHeight;
    const label = String(row[labelKey] ?? labelKey).slice(0, 24);
    return `
      <g>
        <rect x="${x}" y="${y}" width="${Math.max(18, barWidth - 28)}" height="${barHeight}" rx="2" fill="${kind === 'timechart' ? '#0078d4' : '#5c2d91'}"></rect>
        <text x="${x + Math.max(9, (barWidth - 28) / 2)}" y="148" text-anchor="middle" font-size="11" fill="#605e5c">${esc(label)}</text>
        <text x="${x + Math.max(9, (barWidth - 28) / 2)}" y="${Math.max(24, y - 6)}" text-anchor="middle" font-size="11" fill="#201f1e">${esc(value)}</text>
      </g>`;
  }).join('');
  return `
    <div class="kql-chart" style="margin:10px 0 14px; padding:10px; border:1px solid var(--border); border-radius:4px; background:#fff;">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>${esc(cap(kind))} chart</strong>
        <span class="muted">${esc(labelKey)}${numericKey ? ' · ' + esc(numericKey) : ''}</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="${esc(kind)} chart">
        <line x1="12" y1="136" x2="${width - 12}" y2="136" stroke="#d2d0ce"></line>
        ${chartBars}
      </svg>
    </div>`;
}
// ---------- hunting results: entity recognition + Inspect record ----------
// Column names that carry an asset identifier. The portal enriches these in the
// Inspect record panel and turns them into links to the entity profile pages.
const HUNT_DEVICE_COLUMNS = ['DeviceName','DeviceId','RemoteDeviceName','SrcDeviceName','DstDeviceName',
  'TargetDeviceName','InitiatingProcessRemoteDeviceName','Computer','ComputerName','DvcHostname','Hostname'];
const HUNT_ACCOUNT_COLUMNS = ['AccountName','AccountUpn','AccountDisplayName','AccountSid','UserPrincipalName',
  'InitiatingProcessAccountName','InitiatingProcessAccountUpn','TargetAccountUpn','TargetUserName','TargetUsername',
  'ActorPrincipalName','ActorUserName','SubjectUserName','SrcUserName','TargetUser','Identity','User','UserId'];
const HUNT_MAILBOX_COLUMNS = ['RecipientEmailAddress','SenderFromAddress','SenderMailFromAddress',
  'SenderDisplayName','RecipientObjectId'];

// Per-results-pane record store. Keyed by the container id so the hunting,
// ASIM, Sentinel practice, and DNS panes can each be inspected independently.
const HUNT_RESULT_PANES = {};

function huntResolveDevice(value) {
  const raw = String(value ?? '').trim();
  if (!raw || typeof DEVICES === 'undefined') return null;
  const v = raw.toLowerCase();
  const short = v.split('.')[0];
  return DEVICES.find(d =>
    [d.id, d.name].filter(Boolean).some(x => {
      const c = String(x).toLowerCase();
      return c === v || c === short;
    })) || null;
}
function huntResolveIdentity(value) {
  const raw = String(value ?? '').trim();
  if (!raw || typeof IDENTITIES === 'undefined') return null;
  const v = raw.toLowerCase();
  // HACKSMARTERLABS\jdoe and jdoe@hacksmarterlabs.example both resolve to the jdoe identity.
  const bare = (v.includes('\\') ? v.split('\\').pop() : v).split('@')[0];
  return IDENTITIES.find(i =>
    [i.id, i.upn, i.samName, i.displayName, i.sid].filter(Boolean).some(x => {
      const c = String(x).toLowerCase();
      return c === v || c === bare || c.split('@')[0] === bare;
    })) || null;
}
function huntEntityFor(col, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (HUNT_DEVICE_COLUMNS.includes(col)) {
    const d = huntResolveDevice(raw);
    if (d) return { kind:'device', id:d.id, label:raw, record:d };
  }
  if (HUNT_ACCOUNT_COLUMNS.includes(col) || HUNT_MAILBOX_COLUMNS.includes(col)) {
    const i = huntResolveIdentity(raw);
    if (i) return { kind:'identity', id:i.id, label:raw, record:i };
  }
  // Unresolved mailbox addresses still read as mailbox assets in the panel.
  if (HUNT_MAILBOX_COLUMNS.includes(col) && raw.includes('@')) {
    return { kind:'mailbox', id:raw, label:raw, record:null };
  }
  return null;
}
// A cell value that maps to a known asset becomes a link to its profile page.
function huntCellHtml(col, value) {
  const entity = huntEntityFor(col, value);
  if (!entity || entity.kind === 'mailbox') return esc(value ?? '');
  const noun = entity.kind === 'device' ? 'device' : 'identity';
  return `<button type="button" class="hunt-entity-link" data-hunt-entity="${esc(entity.kind)}" data-hunt-entity-id="${esc(entity.id)}" title="Open the ${noun} page for ${esc(entity.label)}">${esc(entity.label)}</button>`;
}

function mockKqlRenderResult(result, opts = {}) {
  const rows = result.rows || [];
  const cols = result.cols || [];
  const chart = mockKqlRenderChart(result);
  const paneId = opts.resultsId || 'kql-results';
  // Stash the records so the Inspect record panel can read them back by index.
  HUNT_RESULT_PANES[paneId] = { rows, cols, queryId: opts.queryId || null };
  return `
    ${chart}
    <table class="grid hunt-grid" data-hunt-pane="${esc(paneId)}">
      <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${
        rows.length
          ? rows.map((r, i) => `
              <tr class="hunt-row" data-hunt-row="${i}" tabindex="0" role="button"
                  aria-label="Inspect record ${i + 1} of ${rows.length}">
                ${cols.map(c => `<td class="kv">${huntCellHtml(c, r[c])}</td>`).join('')}
              </tr>`).join('')
          : `<tr><td colspan="${Math.max(1, cols.length)}" class="muted">(no rows matched)</td></tr>`
      }</tbody>
    </table>
    ${rows.length ? '<div class="hunt-grid-hint muted">Select a row to inspect the record. Asset values open the entity page.</div>' : ''}`;
}

// Body of the Inspect record panel: an Assets summary of the mailboxes,
// devices, and users in the record, then every column value in the record.
function huntInspectRecordBody(paneId, index) {
  const pane = HUNT_RESULT_PANES[paneId];
  if (!pane || !pane.rows[index]) return '<div class="muted">This record is no longer available. Run the query again.</div>';
  const row = pane.rows[index];
  const cols = pane.cols.length ? pane.cols : Object.keys(row);

  const assets = [];
  const seen = new Set();
  cols.forEach(col => {
    const entity = huntEntityFor(col, row[col]);
    if (!entity) return;
    const key = `${entity.kind}:${entity.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    assets.push({ ...entity, col });
  });

  const sev = level => level === 'High' ? 'high' : level === 'Medium' ? 'medium' : 'low';
  const assetCard = a => {
    if (a.kind === 'device') {
      const d = a.record;
      return `
        <div class="hunt-asset">
          <div class="hunt-asset-head">
            <span class="hunt-asset-icon" aria-hidden="true">🖥️</span>
            <div>
              <div class="hunt-asset-name">${esc(d.name)}</div>
              <div class="hunt-asset-sub muted">Device · ${esc(d.os)} · seen in ${esc(a.col)}</div>
            </div>
          </div>
          <div class="pill-row">
            <span class="sev ${sev(d.riskLevel)}">Risk: ${esc(d.riskLevel)}</span>
            <span class="sev ${sev(d.exposureLevel)}">Exposure: ${esc(d.exposureLevel)}</span>
            ${d.isInternetFacing ? '<span class="tag">Internet facing</span>' : ''}
            ${d.openAlerts ? `<span class="tag">${d.openAlerts} active alert${d.openAlerts === 1 ? '' : 's'}</span>` : ''}
          </div>
          <div class="hunt-asset-meta muted">Primary user ${esc(d.primaryUser)} · IP ${esc(d.ip)} · last seen ${esc(fmtTime(d.lastSeen))}</div>
          <button class="btn btn-secondary btn-sm" onclick="openDevice('${esc(d.id)}')">Open device page</button>
        </div>`;
    }
    if (a.kind === 'identity') {
      const i = a.record;
      return `
        <div class="hunt-asset">
          <div class="hunt-asset-head">
            <span class="hunt-asset-icon" aria-hidden="true">👤</span>
            <div>
              <div class="hunt-asset-name">${esc(i.displayName)}</div>
              <div class="hunt-asset-sub muted">${esc(i.accountType)} account · ${esc(i.upn)} · seen in ${esc(a.col)}</div>
            </div>
          </div>
          <div class="pill-row">
            <span class="sev ${sev(i.riskLevel)}">Risk: ${esc(i.riskLevel)}</span>
            ${i.privileged ? '<span class="tag">Privileged</span>' : ''}
            ${i.sensitive ? '<span class="tag">Sensitive</span>' : ''}
            ${i.openAlerts ? `<span class="tag">${i.openAlerts} active alert${i.openAlerts === 1 ? '' : 's'}</span>` : ''}
          </div>
          <div class="hunt-asset-meta muted">${esc(i.department)} · ${esc(i.title)} · ${i.devicesSeen} device${i.devicesSeen === 1 ? '' : 's'} · last seen ${esc(fmtTime(i.lastSeen))}</div>
          <button class="btn btn-secondary btn-sm" onclick="openIdentity('${esc(i.id)}')">Open identity page</button>
        </div>`;
    }
    return `
      <div class="hunt-asset">
        <div class="hunt-asset-head">
          <span class="hunt-asset-icon" aria-hidden="true">✉️</span>
          <div>
            <div class="hunt-asset-name">${esc(a.label)}</div>
            <div class="hunt-asset-sub muted">Mailbox · seen in ${esc(a.col)} · not onboarded in this lab tenant</div>
          </div>
        </div>
      </div>`;
  };

  const detailRow = col => {
    const value = row[col];
    const display = value && typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
    const isJson = value && typeof value === 'object';
    return `
      <div class="hunt-detail">
        <div class="hunt-detail-key">${esc(col)}</div>
        <div class="hunt-detail-value">${isJson ? `<pre class="hunt-detail-json">${esc(display)}</pre>` : huntCellHtml(col, display)}</div>
        <details class="hunt-detail-menu">
          <summary aria-label="Query actions for ${esc(col)}">⋯</summary>
          <div class="hunt-detail-actions">
            <button onclick="huntAddFilter('${esc(paneId)}',${index},'${esc(col)}','==')">Include (==)</button>
            <button onclick="huntAddFilter('${esc(paneId)}',${index},'${esc(col)}','!=')">Exclude (!=)</button>
            <button onclick="huntAddFilter('${esc(paneId)}',${index},'${esc(col)}','contains')">contains</button>
            <button onclick="huntAddFilter('${esc(paneId)}',${index},'${esc(col)}','startswith')">starts with</button>
            <button onclick="huntAddFilter('${esc(paneId)}',${index},'${esc(col)}','endswith')">ends with</button>
            <button onclick="huntCopyValue('${esc(paneId)}',${index},'${esc(col)}')">Copy value</button>
          </div>
        </details>
      </div>`;
  };

  return `
    <div class="hunt-record-section">
      <div class="alert-section-title">Assets</div>
      ${assets.length
        ? assets.map(assetCard).join('')
        : '<div class="callout info">No mailbox, device, or user asset was recognized in this record.</div>'}
    </div>
    <div class="hunt-record-section">
      <div class="alert-section-title">All details</div>
      <div class="hunt-detail-list">${cols.map(detailRow).join('')}</div>
    </div>`;
}
function renderMockAsimLab(config) {
  const initialQuery = config.savedQueries[0].query;
  const initialExpected = config.savedQueries[0].expectedRows;
  return {
    html: `
    <div class="page-header hunting-page-header">
      <div>
        <div class="breadcrumb">${esc(config.crumb)} › <strong>${esc(config.title)}</strong></div>
        <h1>${esc(config.heading)}</h1>
        <div class="page-subtitle">${esc(config.subtitle)}</div>
      </div>
      <div class="page-actions">
        <a class="btn btn-secondary" href="#/sentinel/hunting">Advanced hunting</a>
        ${config.nextHref ? `<a class="btn btn-secondary" href="${esc(config.nextHref)}">${esc(config.nextLabel || 'Next parser')}</a>` : ''}
        <button class="btn btn-primary" onclick="${esc(config.runFn)}()">Run query</button>
      </div>
    </div>
    <div class="kpi-strip hunting-status-cards">
      <div class="kpi"><span class="kpi-label">Rows</span><span class="kpi-value">${config.rows.length}</span><span class="kpi-delta">${esc(config.schemaVersion || 'ASIM')}</span></div>
      <div class="kpi"><span class="kpi-label">Saved queries</span><span class="kpi-value">${config.savedQueries.length}</span><span class="kpi-delta">Practice set</span></div>
      <div class="kpi"><span class="kpi-label">Normalization</span><span class="kpi-value">${config.mappings.length}</span><span class="kpi-delta">Source → ASIM</span></div>
      <div class="kpi"><span class="kpi-label">Default task</span><span class="kpi-value">${initialExpected}</span><span class="kpi-delta">Expected rows</span></div>
    </div>
    <div class="hunting-workspace">
      <aside class="hunting-schema-sidebar" aria-label="Saved queries">
        <div class="hunting-sidebar-header">
          <strong>Saved queries</strong>
          <span>${config.savedQueries.length}</span>
        </div>
        <div class="hunting-saved-queries" id="${esc(config.listId)}">
          ${config.savedQueries.map((q, index) => `
            <button class="saved-query-row${index === 0 ? ' active' : ''}" type="button" data-asim-query-index="${index}">
              <span>${esc(q.name)}</span>
              <small>${esc(q.description)}</small>
            </button>
          `).join('')}
        </div>
        <div class="hunting-saved-queries kql-saved-user" id="${esc(config.listId)}-user"></div>
      </aside>
      <section class="hunting-query-results" aria-label="Query and results">
        <div class="hunting-query-editor">
          <div class="hunting-section-toolbar">
            <strong>Query</strong>
            <span class="muted">${esc(config.queryHint)}</span>
          </div>
          <div class="callout info" id="${esc(config.statusId)}">Loaded task: <strong>${esc(config.savedQueries[0].name)}</strong> · expected ${initialExpected} rows.</div>
          <textarea id="${esc(config.queryId)}" class="kql hunting-kql">${esc(initialQuery)}</textarea>
          <div class="kql-toolbar">
            <button class="btn btn-primary btn-sm" onclick="${esc(config.runFn)}()">Run query</button>
            <button class="btn btn-secondary btn-sm" id="${esc(config.queryId)}-save">Save query</button>
            <button class="btn btn-secondary btn-sm" onclick="${esc(config.loadFn)}(0)">Load first query</button>
            <button class="btn btn-ghost btn-sm" id="${esc(config.queryId)}-reset">Reset to task</button>
            <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${esc(config.queryId)}')">Copy</button>
          </div>
        </div>
        <div class="hunting-results" id="${esc(config.resultsId)}">
          <div class="card-toolbar"><strong>Results</strong></div>
          <div class="card-body muted">Run a query to see normalized rows.</div>
        </div>
      </section>
    </div>
    <div class="two-col" style="margin-top:16px;">
      <div class="card">
        <div class="card-toolbar"><strong>Source rows</strong><span class="muted">${esc(config.sourceLabel)}</span></div>
        <table class="grid compact-grid">
          <thead><tr>${config.sourceColumns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${config.rows.map(row => `
            <tr>${config.sourceColumns.map(c => `<td class="${c === 'Message' ? 'kv' : 'kv'}">${esc(row[c] ?? '')}</td>`).join('')}</tr>
          `).join('')}</tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-toolbar"><strong>Normalization study card</strong><span class="muted">Source columns → ASIM columns</span></div>
        <table class="grid compact-grid">
          <thead><tr><th>Source field</th><th>ASIM field</th><th>Why it matters</th></tr></thead>
          <tbody>${config.mappings.map(m => `
            <tr>
              <td><strong>${esc(m.source)}</strong></td>
              <td class="kv">${esc(m.asim)}</td>
              <td>${esc(m.note)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
        <div class="callout info" style="margin:12px;">${esc(config.studyNote)}</div>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-toolbar"><strong>${esc(config.sourceLabel)} notes</strong><span class="muted">${config.notes.length} reminders</span></div>
      <div class="tile-grid" style="padding:12px;">
        ${config.notes.map(note => `
          <div class="tile">
            <div class="tile-title">${esc(note.title)}</div>
            <div class="tile-sub">${esc(note.detail)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    `,
    onMount: () => {
      const buttons = Array.from(document.querySelectorAll('[data-asim-query-index]'));
      // Full KQL editor: highlighting, schema-aware completion, and a draft
      // that survives navigating away from the page.
      const editor = attachKqlEditor(document.getElementById(config.queryId), {
        storageKey: config.storageKey,
        onRun: () => runQuery(),
      });
      function currentTask() {
        const index = Number(sessionStorage.getItem(config.storageKey) || 0);
        return config.savedQueries[index] || config.savedQueries[0];
      }
      function renderUserSaved() {
        const host = document.getElementById(config.listId + '-user');
        if (!host) return;
        const list = loadSavedKqlQueries(config.storageKey);
        host.innerHTML = list.length ? `
          <div class="alert-section-title">My saved queries</div>
          ${list.map(q => `
            <button class="saved-query-row" type="button" data-user-query="${esc(q.name)}">
              <span>${esc(q.name)}</span>
              <small>Saved ${esc(fmtTime(q.savedAt))}</small>
              <span class="kql-saved-delete" role="button" tabindex="0" title="Delete saved query" data-delete-query="${esc(q.name)}">×</span>
            </button>
          `).join('')}` : '';
        host.querySelectorAll('[data-user-query]').forEach(btn => {
          btn.addEventListener('click', event => {
            if (event.target.closest('[data-delete-query]')) return;
            const entry = loadSavedKqlQueries(config.storageKey).find(q => q.name === btn.dataset.userQuery);
            if (!entry) return;
            editor.setValue(entry.query);
            const status = document.getElementById(config.statusId);
            if (status) {
              status.className = 'callout info';
              status.innerHTML = `Loaded saved query: <strong>${esc(entry.name)}</strong>.`;
            }
            runQuery();
          });
        });
        host.querySelectorAll('[data-delete-query]').forEach(del => {
          del.addEventListener('click', event => {
            event.stopPropagation();
            deleteSavedKqlQuery(config.storageKey, del.dataset.deleteQuery);
            renderUserSaved();
          });
        });
      }
      function setQuery(index) {
        const q = config.savedQueries[index] || config.savedQueries[0];
        editor.setValue(q.query);
        document.getElementById(config.statusId).innerHTML = `Loaded task: <strong>${esc(q.name)}</strong> · expected ${q.expectedRows} rows.`;
        buttons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.asimQueryIndex) === index));
        sessionStorage.setItem(config.storageKey, String(index));
        runQuery();
      }
      window[config.loadFn] = index => setQuery(Number(index) || 0);
      window[config.runFn] = () => {
        runQuery();
      };
      function runQuery() {
        const q = document.getElementById(config.queryId).value;
        const selectedIndex = Number(sessionStorage.getItem(config.storageKey) || 0);
        const task = config.savedQueries[selectedIndex] || config.savedQueries[0];
        const result = mockKqlEvaluate(q);
        const ok = typeof task.expectedRows === 'number' ? result.rows.length === task.expectedRows : true;
        document.getElementById(config.resultsId).innerHTML = `
          <div class="card-toolbar">
            <strong>${result.rows.length} rows</strong>
            <span class="muted">${ok ? 'Row count matched the study card' : `Expected ${task.expectedRows} rows`} · ${esc(task.name)}</span>
          </div>
          ${mockKqlRenderResult(result, { resultsId: config.resultsId, queryId: config.queryId })}`;
        const status = document.getElementById(config.statusId);
        if (status) {
          status.className = `callout ${ok ? 'success' : 'warn'}`;
          status.innerHTML = ok
            ? `Correct answer: <strong>${esc(task.name)}</strong> returned ${result.rows.length} rows.`
            : `Result mismatch: expected ${task.expectedRows} rows for <strong>${esc(task.name)}</strong>, got ${result.rows.length}.`;
        }
      }
      buttons.forEach(btn => btn.addEventListener('click', () => setQuery(Number(btn.dataset.asimQueryIndex))));

      const saveBtn = document.getElementById(config.queryId + '-save');
      if (saveBtn) saveBtn.addEventListener('click', () => {
        const suggested = `${currentTask().name} (edited)`;
        const name = (window.prompt('Save query as', suggested) || '').trim();
        if (!name) return;
        saveKqlQuery(config.storageKey, name, editor.getValue());
        renderUserSaved();
        const status = document.getElementById(config.statusId);
        if (status) {
          status.className = 'callout success';
          status.innerHTML = `Saved <strong>${esc(name)}</strong> to this workspace's saved queries.`;
        }
      });
      const resetBtn = document.getElementById(config.queryId + '-reset');
      if (resetBtn) resetBtn.addEventListener('click', () => {
        editor.clearDraft();
        setQuery(Number(sessionStorage.getItem(config.storageKey) || 0));
      });

      renderUserSaved();
      const remembered = Number(sessionStorage.getItem(config.storageKey) || 0);
      const index = Number.isFinite(remembered) ? remembered : 0;
      // A draft the analyst left behind wins over the task template.
      if (editor.restoreDraft()) {
        const task = currentTask();
        buttons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.asimQueryIndex) === index));
        const status = document.getElementById(config.statusId);
        if (status) {
          status.className = 'callout info';
          status.innerHTML = `Restored your working draft · task <strong>${esc(task.name)}</strong> · expected ${task.expectedRows} rows.`;
        }
        runQuery();
      } else {
        setQuery(index);
      }
    },
  };
}

const VIEWS = {};

// ====================================================================
// DEFENDER XDR
// ====================================================================
// Home "Discovered devices" card: the portal's front-door summary of what the
// sensors found without an agent — total, the IoT/endpoint split, and a
// distribution-by-device-type breakdown that pivots into the inventory tabs.
function renderDiscoveredDevicesCard() {
  const iot       = DISCOVERED_DEVICES.filter(d => d.tab === 'iot');
  const network   = DISCOVERED_DEVICES.filter(d => d.tab === 'network');
  const endpoints = DISCOVERED_DEVICES.filter(d => d.tab === 'computers');
  const highValue = DISCOVERED_DEVICES.filter(d => d.highValue);

  // Rank device types by count so the widest bar is always on top.
  const byType = {};
  DISCOVERED_DEVICES.forEach(d => { byType[d.type] = (byType[d.type] || 0) + 1; });
  const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const max = types[0][1];

  // Anything first seen in the trailing week counts as "recently discovered".
  const weekAgo = new Date('2026-06-28T15:00:00Z').getTime() - 7 * 864e5;
  const recent = DISCOVERED_DEVICES.filter(d => new Date(d.firstSeen).getTime() >= weekAgo);

  return `
    <div class="two-col">
      <div class="card">
        <div class="card-toolbar">
          <strong>Discovered devices</strong>
          <a class="chip-link" href="#/defender/devices">View all →</a>
        </div>
        <div class="card-body">
          <h2 style="margin:0 0 12px">Total discovered devices: ${DISCOVERED_DEVICES.length}</h2>
          <div class="kpi-strip">
            <div class="kpi"><span class="kpi-label">IoT devices</span><span class="kpi-value">${iot.length}</span></div>
            <div class="kpi"><span class="kpi-label">Endpoints</span><span class="kpi-value">${endpoints.length}</span></div>
            <div class="kpi"><span class="kpi-label">Network devices</span><span class="kpi-value">${network.length}</span></div>
            <div class="kpi"><span class="kpi-label">High value devices</span><span class="kpi-value">${highValue.length}</span></div>
          </div>
          <div class="alert-section-title">Distribution by device type
            <span class="muted" style="font-weight:400">· ${types.length} classifications · scroll for the long tail</span>
          </div>
          <div class="discovery-bars">
          ${types.map(([type, n]) => `
            <div class="discovery-bar-row">
              <div class="discovery-bar-label"><span>${esc(type)}</span><span class="muted">${n}/${DISCOVERED_DEVICES.length}</span></div>
              <div class="bar"><i style="width:${Math.max(2, Math.round(n / max * 100))}%"></i></div>
            </div>`).join('')}
          </div>
          <button class="btn btn-secondary" style="margin-top:12px" onclick="setInventoryTab('iot');navigate('#/defender/devices')">View all IoT devices</button>
        </div>
      </div>

      <div class="card">
        <div class="card-toolbar">
          <strong>Devices discovered in the last 7 days</strong>
          <a class="chip-link" href="#/defender/device-discovery">Discovery settings →</a>
        </div>
        <div class="card-body">
          <h2 style="margin:0 0 12px">Recently discovered devices in your organization: ${recent.length}</h2>
          ${recent.length === 0 ? '<p class="muted">No new devices appeared on monitored networks this week.</p>' : `
            <table class="grid">
              <thead><tr><th>Name</th><th>Type</th><th>Onboarding status</th><th>First seen</th></tr></thead>
              <tbody>
                ${recent.map(d => `
                  <tr onclick="openDiscoveredDevice('${esc(d.id)}')">
                    <td><strong>${esc(d.name)}</strong></td>
                    <td>${esc(d.type)}</td>
                    <td>${onboardingTag(d.onboardingStatus)}</td>
                    <td>${fmtTime(d.firstSeen)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
          <div class="callout info" style="margin-top:12px">
            Discovery mode is <strong>${esc(DEVICE_DISCOVERY_SETTINGS.mode)}</strong> across ${DEVICE_DISCOVERY_SETTINGS.monitoredNetworks.filter(n => n.state === 'Monitored').length} monitored networks. ${DISCOVERED_DEVICES.filter(d => d.onboardingStatus === 'Can be onboarded').length} of these devices can be onboarded right now.
          </div>
        </div>
      </div>
    </div>
  `;
}

VIEWS['defender/home'] = () => {
  const incHigh = INCIDENTS.filter(i => i.severity === 'high').length;
  const incMed  = INCIDENTS.filter(i => i.severity === 'medium').length;
  const incOpen = INCIDENTS.filter(i => i.status !== 'Resolved').length;
  const newAlerts = alerts.filter(a => a.status === 'New' && !matchedRule(a)).length;
  const recentAlerts = alerts.slice(0, 4);

  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">XDR Security</div>
        <h1>Home</h1>
        <div class="page-subtitle">Welcome back. Here's what's happening across your environment.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary">↻ Refresh</button>
        <button class="btn btn-primary" onclick="openCopilot()">✨ Ask Security Copilot</button>
      </div>
    </div>

    <div class="kpi-strip">
      <div class="kpi">
        <span class="kpi-label">Active incidents</span>
        <span class="kpi-value">${incOpen}</span>
        <span class="kpi-delta bad">▲ 2 vs. yesterday</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">New alerts (24h)</span>
        <span class="kpi-value">${newAlerts}</span>
        <span class="kpi-delta">▼ 4 vs. yesterday</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Secure score</span>
        <span class="kpi-value">65%</span>
        <span class="kpi-delta">▲ 1.2 pts this week</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Devices at risk</span>
        <span class="kpi-value">3</span>
        <span class="kpi-delta bad">▲ 1 new</span>
      </div>
    </div>

    ${renderDiscoveredDevicesCard()}

    <div class="card guided-scenario-card">
      <div class="card-toolbar">
        <strong>Guided scenarios</strong>
        <span class="muted">Coach marks over the existing lab views</span>
      </div>
      <div class="scenario-picker">
        ${GUIDED_SCENARIOS.map(s => `
          <button class="scenario-option" onclick="startGuidedScenario('${s.id}')">
            <span class="scenario-name">${esc(s.name)}</span>
            <span class="scenario-archetype">${esc(s.archetype)}</span>
            <span class="scenario-summary">${esc(s.summary)}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-toolbar">
          <strong>Active incidents</strong>
          <a class="chip-link" href="#/defender/incidents">View all →</a>
        </div>
        <table class="grid">
          <thead><tr><th>Severity</th><th>Title</th><th>Alerts</th><th>Status</th></tr></thead>
          <tbody>
            ${INCIDENTS.slice(0,4).map(i => `
              <tr onclick="openIncident('${i.id}')">
                <td><span class="sev ${i.severity}">${cap(i.severity)}</span></td>
                <td><strong>${esc(i.title)}</strong><br><span class="muted">${esc(i.tactics.join(' · '))}</span></td>
                <td>${i.alertCount}</td>
                <td>${esc(i.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-toolbar">
          <strong>Latest alerts</strong>
          <a class="chip-link" href="#/defender/alerts">View all →</a>
        </div>
        <table class="grid">
          <thead><tr><th>Severity</th><th>Title</th><th>Asset</th></tr></thead>
          <tbody>
            ${recentAlerts.map(a => `
              <tr onclick="openAlert('${a.id}')">
                <td><span class="sev ${a.severity}">${cap(a.severity)}</span></td>
                <td><strong>${esc(a.title)}</strong><br><span class="muted">${fmtTime(a.firstActivity)}</span></td>
                <td>${esc(a.asset)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="three-col" style="margin-top:16px;">
      <div class="card card-body">
        <div class="alert-section-title">Secure score</div>
        <div class="donut" style="--pct:65"><div class="donut-inner"><b>65%</b><span>247 / 380 pts</span></div></div>
        <div class="muted">3 high-impact actions available.</div>
        <a class="chip-link" href="#/defender/secure-score">Improve score →</a>
      </div>
      <div class="card card-body">
        <div class="alert-section-title">Active threat campaigns</div>
        ${THREAT_REPORTS.filter(t => t.status === 'Active campaign').slice(0,3).map(t => `
          <div style="margin-bottom:10px;">
            <div><span class="sev ${t.severity}">${cap(t.severity)}</span> <strong>${esc(t.name)}</strong></div>
            <div class="muted" style="font-size:12px;">${esc(t.type)} · ${t.impactedAssets} impacted asset(s)</div>
          </div>
        `).join('')}
        <a class="chip-link" href="#/defender/threat-analytics">All threat analytics →</a>
      </div>
      <div class="card card-body">
        <div class="alert-section-title">Suggested next steps</div>
        <ul style="margin:0; padding-left:18px; font-size:13px; line-height:1.7;">
          <li><a href="#/defender/incidents">Triage 5 active incidents</a></li>
          <li><a href="#/defender/hunting">Hunt for staging in C:\\Users\\Public</a></li>
          <li><a href="#/defender/suppression">Review noisy detections</a></li>
          <li><a href="#/sentinel/analytics">Tune Sentinel analytics rules</a></li>
        </ul>
      </div>
    </div>
  `;
};

VIEWS['defender/incidents'] = () => `
  <div class="page-header">
    <div><div class="breadcrumb">Investigation & response › Incidents &amp; alerts › <strong>Incidents</strong></div><h1>Incidents</h1></div>
  </div>
  <div class="filterbar">
    <span class="chip">Severity: <strong>Any</strong> ▾</span>
    <span class="chip">Status: <strong>New, In progress</strong> ▾</span>
    <span class="chip">Tags: <strong>Any</strong> ▾</span>
    <span class="chip">Time: <strong>Last 24 hours</strong> ▾</span>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>${INCIDENTS.length}</strong> incidents</div>
    <table class="grid">
      <thead><tr>
        <th>Severity</th><th>Incident name</th><th>Alerts</th><th>Tactics</th>
        <th>Status</th><th>Assigned to</th><th>Created</th><th>Action</th>
      </tr></thead>
      <tbody>
        ${INCIDENTS.map(i => `
          <tr data-incident-id="${esc(i.id)}" onclick="openIncident('${i.id}')">
            <td><span class="sev ${i.severity}">${cap(i.severity)}</span></td>
            <td>
              <button class="link-button strong" onclick="event.stopPropagation(); openIncidentPage('${esc(i.id)}')">${esc(i.title)}</button>
              <br><span class="muted">${esc(i.id)} · click row for preview</span>
            </td>
            <td>${i.alertCount}</td>
            <td>${i.tactics.map(t => `<span class="mitre">${esc(t)}</span>`).join('')}</td>
            <td>${esc(i.status)}</td>
            <td>${esc(i.assignedTo)}</td>
            <td>${fmtTime(i.createdAt)}</td>
            <td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openIncidentPage('${esc(i.id)}')">Open incident page</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

const INCIDENT_PAGE_TABS = [
  { key:'attack-story',  label:'Attack story' },
  { key:'alerts',        label:'Alerts' },
  { key:'assets',        label:'Assets' },
  { key:'evidence',      label:'Evidence and Response' },
  { key:'summary',       label:'Summary' },
  { key:'activities',    label:'Activities' },
  { key:'similar',       label:'Similar incidents' },
];

// Group all entities of an incident by type, then pair each entity with the
// alerts that reference it. Used by the Assets tab.
function renderIncidentAssets(inc, incAlerts) {
  const groups = {};
  inc.entities.forEach(e => {
    (groups[e.type] = groups[e.type] || []).push(e.name);
  });
  // Also fold in alert assets that might not be in the formal entity list.
  incAlerts.forEach(a => {
    if (!a.asset) return;
    const type = entityTypeForName(inc, a.asset) || 'Asset';
    if (!(groups[type] || []).includes(a.asset)) {
      (groups[type] = groups[type] || []).push(a.asset);
    }
  });
  return Object.entries(groups).map(([type, names]) => `
    <div class="card card-body" style="margin-bottom:14px;">
      <div class="alert-section-title">${esc(type)}${names.length>1?'s':''} (${names.length})</div>
      <table class="grid">
        <thead><tr><th>Entity</th><th>Alerts referencing</th><th>Open</th></tr></thead>
        <tbody>
          ${names.map(n => {
            const related = incAlerts.filter(a => a.asset === n);
            const opens = (type === 'Device' || type === 'Host')
              ? `<button class="btn btn-ghost btn-sm" onclick="openDevice('${esc(n)}')">Open device</button>`
              : (type === 'User' || type === 'Account' || type === 'Identity')
                ? `<button class="btn btn-ghost btn-sm" onclick="openIdentity('${esc(n)}')">Open identity</button>`
                : `<button class="btn btn-ghost btn-sm" onclick="navigate('#/defender/hunting')">Hunt</button>`;
            return `
              <tr>
                <td>${clickableEntity(type, n)}</td>
                <td>${related.length}</td>
                <td>${opens}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `).join('') || '<div class="muted">No entities recorded on this incident.</div>';
}

VIEWS['defender/incident'] = () => {
  const selectedId = sessionStorage.getItem('defender-lab.incident.id') || INCIDENTS[0].id;
  const inc = INCIDENTS.find(i => i.id === selectedId) || INCIDENTS[0];
  const incAlerts = alerts.filter(a => inc.alertIds.includes(a.id));
  const tab = sessionStorage.getItem('defender-lab.incident.tab') || 'attack-story';

  const tabBtn = t => `
    <button class="tab ${tab===t.key?'active':''}" onclick="setIncidentTab('${t.key}')">${esc(t.label)}</button>`;

  let body;
  switch (tab) {
    case 'attack-story':
      body = `
        ${renderAttackStory(inc, incAlerts)}
        ${(inc.disruptionActions || []).length ? `
          <div class="card card-body disruption-card">
            <div class="alert-section-title">Automatic attack disruption</div>
            <div class="response-flow">
              ${inc.disruptionActions.map(a => `
                <div><strong>${esc(a.action)}</strong><span>${fmtTime(a.time)} · ${esc(a.target)} · ${esc(a.result)}</span></div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div class="callout info" style="margin-top:18px;">
          The attack story stitches alerts into a chronological narrative across the kill chain.
          Use the <strong>Alerts</strong> tab for the raw row-by-row view, <strong>Assets</strong> for affected
          devices/identities/files, and <strong>Evidence and Response</strong> for entity verdicts.
        </div>`;
      break;
    case 'alerts':
      body = `
        <div class="alert-section-title">Alerts in this incident (${incAlerts.length})</div>
        <table class="grid">
          <thead><tr><th>Sev</th><th>Title</th><th>Status</th><th>Category</th><th>Source</th><th>Asset</th><th>First activity</th></tr></thead>
          <tbody>
            ${incAlerts.map(a => `
              <tr onclick="openAlert('${esc(a.id)}')">
                <td><span class="sev ${a.severity}">${cap(a.severity)}</span></td>
                <td>${esc(a.title)}</td>
                <td>${esc(a.status)}</td>
                <td>${esc(a.category)}</td>
                <td>${esc(a.detectionSource)}</td>
                <td>${clickableEntity(entityTypeForName(inc, a.asset), a.asset)}</td>
                <td>${fmtTime(a.firstActivity)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      break;
    case 'assets':
      body = renderIncidentAssets(inc, incAlerts);
      break;
    case 'evidence':
      body = `
        <p class="muted" style="margin-bottom:12px;">Defender XDR auto-analyzes events and entities and assigns each one a verdict (Malicious, Suspicious, Clean) plus a remediation status. Pending actions can be approved or rejected per row.</p>
        ${renderIncidentEvidence(inc)}`;
      break;
    case 'summary':
      body = renderIncidentSummary(inc, incAlerts);
      break;
    case 'activities':
      body = `
        <p class="muted" style="margin-bottom:12px;">Unified timeline of analyst actions, automated playbook runs, comments, severity updates, merges, and policy changes.</p>
        ${renderIncidentActivities(inc)}`;
      break;
    case 'similar':
      body = `
        <p class="muted" style="margin-bottom:12px;">Incidents that share entities, tactics, or alert titles with this one in the last 30 days.</p>
        ${renderSimilarIncidents(inc)}`;
      break;
  }

  return `
    <div class="page-header incident-page-header">
      <div>
        <div class="breadcrumb">
          <a href="#/defender/incidents">Investigation &amp; response</a> ›
          <a href="#/defender/incidents">Incidents &amp; alerts</a> ›
          <a href="#/defender/incidents">Incidents</a> ›
          <strong>${esc(inc.id)}</strong>
        </div>
        <h1>${esc(inc.title)}</h1>
        <div class="page-subtitle">${esc(inc.summary)}</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openIncident('${esc(inc.id)}')">Open preview pane</button>
        <button class="btn btn-primary" onclick="toast('Incident assigned to you (lab stub).')">Assign to me</button>
      </div>
    </div>

    <div class="incident-command-bar">
      <button class="btn btn-secondary btn-sm" onclick="toast('Incident classified (lab stub).')">Classify</button>
      <button class="btn btn-secondary btn-sm" onclick="toast('Comment added (lab stub).')">Add comment</button>
      <button class="btn btn-secondary btn-sm" onclick="toast('Tags opened (lab stub).')">Manage tags</button>
      <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender/hunting')">Go hunt</button>
    </div>

    <div class="incident-page-tabs tabs">
      ${INCIDENT_PAGE_TABS.map(tabBtn).join('')}
    </div>

    <div class="incident-page-grid">
      <section class="incident-page-main">${body}</section>

      <aside class="incident-page-side">
        <div class="card card-body">
          <div class="alert-section-title">Incident details</div>
          <dl class="summary-info">
            <dt>Incident ID</dt><dd>${esc(inc.id)}</dd>
            <dt>Severity</dt><dd><span class="sev ${inc.severity}">${cap(inc.severity)}</span></dd>
            <dt>Status</dt><dd>${esc(inc.status)}</dd>
            ${inc.responseTag ? `<dt>Response tag</dt><dd><span class="tag orange">${esc(inc.responseTag)}</span></dd>` : ''}
            <dt>Assigned</dt><dd>${esc(inc.assignedTo)}</dd>
            <dt>Created</dt><dd>${fmtTime(inc.createdAt)}</dd>
          </dl>
        </div>
        <div class="card card-body">
          <div class="alert-section-title">Entities</div>
          <div class="entity-chip-list">${inc.entities.map(e => clickableEntity(e.type, e.name)).join('')}</div>
        </div>
        <div class="card card-body">
          <div class="alert-section-title">Blast radius</div>
          ${renderBlastRadius(inc)}
        </div>
      </aside>
    </div>
  `;
};

VIEWS['defender/alerts'] = () => {
  let suppressed = 0;
  const rows = alerts.map(a => {
    const rule = matchedRule(a);
    if (rule) suppressed++;
    return `
      <tr class="${rule ? 'suppressed' : ''}" data-alert-id="${a.id}" onclick="openAlert('${a.id}')">
        <td><input type="checkbox" onclick="event.stopPropagation()"></td>
        <td><span class="sev ${a.severity}">${cap(a.severity)}</span></td>
        <td><strong>${esc(a.title)}</strong></td>
        <td><span class="status-dot ${rule ? 'resolved' : ''}"></span>${rule ? 'Suppressed' : esc(a.status)}</td>
        <td>${esc(a.category)}</td>
        <td>${esc(a.detectionSource)}</td>
        <td>${esc(a.asset)}</td>
        <td>${fmtTime(a.firstActivity)}</td>
        <td>${rule ? `<span class="tag green">${esc(rule.name)}</span>` : '<span class="muted">—</span>'}</td>
      </tr>`;
  }).join('');
  return `
    <div class="page-header">
      <div><div class="breadcrumb">Investigation & response › <strong>Alerts</strong></div><h1>Alerts</h1></div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="replayScenario()">↻ Replay scenario events</button>
        <button class="btn btn-primary" onclick="openRulePanel()">+ Create suppression rule</button>
      </div>
    </div>
    <div class="filterbar">
      <span class="chip">Severity: <strong>Any</strong> ▾</span>
      <span class="chip">Status: <strong>New, In progress</strong> ▾</span>
      <span class="chip">Detection source: <strong>Any</strong> ▾</span>
      <span class="chip">Time: <strong>Last 24 hours</strong> ▾</span>
    </div>
    <div class="card">
      <div class="card-toolbar">
        <span><strong>${alerts.length - suppressed}</strong> active · <strong>${suppressed}</strong> suppressed of ${alerts.length}</span>
      </div>
      <table class="grid">
        <thead><tr>
          <th style="width:36px"><input type="checkbox"></th>
          <th>Severity</th><th>Alert title</th><th>Status</th>
          <th>Category</th><th>Detection source</th><th>Asset</th>
          <th>First activity</th><th>Suppressed by</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

VIEWS['defender/cases'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Investigation &amp; response › <strong>Cases</strong></div>
      <h1>Case management</h1>
      <div class="page-subtitle">Coordinate owners, tasks, linked incidents, and closure notes across Defender XDR and Sentinel investigations.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="toast('Case export prepared in the lab.')">Export</button>
      <button class="btn btn-primary" onclick="toast('New case draft created in memory only.')">+ Create case</button>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Active cases</span><span class="kpi-value">${CASE_MANAGEMENT.filter(c=>c.status==='Active').length}</span></div>
    <div class="kpi"><span class="kpi-label">Draft cases</span><span class="kpi-value">${CASE_MANAGEMENT.filter(c=>c.status==='Draft').length}</span></div>
    <div class="kpi"><span class="kpi-label">Linked incidents</span><span class="kpi-value">${CASE_MANAGEMENT.reduce((n,c)=>n+c.linkedIncidents.length,0)}</span></div>
    <div class="kpi"><span class="kpi-label">Open tasks</span><span class="kpi-value">${CASE_MANAGEMENT.reduce((n,c)=>n+c.tasks.filter(t=>t.status!=='Done').length,0)}</span></div>
  </div>
  <div class="case-board">
    ${CASE_MANAGEMENT.map(c => `
      <section class="card case-card">
        <div class="card-toolbar">
          <strong>${esc(c.id)}</strong>
          <span class="tag ${c.status === 'Active' ? 'orange' : ''}">${esc(c.status)}</span>
        </div>
        <div class="case-title">${esc(c.title)}</div>
        <dl class="summary-info">
          <dt>Owner</dt><dd>${esc(c.owner)}</dd>
          <dt>Severity</dt><dd><span class="sev ${c.severity.toLowerCase()}">${esc(c.severity)}</span></dd>
          <dt>Due</dt><dd>${fmtTime(c.due)}</dd>
          <dt>Linked incidents</dt><dd>${c.linkedIncidents.map(id=>`<button class="link-button" onclick="openIncidentPage('${esc(id)}')">${esc(id)}</button>`).join(' ')}</dd>
        </dl>
        <div class="alert-section-title">Tasks</div>
        <div class="case-task-list">
          ${c.tasks.map(t => `
            <div class="case-task">
              <span class="status-dot ${t.status === 'Done' ? 'resolved' : t.status === 'In progress' ? 'warn' : ''}"></span>
              <span><strong>${esc(t.title)}</strong><small>${esc(t.assignee)} · ${esc(t.status)}</small></span>
            </div>
          `).join('')}
        </div>
        <div class="callout ${c.status === 'Active' ? 'warn' : 'info'}">${esc(c.closure)}</div>
      </section>
    `).join('')}
  </div>
`;

VIEWS['defender/hunting'] = () => {
  const prefilled = sessionStorage.getItem('defender-lab.hunting.prefill');
  const autorun = sessionStorage.getItem('defender-lab.hunting.autorun') === '1';
  sessionStorage.removeItem('defender-lab.hunting.prefill');
  sessionStorage.removeItem('defender-lab.hunting.autorun');
  const initialQuery = prefilled || SAVED_QUERIES[0].query;
  const initialTable = SAVED_QUERIES[0].table;
  const schemaGroups = HUNTING_SCHEMA_GROUPS;
  return {
    html: `
    <div class="page-header hunting-page-header">
      <div>
        <div class="breadcrumb">Defender XDR › Hunting › <strong>Advanced hunting</strong></div>
        <h1>Advanced hunting</h1>
        <div class="page-subtitle">Query Defender XDR tables, inspect schema groups, and turn repeatable hunts into detections.</div>
      </div>
      <div class="page-actions">
        <a class="btn btn-secondary" href="#/defender/hunting-graph">Hunting graph</a>
        <a class="btn btn-primary" href="#/defender/custom-detections">Create custom detection</a>
      </div>
    </div>
    <div class="kpi-strip hunting-status-cards">
      <div class="kpi"><span class="kpi-label">Queryable raw data</span><span class="kpi-value">30d</span><span class="kpi-delta">Advanced hunting window</span></div>
      <div class="kpi"><span class="kpi-label">Event freshness</span><span class="kpi-value">Near live</span><span class="kpi-delta">After sensor processing</span></div>
      <div class="kpi"><span class="kpi-label">Entity refresh</span><span class="kpi-value">15m</span><span class="kpi-delta">Daily consolidation</span></div>
      <div class="kpi"><span class="kpi-label">Time zone</span><span class="kpi-value">UTC</span><span class="kpi-delta">All hunting timestamps</span></div>
    </div>
    <div class="hunting-workspace">
      <aside class="hunting-schema-sidebar" aria-label="Hunting schema">
        <div class="hunting-sidebar-header">
          <strong>Schema</strong>
          <span>${HUNTING_TABLES.length} tables</span>
        </div>
        <div class="hunting-schema-groups">
          ${schemaGroups.map((group, index) => `
            <section class="schema-group">
              <button class="schema-group-toggle" type="button" aria-expanded="${index < 4 ? 'true' : 'false'}">
                <span class="schema-caret">${index < 4 ? '▾' : '▸'}</span>
                <span>${esc(group.name)}</span>
                <span class="schema-count">${group.tables.length}</span>
              </button>
              <div class="schema-table-list${index < 4 ? '' : ' collapsed'}">
                ${group.tables.map(t => `
                  <button class="schema-table" type="button" data-table="${esc(t)}">
                    <span class="schema-table-icon">□</span>
                    <span>${esc(t)}</span>
                  </button>
                `).join('')}
              </div>
            </section>
          `).join('')}
        </div>
        <div class="hunting-saved-queries">
          <div class="alert-section-title">Saved queries</div>
          ${SAVED_QUERIES.map((q, i) => `
            <button class="saved-query-row" type="button" data-query-index="${i}">
              <span>${esc(q.name)}</span>
              <small>${esc(q.table)}</small>
            </button>
          `).join('')}
        </div>
      </aside>

      <section class="hunting-query-results" aria-label="Query and results">
        <div class="hunting-mode-tabs" role="tablist" aria-label="Hunting mode">
          <button type="button" class="hunting-mode-tab" data-hunting-mode="guided" role="tab"
            onclick="setHuntingMode('guided')">Guided mode</button>
          <button type="button" class="hunting-mode-tab" data-hunting-mode="advanced" role="tab"
            onclick="setHuntingMode('advanced')">Advanced mode</button>
          <span class="muted hunting-mode-hint">Guided builds the query for you; advanced is the KQL editor.</span>
        </div>
        <div class="hunting-query-editor" id="guided-panel">
          <div class="hunting-section-toolbar">
            <strong>Query builder</strong>
            <span class="muted">Build conditions without writing KQL.</span>
          </div>
          <div id="guided-builder"></div>
        </div>
        <div class="hunting-query-editor" id="advanced-panel">
          <div class="hunting-section-toolbar">
            <strong>Query</strong>
            <span class="muted">Mock executor runs against bundled fixtures.</span>
          </div>
          <textarea id="kql" class="kql hunting-kql">${esc(initialQuery)}</textarea>
          <div class="kql-toolbar">
            <button class="btn btn-primary btn-sm" onclick="runKqlQuery()">Run query</button>
            <button class="btn btn-secondary btn-sm">Save</button>
            <button class="btn btn-ghost btn-sm">Save as analytics rule</button>
          </div>
        </div>
        <div class="hunting-results" id="kql-results">
          <div class="card-toolbar"><strong>Results</strong></div>
          <div class="card-body muted">Run a query to see results.</div>
        </div>
      </section>
    </div>
    <div class="tile-grid hunting-notes">
      ${HUNTING_SCHEMA_NOTES.map(n => `
        <div class="tile">
          <div class="tile-title">${esc(n.title)}</div>
          <div class="tile-sub">${esc(n.detail)}</div>
        </div>
      `).join('')}
    </div>
  `,
    onMount: () => {
      const editor = attachKqlEditor(document.getElementById('kql'), {
        storageKey: 'defender-lab.hunting',
        onRun: () => runKqlQuery(),
      });
      // A query handed over from another page outranks the stored draft.
      if (prefilled) editor.clearDraft(); else editor.restoreDraft();
      window.runKqlQuery = () => {
        const q = document.getElementById('kql').value;
        const result = mockKqlEvaluate(q);
        document.getElementById('kql-results').innerHTML = `
          <div class="card-toolbar">
            <strong>${result.rows.length} rows</strong>
            <span class="muted">${esc(mockKqlResultSummary(result))}${result.source ? ' · ' + esc(result.source) : ''}${result.render ? ' · render ' + esc(result.render.kind) : ''}</span>
          </div>
          ${mockKqlRenderResult(result, { resultsId: 'kql-results', queryId: 'kql' })}`;
      };
      window.loadSavedQuery = (i) => {
        document.getElementById('kql').value = SAVED_QUERIES[i].query;
      };
      document.querySelectorAll('.schema-group-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const list = btn.nextElementSibling;
          const collapsed = list.classList.toggle('collapsed');
          btn.setAttribute('aria-expanded', String(!collapsed));
          btn.querySelector('.schema-caret').textContent = collapsed ? '▸' : '▾';
        });
      });
      document.querySelectorAll('.schema-table').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('kql').value = `${btn.dataset.table}\n| take 20`;
        });
      });
      document.querySelectorAll('.saved-query-row').forEach(btn => {
        btn.addEventListener('click', () => loadSavedQuery(Number(btn.dataset.queryIndex)));
      });
      guidedHuntingInit();
      // A query handed over from another page implies advanced mode; otherwise
      // restore whichever mode was last used.
      const storedMode = localStorage.getItem('defender-lab.hunting.mode');
      setHuntingMode(prefilled ? 'advanced' : (storedMode === 'guided' ? 'guided' : 'advanced'));
      if (autorun) {
        setTimeout(() => runKqlQuery(), 0);
      }
    }
  };
};

VIEWS['sentinel/hunting/authentication'] = () => renderMockAsimLab({
  crumb:'Sentinel › Hunting',
  title:'ASIM Authentication',
  heading:'ASIM Authentication hunting',
  subtitle:'Normalize Windows logons and Entra sign-ins into one parser-style view so you can filter by source IP, target user, and result without switching tables.',
  schemaVersion:'ASIM 0.1.7',
  nextHref:'#/sentinel/hunting/network-session',
  nextLabel:'Network session',
  runFn:'runAsimAuthenticationQuery',
  loadFn:'loadAsimAuthenticationQuery',
  queryId:'asim-auth-query',
  resultsId:'asim-auth-results',
  statusId:'asim-auth-status',
  listId:'asim-auth-list',
  storageKey:'defender-lab.asim-auth.query',
  queryHint:'Query the unifying _Im_Authentication parser. Filter rows from Windows and Entra sources with one query.',
  sourceLabel:'ASIM Authentication rows',
  sourceColumns:['TimeGenerated','EventProduct','SrcIpAddr','TargetUserName','EventResult','DvcAction'],
  rows:ASIM_AUTHENTICATION_ROWS,
  savedQueries:ASIM_AUTHENTICATION_SAVED_QUERIES,
  notes:ASIM_AUTHENTICATION_NOTES,
  mappings:[
    { source:'SrcIpAddr', asim:'Source IP', note:'Correlates the sign-in source across Windows and Entra evidence.' },
    { source:'TargetUserName', asim:'Target user', note:'Keeps the account pivot consistent even when the source system names differ.' },
    { source:'EventResult', asim:'Success / Failure', note:'Shows whether the normalized auth attempt worked or needs follow-up.' },
    { source:'DvcAction', asim:'Action detail', note:'Preserves the original source signal, such as MFA satisfied or risky sign-in.' },
  ],
  studyNote:'The same query shape can investigate a DC logon or an Entra sign-in, which is why ASIM helps SOC teams avoid writing separate hunts for every source.',
});

VIEWS['sentinel/hunting/network-session'] = () => renderMockAsimLab({
  crumb:'Sentinel › Hunting',
  title:'ASIM Network Session',
  heading:'ASIM Network Session hunting',
  subtitle:'Review firewall and proxy sessions in a normalized shape so blocked outbound traffic, risky destinations, and source-host blast radius stay easy to compare.',
  schemaVersion:'ASIM 0.1.7',
  nextHref:'#/sentinel/hunting/dns',
  nextLabel:'DNS hunting',
  runFn:'runAsimNetworkSessionQuery',
  loadFn:'loadAsimNetworkSessionQuery',
  queryId:'asim-network-query',
  resultsId:'asim-network-results',
  statusId:'asim-network-status',
  listId:'asim-network-list',
  storageKey:'defender-lab.asim-network.query',
  queryHint:'Query the unifying _Im_NetworkSession parser. Use the normalized fields to follow blocked or allowed traffic.',
  sourceLabel:'ASIM Network Session rows',
  sourceColumns:['TimeGenerated','SrcIpAddr','DstIpAddr','SrcHostname','DstHostname','EventResult','NetworkDirection'],
  rows:ASIM_NETWORK_SESSION_ROWS,
  savedQueries:ASIM_NETWORK_SESSION_SAVED_QUERIES,
  notes:ASIM_NETWORK_SESSION_NOTES,
  mappings:[
    { source:'SrcIpAddr', asim:'Source IP', note:'Shows where the session started, no matter which firewall emitted it.' },
    { source:'DstIpAddr', asim:'Destination IP', note:'Lets you pivot from a denied or allowed session to the target asset.' },
    { source:'NetworkDirection', asim:'Direction', note:'Separates outbound follow-on traffic from inbound exposure.' },
    { source:'DvcAction', asim:'Action detail', note:'Preserves source-specific verdict text such as allow, deny, or quarantine.' },
  ],
  studyNote:'When a question asks whether a domain or IP was contacted, a normalized network-session view avoids hunting separately in every firewall or proxy table.',
});

VIEWS['defender/custom-detections'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Hunting › <strong>Custom detections</strong></div>
      <h1>Custom detections</h1>
      <div class="page-subtitle">Turn repeatable advanced hunting queries into scheduled or near-real-time alerting and response actions.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/defender/hunting">Advanced hunting</a>
      <a class="btn btn-primary" href="#/defender/hunting">Run sample query</a>
    </div>
  </div>

  <div class="callout warn" style="margin-bottom:14px;">
    Each rule is limited to 100 alerts per run in this lab model. Tune noisy KQL before creating a detection.
  </div>

  <div class="two-col">
    <div class="card card-body">
      <div class="alert-section-title">Required query columns</div>
      <div class="connector-list">
        ${CUSTOM_DETECTION_SAMPLE.requiredColumns.map(c => `
          <div><strong>${esc(c)}</strong><span>Must be returned by the query for custom detection creation.</span></div>
        `).join('')}
      </div>
      <div class="alert-section-title">Sample KQL</div>
      <textarea class="kql" readonly>${esc(CUSTOM_DETECTION_SAMPLE.query)}</textarea>
    </div>
    <div class="card">
      <div class="card-toolbar"><strong>Rule frequency and lookback</strong></div>
      <table class="grid">
        <thead><tr><th>Frequency</th><th>Lookback</th><th>Use in this lab</th></tr></thead>
        <tbody>
          ${CUSTOM_DETECTION_FREQUENCIES.map(f => `
            <tr>
              <td><strong>${esc(f.frequency)}</strong></td>
              <td>${esc(f.lookback)}</td>
              <td>${esc(f.use)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="two-col" style="margin-top:16px;">
    <div class="card">
      <div class="card-toolbar"><strong>Impacted entity mapping</strong></div>
      <table class="grid">
        <thead><tr><th>Returned column</th><th>Supported actions</th></tr></thead>
        <tbody>
          ${CUSTOM_DETECTION_RESPONSE_ACTIONS.map(r => `
            <tr>
              <td class="kv">${esc(r.entity)}</td>
              <td>${r.actions.map(a => `<span class="tag">${esc(a)}</span>`).join('')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Build checklist</div>
      <ol style="margin:0; padding-left:20px; font-size:13px; line-height:1.8;">
        <li>Run the hunting query and remove normal daily activity.</li>
        <li>Return Timestamp, DeviceId, and ReportId.</li>
        <li>Pick severity, category, and MITRE technique mapping.</li>
        <li>Select one impacted entity column per entity type.</li>
        <li>Choose device or file actions only when the match is high confidence.</li>
        <li>Scope the rule to all devices or a specific device group.</li>
      </ol>
    </div>
  </div>
`;

function huntingGraphLayout(nodes) {
  const radiusX = nodes.length > 6 ? 39 : 34;
  const radiusY = nodes.length > 6 ? 37 : 32;
  return nodes.reduce((layout, node, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / Math.max(nodes.length, 1));
    layout[node.id] = { x:50 + Math.cos(angle) * radiusX, y:50 + Math.sin(angle) * radiusY };
    return layout;
  }, {});
}

VIEWS['defender/hunting-graph'] = () => {
  const state = currentHuntingGraphState();
  const scenario = huntingGraphScenario();
  const result = buildHuntingGraphResult();
  const entityById = Object.fromEntries(HUNTING_GRAPH_ENTITIES.map(entity => [entity.id, entity]));
  const layout = result ? huntingGraphLayout(result.nodes) : {};
  const selectedNode = result?.nodes.find(node => node.id === state.selectedNodeId) || null;
  const edgeOptions = [...new Set(HUNTING_GRAPH_SCENARIOS.flatMap(item => item.edges.map(edge => edge.label)))].sort();
  const inputSummary = scenario?.inputs.map(input => entityById[state.inputs[input.key]]?.label).filter(Boolean) || [];

  const scenarioPanel = `
    <aside class="card hunting-graph-config" aria-label="Predefined scenario configuration">
      <div class="card-toolbar">
        <div><strong>Predefined scenarios</strong><span class="muted">Select, filter, then run</span></div>
        <button class="icon-btn" type="button" aria-label="Close scenario panel" onclick="closeHuntingGraphScenarios()">✕</button>
      </div>
      <div class="hunting-graph-config-body">
        <label class="wizard-label">Scenario
          <select class="text-input" id="hunting-graph-scenario" onchange="selectHuntingGraphScenario(this.value)">
            <option value="">Select a scenario</option>
            ${HUNTING_GRAPH_SCENARIOS.map(item => `<option value="${esc(item.id)}" ${item.id === state.scenarioId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}
          </select>
        </label>
        ${scenario ? `
          <div class="hunting-scenario-summary">
            <strong>${esc(scenario.name)}</strong>
            <span>${esc(scenario.question)}</span>
            <div>${scenario.techniques.map(technique => `<span class="mitre">${esc(technique)}</span>`).join('')}</div>
          </div>
          ${scenario.inputs.length ? `
            <div class="hunting-config-section">
              <div class="alert-section-title">Required inputs</div>
              ${scenario.inputs.map(input => `
                <label class="wizard-label">${esc(input.label)}
                  <select class="text-input" onchange="setHuntingGraphInput('${esc(input.key)}', this.value)">
                    <option value="">Search or select an entity</option>
                    ${input.options.map(id => {
                      const entity = entityById[id];
                      return `<option value="${esc(id)}" ${state.inputs[input.key] === id ? 'selected' : ''}>${esc(entity?.label || id)} · ${esc(entity?.type || 'Entity')}</option>`;
                    }).join('')}
                  </select>
                </label>
              `).join('')}
            </div>
          ` : '<div class="callout info">This scenario does not require an entity input.</div>'}
          <div class="hunting-config-section">
            <div class="alert-section-title">Graph filters</div>
            <label class="hunting-check"><input type="checkbox" ${state.shortestOnly ? 'checked' : ''} onchange="setHuntingGraphFilter('shortestOnly', this.checked)"> Show only shortest paths</label>
            <label class="wizard-label">Source node
              <select class="text-input" onchange="setHuntingGraphFilter('sourceFilter', this.value)">
                ${[['any','Any source'],['critical','Is critical'],['vulnerable','Is vulnerable'],['internet','Is exposed to internet']].map(([value,label]) => `<option value="${value}" ${state.sourceFilter === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </label>
            <label class="wizard-label">Target node
              <select class="text-input" onchange="setHuntingGraphFilter('targetFilter', this.value)">
                ${[['any','Any target'],['sensitive','Has sensitive data'],['riskScore','Has risk score'],['critical','Is critical'],['vulnerable','Is vulnerable']].map(([value,label]) => `<option value="${value}" ${state.targetFilter === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </label>
            <label class="wizard-label">Edge type
              <select class="text-input" onchange="setHuntingGraphFilter('edgeFilter', this.value)">
                <option value="all">All relationships</option>
                ${edgeOptions.map(label => `<option value="${esc(label)}" ${state.edgeFilter === label ? 'selected' : ''}>${esc(label)}</option>`).join('')}
              </select>
            </label>
          </div>
          ${state.error ? `<div class="callout bad" role="alert">${esc(state.error)}</div>` : ''}
          <div class="hunting-config-actions">
            <button class="btn btn-secondary" type="button" onclick="resetHuntingGraph()">Reset</button>
            <button class="btn btn-primary" type="button" onclick="runHuntingGraphScenario()">Run scenario</button>
          </div>
        ` : '<div class="hunting-panel-empty"><span>🕸</span><strong>Choose a scenario</strong><p>Select one of the current predefined hunts to configure its inputs and filters.</p></div>'}
      </div>
    </aside>`;

  const resultPanel = `
    <aside class="card card-body hunting-graph-inspector">
      <div class="alert-section-title">${selectedNode ? 'Entity details' : 'Rendered scenario'}</div>
      ${selectedNode ? `
        <div class="hunting-entity-heading"><span>${esc(selectedNode.type)}</span><strong>${esc(selectedNode.label)}</strong></div>
        <dl class="kv-list">
          <dt>Risk</dt><dd><span class="sev ${esc(selectedNode.risk)}">${esc(cap(selectedNode.risk))}</span></dd>
          <dt>Critical</dt><dd>${selectedNode.critical ? 'Yes' : 'No'}</dd>
          <dt>Vulnerable</dt><dd>${selectedNode.vulnerable ? 'Yes' : 'No'}</dd>
          <dt>Internet exposed</dt><dd>${selectedNode.internet ? 'Yes' : 'No'}</dd>
          <dt>Sensitive data</dt><dd>${selectedNode.sensitive ? 'Yes' : 'No'}</dd>
        </dl>
        <p class="muted">${esc(selectedNode.detail)}</p>
      ` : result ? `
        <strong>${esc(result.scenario.name)}</strong>
        <p class="muted">${esc(result.scenario.question)}</p>
        ${inputSummary.length ? `<div class="hunting-result-inputs">${inputSummary.map(value => `<span class="entity-chip">${esc(value)}</span>`).join('')}</div>` : ''}
        <div class="resource-summary">
          <div><span>Nodes</span><strong>${result.nodes.length}</strong><small>Visible entities</small></div>
          <div><span>Edges</span><strong>${result.edges.length}</strong><small>Visible relationships</small></div>
        </div>
        <div class="callout info">Select any node in the graph to inspect its exposure properties.</div>
      ` : `
        <div class="hunting-panel-empty"><span>🕸</span><strong>No scenario rendered</strong><p>Open predefined scenarios, select any required entities, and run the hunt.</p></div>
      `}
      <div class="hunting-inspector-actions">
        <button class="btn btn-primary" type="button" onclick="openHuntingGraphScenarios()">${result ? 'Edit scenario' : 'Search with predefined scenarios'}</button>
        ${result ? '<button class="btn btn-secondary" type="button" onclick="resetHuntingGraph()">New graph</button>' : ''}
      </div>
      <div class="alert-section-title">Validate findings</div>
      <p class="muted">Use Advanced hunting to confirm event evidence before taking response actions or creating a custom detection.</p>
      <a class="chip-link" href="#/defender/hunting">Open Advanced hunting →</a>
    </aside>`;

  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Hunting › <strong>Hunting graph preview</strong></div>
        <h1>Hunting graph</h1>
        <div class="page-subtitle">Render fictional exposure paths, inspect entity relationships, and identify high-leverage nodes.</div>
      </div>
      <div class="page-actions">
        <a class="btn btn-secondary" href="#/defender/hunting">Advanced hunting</a>
        <button class="btn btn-primary" type="button" onclick="openHuntingGraphScenarios()">Search with predefined scenarios</button>
      </div>
    </div>
    <div class="callout info" style="margin-bottom:14px;">
      This local graph uses fictional fixtures. The workflow mirrors Defender: choose a predefined scenario, provide required entities, apply filters, and select <strong>Run scenario</strong> to render it.
    </div>
    <div class="hunting-graph-workspace ${state.panelOpen ? 'config-open' : ''}">
      <section class="card hunting-graph-card">
        <div class="card-toolbar hunting-graph-toolbar">
          <div>
            <strong>${result ? esc(result.scenario.name) : 'New graph'}</strong>
            <span class="muted">${result ? `${result.nodes.length} nodes · ${result.edges.length} edges` : 'Waiting for a scenario'}</span>
          </div>
          ${result ? '<button class="btn btn-secondary btn-sm" type="button" onclick="openHuntingGraphScenarios()">Filters</button>' : ''}
        </div>
        <div class="sentinel-graph-canvas hunting-graph-canvas">
          ${result?.nodes.length ? `
            <svg class="sentinel-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              ${result.edges.map(edge => {
                const from = layout[edge.from];
                const to = layout[edge.to];
                return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
              }).join('')}
            </svg>
            ${result.edges.map(edge => {
              const from = layout[edge.from];
              const to = layout[edge.to];
              return `<div class="sentinel-edge-label" style="left:${(from.x + to.x) / 2}%; top:${(from.y + to.y) / 2}%;">${esc(edge.label)}</div>`;
            }).join('')}
            ${result.nodes.map(node => {
              const position = layout[node.id];
              return `<button class="sentinel-graph-node risk-${esc(node.risk)} ${node.id === state.selectedNodeId ? 'selected' : ''}" style="left:${position.x}%; top:${position.y}%;" aria-pressed="${node.id === state.selectedNodeId}" onclick="selectHuntingGraphNode('${esc(node.id)}')"><span>${esc(node.type)}</span><strong>${esc(node.label)}</strong></button>`;
            }).join('')}
          ` : result ? `
            <div class="hunting-graph-empty">
              <span>∅</span><strong>No paths match these filters</strong><p>Open the scenario panel and broaden the source, target, or edge filters.</p>
              <button class="btn btn-primary" type="button" onclick="openHuntingGraphScenarios()">Edit filters</button>
            </div>
          ` : `
            <div class="hunting-graph-empty">
              <span>🕸</span><strong>Search the exposure graph</strong><p>Start with a predefined scenario and render the matching local relationships.</p>
              <button class="btn btn-primary" type="button" onclick="openHuntingGraphScenarios()">Search with predefined scenarios</button>
            </div>
          `}
        </div>
      </section>
      ${state.panelOpen ? scenarioPanel : resultPanel}
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-toolbar"><strong>Lab workflow</strong></div>
      <div class="flowline">
        <div class="flow-step"><strong>Scope</strong><span>Choose one of ${HUNTING_GRAPH_SCENARIOS.length} predefined threat and exposure questions.</span></div>
        <div class="flow-step"><strong>Constrain</strong><span>Supply required entities and narrow source, target, path, or relationship properties.</span></div>
        <div class="flow-step"><strong>Inspect</strong><span>Select graph nodes to review criticality, vulnerability, exposure, and sensitive-data context.</span></div>
        <div class="flow-step"><strong>Validate</strong><span>Pivot to KQL and confirm event evidence before response or detection automation.</span></div>
      </div>
    </div>`;
};

VIEWS['defender/threat-analytics'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Threat intelligence › <strong>Threat analytics</strong></div>
      <h1>Threat analytics</h1>
      <div class="page-subtitle">Interpret active reports by reading the overview, analyst guidance, related incidents, and tenant exposure before choosing response work.</div>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Active campaigns</span><span class="kpi-value">${THREAT_REPORTS.filter(t=>t.status==='Active campaign').length}</span></div>
    <div class="kpi"><span class="kpi-label">Reports impacting you</span><span class="kpi-value">${THREAT_REPORTS.filter(t=>t.impactedAssets>0).length}</span></div>
    <div class="kpi"><span class="kpi-label">High-severity reports</span><span class="kpi-value">${THREAT_REPORTS.filter(t=>t.severity==='high').length}</span></div>
    <div class="kpi"><span class="kpi-label">Total assets impacted</span><span class="kpi-value">${THREAT_REPORTS.reduce((s,t)=>s+t.impactedAssets,0)}</span></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>${THREAT_REPORTS.length}</strong> reports</div>
    <table class="grid">
      <thead><tr><th>Severity</th><th>Threat</th><th>Type</th><th>Status</th><th>Impacted assets</th><th>Related incidents</th></tr></thead>
      <tbody>
        ${THREAT_REPORTS.map(t => `
          <tr>
            <td><span class="sev ${t.severity}">${cap(t.severity)}</span></td>
            <td><strong>${esc(t.name)}</strong><br><span class="muted">${esc(t.summary)}</span></td>
            <td>${esc(t.type)}</td>
            <td>${esc(t.status)}</td>
            <td>${t.impactedAssets}</td>
            <td>${(t.relatedIncidents || []).map(id => `<a class="chip-link" href="#/defender/incidents" onclick="event.preventDefault(); openIncident('${esc(id)}')">${esc(id)}</a>`).join('') || '<span class="muted">None</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <div class="three-col" style="margin-top:16px;">
    ${THREAT_REPORTS.slice(0,3).map(t => `
      <div class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>${esc(t.id)} · ${esc(t.name)}</strong>
          <span class="sev ${t.severity}">${cap(t.severity)}</span>
        </div>
        <div class="alert-section-title">Overview</div>
        <ol class="mini-steps">${(t.overview || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="alert-section-title">Analyst report</div>
        <ol class="mini-steps">${(t.analystReport || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="alert-section-title">Exposure</div>
        <div class="callout ${t.impactedAssets ? 'warn' : 'info'}">${esc(t.exposure)}</div>
        <div class="alert-section-title">Interpretation guidance</div>
        <ol class="mini-steps">${(t.recommendations || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      </div>
    `).join('')}
  </div>
  <div class="card card-body" style="margin-top:16px;">
    <div class="alert-section-title">How to use this on the exam</div>
    <div class="flowline">
      <div class="flow-step"><strong>Read report scope</strong><span>Identify whether the report is a campaign, malware family, tool, or activity group.</span></div>
      <div class="flow-step"><strong>Check exposure</strong><span>Prioritize reports with impacted users, devices, apps, or vulnerabilities in your tenant.</span></div>
      <div class="flow-step"><strong>Pivot to incidents</strong><span>Open related incidents for evidence, response actions, and classification decisions.</span></div>
      <div class="flow-step"><strong>Hunt or tune</strong><span>Use analyst guidance to write KQL, create detections, or adjust controls.</span></div>
    </div>
  </div>
`;

VIEWS['defender/secure-score'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Exposure management › <strong>Secure score</strong></div><h1>Secure Score</h1></div></div>
  <div class="two-col">
    <div class="card card-body" style="text-align:center;">
      <div class="alert-section-title">Your secure score</div>
      <div class="donut" style="--pct:65; margin:8px auto;"><div class="donut-inner"><b>65%</b><span>247 / 380 pts</span></div></div>
      <div class="muted">Last updated ${fmtTime(new Date().toISOString())}</div>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Comparison</div>
      <div style="font-size:13px; line-height:2;">
        <div>Your score: <strong>65%</strong></div>
        <div>Similar-size organizations: <strong>58%</strong></div>
        <div>All organizations: <strong>43%</strong></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>Top improvement actions</strong></div>
    <table class="grid">
      <thead><tr><th>Action</th><th>Score impact</th><th>Status</th><th>Category</th></tr></thead>
      <tbody>
        <tr><td>Require MFA for all users</td><td>+12 pts</td><td><span class="tag orange">To do</span></td><td>Identity</td></tr>
        <tr><td>Enable Defender for Office 365 Plan 2</td><td>+8 pts</td><td><span class="tag orange">To do</span></td><td>Apps</td></tr>
        <tr><td>Block legacy authentication</td><td>+6 pts</td><td><span class="tag green">Completed</span></td><td>Identity</td></tr>
        <tr><td>Configure Defender for Endpoint EDR in block mode</td><td>+5 pts</td><td><span class="tag orange">To do</span></td><td>Device</td></tr>
      </tbody>
    </table>
  </div>
`;

VIEWS['defender/cloud-apps'] = () => {
  const inv = CLOUD_APP_INVESTIGATIONS[0];
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Cloud apps › <strong>Defender for Cloud Apps</strong></div>
        <h1>Defender for Cloud Apps investigation</h1>
        <div class="page-subtitle">Risky OAuth app investigation tied to ${esc(inv.incidentId)} and the phishing-to-consent abuse scenario.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openIncident('${esc(inv.incidentId)}')">Open incident preview</button>
        <button class="btn btn-primary" onclick="openIncidentPage('${esc(inv.incidentId)}')">Open in Defender XDR</button>
      </div>
    </div>
    <div class="kpi-strip">
      <div class="kpi"><span class="kpi-label">Risky app</span><span class="kpi-value">${esc(inv.appName)}</span><span class="kpi-delta bad">${esc(inv.risk)} risk</span></div>
      <div class="kpi"><span class="kpi-label">Consenting user</span><span class="kpi-value" style="font-size:18px;">${esc(inv.user)}</span></div>
      <div class="kpi"><span class="kpi-label">Scopes</span><span class="kpi-value">${inv.scopes.length}</span><span class="kpi-delta">Mail + files + refresh token</span></div>
      <div class="kpi"><span class="kpi-label">Verdict</span><span class="kpi-value" style="font-size:18px;">True positive</span></div>
    </div>
    <div class="two-col">
      <section class="card card-body">
        <div class="alert-section-title">Risky OAuth app</div>
        <dl class="summary-info">
          <dt>App name</dt><dd>${esc(inv.appName)}</dd>
          <dt>Publisher</dt><dd>${esc(inv.publisher)}</dd>
          <dt>Consent time</dt><dd>${fmtTime(inv.consentTime)}</dd>
          <dt>Incident</dt><dd><button class="link-button" onclick="openIncidentPage('${esc(inv.incidentId)}')">${esc(inv.incidentId)}</button></dd>
        </dl>
        <div class="pill-row">${inv.scopes.map(s=>`<span class="tag orange">${esc(s)}</span>`).join('')}</div>
        <div class="alert-section-title">Why risky</div>
        <ul class="compact-list">${inv.indicators.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
      </section>
      <section class="card card-body">
        <div class="alert-section-title">Response actions</div>
        <div class="response-flow">
          ${inv.response.map((r, idx) => `
            <div><strong>${idx + 1}. ${esc(r)}</strong><span>${idx < 2 ? 'High-confidence containment' : 'Investigation follow-up'}</span></div>
          `).join('')}
        </div>
        <div class="callout warn" style="margin-top:12px;">${esc(inv.verdict)}</div>
        <button class="btn btn-secondary btn-sm" onclick="toast('DocViewer Pro consent revoked in lab state.')">Revoke app consent</button>
        <button class="btn btn-secondary btn-sm" onclick="toast('Tenant app block queued in lab state.')">Block app</button>
      </section>
    </div>
    <section class="card" style="margin-top:16px;">
      <div class="card-toolbar"><strong>Investigation timeline</strong><a class="chip-link" href="#/sentinel/graph">Open Sentinel Graph →</a></div>
      <ol class="timeline card-body">
        ${inv.activity.map(a => `
          <li><div class="t-time">${fmtTime(a.time)}</div><div class="t-title">${esc(a.title)}</div><div class="muted">${esc(a.detail)}</div></li>
        `).join('')}
      </ol>
    </section>
  `;
};

VIEWS['defender/settings'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">System › <strong>Settings</strong></div>
      <h1>Defender XDR settings</h1>
      <div class="page-subtitle">MDE tenant controls for advanced features, device grouping, permissions, and automation levels.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="toast('Settings export prepared in the lab.')">Export</button>
      <a class="btn btn-secondary" href="#/defender/mto">Multi-tenant management</a>
      <button class="btn btn-primary" onclick="toast('Settings saved in lab memory only.')">Save changes</button>
    </div>
  </div>
  <div class="settings-grid">
    <section class="card card-body">
      <div class="alert-section-title">Advanced features</div>
      <div class="settings-list">
        ${MDE_SETTINGS.advancedFeatures.map(f => `
          <label class="setting-row">
            <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="toggleSettingState(this)">
            <span><strong>${esc(f.name)}</strong><small>${esc(f.note)}</small></span>
            <em>${f.enabled ? 'On' : 'Off'}</em>
          </label>
        `).join('')}
      </div>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">Rules settings</div>
      <table class="grid compact-grid">
        <thead><tr><th>Area</th><th>Current setting</th><th>Owner</th></tr></thead>
        <tbody>${MDE_SETTINGS.rulesSettings.map(r => `
          <tr><td><strong>${esc(r.area)}</strong></td><td>${esc(r.setting)}</td><td>${esc(r.owner)}</td></tr>
        `).join('')}</tbody>
      </table>
    </section>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <section class="card">
      <div class="card-toolbar"><strong>Device groups and automation levels</strong><span class="muted">Rank controls policy precedence</span></div>
      <table class="grid">
        <thead><tr><th>Rank</th><th>Device group</th><th>Devices</th><th>Automation level</th><th>Allowed role</th></tr></thead>
        <tbody>${MDE_SETTINGS.deviceGroups.map(g => `
          <tr><td>${g.rank}</td><td><strong>${esc(g.name)}</strong></td><td>${g.devices}</td><td>${esc(g.automation)}</td><td>${esc(g.role)}</td></tr>
        `).join('')}</tbody>
      </table>
    </section>
    <section class="card">
      <div class="card-toolbar"><strong>Permissions and roles</strong><a class="chip-link" href="#/defender/action-center">Review pending actions →</a></div>
      <table class="grid">
        <thead><tr><th>Role</th><th>Members</th><th>Rights</th></tr></thead>
        <tbody>${MDE_SETTINGS.roles.map(r => `
          <tr><td><strong>${esc(r.role)}</strong></td><td>${esc(r.members)}</td><td>${esc(r.rights)}</td></tr>
        `).join('')}</tbody>
      </table>
    </section>
  </div>
  <section class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>Custom data collection</strong><span class="muted">Lab-only study cards</span></div>
    <div class="tile-grid">
      ${MDE_SETTINGS.customCollection.map(c => `
        <div class="tile">
          <div class="tile-title">${esc(c.name)}</div>
          <div class="tile-sub">${esc(c.scope)}</div>
          <div><span class="entity-chip">${esc(c.table)}</span><span class="tag ${c.status === 'Collecting' ? 'green' : 'orange'}">${esc(c.status)}</span></div>
        </div>
      `).join('')}
    </div>
  </section>
`;

VIEWS['defender/mto'] = () => {
  const tenant = currentMsspTenant();
  const tenantIncidents = MTO_INCIDENTS.filter(i => i.tenant === tenant.name);
  const openIncidents = MTO_INCIDENTS.filter(i => i.status !== 'Resolved');
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">System › <strong>Multi-tenant management</strong></div>
        <h1>Defender multi-tenant management</h1>
        <div class="page-subtitle">Consolidated incident queue for a managed-security-provider style lab tenant. Use it to reason about delegated access versus customer-tenant administration.</div>
      </div>
      <div class="page-actions">
        <a class="btn btn-secondary" href="#/defender/settings">Back to settings</a>
        <button class="btn btn-primary" onclick="toast('MTO queue updated in local lab state only.')">Refresh queue</button>
      </div>
    </div>
    <div class="callout info" style="margin-bottom:16px;">
      Multi-tenant management is for delegated triage, hunting, and response across customer tenants. It does <strong>not</strong> replace customer-tenant ownership for directory, licensing, or admin-only changes.
    </div>
    <div class="kpi-strip">
      <div class="kpi"><span class="kpi-label">Customer tenants</span><span class="kpi-value">${MSSP_TENANTS.length}</span></div>
      <div class="kpi"><span class="kpi-label">Open incidents</span><span class="kpi-value">${openIncidents.length}</span></div>
      <div class="kpi"><span class="kpi-label">Selected tenant</span><span class="kpi-value">${esc(tenant.name)}</span></div>
      <div class="kpi"><span class="kpi-label">Delegated roles</span><span class="kpi-value">${tenant.delegatedRoles.length}</span></div>
    </div>
    <div class="two-col">
      <section class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Tenant switcher</strong>
          <span class="muted">Choose the customer you are triaging</span>
        </div>
        <label class="wizard-label">Active customer
          <select class="text-input" onchange="setMsspTenant(this.value)">
            ${MSSP_TENANTS.map(t => `<option value="${t.id}" ${t.id === tenant.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
          </select>
        </label>
        <div class="tile-grid" style="margin-top:12px;">
          ${MSSP_TENANTS.map(t => `
            <button class="tile ${t.id === tenant.id ? 'selected-row' : ''}" type="button" onclick="setMsspTenant('${esc(t.id)}')">
              <div class="tile-title">${esc(t.name)}</div>
              <div class="tile-sub">${esc(t.status)} · ${t.workspaces.length} workspace${t.workspaces.length === 1 ? '' : 's'}</div>
              <div style="margin-top:8px;">${t.delegatedRoles.map(role => `<span class="tag">${esc(role)}</span>`).join(' ')}</div>
            </button>
          `).join('')}
        </div>
      </section>
      <section class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Scope notes</strong>
          <span class="muted">What MTO covers and what it does not</span>
        </div>
        <div class="flowline vertical-flow">
          <div class="flow-step"><strong>MTO can</strong><span>View and triage incidents, pivot entities, run response actions, and coordinate across delegated customer workspaces.</span></div>
          <div class="flow-step"><strong>Need B2B or tenant admin</strong><span>Change directory objects, tenant settings, subscription ownership, or customer-owned configuration outside the delegated scope.</span></div>
          <div class="flow-step"><strong>Single-tenant only</strong><span>Lab tasks that touch licensing, ownership, or customer governance stay in the customer tenant even when the queue is centralized.</span></div>
        </div>
      </section>
    </div>
    <section class="card" style="margin-top:16px;">
      <div class="card-toolbar">
        <strong>Consolidated incident queue</strong>
        <span class="muted">${tenantIncidents.length} incidents for ${esc(tenant.name)}</span>
      </div>
      <table class="grid">
        <thead><tr><th>Tenant</th><th>Severity</th><th>Incident</th><th>Status</th><th>Assigned to</th></tr></thead>
        <tbody>
          ${MTO_INCIDENTS.map(incident => `
            <tr class="${incident.tenant === tenant.name ? 'active-row' : ''}">
              <td><strong>${esc(incident.tenant)}</strong></td>
              <td><span class="sev ${incident.severity === 'High' ? 'high' : incident.severity === 'Medium' ? 'medium' : 'low'}">${esc(incident.severity)}</span></td>
              <td>${esc(incident.title)}</td>
              <td>${esc(incident.status)}</td>
              <td>${esc(incident.assignedTo)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;
};

VIEWS['defender/asr-policy'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Configuration › Endpoints › <strong>Attack surface reduction</strong></div>
      <h1>ASR policy configuration</h1>
      <div class="page-subtitle">Practice choosing audit, warn, and block behavior before enforcing high-impact endpoint rules.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="toast('ASR policy duplicated for pilot testing.')">Duplicate policy</button>
      <button class="btn btn-primary" onclick="toast('ASR policy saved in the lab.')">Save policy</button>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Block rules</span><span class="kpi-value">${ASR_POLICIES.filter(p=>p.state==='Block').length}</span></div>
    <div class="kpi"><span class="kpi-label">Audit rules</span><span class="kpi-value">${ASR_POLICIES.filter(p=>p.state==='Audit').length}</span></div>
    <div class="kpi"><span class="kpi-label">Warn rules</span><span class="kpi-value">${ASR_POLICIES.filter(p=>p.state==='Warn').length}</span></div>
    <div class="kpi"><span class="kpi-label">Exclusions</span><span class="kpi-value">${ASR_POLICIES.reduce((n,p)=>n+p.exclusions.length,0)}</span></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>Rule states</strong><span class="muted">Audit first when business impact is uncertain</span></div>
    <table class="grid">
      <thead><tr><th>ASR rule</th><th>State</th><th>Mode</th><th>Exclusions</th><th>Observed impact</th></tr></thead>
      <tbody>${ASR_POLICIES.map(p => `
        <tr>
          <td><strong>${esc(p.rule)}</strong></td>
          <td><select class="input-sm"><option ${p.state==='Block'?'selected':''}>Block</option><option ${p.state==='Audit'?'selected':''}>Audit</option><option ${p.state==='Warn'?'selected':''}>Warn</option><option ${p.state==='Off'?'selected':''}>Off</option></select></td>
          <td>${esc(p.mode)}</td>
          <td>${p.exclusions.length ? p.exclusions.map(e=>`<span class="entity-chip">${esc(e)}</span>`).join('') : '<span class="muted">None</span>'}</td>
          <td>${esc(p.impact)}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  </div>
  <div class="callout info" style="margin-top:16px;">
    <strong>SC-200 decision point:</strong> use Audit to measure breakage, Warn when user override is acceptable, and Block for high-confidence protections after exclusions are justified.
  </div>
`;

VIEWS['defender/notifications'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">System › <strong>Email notifications</strong></div>
      <h1>Email notification rules</h1>
      <div class="page-subtitle">Static create flow for incident, action center, and threat analytics notifications.</div>
    </div>
    <div class="page-actions"><button class="btn btn-primary" onclick="showNotificationComposer()">+ Create notification rule</button></div>
  </div>
  <div class="two-col">
    <section class="card">
      <div class="card-toolbar"><strong>${NOTIFICATION_RULES.length}</strong> notification rules</div>
      <table class="grid">
        <thead><tr><th>Status</th><th>Name</th><th>Trigger</th><th>Recipients</th><th>Filter</th></tr></thead>
        <tbody>${NOTIFICATION_RULES.map(r => `
          <tr><td><span class="status-dot resolved"></span>${esc(r.status)}</td><td><strong>${esc(r.name)}</strong></td><td>${esc(r.trigger)}</td><td>${esc(r.recipients)}</td><td>${esc(r.filter)}</td></tr>
        `).join('')}</tbody>
      </table>
    </section>
    <section class="card card-body notification-composer" id="notification-composer">
      <div class="alert-section-title">Create notification rule</div>
      <label class="wizard-label">Rule name<input class="text-input" id="notif-name" value="Medium incidents assigned to L1"></label>
      <label class="wizard-label">Notify on
        <select class="text-input" id="notif-trigger">
          <option>Incident created or updated</option>
          <option>Action center item pending</option>
          <option>Threat analytics report impacts assets</option>
        </select>
      </label>
      <label class="wizard-label">Recipients<input class="text-input" value="l1-soc@hacksmarterlabs.example"></label>
      <label class="wizard-label">Filter<input class="text-input" value="Severity is Medium and assignedTo is L1-Triage"></label>
      <button class="btn btn-primary" onclick="createNotificationRule()">Create lab rule</button>
      <div class="callout hidden" id="notification-result"></div>
    </section>
  </div>
`;

VIEWS['defender/alert-tuning'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Investigation &amp; response › <strong>Alert tuning</strong></div>
      <h1>Alert correlation and tuning</h1>
      <div class="page-subtitle">Suppression removes matching alert noise; correlation and tuning control how alerts become incidents.</div>
    </div>
    <div class="page-actions"><button class="btn btn-primary" onclick="toast('Tuning rule draft created in the lab.')">+ Create tuning rule</button></div>
  </div>
  <div class="correlation-path">
    <div><strong>Signal</strong><span>Raw detection from MDE, MDO, MDI, MDA, Entra, or cloud workload protection.</span></div>
    <div><strong>Alert</strong><span>Entity, evidence, severity, source, and MITRE context are normalized.</span></div>
    <div><strong>Correlation</strong><span>Shared entities, time windows, and source logic group related alerts.</span></div>
    <div><strong>Incident</strong><span>The analyst receives a unified case with timeline, evidence, and response actions.</span></div>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <section class="card">
      <div class="card-toolbar"><strong>Incident rollup examples</strong><a class="chip-link" href="#/defender/incidents">Open incidents →</a></div>
      <table class="grid">
        <thead><tr><th>Incident</th><th>Correlated alerts</th><th>Why grouped</th></tr></thead>
        <tbody>${INCIDENTS.filter(i => i.alertIds.length > 1).slice(0,5).map(i => `
          <tr onclick="openIncident('${i.id}')">
            <td><span class="sev ${i.severity}">${cap(i.severity)}</span> <strong>${esc(i.title)}</strong></td>
            <td>${i.alertIds.map(id=>`<span class="entity-chip">${esc(id)}</span>`).join('')}</td>
            <td>${esc(i.entities.slice(0,2).map(e=>e.name).join(' + '))} inside the same investigation window</td>
          </tr>
        `).join('')}</tbody>
      </table>
    </section>
    <section class="card">
      <div class="card-toolbar"><strong>Tuning rules</strong><a class="chip-link" href="#/defender/suppression">Compare suppression →</a></div>
      <table class="grid">
        <thead><tr><th>Status</th><th>Name</th><th>Type</th><th>Outcome</th></tr></thead>
        <tbody>${ALERT_TUNING_RULES.map(r => `
          <tr><td><span class="tag ${r.status === 'Enabled' ? 'green' : 'orange'}">${esc(r.status)}</span></td><td><strong>${esc(r.name)}</strong><br><span class="muted">${esc(r.condition)}</span></td><td>${esc(r.type)}</td><td>${esc(r.outcome)}</td></tr>
        `).join('')}</tbody>
      </table>
    </section>
  </div>
`;

VIEWS['defender/air'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Investigation &amp; response › <strong>AIR center</strong></div>
      <h1>Automated investigation and response</h1>
      <div class="page-subtitle">Review automated investigations, remediation approvals, and automatic attack disruption outcomes.</div>
    </div>
    <div class="page-actions"><button class="btn btn-primary" onclick="toast('AIR policy review opened in the lab.')">Review automation policy</button></div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Investigations</span><span class="kpi-value">${AIR_INVESTIGATIONS.length}</span></div>
    <div class="kpi"><span class="kpi-label">Completed</span><span class="kpi-value">${AIR_INVESTIGATIONS.filter(i=>i.status==='Completed').length}</span></div>
    <div class="kpi"><span class="kpi-label">Pending approval</span><span class="kpi-value">${AIR_INVESTIGATIONS.filter(i=>i.status.includes('approval')).length}</span></div>
    <div class="kpi"><span class="kpi-label">Attack disruption</span><span class="kpi-value">${AIR_INVESTIGATIONS.filter(i=>i.disruption).length}</span></div>
  </div>
  <div class="two-col">
    <section class="card">
      <div class="card-toolbar"><strong>AIR investigations</strong><span class="muted">Fictional lab queue</span></div>
      <table class="grid">
        <thead><tr><th>Status</th><th>Investigation</th><th>Verdict</th><th>Actions</th></tr></thead>
        <tbody>${AIR_INVESTIGATIONS.map(i => `
          <tr><td><span class="tag ${i.status === 'Completed' ? 'green' : 'orange'}">${esc(i.status)}</span></td><td><strong>${esc(i.id)}</strong><br><button class="link-button strong" onclick="openIncident('${esc(i.incident)}')">${esc(i.title)}</button></td><td>${esc(i.verdict)}</td><td>${i.actions.map(a=>`<div class="mini-step">${esc(a)}</div>`).join('')}</td></tr>
        `).join('')}</tbody>
      </table>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">Automatic attack disruption example</div>
      <div class="callout warn">INC-1050 triggered a high-confidence ransomware chain. The lab marks it as disrupted after automatic containment isolated the device and stopped malicious execution.</div>
      <div class="flowline vertical-flow">
        <div class="flow-step"><strong>Detect</strong><span>Ransomware encryption and shadow-copy deletion alerts correlate.</span></div>
        <div class="flow-step"><strong>Contain</strong><span>AIR isolates FIN-FS-02 and kills the process tree.</span></div>
        <div class="flow-step"><strong>Remediate</strong><span>locker.exe is quarantined; pending file restore remains an analyst decision.</span></div>
        <div class="flow-step"><strong>Explain</strong><span>Attack disruption reduces spread while preserving an evidence trail in the incident timeline.</span></div>
      </div>
      <button class="btn btn-secondary" onclick="openIncidentPage('INC-1050')">Open disrupted incident</button>
    </section>
  </div>
`;

// ---------- Defender for Endpoint › Devices ----------
// The inventory is the union of onboarded devices (DEVICES) and unmanaged assets
// that onboarded sensors discovered (DISCOVERED_DEVICES). Normalizing both into one
// row shape is what lets a single table show the "onboarded vs. blind spot" split.
// "OS platform" is the product family, separate from the build/version column.
function osPlatform(os) {
  const m = os.match(/^(Windows Server \d{4}|Windows 1[01]|Windows 10 IoT|macOS|Ubuntu|VMware ESXi|Android)/);
  return m ? m[1] : os.split(' ').slice(0, 2).join(' ');
}

function inventoryRows(tab) {
  const onboarded = tab !== 'computers' ? [] : DEVICES.map(d => ({
    id:d.id, name:d.name, domain:d.domain, type:/Server|Domain Controller/.test(d.os) ? 'Server' : 'Workstation',
    os:d.os, osPlatform:osPlatform(d.os), ip:d.ip, network:'CORP-LAN', onboardingStatus:'Onboarded',
    discoverySource:'Onboarded sensor', riskLevel:d.riskLevel, exposureLevel:d.exposureLevel,
    lastSeen:d.lastSeen, highValue:d.exposureLevel === 'High', managed:true,
    isInternetFacing:d.isInternetFacing, healthStatus:d.healthStatus, avStatus:d.avStatus,
    excludedLabel:d.excluded ? 'Yes' : 'No', winVersion:d.winVersion,
  }));
  const discovered = DISCOVERED_DEVICES.filter(d => d.tab === tab).map(d => ({
    ...d, managed:false, osPlatform:osPlatform(d.os),
    // Unmanaged devices have no sensor, so domain membership, health, antivirus
    // state, and Windows build are not observable — they stay blank rather than
    // being invented. Exposure is only scored once a device is classified.
    domain:'—', healthStatus:'—', avStatus:'Unknown', winVersion:'—',
    exposureLevel:d.onboardingStatus === 'Insufficient info' ? '—' : d.highValue ? 'High' : d.riskLevel,
    excludedLabel:DEVICE_DISCOVERY_SETTINGS.exclusions.some(x => x.kind === 'Subnet' && d.network === 'BMS-VLAN') ? 'Yes' : 'No',
  }));
  return [...onboarded, ...discovered];
}

// Groups AND together; options inside a group OR. An empty group means "no constraint".
function applyInventoryFilters(rows, facets) {
  return rows.filter(r => INVENTORY_FILTER_GROUPS.every(g => {
    const picked = facets[g.key] || [];
    return picked.length === 0 || picked.includes(r[g.field]);
  }));
}

// Column picker model. `render` produces the cell; `locked` columns can't be
// switched off (a row needs something to identify it). Order here is the table order.
const INVENTORY_COLUMNS = [
  { key:'name',  label:'Device name', locked:true, on:true, render:r => `
      <strong>${esc(r.name)}</strong>
      ${r.highValue ? '<span class="dev-tag">High value</span>' : ''}
      ${r.isInternetFacing ? '<span class="dev-tag internet">Internet facing</span>' : ''}` },
  { key:'domain',      label:'Domain',             on:true,  render:r => esc(r.domain) },
  { key:'risk',        label:'Risk level',         on:true,  render:r => riskPill(r.riskLevel) },
  { key:'exposure',    label:'Exposure level',     on:true,  render:r => esc(r.exposureLevel) },
  { key:'osPlatform',  label:'OS platform',        on:true,  render:r => esc(r.osPlatform) },
  { key:'winVersion',  label:'Windows 10 version', on:true,  render:r => r.winVersion === '—' ? '<span class="muted">—</span>' : esc(r.winVersion) },
  { key:'health',      label:'Health status',      on:true,  render:r => healthTag(r.healthStatus) },
  { key:'onboarding',  label:'Onboarding status',  on:true,  render:r => onboardingTag(r.onboardingStatus) },
  { key:'lastSeen',    label:'Last device update', on:true,  render:r => fmtTime(r.lastSeen) },
  { key:'excluded',    label:'Excluded',           on:true,  render:r => r.excludedLabel === 'Yes' ? '<span class="tag orange">Yes</span>' : '<span class="muted">No</span>' },
  { key:'antivirus',   label:'Antivirus status',   on:false, render:r => avTag(r.avStatus) },
  { key:'source',      label:'Discovery source',   on:false, render:r => esc(r.discoverySource) },
  { key:'type',        label:'Device type',        on:false, render:r => esc(r.type) },
  { key:'ip',          label:'IP address',         on:false, render:r => esc(r.ip) },
  { key:'network',     label:'Network',            on:false, render:r => esc(r.network) },
  { key:'os',          label:'OS version',         on:false, render:r => esc(r.os) },
];

function visibleInventoryColumns() {
  const saved = currentInventoryColumns();
  return INVENTORY_COLUMNS.filter(c => c.locked || (saved ? saved.includes(c.key) : c.on));
}

const RISK_CLASS = { High:'high', Medium:'medium', Low:'low', Informational:'low' };

function riskPill(level) {
  return `<span class="sev ${RISK_CLASS[level] || 'low'}">${esc(level)}</span>`;
}

// Onboarding status is the triage signal: green = protected, orange = actionable gap,
// grey = nothing to do (no sensor exists) or not enough traffic to decide.
function onboardingTag(status) {
  const cls = status === 'Onboarded' ? 'green' : status === 'Can be onboarded' ? 'orange' : '';
  return `<span class="tag ${cls}">${esc(status)}</span>`;
}

// Sensor health: Misconfigured means the sensor reports but its data is degraded —
// that's a worse position than Inactive, because the device looks covered and isn't.
function healthTag(status) {
  if (!status || status === '—') return '<span class="muted">—</span>';
  const cls = status === 'Active' ? 'green' : status === 'Misconfigured' ? 'orange' : '';
  return `<span class="tag ${cls}">${esc(status)}</span>`;
}
function avTag(status) {
  if (!status) return '<span class="muted">—</span>';
  const cls = status === 'Up to date' ? 'green' : status === 'Unknown' ? '' : 'orange';
  return `<span class="tag ${cls}">${esc(status)}</span>`;
}

VIEWS['defender/devices'] = () => {
  const tab    = currentInventoryTab();
  const facets = currentInventoryFacets();
  const range  = currentInventoryRange();
  const rows   = inventoryRows(tab);
  const shown  = applyInventoryFilters(rows, facets);
  const cols   = visibleInventoryColumns();
  // Hundreds of devices per tab, so the table pages instead of rendering the estate at once.
  const pages  = Math.max(1, Math.ceil(shown.length / INVENTORY_PAGE_SIZE));
  const page   = Math.min(currentInventoryPage(), pages);
  const from   = (page - 1) * INVENTORY_PAGE_SIZE;
  const pageRows = shown.slice(from, from + INVENTORY_PAGE_SIZE);
  const activeCount = Object.values(facets).reduce((n, v) => n + v.length, 0);
  const canOnboard = DISCOVERED_DEVICES.filter(d => d.onboardingStatus === 'Can be onboarded').length;

  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Assets › <strong>Devices</strong></div>
      <h1>Device inventory</h1>
      <div class="page-subtitle">Onboarded devices and the unmanaged assets your sensors discovered on monitored networks. Select a device to investigate, or triage what can still be onboarded.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/defender/device-discovery">📡 Discovery settings</a>
      <button class="btn btn-primary" onclick="toast('Fictional lab action: an onboarding package would be generated for the selected devices.')">Onboard devices</button>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Total devices</span><span class="kpi-value">${DEVICES.length + DISCOVERED_DEVICES.length}</span><span class="kpi-delta">Onboarded + discovered</span></div>
    <div class="kpi"><span class="kpi-label">Onboarded</span><span class="kpi-value">${DEVICES.length}</span><span class="kpi-delta good">Active sensors</span></div>
    <div class="kpi"><span class="kpi-label">Can be onboarded</span><span class="kpi-value">${canOnboard}</span><span class="kpi-delta bad">Coverage gap</span></div>
    <div class="kpi"><span class="kpi-label">High value</span><span class="kpi-value">${DISCOVERED_DEVICES.filter(d=>d.highValue).length}</span><span class="kpi-delta">Unmanaged, business critical</span></div>
  </div>

  <div class="callout info">
    Discovery mode is <strong>${esc(DEVICE_DISCOVERY_SETTINGS.mode)}</strong>. Onboarded devices passively watch traffic and actively probe unmanaged assets, so everything below was found without deploying an appliance. Devices on non-corporate networks are never listed.
  </div>

  <div class="tabs">
    ${DEVICE_INVENTORY_TABS.map(t => `
      <button class="tab ${t.key === tab ? 'active' : ''}" onclick="setInventoryTab('${t.key}')">
        ${esc(t.label)}<span class="pill">${inventoryRows(t.key).length}</span>
      </button>`).join('')}
  </div>

  <div class="inventory-toolbar">
    <span class="muted">${shown.length} of ${rows.length} devices</span>
    <div class="inventory-toolbar-actions">
      <button class="chip" onclick="setInventoryRange()">📅 ${esc(range)} <span class="chev">▾</span></button>
      <button class="chip" onclick="openInventoryColumns()">🧮 Choose columns <span class="pill">${cols.length}</span></button>
      <button class="chip" onclick="exportInventoryCsv()">⬇ Export</button>
      <button class="chip ${activeCount ? 'active' : ''}" onclick="openInventoryFilters()">🔽 Filter${activeCount ? ` <span class="pill">${activeCount}</span>` : ''}</button>
    </div>
  </div>

  ${activeCount === 0 ? '' : `
    <div class="filterbar">
      ${INVENTORY_FILTER_GROUPS.flatMap(g => (facets[g.key] || []).map(v =>
        `<button class="chip active" onclick="toggleInventoryFacet('${g.key}','${esc(v)}')" title="Remove filter">${esc(g.icon)} ${esc(g.label)}: ${esc(v)} ✕</button>`
      )).join('')}
      <button class="chip" onclick="clearInventoryFilters()">Clear all</button>
    </div>`}

  <div class="card">
    <div class="card-toolbar">
      <strong>${esc(DEVICE_INVENTORY_TABS.find(t => t.key === tab).label)}</strong>
      <span class="muted">Last seen within ${esc(range)}</span>
    </div>
    <div class="table-scroll">
    <table class="grid">
      <thead><tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>
        ${shown.length === 0 ? `<tr><td colspan="${cols.length}" class="muted">No devices match these filters. <button class="chip" onclick="clearInventoryFilters()">Clear all</button></td></tr>` : pageRows.map(r => `
          <tr onclick="${r.managed ? `openDevice('${esc(r.id)}')` : `openDiscoveredDevice('${esc(r.id)}')`}">
            ${cols.map(c => `<td>${c.render(r)}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
    </div>
    ${shown.length === 0 ? '' : `
      <div class="inventory-pager">
        <span class="muted">Showing ${from + 1}–${from + pageRows.length} of ${shown.length}</span>
        <div class="inventory-pager-actions">
          <button class="chip" ${page === 1 ? 'disabled' : ''} onclick="setInventoryPage(1)">« First</button>
          <button class="chip" ${page === 1 ? 'disabled' : ''} onclick="setInventoryPage(${page - 1})">‹ Previous</button>
          <span class="muted">Page ${page} of ${pages}</span>
          <button class="chip" ${page === pages ? 'disabled' : ''} onclick="setInventoryPage(${page + 1})">Next ›</button>
          <button class="chip" ${page === pages ? 'disabled' : ''} onclick="setInventoryPage(${pages})">Last »</button>
        </div>
      </div>`}
  </div>
`;
};

// ---------- Defender for Endpoint › Discovered (unmanaged) device page ----------
const DISCOVERED_TABS = [
  { key:'overview',        label:'Overview' },
  { key:'discovery',       label:'Discovery details' },
  { key:'recommendations', label:'Security recommendations' },
  { key:'onboarding',      label:'Onboarding' },
];

// Why a device landed in its onboarding bucket, and what the learner should do next.
const ONBOARDING_GUIDANCE = {
  'Can be onboarded': {
    tone:'warn',
    what:'A Defender for Endpoint sensor supports this platform, but this device is not running one. It is a coverage gap you can close today.',
    next:'Onboard it to gain alerts, Timeline, response actions, and vulnerability assessment.',
  },
  'Unsupported': {
    tone:'info',
    what:'No Defender for Endpoint sensor exists for this platform, so it can never be onboarded.',
    next:'Reduce risk with network controls instead: segment it, restrict management protocols, and remediate its firmware vulnerabilities.',
  },
  'Insufficient info': {
    tone:'info',
    what:'Discovery has not seen enough traffic to classify this device or decide whether a sensor could run on it.',
    next:'Leave it to standard discovery, which re-probes devices when their characteristics change. Basic mode alone may never resolve it.',
  },
};

const DISCOVERY_SOURCE_EXPLAINER = {
  'Basic':'Found passively — an onboarded device saw this asset\'s traffic and extracted what it could. No probe was ever sent, so the classification relies entirely on what the traffic revealed.',
  'Standard':'Found by standard discovery — after observing this asset on a monitored network, an onboarded device actively probed it with common discovery protocols to classify it properly.',
  'Authenticated scan':'Found by an authenticated SNMP read-only scan from a designated scanning device. This is how network gear gets assessed when it cannot run a sensor.',
};

VIEWS['defender/discovered-device'] = () => {
  const d = currentDiscoveredDevice();
  const tab = currentDiscoveredTab();
  const g = ONBOARDING_GUIDANCE[d.onboardingStatus];
  const canOnboard = d.onboardingStatus === 'Can be onboarded';

  const body = {
    overview: () => `
      <div class="callout ${g.tone}">
        <strong>${esc(d.onboardingStatus)}</strong> — ${esc(g.what)}<br>${esc(g.next)}
      </div>
      <div class="two-col">
        <section class="card card-body">
          <div class="alert-section-title">Device details</div>
          <div class="detail-row"><span>Device type</span><strong>${esc(d.type)}</strong></div>
          <div class="detail-row"><span>OS / firmware</span><strong>${esc(d.os)}</strong></div>
          <div class="detail-row"><span>Vendor</span><strong>${esc(d.vendor)}</strong></div>
          <div class="detail-row"><span>IP address</span><strong>${esc(d.ip)}</strong></div>
          <div class="detail-row"><span>MAC address</span><strong>${esc(d.mac)}</strong></div>
          <div class="detail-row"><span>Network</span><strong>${esc(d.network)}</strong></div>
          <div class="detail-row"><span>First seen</span><strong>${fmtTime(d.firstSeen)}</strong></div>
          <div class="detail-row"><span>Last seen</span><strong>${fmtTime(d.lastSeen)}</strong></div>
        </section>
        <section class="card card-body">
          <div class="alert-section-title">Why this device matters</div>
          <p>${esc(d.note)}</p>
          <div class="detail-row"><span>Risk level</span><strong>${esc(d.riskLevel)}</strong></div>
          <div class="detail-row"><span>High value</span><strong>${d.highValue ? 'Yes' : 'No'}</strong></div>
          <div class="detail-row"><span>Open recommendations</span><strong>${d.recommendationCount}</strong></div>
          <div class="detail-row"><span>Antivirus status</span><strong>Unknown <span class="muted">(no sensor)</span></strong></div>
          <div class="detail-row"><span>Health status</span><strong>— <span class="muted">(no sensor)</span></strong></div>
          <div class="callout info">Without a sensor there is no Timeline, no alerts, and no response actions for this device. Everything known about it came from the network.</div>
        </section>
      </div>`,

    discovery: () => `
      <section class="card card-body">
        <div class="alert-section-title">How this device was discovered</div>
        <div class="detail-row"><span>Discovery source</span><strong>${esc(d.discoverySource)}</strong></div>
        <div class="detail-row"><span>Discovered by</span><strong>${esc(d.seenBy.join(', '))}</strong></div>
        <div class="detail-row"><span>Monitored network</span><strong>${esc(d.network)}</strong></div>
        <div class="detail-row"><span>Excluded from active scans</span><strong>${d.network === 'BMS-VLAN' ? 'Yes' : 'No'}</strong></div>
        <p class="muted">${esc(DISCOVERY_SOURCE_EXPLAINER[d.discoverySource])}</p>
      </section>
      <section class="card card-body">
        <div class="alert-section-title">Protocols observed</div>
        <div class="filterbar">${d.protocols.map(p => `<span class="chip">${esc(p)}</span>`).join('')}</div>
        <p class="muted">These are the protocols that revealed this device. Basic (passive) discovery only ever sees a subset — richer protocol coverage is what standard discovery buys you.</p>
      </section>
      <section class="card card-body">
        <div class="alert-section-title">Sensors that saw it</div>
        <table class="grid">
          <thead><tr><th>Onboarded device</th><th>Role</th></tr></thead>
          <tbody>
            ${d.seenBy.map(n => `
              <tr onclick="openDevice('${esc(n)}')">
                <td><strong>${esc(n)}</strong></td>
                <td>${d.discoverySource === 'Authenticated scan' ? 'Designated scanning device' : 'Discovery sensor'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p class="muted">Discovery has no appliance — these onboarded devices did the work.</p>
      </section>`,

    recommendations: () => `
      <section class="card card-body">
        <div class="alert-section-title">Security recommendations</div>
        ${d.recommendationCount === 0 ? `
          <div class="callout info">No recommendations. This device is not classified well enough to assess — there is nothing to act on until discovery learns more about it.</div>` : `
          <div class="callout ${d.riskLevel === 'High' ? 'bad' : 'warn'}">
            <strong>${d.recommendationCount} open recommendation${d.recommendationCount === 1 ? '' : 's'}</strong> for this device.
            Discovered devices are assessed even without a sensor, so remediation can start before onboarding.
          </div>
          <p class="muted">Recommendations for unmanaged assets are worked from Exposure management alongside the rest of the tenant. ${canOnboard ? 'Onboarding this device would additionally give it software inventory and per-device vulnerability detail.' : 'For unsupported platforms this is the main lever you have.'}</p>
          <a class="btn btn-secondary" href="#/defender/exposure">Open recommendations</a>`}
      </section>`,

    onboarding: () => `
      <section class="card card-body">
        <div class="alert-section-title">Onboarding assessment</div>
        <div class="callout ${g.tone}"><strong>${esc(d.onboardingStatus)}</strong> — ${esc(g.what)}</div>
        <div class="alert-section-title">What to do</div>
        <p>${esc(g.next)}</p>
        ${canOnboard ? `
          <div class="alert-section-title">Onboard this device</div>
          <div class="flowline vertical-flow">
            <div class="flow-step"><strong>1 — Download the onboarding package</strong><span>Pick the deployment method that matches ${esc(d.osPlatform || d.os)}.</span></div>
            <div class="flow-step"><strong>2 — Deploy the sensor</strong><span>Run the package on ${esc(d.name)} (${esc(d.ip)}).</span></div>
            <div class="flow-step"><strong>3 — Confirm the sensor reports</strong><span>The device moves to Onboarded and its health status starts reporting.</span></div>
            <div class="flow-step"><strong>4 — Verify coverage</strong><span>Alerts, Timeline, response actions, and vulnerability assessment all light up.</span></div>
          </div>
          <button class="btn btn-primary" onclick="toast('Fictional lab action: an onboarding package would be downloaded for ${esc(d.name)}.')">Download onboarding package</button>` : ''}
        <div class="alert-section-title">Other actions</div>
        <button class="btn btn-secondary" onclick="toast('Fictional lab action: ${esc(d.name)} would be excluded from active probing.')">Exclude from standard discovery</button>
        <a class="btn btn-secondary" href="#/defender/device-discovery">Discovery settings</a>
      </section>`,
  }[tab]();

  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb"><a class="chip-link" href="#/defender/devices">Assets › Devices</a> › <strong>${esc(d.name)}</strong></div>
      <h1>${esc(d.name)}</h1>
      <div class="dev-tags">
        <span class="tag">Unmanaged</span>
        ${onboardingTag(d.onboardingStatus)}
        <span class="sev ${RISK_CLASS[d.riskLevel] || 'low'}">${esc(d.riskLevel)} risk</span>
        ${d.highValue ? '<span class="dev-tag">High value</span>' : ''}
        <span class="dev-tag">${esc(d.type)}</span>
      </div>
      <div class="page-subtitle">${esc(d.ip)} · ${esc(d.network)} · discovered by ${esc(d.discoverySource.toLowerCase() === 'basic' ? 'passive (basic) discovery' : d.discoverySource)}</div>
    </div>
    <div class="page-actions">
      <button class="btn ${canOnboard ? 'btn-primary' : 'btn-secondary'}" ${canOnboard ? '' : 'disabled title="No sensor exists for this platform."'}
              onclick="toast('Fictional lab action: an onboarding package would be downloaded for ${esc(d.name)}.')">Onboard device</button>
      <a class="btn btn-secondary" href="#/defender/devices">Back to inventory</a>
    </div>
  </div>

  <div class="tabs">
    ${DISCOVERED_TABS.map(t => `
      <button class="tab ${t.key === tab ? 'active' : ''}" onclick="setDiscoveredTab('${t.key}')">${esc(t.label)}</button>`).join('')}
  </div>
  ${body}
`;
};

// ---------- Defender for Endpoint › System > Settings > Device discovery ----------
VIEWS['defender/device-discovery'] = () => {
  const s = DEVICE_DISCOVERY_SETTINGS;
  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">System › Settings › <strong>Device discovery</strong></div>
      <h1>Device discovery</h1>
      <div class="page-subtitle">Control how onboarded devices find unmanaged assets: scan mode, which networks are watched, what is excluded from active probing, and authenticated scans for network gear.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/defender/devices">Open device inventory</a>
    </div>
  </div>

  <section class="card card-body">
    <div class="alert-section-title">Discovery mode</div>
    <div class="tile-grid">
      ${s.modes.map(m => `
        <button class="tile ${m.key === s.mode ? 'active' : ''}" onclick="setDiscoveryMode('${m.key}')">
          <strong>${esc(m.label)} ${m.key === s.mode ? '✓' : ''}</strong>
          <span>${esc(m.summary)}</span>
        </button>`).join('')}
    </div>
    ${s.modes.filter(m => m.key === s.mode).map(m => `
      <div class="callout ${m.key === 'Standard' ? 'good' : 'warn'}">
        <strong>${esc(m.label)} is selected.</strong> ${esc(m.detail)}<br>
        <span class="muted">${esc(m.scanner)}</span>
      </div>`).join('')}
    <div class="callout info">
      Basic mode trades visibility for silence: it never sends a probe, so it suits sensitive or legacy segments, but it classifies far fewer devices. Standard is recommended for a coherent inventory — it only probes unmanaged devices, never onboarded ones.
    </div>
  </section>

  <section class="card">
    <div class="card-toolbar">
      <strong>Monitored networks</strong>
      <span class="muted">Corporate networks are correlated automatically; non-corporate ones are ignored</span>
    </div>
    <table class="grid">
      <thead><tr><th>Network</th><th>Default gateway</th><th>DHCP server</th><th>Devices</th><th>State</th><th>Why</th></tr></thead>
      <tbody>
        ${s.monitoredNetworks.map(n => `
          <tr>
            <td><strong>${esc(n.name)}</strong></td>
            <td>${esc(n.gateway)}</td>
            <td>${esc(n.dhcp)}</td>
            <td>${n.devices || '—'}</td>
            <td><span class="tag ${n.state === 'Monitored' ? 'green' : ''}">${esc(n.state)}</span></td>
            <td class="muted">${esc(n.reason)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </section>

  <div class="two-col">
    <section class="card">
      <div class="card-toolbar">
        <strong>Exclusions</strong>
        <button class="btn btn-secondary btn-sm" onclick="toast('Fictional lab action: an exclusion would be added to standard discovery.')">Add exclusion</button>
      </div>
      <table class="grid">
        <thead><tr><th>Target</th><th>Type</th><th>Reason</th></tr></thead>
        <tbody>
          ${s.exclusions.map(x => `
            <tr>
              <td><strong>${esc(x.target)}</strong></td>
              <td>${esc(x.kind)}</td>
              <td class="muted">${esc(x.reason)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="card-body">
        <div class="callout warn">Exclusions stop <strong>active</strong> probing only. An excluded device that talks to an onboarded sensor is still discovered passively and still appears in the inventory.</div>
      </div>
    </section>

    <section class="card card-body">
      <div class="alert-section-title">Enterprise IoT</div>
      <div class="callout ${s.enterpriseIoT.enabled ? 'good' : 'info'}">
        ${s.enterpriseIoT.enabled ? '✓ Enabled' : 'Not enabled'} — ${esc(s.enterpriseIoT.note)}
      </div>
      <div class="alert-section-title">Vulnerability assessment</div>
      <p class="muted">Discovered endpoints are assessed automatically and produce recommendations under Exposure management. IoT assets are assessed once an Enterprise IoT license is in place.</p>
      <div class="tile-grid">
        <a class="tile" href="#/defender/exposure"><strong>Recommendations</strong><span>Remediate what discovery found — for example, SSH weaknesses on unmanaged servers.</span></a>
        <a class="tile" href="#/defender/hunting"><strong>Advanced hunting</strong><span>Query discovered devices and their activity alongside onboarded telemetry.</span></a>
      </div>
    </section>
  </div>

  <section class="card">
    <div class="card-toolbar">
      <strong>Authenticated network scans</strong>
      <button class="btn btn-secondary btn-sm" onclick="toast('Fictional lab action: a new authenticated scan would be scheduled.')">Add scan</button>
    </div>
    <div class="card-body">
      <p class="muted">Network gear can't run a sensor, so designated onboarded devices scan it remotely over SNMP read-only and feed the results into vulnerability management.</p>
    </div>
    <table class="grid">
      <thead><tr><th>Scan</th><th>Scanning device</th><th>Targets</th><th>Protocol</th><th>Interval</th><th>Last run</th><th>Found</th><th>State</th></tr></thead>
      <tbody>
        ${s.authenticatedScans.map(a => `
          <tr>
            <td><strong>${esc(a.name)}</strong></td>
            <td>${esc(a.scanner)}</td>
            <td>${esc(a.targets)}</td>
            <td>${esc(a.protocol)}</td>
            <td>${esc(a.interval)}</td>
            <td>${fmtTime(a.lastRun)}</td>
            <td>${a.found}</td>
            <td><span class="tag ${a.state === 'Active' ? 'green' : 'orange'}">${esc(a.state)}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </section>
`;
};

// ---------- Defender for Endpoint › Device detail (Overview / Timeline / …) ----------
const DEVICE_TABS = [
  { key:'overview',        label:'Overview' },
  { key:'incidents',       label:'Incidents and alerts' },
  { key:'timeline',        label:'Timeline' },
  { key:'recommendations', label:'Security recommendations' },
  { key:'effective',       label:'Effective settings' },
  { key:'inventories',     label:'Inventories' },
  { key:'vulnerabilities', label:'Discovered vulnerabilities' },
  { key:'missingkbs',      label:'Missing KBs' },
  { key:'baselines',       label:'Security baselines' },
  { key:'policies',        label:'Security policies' },
  { key:'sentinel',        label:'Sentinel events' },
];

VIEWS['defender/device'] = () => {
  const selectedId = sessionStorage.getItem('defender-lab.device.id') || DEVICES[0].id;
  const d = DEVICES.find(x => x.id === selectedId) || DEVICES[0];
  const tab = sessionStorage.getItem('defender-lab.device.tab') || 'overview';
  const events = (DEVICE_TIMELINE_EVENTS[d.id] || [])
    .slice().sort((a,b) => new Date(b.time) - new Date(a.time));
  const incAlerts = (typeof alerts !== 'undefined' ? alerts : SEED_ALERTS).filter(a => a.asset === d.id);

  const tabBtn = (t) => `
    <button class="tab ${tab===t.key?'active':''}" onclick="setDeviceTab('${t.key}')">${esc(t.label)}</button>`;

  // ---- Overview tab body (4-card row mirroring DfE shape) ----
  function overviewBody() {
    const riskClass = d.riskLevel==='High'?'high':d.riskLevel==='Medium'?'medium':'low';
    const recCount = d.recommendationCount ?? 3;
    const softwareCount = d.installedSoftware ?? 42;
    const vulnCount = d.discoveredVulnerabilities ?? 2;
    return `
      <div class="dev-overview-grid">
        <section class="dev-card">
          <div class="dev-card-title">Active alerts</div>
          <div class="dev-metric">Risk level: <span class="sev ${riskClass}">${esc(d.riskLevel)}</span></div>
          <div class="muted dev-card-sub">${d.openAlerts} active alert${d.openAlerts===1?'':'s'} in ${Math.max(1, incAlerts.length)} incident${incAlerts.length===1?'':'s'}</div>
          <div class="dev-bar" aria-label="Active alerts by severity">
            <span class="hi" style="width:62%"></span>
            <span class="md" style="width:30%"></span>
            <span class="lo" style="width:8%"></span>
          </div>
          <div class="dev-legend">
            <span><i class="hi"></i>High</span>
            <span><i class="md"></i>Medium</span>
            <span><i class="lo"></i>Low</span>
          </div>
          <a class="dev-link" onclick="setDeviceTab('incidents')">View all incidents and alerts</a>
        </section>
        <section class="dev-card">
          <div class="dev-card-title">Security assessments</div>
          <div class="dev-metric">Exposure level: <span class="sev ${d.exposureLevel==='High'?'high':d.exposureLevel==='Medium'?'medium':'low'}">${esc(d.exposureLevel)}</span></div>
          <div class="dev-assessment-list">
            <div><strong>${recCount}</strong><span>active security recommendations</span></div>
            <div><strong>${softwareCount}</strong><span>installed software</span></div>
            <div><strong>${vulnCount}</strong><span>discovered vulnerabilities</span></div>
          </div>
          <div class="dev-bar" aria-label="Vulnerabilities by severity">
            <span class="crit" style="width:18%"></span>
            <span class="hi"   style="width:55%"></span>
            <span class="md"   style="width:27%"></span>
          </div>
          <div class="dev-legend">
            <span><i class="crit"></i>Critical</span>
            <span><i class="hi"></i>High</span>
            <span><i class="md"></i>Medium</span>
          </div>
          <a class="dev-link" onclick="setDeviceTab('recommendations')">View all recommendations</a>
        </section>
        <section class="dev-card">
          <div class="dev-card-title">Logged on users (last 30 days)</div>
          <div class="dev-metric">1 logged on user</div>
          <div class="dev-user-row"><span>Most frequent</span><strong>${esc(d.primaryUser)}</strong></div>
          <div class="dev-user-row"><span>Least frequent</span><strong>None</strong></div>
          <a class="dev-link" onclick="toast('Logged on users pane opened (lab stub).')">View logged on users</a>
        </section>
        <section class="dev-card">
          <div class="dev-card-title">Device health status</div>
          <div class="dev-metric">Full scan status is unknown</div>
          <table class="dev-health">
            <thead><tr><th>Type</th><th>State</th><th class="right">Date &amp; time</th></tr></thead>
            <tbody>
              <tr><td>Last full scan</td><td><span class="dev-state err">Not performed</span></td><td class="right muted">—</td></tr>
              <tr><td>Last quick scan</td><td><span class="dev-state">Completed</span></td><td class="right muted">${fmtTime(d.lastSeen)}</td></tr>
              <tr><td>Security intelligence</td><td><span class="dev-state">Updated</span></td><td class="right muted">${fmtTime(d.lastSeen)}</td></tr>
              <tr><td>Engine</td><td><span class="dev-state">Current</span></td><td class="right muted">${fmtTime(d.lastSeen)}</td></tr>
              <tr><td>Platform</td><td><span class="dev-state">Current</span></td><td class="right muted">${fmtTime(d.lastSeen)}</td></tr>
              <tr><td>Defender Antivirus mode</td><td><span class="dev-state">Active</span></td><td class="right muted">${fmtTime(d.lastSeen)}</td></tr>
            </tbody>
          </table>
        </section>
      </div>`;
  }

  // ---- Incidents and alerts tab body ----
  function incidentsBody() {
    return `
      <div class="dev-cmdbar">
        <button class="btn btn-primary btn-sm" onclick="toast('Selected alert opened (lab stub).')">Open selected</button>
        <button class="btn btn-secondary btn-sm">Filter</button>
        <button class="btn btn-secondary btn-sm">Export</button>
      </div>
      <table class="grid">
        <thead><tr><th>Sev</th><th>Title</th><th>Status</th><th>Incident</th><th>Last updated</th></tr></thead>
        <tbody>
          ${incAlerts.map(a => `
            <tr onclick="openAlert('${esc(a.id)}')">
              <td><span class="sev ${a.severity}">${cap(a.severity)}</span></td>
              <td>${esc(a.title)}</td>
              <td>${esc(a.status)}</td>
              <td>${esc(a.incidentId)}</td>
              <td>${fmtTime(a.firstActivity)}</td>
            </tr>`).join('') || '<tr><td colspan="5" class="muted">No open alerts on this device.</td></tr>'}
        </tbody>
      </table>`;
  }

  // ---- Timeline tab body (interleaved technique markers + raw events) ----
  function timelineBody() {
    return `
      <div class="dev-cmdbar">
        <input class="ipt dev-search" placeholder="Search timeline" />
        <button class="btn btn-secondary btn-sm">Filter</button>
        <button class="btn btn-secondary btn-sm">Flagged events only</button>
        <button class="btn btn-secondary btn-sm">Time range</button>
        <button class="btn btn-secondary btn-sm">Customize columns</button>
        <button class="btn btn-secondary btn-sm">Export</button>
      </div>
      <div class="callout info">
        Click a <strong>technique marker</strong> (blue T) to open the side pane.
        <em>Hunt for related events</em> returns the <strong>underlying events</strong> related to that technique on this device — not the marker row itself.
      </div>
      <div class="dev-timeline-list">
        ${events.map((e, i) => {
          const isTech = e.kind === 'technique';
          const iconCls = isTech ? 'tech' : '';
          const iconLetter = isTech ? 'T' : (e.eventType||'E').charAt(0).toUpperCase();
          const titleHtml = isTech
            ? `${esc(e.techniqueId)} — ${esc(e.techniqueName)}`
            : esc(e.title || e.actionType || 'Event');
          const descHtml = esc(e.description || (e.cmdline ? e.cmdline : ''));
          const right = isTech ? 'Technique' : esc(e.eventType || (e.table||'').replace(/^Device/,''));
          const click = isTech
            ? `onclick="openTechnique('${esc(d.id)}', ${i})"`
            : `onclick="openDeviceTimelineEvent('${esc(d.id)}', ${i})"`;
          return `
            <div class="dev-tle ${isTech?'is-tech':''}" ${click} role="button" tabindex="0">
              <div class="dev-tle-time">${fmtTime(e.time)}</div>
              <div class="dev-tle-flag">${e.flagged ? '⚑' : ''}</div>
              <div class="dev-tle-icon ${iconCls}">${iconLetter}</div>
              <div class="dev-tle-main">
                <div class="dev-tle-title">${titleHtml}</div>
                <div class="dev-tle-desc muted">${descHtml}</div>
              </div>
              <div class="dev-tle-right muted">${right}</div>
            </div>`;
        }).join('') || '<div class="muted" style="padding:20px;">No events recorded.</div>'}
      </div>`;
  }

  function recommendationsBody() {
    return `
      <div class="dev-cmdbar">
        <button class="btn btn-primary btn-sm">Open selected</button>
        <button class="btn btn-secondary btn-sm">Create exception</button>
        <button class="btn btn-secondary btn-sm">Export</button>
      </div>
      <table class="grid">
        <thead><tr><th>Recommendation</th><th>Sev</th><th>Exposed devices</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Update Defender Antivirus security intelligence</td><td><span class="sev high">High</span></td><td>1</td><td>Active</td></tr>
          <tr><td>Enable full scan schedule</td><td><span class="sev medium">Medium</span></td><td>1</td><td>Active</td></tr>
          <tr><td>Apply latest cumulative update</td><td><span class="sev high">High</span></td><td>1</td><td>Active</td></tr>
        </tbody>
      </table>`;
  }

  function effectiveBody() {
    return `
      <div class="dev-cmdbar">
        <button class="btn btn-secondary btn-sm">Refresh</button>
        <button class="btn btn-secondary btn-sm">Export</button>
      </div>
      <div class="callout info">Effective settings resolve tenant security baseline, antivirus policy, endpoint detection policy, and local policy into the value currently applied to this device.</div>
      <table class="grid">
        <thead><tr><th>Setting</th><th>Category</th><th>Source</th><th>Effective value</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Real-time protection</td><td>Antivirus</td><td>Antivirus policy</td><td>Enabled</td><td><span class="dev-state">Applied</span></td></tr>
          <tr><td>Cloud-delivered protection</td><td>Antivirus</td><td>Endpoint security baseline</td><td>Enabled</td><td><span class="dev-state">Applied</span></td></tr>
          <tr><td>EDR in block mode</td><td>Endpoint detection</td><td>MDE advanced features</td><td>Enabled</td><td><span class="dev-state">Applied</span></td></tr>
          <tr><td>Automatic investigation level</td><td>AIR</td><td>Finance workstations group</td><td>Full - remediate threats</td><td><span class="dev-state">Applied</span></td></tr>
          <tr><td>Scheduled full scan</td><td>Antivirus</td><td>Local policy</td><td>Not configured</td><td><span class="dev-state err">Needs attention</span></td></tr>
        </tbody>
      </table>`;
  }

  function inventoriesBody() {
    return `
      <div class="two-col">
        <div class="card card-body"><div class="tile-title">Software inventory</div><div class="tile-sub">Installed applications and versions for ${esc(d.name)}.</div></div>
        <div class="card card-body"><div class="tile-title">Certificates</div><div class="tile-sub">Certificate inventory and trust details.</div></div>
        <div class="card card-body"><div class="tile-title">Browser extensions</div><div class="tile-sub">Extension inventory and risk scoring.</div></div>
        <div class="card card-body"><div class="tile-title">Hardware</div><div class="tile-sub">Device hardware information.</div></div>
      </div>`;
  }

  function vulnerabilitiesBody() {
    const tvm = currentTvmDeviceVulns(d.id);
    const recs = currentTvmRecommendations().filter(item => (tvm.recommendations || []).includes(item.id));
    return `
      <div class="dev-cmdbar">
        <button class="btn btn-primary btn-sm" onclick="navigate('#/defender/vulnerabilities')">Open full TVM dashboard</button>
        <button class="btn btn-secondary btn-sm" onclick="openTvmSoftware('${esc(tvm.software[0]?.name || 'CodeGenius')}')">Inspect top software</button>
        <button class="btn btn-secondary btn-sm" onclick="openTvmRemediationFlow('${esc(recs[0]?.id || 'tr-01')}')">Request remediation</button>
      </div>
      <div class="callout info">This tab shows the installed software and discovered vulnerabilities for <strong>${esc(d.name)}</strong>. Use the full TVM dashboard to compare exposure across the tenant.</div>
      <div class="dev-assessment-list">
        <div><span>Exposure score</span><strong>${esc(tvm.exposureScore)}</strong></div>
        <div><span>Installed software</span><strong>${esc(tvm.software.length)}</strong></div>
        <div><span>Discovered vulnerabilities</span><strong>${esc(tvm.vulnerabilities.length)}</strong></div>
      </div>
      <div class="alert-section-title">Installed software</div>
      <table class="grid">
        <thead><tr><th>Software</th><th>Vendor</th><th>Version</th><th>Weaknesses</th><th>Recommendation</th></tr></thead>
        <tbody>
          ${tvm.software.map(item => `
            <tr>
              <td><a class="tvm-soft-link" onclick="openTvmSoftware('${esc(item.name)}')">${esc(item.name)}</a></td>
              <td>${esc(item.vendor)}</td>
              <td>${esc(item.version)}</td>
              <td>${esc(item.weaknessCount)}</td>
              <td>${esc(currentTvmRecommendation(item.recommendationId).title)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="alert-section-title">Discovered vulnerabilities</div>
      <table class="grid">
        <thead><tr><th>CVE</th><th>Severity</th><th>CVSS</th><th>Software</th><th>Exploit</th><th>Affected devices</th></tr></thead>
        <tbody>
          ${tvm.vulnerabilities.map(item => `
            <tr>
              <td><a class="tvm-soft-link" onclick="openTvmCve('${esc(item.cve)}')">${esc(item.cve)}</a></td>
              <td><span class="sev ${item.severity === 'Critical' ? 'high' : item.severity === 'High' ? 'medium' : 'low'}">${esc(item.severity)}</span></td>
              <td>${esc(item.cvss)}</td>
              <td>${esc(item.software)}</td>
              <td>${item.exploitAvailable ? '<span class="tvm-chip bad">Exploit available</span>' : '<span class="tvm-chip good">No known exploit</span>'}</td>
              <td>${esc(item.affectedDevices)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="alert-section-title">Device recommendations</div>
      <table class="grid">
        <thead><tr><th>Recommendation</th><th>Status</th><th>Owner</th><th>Due</th><th>Action</th></tr></thead>
        <tbody>
          ${recs.map(item => `
            <tr>
              <td><strong>${esc(item.title)}</strong></td>
              <td><span class="tvm-chip ${item.status === 'Exception' ? 'bad' : item.status === 'Completed' ? 'good' : 'warn'}">${esc(item.status)}</span></td>
              <td>${esc(item.owner)}</td>
              <td>${fmtTime(item.due)}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="openTvmRemediationFlow('${esc(item.id)}')">Request remediation</button>
                <button class="btn btn-secondary btn-sm" onclick="openTvmExceptionFlow('${esc(item.id)}')">File exception</button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="muted">No device-specific recommendations.</td></tr>'}
        </tbody>
      </table>`;
  }

  function missingKbsBody() {
    return `
      <table class="grid">
        <thead><tr><th>KB</th><th>Classification</th><th>Sev</th><th>Restart required</th></tr></thead>
        <tbody>
          <tr><td>KB5040112</td><td>Security update</td><td><span class="sev high">High</span></td><td>Yes</td></tr>
          <tr><td>KB5040128</td><td>Cumulative update</td><td><span class="sev medium">Medium</span></td><td>No</td></tr>
        </tbody>
      </table>`;
  }

  function baselinesBody() {
    return `
      <div class="two-col">
        <div class="card card-body"><div class="tile-title">Windows security baseline</div><div class="tile-sub">73% compliant. 11 controls need review.</div></div>
        <div class="card card-body"><div class="tile-title">Defender baseline</div><div class="tile-sub">Full-scan configuration and antivirus settings need attention.</div></div>
      </div>`;
  }

  function policiesBody() {
    return `
      <table class="grid">
        <thead><tr><th>Policy</th><th>Type</th><th>Status</th><th>Last applied</th></tr></thead>
        <tbody>
          <tr><td>Endpoint security baseline</td><td>Security settings</td><td>Applied</td><td>${fmtTime(d.lastSeen)}</td></tr>
          <tr><td>Antivirus policy</td><td>Defender Antivirus</td><td>Applied</td><td>${fmtTime(d.lastSeen)}</td></tr>
        </tbody>
      </table>`;
  }

  function sentinelBody() {
    return `
      <div class="card card-body">
        <div class="alert-section-title">Sentinel events</div>
        <p class="muted">Related Sentinel events and incidents associated with ${esc(d.name)}.</p>
        <button class="btn btn-primary btn-sm" onclick="navigate('#/sentinel/incidents')">Open related Sentinel incident</button>
      </div>`;
  }

  const bodies = {
    overview: overviewBody, incidents: incidentsBody, timeline: timelineBody,
    recommendations: recommendationsBody, effective: effectiveBody, inventories: inventoriesBody,
    vulnerabilities: vulnerabilitiesBody, missingkbs: missingKbsBody,
    baselines: baselinesBody, policies: policiesBody, sentinel: sentinelBody,
  };
  const body = (bodies[tab] || overviewBody)();

  // Risk pill helper for header badges
  const riskColor = d.riskLevel==='High' ? '#d13438' : d.riskLevel==='Medium' ? '#ff8c00' : '#107c10';
  const internetFacing = d.isInternetFacing
    ? `<span class="dev-tag internet" title="This device received external incoming communication.">Internet facing</span>`
    : '';

  return `
    <div class="dev-crumbs">
      <a onclick="navigate('#/defender/devices')">Device inventory</a>
      <span>›</span>
      <a>${esc(d.name)}</a>
    </div>
    <header class="dev-header">
      <div class="dev-id">
        <div class="dev-id-icon" title="Device details">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H13v2h3.25a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5H11v-2H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"/>
          </svg>
        </div>
        <div>
          <div class="dev-id-name">${esc(d.name)}</div>
          <div class="dev-badges">
            <span class="dev-badge"><span class="dev-block" style="background:${riskColor}"></span> ${esc(d.riskLevel)}</span>
            <span class="dev-badge"><span class="dev-block" style="background:#ff8c00"></span> Criticality: ${esc(d.exposureLevel)}</span>
            <span class="dev-badge"><span class="dev-dot" style="background:#107c10"></span> ${esc(d.healthStatus)}</span>
            ${internetFacing}
            ${d.tags.map(t=>`<span class="dev-tag">${esc(t)}</span>`).join(' ')}
          </div>
        </div>
      </div>
      <div class="dev-header-actions">
        <button class="dev-action" onclick="toast('Map opened (lab stub).')">View in map</button>
        <button class="dev-action" onclick="toast('Device isolated (lab stub).')">Isolate device</button>
        <button class="dev-action" onclick="toast('App execution restricted for ${esc(d.name)} (lab stub).')">Restrict app execution</button>
        <button class="dev-action" onclick="toast('Antivirus scan queued (lab stub).')">Run antivirus scan</button>
        <button class="dev-action" onclick="openInvestigationPackage('${esc(d.id)}')">Collect investigation package</button>
        <button class="dev-action" onclick="openDeviceLiveResponse('${esc(d.id)}')">Initiate Live Response Session</button>
        <button class="dev-action" onclick="toast('Automated investigation initiated for ${esc(d.name)} (lab stub).')">Initiate automated investigation</button>
        <button class="dev-action" onclick="toast('Threat expert consultation request drafted (lab stub).')">Consult a threat expert</button>
        <button class="dev-action" onclick="toast('Action center opened for this device (lab stub).')">Action center</button>
        <button class="dev-action" onclick="toast('Criticality menu opened (lab stub).')">Set criticality</button>
        <button class="dev-action" onclick="toast('More actions opened (lab stub).')">⋯</button>
      </div>
    </header>
    <nav class="tabs dev-tabs" aria-label="Device tabs">
      ${DEVICE_TABS.map(tabBtn).join('')}
    </nav>
    <div class="dev-content">
      <aside class="dev-rail">
        <div class="alert-section-title">Device details</div>
        <div class="dev-rail-grid">
          <div><div class="dev-rail-label">Category</div><div class="dev-rail-value">Endpoint</div></div>
          <div><div class="dev-rail-label">Type</div><div class="dev-rail-value">${d.os.includes('Server')?'Server':'Workstation'}</div></div>
          <div><div class="dev-rail-label">Subtype</div><div class="dev-rail-value">${d.os.includes('Server')?'Server':'Domain'}</div></div>
          <div><div class="dev-rail-label">SAM name</div><div class="dev-rail-value">${esc(d.name)}</div></div>
          <div><div class="dev-rail-label">OS</div><div class="dev-rail-value">${esc(d.os)}</div></div>
          <div><div class="dev-rail-label">Domain</div><div class="dev-rail-value">${esc(d.domain)}</div></div>
          <div><div class="dev-rail-label">Asset group</div><div class="dev-rail-value">${esc(d.tags[0] || '—')}</div></div>
          <div><div class="dev-rail-label">Health state</div><div class="dev-rail-value">${esc(d.healthStatus)}</div></div>
          <div><div class="dev-rail-label">First seen</div><div class="dev-rail-value">${fmtTime(d.firstSeen)}</div></div>
          <div><div class="dev-rail-label">Last seen</div><div class="dev-rail-value">${fmtTime(d.lastSeen)}</div></div>
          <div><div class="dev-rail-label">IP addresses</div><div class="dev-rail-value">${esc(d.ip)}</div></div>
          <div><div class="dev-rail-label">Primary user</div><div class="dev-rail-value">${esc(d.primaryUser)}</div></div>
          <div><div class="dev-rail-label">Onboarding status</div><div class="dev-rail-value">${esc(d.onboardingStatus)}</div></div>
          <div><div class="dev-rail-label">Sensor</div><div class="dev-rail-value">${esc(d.sensor)}</div></div>
        </div>
      </aside>
      <section class="dev-main">${body}</section>
    </div>
  `;
};

// ---------- Defender for Identity ↔ XDR › Identities (list) ----------
VIEWS['defender/identities'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Assets › <strong>Identities</strong></div>
      <h1>Identity inventory</h1>
      <div class="page-subtitle">Security principals observed by Defender for Identity, Entra ID, and Defender XDR. Sensitive / privileged accounts are tagged.</div>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Identities</span><span class="kpi-value">${IDENTITIES.length}</span><span class="kpi-delta">Onboarded sources</span></div>
    <div class="kpi"><span class="kpi-label">Sensitive</span><span class="kpi-value">${IDENTITIES.filter(i=>i.sensitive).length}</span><span class="kpi-delta">Tier-0 / sync / KDC</span></div>
    <div class="kpi"><span class="kpi-label">Privileged</span><span class="kpi-value">${IDENTITIES.filter(i=>i.privileged).length}</span><span class="kpi-delta">Role-bearing</span></div>
    <div class="kpi"><span class="kpi-label">Open alerts</span><span class="kpi-value">${IDENTITIES.reduce((n,i)=>n+i.openAlerts,0)}</span><span class="kpi-delta bad">Across identities</span></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>Identities</strong><span class="muted">${IDENTITIES.length} principals</span></div>
    <table class="grid">
      <thead><tr><th>Display name</th><th>UPN</th><th>Type</th><th>Department</th><th>Risk</th><th>Tags</th><th>Sources</th><th>Last seen</th><th>Open alerts</th></tr></thead>
      <tbody>
        ${IDENTITIES.map(i => `
          <tr onclick="openIdentity('${esc(i.id)}')">
            <td><strong>${esc(i.displayName)}</strong></td>
            <td>${esc(i.upn)}</td>
            <td>${esc(i.accountType)}</td>
            <td>${esc(i.department)}</td>
            <td><span class="sev ${i.riskLevel==='High'?'high':i.riskLevel==='Medium'?'medium':'info'}">${esc(i.riskLevel)}</span></td>
            <td>${i.sensitive?'<span class="tag">Sensitive</span> ':''}${i.privileged?'<span class="tag">Privileged</span>':''}</td>
            <td>${i.sources.map(s=>`<span class="tag">${esc(s)}</span>`).join(' ')}</td>
            <td>${fmtTime(i.lastSeen)}</td>
            <td>${i.openAlerts}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
`;

VIEWS['defender/identity-protection'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Assets › Identities › <strong>Identity protection</strong></div>
      <h1>Compromised identity investigation</h1>
      <div class="page-subtitle">Review risky sign-ins and risk detections, then confirm compromise or dismiss risk with documented context.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="toast('Risk policy settings opened in the lab.')">Risk policy</button>
      <button class="btn btn-primary" onclick="openIdentity('sam.lee@hacksmarterlabs.example')">Open Sam Lee identity</button>
    </div>
  </div>
  <div class="identity-risk-layout">
    <section class="card">
      <div class="card-toolbar"><strong>Risky users</strong><span class="muted">${ENTRA_IDENTITY_INVESTIGATIONS.length} lab investigations</span></div>
      <table class="grid">
        <thead><tr><th>User</th><th>User risk</th><th>Sign-in risk</th><th>Status</th><th>Incident</th><th>Actions</th></tr></thead>
        <tbody>${ENTRA_IDENTITY_INVESTIGATIONS.map(r => `
          <tr onclick="openIdentity('${esc(r.user)}')">
            <td><strong>${esc(r.user)}</strong></td>
            <td><span class="sev ${r.userRisk === 'High' ? 'high' : 'medium'}">${esc(r.userRisk)}</span></td>
            <td><span class="sev ${r.signInRisk === 'High' ? 'high' : 'medium'}">${esc(r.signInRisk)}</span></td>
            <td>${esc(r.status)}</td>
            <td><button class="link-button" onclick="event.stopPropagation(); openIncidentPage('${esc(r.incidentId)}')">${esc(r.incidentId)}</button></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toast('Compromise confirmed for ${esc(r.user)} in lab state.')">Confirm compromise</button>
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); toast('Risk dismissed for ${esc(r.user)} in lab state.')">Dismiss</button>
            </td>
          </tr>
        `).join('')}</tbody>
      </table>
    </section>
    ${ENTRA_IDENTITY_INVESTIGATIONS.map(r => `
      <section class="card card-body">
        <div class="alert-section-title">${esc(r.user)} - investigation detail</div>
        <div class="callout info">${esc(r.decisionGuide)}</div>
        <div class="two-col">
          <div>
            <div class="alert-section-title">Risk detections</div>
            <table class="grid compact-grid">
              <thead><tr><th>Time</th><th>Detection</th><th>Risk</th><th>Detail</th></tr></thead>
              <tbody>${r.riskDetections.map(d => `
                <tr><td>${fmtTime(d.time)}</td><td><strong>${esc(d.type)}</strong><br><span class="muted">${esc(d.source)}</span></td><td><span class="sev ${d.risk === 'High' ? 'high' : 'medium'}">${esc(d.risk)}</span></td><td>${esc(d.detail)}</td></tr>
              `).join('')}</tbody>
            </table>
          </div>
          <div>
            <div class="alert-section-title">Risky sign-ins</div>
            <table class="grid compact-grid">
              <thead><tr><th>Time</th><th>App</th><th>IP</th><th>Location</th><th>Result</th></tr></thead>
              <tbody>${r.signIns.map(s => `
                <tr><td>${fmtTime(s.time)}</td><td>${esc(s.app)}</td><td>${esc(s.ip)}</td><td>${esc(s.location)}</td><td>${esc(s.result)} · ${esc(s.risk)}</td></tr>
              `).join('')}</tbody>
            </table>
          </div>
        </div>
        <div class="incident-command-bar">
          ${r.actions.map(a => `<button class="btn btn-secondary btn-sm" onclick="toast('${esc(a)} action recorded for ${esc(r.user)}.')">${esc(a)}</button>`).join('')}
        </div>
      </section>
    `).join('')}
  </div>
`;

// ---------- Defender for Identity ↔ XDR › Identity detail (Overview / Timeline / …) ----------
const IDENTITY_TABS = [
  { key:'overview',   label:'Overview' },
  { key:'incidents',  label:'Incidents and alerts' },
  { key:'assets',     label:'Assets' },
  { key:'timeline',   label:'Timeline' },
  { key:'lmp',        label:'Lateral movement paths' },
  { key:'directory',  label:'Directory data' },
  { key:'sentinel',   label:'Sentinel events' },
];

const IDENTITY_ALERT_TEMPLATES = [
  ['high', 'Suspicious DCSync activity', 'Defender for Identity', 'INC-1019', 'Credential access'],
  ['high', 'Possible AdminSDHolder modification', 'Defender for Identity', 'INC-1019', 'Persistence'],
  ['medium', 'Suspicious LDAP enumeration', 'Defender for Identity', 'INC-1019', 'Discovery'],
  ['medium', 'Reconnaissance using directory services queries', 'Defender for Identity', 'INC-1019', 'Discovery'],
  ['high', 'Honeytoken account activity', 'Defender for Identity', 'INC-1019', 'Credential access'],
  ['medium', 'Suspicious Kerberos service ticket request', 'Defender for Identity', 'INC-1019', 'Credential access'],
  ['high', 'Suspected Golden Ticket usage', 'Defender for Identity', 'INC-1019', 'Credential access'],
  ['medium', 'Unusual protocol implementation detected', 'Defender for Identity', 'INC-1038', 'Defense evasion'],
  ['medium', 'Remote code execution attempt over SMB', 'Defender for Endpoint', 'INC-1050', 'Lateral movement'],
  ['high', 'Account performed suspicious remote logon', 'Defender for Identity', 'INC-1050', 'Lateral movement'],
  ['medium', 'Unusual administrative group membership change', 'Defender for Identity', 'INC-1019', 'Privilege escalation'],
  ['high', 'Sensitive group modification', 'Defender for Identity', 'INC-1019', 'Privilege escalation'],
  ['medium', 'Password spray attempt detected', 'Entra ID Protection', 'INC-1053', 'Credential access'],
  ['medium', 'Multiple failed sign-ins followed by success', 'Entra ID Protection', 'INC-1053', 'Credential access'],
  ['high', 'Risky sign-in from anonymous IP address', 'Entra ID Protection', 'INC-1051', 'Initial access'],
  ['medium', 'Impossible travel sign-in properties', 'Entra ID Protection', 'INC-1053', 'Initial access'],
  ['high', 'Adversary-in-the-middle phishing session detected', 'Entra ID Protection', 'INC-1051', 'Initial access'],
  ['medium', 'Suspicious inbox rule created', 'Defender for Office 365', 'INC-1042', 'Collection'],
  ['high', 'OAuth app consent granted to risky application', 'Defender for Cloud Apps', 'INC-1042', 'Persistence'],
  ['medium', 'Unusual file download volume', 'Defender for Cloud Apps', 'INC-1042', 'Exfiltration'],
];

function identityAlertRows(identity, realAlerts, timeline) {
  const defaultIncident = identity.id === 'fin-svc@hacksmarterlabs.example' ? 'INC-1050'
    : identity.id === 'jane.doe@hacksmarterlabs.example' ? 'INC-1042'
    : identity.id === 'maria.ross@hacksmarterlabs.example' ? 'INC-1051'
    : identity.id === 'sam.lee@hacksmarterlabs.example' ? 'INC-1053'
    : identity.id === 'svc-backup@hacksmarterlabs.example' || identity.id === 'MSOL_AzureSync@hacksmarterlabs.example' ? 'INC-1019'
    : 'INC-1038';
  const timelineAlerts = timeline.filter(r => r.kind === 'alert').map((r, index) => ({
    id: r.alertId || `IDTIM-${index + 1}`,
    severity: r.severity || 'medium',
    title: r.title,
    status: r.classification === 'Pending' ? 'New' : 'In progress',
    incidentId: realAlerts[index]?.incidentId || defaultIncident,
    detectionSource: r.source || 'Defender XDR',
    category: r.techniqueName || 'Identity',
    firstActivity: r.time,
    real: Boolean(realAlerts.find(a => a.id === r.alertId)),
  }));
  const real = realAlerts.map(a => ({ ...a, real:true }));
  const synthetic = Array.from({ length: 48 }, (_, index) => {
    const t = IDENTITY_ALERT_TEMPLATES[index % IDENTITY_ALERT_TEMPLATES.length];
    const when = new Date(new Date(identity.lastSeen).getTime() - (index + 1) * 17 * 60 * 1000).toISOString();
    return {
      id: `ID-${identity.samName.replace(/[^a-z0-9]/gi, '').toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      severity: t[0],
      title: `${t[1]} - ${identity.displayName}`,
      status: index % 5 === 0 ? 'New' : index % 3 === 0 ? 'Resolved' : 'In progress',
      incidentId: t[3],
      detectionSource: t[2],
      category: t[4],
      firstActivity: when,
      real: false,
    };
  });
  const byId = new Map();
  [...real, ...timelineAlerts, ...synthetic].forEach(row => byId.set(row.id, row));
  return [...byId.values()].sort((a,b) => new Date(b.firstActivity) - new Date(a.firstActivity));
}

function identityAssetRows(identity) {
  const devices = ['WKS-03','FIN-FS-02','DC01','AAD-CONNECT-01','WKS-01','WKS-02'];
  const apps = ['Office 365 Exchange Online','DocViewer Pro','Azure Portal','Teams','SharePoint Online','Graph PowerShell'];
  const ips = ['10.20.7.42','10.20.4.55','185.199.111.12','91.219.236.54','76.21.55.4','168.63.129.16'];
  const files = ['scanner.exe','locker.exe','vssadmin.exe','invoice.html','consent-grant.json','RECOVER-FILES.txt'];
  const groups = ['Domain Admins','Backup Operators','Finance Share Owners','Privileged Role Admins','Remote Management Users'];
  const mailboxes = [identity.upn, 'shared-finance@hacksmarterlabs.example', 'cfo@hacksmarterlabs.example'];
  const make = (type, values, source, riskBase) => values.map((name, index) => ({
    type,
    name,
    source,
    risk: index === 0 ? riskBase : index % 3 === 0 ? 'High' : index % 2 === 0 ? 'Medium' : 'Low',
    firstSeen: new Date(new Date(identity.firstSeen).getTime() + index * 86400000).toISOString(),
    lastSeen: new Date(new Date(identity.lastSeen).getTime() - index * 3600000).toISOString(),
  }));
  return [
    ...make('Device', devices, 'Defender for Endpoint', identity.riskLevel),
    ...make('Cloud app', apps, 'Defender for Cloud Apps', 'Medium'),
    ...make('IP address', ips, 'Entra ID Protection', 'Medium'),
    ...make('File', files, 'Defender XDR evidence', 'High'),
    ...make('Group', groups, 'Defender for Identity', identity.privileged ? 'High' : 'Medium'),
    ...make('Mailbox', mailboxes, 'Defender for Office 365', 'Medium'),
  ];
}

VIEWS['defender/identity'] = () => {
  const selectedId = sessionStorage.getItem('defender-lab.identity.id') || IDENTITIES[0].id;
  const i = IDENTITIES.find(x => x.id === selectedId) || IDENTITIES[0];
  const tab = sessionStorage.getItem('defender-lab.identity.tab') || 'overview';
  const timeline = (IDENTITY_TIMELINE[i.id] || [])
    .slice().sort((a,b) => new Date(b.time) - new Date(a.time));
  const incAlerts = (typeof alerts !== 'undefined' ? alerts : SEED_ALERTS)
    .filter(a => a.asset === i.id || a.asset === i.samName || a.asset === i.upn);
  const identityAlerts = identityAlertRows(i, incAlerts, timeline);
  const identityAssets = identityAssetRows(i);

  const tabBtn = t => `
    <button class="tab ${tab===t.key?'active':''}" onclick="setIdentityTab('${t.key}')">${esc(t.label)}</button>`;

  const riskClass = i.riskLevel==='High' ? 'high'
                  : i.riskLevel==='Medium' ? 'medium' : 'info';
  const riskColor = i.riskLevel==='High' ? '#d13438'
                  : i.riskLevel==='Medium' ? '#f7630c' : '#0078d4';

  // ---- Overview ----
  function overviewBody() {
    return `
      <div class="dev-overview-grid">
        <section class="dev-card">
          <div class="dev-card-title">Active alerts</div>
          <div class="dev-metric">Risk level: <span class="sev ${riskClass}">${esc(i.riskLevel)}</span></div>
          <div class="muted dev-card-sub">${identityAlerts.filter(a=>a.status !== 'Resolved').length} active alerts, ${identityAlerts.length} total alert records</div>
          <a class="dev-link" onclick="setIdentityTab('incidents')">View all incidents and alerts</a>
        </section>
        <section class="dev-card">
          <div class="dev-card-title">Account properties</div>
          <div class="dev-metric">${esc(i.accountType)}</div>
          <div class="muted dev-card-sub">
            ${i.sensitive ? '<span class="tag">Sensitive</span> ' : ''}
            ${i.privileged ? '<span class="tag">Privileged</span>' : ''}
            ${(!i.sensitive && !i.privileged) ? 'No sensitive / privileged flags' : ''}
          </div>
          <div class="muted dev-card-sub">Department: ${esc(i.department)}</div>
          <div class="muted dev-card-sub">Title: ${esc(i.title)}</div>
        </section>
        <section class="dev-card">
          <div class="dev-card-title">Observed in organization</div>
          <div class="dev-metric">${identityAssets.length} related assets</div>
          <div class="muted dev-card-sub">${identityAssets.filter(a=>a.type==='Device').length} devices · ${identityAssets.filter(a=>a.type==='Cloud app').length} cloud apps · ${identityAssets.filter(a=>a.type==='IP address').length} IPs</div>
          <a class="dev-link" onclick="setIdentityTab('assets')">View all assets</a>
        </section>
        <section class="dev-card">
          <div class="dev-card-title">Investigator notes</div>
          <p class="muted" style="font-size:12px; line-height:1.45; margin:6px 0 10px;">${esc(i.notes)}</p>
          <a class="dev-link" onclick="setIdentityTab('timeline')">Open timeline</a>
        </section>
      </div>`;
  }

  // ---- Incidents and alerts ----
  function incidentsBody() {
    return `
      <div class="dev-cmdbar">
        <button class="btn btn-primary btn-sm" onclick="toast('Selected alert opened (lab stub).')">Open selected</button>
        <button class="btn btn-secondary btn-sm">Filter</button>
        <button class="btn btn-secondary btn-sm">Manage columns</button>
        <button class="btn btn-secondary btn-sm">Export</button>
        <span class="muted" style="align-self:center;">${identityAlerts.length} alert records</span>
      </div>
      <table class="grid">
        <thead><tr><th>Sev</th><th>Title</th><th>Status</th><th>Incident</th><th>Source</th><th>First activity</th></tr></thead>
        <tbody>
          ${identityAlerts.map(a => `
            <tr onclick="${a.real ? `openAlert('${esc(a.id)}')` : `toast('Synthetic identity alert ${esc(a.id)} opened (lab stub).')`}">
              <td><span class="sev ${a.severity}">${cap(a.severity)}</span></td>
              <td>${esc(a.title)}</td>
              <td>${esc(a.status)}</td>
              <td><button class="link-button" onclick="event.stopPropagation(); openIncidentPage('${esc(a.incidentId)}')">${esc(a.incidentId)}</button></td>
              <td>${esc(a.detectionSource)}</td>
              <td>${fmtTime(a.firstActivity)}</td>
            </tr>`).join('') || '<tr><td colspan="6" class="muted">No alerts on this identity.</td></tr>'}
        </tbody>
      </table>`;
  }

  function assetsBody() {
    return `
      <div class="dev-cmdbar">
        <button class="btn btn-primary btn-sm" onclick="toast('Selected asset opened (lab stub).')">Open selected</button>
        <button class="btn btn-secondary btn-sm">Filter</button>
        <button class="btn btn-secondary btn-sm">Export</button>
        <span class="muted" style="align-self:center;">${identityAssets.length} related assets</span>
      </div>
      <table class="grid">
        <thead><tr><th>Asset type</th><th>Name</th><th>Risk</th><th>Source</th><th>First seen</th><th>Last seen</th><th>Action</th></tr></thead>
        <tbody>
          ${identityAssets.map(asset => {
            const isDevice = asset.type === 'Device' && deviceExists(asset.name);
            return `
              <tr onclick="${isDevice ? `openDevice('${esc(asset.name)}')` : `toast('Synthetic ${esc(asset.type)} asset opened (lab stub).')`}">
                <td>${esc(asset.type)}</td>
                <td><strong>${esc(asset.name)}</strong></td>
                <td><span class="sev ${asset.risk==='High'?'high':asset.risk==='Medium'?'medium':'info'}">${esc(asset.risk)}</span></td>
                <td>${esc(asset.source)}</td>
                <td>${fmtTime(asset.firstSeen)}</td>
                <td>${fmtTime(asset.lastSeen)}</td>
                <td>${isDevice
                  ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); openDevice('${esc(asset.name)}')">Open device</button>`
                  : `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toast('Asset pivot opened for ${esc(asset.name)} (lab stub).')">Open asset</button>`}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  // ---- Timeline ----
  // Identity timeline = alerts and raw identity-flavored events. Alert rows are
  // clickable to open the alert detail (with the classification helper baked in).
  function timelineBody() {
    return `
      <div class="dev-cmdbar">
        <input class="ipt dev-search" placeholder="Search timeline" />
        <button class="btn btn-secondary btn-sm">Filter</button>
        <button class="btn btn-secondary btn-sm">Time range</button>
      </div>
      <div class="callout info">
        Identity timeline interleaves <strong>Defender for Identity alerts</strong> with the raw events
        that triggered them. Click an alert row to open the classification helper
        (True positive / Benign true positive / False positive) — the MSOL_AzureSync DCSync
        scenario is the canonical "benign true positive" pattern.
      </div>
      <div class="dev-timeline-list">
        ${timeline.map((e, idx) => {
          const isAlert = e.kind === 'alert';
          const iconCls = isAlert ? 'tech' : '';
          const iconLetter = isAlert ? 'A' : (e.actionType || 'E').charAt(0).toUpperCase();
          const right = isAlert ? `${cap(e.severity)} alert` : (e.actionType || 'Event');
          const click = isAlert
            ? `onclick="openIdentityAlert('${esc(i.id)}', ${idx})"`
            : `onclick="toast('Event detail — pivot to Advanced hunting for raw row.')"`;
          return `
            <div class="dev-tle ${isAlert?'is-tech':''}" ${click} role="button" tabindex="0">
              <div class="dev-tle-time">${fmtTime(e.time)}</div>
              <div class="dev-tle-icon ${iconCls}">${iconLetter}</div>
              <div class="dev-tle-main">
                <div class="dev-tle-title">${esc(e.title || e.actionType || 'Event')}</div>
                <div class="dev-tle-desc muted">${esc(e.description || '')}</div>
              </div>
              <div class="dev-tle-right muted">${esc(right)}</div>
            </div>`;
        }).join('') || '<div class="muted" style="padding:20px;">No timeline records.</div>'}
      </div>`;
  }

  function lmpBody() {
    return `
      <div class="callout info">
        Lateral movement paths (LMPs) surface every <em>shortest path</em> an attacker could
        traverse from this identity to a Tier-0 asset using observed sign-ins, group memberships,
        and local-admin rights. Defender for Identity recomputes LMPs every 48 hours.
      </div>
      <div class="card card-body">
        <strong>Sample path for ${esc(i.displayName)}</strong>
        <ol style="margin:8px 0 0 18px; line-height:1.7; font-size:13px;">
          <li>${esc(i.displayName)} signs in interactively on WKS-03</li>
          <li>fin-svc (local admin on WKS-03) cached credentials present</li>
          <li>fin-svc signs in to FIN-FS-02 over RDP (member of Domain Admins via nested group)</li>
          <li>FIN-FS-02 mounts an SMB share on DC01 — Tier-0 reach</li>
        </ol>
        <p class="muted" style="margin-top:10px;">Remediation: remove fin-svc from local admins on WKS-03, scope domain-admin via tiered admin model, enforce LAPS.</p>
      </div>`;
  }

  function directoryBody() {
    return `
      <table class="grid">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Display name</td><td>${esc(i.displayName)}</td></tr>
          <tr><td>SAM account name</td><td>${esc(i.samName)}</td></tr>
          <tr><td>User principal name</td><td>${esc(i.upn)}</td></tr>
          <tr><td>SID</td><td>${esc(i.sid)}</td></tr>
          <tr><td>Account type</td><td>${esc(i.accountType)}</td></tr>
          <tr><td>Department</td><td>${esc(i.department)}</td></tr>
          <tr><td>Title</td><td>${esc(i.title)}</td></tr>
          <tr><td>Sensitive</td><td>${i.sensitive?'Yes':'No'}</td></tr>
          <tr><td>Privileged</td><td>${i.privileged?'Yes':'No'}</td></tr>
          <tr><td>Sources</td><td>${i.sources.map(s=>`<span class="tag">${esc(s)}</span>`).join(' ')}</td></tr>
        </tbody>
      </table>`;
  }

  function sentinelBody() {
    return `
      <div class="card card-body">
        <div class="alert-section-title">Related Sentinel events</div>
        <p class="muted">SigninLogs / IdentityLogonEvents / IdentityDirectoryEvents associated with ${esc(i.displayName)}.</p>
        <button class="btn btn-primary btn-sm" onclick="navigate('#/sentinel/incidents')">Open related Sentinel incident</button>
      </div>`;
  }

  const bodies = {
    overview: overviewBody, incidents: incidentsBody, timeline: timelineBody,
    assets: assetsBody, lmp: lmpBody, directory: directoryBody, sentinel: sentinelBody,
  };
  const body = (bodies[tab] || overviewBody)();

  return `
    <div class="dev-crumbs">
      <a onclick="navigate('#/defender/identities')">Identity inventory</a>
      <span>›</span>
      <a>${esc(i.displayName)}</a>
    </div>
    <header class="dev-header">
      <div class="dev-id">
        <div class="dev-id-icon" title="Identity">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 1.5c-3.6 0-8 1.8-8 5.5V21h16v-2c0-3.7-4.4-5.5-8-5.5Z"/>
          </svg>
        </div>
        <div>
          <div class="dev-id-name">${esc(i.displayName)}</div>
          <div class="dev-badges">
            <span class="dev-badge"><span class="dev-block" style="background:${riskColor}"></span> ${esc(i.riskLevel)}</span>
            <span class="dev-badge"><span class="dev-dot" style="background:#107c10"></span> ${esc(i.accountType)}</span>
            ${i.sensitive ? '<span class="dev-tag">Sensitive</span>' : ''}
            ${i.privileged ? '<span class="dev-tag">Privileged</span>' : ''}
            ${i.sources.map(s=>`<span class="dev-tag">${esc(s)}</span>`).join(' ')}
          </div>
        </div>
      </div>
      <div class="dev-header-actions">
        <button class="dev-action" onclick="toast('Sign-in activity opened (lab stub).')">Sign-in activity</button>
        <button class="dev-action" onclick="toast('Revoke sessions (lab stub).')">Revoke sessions</button>
        <button class="dev-action" onclick="toast('Reset password (lab stub).')">Reset password</button>
        <button class="dev-action" onclick="toast('Confirm compromise (lab stub).')">Confirm compromise</button>
        <button class="dev-action">⋯</button>
      </div>
    </header>
    <nav class="tabs dev-tabs" aria-label="Identity tabs">
      ${IDENTITY_TABS.map(tabBtn).join('')}
    </nav>
    <div class="dev-content">
      <aside class="dev-rail">
        <div class="alert-section-title">Identity details</div>
        <div class="dev-rail-grid">
          <div><div class="dev-rail-label">Display name</div><div class="dev-rail-value">${esc(i.displayName)}</div></div>
          <div><div class="dev-rail-label">SAM name</div><div class="dev-rail-value">${esc(i.samName)}</div></div>
          <div><div class="dev-rail-label">UPN</div><div class="dev-rail-value">${esc(i.upn)}</div></div>
          <div><div class="dev-rail-label">Type</div><div class="dev-rail-value">${esc(i.accountType)}</div></div>
          <div><div class="dev-rail-label">Department</div><div class="dev-rail-value">${esc(i.department)}</div></div>
          <div><div class="dev-rail-label">Title</div><div class="dev-rail-value">${esc(i.title)}</div></div>
          <div><div class="dev-rail-label">Risk level</div><div class="dev-rail-value">${esc(i.riskLevel)}</div></div>
          <div><div class="dev-rail-label">Sensitive</div><div class="dev-rail-value">${i.sensitive?'Yes':'No'}</div></div>
          <div><div class="dev-rail-label">Privileged</div><div class="dev-rail-value">${i.privileged?'Yes':'No'}</div></div>
          <div><div class="dev-rail-label">Devices observed</div><div class="dev-rail-value">${i.devicesSeen}</div></div>
          <div><div class="dev-rail-label">First seen</div><div class="dev-rail-value">${fmtTime(i.firstSeen)}</div></div>
          <div><div class="dev-rail-label">Last seen</div><div class="dev-rail-value">${fmtTime(i.lastSeen)}</div></div>
          <div><div class="dev-rail-label">SID</div><div class="dev-rail-value" style="font-size:11px;">${esc(i.sid)}</div></div>
          <div><div class="dev-rail-label">Sources</div><div class="dev-rail-value">${i.sources.join(', ')}</div></div>
        </div>
      </aside>
      <section class="dev-main">${body}</section>
    </div>
  `;
};

VIEWS['defender/suppression'] = () => {
  return `
    <div class="page-header">
      <div><div class="breadcrumb">System › <strong>Suppression rules</strong></div><h1>Suppression rules</h1></div>
      <div class="page-actions"><button class="btn btn-primary" onclick="openRulePanel()">+ Create rule</button></div>
    </div>
    <div class="callout">
      Suppression rules apply when <strong>every</strong> condition matches (logical AND).
      Use stable indicators (signing cert, install path) over volatile ones (file hash) when you can.
    </div>
    <div class="card">
      <div class="card-toolbar"><strong>${rules.length}</strong> rules</div>
      <table class="grid">
        <thead><tr><th>Status</th><th>Rule name</th><th>Scope</th><th>Conditions</th><th>Created</th><th></th></tr></thead>
        <tbody>
          ${rules.map(r => {
            const summary = r.conditions.map(c =>
              `${fieldLabel(c.field)} = ${c.field === 'sha256' ? c.value.slice(0,12) + '…' : c.value}`
            ).join(' AND ');
            return `<tr>
              <td><span class="status-dot ${r.enabled !== false ? 'resolved' : ''}"></span>${r.enabled !== false ? 'Enabled' : 'Disabled'}</td>
              <td><strong>${esc(r.name)}</strong></td>
              <td>${esc(r.scope || 'All devices')}</td>
              <td class="kv">${esc(summary)}</td>
              <td>${fmtTime(r.createdAt)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="deleteRule('${r.id}')">Delete</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ====================================================================
// SENTINEL
// ====================================================================
VIEWS['sentinel/home'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Sentinel › <strong>Overview</strong></div><h1>Overview</h1></div></div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Events received (24h)</span><span class="kpi-value">4.2M</span><span class="kpi-delta">▲ 6%</span></div>
    <div class="kpi"><span class="kpi-label">Open incidents</span><span class="kpi-value">${INCIDENTS.length}</span></div>
    <div class="kpi"><span class="kpi-label">Active analytics rules</span><span class="kpi-value">${SENTINEL_RULES.filter(r=>r.enabled).length}</span></div>
    <div class="kpi"><span class="kpi-label">Playbooks</span><span class="kpi-value">11</span></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-toolbar"><strong>Recent incidents</strong><a class="chip-link" href="#/sentinel/incidents">View all →</a></div>
      <table class="grid"><thead><tr><th>Severity</th><th>Title</th><th>Tactics</th></tr></thead>
      <tbody>${INCIDENTS.slice(0,4).map(i => `
        <tr onclick="openIncident('${i.id}')">
          <td><span class="sev ${i.severity}">${cap(i.severity)}</span></td>
          <td><strong>${esc(i.title)}</strong></td>
          <td>${i.tactics.map(t=>`<span class="mitre">${esc(t)}</span>`).join('')}</td>
        </tr>`).join('')}</tbody></table>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Data connectors</div>
      <div style="font-size:13px; line-height:1.9;">
        <div><span class="status-dot resolved"></span>Defender XDR — Streaming</div>
        <div><span class="status-dot resolved"></span>Azure Activity — Streaming</div>
        <div><span class="status-dot resolved"></span>Entra ID — Streaming</div>
        <div><span class="status-dot warn"></span>AWS CloudTrail — Health degraded</div>
        <div><span class="status-dot resolved"></span>Office 365 — Streaming</div>
      </div>
    </div>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Home lab path: IOC to MITRE coverage</strong>
      <a class="chip-link" href="#/sentinel/threat-intel">Open threat intelligence →</a>
    </div>
    <div class="flowline">
      ${SENTINEL_LAB_FLOW.map(step => `
        <div class="flow-step">
          <strong>${esc(step.title)}</strong>
          <span>${esc(step.detail)}</span>
        </div>
      `).join('')}
    </div>
  </div>
`;

VIEWS['sentinel/incidents'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Sentinel › Threat management › <strong>Incidents</strong></div>
      <h1>Sentinel incidents</h1>
      <div class="page-subtitle">Sentinel queue with Defender XDR unified-response context, ownership, evidence, and cross-product pivots.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="navigate('#/defender/incidents')">Open Defender XDR queue</button>
      <button class="btn btn-primary" onclick="navigate('#/sentinel/graph')">Open Sentinel Graph</button>
    </div>
  </div>
  <div class="callout info">
    <strong>Unified response lens:</strong> Sentinel incidents can be investigated from Defender XDR when Hack Smarter Labs security signals are connected.
    Keep Sentinel analytics, automation, bookmarks, and Graph context visible while using Defender XDR for the unified incident story and response actions.
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>${INCIDENTS.length}</strong> incidents<span class="muted">Mapped to Defender XDR incident IDs for this lab</span></div>
    <table class="grid">
      <thead><tr><th>Severity</th><th>Sentinel incident</th><th>Provider</th><th>Analytics / source</th><th>Unified lens</th><th>Action</th></tr></thead>
      <tbody>${INCIDENTS.map(i => {
        const sources = (typeof alerts !== 'undefined' ? alerts : SEED_ALERTS).filter(a => i.alertIds.includes(a.id)).map(a => a.detectionSource);
        const uniqueSources = [...new Set(sources)];
        return `
          <tr onclick="openIncident('${esc(i.id)}')">
            <td><span class="sev ${i.severity}">${cap(i.severity)}</span></td>
            <td><strong>${esc(i.title)}</strong><br><span class="muted">${esc(i.id)} · ${i.alertCount} alert(s)</span></td>
            <td>${uniqueSources.map(s=>`<span class="tag">${esc(s)}</span>`).join('') || '<span class="tag">Sentinel</span>'}</td>
            <td>${i.tactics.map(t=>`<span class="mitre">${esc(t)}</span>`).join('')}</td>
            <td>
              <div class="mini-step">Defender incident page preserves attack story, evidence, and response actions.</div>
              ${i.id === SENTINEL_GRAPH.incidentId ? '<div class="mini-step">Sentinel Graph fixture available for entity relationship analysis.</div>' : ''}
            </td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openIncidentPage('${esc(i.id)}')">Open in Defender XDR</button>
              ${i.id === SENTINEL_GRAPH.incidentId ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); navigate('#/sentinel/graph')">Graph</button>` : ''}
            </td>
          </tr>`;
      }).join('')}</tbody>
    </table>
  </div>
`;

function sentinelGraphMatchesFilter(node, filter) {
  if (!filter || filter === 'all') return true;
  if (filter === 'identity') return ['User','Role'].includes(node.type);
  if (filter === 'apps') return ['OAuth app','Cloud app','Permission'].includes(node.type);
  if (filter === 'content') return ['Mailbox','SharePoint site','OneDrive','Channel','Power BI'].includes(node.type);
  if (filter === 'threat') return ['URL'].includes(node.type);
  return true;
}

function sentinelGraphVisibleData(state) {
  const visibleIds = new Set(state.visibleNodeIds);
  let nodes = SENTINEL_GRAPH.nodes.filter(node => visibleIds.has(node.id) && sentinelGraphMatchesFilter(node, state.filter));
  const groupedCounts = {};
  if (state.grouped) {
    const representatives = {};
    nodes = nodes.filter(node => {
      const group = SENTINEL_GRAPH.nodeMeta[node.id]?.group;
      if (!group) return true;
      groupedCounts[group] = (groupedCounts[group] || 0) + 1;
      if (!representatives[group]) {
        representatives[group] = node.id;
        return true;
      }
      return false;
    });
  }
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = SENTINEL_GRAPH.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  return { nodes, edges, groupedCounts };
}

function sentinelGraphLayout(nodes, state) {
  if (state.layout !== 'risk') {
    return nodes.reduce((map, node) => {
      map[node.id] = SENTINEL_GRAPH.positions[node.id] || { x:50, y:50 };
      return map;
    }, {});
  }
  const lanes = { observed:[], critical:[], possible:[] };
  nodes.forEach(node => {
    const meta = SENTINEL_GRAPH.nodeMeta[node.id] || {};
    if (SENTINEL_GRAPH.criticalNodeIds.includes(node.id)) lanes.critical.push(node);
    else if (Number(node.ring || 0) < 2 || /observed|compromised|revoked|blocked/i.test(meta.status || '')) lanes.observed.push(node);
    else lanes.possible.push(node);
  });
  const layout = {};
  const laneX = { observed:22, critical:58, possible:86 };
  Object.entries(lanes).forEach(([lane, list]) => {
    list.forEach((node, index) => {
      layout[node.id] = { x:laneX[lane], y:12 + ((index + 1) / (list.length + 1)) * 76 };
    });
  });
  return layout;
}

function sentinelGraphInitials(type) {
  const aliases = { 'OAuth app':'OA', 'Cloud app':'CA', 'SharePoint site':'SP', 'Power BI':'BI' };
  return aliases[type] || String(type || 'Entity').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function sentinelGraphPathTargetId(target) {
  if (/Finance SharePoint/i.test(target)) return 'finance-sp';
  if (/mailbox/i.test(target)) return 'cfo-mailbox';
  if (/admin/i.test(target)) return 'm365-admin';
  return '';
}

function renderSentinelGraphNodeDetails(node, state) {
  const meta = SENTINEL_GRAPH.nodeMeta[node.id] || {};
  const story = ATTACK_STORIES[SENTINEL_GRAPH.incidentId];
  const relatedEdges = SENTINEL_GRAPH.edges.filter(edge => edge.from === node.id || edge.to === node.id);
  const relatedSteps = story.steps.filter(step => step.node === node.id);
  const hiddenNeighbors = relatedEdges
    .map(edge => edge.from === node.id ? edge.to : edge.from)
    .filter(id => !state.visibleNodeIds.includes(id));
  const actions = state.actions.filter(item => item.nodeId === node.id);
  const tab = state.detailTab;
  let body = '';
  if (tab === 'overview') {
    body = `
      <p class="sg-detail-summary">${esc(meta.summary || node.remediation)}</p>
      <dl class="sg-detail-list">
        <dt>Verdict</dt><dd>${esc(node.verdict)}</dd>
        <dt>Status</dt><dd>${esc(meta.status || 'Related entity')}</dd>
        <dt>First observed</dt><dd>${esc(meta.firstSeen || 'Derived relationship')}</dd>
        <dt>Evidence table</dt><dd><code>${esc(meta.table || 'CloudAppEvents')}</code></dd>
        <dt>Relationships</dt><dd>${relatedEdges.length}</dd>
      </dl>
      <div class="sg-response-note"><strong>Recommended response</strong><span>${esc(meta.response || node.remediation)}</span></div>
      ${actions.length ? `<div class="sg-action-log">${actions.map(item => `<span>✓ ${esc(item.action)} recorded</span>`).join('')}</div>` : ''}
    `;
  } else if (tab === 'evidence') {
    body = `
      <div class="sg-detail-section-title">Relationship evidence</div>
      <div class="sg-evidence-list">
        ${relatedEdges.map(edge => {
          const otherId = edge.from === node.id ? edge.to : edge.from;
          const other = SENTINEL_GRAPH.nodes.find(item => item.id === otherId);
          const evidence = SENTINEL_GRAPH.edgeEvidence[`${edge.from}|${edge.to}`];
          return `<button onclick="selectSentinelGraphEdge('${esc(edge.from)}|${esc(edge.to)}')">
            <strong>${esc(edge.label)}</strong>
            <span>${esc(other?.label || otherId)} · ${esc(evidence?.source || (edge.kind === 'blast' ? 'Sentinel graph inference' : 'Correlated security telemetry'))}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="sg-detail-section-title">Alert evidence</div>
      ${relatedSteps.length ? relatedSteps.map(step => `<div class="sg-timeline-item"><time>${fmtTime(step.time)}</time><strong>${esc(step.title)}</strong><span>${esc(step.detail)}</span></div>`).join('') : '<p class="muted">No alert is directly attached. This node was added by graph traversal.</p>'}
    `;
  } else {
    const activity = (INCIDENT_ACTIVITY[SENTINEL_GRAPH.incidentId] || []).map(item => ({
      time:item.time, title:item.category, detail:item.detail,
    }));
    const timeline = [...story.steps, ...activity].sort((a,b) => String(a.time).localeCompare(String(b.time)));
    body = `<div class="sg-timeline-list">${timeline.map(item => `<div class="sg-timeline-item ${item.node === node.id ? 'related' : ''}">
      <time>${fmtTime(item.time)}</time><strong>${esc(item.title)}</strong><span>${esc(item.detail)}</span>
    </div>`).join('')}</div>`;
  }
  const responseAction = node.id === 'user-jane' ? 'Revoke sessions'
    : node.id === 'app-docviewer' ? 'Block OAuth app'
    : SENTINEL_GRAPH.criticalNodeIds.includes(node.id) ? 'Protect critical asset'
    : 'Add investigation note';
  return `
    <aside class="sg-detail-drawer" aria-label="Selected node details">
      <div class="sg-detail-head">
        <div class="sg-detail-icon">${esc(sentinelGraphInitials(node.type))}</div>
        <div><span>${esc(node.type)}</span><strong>${esc(node.label)}</strong></div>
        <button class="iconbtn" onclick="closeSentinelGraphDetails()" aria-label="Close details">✕</button>
      </div>
      <div class="sg-detail-badges"><span class="sev ${esc(meta.risk || 'medium')}">${cap(meta.risk || 'medium')} risk</span>${SENTINEL_GRAPH.criticalNodeIds.includes(node.id) ? '<span class="tag orange">Critical asset</span>' : ''}</div>
      <div class="sg-detail-tabs">
        ${['overview','evidence','timeline'].map(item => `<button class="${tab === item ? 'active' : ''}" onclick="setSentinelGraphDetailTab('${item}')">${cap(item)}</button>`).join('')}
      </div>
      <div class="sg-detail-body">${body}</div>
      <div class="sg-detail-actions">
        ${hiddenNeighbors.length ? `<button class="btn btn-primary btn-sm" onclick="expandSentinelGraphNode('${esc(node.id)}')">Explore ${hiddenNeighbors.length} connected asset${hiddenNeighbors.length === 1 ? '' : 's'}</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="openSentinelGraphHunt('${esc(node.id)}')">Hunt this entity</button>
        <button class="btn btn-secondary btn-sm" onclick="sentinelGraphRespond('${esc(node.id)}','${esc(responseAction)}')">${esc(responseAction)}</button>
        <button class="btn btn-secondary btn-sm" onclick="runSentinelEntityPlaybook('${esc(node.label)}','Sentinel incident graph')">Run playbook</button>
      </div>
    </aside>`;
}

function renderSentinelGraphEdgeDetails(edge) {
  const from = SENTINEL_GRAPH.nodes.find(node => node.id === edge.from);
  const to = SENTINEL_GRAPH.nodes.find(node => node.id === edge.to);
  const evidence = SENTINEL_GRAPH.edgeEvidence[`${edge.from}|${edge.to}`] || {
    source:edge.kind === 'blast' ? 'Sentinel graph path analysis' : 'Correlated security telemetry',
    time:edge.kind === 'blast' ? 'Potential path' : 'Incident window',
    confidence:edge.kind === 'blast' ? 'Contextual' : 'Medium',
    detail:edge.kind === 'blast' ? 'This relationship represents a reachable path, not proof that the attacker traversed it.' : 'The incident evidence connects these two entities.',
  };
  return `
    <aside class="sg-detail-drawer" aria-label="Selected relationship details">
      <div class="sg-detail-head"><div class="sg-detail-icon relation">↔</div><div><span>${esc(edge.kind === 'blast' ? 'Blast-radius path' : 'Observed relationship')}</span><strong>${esc(edge.label)}</strong></div><button class="iconbtn" onclick="closeSentinelGraphDetails()">✕</button></div>
      <div class="sg-detail-body">
        <div class="sg-edge-endpoints">
          <button onclick="selectSentinelGraphNode('${esc(edge.from)}')"><span>${esc(from?.type)}</span><strong>${esc(from?.label)}</strong></button>
          <b>→</b>
          <button onclick="selectSentinelGraphNode('${esc(edge.to)}')"><span>${esc(to?.type)}</span><strong>${esc(to?.label)}</strong></button>
        </div>
        <dl class="sg-detail-list"><dt>Data source</dt><dd>${esc(evidence.source)}</dd><dt>Observed</dt><dd>${esc(evidence.time)}</dd><dt>Confidence</dt><dd>${esc(evidence.confidence)}</dd></dl>
        <div class="sg-response-note"><strong>How to interpret this</strong><span>${esc(evidence.detail)}</span></div>
        ${edge.kind === 'blast' ? '<div class="callout warn">A reachable path describes exposure. Validate activity evidence before classifying it as attacker movement.</div>' : ''}
      </div>
      <div class="sg-detail-actions"><button class="btn btn-primary btn-sm" onclick="selectSentinelGraphNode('${esc(edge.to)}')">Inspect destination</button><button class="btn btn-secondary btn-sm" onclick="showSentinelGraphBlastRadius()">View full blast radius</button></div>
    </aside>`;
}

function renderSentinelGraphBlastList() {
  const blast = BLAST_RADIUS_PATHS[SENTINEL_GRAPH.incidentId];
  return `
    <aside class="sg-detail-drawer sg-blast-drawer" aria-label="Blast radius details">
      <div class="sg-detail-head"><div class="sg-detail-icon critical">BR</div><div><span>Blast radius analysis</span><strong>${blast.paths.length} prioritized paths</strong></div><button class="iconbtn" onclick="closeSentinelGraphDetails()">✕</button></div>
      <div class="sg-detail-body">
        <p class="sg-detail-summary">Potential paths from <strong>${esc(blast.source)}</strong> to high-impact data and administrative assets. These paths show exposure, not confirmed movement.</p>
        <div class="sg-blast-list">
          ${blast.paths.map((path,index) => {
            const targetId = sentinelGraphPathTargetId(path.target);
            return `<button onclick="${targetId ? `selectSentinelGraphNode('${targetId}')` : `toast('Path opened: ${esc(path.target)}')`}">
              <span class="sg-blast-rank">${index + 1}</span><span><strong>${esc(path.target)}</strong><small>${path.hops} hops · ${esc(path.reach)}</small></span>${path.critical ? '<em>Critical</em>' : ''}
            </button>`;
          }).join('')}
        </div>
        <div class="sg-response-note"><strong>Analyst objective</strong><span>Prioritize containment around confirmed activity while protecting the highest-impact reachable assets.</span></div>
      </div>
      <div class="sg-detail-actions"><button class="btn btn-primary btn-sm" onclick="selectSentinelGraphNode('app-docviewer')">Return to malicious app</button><button class="btn btn-secondary btn-sm" onclick="navigate('#/defender/hunting-graph')">Open Hunting graph</button></div>
    </aside>`;
}

function renderSentinelGraphLearning(state) {
  return `
    <div class="sg-learning-strip">
      <div class="sg-learning-title"><span>Guided investigation</span><strong>${state.completedTasks.length}/${SENTINEL_GRAPH.learningTasks.length} complete</strong></div>
      <ol>${SENTINEL_GRAPH.learningTasks.map((task,index) => {
        const done = state.completedTasks.includes(task.id);
        return `<li class="${done ? 'done' : ''}" title="${esc(task.hint)}"><span>${done ? '✓' : index + 1}</span><strong>${esc(task.title)}</strong></li>`;
      }).join('')}</ol>
      <button class="btn btn-ghost btn-sm" onclick="resetSentinelGraphLearning()">Reset exercise</button>
    </div>`;
}

VIEWS['sentinel/graph'] = () => {
  const inc = INCIDENTS.find(i => i.id === SENTINEL_GRAPH.incidentId) || INCIDENTS[0];
  const state = currentSentinelGraphState();
  const story = ATTACK_STORIES[SENTINEL_GRAPH.incidentId];
  const incAlerts = SEED_ALERTS.filter(alert => inc.alertIds.includes(alert.id));
  const { nodes, edges, groupedCounts } = sentinelGraphVisibleData(state);
  const layout = sentinelGraphLayout(nodes, state);
  const selectedNode = SENTINEL_GRAPH.nodes.find(node => node.id === state.selectedNodeId);
  const selectedEdge = SENTINEL_GRAPH.edges.find(edge => `${edge.from}|${edge.to}` === state.selectedEdgeKey);
  const relatedToSelection = new Set(selectedNode ? SENTINEL_GRAPH.edges.filter(edge => edge.from === selectedNode.id || edge.to === selectedNode.id).flatMap(edge => [edge.from, edge.to]) : []);
  const visibleIds = new Set(state.visibleNodeIds);
  const hiddenCount = SENTINEL_GRAPH.nodes.length - visibleIds.size;
  const routes = edges.map(edge => {
    const from = layout[edge.from];
    const to = layout[edge.to];
    return { edge, from, to, x:(from.x + to.x) / 2, y:(from.y + to.y) / 2 };
  });
  const drawer = state.showBlastList ? renderSentinelGraphBlastList()
    : selectedNode ? renderSentinelGraphNodeDetails(selectedNode, state)
    : selectedEdge ? renderSentinelGraphEdgeDetails(selectedEdge)
    : '';
  return {
    html:`
      <div class="sg-page-header">
        <div class="breadcrumb">Sentinel › Incidents › ${esc(inc.id)} › <strong>Incident graph</strong></div>
        <div class="sg-incident-title-row">
          <div><h1>${esc(inc.id)}: ${esc(inc.title)}</h1><div class="sg-incident-meta"><span class="sev high">High</span><span class="status-dot active"></span>Active<span>👤 ${esc(inc.assignedTo)}</span><span>◈ Unclassified</span><span>Updated 08:34 UTC</span><span class="tag red">OAuth abuse</span><span class="tag orange">Critical data</span></div></div>
          <div class="page-actions"><button class="btn btn-secondary" onclick="openIncident('${esc(inc.id)}')">Incident preview</button><button class="btn btn-primary" onclick="openIncidentPage('${esc(inc.id)}')">Open full incident</button></div>
        </div>
      </div>
      <div class="sg-data-banner"><span>✓</span><div><strong>Sentinel data lake and graph connected</strong><small>Relationship context is derived from fictional Defender, Entra, 365, and threat-intelligence fixtures.</small></div><button class="btn btn-ghost btn-sm" onclick="toast('Graph provisioning is healthy in this local lab.')">View status</button></div>
      <div class="sg-tabs"><button class="active">Attack story</button><button onclick="openIncidentPage('${esc(inc.id)}')">Alerts (${incAlerts.length})</button><button onclick="openIncidentPage('${esc(inc.id)}')">Evidence and response (${INCIDENT_EVIDENCE[inc.id]?.length || 0})</button><button onclick="openIncidentPage('${esc(inc.id)}')">Entities (${SENTINEL_GRAPH.nodes.length})</button><button onclick="openIncidentPage('${esc(inc.id)}')">Summary</button></div>
      ${renderSentinelGraphLearning(state)}
      <section class="sg-experience card">
        <aside class="sg-alert-rail">
          <div class="sg-rail-head"><strong>Detection &amp; categories</strong><button class="iconbtn" title="Collapse detection pane" onclick="this.closest('.sg-alert-rail').classList.toggle('collapsed')">‹</button></div>
          <div class="sg-rail-stats"><div><strong>${incAlerts.length}</strong><span>Active alerts</span></div><div><strong>${inc.tactics.length}</strong><span>Categories</span></div><div><strong>08:11</strong><span>First activity</span></div><div><strong>08:24</strong><span>Last activity</span></div></div>
          <div class="sg-rail-section">Alert story</div>
          <div class="sg-alert-list">
            ${story.steps.map((step,index) => {
              const alert = incAlerts.find(item => item.id === step.alertId);
              return `<button class="${state.selectedNodeId === step.node ? 'active' : ''}" onclick="selectSentinelGraphNode('${esc(step.node)}')"><span class="sg-alert-dot ${esc(alert?.severity || 'medium')}"></span><span><time>${fmtTime(step.time)} · Active</time><strong>${esc(step.title)}</strong><small>${esc(step.alertId)} · ${esc(alert?.detectionSource || 'Graph')}</small></span><em onclick="event.stopPropagation(); openAlert('${esc(step.alertId)}')">⋯</em></button>`;
            }).join('')}
          </div>
          <div class="sg-rail-section">Investigation note</div>
          <p class="sg-rail-note">Observed activity uses solid red paths. Gold dashed paths are reachable blast-radius exposure and require validation.</p>
        </aside>
        <div class="sg-graph-panel">
          <div class="sg-graph-toolbar">
            <div class="sg-toolbar-left"><strong>Incident graph</strong><span>${nodes.length} shown · ${edges.length} relationships${hiddenCount ? ` · ${hiddenCount} undiscovered` : ''}</span></div>
            <div class="sg-toolbar-controls">
              <label class="sg-toggle"><input type="checkbox" ${state.grouped ? 'checked' : ''} onchange="toggleSentinelGraphGrouping()"><span></span>Group similar entities</label>
              <label>Layout <select onchange="setSentinelGraphLayout(this.value)"><option value="relationship" ${state.layout === 'relationship' ? 'selected' : ''}>Relationship</option><option value="risk" ${state.layout === 'risk' ? 'selected' : ''}>Risk lanes</option></select></label>
              <label>Filter <select onchange="setSentinelGraphFilter(this.value)"><option value="all" ${state.filter === 'all' ? 'selected' : ''}>All entities</option><option value="identity" ${state.filter === 'identity' ? 'selected' : ''}>Identities</option><option value="apps" ${state.filter === 'apps' ? 'selected' : ''}>Apps &amp; permissions</option><option value="content" ${state.filter === 'content' ? 'selected' : ''}>Mail &amp; content</option><option value="threat" ${state.filter === 'threat' ? 'selected' : ''}>Threat indicators</option></select></label>
              <button class="btn btn-link btn-sm" onclick="showSentinelGraphBlastRadius()">View full blast radius list (${BLAST_RADIUS_PATHS[inc.id].paths.length} paths)</button>
            </div>
          </div>
          <div class="sg-graph-viewport" data-sentinel-graph-viewport>
            <div class="sg-graph-world" data-sentinel-graph-world>
              ${state.layout === 'risk' ? '<div class="sg-risk-lane lane-observed"><span>Observed attack</span></div><div class="sg-risk-lane lane-critical"><span>Critical exposure</span></div><div class="sg-risk-lane lane-possible"><span>Potential paths</span></div>' : ''}
              <svg class="sg-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                ${routes.map(({edge,from,to}) => {
                  const selected = state.selectedEdgeKey === `${edge.from}|${edge.to}`;
                  const dimmed = selectedNode && edge.from !== selectedNode.id && edge.to !== selectedNode.id;
                  return `<line class="${esc(edge.kind || 'related')} ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
                }).join('')}
              </svg>
              ${routes.map(({edge,x,y}) => `<button class="sg-edge-label ${esc(edge.kind || 'related')} ${state.selectedEdgeKey === `${edge.from}|${edge.to}` ? 'selected' : ''}" style="left:${x}%;top:${y}%;" onclick="selectSentinelGraphEdge('${esc(edge.from)}|${esc(edge.to)}')" title="Inspect relationship evidence">${esc(edge.label)}</button>`).join('')}
              ${nodes.map(node => {
                const point = layout[node.id];
                const meta = SENTINEL_GRAPH.nodeMeta[node.id] || {};
                const hiddenNeighbors = SENTINEL_GRAPH.edges.filter(edge => edge.from === node.id || edge.to === node.id).map(edge => edge.from === node.id ? edge.to : edge.from).filter(id => !visibleIds.has(id)).length;
                const group = meta.group;
                const grouped = state.grouped && group ? groupedCounts[group] || 1 : 1;
                const selected = state.selectedNodeId === node.id;
                const dimmed = selectedNode && !relatedToSelection.has(node.id);
                return `<div class="sg-node-shell ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}" style="left:${point.x}%;top:${point.y}%;">
                  <button class="sg-node risk-${esc(meta.risk || 'medium')} ring-${esc(node.ring || 0)} ${SENTINEL_GRAPH.criticalNodeIds.includes(node.id) ? 'critical' : ''}" onclick="selectSentinelGraphNode('${esc(node.id)}')" title="${esc(node.type)}: ${esc(node.label)}">
                    <span class="sg-node-icon">${esc(sentinelGraphInitials(node.type))}</span><strong>${esc(grouped > 1 ? `${node.label} (+${grouped - 1})` : node.label)}</strong><small>${esc(node.type)}</small>
                  </button>
                  ${hiddenNeighbors ? `<button class="sg-node-expand" onclick="event.stopPropagation(); expandSentinelGraphNode('${esc(node.id)}')" title="Explore ${hiddenNeighbors} connected assets">+${hiddenNeighbors}</button>` : ''}
                  ${SENTINEL_GRAPH.criticalNodeIds.includes(node.id) ? '<span class="sg-critical-badge" title="Critical asset">♛</span>' : ''}
                </div>`;
              }).join('')}
            </div>
            <div class="sg-legend"><span><i class="observed"></i>Observed attack</span><span><i class="blast"></i>Reachable path</span><span><i class="critical"></i>Critical asset</span></div>
            <div class="sg-zoom"><button onclick="sentinelGraphZoom(-0.1)" aria-label="Zoom out">−</button><span data-sentinel-zoom-label>Fit</span><button onclick="sentinelGraphZoom(0.1)" aria-label="Zoom in">＋</button><button onclick="fitSentinelGraph()" title="Fit graph">⌗</button></div>
            ${drawer}
          </div>
        </div>
      </section>
    `,
    onMount:() => wireSentinelGraphCanvas(),
  };
};

VIEWS['sentinel/analytics'] = () => {
  const ws = currentWorkspace();
  const idxs = ws.ruleIdx;
  const createdRules = (typeof readCreatedAnalyticsRules === 'function' ? readCreatedAnalyticsRules() : [])
    .filter(r => r.workspaceId === ws.id);
  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Configuration › <strong>Analytics</strong></div>
      <h1>Analytics rules</h1>
    </div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openAnalyticsWizard()">+ Create analytics rule</button></div>
  </div>

  <div class="callout info" style="margin-bottom:14px;">
    <strong>Access path (per Product documentation):</strong>
    <span class="muted">Defender portal</span> → Sentinel → Configuration → <strong>Analytics</strong>,
    or <span class="muted">Azure portal</span> → Sentinel → select workspace → <strong>Analytics</strong>.
    Sentinel moves fully to the Defender portal after March 31, 2027.
  </div>

  <div class="workspace-bar">
    <span class="workspace-label">Workspace</span>
    <select class="ipt workspace-select" onchange="setWorkspace(this.value)">
      ${SENTINEL_WORKSPACES.map(w => `
        <option value="${w.id}" ${w.id===ws.id?'selected':''}>${esc(w.name)} · ${esc(w.region)} · ${esc(w.tier)}</option>`).join('')}
    </select>
  </div>

  <div class="card">
    <div class="card-toolbar"><strong>${idxs.length + createdRules.length}</strong> rules · <span class="muted">workspace: ${esc(ws.name)}</span></div>
    <table class="grid">
      <thead><tr><th>Status</th><th>Severity</th><th>Name</th><th>Rule type</th><th>Tactics</th><th>Frequency</th></tr></thead>
      <tbody>
        ${idxs.map(i => {
          const r = SENTINEL_RULES[i];
          return `
          <tr onclick="openSentinelRule(${i})">
            <td><span class="status-dot ${r.enabled?'resolved':''}"></span>${r.enabled?'Enabled':'Disabled'}</td>
            <td><span class="sev ${r.severity}">${cap(r.severity)}</span></td>
            <td><strong>${esc(r.name)}</strong></td>
            <td><span class="tag">${esc(r.type || 'Scheduled')}</span></td>
            <td>${r.tactics.map(t=>`<span class="mitre">${esc(t)}</span>`).join('')}</td>
            <td>${esc(r.frequency)}</td>
          </tr>`;
        }).join('')}
        ${createdRules.map(r => `
          <tr class="active-row">
            <td><span class="status-dot ${r.enabled?'resolved':''}"></span>${r.enabled?'Enabled':'Disabled'}</td>
            <td><span class="sev ${esc(r.severity)}">${cap(r.severity)}</span></td>
            <td><strong>${esc(r.name)}</strong> <span class="tag">Created</span></td>
            <td><span class="tag">${esc(r.type || 'Scheduled')}</span></td>
            <td>${(r.tactics||[]).map(t=>`<span class="mitre">${esc(t)}</span>`).join('')}</td>
            <td>${esc(r.frequency)} <button class="chip-link" onclick="event.stopPropagation(); deleteAnalyticsRule('${esc(r.id)}')">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div id="rule-preview"></div>
  `;
};

VIEWS['sentinel/anomalies'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Threat management › <strong>Anomalies</strong></div>
      <h1>Sentinel anomalies</h1>
      <div class="page-subtitle">Customize anomaly rules, decide when they create incidents, and use anomaly rows as hunting pivots.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/hunting">Open hunting</a>
      <a class="btn btn-primary" href="#/sentinel/analytics">Analytics rules</a>
    </div>
  </div>

  <div class="callout info" style="margin-bottom:14px;">
    <strong>Detection engineering cue:</strong>
    <span>Anomalies are not just dashboards. Use them as hunting leads, incident enrichment, or inputs to analytics/Fusion logic after tuning thresholds and exclusions.</span>
  </div>

  <div class="three-col">
    <div class="kpi"><span class="kpi-label">Enabled anomaly rules</span><span class="kpi-value">${SENTINEL_ANOMALY_RULES.filter(r=>r.status==='Enabled').length}</span><span class="kpi-delta">1 high-confidence incident path</span></div>
    <div class="kpi"><span class="kpi-label">In Flighting mode</span><span class="kpi-value">${SENTINEL_ANOMALY_RULES.filter(r=>r.mode==='Flighting').length}</span><span class="kpi-delta">Tuned copies under test — no production incidents</span></div>
    <div class="kpi"><span class="kpi-label">Hunting rows today</span><span class="kpi-value">${SENTINEL_ANOMALY_HUNTING_ROWS.length}</span><span class="kpi-delta">Scores above tuned thresholds</span></div>
  </div>

  ${(() => {
    const dups = (typeof readAnomalyDuplicates === 'function') ? readAnomalyDuplicates() : [];
    const dupOf = name => dups.find(d => d.source === name);
    return `
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Anomaly rule templates</strong>
      <span class="muted">Built-in ML rules — select one and choose <em>Create duplicate</em> to customize</span>
    </div>
    <div class="anomaly-rule-grid">
      ${SENTINEL_ANOMALY_RULES.map((rule, i) => {
        const dup = dupOf(rule.name);
        return `
        <div class="anomaly-rule-card">
          <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
            <strong>${esc(rule.name)}</strong>
            <span><span class="status-dot ${rule.status==='Enabled'?'resolved':''}"></span>${esc(rule.status)}</span>
          </div>
          <div>
            <span class="mode-badge ${rule.mode==='Flighting'?'flighting':'production'}">${esc(rule.mode)}</span>
            <span class="sev ${rule.severity}">${cap(rule.severity)}</span>
            <span class="tag">${esc(rule.source)}</span>
          </div>
          <div class="alert-section-title">Threshold</div>
          <p class="muted">${esc(rule.threshold)}</p>
          <div class="alert-section-title">Tactics</div>
          <div>${rule.tactics.map(t => `<span class="mitre">${esc(t)}</span>`).join('')}</div>
          <div class="alert-section-title">Feeds hunting and detections</div>
          <p class="muted">${esc(rule.feeds)}</p>
          <div class="anomaly-card-actions">
            ${dup
              ? `<button class="btn btn-secondary btn-sm" disabled title="Only one customized copy per anomaly rule is allowed — edit the existing copy below">Customized copy exists</button>`
              : `<button class="btn btn-primary btn-sm" onclick="duplicateAnomalyRule(${i})">Create duplicate</button>`}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Customized copies</strong>
      <span class="muted">${dups.length} of ${SENTINEL_ANOMALY_RULES.length} rules duplicated · edit the copy to tune, promote to go live</span>
    </div>
    ${dups.length ? `
    <table class="grid">
      <thead><tr><th>Source rule</th><th>Mode</th><th>Threshold</th><th>Actions</th></tr></thead>
      <tbody>
        ${dups.map(d => `
          <tr>
            <td><strong>${esc(d.source)}</strong></td>
            <td><span class="mode-badge ${d.mode==='Flighting'?'flighting':'production'}">${esc(d.mode)}</span></td>
            <td>${esc(d.threshold)}</td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="editAnomalyThreshold('${esc(d.id)}')">Edit threshold</button>
              ${d.mode==='Flighting' ? `<button class="btn btn-ghost btn-sm" onclick="promoteAnomalyRule('${esc(d.id)}')">Promote to Production</button>` : ''}
              <button class="chip-link" onclick="deleteAnomalyDuplicate('${esc(d.id)}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : `
    <div class="card-body muted">No customized copies yet. Select a template above and choose <strong>Create duplicate</strong> — the copy is created in Flighting mode so you can tune its threshold and compare against the built-in Production rule before promoting it.</div>`}
  </div>`;
  })()}

  <div class="two-col" style="margin-top:16px;">
    <div class="card">
      <div class="card-toolbar"><strong>Anomaly hunting feed</strong><span class="muted">Example rows analysts pivot from</span></div>
      <table class="grid">
        <thead><tr><th>Time</th><th>Rule</th><th>Entity</th><th>Score</th><th>Related table</th><th>Action</th></tr></thead>
        <tbody>
          ${SENTINEL_ANOMALY_HUNTING_ROWS.map(row => `
            <tr>
              <td>${fmtTime(row.TimeGenerated)}</td>
              <td><strong>${esc(row.AnomalyRule)}</strong></td>
              <td>${esc(row.Entity)}</td>
              <td>${esc(row.Score)}</td>
              <td><code>${esc(row.RelatedTable)}</code></td>
              <td>${esc(row.Action)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Operational pattern</div>
      <ol class="study-steps">
        <li>Start with anomalies in hunting mode so analysts can review score quality.</li>
        <li>Tune thresholds, scopes, and known-good exclusions until the row volume is useful.</li>
        <li>Promote high-confidence combinations to analytics rules or Fusion-driven incidents.</li>
        <li>Keep lower-confidence anomalies as entity enrichment and graph pivots.</li>
      </ol>
      <div class="alert-section-title">KQL pivot</div>
      <textarea class="kql" readonly>${esc(`BehaviorAnalytics
| where ActivityType has "Anomaly"
| where Score >= 0.8
| project TimeGenerated, UserPrincipalName, DevicesInsights, SourceIPAddress, Score`)}</textarea>
    </div>
  </div>
`;

function renderSyslogAmaProgress(state) {
  const completed = {
    solution: state.solutionInstalled,
    connector: state.connectorOpened,
    dcr: state.dcrCreated,
    daemon: state.daemonConfigured,
    verify: state.verified,
  };
  return `
    <div class="syslog-progress">
      ${SYSLOG_AMA_LAB.steps.map((step, idx) => `
        <div class="syslog-step ${completed[step.id] ? 'complete' : ''}">
          <div class="syslog-step-index">${idx + 1}</div>
          <div>
            <strong>${esc(step.title)}</strong>
            <span>${esc(step.detail)}</span>
            ${step.correctFirst ? '<small>Correct first action for the practice question.</small>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSyslogAmaExamCard(state) {
  const canCreateDcr = state.solutionInstalled && state.connectorOpened;
  const canConfigureDaemon = state.dcrCreated;
  const canVerify = state.daemonConfigured;
  return `
    <div class="card syslog-lab-card">
      <div class="card-toolbar">
        <strong>Practice lab: Syslog via AMA first step</strong>
        <button class="btn btn-ghost btn-sm" onclick="resetSyslogAmaLab()">Reset</button>
      </div>
      <div class="syslog-lab-body">
        <section>
          <div class="alert-section-title">Scenario</div>
          <p class="muted">${esc(SYSLOG_AMA_LAB.examPrompt)}</p>
          <div class="connector-list">
            <div><strong>Workspace</strong><span>${esc(SYSLOG_AMA_LAB.workspace)}</span></div>
            <div><strong>Forwarder</strong><span>${esc(SYSLOG_AMA_LAB.vm)} · ${esc(SYSLOG_AMA_LAB.os)} · receives appliance Syslog</span></div>
            <div><strong>Target table</strong><span>Syslog</span></div>
          </div>
        </section>
        <section>
          <div class="alert-section-title">Do this in order</div>
          <div class="syslog-action-stack">
            <button class="btn btn-primary" onclick="installSentinelSolution('syslog')">Install Syslog solution from Content hub</button>
            <button class="btn btn-secondary" ${state.solutionInstalled ? '' : 'disabled'} onclick="openSyslogAmaConnector()">Open Syslog via AMA connector</button>
            <button class="btn btn-secondary" ${canCreateDcr ? '' : 'disabled'} onclick="createSyslogAmaDcr()">Create DCR and select VM1</button>
            <button class="btn btn-secondary" ${canConfigureDaemon ? '' : 'disabled'} onclick="configureSyslogDaemon()">Configure rsyslog on VM1</button>
            <button class="btn btn-secondary" ${canVerify ? '' : 'disabled'} onclick="verifySyslogIngestion()">Verify Syslog table</button>
          </div>
        </section>
      </div>
      ${renderSyslogAmaProgress(state)}
    </div>

    <div class="two-col" style="margin-top:16px;">
      <div class="card card-body">
        <div class="alert-section-title">Why the first step matters</div>
        <p class="muted">The connector is delivered by the Syslog solution. Until that solution is installed from Content hub, the correct Sentinel connector workflow is not available.</p>
        <p class="muted">After that, use the connector page to create the DCR. Selecting ${esc(SYSLOG_AMA_LAB.vm)} there deploys Azure Monitor Agent automatically.</p>
        ${state.verified ? `
          <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
            <strong>Verification query</strong>
            <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('syslog-ama-query')">Copy</button>
          </div>
          <textarea id="syslog-ama-query" class="kql" readonly>${esc(SYSLOG_AMA_LAB.query)}</textarea>
        ` : ''}
      </div>
      <div class="card card-body">
        <div class="alert-section-title">Exam distractors</div>
        <div class="connector-list">
          ${SYSLOG_AMA_LAB.distractors.map(d => `
            <div><strong>${esc(d.title)}</strong><span>${esc(d.why)}</span></div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function ingestionStepComplete(state, stepId) {
  return {
    solution: state.solutionInstalled,
    connector: state.connectorOpened,
    dcr: state.dcrCreated,
    scope: state.scoped,
    daemon: state.daemonConfigured,
    policy: state.policyConfigured,
    diagnostic: state.diagnosticConfigured,
    app: state.appRegistered,
    role: state.roleAssigned,
    endpoint: state.endpointChosen,
    stream: state.streamDeclared,
    table: state.tableCreated,
    verify: state.verified,
  }[stepId];
}

function ingestionStepButton(lab, step) {
  const id = esc(lab.id);
  const label = esc(step.title);
  if (step.id === 'solution') {
    return `<button class="btn btn-secondary" onclick="installSentinelIngestionSolution('${id}')">${label}</button>`;
  }
  if (step.id === 'connector') {
    return `<button class="btn btn-secondary" onclick="openSentinelIngestionConnector('${id}')">${label}</button>`;
  }
  return `<button class="btn btn-secondary" onclick="advanceSentinelIngestionLab('${id}','${esc(step.id)}')">${label}</button>`;
}

function renderSentinelIngestionLabCard(lab) {
  const state = currentSentinelIngestionState(lab.id);
  return `
    <div class="card syslog-lab-card">
      <div class="card-toolbar">
        <strong>${esc(lab.title)}</strong>
        <button class="btn btn-ghost btn-sm" onclick="resetSentinelIngestionLab('${esc(lab.id)}')">Reset</button>
      </div>
      <div class="syslog-lab-body">
        <section>
          <div class="alert-section-title">Scenario</div>
          <p class="muted">${esc(lab.prompt)}</p>
          <div class="connector-list">
            <div><strong>Workspace</strong><span>${esc(lab.workspace)}</span></div>
            <div><strong>Target</strong><span>${esc(lab.target)}</span></div>
            <div><strong>Connector</strong><span>${esc(lab.connector)}</span></div>
            <div><strong>Target table</strong><span>${esc(lab.table)}</span></div>
          </div>
        </section>
        <section>
          <div class="alert-section-title">Do this in order</div>
          <div class="syslog-action-stack">
            ${lab.steps.map(step => ingestionStepButton(lab, step)).join('')}
          </div>
        </section>
      </div>
      <div class="syslog-progress">
        ${lab.steps.map((step, idx) => `
          <div class="syslog-step ${ingestionStepComplete(state, step.id) ? 'complete' : ''}">
            <div class="syslog-step-index">${idx + 1}</div>
            <div>
              <strong>${esc(step.title)}</strong>
              <span>${esc(step.detail)}</span>
            </div>
          </div>
        `).join('')}
      </div>
      ${state.verified ? `
        <div class="card-body" style="border-top:1px solid var(--border);">
          <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
            <strong>Verification query</strong>
            <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('ingestion-query-${esc(lab.id)}')">Copy</button>
          </div>
          <textarea id="ingestion-query-${esc(lab.id)}" class="kql" readonly>${esc(lab.query)}</textarea>
        </div>
      ` : ''}
    </div>
  `;
}

function renderWefPlanningCard() {
  return `
    <div class="card card-body">
      <div class="alert-section-title">${esc(WEF_PLANNING_CARD.title)}</div>
      <div class="two-col">
        <div>
          <strong>Use WEF when</strong>
          <p class="muted">${esc(WEF_PLANNING_CARD.useWef)}</p>
        </div>
        <div>
          <strong>Use AMA when</strong>
          <p class="muted">${esc(WEF_PLANNING_CARD.useAma)}</p>
        </div>
      </div>
      <div class="callout info" style="margin:10px 0;">
        <strong>Exam cue:</strong> ${esc(WEF_PLANNING_CARD.examCue)}
      </div>
      <div class="connector-list">
        ${WEF_PLANNING_CARD.checklist.map(item => `<div><strong>Decision point</strong><span>${esc(item)}</span></div>`).join('')}
      </div>
    </div>
  `;
}

VIEWS['sentinel/content-hub'] = () => {
  const state = currentSyslogAmaState();
  const solutions = SENTINEL_CONTENT_SOLUTIONS.map(s => {
    const labState = currentSentinelIngestionState(s.id);
    if (s.id === 'syslog' && state.solutionInstalled) return { ...s, status:'Installed' };
    if (labState.solutionInstalled) return { ...s, status:'Installed' };
    return s;
  });
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Content management › <strong>Content hub</strong></div>
        <h1>Content hub</h1>
        <div class="page-subtitle">Install Sentinel solution packages before configuring solution-backed connectors.</div>
      </div>
      <div class="page-actions">
        <a class="btn btn-secondary" href="#/sentinel/data-connectors">Data connectors</a>
      </div>
    </div>

    <div class="callout info" style="margin-bottom:14px;">
      <strong>Syslog via AMA sequence:</strong>
      install the <strong>Syslog</strong> solution here first, then open Data connectors and create the DCR from the Syslog via AMA connector page.
    </div>
    <div class="callout info" style="margin-bottom:14px;">
      <strong>DCR family:</strong>
      Windows Security Events, CEF, Azure Activity, and custom Logs Ingestion API labs are built as local-only practice flows below. No real Azure or Graph calls are made.
    </div>

    <div class="solution-grid sentinel-content-grid">
      ${solutions.map(s => `
        <button class="solution-card" onclick="${
          s.id === 'syslog' ? "installSentinelSolution('syslog')" :
          SENTINEL_INGESTION_LABS.some(l => l.solutionId === s.id) ? `installSentinelIngestionSolution('${esc(s.id)}')` :
          "toast('Solution opened in lab stub.')"
        }">
          <strong>${esc(s.name)}</strong>
          <span>${esc(s.provider)} · ${esc(s.status)}</span>
          <span>${esc(s.use)}</span>
          <span class="kv">${esc(s.connectors.join(', '))}</span>
        </button>
      `).join('')}
    </div>

    ${renderSyslogAmaExamCard(state)}
    <div style="display:grid; gap:16px; margin-top:16px;">
      ${SENTINEL_INGESTION_LABS
        .filter(l => ['windows-security','cef'].includes(l.id))
        .map(renderSentinelIngestionLabCard).join('')}
    </div>
  `;
};

VIEWS['sentinel/data-connectors'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Configuration › <strong>Data connectors</strong></div>
      <h1>Data connectors</h1>
      <div class="page-subtitle">Use connectors for events and threat indicators. Solution-backed connectors may require Content hub installation first.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/content-hub">Content hub</a>
    </div>
  </div>
  <div class="callout warn" style="margin-bottom:14px;">
    <strong>No MITRE connector:</strong>
    Sentinel MITRE coverage lights up from active scheduled or NRT analytics rules and their assigned tactics or techniques.
  </div>
  ${renderSyslogAmaExamCard(currentSyslogAmaState())}
  <div style="display:grid; gap:16px; margin-bottom:16px;">
    ${SENTINEL_INGESTION_LABS.map(renderSentinelIngestionLabCard).join('')}
    ${renderWefPlanningCard()}
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>${SENTINEL_DATA_CONNECTORS.length}</strong> connectors and views</div>
    <table class="grid">
      <thead><tr><th>Status</th><th>Name</th><th>Type</th><th>Table or source</th><th>Lab use</th></tr></thead>
      <tbody>
        ${SENTINEL_DATA_CONNECTORS.map(c => {
          const syslogState = currentSyslogAmaState();
          const lab = SENTINEL_INGESTION_LABS.find(l => l.connector === c.name);
          const labState = lab ? currentSentinelIngestionState(lab.id) : null;
          const status = c.name === 'Syslog via AMA' && syslogState.solutionInstalled
            ? (syslogState.dcrCreated ? 'Connected' : 'Available')
            : labState && labState.solutionInstalled
              ? (labState.verified ? 'Connected' : 'Available')
            : c.status;
          const statusClass = status === 'Connected' ? 'resolved' : status === 'Not a connector' ? 'warn' : '';
          return `
            <tr>
              <td><span class="status-dot ${statusClass}"></span>${esc(status)}</td>
              <td><strong>${esc(c.name)}</strong></td>
              <td>${esc(c.type)}</td>
              <td class="kv">${esc(c.table)}</td>
              <td>${esc(c.use)}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
`;

VIEWS['sentinel/threat-intel'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Threat management › <strong>Threat intelligence</strong></div>
      <h1>Threat intelligence</h1>
      <div class="page-subtitle">Import indicators, verify ThreatIntelIndicators, then map IOCs to events with analytics rules.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/data-connectors">Data connectors</a>
      <a class="btn btn-primary" href="#/sentinel/analytics">Analytics rules</a>
    </div>
  </div>

  <div class="two-col">
    <div class="card card-body">
      <div class="alert-section-title">Import options</div>
      <div class="connector-list">
        <div><strong>Defender Threat Intelligence</strong><span>Best when available in the tenant. Imports vendor-generated IOCs.</span></div>
        <div><strong>Threat Intelligence - TAXII</strong><span>Use when you have a TAXII API root and collection ID.</span></div>
        <div><strong>Manual CSV/JSON import</strong><span>Best for this local lab. Use harmless demo values.</span></div>
      </div>
    </div>
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>Manual import CSV</strong>
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('ti-import-csv')">Copy</button>
      </div>
      <textarea id="ti-import-csv" class="kql" readonly>${esc(TI_IMPORT_CSV)}</textarea>
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>ThreatIntelIndicators</strong><span class="muted">Demo rows imported in the lab</span></div>
    <table class="grid">
      <thead><tr><th>Generated</th><th>ObservableKey</th><th>ObservableValue</th><th>Confidence</th><th>Tags</th><th>Source</th><th>Valid until</th></tr></thead>
      <tbody>
        ${THREAT_INTEL_INDICATORS.map(i => `
          <tr>
            <td>${fmtTime(i.TimeGenerated)}</td>
            <td class="kv">${esc(i.ObservableKey)}</td>
            <td class="kv">${esc(i.ObservableValue)}</td>
            <td>${i.Confidence}</td>
            <td>${i.Tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</td>
            <td>${esc(i.SourceSystem)}</td>
            <td>${i.ValidUntil ? fmtTime(i.ValidUntil) : '<span class="muted">Open ended</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="card card-body" style="margin-top:16px;">
    <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
      <strong>KQL check</strong>
      <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('ti-check-kql')">Copy</button>
    </div>
    <textarea id="ti-check-kql" class="kql" readonly>ThreatIntelIndicators
| where TimeGenerated > ago(24h)
| project TimeGenerated, ObservableKey, ObservableValue, Confidence, Tags, SourceSystem, ValidUntil</textarea>
  </div>
`;

VIEWS['sentinel/mitre'] = () => {
  // Index rule coverage by tactic name and technique id.
  const tacticCoverage = {};   // { tacticName: [rule, ...] }
  const techCoverage   = {};   // { techniqueId: [rule, ...] }
  SENTINEL_RULES.forEach(rule => {
    (rule.tactics || []).forEach(t => {
      if (!rule.enabled) return;
      (tacticCoverage[t] = tacticCoverage[t] || []).push(rule);
    });
    (rule.techniques || []).forEach(tid => {
      if (!rule.enabled) return;
      (techCoverage[tid] = techCoverage[tid] || []).push(rule);
    });
  });

  const coveredTacticCount = MITRE_ATTCK.filter(t => tacticCoverage[t.name]).length;
  const mappedTechCount = Object.keys(techCoverage).length;

  const rows = SENTINEL_RULES.flatMap(rule =>
    rule.tactics.map(tactic => ({ rule, tactic, techniques: rule.techniques || [] }))
  );

  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Threat management › <strong>MITRE ATT&CK</strong></div>
        <h1>MITRE ATT&CK coverage</h1>
        <div class="page-subtitle">Coverage reflects active analytics rules and their selected tactics or techniques.</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span class="legend-swatch" style="background:#0078d4;"></span><span class="muted" style="font-size:12px;">Technique covered</span>
        <span class="legend-swatch" style="background:#7fb5e6; margin-left:10px;"></span><span class="muted" style="font-size:12px;">Tactic only</span>
        <span class="legend-swatch" style="background:#1f2937; margin-left:10px;"></span><span class="muted" style="font-size:12px;">No coverage</span>
      </div>
    </div>
    <div class="callout info" style="margin-bottom:14px;">
      <strong>Coverage view:</strong>
      This page does not ingest ATT&CK data. Assign MITRE tactics and techniques on scheduled or NRT analytics rules to light up the matrix.
    </div>
    <div class="kpi-strip">
      <div class="kpi"><span class="kpi-label">Enabled mapped rules</span><span class="kpi-value">${SENTINEL_RULES.filter(r=>r.enabled && r.tactics.length).length}</span></div>
      <div class="kpi"><span class="kpi-label">Covered tactics</span><span class="kpi-value">${coveredTacticCount} / ${MITRE_ATTCK.length}</span></div>
      <div class="kpi"><span class="kpi-label">Mapped techniques</span><span class="kpi-value">${mappedTechCount}</span></div>
      <div class="kpi"><span class="kpi-label">IOC lab rule</span><span class="kpi-value">1</span></div>
    </div>

    <div class="card">
      <div class="card-toolbar">
        <strong>ATT&CK Enterprise matrix</strong>
        <span class="muted" style="font-size:12px;">Scroll horizontally · ${MITRE_ATTCK.length} tactics · ${MITRE_ATTCK.reduce((n,t)=>n+t.techniques.length,0)} techniques shown</span>
      </div>
      <div class="attck-scroll">
        <div class="attck-matrix" style="grid-template-columns: repeat(${MITRE_ATTCK.length}, 200px);">
          ${MITRE_ATTCK.map(tactic => {
            const cov = tacticCoverage[tactic.name] || [];
            const covClass = cov.length ? 'has-coverage' : '';
            return `
              <div class="attck-col">
                <div class="attck-tactic ${covClass}">
                  <div class="attck-tactic-name">${esc(tactic.name)}</div>
                  <div class="attck-tactic-meta">
                    <span class="muted" style="font-size:11px;">${tactic.id} · ${tactic.techniques.length} techniques</span>
                    ${cov.length ? `<span class="attck-count" title="${esc(cov.map(r=>r.name).join(', '))}">${cov.length}</span>` : ''}
                  </div>
                </div>
                ${tactic.techniques.map(tech => {
                  const rules = techCoverage[tech.id] || [];
                  const tacticHit = !rules.length && cov.length;
                  const cls = rules.length ? 'covered' : (tacticHit ? 'tactic-only' : '');
                  const title = rules.length
                    ? rules.map(r=>`Rule: ${r.name}`).join('\n')
                    : (tacticHit ? `Tactic-level coverage: ${cov.map(r=>r.name).join(', ')}` : 'No analytics rule maps to this technique.');
                  return `
                    <div class="attck-tech ${cls}" title="${esc(title)}">
                      <div class="attck-tech-id">${esc(tech.id)}</div>
                      <div class="attck-tech-name">${esc(tech.name)}</div>
                      ${rules.length ? `<div class="attck-tech-badge">${rules.length}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="card-toolbar"><strong>Coverage by rule</strong><a class="chip-link" href="#/sentinel/analytics">Edit analytics rules →</a></div>
      <table class="grid">
        <thead><tr><th>Tactic</th><th>Technique</th><th>Analytics rule</th><th>Status</th><th>Entity mapping</th></tr></thead>
        <tbody>
          ${rows.map(({ rule, tactic, techniques }) => `
            <tr>
              <td><span class="mitre">${esc(tactic)}</span></td>
              <td>${techniques.length ? techniques.map(t => `<span class="tag">${esc(t)}</span>`).join('') : '<span class="muted">Tactic only</span>'}</td>
              <td><strong>${esc(rule.name)}</strong></td>
              <td><span class="status-dot ${rule.enabled ? 'resolved' : ''}"></span>${rule.enabled ? 'Enabled' : 'Disabled'}</td>
              <td>${(rule.entities || []).map(e => `<span class="entity-chip">${esc(e)}</span>`).join('') || '<span class="muted">Configured in rule wizard</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

VIEWS['sentinel/logs'] = () => {
  const initialTask = KQL_PRACTICE_TASKS[0];
  const restoreJob = currentSentinelRestoreJob();
  const workspaceQuery = `workspace("${currentWorkspace().name}").SecurityEvent
| where EventID == 4625
| project TimeGenerated, Computer, EventID, Account, IpAddress`;
  const auxiliaryQuery = `ArchiveDns_CL
| where DnsQuery == "sync-a.bad-demo.example"
| project TimeGenerated, DnsQuery, QueryCount, UniqueHosts`;
  const prefilledQuery = sessionStorage.getItem('defender-lab.sentinel.logs.query') || auxiliaryQuery;
  const queryLoadedFromWorkspace = /^workspace\s*\(/i.test(prefilledQuery.trim());
  return {
    html: `
  <div class="page-header hunting-page-header">
    <div>
      <div class="breadcrumb">Sentinel › Hunting › <strong>Logs</strong></div>
      <h1>KQL practice workspace</h1>
      <div class="page-subtitle">Work through row-level KQL tasks against local fixtures. The runner supports union, join, summarize, parse, extract, parse_json, split, externaldata, and render.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/hunting">Open hunting</a>
      <a class="btn btn-secondary" href="#/sentinel/hunting/dns">Open ASIM DNS</a>
      <button class="btn btn-primary" onclick="runSentinelKqlPractice()">Run practice query</button>
    </div>
  </div>
  <div class="callout ${restoreJob.status === 'complete' ? 'success' : restoreJob.status === 'running' ? 'warn' : 'info'}" style="margin-bottom:14px;">
    <strong>Restore job ${restoreJob.status === 'idle' ? 'not started' : restoreJob.status}:</strong>
    ${restoreJob.status === 'complete'
      ? `${esc(restoreJob.resultTable)} is now queryable in this workspace.`
      : 'Run the restore job from Search to materialize the retained table into a reusable _RST dataset.'}
  </div>
  <div class="kpi-strip hunting-status-cards">
    <div class="kpi"><span class="kpi-label">Tasks</span><span class="kpi-value">${KQL_PRACTICE_TASKS.length}</span><span class="kpi-delta">Row-count checked</span></div>
    <div class="kpi"><span class="kpi-label">Union / join</span><span class="kpi-value">2</span><span class="kpi-delta">Cross-table drills</span></div>
    <div class="kpi"><span class="kpi-label">Transforms</span><span class="kpi-value">4</span><span class="kpi-delta">Parse, JSON, split, extract</span></div>
    <div class="kpi"><span class="kpi-label">Render ops</span><span class="kpi-value">3</span><span class="kpi-delta">timechart, barchart, piechart</span></div>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <section class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>Data lake and tier guidance</strong>
        <span class="muted">When to mirror, when to search, when to batch</span>
      </div>
      <div class="flowline vertical-flow">
        <div class="flow-step"><strong>Azure Data Explorer</strong><span>Mirror or export when the work needs broader historical analytics, notebooks, or cross-domain joins that do not have to stay in the incident queue.</span></div>
        <div class="flow-step"><strong>Basic tier</strong><span>Keep noisy telemetry cheap. Use search jobs when you need retained rows outside the 30-day interactive window.</span></div>
        <div class="flow-step"><strong>Auxiliary tier</strong><span>Query retained rows directly when the analyst needs lower-cost history without moving the data into a new table.</span></div>
      </div>
      <div class="callout warn" style="margin-top:12px;">Basic tables are intentionally limited for repeated long-lookback hunts. That is why the lab uses a search job for <code>NetworkLogs_CL</code> and keeps the auxiliary example below interactive.</div>
    </section>
    <section class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>Limited query example</strong>
        <span class="muted">${queryLoadedFromWorkspace ? 'Workspace() query loaded from Workspace manager' : 'Auxiliary table query'}</span>
      </div>
      <div class="callout ${queryLoadedFromWorkspace ? 'success' : 'info'}" id="sentinel-limited-status">
        ${queryLoadedFromWorkspace
          ? 'Loaded the workspace-qualified query from Workspace manager. It stays local but uses the same shape as a real Sentinel cross-workspace hunt.'
          : 'ArchiveDns_CL is an auxiliary table in this lab, so it stays interactive across retention and makes a good limited-query example.'}
      </div>
      <textarea id="sentinel-limited-query" class="kql hunting-kql">${esc(prefilledQuery)}</textarea>
      <div class="kql-toolbar">
        <button class="btn btn-primary btn-sm" onclick="runSentinelLimitedQuery()">Run query</button>
        <button class="btn btn-secondary btn-sm" onclick='loadSentinelLogsQuery(${JSON.stringify(workspaceQuery)})'>Load workspace() example</button>
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('sentinel-limited-query')">Copy</button>
      </div>
      <div class="hunting-results" id="sentinel-limited-results" style="margin-top:12px;">
        <div class="card-toolbar"><strong>Results</strong></div>
        <div class="card-body muted">Run the auxiliary query to review retained rows.</div>
      </div>
    </section>
  </div>
  <div class="hunting-workspace">
    <aside class="hunting-schema-sidebar" aria-label="Practice tasks">
      <div class="hunting-sidebar-header">
        <strong>Practice tasks</strong>
        <span>${KQL_PRACTICE_TASKS.length}</span>
      </div>
      <div class="hunting-saved-queries" id="kql-practice-task-list">
        ${KQL_PRACTICE_TASKS.map((task, index) => `
          <button class="saved-query-row${index === 0 ? ' active' : ''}" type="button" data-kql-task="${esc(task.id)}">
            <span>${esc(task.title)}</span>
            <small>${esc(task.concept)} · ${task.expectedRows} rows expected</small>
          </button>
        `).join('')}
      </div>
    </aside>

    <section class="hunting-query-results" aria-label="Practice query and results">
      <div class="hunting-query-editor">
        <div class="hunting-section-toolbar">
          <strong>Practice query</strong>
          <span class="muted">Choose a task, load its query, and validate the result count.</span>
        </div>
        <div class="callout info" id="kql-practice-check">Loaded task: <strong>${esc(initialTask.title)}</strong> · expected ${initialTask.expectedRows} rows.</div>
        <textarea id="sentinel-kql-query" class="kql hunting-kql">${esc(initialTask.query)}</textarea>
        <div class="kql-toolbar">
          <button class="btn btn-primary btn-sm" onclick="runSentinelKqlPractice()">Run query</button>
          <button class="btn btn-secondary btn-sm" onclick="loadSentinelKqlPractice('${esc(initialTask.id)}')">Load first task</button>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('sentinel-kql-query')">Copy</button>
        </div>
      </div>
      <div class="hunting-results" id="sentinel-kql-results">
        <div class="card-toolbar"><strong>Results</strong></div>
        <div class="card-body muted">Run a practice query to see row-level output.</div>
      </div>
    </section>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <div class="card">
      <div class="card-toolbar"><strong>Fixture preview</strong><span class="muted">Use these rows for the practice queries</span></div>
      <table class="grid compact-grid">
        <thead><tr><th>Time</th><th>Scenario</th><th>Message</th><th>Domain</th></tr></thead>
        <tbody>
          ${KQL_PRACTICE_ROWS.map(row => `
            <tr>
              <td>${fmtTime(row.TimeGenerated)}</td>
              <td>${esc(row.Scenario)}</td>
              <td class="kv">${esc(row.Message)}</td>
              <td class="kv">${esc(row.Domain)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-toolbar"><strong>Render samples</strong><span class="muted">Queries that should draw charts</span></div>
      <div class="tile-grid" style="padding:12px;">
        ${KQL_PRACTICE_TASKS.filter(task => task.query.toLowerCase().includes('render ')).map(task => `
          <button class="tile" type="button" data-kql-task="${esc(task.id)}">
            <strong>${esc(task.title)}</strong>
            <span>${esc(task.concept)} · ${task.expectedRows} rows</span>
          </button>
        `).join('')}
      </div>
      <div class="callout info" style="margin:0 12px 12px;">The chart output is original SVG, not portal markup copied from Cloud. It is deliberately simple so learners can read the shape of the result quickly.</div>
    </div>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>CSV fixture</strong>
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('kql-practice-csv')">Copy</button>
      </div>
      <textarea id="kql-practice-csv" class="kql" readonly>${esc(KQL_EXTERNALDATA_CSV)}</textarea>
      <div class="callout info" style="margin-top:10px;">The externaldata task reads the bundled local CSV fixture instead of calling a live endpoint.</div>
    </div>
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>IOC matching reference</strong>
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('ti-ip-query')">Copy IP query</button>
      </div>
      <textarea id="ti-ip-query" class="kql" readonly>${esc(TI_IP_MATCH_QUERY)}</textarea>
    </div>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Restored table preview</strong>
      <span class="muted">${restoreJob.status === 'complete' ? SENTINEL_RESTORE_JOB.results.length + ' rows' : 'Waiting for restore job'}</span>
    </div>
    ${restoreJob.status === 'complete' ? `
      <table class="grid compact-grid">
        <thead><tr><th>TimeGenerated</th><th>DnsQuery</th><th>QueryCount</th><th>UniqueHosts</th><th>SourceTable</th></tr></thead>
        <tbody>
          ${SENTINEL_RESTORE_JOB.results.map(r => `
            <tr>
              <td>${fmtTime(r.TimeGenerated)}</td>
              <td class="kv">${esc(r.DnsQuery)}</td>
              <td>${r.QueryCount}</td>
              <td>${r.UniqueHosts}</td>
              <td>${esc(r.SourceTable)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="callout info" style="margin:12px;">Query the restored table directly with <code>${esc(SENTINEL_RESTORE_JOB.resultTable)}</code> to confirm the long-retention rows are reusable.</div>
    ` : `<div class="card-body muted">Use the Search page to materialize the retained rows, then query the <code>${esc(SENTINEL_RESTORE_JOB.resultTable)}</code> table here.</div>`}
  </div>
    `,
    onMount: () => {
      const taskButtons = Array.from(document.querySelectorAll('[data-kql-task]'));
      const taskById = Object.fromEntries(KQL_PRACTICE_TASKS.map(task => [task.id, task]));
      const practiceEditor = attachKqlEditor(document.getElementById('sentinel-kql-query'), {
        storageKey: 'defender-lab.kql-practice',
        onRun: () => runSentinelKqlPractice(),
      });
      function setActiveTask(taskId) {
        const task = taskById[taskId] || initialTask;
        sessionStorage.setItem('defender-lab.kql-practice.task', task.id);
        document.getElementById('sentinel-kql-query').value = task.query;
        document.getElementById('kql-practice-check').innerHTML = `Loaded task: <strong>${esc(task.title)}</strong> · expected ${task.expectedRows} rows.`;
        taskButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.kqlTask === task.id));
        runSentinelKqlPractice();
      }
      window.loadSentinelKqlPractice = taskId => setActiveTask(taskId);
      window.runSentinelKqlPractice = () => {
        const query = document.getElementById('sentinel-kql-query').value;
        const task = Object.values(taskById).find(t => t.query.trim() === query.trim()) || taskById[sessionStorage.getItem('defender-lab.kql-practice.task')] || initialTask;
        const result = mockKqlEvaluate(query);
        const ok = result.rows.length === task.expectedRows;
        document.getElementById('sentinel-kql-results').innerHTML = `
          <div class="card-toolbar">
            <strong>${result.rows.length} rows</strong>
            <span class="muted">${ok ? 'Matched expected row count' : `Expected ${task.expectedRows} rows`} · ${esc(task.title)}</span>
          </div>
          ${mockKqlRenderResult(result, { resultsId: 'sentinel-kql-results', queryId: 'sentinel-kql-query' })}`;
        const check = document.getElementById('kql-practice-check');
        if (check) {
          check.className = `callout ${ok ? 'success' : 'warn'}`;
          check.innerHTML = ok
            ? `Correct answer: <strong>${esc(task.title)}</strong> returned ${result.rows.length} rows.`
            : `Result mismatch: expected ${task.expectedRows} rows for <strong>${esc(task.title)}</strong>, got ${result.rows.length}.`;
        }
      };
      window.runSentinelLimitedQuery = () => {
        const queryEl = document.getElementById('sentinel-limited-query');
        if (!queryEl) return;
        const query = queryEl.value;
        const result = mockKqlEvaluate(query);
        const status = document.getElementById('sentinel-limited-status');
        if (status) {
          const isWorkspaceQuery = query.trim() === workspaceQuery.trim();
          status.className = `callout ${isWorkspaceQuery ? 'success' : 'info'}`;
          status.innerHTML = isWorkspaceQuery
            ? 'Loaded the workspace-qualified query from Workspace manager. It stays local but uses the same shape as a real Sentinel cross-workspace hunt.'
            : 'ArchiveDns_CL is an auxiliary table in this lab, so it stays interactive across retention and makes a good limited-query example.';
        }
        document.getElementById('sentinel-limited-results').innerHTML = `
          <div class="card-toolbar">
            <strong>${result.rows.length} rows</strong>
            <span class="muted">${/^workspace\s*\(/i.test(query.trim()) ? 'Workspace-qualified query' : 'Auxiliary-table query'}</span>
          </div>
          ${mockKqlRenderResult(result, { resultsId: 'sentinel-limited-results', queryId: 'sentinel-limited-query' })}`;
      };
      taskButtons.forEach(btn => btn.addEventListener('click', () => setActiveTask(btn.dataset.kqlTask)));
      setActiveTask(sessionStorage.getItem('defender-lab.kql-practice.task') || initialTask.id);
      if (practiceEditor.restoreDraft()) runSentinelKqlPractice();
      if (document.getElementById('sentinel-limited-query')) {
        window.runSentinelLimitedQuery();
      }
    },
  };
};

VIEWS['sentinel/hunting'] = () => {
  const jobComplete = localStorage.getItem('defender-lab.sentinel.networklogs.searchJob') === 'complete';
  const activeTab = currentSentinelHuntingTab();
  const bookmarks = currentSentinelBookmarks();
  const livestream = currentSentinelLivestreamState();
  const restoreJob = currentSentinelRestoreJob();
  const renderSearchTab = `
    <div class="kpi-strip hunting-status-cards">
      <div class="kpi"><span class="kpi-label">Selected table</span><span class="kpi-value">NetworkLogs_CL</span><span class="kpi-delta">Custom table</span></div>
      <div class="kpi"><span class="kpi-label">Plan</span><span class="kpi-value">Basic</span><span class="kpi-delta">Lower-cost retention</span></div>
      <div class="kpi"><span class="kpi-label">Interactive window</span><span class="kpi-value">30d</span><span class="kpi-delta bad">60d query blocked</span></div>
      <div class="kpi"><span class="kpi-label">Bookmarks</span><span class="kpi-value">${bookmarks.length}</span><span class="kpi-delta">Saved from query rows</span></div>
    </div>

    <div class="callout ${jobComplete ? 'info' : 'warn'}" style="margin-bottom:14px;">
      <strong>${jobComplete ? 'Search job complete:' : 'Scenario:'}</strong>
      ${jobComplete
        ? 'NetworkLogs_CL data from Apr 30, 2026 is materialized below for interactive analysis in the lab.'
        : 'NetworkLogs_CL is on the Basic plan. A direct interactive query can read only the last 30 days, so data from Apr 30, 2026 needs a search job.'}
    </div>

    <div class="table-plan-grid">
      ${SENTINEL_TABLE_PLANS.map(t => `
        <div class="table-plan-card ${t.name === 'NetworkLogs_CL' ? 'selected' : ''}">
          <div class="table-plan-head">
            <strong>${esc(t.name)}</strong>
            <span class="tag ${t.status === 'Interactive' ? 'green' : 'orange'}">${esc(t.plan)}</span>
          </div>
          <div class="table-plan-stats">
            <div><span>Interactive</span><strong>${esc(t.interactive)}</strong></div>
            <div><span>Total retention</span><strong>${esc(t.total)}</strong></div>
          </div>
          <div><span class="tag">${esc(t.tier)}</span> <span class="muted">${esc(t.cost)}</span></div>
          <div class="muted">${esc(t.detail)}</div>
          <div class="table-plan-status">${esc(t.status)}</div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-toolbar">
        <strong>Retention decision guide</strong>
        <span class="muted">Analytics vs Data lake vs XDR tier</span>
      </div>
      <table class="grid">
        <thead><tr><th>Choice</th><th>Use when</th><th>Avoid when</th></tr></thead>
        <tbody>
          ${SENTINEL_RETENTION_GUIDANCE.map(g => `
            <tr>
              <td><strong>${esc(g.choice)}</strong></td>
              <td>${esc(g.use)}</td>
              <td>${esc(g.avoid)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="two-col" style="margin-top:16px;">
      <div class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Direct interactive query</strong>
          <button class="btn btn-ghost btn-sm" onclick="toast('Basic table interactive queries are limited to the last 30 days in this lab scenario.')">Run</button>
        </div>
        <textarea class="kql" readonly>NetworkLogs_CL
| where TimeGenerated between (ago(60d) .. ago(59d))
| summarize Events=count() by DstIp</textarea>
        <div class="callout warn" style="margin-top:10px;">This path is intentionally blocked for the 60-day investigation because the selected table is Basic.</div>
      </div>
      <div class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Search job query</strong>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('networklogs-search-query')">Copy</button>
        </div>
        <textarea id="networklogs-search-query" class="kql" readonly>${esc(NETWORK_LOGS_SEARCH_QUERY)}</textarea>
        <div class="callout info" style="margin-top:10px;">Use a search job to retrieve data older than the Basic table interactive window but still inside total retention.</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-toolbar">
        <strong>Search job results</strong>
        <span class="muted">${jobComplete ? NETWORK_LOGS_SEARCH_RESULTS.length + ' rows materialized' : 'No job run yet'}</span>
      </div>
      ${jobComplete ? `
        <table class="grid">
          <thead><tr><th>TimeGenerated</th><th>SrcIp</th><th>DstIp</th><th>Protocol</th><th>Action</th><th>BytesOut</th><th>Threat intel match</th><th>Bookmark</th></tr></thead>
          <tbody>
            ${NETWORK_LOGS_SEARCH_RESULTS.map((r, index) => `
              <tr>
                <td>${fmtTime(r.TimeGenerated)}</td>
                <td class="kv">${esc(r.SrcIp)}</td>
                <td class="kv">${esc(r.DstIp)}</td>
                <td>${esc(r.Protocol)}</td>
                <td>${esc(r.Action)}</td>
                <td>${r.BytesOut}</td>
                <td>${esc(r.ThreatIntelMatch)}</td>
                <td><button class="btn btn-secondary btn-sm" data-row="${esc(JSON.stringify(r))}" onclick="addSentinelBookmarkFromButton(this, 'NetworkLogs_CL', 'Search job', '${esc(NETWORK_LOGS_SEARCH_QUERY)}')">Add bookmark</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="card-body muted">Run the search job to retrieve the retained Basic table rows.</div>'}
    </div>
  `;

  const renderBookmarksTab = `
    <div class="kpi-strip hunting-status-cards">
      <div class="kpi"><span class="kpi-label">Saved bookmarks</span><span class="kpi-value">${bookmarks.length}</span><span class="kpi-delta">Persisted locally</span></div>
      <div class="kpi"><span class="kpi-label">Suggestions</span><span class="kpi-value">${SENTINEL_BOOKMARK_SUGGESTIONS.length}</span><span class="kpi-delta">Capture templates</span></div>
      <div class="kpi"><span class="kpi-label">Promotions</span><span class="kpi-value">${bookmarks.filter(b => b.promotedIncidentId).length}</span><span class="kpi-delta">Incident stubs</span></div>
      <div class="kpi"><span class="kpi-label">Linked incidents</span><span class="kpi-value">${bookmarks.reduce((n, b) => n + (b.linkedIncidents?.length || 0), 0)}</span><span class="kpi-delta">Bookmark context</span></div>
    </div>
    <div class="callout info" style="margin-bottom:14px;">
      Bookmarks capture the KQL, the row that triggered the save, entity mapping, tags, and a MITRE technique so you can turn a hunt into a repeatable investigation pattern.
    </div>
    <div class="two-col">
      <section class="card">
        <div class="card-toolbar"><strong>Saved bookmarks</strong><span class="muted">${bookmarks.length} local items</span></div>
        ${bookmarks.length ? `
          <table class="grid">
            <thead><tr><th>Query</th><th>Entities</th><th>Tags</th><th>MITRE</th><th>Incident</th><th>Actions</th></tr></thead>
            <tbody>
              ${bookmarks.map(bookmark => `
                <tr>
                  <td>
                    <strong>${esc(bookmark.queryName)}</strong>
                    <div class="muted">${esc(bookmark.table)}</div>
                  </td>
                  <td>${bookmark.entityMapping.map(item => `<span class="tag">${esc(item)}</span>`).join(' ')}</td>
                  <td>${bookmark.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join(' ')}</td>
                  <td><span class="mitre">${esc(bookmark.mitre)}</span></td>
                  <td>${bookmark.promotedIncidentId ? `<button class="link-button strong" onclick="navigate('#/sentinel/incidents')">${esc(bookmark.promotedIncidentId)}</button>` : `${bookmark.linkedIncidents?.map(id => `<span class="tag">${esc(id)}</span>`).join(' ') || '<span class="muted">None</span>'}`}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="promoteSentinelBookmark('${esc(bookmark.id)}')">Promote to incident</button>
                    <button class="btn btn-ghost btn-sm" onclick="addBookmarkToExistingIncident('${esc(bookmark.id)}', '${esc(bookmark.linkedIncidents?.[0] || bookmark.incident || 'INC-1042')}')">Add to existing incident</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="card-body muted">No bookmarks yet. Use the search results tab to save one of the matching rows below.</div>
        `}
      </section>
      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Bookmark shape</strong>
          <span class="muted">What gets captured</span>
        </div>
        <div class="flowline vertical-flow">
          <div class="flow-step"><strong>Query text</strong><span>Keep the KQL that produced the row so the hunt is repeatable.</span></div>
          <div class="flow-step"><strong>Row evidence</strong><span>Store the exact result row and the entity values that matter for review.</span></div>
          <div class="flow-step"><strong>MITRE and tags</strong><span>Tag the bookmark so you can pivot to ATT&amp;CK and triage context later.</span></div>
          <div class="flow-step"><strong>Incident linkage</strong><span>Promote the bookmark into a new incident or attach it to an existing case.</span></div>
        </div>
        <div class="card-toolbar" style="margin-top:18px;"><strong>Suggested captures</strong><span class="muted">Static templates</span></div>
        <div class="tile-grid">
          ${SENTINEL_BOOKMARK_SUGGESTIONS.map(template => `
            <button class="tile" type="button" data-row="${esc(JSON.stringify(template.row))}" onclick="addSentinelBookmarkFromButton(this, '${esc(template.table)}', '${esc(template.queryName)}', '${esc(template.query)}')">
              <div class="tile-title"><span class="tile-icon">🔖</span>${esc(template.queryName)}</div>
              <div class="tile-sub">${esc(template.entity)} · ${esc(template.incident)}</div>
              <div class="muted">${template.tags.map(tag => esc(tag)).join(' · ')} · ${esc(template.mitre)}</div>
            </button>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  const renderLivestreamTab = `
    <div class="kpi-strip hunting-status-cards">
      <div class="kpi"><span class="kpi-label">Status</span><span class="kpi-value">${esc(livestream.status)}</span><span class="kpi-delta">${livestream.elevated ? 'Alert stub created' : 'Live query feed'}</span></div>
      <div class="kpi"><span class="kpi-label">Rows observed</span><span class="kpi-value">${livestream.rows.length}</span><span class="kpi-delta">Ticks from fixture feed</span></div>
      <div class="kpi"><span class="kpi-label">Cursor</span><span class="kpi-value">${livestream.cursor}</span><span class="kpi-delta">${SENTINEL_LIVESTREAM_ROWS.length} available</span></div>
      <div class="kpi"><span class="kpi-label">Alert stub</span><span class="kpi-value">${livestream.alertStub ? 'Ready' : 'None'}</span><span class="kpi-delta">Elevate when enough evidence appears</span></div>
    </div>
    <div class="two-col">
      <section class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Livestream query</strong>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('sentinel-livestream-query')">Copy</button>
        </div>
        <textarea id="sentinel-livestream-query" class="kql" readonly>${esc(SENTINEL_LIVESTREAM_QUERY)}</textarea>
        <div class="sidepanel-footer" style="padding-top:12px;">
          <button class="btn btn-primary" onclick="startSentinelLivestream()">Start</button>
          <button class="btn btn-secondary" onclick="pauseSentinelLivestream()">Pause</button>
          <button class="btn btn-secondary" onclick="stopSentinelLivestream()">Stop</button>
          <button class="btn btn-primary" onclick="elevateSentinelLivestreamToAlert()">Elevate to alert</button>
        </div>
        <div class="callout info" style="margin-top:12px;">
          The livestream uses a timer over canned rows so you can watch the query light up in stages, then turn the pattern into a stub analytics rule.
        </div>
      </section>
      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Stream state</strong>
          <span class="muted">${livestream.startedAt ? fmtTime(livestream.startedAt) : 'Not started'}</span>
        </div>
        ${livestream.alertStub ? `
          <div class="callout success">
            <strong>${esc(livestream.alertStub.name)}</strong><br>
            Severity: ${esc(livestream.alertStub.severity)} · Rows observed: ${livestream.alertStub.rows}
          </div>
        ` : `
          <div class="callout warn">Run the stream long enough to collect multiple rows, then elevate it into a static analytics rule stub.</div>
        `}
        <div class="alert-section-title">Feed history</div>
        <table class="grid compact-grid">
          <thead><tr><th>Time</th><th>Account</th><th>Action</th><th>App</th><th>Risk</th></tr></thead>
          <tbody>
            ${livestream.rows.length ? livestream.rows.map(row => `
              <tr>
                <td>${fmtTime(row.TimeGenerated)}</td>
                <td>${esc(row.AccountDisplayName)}</td>
                <td>${esc(row.ActionType)}</td>
                <td class="kv">${esc(row.AppId)}</td>
                <td><span class="sev ${row.RiskScore >= 90 ? 'high' : row.RiskScore >= 70 ? 'medium' : 'low'}">${esc(row.RiskScore)}</span> ${esc(row.Signal)}</td>
              </tr>
            `).join('') : `<tr><td colspan="5" class="muted">No rows yet. Start the livestream to watch the feed tick.</td></tr>`}
          </tbody>
        </table>
      </section>
    </div>
  `;

  return `
  <div class="page-header hunting-page-header">
    <div>
      <div class="breadcrumb">Sentinel › <strong>Search</strong></div>
      <h1>Hunting workspace</h1>
      <div class="page-subtitle">Work through retained search results, bookmarks, and a live query feed from the same hunting surface.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/logs">Open Logs</a>
      <a class="btn btn-secondary" href="#/sentinel/search">Restore data</a>
      <button class="btn btn-primary" onclick="runSentinelSearchJob()">Run search job</button>
    </div>
  </div>
  <div class="tabs" style="margin-bottom:14px;">
    <button class="tab ${activeTab === 'search' ? 'active' : ''}" onclick="setSentinelHuntingTab('search')">Search results</button>
    <button class="tab ${activeTab === 'bookmarks' ? 'active' : ''}" onclick="setSentinelHuntingTab('bookmarks')">Bookmarks (${bookmarks.length})</button>
    <button class="tab ${activeTab === 'livestream' ? 'active' : ''}" onclick="setSentinelHuntingTab('livestream')">Livestream</button>
  </div>
  ${activeTab === 'bookmarks' ? renderBookmarksTab : activeTab === 'livestream' ? renderLivestreamTab : renderSearchTab}
  `;
};

VIEWS['sentinel/soc-optimization'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Sentinel › Manage › <strong>SOC optimization</strong></div>
      <h1>SOC optimization</h1>
      <div class="page-subtitle">Review coverage gaps, rule quality, and data-value recommendations before changing ingestion or detections.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/analytics">Analytics rules</a>
      <a class="btn btn-secondary" href="#/sentinel/hunting">Retention</a>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Recommendations</span><span class="kpi-value">${SOC_OPTIMIZATION_RECOMMENDATIONS.length}</span><span class="kpi-delta">Lab-static</span></div>
    <div class="kpi"><span class="kpi-label">High impact</span><span class="kpi-value">${SOC_OPTIMIZATION_RECOMMENDATIONS.filter(r => r.impact === 'High').length}</span><span class="kpi-delta bad">Act first</span></div>
    <div class="kpi"><span class="kpi-label">Data-value calls</span><span class="kpi-value">2</span><span class="kpi-delta">Cost + signal</span></div>
    <div class="kpi"><span class="kpi-label">Coverage goal</span><span class="kpi-value">Identity</span><span class="kpi-delta">Highest gap</span></div>
  </div>
  <div class="card">
    <div class="card-toolbar">
      <strong>Recommendations</strong>
      <span class="muted">Coverage, detection content, and ingestion value</span>
    </div>
    <table class="grid">
      <thead><tr><th>Area</th><th>Recommendation</th><th>Impact</th><th>Data value</th><th>Reason</th><th>Action</th></tr></thead>
      <tbody>
        ${SOC_OPTIMIZATION_RECOMMENDATIONS.map(r => `
          <tr>
            <td>${esc(r.area)}</td>
            <td><strong>${esc(r.recommendation)}</strong></td>
            <td><span class="severity ${r.impact.toLowerCase()}">${esc(r.impact)}</span></td>
            <td>${esc(r.dataValue)}</td>
            <td>${esc(r.reason)}</td>
            <td>${esc(r.action)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <div class="callout info" style="margin-top:16px;">
    SOC optimization is a decision surface: use it to justify whether to add coverage, tune a noisy rule, or move low-value telemetry out of Analytics.
  </div>
`;

VIEWS['sentinel/summary-rules'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Sentinel › Hunting › <strong>Summary rules</strong></div>
      <h1>Summary rule tables</h1>
      <div class="page-subtitle">Aggregate noisy source telemetry into a smaller table that is cheaper and faster for follow-up hunts.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="copyToClipboard('summary-rule-query')">Copy rule query</button>
      <button class="btn btn-primary" onclick="toast('Summary table refreshed with 3 aggregate rows in this lab.')">Run summary rule</button>
    </div>
  </div>
  <div class="two-col">
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;"><strong>Rule query</strong></div>
      <textarea id="summary-rule-query" class="kql" readonly>${esc(SUMMARY_RULE_QUERY)}</textarea>
    </div>
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;"><strong>Analyst query</strong></div>
      <textarea class="kql" readonly>${esc(SUMMARY_TABLE_QUERY)}</textarea>
      <div class="callout info" style="margin-top:10px;">Analysts query NetworkSummary_CL for triage, then pivot back to NetworkLogs_CL only when raw evidence is needed.</div>
    </div>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <div class="card">
      <div class="card-toolbar"><strong>Noisy source table</strong><span class="muted">NetworkLogs_CL sample</span></div>
      <table class="grid compact-grid">
        <thead><tr><th>Time</th><th>SrcIp</th><th>DstIp</th><th>Action</th><th>BytesOut</th></tr></thead>
        <tbody>${SUMMARY_RULE_SOURCE_ROWS.map(r => `
          <tr><td>${fmtTime(r.TimeGenerated)}</td><td class="kv">${esc(r.SrcIp)}</td><td class="kv">${esc(r.DstIp)}</td><td>${esc(r.Action)}</td><td>${r.BytesOut}</td></tr>
        `).join('')}</tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-toolbar"><strong>Summary output table</strong><span class="muted">NetworkSummary_CL</span></div>
      <table class="grid compact-grid">
        <thead><tr><th>Hour</th><th>SrcIp</th><th>DstIp</th><th>Events</th><th>BytesOut</th><th>Blocks</th></tr></thead>
        <tbody>${SUMMARY_RULE_RESULTS.map(r => `
          <tr><td>${fmtTime(r.TimeGenerated)}</td><td class="kv">${esc(r.SrcIp)}</td><td class="kv">${esc(r.DstIp)}</td><td>${r.Events}</td><td>${r.BytesOut}</td><td>${r.Blocks}</td></tr>
        `).join('')}</tbody>
      </table>
    </div>
  </div>
`;

VIEWS['sentinel/data-lake-jobs'] = () => {
  const complete = localStorage.getItem('defender-lab.sentinel.dataLakeJob') === 'complete';
  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Sentinel › Hunting › <strong>Data lake KQL jobs</strong></div>
      <h1>Sentinel KQL jobs in Data lake</h1>
      <div class="page-subtitle">Run long-range KQL over retained Data lake tables, then materialize results for analyst review.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/hunting">Basic search job</a>
      <button class="btn btn-primary" onclick="runSentinelDataLakeJob()">Run Data lake job</button>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Source</span><span class="kpi-value">ArchiveDns</span><span class="kpi-delta">Data lake</span></div>
    <div class="kpi"><span class="kpi-label">Lookback</span><span class="kpi-value">180d</span><span class="kpi-delta">Batch job</span></div>
    <div class="kpi"><span class="kpi-label">Runtime</span><span class="kpi-value">${esc(DATA_LAKE_KQL_JOB.runtime.split(' ')[0])}</span><span class="kpi-delta">${esc(DATA_LAKE_KQL_JOB.runtime.replace(DATA_LAKE_KQL_JOB.runtime.split(' ')[0]+' ', ''))}</span></div>
    <div class="kpi"><span class="kpi-label">Results table</span><span class="kpi-value">_CL</span><span class="kpi-delta">${complete ? 'Materialized' : 'Pending'}</span></div>
  </div>
  <div class="two-col">
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>${esc(DATA_LAKE_KQL_JOB.name)}</strong>
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('data-lake-job-query')">Copy</button>
      </div>
      <textarea id="data-lake-job-query" class="kql" readonly>${esc(DATA_LAKE_KQL_JOB.query)}</textarea>
    </div>
    <div class="card card-body">
      <h2>Contrast with Basic-table search job</h2>
      <p class="muted">A Basic-table search job retrieves older retained rows from one Log Analytics table for investigation. A Data lake KQL job is for broader historical processing where a long-running query writes a reusable results table.</p>
      <dl class="summary-info" style="margin-top:12px;">
        <dt>Basic search job</dt><dd>Case-specific retrieval from NetworkLogs_CL.</dd>
        <dt>Data lake KQL job</dt><dd>Batch hunt over ${esc(DATA_LAKE_KQL_JOB.source)} into ${esc(DATA_LAKE_KQL_JOB.resultTable)}.</dd>
      </dl>
    </div>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>${esc(DATA_LAKE_KQL_JOB.resultTable)}</strong>
      <span class="muted">${complete ? DATA_LAKE_KQL_JOB.results.length + ' rows materialized' : 'Run the job to create results'}</span>
    </div>
    ${complete ? `
      <table class="grid">
        <thead><tr><th>Time</th><th>DnsQuery</th><th>QueryCount</th><th>UniqueHosts</th><th>Verdict</th></tr></thead>
        <tbody>${DATA_LAKE_KQL_JOB.results.map(r => `
          <tr><td>${fmtTime(r.TimeGenerated)}</td><td class="kv">${esc(r.DnsQuery)}</td><td>${r.QueryCount}</td><td>${r.UniqueHosts}</td><td>${esc(r.Verdict)}</td></tr>
        `).join('')}</tbody>
      </table>
    ` : '<div class="card-body muted">The result table is empty until the long-running job completes.</div>'}
  </div>
`;
};

VIEWS['sentinel/notebooks'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Sentinel › Hunting › <strong>Notebooks</strong></div>
      <h1>Notebooks</h1>
      <div class="page-subtitle">Use notebook-style investigation templates for enrichment, entity pivots, and Data lake job review.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/sentinel/data-lake-jobs">Data lake jobs</a>
      <button class="btn btn-primary" onclick="toast('Notebook opened with static lab cells only.')">Open notebook</button>
    </div>
  </div>
  <div class="three-col">
    ${SENTINEL_NOTEBOOKS.map(n => `
      <div class="tile">
        <div class="tile-title"><span class="tile-icon">📓</span>${esc(n.name)}</div>
        <div class="tile-sub">${esc(n.language)} · ${esc(n.status)}</div>
        <div class="resource-summary" style="margin-top:10px;">
          <div><span>Inputs</span><strong>${esc(n.inputs)}</strong></div>
          <div><span>Output</span><strong>${esc(n.output)}</strong></div>
        </div>
        <div class="muted" style="margin-top:10px;">${esc(n.detail)}</div>
      </div>
    `).join('')}
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Sentinel MCP Server connection notes</strong>
      <span class="muted">Conceptual only; no network calls in this lab</span>
    </div>
    <div class="three-col">
      ${SENTINEL_MCP_NOTES.map(n => `
        <div class="mcp-note">
          <strong>${esc(n.title)}</strong>
          <p class="muted">${esc(n.detail)}</p>
        </div>
      `).join('')}
    </div>
  </div>
  <div class="card card-body" style="margin-top:16px;">
    <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;"><strong>Notebook cell preview</strong></div>
    <textarea class="kql" readonly># Static lab cell
incident_id = "INC-1042"
result_table = "DnsBeaconingResults_CL"
print("Load incident entities, enrich indicators, and attach the result table to the case notes.")</textarea>
  </div>
`;

VIEWS['sentinel/workbooks'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Threat management › <strong>Workbooks</strong></div><h1>Workbooks</h1></div></div>
  <div class="three-col">
    ${SENTINEL_WORKBOOKS.map(w => `
      <div class="tile">
        <div class="tile-title"><span class="tile-icon">📓</span>${esc(w.name)}</div>
        <div class="tile-sub">${esc(w.owner)} · refresh ${esc(w.refresh)}</div>
        <div style="margin-top:10px;">${w.panels.map(p => `<span class="tag">${esc(p)}</span>`).join(' ')}</div>
        <div class="muted" style="margin-top:10px; font-size:12px;">${esc(w.detail)}</div>
      </div>
    `).join('')}
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>Workbook detail: Investigation Insights</strong><span class="muted">Pinned to SOC overview</span></div>
    <div class="card-body">
      <div class="three-col">
        <div><div class="alert-section-title">Incident trend</div><div class="tile-metric">${INCIDENTS.length}</div><div class="muted">Open incidents in 24h</div></div>
        <div><div class="alert-section-title">Top tactic</div><div class="tile-metric">Initial Access</div><div class="muted">3 correlated incidents</div></div>
        <div><div class="alert-section-title">Entity graph</div><div class="tile-metric">${SENTINEL_GRAPH.nodes.length}</div><div class="muted">Nodes for ${esc(SENTINEL_GRAPH.incidentId)}</div></div>
      </div>
    </div>
  </div>
`;

VIEWS['sentinel/automation'] = () => {
  const lab = SENTINEL_AUTOMATION_LAB;
  const selectedTrigger = sessionStorage.getItem('defender-lab.sentinel.rule.trigger') || lab.ruleDraft.trigger;
  const isAlertTrigger = selectedTrigger === 'When alert is created';
  // Incident-level actions require an incident trigger; the alert trigger supports only Run playbook.
  const INCIDENT_ACTIONS = ['Change status', 'Change severity', 'Assign owner', 'Add tags', 'Add task'];

  // Conditions are built from dropdowns (property -> operator -> value), never free text.
  // Alert trigger supports only the "Analytic rule name" property. (Product documentation: create-manage-use-automation-rules)
  const CONDITION_PROPS = isAlertTrigger
    ? ['Analytic rule name']
    : ['Incident provider', 'Analytic rule name', 'Title', 'Description', 'Severity', 'Status', 'Tactics', 'Tag'];
  const OPERATORS_BY_PROP = {
    'Incident provider': ['Equals', 'Does not equal'],
    'Analytic rule name': ['Contains', 'Does not contain'],
    'Title': ['Equals', 'Does not equal', 'Contains', 'Does not contain', 'Starts with', 'Ends with'],
    'Description': ['Equals', 'Does not equal', 'Contains', 'Does not contain', 'Starts with', 'Ends with'],
    'Severity': ['Equals', 'Does not equal'],
    'Status': ['Equals', 'Does not equal'],
    'Tactics': ['Contains', 'Does not contain'],
    'Tag': ['Contains', 'Does not contain', 'Equals', 'Does not equal'],
  };
  // Value is a closed-list drop-down for these properties; a text box otherwise.
  const VALUE_OPTIONS = {
    'Incident provider': ['Sentinel', 'Defender XDR'],
    'Severity': ['Informational', 'Low', 'Medium', 'High'],
    'Status': ['New', 'Active', 'Closed'],
  };
  const selectedCondProp = isAlertTrigger
    ? 'Analytic rule name'
    : (CONDITION_PROPS.includes(sessionStorage.getItem('defender-lab.sentinel.rule.condProp'))
        ? sessionStorage.getItem('defender-lab.sentinel.rule.condProp')
        : 'Incident provider');
  const condOperators = OPERATORS_BY_PROP[selectedCondProp] || ['Equals', 'Does not equal'];
  const condValueOptions = VALUE_OPTIONS[selectedCondProp] || null;

  // User-created rules persist in localStorage so they show up in the rules list.
  let createdRules = [];
  try { createdRules = JSON.parse(localStorage.getItem('defender-lab.sentinel.rules.created') || '[]'); } catch { createdRules = []; }
  const hasPermission = localStorage.getItem('defender-lab.sentinel.playbook1Permission') === 'granted';
  const selectedPlaybookName = sessionStorage.getItem('defender-lab.sentinel.playbook.selected') || (hasPermission ? 'Playbook1' : 'PB-RevokeOAuthConsent');
  const selectedPlaybook = SENTINEL_PLAYBOOKS.find(p => p.name === selectedPlaybookName) || SENTINEL_PLAYBOOKS.find(p => p.name === 'Playbook1');
  const entityContext = sentinelEntityPlaybookContext();
  const playbookState = hasPermission ? 'Available' : 'Grayed out';
  const permissionClass = hasPermission ? 'granted' : 'missing';
  const selectedPlaybookRow = hasPermission
    ? `<button class="playbook-select-row selected" onclick="selectSentinelPlaybook('Playbook1')">
        <span><strong>Playbook1</strong><small>Sentinel incident trigger · RG-Playbooks</small></span>
        <span class="status-pill ok">Selectable</span>
      </button>`
    : `<button class="playbook-select-row disabled" onclick="explainDisabledPlaybook()">
        <span><strong>Playbook1</strong><small>Sentinel incident trigger · RG-Playbooks</small></span>
        <span class="status-pill blocked">Grayed out</span>
      </button>`;

  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Configuration › <strong>Automation</strong></div>
        <h1>Automation</h1>
        <div class="page-subtitle">Create automation rules and run incident-trigger playbooks from Sentinel.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="toast('Create automation rule blade is open in the lab page below.')">+ Create</button>
      </div>
    </div>
    <div class="tabs"><span class="tab active">Automation rules</span><span class="tab">Playbooks</span><span class="tab">Active playbooks</span></div>

    <div class="callout ${hasPermission ? 'success' : 'warn'}">
      <strong>SC-200 checkpoint:</strong> ${hasPermission
        ? 'Sentinel now has access to RG-Playbooks, so Playbook1 is available in the Run playbook action.'
        : 'Playbook1 is grayed out because Sentinel does not have permission to the playbook resource group.'}
    </div>

    <div class="automation-layout">
      <section class="card">
        <div class="card-toolbar"><strong>Automation rules</strong><span class="muted">Sentinel workspace: ${esc(lab.workspace)}</span></div>
        <table class="grid">
          <thead><tr><th>Order</th><th>Name</th><th>Trigger</th><th>Actions</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Auto-assign phishing incidents to L1</td><td>When incident is created</td><td>Assign owner: L1-Triage</td><td><span class="status-dot resolved"></span>Enabled</td></tr>
            <tr><td>2</td><td>Tag identity attacks</td><td>When incident is updated</td><td>Add tag: identity-attack</td><td><span class="status-dot resolved"></span>Enabled</td></tr>
            <tr><td>3</td><td>Run isolation playbook on high-sev EDR</td><td>When alert is created</td><td>Run playbook: PB-IsolateDevice</td><td><span class="status-dot warn"></span>Disabled</td></tr>
            ${createdRules.map((r, i) => `<tr>
              <td>${4 + i}</td>
              <td>${esc(r.name)}</td>
              <td>${esc(r.trigger)}</td>
              <td>${esc(r.actions)}</td>
              <td><span class="status-dot ${r.status === 'Enabled' ? 'resolved' : 'warn'}"></span>${esc(r.status)} <button class="chip-link" onclick="deleteAutomationRule(${i})">Delete</button></td>
            </tr>`).join('')}
            <tr class="active-row"><td>${4 + createdRules.length}</td><td>${esc(lab.ruleDraft.name)} <span class="muted">(draft preview)</span></td><td>${esc(selectedTrigger)}</td><td>Run playbook: <strong>${hasPermission ? 'Playbook1' : '(not selected)'}</strong></td><td><span class="status-dot ${hasPermission ? 'resolved' : 'warn'}"></span>${hasPermission ? 'Ready' : 'Draft blocked'}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="card automation-blade">
        <div class="blade-mini-header">
          <div>
            <div class="breadcrumb">Create automation rule</div>
            <h2>${esc(lab.ruleDraft.name)}</h2>
          </div>
          <button class="iconbtn" onclick="toast('Blade closed (lab stub).')">×</button>
        </div>
        <div class="wizard-section form-grid two">
          <label class="lbl">Automation rule name<input id="newRuleName" class="ipt" value="${esc(lab.ruleDraft.name)}"></label>
          <label class="lbl">Trigger<select class="ipt" onchange="selectAutomationTrigger(this.value)">
            ${['When incident is created', 'When incident is updated', 'When alert is created']
              .map(t => `<option ${t === selectedTrigger ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select></label>
          <label class="lbl">Action<select id="newRuleAction" class="ipt">
            <option selected>Run playbook</option>
            ${INCIDENT_ACTIONS.map(a => `<option ${isAlertTrigger ? 'disabled' : ''}>${esc(a)}${isAlertTrigger ? ' — incident trigger only' : ''}</option>`).join('')}
          </select></label>
        </div>

        <div class="wizard-section">
          <div class="dropdown-label">Condition (If <em>property → operator → value</em>)</div>
          <div class="condition-row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:end;">
            <label class="lbl" style="flex:1 1 180px;">Property
              <select id="newRuleCondProp" class="ipt" onchange="selectConditionProperty(this.value)" ${isAlertTrigger ? 'disabled' : ''}>
                ${CONDITION_PROPS.map(p => `<option ${p === selectedCondProp ? 'selected' : ''}>${esc(p)}</option>`).join('')}
              </select>
            </label>
            <label class="lbl" style="flex:1 1 160px;">Operator
              <select id="newRuleCondOp" class="ipt">
                ${condOperators.map(o => `<option>${esc(o)}</option>`).join('')}
              </select>
            </label>
            <label class="lbl" style="flex:1 1 180px;">Value
              ${condValueOptions
                ? `<select id="newRuleCondValue" class="ipt">${condValueOptions.map(v => `<option>${esc(v)}</option>`).join('')}</select>`
                : `<input id="newRuleCondValue" class="ipt" placeholder="${isAlertTrigger ? 'Analytics rule name' : 'Type a value'}">`}
            </label>
          </div>
          <div class="muted" style="margin-top:6px;">
            ${isAlertTrigger
              ? 'Alert-trigger rules support only the <strong>Analytic rule name</strong> condition (Contains / Does not contain).'
              : 'Property and operator are drop-downs; the value is a drop-down for closed lists (Severity, Status, Incident provider) and a text box otherwise.'}
          </div>
        </div>

        ${isAlertTrigger ? `
        <div class="callout warn" style="margin-top:12px;">
          <strong>Alert-trigger rule:</strong> when the trigger is <em>When alert is created</em>, the only available action is
          <strong>Run playbook</strong>. Change status, Change severity, Assign owner, Add tags, and Add task are incident-level
          actions and are greyed out here because alerts have no incident status, owner, or tags to manage.
          <span class="muted">See your licensed product documentation for automation rule actions.</span>
        </div>` : `
        <div class="callout info" style="margin-top:12px;">
          <strong>Incident-trigger rule:</strong> incident triggers add Change status, Change severity, Assign owner, Add tags, and Add task
          on top of Run playbook. Switch the Trigger to <em>When alert is created</em> to see those actions grey out.
        </div>`}

        <div class="run-playbook-action">
          <div class="action-header">
            <strong>Run playbook</strong>
            <button class="chip-link" onclick="grantPlaybookPermissions()">Manage playbook permissions</button>
          </div>
          <div class="playbook-dropdown">
            <div class="dropdown-label">Playbook drop-down list</div>
            ${selectedPlaybookRow}
            <button class="playbook-select-row" onclick="toast('PB-RevokeOAuthConsent selected for comparison.')">
              <span><strong>PB-RevokeOAuthConsent</strong><small>Sentinel incident trigger · RG-SOC</small></span>
              <span class="status-pill ok">Selectable</span>
            </button>
            <button class="playbook-select-row ${selectedPlaybookName === 'PB-ContainEntity' ? 'selected' : ''}" onclick="selectSentinelAutomationPlaybook('PB-ContainEntity')">
              <span><strong>PB-ContainEntity</strong><small>Entity trigger · ${esc(lab.resourceGroup.replace('RG-Playbooks', 'RG-Entity-Playbooks'))}</small></span>
              <span class="status-pill ok">Selectable</span>
            </button>
          </div>
          <div class="permission-state ${permissionClass}">
            <span>${playbookState}</span>
            <strong>${hasPermission ? 'Sentinel has Automation Contributor on RG-Playbooks.' : 'Sentinel is missing Automation Contributor on RG-Playbooks.'}</strong>
          </div>
        </div>

        <div class="blade-actions" style="display:flex; gap:8px; margin-top:16px;">
          <button class="btn btn-primary" onclick="createAutomationRule()">Apply (create rule)</button>
          ${createdRules.length ? `<button class="btn btn-secondary" onclick="resetCreatedRules()">Clear created rules (${createdRules.length})</button>` : ''}
        </div>
      </section>
    </div>

    <div class="two-col" style="margin-top:16px;">
      <section class="card">
        <div class="card-toolbar"><strong>Manage playbook permissions</strong><span class="muted">${esc(lab.resourceGroup)}</span></div>
        <div class="permission-panel">
          <div class="permission-target">
            <span class="resource-icon">RG</span>
            <div><strong>${esc(lab.resourceGroup)}</strong><small>Resource group containing ${esc(lab.playbookName)}</small></div>
          </div>
          <table class="grid compact">
            <thead><tr><th>Principal</th><th>Role</th><th>Effect</th></tr></thead>
            <tbody>
              ${lab.permissions.map(p => {
                const active = p.principal === lab.serviceAccount && hasPermission;
                return `<tr class="${active ? 'active-row' : ''}">
                  <td>${esc(p.principal)}</td>
                  <td>${esc(p.role)}</td>
                  <td>${esc(p.effect)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          <button class="btn btn-primary" onclick="grantPlaybookPermissions()">Grant Sentinel access</button>
          <button class="btn btn-secondary" onclick="resetPlaybookPermissions()">Reset lab permission</button>
        </div>
      </section>

      <section class="card card-body">
        <div class="alert-section-title">Why the exam answer is this action</div>
        <ol class="learn-steps">
          ${lab.notes.map(n => `<li>${esc(n)}</li>`).join('')}
        </ol>
        <div class="resource-summary">
          <div><span>Wrong fix</span><strong>Logic App Contributor for your user</strong><small>Lets you edit the app, but the automation rule still cannot run it.</small></div>
          <div><span>Correct fix</span><strong>Manage playbook permissions</strong><small>Grants the Sentinel service account ${esc(lab.role)} on ${esc(lab.resourceGroup)}.</small></div>
        </div>
      </section>
    </div>

    <div class="card card-body" style="margin-top:16px;">
      <div class="card-toolbar">
        <strong>Playbook detail side panel</strong>
        <span class="muted">${esc(selectedPlaybook?.name || '—')}</span>
      </div>
      ${selectedPlaybook ? `
        <div class="two-col">
          <div>
            <div class="summary-info">
              <div><span class="muted">Trigger</span><strong>${esc(selectedPlaybook.trigger)}</strong></div>
              <div><span class="muted">Connector</span><strong>${esc(selectedPlaybook.connector)}</strong></div>
              <div><span class="muted">Status</span><strong>${esc(selectedPlaybook.status)}</strong></div>
              <div><span class="muted">Resource group</span><strong>${esc(selectedPlaybook.resourceGroup || '—')}</strong></div>
            </div>
            ${entityContext.entityName ? `
              <div class="callout info" style="margin-top:12px;">
                <strong>Entity trigger context</strong><br>
                Entity: ${esc(entityContext.entityName)}<br>
                Source: ${esc(entityContext.source || 'Sentinel entity behavior')}
              </div>
            ` : ''}
          </div>
          <div>
            <div class="alert-section-title">Playbook steps</div>
            <ol class="learn-steps">
              ${selectedPlaybook.steps.map(step => `<li>${esc(step)}</li>`).join('')}
            </ol>
          </div>
        </div>
      ` : '<div class="muted">Pick a playbook to see its step-by-step detail panel.</div>'}
    </div>

    <div class="three-col" style="margin-top:16px;">
      ${SENTINEL_PLAYBOOKS.map(p => `
        <div class="card card-body ${p.name === selectedPlaybookName ? 'selected-row' : ''} ${p.name === 'Playbook1' ? 'playbook1-card' : ''}">
          <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
            <strong>${esc(p.name)}</strong>
            <span class="tag ${p.status === 'Enabled' ? 'green' : 'orange'}">${esc(p.status)}</span>
          </div>
          <div class="muted">${esc(p.trigger)} · ${esc(p.connector)}</div>
          ${p.resourceGroup ? `<div class="muted">Resource group: <strong>${esc(p.resourceGroup)}</strong></div>` : ''}
          <div class="alert-section-title">Playbook steps</div>
          <ol style="margin:0; padding-left:18px; font-size:12px; line-height:1.7;">
            ${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}
          </ol>
          <button class="btn btn-secondary btn-sm" style="margin-top:12px;" onclick="selectSentinelAutomationPlaybook('${esc(p.name)}')">View details</button>
        </div>
      `).join('')}
    </div>
  `;
};

// ---------- Agent 10 dead-route cleanup surfaces ----------
const ACTION_CENTER_ITEMS = [
  { source:'AIR', status:'Pending approval', incident:'INC-1042', action:'Remove OAuth consent for DocViewer Pro', target:'jane.doe@hacksmarterlabs.example', age:'12 min' },
  { source:'AIR', status:'Completed', incident:'INC-1050', action:'Isolate device', target:'FIN-FS-02', age:'38 min' },
  { source:'MDE', status:'Pending approval', incident:'INC-1050', action:'Quarantine locker.exe', target:'7a64529e93fa01e8cedfc02114f397d4bbbb42715349f24763d3b7765ffed466', age:'41 min' },
  { source:'MDO', status:'Completed', incident:'INC-1042', action:'Soft-delete phishing message', target:'MSG-7781', age:'55 min' },
];

const MDO_INVESTIGATION_ROWS = [
  { sev:'high', title:'User clicked phishing URL and granted OAuth consent', user:'jane.doe@hacksmarterlabs.example', evidence:'URL click + app consent', incident:'INC-1042', action:'Revoke sessions, remove consent, purge message' },
  { sev:'medium', title:'Mailbox rule created after suspicious sign-in', user:'maria.chen@hacksmarterlabs.example', evidence:'Inbox rule forwards finance mail', incident:'INC-1051', action:'Disable rule, reset password, review audit' },
  { sev:'low', title:'Attachment detonated but blocked', user:'pavel.novak@hacksmarterlabs.example', evidence:'Sandbox verdict matched malware family', incident:'INC-1031', action:'Confirm delivery blocked and tune alert noise' },
];

const SENTINEL_WATCHLIST_ROWS = [
  { name:'VIP accounts', alias:'vip_accounts', items:18, updated:'2026-07-06T07:35:00Z', use:'Join to SigninLogs and UEBA anomalies before creating incidents.' },
  { name:'Privileged service principals', alias:'tier0_apps', items:9, updated:'2026-07-05T16:20:00Z', use:'Scope OAuth consent and app activity hunts.' },
  { name:'Approved scanner hosts', alias:'approved_scanners', items:6, updated:'2026-07-01T09:10:00Z', use:'Suppress known scanner noise without hiding new hosts.' },
];

const CLOUD_ATTACK_PATHS = [
  {
    id:'dfc-path-01', name:'Internet VM to storage exfiltration', severity:'high', status:'Pending', assetType:'Virtual machine',
    firstSeen:'2026-07-12T09:20:00Z', lastSeen:'2026-08-02T07:42:00Z', affectedResources:4,
    start:'vm-prod-web-01', entryPoint:'Public SSH endpoint', target:'sthacksmarterlabslogs', chokePoints:['mi-web-prod'],
    path:['Open SSH management port','Managed identity has Storage Blob Data Contributor','sthacksmarterlabslogs permits public network access'],
    result:'Potential data exfiltration path', scenario:'Internet-exposed compute can use a workload identity to reach a data store.',
    nodes:[
      { id:'vm-web', role:'entry', type:'Virtual machine', label:'vm-prod-web-01', subtitle:'Public IP · SSH 22 open', insight:'The management port is reachable from the internet and the VM has unresolved high-severity vulnerabilities.', riskFactors:['Internet exposed','High-severity vulnerabilities'], techniques:['T1190 Exploit Public-Facing Application'], recommendationIds:['ap-rec-ssh','ap-rec-vuln'] },
      { id:'mi-web', role:'choke', type:'Managed identity', label:'mi-web-prod', subtitle:'Storage Blob Data Contributor', insight:'This identity is the single convergence point between the exposed VM and the storage target.', riskFactors:['Broad data-plane role','Reachable from exposed compute'], techniques:['T1078 Valid Accounts'], recommendationIds:['ap-rec-role'] },
      { id:'storage-logs', role:'target', type:'Storage account', label:'sthacksmarterlabslogs', subtitle:'Sensitive operational exports', insight:'The account contains sensitive exports and still accepts public network traffic.', riskFactors:['Sensitive data','Public network access'], techniques:['T1530 Data from Cloud Storage'], recommendationIds:['ap-rec-storage'] },
    ],
    recommendations:[
      { id:'ap-rec-ssh', kind:'mitigating', title:'Close internet-exposed management ports on vm-prod-web-01', resource:'vm-prod-web-01', status:'Not started' },
      { id:'ap-rec-role', kind:'mitigating', title:'Remove the broad storage data role from mi-web-prod', resource:'mi-web-prod', status:'Not started' },
      { id:'ap-rec-storage', kind:'mitigating', title:'Disable public network access on sthacksmarterlabslogs', resource:'sthacksmarterlabslogs', status:'Not started' },
      { id:'ap-rec-vuln', kind:'additional', title:'Resolve high-severity vulnerabilities on vm-prod-web-01', resource:'vm-prod-web-01', status:'Not started' },
    ],
  },
  {
    id:'dfc-path-02', name:'Container breakout to node credential access', severity:'high', status:'In progress', assetType:'Kubernetes',
    firstSeen:'2026-07-21T14:08:00Z', lastSeen:'2026-08-01T18:25:00Z', affectedResources:5,
    start:'aks-prod/node-3', entryPoint:'Exposed vulnerable container', target:'kv-prod-app', chokePoints:['node-identity-prod'],
    path:['Privileged pod scheduled','Host namespace mounted','Node identity can read Key Vault secrets'],
    result:'Credential access and lateral movement path', scenario:'A vulnerable workload can cross the container boundary and inherit node-level access.',
    nodes:[
      { id:'image-api', role:'entry', type:'Container image', label:'api:v2.4.1', subtitle:'Critical package vulnerability', insight:'The deployed image contains a remotely exploitable package and is reachable through the public ingress.', riskFactors:['Known exploit available','Internet reachable'], techniques:['T1190 Exploit Public-Facing Application'], recommendationIds:['ap-rec-image'] },
      { id:'pod-api', role:'vulnerable', type:'Kubernetes pod', label:'pod-api-77', subtitle:'Privileged · host PID mounted', insight:'Privileged execution and host namespace access create the bridge from the workload to the node.', riskFactors:['Privileged container','Host namespace mounted'], techniques:['T1611 Escape to Host'], recommendationIds:['ap-rec-pod'] },
      { id:'node-identity', role:'choke', type:'Managed identity', label:'node-identity-prod', subtitle:'Key Vault Secrets User', insight:'Multiple workloads converge on this node identity, making its Key Vault access a high-value choke point.', riskFactors:['Shared node identity','Secrets read permission'], techniques:['T1552 Unsecured Credentials'], recommendationIds:['ap-rec-node-role'] },
      { id:'key-vault', role:'target', type:'Key vault', label:'kv-prod-app', subtitle:'Production application secrets', insight:'Compromise exposes credentials that can support further lateral movement.', riskFactors:['Business critical','Credential store'], techniques:['T1555 Credentials from Password Stores'], recommendationIds:['ap-rec-kv-network'] },
    ],
    recommendations:[
      { id:'ap-rec-image', kind:'mitigating', title:'Deploy a patched image for api:v2.4.1', resource:'api:v2.4.1', status:'In progress' },
      { id:'ap-rec-pod', kind:'mitigating', title:'Block privileged containers and host namespace mounts', resource:'aks-prod', status:'Not started' },
      { id:'ap-rec-node-role', kind:'mitigating', title:'Replace the shared node identity with workload identity', resource:'aks-prod', status:'Not started' },
      { id:'ap-rec-kv-network', kind:'additional', title:'Restrict Key Vault network access to approved private endpoints', resource:'kv-prod-app', status:'Not started' },
    ],
  },
  {
    id:'dfc-path-03', name:'SQL public access to reporting data', severity:'medium', status:'Pending', assetType:'SQL database',
    firstSeen:'2026-07-16T11:12:00Z', lastSeen:'2026-07-16T11:12:00Z', affectedResources:3,
    start:'sql-prod-reporting', entryPoint:'Public SQL endpoint', target:'reporting-db', chokePoints:['sql-prod-reporting'],
    path:['Firewall allows any internet source','SQL authentication remains enabled','Database contains customer exports'],
    result:'Initial access and collection risk', scenario:'A broadly exposed database endpoint protects a sensitive data target with local credentials.',
    nodes:[
      { id:'sql-endpoint', role:'entry', type:'SQL server', label:'sql-prod-reporting', subtitle:'0.0.0.0–255.255.255.255 allowed', insight:'The server firewall accepts connections from every public IPv4 address.', riskFactors:['Internet exposed','Wide firewall rule'], techniques:['T1133 External Remote Services'], recommendationIds:['ap-rec-sql-fw'] },
      { id:'sql-auth', role:'choke', type:'Authentication', label:'SQL authentication', subtitle:'Local username and password allowed', insight:'Local database credentials remain a viable authentication path if stolen or guessed.', riskFactors:['Basic authentication','No identity-based enforcement'], techniques:['T1110 Brute Force'], recommendationIds:['ap-rec-sql-entra'] },
      { id:'reporting-db', role:'target', type:'SQL database', label:'reporting-db', subtitle:'Customer financial exports', insight:'Sensitive-data discovery labels the database as a business-impacting target.', riskFactors:['Sensitive data','Business critical'], techniques:['T1213 Data from Information Repositories'], recommendationIds:['ap-rec-sql-audit'] },
    ],
    recommendations:[
      { id:'ap-rec-sql-fw', kind:'mitigating', title:'Remove the allow-all SQL firewall rule', resource:'sql-prod-reporting', status:'Not started' },
      { id:'ap-rec-sql-entra', kind:'mitigating', title:'Require Entra-only authentication', resource:'sql-prod-reporting', status:'Not started' },
      { id:'ap-rec-sql-audit', kind:'additional', title:'Enable SQL auditing for sensitive-data access', resource:'reporting-db', status:'Not started' },
    ],
  },
];

const SECONDARY_SURFACES = {
  'defender/reports': { crumb:'Defender › Other', title:'Reports', note:'Secondary reporting surface for lab review. The exam-relevant detail is in Threat analytics, Secure score, and incident queues.', links:[['Open Threat analytics','#/defender/threat-analytics'], ['Open Secure score','#/defender/secure-score']] },
  'defender/learning-hub': { crumb:'Defender › Other', title:'Learning hub', note:'Supporting study surface with pointers into the local hands-on flows.', links:[['Start Guided scenarios','#/defender/home'], ['Open Advanced hunting','#/defender/hunting']] },
  'defender/trials': { crumb:'Defender › Other', title:'Trials', note:'Chrome-only lab surface. Licensing and trials are outside this local simulator; practice workload behavior instead.', links:[['Open Settings','#/defender/settings'], ['Open Endpoints','#/defender/endpoints']] },
  'sentinel/news': { crumb:'Sentinel › General', title:'News and guides', note:'Supporting content surface. Current syllabus practice is covered by connectors, analytics, incidents, hunting, and graph views.', links:[['Open Data connectors','#/sentinel/data-connectors'], ['Open Sentinel Graph','#/sentinel/graph']] },
  'sentinel/repositories': { crumb:'Sentinel › Content management', title:'Repositories', note:'Supporting content lifecycle surface. Use Workspace manager to distribute rules and DCR-backed content across workspaces.', links:[['Open Workspace manager','#/sentinel/workspace-manager'], ['Open Content hub','#/sentinel/content-hub']] },
  'sentinel/community': { crumb:'Sentinel › Content management', title:'Community', note:'Supporting community surface. The lab keeps all content local and original.', links:[['Open Hunting','#/sentinel/hunting'], ['Open Analytics','#/sentinel/analytics']] },
  'defender-cloud/community': { crumb:'Defender for Cloud › General', title:'Community', note:'Supporting study surface for cloud security guidance. Use alerts, inventory, and attack paths for hands-on practice.', links:[['Open Security alerts','#/defender-cloud/alerts'], ['Open Attack paths','#/defender-cloud/attack-paths']] },
  'defender-cloud/workbooks': { crumb:'Defender for Cloud › General', title:'Workbooks', note:'Secondary dashboard surface for posture and workload protection summaries.', links:[['Open Recommendations','#/defender-cloud/recommendations'], ['Open Inventory','#/defender-cloud/inventory']] },
  'defender-cloud/diagnose': { crumb:'Defender for Cloud › General', title:'Diagnose and solve problems', note:'Secondary support surface. The lab models investigation decisions in alerts, inventory, and attack paths.', links:[['Open Security alerts','#/defender-cloud/alerts'], ['Open Environment settings','#/defender-cloud/environment']] },
};

function renderSecondarySurface(config) {
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">${esc(config.crumb)}</div>
        <h1>${esc(config.title)}</h1>
        <div class="page-subtitle">${esc(config.note)}</div>
      </div>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Supporting content</div>
      <div class="callout info">This route is intentionally small so navigation never dead-ends. It points back to the interactive SC-200 surfaces that exercise the skill.</div>
      <div class="tile-grid" style="margin-top:12px;">
        ${config.links.map(([label, href]) => `<a class="tile" href="${href}"><strong>${esc(label)}</strong><span>Open related lab surface</span></a>`).join('')}
      </div>
    </div>`;
}

VIEWS['defender/reports'] = () => renderSecondarySurface(SECONDARY_SURFACES['defender/reports']);
VIEWS['defender/learning-hub'] = () => renderSecondarySurface(SECONDARY_SURFACES['defender/learning-hub']);
VIEWS['defender/trials'] = () => renderSecondarySurface(SECONDARY_SURFACES['defender/trials']);
VIEWS['sentinel/news'] = () => renderSecondarySurface(SECONDARY_SURFACES['sentinel/news']);
VIEWS['sentinel/repositories'] = () => renderSecondarySurface(SECONDARY_SURFACES['sentinel/repositories']);
VIEWS['sentinel/community'] = () => renderSecondarySurface(SECONDARY_SURFACES['sentinel/community']);
VIEWS['defender-cloud/community'] = () => renderSecondarySurface(SECONDARY_SURFACES['defender-cloud/community']);
VIEWS['defender-cloud/workbooks'] = () => renderSecondarySurface(SECONDARY_SURFACES['defender-cloud/workbooks']);
VIEWS['defender-cloud/diagnose'] = () => renderSecondarySurface(SECONDARY_SURFACES['defender-cloud/diagnose']);

function defenderCloudMulticloudState() {
  return typeof currentDefenderCloudMulticloudState === 'function'
    ? currentDefenderCloudMulticloudState()
    : {
        aws: { onboarded:true, accountId:'111122223333', regions:['us-east-1','eu-west-1'], plans:['CSPM','Servers'], health:'Healthy', lastSync:'2026-06-15T12:00:00Z', bootstrap:'CloudFormation-style stack' },
        gcp: { onboarded:true, projectId:'proj-aaaa1111', regions:['us-central1','europe-west3'], plans:['CSPM','Containers','Databases'], health:'Warning', lastSync:'2026-06-14T18:30:00Z', bootstrap:'Cloud Shell bootstrap script' },
        fim: {
          enabled: true,
          monitored:['/etc/ssh/sshd_config','/var/log/auth.log','C:\\Windows\\System32\\drivers\\etc\\hosts','C:\\inetpub\\wwwroot\\web.config'],
          recentChanges:[
            { item:'/etc/ssh/sshd_config', change:'Unexpected allow-list edit', source:'AWS workload' },
            { item:'C:\\Windows\\System32\\drivers\\etc\\hosts', change:'Local name resolution change', source:'GCP VM' },
            { item:'/var/log/auth.log', change:'Burst of failed logons', source:'AWS workload' },
          ],
        },
        jit: { enabled:true, vm:'i-0b8d41f7c9a2e6f35', ports:['3389','22'], duration:'3 hours', requestState:'Approved', requestor:'cloud-admin@hacksmarterlabs.example', note:'Lab-only request surface; no real network access is opened.' },
      };
}

function defenderCloudInventoryRows() {
  const state = defenderCloudMulticloudState();
  const azRows = CLOUD_ASSETS.map(a => ({
    id: a.id,
    cloud: 'Azure',
    name: a.name,
    subLabel: a.subLabel || '',
    resourceId: a.resourceId,
    type: a.type,
    scope: a.subscription,
    region: a.region,
    exposure: a.exposure,
    risk: a.risk,
    alerts: a.alerts,
    recs: a.recs,
    alertResources: a.alertResources || [a.name],
    coverage: 'Protected',
  }));
  const mcRows = MC_RESOURCES.map(r => ({
    id: r.id,
    cloud: r.cloud,
    name: r.name,
    // AWS EC2 has no hostname in the inventory — the Name tag is the human label.
    subLabel: r.displayName ? `Name tag: ${r.displayName}` : '',
    resourceId: r.resourceId,
    type: r.type,
    scope: r.cloud === 'AWS' ? state.aws.accountId : state.gcp.projectId,
    region: r.region,
    exposure: r.exposure,
    risk: r.riskLevel,
    alerts: r.alerts,
    recs: r.recs,
    alertResources: [r.name],
    coverage: 'Protected',
  }));
  return [...azRows, ...mcRows];
}

// Every cloud alert, Azure plus the AWS/GCP connectors, in one list.
// Severity is normalized to lowercase because the fixtures disagree
// ('high' vs 'High') and the `sev` pill classes are lowercase.
// `status` falls back to Active — the Defender for Cloud alert states are
// Active, Dismissed, and Resolved.
function defenderCloudAlertRows() {
  const overrides = defenderCloudAlertStatusOverrides();
  return [
    ...CLOUD_ALERTS.map(a => ({ cloud:'Azure', ...a })),
    ...MC_ALERTS.map(a => ({ cloud:a.cloud, ...a })),
  ].map(a => ({
    ...a,
    severity: String(a.severity || 'medium').toLowerCase(),
    status: overrides[a.id] || a.status || 'Active',
  }));
}

function defenderCloudAlertStatusOverrides() {
  return typeof currentDefenderCloudAlertStatuses === 'function'
    ? currentDefenderCloudAlertStatuses()
    : {};
}

function defenderCloudAlertById(id) {
  return defenderCloudAlertRows().find(a => a.id === id) || null;
}

function defenderCloudIncidentById(id) {
  return CLOUD_INCIDENTS.find(i => i.id === id) || null;
}

// Alerts that belong to the same security incident as this one. A security
// incident is a correlation of alerts sharing an entity or kill-chain pattern,
// so "related alerts" means "the other members of my incident".
function defenderCloudRelatedAlerts(alert) {
  if (!alert || !alert.incidentId) return [];
  const incident = defenderCloudIncidentById(alert.incidentId);
  if (!incident) return [];
  const rows = defenderCloudAlertRows();
  return incident.alertIds
    .filter(id => id !== alert.id)
    .map(id => rows.find(a => a.id === id))
    .filter(Boolean);
}

function defenderCloudIncidentAlerts(incident) {
  const rows = defenderCloudAlertRows();
  return (incident.alertIds || []).map(id => rows.find(a => a.id === id)).filter(Boolean);
}

function defenderCloudAttackPaths() {
  return [
    ...CLOUD_ATTACK_PATHS.map(p => ({ cloud:'Azure', ...p })),
    ...(typeof MC_ATTACK_PATHS !== 'undefined' ? MC_ATTACK_PATHS : []),
  ];
}

function defenderCloudAttackPathById(id) {
  return defenderCloudAttackPaths().find(path => path.id === id) || null;
}

function defenderCloudAttackPathUi() {
  return typeof currentDefenderCloudAttackPathUi === 'function'
    ? currentDefenderCloudAttackPathUi()
    : { tab:'overview', selectedId:null, nodeId:null, detailTab:'insights', filters:{ risk:'any', asset:'any', status:'any', time:'90' } };
}

function defenderCloudAttackPathRecState() {
  return typeof currentDefenderCloudAttackPathRemediation === 'function'
    ? currentDefenderCloudAttackPathRemediation()
    : {};
}

function defenderCloudAttackPathRecStatus(rec) {
  return defenderCloudAttackPathRecState()[rec.id] || rec.status || 'Not started';
}

function defenderCloudAttackPathStatus(path) {
  const mitigating = (path.recommendations || []).filter(rec => rec.kind === 'mitigating');
  if (mitigating.length && mitigating.every(rec => defenderCloudAttackPathRecStatus(rec) === 'Resolved')) return 'Resolved';
  if (mitigating.some(rec => ['In progress','Resolved'].includes(defenderCloudAttackPathRecStatus(rec)))) return 'In progress';
  return path.status || 'Pending';
}

function defenderCloudAttackPathStatusTag(status) {
  return status === 'Resolved' ? 'green' : status === 'In progress' ? 'orange' : '';
}

function defenderCloudAttackPathRole(role) {
  return ({ entry:['↗','Entry point'], vulnerable:['!','Vulnerable resource'], choke:['◆','Choke point'], target:['◎','Target asset'] })[role]
    || ['•','Resource'];
}

function defenderCloudFilteredAttackPaths(paths, filters) {
  const now = Date.now();
  return paths.filter(path => {
    if (filters.risk !== 'any' && path.severity !== filters.risk) return false;
    if (filters.asset !== 'any' && path.assetType !== filters.asset) return false;
    if (filters.status !== 'any' && defenderCloudAttackPathStatus(path) !== filters.status) return false;
    if (filters.time !== 'any') {
      const ageDays = (now - new Date(path.lastSeen).getTime()) / 86400000;
      if (ageDays > Number(filters.time)) return false;
    }
    return true;
  });
}

function renderDefenderCloudAttackPathTabs(active) {
  return `<div class="tabs dfc-attack-tabs" role="tablist" aria-label="Attack path views">
    ${[['overview','Overview'],['list','Attack paths'],['choke','Choke points']].map(([id, label]) => `
      <button type="button" class="tab ${active === id ? 'active' : ''}" role="tab" aria-selected="${active === id}"
        onclick="setDefenderCloudAttackPathTab('${id}')">${label}</button>`).join('')}
  </div>`;
}

function renderDefenderCloudAttackPathOverview(paths) {
  const active = paths.filter(path => defenderCloudAttackPathStatus(path) !== 'Resolved');
  const chokeCounts = new Map();
  paths.forEach(path => (path.chokePoints || []).forEach(label => chokeCounts.set(label, (chokeCounts.get(label) || 0) + 1)));
  const chokeRows = [...chokeCounts.entries()].sort((a,b) => b[1] - a[1]);
  const trends = [
    { label:'Jun 29', count:3 }, { label:'Jul 6', count:4 }, { label:'Jul 13', count:5 },
    { label:'Jul 20', count:5 }, { label:'Jul 27', count:4 }, { label:'Aug 2', count:active.length },
  ];
  return `
    <div class="kpi-strip">
      <div class="kpi"><span class="kpi-label">Active paths</span><span class="kpi-value">${active.length}</span><span class="kpi-delta">Externally driven</span></div>
      <div class="kpi"><span class="kpi-label">High risk</span><span class="kpi-value">${active.filter(path => path.severity === 'high').length}</span></div>
      <div class="kpi"><span class="kpi-label">Affected resources</span><span class="kpi-value">${active.reduce((sum, path) => sum + (path.affectedResources || 0), 0)}</span></div>
      <div class="kpi"><span class="kpi-label">Choke points</span><span class="kpi-value">${chokeRows.length}</span></div>
    </div>
    <div class="two-col dfc-attack-overview-grid">
      <section class="card card-body">
        <div class="card-toolbar dfc-card-toolbar"><strong>Attack paths over time</strong><span class="muted">Last 6 weeks</span></div>
        <div class="dfc-attack-trend" aria-label="Weekly active attack path counts">
          ${trends.map(item => `<div class="dfc-trend-column"><strong>${item.count}</strong><i style="height:${Math.max(16, item.count * 20)}px"></i><span>${item.label}</span></div>`).join('')}
        </div>
      </section>
      <section class="card">
        <div class="card-toolbar"><strong>Top choke points</strong><button class="link-button strong" onclick="setDefenderCloudAttackPathTab('choke')">View all</button></div>
        ${chokeRows.map(([label, count]) => `<div class="card-body border-top dfc-overview-row"><span><span class="dfc-role-icon choke">◆</span><strong>${esc(label)}</strong></span><span class="tag">${count} ${count === 1 ? 'path' : 'paths'}</span></div>`).join('')}
      </section>
      <section class="card">
        <div class="card-toolbar"><strong>Top attack path scenarios</strong><button class="link-button strong" onclick="setDefenderCloudAttackPathTab('list')">View list</button></div>
        ${active.slice().sort((a,b) => ({high:3,medium:2,low:1}[b.severity] - ({high:3,medium:2,low:1}[a.severity]))).slice(0,3).map(path => `
          <button class="dfc-scenario-row border-top" onclick="openDefenderCloudAttackPath('${esc(path.id)}')">
            <span><span class="sev ${path.severity}">${cap(path.severity)}</span><strong>${esc(path.name)}</strong><small>${esc(path.cloud)} · ${path.affectedResources} resources</small></span><span aria-hidden="true">›</span>
          </button>`).join('')}
      </section>
      <section class="card">
        <div class="card-toolbar"><strong>Top entry points and targets</strong><span class="muted">Active paths</span></div>
        ${active.slice(0,3).map(path => `<div class="card-body border-top dfc-entry-target"><span><small>Entry point</small><strong>${esc(path.entryPoint)}</strong></span><span aria-hidden="true">→</span><span><small>Target</small><strong>${esc(path.target)}</strong></span></div>`).join('')}
      </section>
    </div>`;
}

function renderDefenderCloudAttackPathList(paths, filters) {
  const rows = defenderCloudFilteredAttackPaths(paths, filters);
  const assetTypes = [...new Set(paths.map(path => path.assetType))].sort();
  return `
    <div class="filterbar dfc-attack-filterbar" aria-label="Attack path filters">
      <label>Risk level<select class="text-input" onchange="setDefenderCloudAttackPathFilter('risk', this.value)">
        ${[['any','Any'],['high','High'],['medium','Medium'],['low','Low']].map(([value,label]) => `<option value="${value}" ${filters.risk === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      <label>Asset type<select class="text-input" onchange="setDefenderCloudAttackPathFilter('asset', this.value)">
        <option value="any">Any</option>${assetTypes.map(value => `<option value="${esc(value)}" ${filters.asset === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}
      </select></label>
      <label>Remediation status<select class="text-input" onchange="setDefenderCloudAttackPathFilter('status', this.value)">
        ${['any','Pending','In progress','Resolved'].map(value => `<option value="${value}" ${filters.status === value ? 'selected' : ''}>${value === 'any' ? 'Any' : value}</option>`).join('')}
      </select></label>
      <label>Time frame<select class="text-input" onchange="setDefenderCloudAttackPathFilter('time', this.value)">
        ${[['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days'],['any','Any time']].map(([value,label]) => `<option value="${value}" ${filters.time === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      <span class="muted dfc-filter-count">${rows.length} of ${paths.length} paths</span>
    </div>
    <div class="card table-scroll">
      <table class="grid dfc-attack-table">
        <thead><tr><th>Risk</th><th>Attack path</th><th>Cloud</th><th>Entry point</th><th>Target asset</th><th>Affected</th><th>Status</th><th>Last observed</th></tr></thead>
        <tbody>${rows.length ? rows.map(path => {
          const status = defenderCloudAttackPathStatus(path);
          return `<tr class="clickable-row" tabindex="0" onclick="openDefenderCloudAttackPath('${esc(path.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDefenderCloudAttackPath('${esc(path.id)}')}">
            <td><span class="sev ${path.severity}">${cap(path.severity)}</span></td>
            <td><strong>${esc(path.name)}</strong><br><span class="muted">${esc(path.scenario)}</span></td>
            <td>${esc(path.cloud)}</td><td>${esc(path.entryPoint)}</td><td>${esc(path.target)}</td><td>${path.affectedResources}</td>
            <td><span class="tag ${defenderCloudAttackPathStatusTag(status)}">${esc(status)}</span></td><td>${fmtTime(path.lastSeen)}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="8"><div class="dfc-empty"><strong>No attack paths match these filters.</strong><span>Change one or more filters to widen the result set.</span></div></td></tr>`}</tbody>
      </table>
    </div>`;
}

function renderDefenderCloudChokePoints(paths) {
  const nodes = new Map();
  paths.forEach(path => (path.nodes || []).filter(node => node.role === 'choke').forEach(node => {
    const current = nodes.get(node.label) || { node, paths:[] };
    current.paths.push(path);
    nodes.set(node.label, current);
  }));
  return `<div class="callout info dfc-learn-note">A choke point is a resource or identity where attack paths converge. Fixing it can break more than one route to a critical target.</div>
    <div class="card table-scroll"><table class="grid">
      <thead><tr><th>Choke point</th><th>Type</th><th>Connected paths</th><th>Risk factors</th><th>Recommended focus</th></tr></thead>
      <tbody>${[...nodes.values()].map(item => `<tr>
        <td><span class="dfc-role-icon choke">◆</span> <strong>${esc(item.node.label)}</strong></td><td>${esc(item.node.type)}</td>
        <td>${item.paths.map(path => `<button class="link-button strong" onclick="openDefenderCloudAttackPath('${esc(path.id)}')">${esc(path.name)}</button>`).join('<br>')}</td>
        <td>${item.node.riskFactors.map(factor => `<span class="tag">${esc(factor)}</span>`).join(' ')}</td>
        <td>${item.node.recommendationIds.length} path-breaking ${item.node.recommendationIds.length === 1 ? 'recommendation' : 'recommendations'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

function renderDefenderCloudAttackPathDetail(path, ui) {
  const selectedNode = path.nodes.find(node => node.id === ui.nodeId) || path.nodes[0];
  const detailTab = ui.detailTab || 'insights';
  const status = defenderCloudAttackPathStatus(path);
  const selectedRecommendations = path.recommendations.filter(rec => selectedNode.recommendationIds.includes(rec.id));
  const remediationRows = kind => path.recommendations.filter(rec => rec.kind === kind).map(rec => {
    const recStatus = defenderCloudAttackPathRecStatus(rec);
    return `<div class="dfc-remediation-row">
      <div><span class="tag ${defenderCloudAttackPathStatusTag(recStatus)}">${esc(recStatus)}</span><strong>${esc(rec.title)}</strong><small>${esc(rec.resource)}</small></div>
      <div class="dfc-remediation-actions">
        ${recStatus === 'Not started' ? `<button class="btn btn-secondary btn-sm" onclick="updateDefenderCloudAttackPathRecommendation('${esc(rec.id)}','In progress')">Start</button>` : ''}
        ${recStatus !== 'Resolved' ? `<button class="btn btn-primary btn-sm" onclick="updateDefenderCloudAttackPathRecommendation('${esc(rec.id)}','Resolved')">Mark resolved</button>` : '<span class="muted">Complete</span>'}
      </div>
    </div>`;
  }).join('');
  return `
    <button class="link-button strong dfc-back" onclick="closeDefenderCloudAttackPath()">← All attack paths</button>
    <div class="page-header dfc-detail-header"><div>
      <div class="pill-row"><span class="sev ${path.severity}">${cap(path.severity)} risk</span><span class="tag ${defenderCloudAttackPathStatusTag(status)}">${esc(status)}</span><span class="tag">${esc(path.cloud)}</span></div>
      <h1>${esc(path.name)}</h1><div class="page-subtitle">${esc(path.scenario)}</div>
    </div><div class="page-actions"><a class="btn btn-secondary" href="#/defender-cloud/explorer">Open Cloud Security Explorer</a></div></div>
    ${status === 'Resolved' ? '<div class="callout success">All path-breaking recommendations are resolved. The path can remain visible for up to 24 hours while the graph refreshes.</div>' : ''}
    <div class="dfc-path-detail-grid">
      <section class="card card-body dfc-path-map-card">
        <div class="card-toolbar dfc-card-toolbar"><div><strong>Attack Path Map</strong><span class="muted">Select a node to investigate it</span></div><span class="muted">${path.nodes.length} nodes · ${path.affectedResources} affected resources</span></div>
        <div class="dfc-path-map" role="list" aria-label="Attack path graph">
          ${path.nodes.map((node, index) => {
            const [icon, roleLabel] = defenderCloudAttackPathRole(node.role);
            return `${index ? '<span class="dfc-path-arrow" aria-hidden="true">→</span>' : ''}<button type="button" role="listitem" class="dfc-path-node ${node.role} ${selectedNode.id === node.id ? 'selected' : ''}" onclick="selectDefenderCloudAttackPathNode('${esc(node.id)}')">
              <span class="dfc-role-icon ${node.role}">${icon}</span><small>${roleLabel}</small><strong>${esc(node.label)}</strong><span>${esc(node.type)}</span><em>${esc(node.subtitle)}</em>
            </button>`;
          }).join('')}
        </div>
        <div class="dfc-path-legend"><span><i class="entry"></i>Entry point</span><span><i class="vulnerable"></i>Vulnerable</span><span><i class="choke"></i>Choke point</span><span><i class="target"></i>Target asset</span></div>
      </section>
      <aside class="card card-body dfc-node-inspector">
        <div class="pill-row"><span class="dfc-role-icon ${selectedNode.role}">${defenderCloudAttackPathRole(selectedNode.role)[0]}</span><span class="tag">${esc(selectedNode.type)}</span></div>
        <h2>${esc(selectedNode.label)}</h2><div class="muted">${esc(selectedNode.subtitle)}</div>
        <div class="tabs" role="tablist">
          ${[['insights','Insights'],['recommendations','Recommendations'],['remediation','Remediation']].map(([id,label]) => `<button type="button" class="tab ${detailTab === id ? 'active' : ''}" onclick="setDefenderCloudAttackPathDetailTab('${id}')">${label}</button>`).join('')}
        </div>
        ${detailTab === 'insights' ? `<div class="dfc-inspector-body"><div class="alert-section-title">Why this node matters</div><p>${esc(selectedNode.insight)}</p><div class="alert-section-title">Risk factors</div><div class="pill-row">${selectedNode.riskFactors.map(factor => `<span class="tag orange">${esc(factor)}</span>`).join('')}</div><div class="alert-section-title">MITRE ATT&amp;CK</div>${selectedNode.techniques.map(item => `<div class="detail-row"><span>Technique</span><strong>${esc(item)}</strong></div>`).join('')}</div>` : ''}
        ${detailTab === 'recommendations' ? `<div class="dfc-inspector-body"><div class="alert-section-title">Associated recommendations</div>${selectedRecommendations.map(rec => `<div class="dfc-node-rec"><span class="tag ${defenderCloudAttackPathStatusTag(defenderCloudAttackPathRecStatus(rec))}">${esc(defenderCloudAttackPathRecStatus(rec))}</span><strong>${esc(rec.title)}</strong><small>${rec.kind === 'mitigating' ? 'Breaks this attack path' : 'Reduces exploitation risk'}</small></div>`).join('') || '<div class="muted">No recommendation is mapped to this node.</div>'}</div>` : ''}
        ${detailTab === 'remediation' ? `<div class="dfc-inspector-body"><div class="alert-section-title">Path remediation</div><p class="muted">Resolve path-breaking recommendations first. Additional recommendations lower risk but do not by themselves remove the path.</p><button class="btn btn-primary" onclick="setDefenderCloudAttackPathDetailTab('remediation');document.getElementById('dfc-remediation').scrollIntoView({behavior:'smooth'})">Review all recommendations</button></div>` : ''}
      </aside>
    </div>
    <section id="dfc-remediation" class="card card-body dfc-remediation-card">
      <div class="card-toolbar dfc-card-toolbar"><div><strong>Remediation</strong><span class="muted">Track work for this attack path</span></div><button class="btn btn-ghost btn-sm" onclick="resetDefenderCloudAttackPathRemediation('${esc(path.id)}')">Reset lab progress</button></div>
      <div class="alert-section-title">Recommendations that mitigate the attack path</div>${remediationRows('mitigating')}
      <details class="dfc-additional-recs"><summary>Additional recommendations (${path.recommendations.filter(rec => rec.kind === 'additional').length})</summary>${remediationRows('additional')}</details>
    </section>`;
}

VIEWS['defender/action-center'] = () => `
  <div class="page-header">
    <div><div class="breadcrumb">Investigation &amp; response › <strong>Action center</strong></div><h1>Action center</h1><div class="page-subtitle">Review completed and pending response actions from AIR, MDE, and MDO.</div></div>
    <div class="page-actions"><a class="btn btn-secondary" href="#/defender/air">Open AIR center</a></div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Pending approval</span><span class="kpi-value">${ACTION_CENTER_ITEMS.filter(i=>i.status.includes('Pending')).length}</span></div>
    <div class="kpi"><span class="kpi-label">Completed</span><span class="kpi-value">${ACTION_CENTER_ITEMS.filter(i=>i.status==='Completed').length}</span></div>
    <div class="kpi"><span class="kpi-label">Sources</span><span class="kpi-value">3</span><span class="kpi-delta">AIR · MDE · MDO</span></div>
    <div class="kpi"><span class="kpi-label">Linked incidents</span><span class="kpi-value">2</span></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>Response actions</strong><span class="muted">Lab-static approvals</span></div>
    <table class="grid">
      <thead><tr><th>Status</th><th>Source</th><th>Action</th><th>Target</th><th>Incident</th><th>Age</th><th></th></tr></thead>
      <tbody>${ACTION_CENTER_ITEMS.map(i => `
        <tr>
          <td><span class="tag ${i.status === 'Completed' ? 'green' : 'orange'}">${esc(i.status)}</span></td>
          <td>${esc(i.source)}</td>
          <td><strong>${esc(i.action)}</strong></td>
          <td class="kv">${esc(i.target)}</td>
          <td><button class="link-button strong" onclick="openIncident('${esc(i.incident)}')">${esc(i.incident)}</button></td>
          <td>${esc(i.age)}</td>
          <td><button class="btn btn-sm btn-primary" onclick="toast('Action reviewed in the lab.')">Review</button></td>
        </tr>`).join('')}</tbody>
    </table>
  </div>`;

VIEWS['defender/email-collab'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Email &amp; collaboration › <strong>Investigations</strong></div>
      <h1>Email and collaboration investigation</h1>
      <div class="page-subtitle">Practice MDO triage paths for phishing, mailbox rules, submissions, and OAuth follow-on activity.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/defender/threat-explorer">Open Threat Explorer</a>
      <a class="btn btn-secondary" href="#/defender/cloud-apps">Cloud apps OAuth pivot</a>
    </div>
  </div>
  <div class="two-col">
    <section class="card">
      <div class="card-toolbar"><strong>MDO investigation queue</strong><span class="muted">Fictional messages and users</span></div>
      <table class="grid">
        <thead><tr><th>Severity</th><th>Investigation</th><th>User</th><th>Evidence</th><th>Response</th></tr></thead>
        <tbody>${MDO_INVESTIGATION_ROWS.map(r => `
          <tr>
            <td><span class="sev ${r.sev}">${cap(r.sev)}</span></td>
            <td><button class="link-button strong" onclick="openIncident('${esc(r.incident)}')">${esc(r.title)}</button></td>
            <td>${esc(r.user)}</td>
            <td>${esc(r.evidence)}</td>
            <td>${esc(r.action)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">Hands-on flow</div>
      <div class="flowline vertical-flow">
        <div class="flow-step"><strong>Open alert</strong><span>Start from the MDO URL click alert in INC-1042.</span></div>
        <div class="flow-step"><strong>Inspect evidence</strong><span>Review clicked URL, delivery action, mailbox events, and user activity.</span></div>
        <div class="flow-step"><strong>Pivot</strong><span>Move to Threat Explorer for campaign pivots, then to Cloud Apps for the risky OAuth grant and Purview Audit for consent events.</span></div>
        <div class="flow-step"><strong>Respond</strong><span>Purge mail, revoke sessions, remove app consent, and close the incident with classification.</span></div>
      </div>
      <div class="callout info" style="margin-top:12px;">
        Threat Explorer is the dedicated mail triage drill-down. Use it to pivot by verdict, campaign, and targeted user before you take remediation action.
      </div>
      <div class="sidepanel-footer" style="padding-top:12px;">
        <a class="btn btn-primary" href="#/defender/threat-explorer">Open Threat Explorer</a>
        <a class="btn btn-secondary" href="#/defender/email-collab/threat-explorer/campaigns">Campaign pivots</a>
      </div>
    </section>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Mail response study card</strong>
      <span class="muted">Use the full explorer for pivots and entity detail</span>
    </div>
    <div class="tile-grid">
      <a class="tile" href="#/defender/threat-explorer"><strong>Threat Explorer</strong><span>Filter phish and malware waves, inspect headers, and queue remediation.</span></a>
      <a class="tile" href="#/defender/cloud-apps"><strong>Cloud Apps OAuth</strong><span>Continue the phishing-to-consent chain and review risky app activity.</span></a>
      <a class="tile" href="#/purview/audit"><strong>Purview Audit</strong><span>Search consent, login, and Copilot interactions across the timeline.</span></a>
    </div>
  </div>`;

VIEWS['defender/endpoints'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Endpoints › <strong>Endpoint security ops</strong></div><h1>Endpoint security operations</h1><div class="page-subtitle">Shortcut surface for MDE device settings, ASR policy, live response, and device inventory.</div></div></div>
  <div class="tile-grid">
    <a class="tile" href="#/defender/devices"><strong>Device inventory</strong><span>Open device overview, timeline, live response, and package collection.</span></a>
    <a class="tile" href="#/defender/settings"><strong>MDE settings</strong><span>Advanced features, device groups, roles, and automation levels.</span></a>
    <a class="tile" href="#/defender/asr-policy"><strong>ASR policies</strong><span>Audit/block states, exclusions, and expected impact.</span></a>
    <a class="tile" href="#/defender/custom-detections"><strong>Custom detections</strong><span>Promote Advanced hunting queries to endpoint actions.</span></a>
  </div>`;

VIEWS['defender/exposure'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Exposure management › <strong>Overview</strong></div><h1>Exposure management</h1><div class="page-subtitle">Prioritize exposed assets by incident linkage, cloud attack paths, and secure score recommendations.</div></div></div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Critical assets</span><span class="kpi-value">7</span></div>
    <div class="kpi"><span class="kpi-label">Open paths</span><span class="kpi-value">${CLOUD_ATTACK_PATHS.length}</span></div>
    <div class="kpi"><span class="kpi-label">High recs</span><span class="kpi-value">${DEFENDER_CLOUD_RECS.filter(r=>r.severity==='high').length}</span></div>
    <div class="kpi"><span class="kpi-label">Active incidents</span><span class="kpi-value">${INCIDENTS.filter(i=>i.status!=='Resolved').length}</span></div>
  </div>
  <div class="two-col">
    <section class="card card-body"><div class="alert-section-title">Exposure priorities</div><ul><li>Resolve public management ports on internet-facing VMs before tuning low-value posture findings.</li><li>Use Defender for Cloud attack paths when a resource appears in a workload-protection alert.</li><li>Pivot endpoint exposure to device inventory and cloud exposure to inventory/attack paths.</li></ul></section>
    <section class="card"><div class="card-toolbar"><strong>Related attack paths</strong><a class="chip-link" href="#/defender-cloud/attack-paths">Open cloud paths →</a></div>${CLOUD_ATTACK_PATHS.map(p => `<div class="card-body border-top"><span class="sev ${p.severity}">${cap(p.severity)}</span> <strong>${esc(p.name)}</strong><div class="muted">${esc(p.result)}</div></div>`).join('')}</section>
  </div>`;

VIEWS['defender/intel-explorer'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Threat intelligence › <strong>Intel explorer</strong></div><h1>Intel explorer</h1><div class="page-subtitle">Static IOC triage surface using the lab's Sentinel threat intelligence indicators.</div></div><div class="page-actions"><a class="btn btn-secondary" href="#/sentinel/threat-intel">Sentinel threat intel</a></div></div>
  <div class="card">
    <div class="card-toolbar"><strong>Indicators in this lab</strong><span class="muted">Mapped to synthetic events only</span></div>
    <table class="grid"><thead><tr><th>Type</th><th>Indicator</th><th>Confidence</th><th>Scenario</th><th>Pivot</th></tr></thead><tbody>
      <tr><td>IP</td><td class="kv">203.0.113.10</td><td>High</td><td>TI match synthetic transaction</td><td><a class="chip-link" href="#/sentinel/threat-intel">Open TI lab</a></td></tr>
      <tr><td>Domain</td><td class="kv">bad-demo.example</td><td>Medium</td><td>Phishing and command channel demo</td><td><a class="chip-link" href="#/sentinel/logs">Open logs</a></td></tr>
      <tr><td>Hash</td><td class="kv">aaaabbbbcccc...</td><td>Low</td><td>Scanner suppression gotcha</td><td><a class="chip-link" href="#/defender/suppression">Open suppression</a></td></tr>
    </tbody></table>
  </div>`;

VIEWS['sentinel/search'] = () => {
  const restoreJob = currentSentinelRestoreJob();
  const complete = restoreJob.status === 'complete';
  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Sentinel › <strong>Search</strong></div>
      <h1>Search</h1>
      <div class="page-subtitle">Run investigation searches across Basic, Analytics, Data lake, and summary-table patterns.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-primary" href="#/sentinel/hunting">Open hunting workspace</a>
      <button class="btn btn-secondary" onclick="runSentinelRestoreJob()">Run restore job</button>
    </div>
  </div>
  <div class="tile-grid">
    <a class="tile" href="#/sentinel/hunting"><strong>Basic-table search job</strong><span>Recover older NetworkLogs_CL rows through materialized search results.</span></a>
    <a class="tile" href="#/sentinel/data-lake-jobs"><strong>Data lake KQL job</strong><span>Run long-range historical hunts and review results tables.</span></a>
    <a class="tile" href="#/sentinel/summary-rules"><strong>Summary table query</strong><span>Compare noisy raw telemetry with aggregate summary output.</span></a>
    <a class="tile" href="#/sentinel/logs"><strong>Logs</strong><span>Inspect current Sentinel fixture rows and copy KQL.</span></a>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Restore historical data</strong>
      <span class="muted">${restoreJob.sourceTable} → ${restoreJob.resultTable}</span>
    </div>
    <div class="two-col">
      <div class="card card-body">
        <div class="alert-section-title">Job status</div>
        <div class="callout ${complete ? 'success' : restoreJob.status === 'running' ? 'warn' : 'info'}">
          <strong>${restoreJob.status === 'idle' ? 'Not started' : restoreJob.status === 'running' ? 'Running' : 'Complete'}</strong>
          <div>${esc(restoreJob.scopeNote)}</div>
        </div>
        <dl class="summary-info" style="margin-top:12px;">
          <dt>Source table</dt><dd>${esc(restoreJob.sourceTable)}</dd>
          <dt>Result table</dt><dd>${esc(restoreJob.resultTable)}</dd>
          <dt>Scope</dt><dd>${esc(restoreJob.scope)}</dd>
        </dl>
        <div class="callout info" style="margin-top:12px;">${esc(restoreJob.costNote)}</div>
      </div>
      <div class="card card-body">
        <div class="alert-section-title">Restore query</div>
        <textarea class="kql" readonly>${esc(SENTINEL_RESTORE_JOB.query)}</textarea>
        <div class="sidepanel-footer" style="padding-top:12px;">
          <button class="btn btn-primary" onclick="runSentinelRestoreJob()">Restore table</button>
          <a class="btn btn-secondary" href="#/sentinel/logs">Open logs</a>
        </div>
      </div>
    </div>
    ${complete ? `
      <div class="card" style="margin-top:16px;">
        <div class="card-toolbar"><strong>${esc(restoreJob.resultTable)}</strong><span class="muted">${SENTINEL_RESTORE_JOB.results.length} rows restored</span></div>
        <table class="grid">
          <thead><tr><th>TimeGenerated</th><th>DnsQuery</th><th>QueryCount</th><th>UniqueHosts</th><th>SourceTable</th></tr></thead>
          <tbody>
            ${SENTINEL_RESTORE_JOB.results.map(r => `
              <tr>
                <td>${fmtTime(r.TimeGenerated)}</td>
                <td class="kv">${esc(r.DnsQuery)}</td>
                <td>${r.QueryCount}</td>
                <td>${r.UniqueHosts}</td>
                <td>${esc(r.SourceTable)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  </div>`;
};

VIEWS['sentinel/entity-behavior'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Threat management › <strong>Entity behavior</strong></div><h1>Entity behavior</h1><div class="page-subtitle">UEBA-style risk context for users, hosts, and IPs that feed incidents, anomalies, and hunting pivots.</div></div><div class="page-actions"><a class="btn btn-secondary" href="#/sentinel/settings">UEBA settings</a></div></div>
  <div class="two-col">
    <section class="card">
      <div class="card-toolbar"><strong>Behavioral entities</strong><span class="muted">Fictional UEBA scores</span></div>
      <table class="grid">
        <thead><tr><th>Entity</th><th>Type</th><th>Score</th><th>Top anomaly</th><th>Pivot</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>jane.doe@hacksmarterlabs.example</td><td>Account</td><td><span class="sev high">92</span></td><td>OAuth grant after phishing click</td><td><a class="chip-link" href="#/sentinel/graph">Graph</a></td><td><button class="btn btn-primary btn-sm" onclick="runSentinelEntityPlaybook('jane.doe@hacksmarterlabs.example', 'Sentinel entity behavior')">Run playbook (entity)</button></td></tr>
          <tr><td>FIN-FS-02</td><td>Host</td><td><span class="sev high">88</span></td><td>Rare encryption process and service stop</td><td><a class="chip-link" href="#/defender/device">Device</a></td><td><button class="btn btn-primary btn-sm" onclick="runSentinelEntityPlaybook('FIN-FS-02', 'Sentinel entity behavior')">Run playbook (entity)</button></td></tr>
          <tr><td>10.5.12.44</td><td>IP</td><td><span class="sev medium">67</span></td><td>Repeated IOC destination contact</td><td><a class="chip-link" href="#/sentinel/hunting/dns">DNS hunt</a></td><td><button class="btn btn-primary btn-sm" onclick="runSentinelEntityPlaybook('10.5.12.44', 'Sentinel entity behavior')">Run playbook (entity)</button></td></tr>
        </tbody>
      </table>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">How UEBA supports SC-200 tasks</div>
      <ul><li>Entity pages summarize peer baselines, alerts, incidents, and anomalies.</li><li>Anomaly rules can enrich hunting and scheduled analytics rules.</li><li>Risky users and devices should be validated against evidence before response.</li></ul>
      <div class="callout info" style="margin-top:12px;">The entity-trigger playbook action loads the same playbook detail used in the automation surface so the pivot stays walkable.</div>
    </section>
  </div>`;

VIEWS['sentinel/watchlist'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Configuration › <strong>Watchlist</strong></div><h1>Watchlists</h1><div class="page-subtitle">Use watchlists to enrich KQL detections with controlled lists such as VIP users, approved scanners, and Tier 0 apps.</div></div><div class="page-actions"><button class="btn btn-primary" onclick="toast('Watchlist upload simulated.')">+ Add watchlist</button></div></div>
  <div class="card"><div class="card-toolbar"><strong>Watchlists</strong><span class="muted">Local fixture rows</span></div><table class="grid"><thead><tr><th>Name</th><th>Alias</th><th>Items</th><th>Updated</th><th>Detection use</th></tr></thead><tbody>${SENTINEL_WATCHLIST_ROWS.map(w => `<tr><td><strong>${esc(w.name)}</strong></td><td class="kv">${esc(w.alias)}</td><td>${w.items}</td><td>${fmtTime(w.updated)}</td><td>${esc(w.use)}</td></tr>`).join('')}</tbody></table></div>
  <div class="card card-body" style="margin-top:16px;"><div class="alert-section-title">KQL pattern</div><pre class="kql">let VIPs = _GetWatchlist('vip_accounts') | project UserPrincipalName;
SigninLogs
| where UserPrincipalName in (VIPs)
| where RiskLevel == "High"</pre></div>`;

VIEWS['sentinel/settings'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Configuration › <strong>Settings</strong></div><h1>Sentinel settings</h1><div class="page-subtitle">Workspace-level controls for UEBA, retention decisions, and content lifecycle.</div></div></div>
  <div class="two-col">
    <section class="card card-body"><div class="alert-section-title">UEBA enablement</div>
      <div class="setting-row"><div><strong>Entity behavior analytics</strong><span>Builds behavioral context for accounts, hosts, and IPs.</span></div><label class="toggle"><input type="checkbox" checked><span></span></label></div>
      <div class="setting-row"><div><strong>Directory data sync</strong><span>Enriches accounts with department, manager, and role context.</span></div><label class="toggle"><input type="checkbox" checked><span></span></label></div>
      <div class="setting-row"><div><strong>Anomaly enrichment</strong><span>Feeds customizable anomaly rules and hunting pivots.</span></div><label class="toggle"><input type="checkbox" checked><span></span></label></div>
      <a class="chip-link" href="#/sentinel/entity-behavior">Open Entity behavior →</a>
    </section>
    <section class="card card-body"><div class="alert-section-title">Workspace operations</div><ul><li>Use Workspace manager to publish analytics, workbooks, and automation to member workspaces.</li><li>Use Data connectors for DCR-backed Windows, CEF, Azure Activity, and custom ingestion labs.</li><li>Use Analytics and Anomalies for detection engineering coverage.</li></ul><a class="chip-link" href="#/sentinel/workspace-manager">Open Workspace manager →</a></section>
  </div>`;

VIEWS['sentinel/workspace-manager'] = () => {
  const content = [
    { type:'Analytics rules', selected:5, total:SENTINEL_RULES.length, link:'#/sentinel/analytics', detail:'Scheduled, NRT, TI, and ML behavior analytics examples' },
    { type:'Hunting queries', selected:4, total:SAVED_QUERIES.length, link:'#/defender/hunting', detail:'Reusable Advanced hunting and Sentinel search patterns' },
    { type:'Workbooks', selected:3, total:5, link:'#/sentinel/workbooks', detail:'SOC overview, UEBA, and ingestion health panels' },
    { type:'Automation', selected:2, total:3, link:'#/sentinel/automation', detail:'Playbooks and automation rules tied to incident response' },
    { type:'DCR-backed connectors', selected:4, total:SENTINEL_INGESTION_LABS.length + 1, link:'#/sentinel/data-connectors', detail:'Syslog, Windows Security Events, CEF, Azure Activity, custom logs' },
  ];
  const workspace = currentWorkspace();
  const tenant = currentMsspTenant();
  const workspaceQuery = `workspace("${workspace.name}").SecurityEvent
| where EventID == 4625
| project TimeGenerated, Computer, EventID, Account, IpAddress`;
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Configuration › <strong>Workspace manager</strong></div>
        <h1>Workspace manager</h1>
        <div class="page-subtitle">Central landing surface for packaging, publishing, and tracking Sentinel content across member workspaces and customer tenants.</div>
      </div>
      <div class="page-actions"><a class="btn btn-secondary" href="#/sentinel/analytics">Analytics</a><a class="btn btn-primary" href="#/sentinel/data-connectors">DCR workflows</a></div>
    </div>
    <div class="kpi-strip">
      <div class="kpi"><span class="kpi-label">Member workspaces</span><span class="kpi-value">${SENTINEL_WORKSPACES.length}</span></div>
      <div class="kpi"><span class="kpi-label">Customer tenants</span><span class="kpi-value">${MSSP_TENANTS.length}</span></div>
      <div class="kpi"><span class="kpi-label">Content types</span><span class="kpi-value">${content.length}</span></div>
      <div class="kpi"><span class="kpi-label">Last publish</span><span class="kpi-value">07:40</span><span class="kpi-delta">2026-07-06</span></div>
    </div>
    <div class="callout info" style="margin-bottom:16px;">
      Azure Lighthouse lets the lab SOC see and act across customer workspaces with delegated access. Use B2B when the work needs customer-tenant administration, directory changes, or ownership that Lighthouse does not delegate.
    </div>
    <div class="two-col">
      <section class="card">
        <div class="card-toolbar"><strong>Member workspaces</strong><span class="muted">Publish target status</span></div>
        <table class="grid">
          <thead><tr><th>Workspace</th><th>Region</th><th>Tier</th><th>Rules</th><th>Publish status</th><th>Last publish</th></tr></thead>
          <tbody>${SENTINEL_WORKSPACES.map((w, i) => `<tr><td><strong>${esc(w.name)}</strong></td><td>${esc(w.region)}</td><td>${esc(w.tier)}</td><td>${w.ruleIdx.length}</td><td><span class="tag ${i === 2 ? 'orange' : 'green'}">${i === 2 ? 'Pending changes' : 'In sync'}</span></td><td>${i === 2 ? '2026-07-05 16:10' : '2026-07-06 07:40'}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="callout info" style="margin-top:12px;">Selected workspace: <strong>${esc(workspace.name)}</strong> · use it as the publishing target for analytics, hunting, workbooks, and automation packages.</div>
      </section>
      <section class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Customer tenants</strong>
          <span class="muted">Cross-tenant switcher</span>
        </div>
        <label class="wizard-label">Tenant
          <select class="text-input" onchange="setMsspTenant(this.value)">
            ${MSSP_TENANTS.map(t => `<option value="${t.id}" ${t.id === tenant.id ? 'selected' : ''}>${esc(t.name)} · ${esc(t.status)}</option>`).join('')}
          </select>
        </label>
        <div class="resource-summary" style="margin-top:12px;">
          <div><span>Selected tenant</span><strong>${esc(tenant.name)}</strong><small>${esc(tenant.status)} delegation</small></div>
          <div><span>Workspaces</span><strong>${tenant.workspaces.length}</strong><small>${esc(tenant.workspaces.join(' · '))}</small></div>
          <div><span>Delegated roles</span><strong>${tenant.delegatedRoles.length}</strong><small>${esc(tenant.delegatedRoles.join(' · '))}</small></div>
        </div>
        <div class="muted" style="margin-top:12px; font-size:12px;">Select a tenant to open its delegated workspaces, roles, and cross-tenant incidents.</div>
        <table class="grid" style="margin-top:6px;">
          <thead><tr><th>Tenant</th><th>Workspaces</th><th>Delegated roles</th><th>Status</th></tr></thead>
          <tbody>${MSSP_TENANTS.map(t => `
            <tr class="clickable-row ${t.id === tenant.id ? 'active-row' : ''}" onclick="openMsspTenant('${esc(t.id)}')">
              <td><strong>${esc(t.name)}</strong></td>
              <td>${t.workspaces.map(ws => `<span class="tag">${esc(ws)}</span>`).join(' ')}</td>
              <td>${t.delegatedRoles.map(role => `<span class="entity-chip">${esc(role)}</span>`).join(' ')}</td>
              <td><span class="status-dot ${t.status === 'Active' ? 'resolved' : 'warn'}"></span>${esc(t.status)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </section>
    </div>
    <div class="two-col" style="margin-top:16px;">
      <section class="card">
        <div class="card-toolbar"><strong>Content selection</strong><span class="muted">Package for publish</span></div>
        <table class="grid">
          <thead><tr><th>Content</th><th>Selected</th><th>Scope</th><th>Open</th></tr></thead>
          <tbody>${content.map(c => `<tr><td><strong>${esc(c.type)}</strong><br><span class="muted">${esc(c.detail)}</span></td><td>${c.selected} / ${c.total}</td><td><span class="tag green">Included</span></td><td><a class="chip-link" href="${c.link}">Open →</a></td></tr>`).join('')}</tbody>
        </table>
      </section>
      <section class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>Cross-workspace query</strong>
          <span class="muted">workspace() example</span>
        </div>
        <div class="callout info">This query is a study aid for cross-workspace hunting. It stays local, but it mirrors the way Sentinel references a workspace-qualified table.</div>
        <textarea class="kql" readonly>${esc(workspaceQuery)}</textarea>
        <div class="sidepanel-footer" style="padding-top:12px;">
          <button class="btn btn-secondary" onclick='loadSentinelLogsQuery(${JSON.stringify(workspaceQuery)})'>Send to Logs</button>
          <a class="btn btn-primary" href="#/sentinel/logs">Open Logs</a>
        </div>
      </section>
    </div>
    <div class="card card-body" style="margin-top:16px;">
      <div class="alert-section-title">Publish workflow</div>
      <div class="flowline">
        <div class="flow-step"><strong>Select content</strong><span>Choose analytics rules, hunting queries, workbooks, automation, and connector-backed DCR labs.</span></div>
        <div class="flow-step"><strong>Validate dependencies</strong><span>Confirm required tables, connectors, watchlists, and UEBA settings exist in each member workspace.</span></div>
        <div class="flow-step"><strong>Publish</strong><span>Distribute the package and record last-publish status per workspace.</span></div>
        <div class="flow-step"><strong>Monitor drift</strong><span>Flag workspaces with changed rules, disabled connectors, or stale automation.</span></div>
      </div>
    </div>`;
};

// ====================================================================
// DEFENDER FOR CLOUD
// ====================================================================
VIEWS['defender-cloud/overview'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Defender for Cloud › <strong>Overview</strong></div><h1>Defender for Cloud</h1></div></div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Secure score</span><span class="kpi-value">65%</span></div>
    <div class="kpi"><span class="kpi-label">Active recommendations</span><span class="kpi-value">${DEFENDER_CLOUD_RECS.length}</span></div>
    <div class="kpi"><span class="kpi-label">Unhealthy resources</span><span class="kpi-value">46</span></div>
    <div class="kpi"><span class="kpi-label">Workload protection plans</span><span class="kpi-value">7/12</span></div>
  </div>
  <div class="two-col">
    <div class="card card-body">
      <div class="alert-section-title">Asset coverage</div>
      <div style="font-size:13px; line-height:1.9;">
        <div>Virtual machines: <strong>23 of 25 covered</strong></div>
        <div class="bar"><i style="width:92%"></i></div>
        <div style="margin-top:8px;">App services: <strong>8 of 14 covered</strong></div>
        <div class="bar warn"><i style="width:57%"></i></div>
        <div style="margin-top:8px;">Storage accounts: <strong>11 of 18 covered</strong></div>
        <div class="bar warn"><i style="width:61%"></i></div>
        <div style="margin-top:8px;">SQL servers: <strong>4 of 4 covered</strong></div>
        <div class="bar"><i style="width:100%"></i></div>
      </div>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Recommendations by severity</div>
      <div style="font-size:13px; line-height:1.9;">
        <div><span class="sev high">High</span> ${DEFENDER_CLOUD_RECS.filter(r=>r.severity==='high').length} recommendations</div>
        <div><span class="sev medium">Medium</span> ${DEFENDER_CLOUD_RECS.filter(r=>r.severity==='medium').length} recommendations</div>
        <div><span class="sev low">Low</span> ${DEFENDER_CLOUD_RECS.filter(r=>r.severity==='low').length} recommendations</div>
      </div>
      <a class="chip-link" href="#/defender-cloud/recommendations">All recommendations →</a>
    </div>
  </div>
`;

VIEWS['defender-cloud/recommendations'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Defender for Cloud › <strong>Recommendations</strong></div><h1>Recommendations</h1><div class="page-subtitle">Select a recommendation to review its risk context, affected resources, and remediation steps.</div></div></div>
  <div class="filterbar">
    <span class="chip">Severity: <strong>Any</strong> ▾</span>
    <span class="chip">Resource type: <strong>Any</strong> ▾</span>
    <span class="chip">Control: <strong>Any</strong> ▾</span>
  </div>
  <div class="card">
    <table class="grid">
      <thead><tr><th>Severity</th><th>Recommendation</th><th>Control</th><th>Resource type</th><th>Affected</th></tr></thead>
      <tbody>
        ${DEFENDER_CLOUD_RECS.map(r => `
          <tr class="dfc-recommendation-row" tabindex="0" aria-label="Open recommendation: ${esc(r.title)}" onclick="openCloudRecommendation('${esc(r.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCloudRecommendation('${esc(r.id)}');}">
            <td><span class="sev ${r.severity}">${cap(r.severity)}</span></td>
            <td><button class="table-row-link" type="button" tabindex="-1">${esc(r.title)}</button></td>
            <td>${esc(r.control)}</td>
            <td>${esc(r.resourceType)}</td>
            <td>${r.affected}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

function renderCloudRecommendationDetail(rec, tab) {
  const active = tab || 'overview';
  const assets = rec.assets || [];
  const tabs = [
    ['overview','Overview'],
    ['remediation','Remediation steps'],
    ['assets','Exposed assets'],
    ['initiatives','Related initiatives'],
  ];
  return `
    <div class="pill-row">
      <span class="sev ${esc(rec.severity)}">${cap(rec.severity)} risk</span>
      <span class="tag">${esc(rec.resourceType)}</span>
      <span class="tag">${rec.affected} affected</span>
    </div>
    <p class="muted" style="line-height:1.5;">${esc(rec.description || '')}</p>
    <div class="tabs dfc-recommendation-tabs">
      ${tabs.map(([key,label]) => `<button class="tab ${active === key ? 'active' : ''}" onclick="setCloudRecommendationTab('${key}')">${label}${key === 'assets' ? ` (${rec.affected})` : ''}</button>`).join('')}
    </div>
    ${active === 'overview' ? `
      <dl class="alert-meta">
        <dt>Recommendation ID</dt><dd>${esc(rec.id)}</dd>
        <dt>Security control</dt><dd>${esc(rec.control)}</dd>
        <dt>Affected resource type</dt><dd>${esc(rec.resourceType)}</dd>
      </dl>
      <div class="alert-section-title">Risk factors</div>
      <div class="pill-row">${(rec.riskFactors || []).map(item => `<span class="tag orange">${esc(item)}</span>`).join('') || '<span class="muted">No additional risk factors.</span>'}</div>
      <div class="alert-section-title">Attack-path context</div>
      <div class="callout ${rec.attackPath && !rec.attackPath.startsWith('No active') ? 'warn' : 'info'}">${esc(rec.attackPath || 'No attack-path context is available for this finding.')}</div>
      <button class="btn btn-secondary btn-sm" onclick="hidePanels(); navigate('#/defender-cloud/attack-paths');">Open attack path analysis</button>
    ` : active === 'remediation' ? `
      <div class="alert-section-title">Recommended sequence</div>
      <ol class="attack-evidence-list">${(rec.remediation || []).map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      <div class="callout info">This simulator does not modify cloud resources. Treat these steps as the validation path you would follow before closing the finding.</div>
      <div class="sidepanel-footer">
        <button class="btn btn-primary" onclick="toast('Remediation workflow started for ${esc(rec.id)} (lab simulation).')">Start remediation</button>
        <button class="btn btn-secondary" onclick="toast('Owner and due date assigned for ${esc(rec.id)} (lab simulation).')">Assign owner &amp; due date</button>
        <button class="btn btn-secondary" onclick="toast('Exemption review opened for ${esc(rec.id)} (lab simulation).')">Review exemption</button>
      </div>
    ` : active === 'assets' ? `
      <div class="alert-section-title">Affected resources</div>
      <div class="muted" style="margin-bottom:8px;">Review each resource before applying remediation or an exemption.</div>
      <table class="grid dfc-recommendation-assets">
        <thead><tr><th>Resource</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>${assets.map((asset, index) => `<tr><td><strong>${esc(asset)}</strong></td><td>${esc(rec.resourceType)}</td><td><span class="tag ${index === 0 && rec.severity === 'high' ? 'orange' : ''}">Unhealthy</span></td></tr>`).join('')}</tbody>
      </table>
      ${assets.length < rec.affected ? `<div class="muted" style="margin-top:10px;">${rec.affected - assets.length} additional affected resource${rec.affected - assets.length === 1 ? '' : 's'} summarized in this lab fixture.</div>` : ''}
      <button class="btn btn-secondary btn-sm" style="margin-top:12px;" onclick="hidePanels(); navigate('#/defender-cloud/inventory');">Open resource inventory</button>
    ` : `
      <div class="alert-section-title">Related initiatives and standards</div>
      ${(rec.initiatives || []).map(name => `<div class="detail-row"><span>${esc(name)}</span><strong>Mapped</strong></div>`).join('') || '<div class="muted">No related initiatives.</div>'}
      <div class="callout info" style="margin-top:14px;">A recommendation can contribute evidence to more than one initiative. Remediating the resource finding can therefore improve multiple compliance views.</div>
      <button class="btn btn-secondary btn-sm" onclick="hidePanels(); navigate('#/defender-cloud/regulatory');">Open regulatory compliance</button>
    `}
  `;
}

VIEWS['defender-cloud/regulatory'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Defender for Cloud › <strong>Regulatory compliance</strong></div><h1>Regulatory compliance</h1></div></div>
  ${COMPLIANCE_FRAMEWORKS.map(f => `
    <div class="card card-body">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong>${esc(f.name)}</strong>
        <span class="muted">${f.passing} passing · ${f.failing} failing</span>
      </div>
      <div class="bar ${f.percent < 60 ? 'warn' : ''}"><i style="width:${f.percent}%"></i></div>
      <div style="font-size:12px; color:var(--fg-muted); margin-top:4px;">${f.percent}% compliant</div>
    </div>
  `).join('')}
`;

const DEFENDER_CLOUD_SEVERITY_ORDER = ['high', 'medium', 'low', 'informational'];
const DEFENDER_CLOUD_STATUSES = ['Active', 'Dismissed', 'Resolved'];

VIEWS['defender-cloud/alerts'] = () => {
  const filters = defenderCloudAlertFilters();
  const all = defenderCloudAlertRows();
  const rows = all.filter(a =>
    (filters.severity === 'any' || a.severity === filters.severity) &&
    (filters.status === 'any' || a.status === filters.status) &&
    (filters.cloud === 'any' || a.cloud === filters.cloud)
  ).sort((x, y) =>
    DEFENDER_CLOUD_SEVERITY_ORDER.indexOf(x.severity) - DEFENDER_CLOUD_SEVERITY_ORDER.indexOf(y.severity) ||
    String(y.time).localeCompare(String(x.time))
  );
  const clouds = [...new Set(all.map(a => a.cloud))];

  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Defender for Cloud › <strong>Security alerts</strong></div>
      <h1>Security alerts</h1>
      <div class="page-subtitle">Triage by severity first. Select an alert to open the details pane, then use Take action to mitigate, harden, automate, or suppress.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="toast('Download CSV report — one-time export of the filtered alert list (lab stub).')">Download CSV report</button>
      <a class="btn btn-secondary" href="#/defender-cloud/attack-paths">Attack paths</a>
    </div>
  </div>

  <div class="filterbar">
    <span class="filter-group">Severity:
      <span class="chip ${filters.severity === 'any' ? 'active' : ''}" onclick="setDefenderCloudAlertFilter('severity','any')">Any</span>
      ${DEFENDER_CLOUD_SEVERITY_ORDER.map(s => `<span class="chip ${filters.severity === s ? 'active' : ''}" onclick="setDefenderCloudAlertFilter('severity','${s}')">${cap(s)}</span>`).join('')}
    </span>
    <span class="filter-group">Status:
      <span class="chip ${filters.status === 'any' ? 'active' : ''}" onclick="setDefenderCloudAlertFilter('status','any')">Any</span>
      ${DEFENDER_CLOUD_STATUSES.map(s => `<span class="chip ${filters.status === s ? 'active' : ''}" onclick="setDefenderCloudAlertFilter('status','${s}')">${s}</span>`).join('')}
    </span>
    <span class="filter-group">Cloud:
      <span class="chip ${filters.cloud === 'any' ? 'active' : ''}" onclick="setDefenderCloudAlertFilter('cloud','any')">Any</span>
      ${clouds.map(c => `<span class="chip ${filters.cloud === c ? 'active' : ''}" onclick="setDefenderCloudAlertFilter('cloud','${esc(c)}')">${esc(c)}</span>`).join('')}
    </span>
    <span class="chip" onclick="toast('Add filter — the portal also filters on subscription, resource, alert name, and activity time.')">+ Add filter</span>
  </div>

  <div class="card">
    <div class="card-toolbar">
      <strong>Security incidents</strong>
      <span class="muted">${CLOUD_INCIDENTS.length} correlations · a security incident is a group of alerts that share an entity or a kill-chain pattern</span>
    </div>
    ${CLOUD_INCIDENTS.map(inc => `
      <div class="card-body border-top dfc-incident-row" onclick="openCloudIncident('${esc(inc.id)}')">
        <div class="pill-row">
          <span class="sev ${esc(inc.severity)}">${cap(inc.severity)}</span>
          <strong>${esc(inc.name)}</strong>
          <span class="tag">${esc(inc.cloud)}</span>
          <span class="tag">${defenderCloudIncidentAlerts(inc).length} alerts</span>
        </div>
        <div class="muted" style="margin-top:4px;">Correlated on ${esc(inc.sharedEntity)}</div>
      </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-toolbar">
      <strong>${rows.length}</strong> of ${all.length} cloud workload alerts
      <span class="muted">Select a row to open the alert details pane</span>
    </div>
    <div class="table-scroll">
      <table class="grid">
        <thead><tr><th>Severity</th><th>Alert</th><th>Affected resource</th><th>Type</th><th>Cloud</th><th>Status</th><th>MITRE tactics</th><th>Activity start</th><th>Incident</th></tr></thead>
        <tbody>
          ${rows.length === 0 ? `<tr><td colspan="9" class="muted">No alerts match the current filters.</td></tr>` : ''}
          ${rows.map(a => `
            <tr onclick="openCloudAlert('${esc(a.id)}')">
              <td><span class="sev ${esc(a.severity)}">${cap(a.severity)}</span></td>
              <td><strong>${esc(a.title)}</strong></td>
              <td>${esc(a.resource)}</td>
              <td>${esc(a.type)}</td>
              <td>${esc(a.cloud)}</td>
              <td>${esc(a.status)}</td>
              <td>${(a.tactics || []).map(t => `<span class="mitre">${esc(t)}</span>`).join('')}</td>
              <td>${fmtTime(a.time)}</td>
              <td>${a.incidentId ? `<span class="tag orange">Correlated</span>` : `<span class="muted">—</span>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="callout info">
    An alert can belong to an incident and still appear on its own in this list — that is why the member alerts above are not hidden. Alerts stay visible for 90 days even if the resource is deleted, and can be streamed to Sentinel or another SIEM from Environment settings.
  </div>`;
};

// Alert details pane. Mirrors the portal: a high-level summary (severity,
// status, activity time, description, affected resource, kill-chain intent),
// then the full details split across an Alert details tab and a Take action tab.
function renderCloudAlertDetail(alert, tab) {
  const related = defenderCloudRelatedAlerts(alert);
  const incident = alert.incidentId ? defenderCloudIncidentById(alert.incidentId) : null;
  const active = tab || 'details';

  return `
    <div class="pill-row">
      <span class="sev ${esc(alert.severity)}">${cap(alert.severity)}</span>
      <span class="tag">${esc(alert.status)}</span>
      <span class="tag">${esc(alert.cloud)}</span>
      <span class="muted">${fmtTime(alert.time)}</span>
    </div>
    <p class="muted" style="line-height:1.5;">${esc(alert.description || '')}</p>
    <dl class="alert-meta">
      <dt>Affected resource</dt><dd><strong>${esc(alert.resource)}</strong> · ${esc(alert.type)}</dd>
      <dt>Kill chain intent</dt><dd>${(alert.tactics || []).map(t => `<span class="mitre">${esc(t)}</span>`).join('') || '<span class="muted">Not mapped</span>'}</dd>
    </dl>

    <div class="tabs">
      <button class="tab ${active === 'details' ? 'active' : ''}" onclick="setCloudAlertTab('details')">Alert details</button>
      <button class="tab ${active === 'action' ? 'active' : ''}" onclick="setCloudAlertTab('action')">Take action</button>
    </div>

    ${active === 'details' ? `
      <dl class="alert-meta">
        <dt>Alert ID</dt><dd>${esc(alert.id)}</dd>
        <dt>Detected by</dt><dd>${esc(alert.plan || 'Defender for Cloud')}</dd>
        <dt>Scope</dt><dd>${esc(alert.scope || '—')}</dd>
        <dt>Activity start</dt><dd>${fmtTime(alert.time)}</dd>
        <dt>Activity end</dt><dd>${alert.endTime ? fmtTime(alert.endTime) : '—'}</dd>
      </dl>

      <div class="alert-section-title">Entities</div>
      <table class="grid">
        <thead><tr><th>Type</th><th>Value</th></tr></thead>
        <tbody>${(alert.entities || []).map(e => `<tr><td>${esc(e.type)}</td><td class="kv">${esc(e.value)}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">No entities extracted.</td></tr>'}</tbody>
      </table>

      <div class="alert-section-title">Evidence</div>
      ${Object.entries(alert.evidence || {}).map(([k, v]) => `<div class="detail-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('') || '<div class="muted">No additional evidence.</div>'}

      <div class="alert-section-title">Related alerts</div>
      ${incident ? `
        <div class="callout info" style="margin-bottom:10px;">
          Part of <strong>${esc(incident.name)}</strong> — correlated on ${esc(incident.sharedEntity)}.
          <div style="margin-top:6px;"><button class="btn btn-secondary btn-sm" onclick="openCloudIncident('${esc(incident.id)}')">Open security incident</button></div>
        </div>
        ${related.map(r => `
          <div class="detail-row dfc-related-alert" onclick="openCloudAlert('${esc(r.id)}')">
            <span><span class="sev ${esc(r.severity)}">${cap(r.severity)}</span> ${esc(r.title)}</span>
            <strong>${esc(r.resource)}</strong>
          </div>`).join('')}
      ` : `<div class="muted">This alert is not currently correlated into a security incident. Correlation needs a shared entity — the same resource, IP address, or identity — or a matching kill-chain pattern.</div>`}
    ` : `
      <div class="alert-section-title">Inspect resource context</div>
      <div class="muted">Review the activity logs behind the detection for <strong>${esc(alert.resource)}</strong>.</div>
      <div style="margin-top:8px;">
        <button class="btn btn-secondary btn-sm" onclick="openCloudResourceByName('${esc(alert.resource)}')">Open resource health</button>
        <button class="btn btn-secondary btn-sm" onclick="toast('Activity logs for ${esc(alert.resource)} (lab stub).')">View activity logs</button>
      </div>

      <div class="alert-section-title">Mitigate the threat</div>
      <ol class="attack-evidence-list">${(alert.mitigation || []).map(s => `<li>${esc(s)}</li>`).join('') || '<li class="muted">No manual steps recorded.</li>'}</ol>

      <div class="alert-section-title">Prevent future attacks</div>
      <div class="muted">Remediate these recommendations to reduce the attack surface this alert exploited.</div>
      <ul class="attack-evidence-list">${(alert.recommendations || []).map(r => `<li>${esc(r)}</li>`).join('') || '<li class="muted">No recommendations mapped.</li>'}</ul>
      <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender-cloud/recommendations'); hidePanels();">Open recommendations</button>

      <div class="alert-section-title">Trigger automated response</div>
      <div class="muted">Run a logic app in response to this alert.</div>
      <div style="margin-top:8px;">
        <button class="btn btn-secondary btn-sm" onclick="toast('Logic app triggered for ${esc(alert.id)} (lab stub — no real automation runs).')">Trigger logic app</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender-cloud/workflow'); hidePanels();">Open workflow automation</button>
      </div>

      <div class="alert-section-title">Suppress similar alerts</div>
      <div class="muted">If this activity is expected in your environment, suppress future alerts with the same characteristics. A suppression rule sets matching alerts to <strong>Dismissed</strong>.</div>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="toast('Suppression rule builder for ${esc(alert.title)} (lab stub).')">Create suppression rule</button>

      <div class="alert-section-title">Change status</div>
      <div class="pill-row">
        ${DEFENDER_CLOUD_STATUSES.map(s => `<button class="btn ${alert.status === s ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setCloudAlertStatus('${esc(alert.id)}','${s}')">${s}</button>`).join('')}
      </div>
      <div class="muted" style="margin-top:6px;">Dismissed alerts drop out of the default list view; filter on Status to bring them back.</div>

      <div class="alert-section-title">Feedback</div>
      <div class="pill-row">
        <button class="btn btn-secondary btn-sm" onclick="toast('Marked useful — feedback tunes detection quality.')">Useful</button>
        <button class="btn btn-secondary btn-sm" onclick="toast('Marked not useful — pick a reason and add a comment in the portal.')">Not useful</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender/settings'); hidePanels();">Configure email notification settings</button>
      </div>
    `}`;
}

// Attack paths hang off the INCIDENT, not off an individual alert.
//
// In the product, attack path analysis is its own surface (Defender for Cloud >
// Attack path analysis in the Azure portal, Exposure management > Attack surface
// in the Defender portal). An attack path node links out to insights and
// recommendations — never to an alert — so a link from a single alert straight
// to an attack path would be inventing behavior. What IS documented is that
// attack paths get correlated with security incidents, which is why the button
// lives here. The two-hop route alert → incident → attack path mirrors reality.
function renderCloudIncidentAttackPath(incident) {
  if (!incident.attackPathId) return '';
  const path = defenderCloudAttackPaths().find(p => p.id === incident.attackPathId);
  if (!path) return '';
  return `
    <div class="alert-section-title">Related attack path</div>
    <div class="callout info">
      <div class="pill-row">
        <span class="sev ${esc(path.severity)}">${cap(path.severity)}</span>
        <strong>${esc(path.name)}</strong>
      </div>
      <div class="muted" style="margin:6px 0;">Entry point <strong>${esc(path.start)}</strong> → ${esc(path.result)}</div>
      <ol class="attack-evidence-list">${(path.path || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <div style="margin-top:8px;">
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender-cloud/attack-paths'); hidePanels();">Open attack path analysis</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender-cloud/recommendations'); hidePanels();">Remediate path recommendations</button>
      </div>
      <div class="muted" style="margin-top:8px;">
        This is the posture side of the same story: the incident is what the attacker did, the attack path is the exposure that let them. Remediating the path removes the route — resolving the alerts does not.
      </div>
    </div>`;
}

// Security incident pane — the alerts that make up one correlation.
function renderCloudIncidentDetail(incident) {
  const members = defenderCloudIncidentAlerts(incident);
  return `
    <div class="pill-row">
      <span class="sev ${esc(incident.severity)}">${cap(incident.severity)}</span>
      <span class="tag">${esc(incident.status)}</span>
      <span class="tag">${esc(incident.cloud)}</span>
      <span class="muted">${fmtTime(incident.time)}</span>
    </div>
    <dl class="alert-meta">
      <dt>Incident ID</dt><dd>${esc(incident.id)}</dd>
      <dt>Correlated on</dt><dd>${esc(incident.sharedEntity)}</dd>
      <dt>Member alerts</dt><dd>${members.length}</dd>
    </dl>
    <div class="alert-section-title">Attack story</div>
    <p class="muted" style="line-height:1.5;">${esc(incident.story)}</p>
    ${renderCloudIncidentAttackPath(incident)}
    <div class="alert-section-title">Alerts in this incident</div>
    <div class="muted" style="margin-bottom:8px;">Listed in attack order, not severity order. Select an alert to open its details pane.</div>
    ${members.map((a, index) => `
      <div class="detail-row dfc-related-alert" onclick="openCloudAlert('${esc(a.id)}')">
        <span><span class="tag">${index + 1}</span> <span class="sev ${esc(a.severity)}">${cap(a.severity)}</span> ${esc(a.title)}</span>
        <strong>${esc(a.resource)}</strong>
      </div>`).join('')}
    <div class="callout info" style="margin-top:14px;">
      Correlation is what turns a low and an informational alert into part of a high-severity story. Note that ${esc(members.filter(a => a.severity === 'low' || a.severity === 'informational').length)} of these ${members.length} alerts would be easy to close on their own.
    </div>`;
}

function cloudAssetKeys(asset) {
  return [
    asset.name,
    asset.resourceId,
    ...(asset.alertResources || []),
    String(asset.subLabel || '').replace(/^Name tag:\s*/i, '').replace(/^Alerted node:\s*/i, `${asset.name}/`),
  ].filter(Boolean).map(value => String(value).toLowerCase());
}

function cloudAssetAlerts(asset) {
  const keys = cloudAssetKeys(asset);
  return defenderCloudAlertRows().filter(alert => {
    const values = [alert.resource, ...(alert.entities || []).map(entity => entity.value)]
      .filter(Boolean).map(value => String(value).toLowerCase());
    return values.some(value => keys.includes(value));
  });
}

function cloudAssetAttackPaths(asset) {
  const keys = cloudAssetKeys(asset);
  return defenderCloudAttackPaths().filter(path => {
    const values = [path.start, path.target, ...(path.nodes || []).map(node => node.label)]
      .filter(Boolean).map(value => String(value).toLowerCase());
    return values.some(value => keys.includes(value));
  });
}

function cloudAssetRecommendationTemplates(asset) {
  const type = String(asset.type || '').toLowerCase();
  const exposure = String(asset.exposure || '').toLowerCase();
  const templates = [];
  if (/public|internet|0\.0\.0\.0|management port|wide firewall/.test(exposure)) {
    templates.push('Restrict public network and management access to approved paths');
  }
  if (/virtual machine|compute instance|ec2 instance/.test(type)) {
    templates.push('Enable endpoint protection and agentless vulnerability assessment');
    templates.push('Remediate high-severity operating system and application vulnerabilities');
    templates.push('Use just-in-time access for administrative ports');
    templates.push('Stream security-relevant host logs to the security workspace');
  } else if (/cluster|kubernetes|container/.test(type)) {
    templates.push('Restrict Kubernetes control-plane access to authorized networks');
    templates.push('Block privileged containers and host namespace sharing');
    templates.push('Apply least privilege to workload identities and role bindings');
    templates.push('Scan running images and resolve exploitable vulnerabilities');
  } else if (/storage|bucket/.test(type)) {
    templates.push('Block anonymous and public access to cloud storage');
    templates.push('Enable diagnostic access logging and retention');
    templates.push('Use private endpoints or approved service perimeters');
    templates.push('Enable versioning and recovery protections for critical data');
  } else if (/sql|database/.test(type)) {
    templates.push('Restrict database network access to approved private paths');
    templates.push('Enable database auditing and threat protection');
    templates.push('Use identity-based authentication for administrators');
    templates.push('Run vulnerability assessment and remediate critical findings');
  } else if (/key vault|vault|secret/.test(type)) {
    templates.push('Restrict secret-store access to trusted networks and identities');
    templates.push('Enable diagnostic logging for secret access and configuration changes');
    templates.push('Set expiration and rotation policies for secrets and keys');
  }
  templates.push('Review least-privilege access to this resource');
  templates.push('Enable provider-native diagnostic logging and alerting');
  return templates;
}

function cloudAssetRecommendations(asset) {
  const keys = cloudAssetKeys(asset);
  const result = [];
  const seen = new Set();
  const add = item => {
    const normalized = String(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(item);
  };

  DEFENDER_CLOUD_RECS.filter(rec => (rec.assets || []).some(value => keys.includes(String(value).toLowerCase())))
    .forEach(rec => add({ id:rec.id, title:rec.title, severity:rec.severity, source:'Defender for Cloud recommendation' }));
  cloudAssetAlerts(asset).flatMap(alert => alert.recommendations || [])
    .forEach(title => add({ title, severity:asset.risk === 'High' ? 'high' : 'medium', source:'Mapped from active alert' }));
  cloudAssetRecommendationTemplates(asset)
    .forEach(title => add({ title, severity:asset.risk === 'High' ? 'high' : asset.risk === 'Medium' ? 'medium' : 'low', source:'Resource posture' }));
  return result.slice(0, Math.max(0, Number(asset.recs) || 0));
}

function renderCloudResourceDetail(asset, tab) {
  const active = ['overview','recommendations','alerts'].includes(tab) ? tab : 'overview';
  const alerts = cloudAssetAlerts(asset);
  const recommendations = cloudAssetRecommendations(asset);
  const paths = cloudAssetAttackPaths(asset);
  const unhealthy = recommendations.length > 0 || alerts.some(alert => alert.status === 'Active');
  const riskClass = asset.risk === 'High' ? 'high' : asset.risk === 'Medium' ? 'medium' : asset.risk === 'Low' ? 'low' : 'info';
  return `
    <div class="pill-row">
      <span class="sev ${riskClass}">${esc(asset.risk)} risk</span>
      <span class="tag ${unhealthy ? 'orange' : 'green'}">${unhealthy ? 'Unhealthy' : 'Healthy'}</span>
      <span class="tag green">${esc(asset.coverage || 'Protected')}</span>
      <span class="tag">${esc(asset.cloud)}</span>
    </div>

    <div class="cloud-resource-heading">
      <div><strong>${esc(asset.name)}</strong>${asset.subLabel ? `<span>${esc(asset.subLabel)}</span>` : ''}</div>
      <span>${esc(asset.type)}</span>
    </div>

    <div class="tabs cloud-resource-tabs">
      <button class="tab ${active === 'overview' ? 'active' : ''}" onclick="setCloudResourceTab('overview')">Overview</button>
      <button class="tab ${active === 'recommendations' ? 'active' : ''}" onclick="setCloudResourceTab('recommendations')">Recommendations <span class="pill">${recommendations.length}</span></button>
      <button class="tab ${active === 'alerts' ? 'active' : ''}" onclick="setCloudResourceTab('alerts')">Alerts <span class="pill">${alerts.length}</span></button>
    </div>

    ${active === 'overview' ? `
      <div class="resource-summary cloud-resource-summary">
        <div><span>Open recommendations</span><strong>${recommendations.length}</strong><small>Prioritized by resource risk</small></div>
        <div><span>Security alerts</span><strong>${alerts.length}</strong><small>${alerts.filter(alert => alert.status === 'Active').length} active</small></div>
        <div><span>Attack paths</span><strong>${paths.length}</strong><small>Paths containing this asset</small></div>
      </div>

      <div class="alert-section-title">Resource information</div>
      <dl class="alert-meta">
        <dt>Resource type</dt><dd>${esc(asset.type)}</dd>
        <dt>Cloud environment</dt><dd>${esc(asset.cloud)}</dd>
        <dt>Scope</dt><dd>${esc(asset.scope)}</dd>
        <dt>Region</dt><dd>${esc(asset.region || 'Global')}</dd>
        <dt>Coverage</dt><dd>${esc(asset.coverage || 'Protected')}</dd>
        <dt>Health status</dt><dd>${unhealthy ? 'Unhealthy — active findings require review' : 'Healthy'}</dd>
      </dl>

      <div class="alert-section-title">Asset ID</div>
      <div class="cloud-resource-id-row"><code id="cloud-resource-id">${esc(asset.resourceId)}</code><button class="btn btn-secondary btn-sm" onclick="copyToClipboard('cloud-resource-id')">Copy</button></div>

      <div class="alert-section-title">Exposure and risk</div>
      <div class="callout ${asset.risk === 'High' ? 'warn' : 'info'}"><strong>${esc(asset.exposure)}</strong><div style="margin-top:5px;">Risk is based on this fictional resource's exposure, active findings, and relationship to other cloud assets.</div></div>

      ${paths.length ? `<div class="alert-section-title">Attack path involvement</div>${paths.map(path => `<div class="detail-row"><span>${esc(path.name)}</span><strong>${esc(path.status || cap(path.severity))}</strong></div>`).join('')}<button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('#/defender-cloud/attack-paths');hidePanels();">Open attack path analysis</button>` : ''}
    ` : active === 'recommendations' ? `
      <div class="alert-section-title">Active security recommendations</div>
      <p class="muted">Recommendations are shown in risk order for this resource. Catalog-backed rows open the full remediation pane.</p>
      <table class="grid compact-grid">
        <thead><tr><th>Severity</th><th>Recommendation</th><th>Source</th></tr></thead>
        <tbody>${recommendations.length ? recommendations.map(rec => `<tr ${rec.id ? `class="dfc-recommendation-row" tabindex="0" onclick="openCloudRecommendation('${esc(rec.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCloudRecommendation('${esc(rec.id)}');}"` : ''}><td><span class="sev ${esc(rec.severity)}">${cap(rec.severity)}</span></td><td><strong>${esc(rec.title)}</strong></td><td>${esc(rec.source)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">No active recommendations for this resource.</td></tr>'}</tbody>
      </table>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="navigate('#/defender-cloud/recommendations');hidePanels();">Open all recommendations</button>
    ` : `
      <div class="alert-section-title">Security alerts</div>
      <p class="muted">Alerts are matched through the resource name and extracted cloud entities.</p>
      <table class="grid compact-grid">
        <thead><tr><th>Severity</th><th>Alert</th><th>Status</th><th>Activity</th></tr></thead>
        <tbody>${alerts.length ? alerts.map(alert => `<tr class="dfc-resource-alert-row" tabindex="0" onclick="openCloudAlert('${esc(alert.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCloudAlert('${esc(alert.id)}');}"><td><span class="sev ${esc(alert.severity)}">${cap(alert.severity)}</span></td><td><strong>${esc(alert.title)}</strong><div class="muted">${esc(alert.id)}</div></td><td>${esc(alert.status)}</td><td>${fmtTime(alert.time)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">No security alerts are associated with this resource.</td></tr>'}</tbody>
      </table>
    `}
  `;
}

VIEWS['defender-cloud/inventory'] = () => `
  <div class="page-header">
    <div><div class="breadcrumb">Defender for Cloud › <strong>Inventory</strong></div><h1>Inventory</h1><div class="page-subtitle">Cloud resources with workload-protection alerts, recommendations, and exposure context.</div></div>
    <div class="page-actions"><a class="btn btn-secondary" href="#/defender-cloud/attack-paths">Attack paths</a></div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Resources</span><span class="kpi-value">${defenderCloudInventoryRows().length}</span></div>
    <div class="kpi"><span class="kpi-label">High risk</span><span class="kpi-value">${defenderCloudInventoryRows().filter(a=>a.risk==='High').length}</span></div>
    <div class="kpi"><span class="kpi-label">Open alerts</span><span class="kpi-value">${defenderCloudInventoryRows().reduce((n,a)=>n+a.alerts,0)}</span></div>
    <div class="kpi"><span class="kpi-label">Recommendations</span><span class="kpi-value">${defenderCloudInventoryRows().reduce((n,a)=>n+a.recs,0)}</span></div>
  </div>
  <div class="card table-scroll">
    <div class="card-toolbar"><strong>Resource inventory</strong><span class="muted">Azure plus onboarded AWS/GCP assets</span></div>
    <table class="grid cloud-inventory-table">
      <thead><tr><th>Cloud</th><th>Risk</th><th>Resource</th><th>Type</th><th>Scope</th><th>Region</th><th>Exposure</th><th>Alerts</th><th>Recommendations</th></tr></thead>
      <tbody>${defenderCloudInventoryRows().map(a => `
        <tr class="dfc-resource-row" tabindex="0" aria-label="Open resource health: ${esc(a.name)}" onclick="openCloudResource('${esc(a.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCloudResource('${esc(a.id)}');}">
          <td>${esc(a.cloud)}</td>
          <td><span class="sev ${a.risk === 'High' ? 'high' : a.risk === 'Medium' ? 'medium' : 'low'}">${esc(a.risk)}</span></td>
          <td>
            <strong>${esc(a.name)}</strong>
            ${a.subLabel ? `<div class="muted resource-sub">${esc(a.subLabel)}</div>` : ''}
            <div class="muted resource-id" title="${esc(a.resourceId || '')}">${esc(a.resourceId || '')}</div>
          </td>
          <td>${esc(a.type)}</td>
          <td>${esc(a.scope)}</td>
          <td>${esc(a.region)}</td>
          <td>${esc(a.exposure)}</td>
          <td>${a.alerts}</td>
          <td>${a.recs}</td>
        </tr>`).join('')}</tbody>
    </table>
  </div>`;

VIEWS['defender-cloud/attack-paths'] = () => {
  const paths = defenderCloudAttackPaths();
  const ui = defenderCloudAttackPathUi();
  const selected = ui.selectedId ? defenderCloudAttackPathById(ui.selectedId) : null;
  if (selected) return renderDefenderCloudAttackPathDetail(selected, ui);
  return `
    <div class="page-header">
      <div><div class="breadcrumb">Defender for Cloud › <strong>Attack path analysis</strong></div><h1>Attack path analysis</h1><div class="page-subtitle">Prioritize externally driven, exploitable routes to business-critical cloud assets.</div></div>
      <div class="page-actions"><a class="btn btn-secondary" href="#/defender-cloud/inventory">Inventory</a><a class="btn btn-primary" href="#/defender-cloud/explorer">Cloud Security Explorer</a></div>
    </div>
    <div class="callout info dfc-learn-note"><strong>Coverage requirement:</strong> attack paths require Defender CSPM and agentless scanning. Container paths additionally need agentless container posture or Defender for Containers coverage. Viewing requires an eligible read or security role on the relevant scopes.</div>
    ${renderDefenderCloudAttackPathTabs(ui.tab)}
    ${ui.tab === 'overview' ? renderDefenderCloudAttackPathOverview(paths) : ui.tab === 'choke' ? renderDefenderCloudChokePoints(paths) : renderDefenderCloudAttackPathList(paths, ui.filters)}`;
};

const DEFENDER_CLOUD_AZURE_PLANS = [
  { id:'cspm', name:'Defender CSPM', kind:'Posture', note:'Adds risk prioritization, attack paths, cloud security explorer, and agentless posture capabilities.' },
  { id:'servers', name:'Servers', kind:'Workload protection', note:'Protects Windows and Linux machines. Plan 2 adds agentless scanning and supports file integrity monitoring.' },
  { id:'containers', name:'Containers', kind:'Workload protection', note:'Protects supported Kubernetes clusters and registries with posture, vulnerability, and runtime signals.' },
  { id:'storage', name:'Storage', kind:'Workload protection', note:'Monitors storage activity; malware scanning is a configurable paid add-on and sensitivity context can enrich alerts.' },
  { id:'databases', name:'Databases', kind:'Workload protection', note:'A bundle with separately priced protection types for Azure SQL, SQL on machines, open-source databases, and Cosmos DB.' },
  { id:'appservice', name:'App Service', kind:'Workload protection', note:'Detects threats against supported Azure App Service workloads.' },
  { id:'apis', name:'APIs', kind:'Workload protection', note:'Provides threat detection for onboarded APIs in supported Azure API Management tiers.' },
  { id:'ai', name:'AI', kind:'Workload protection', note:'Protects supported AI workloads; availability depends on resource type and region.' },
];

VIEWS['defender-cloud/setup'] = () => {
  const state = currentDefenderCloudSetupState();
  const enabledPlans = Object.values(state.plans).filter(p => p.enabled).length;
  const server = state.plans.servers;
  const containers = state.plans.containers;
  const storage = state.plans.storage;
  const protectionStatus = (enabled, detail) => enabled
    ? `<span class="tag green">Protected</span><small>${detail}</small>`
    : '<span class="tag red">Not protected</span><small>Enable the matching plan, save, then verify deployment.</small>';
  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Defender for Cloud › Management › Environment settings › <strong>Defender plans</strong></div>
      <h1>Defender plans</h1>
      <div class="page-subtitle">Configure Azure workload-protection coverage, required components, and the path from telemetry to investigation.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="resetDefenderCloudSetupState()">Reset lab</button>
      <button class="btn btn-secondary" onclick="enableAllDefenderCloudSetupPlans()">Enable all</button>
      <button class="btn btn-primary dc-save-plans" onclick="commitDefenderCloudSetupPlans()" ${state.saved ? 'disabled' : ''}>Save changes</button>
    </div>
  </div>

  <div class="callout info dc-exam-focus">
    <strong>SC-200 focus:</strong> the current outline tests investigation and remediation of Defender for Cloud workload-protection alerts and incidents. Setup is supporting knowledge: know which plan produces the signal, verify coverage, then pivot to the alert and its affected resource.
  </div>

  <div class="kpi-strip dc-setup-kpis">
    <div class="kpi"><span class="kpi-label">Scope</span><span class="kpi-value dc-kpi-text">${esc(state.scope)}</span><span class="muted">${esc(state.scopeType)}</span></div>
    <div class="kpi"><span class="kpi-label">Foundational CSPM</span><span class="kpi-value dc-kpi-text">Included</span><span class="muted">Basic posture is available when Defender for Cloud is enabled</span></div>
    <div class="kpi"><span class="kpi-label">Paid plans selected</span><span class="kpi-value">${enabledPlans}</span><span class="muted">of ${DEFENDER_CLOUD_AZURE_PLANS.length} represented plans</span></div>
    <div class="kpi"><span class="kpi-label">Configuration</span><span class="kpi-value dc-kpi-text">${state.saved ? 'Saved' : 'Unsaved'}</span><span class="muted">${state.saved ? `Last saved ${fmtTime(state.lastSaved)}` : 'Save before validating coverage'}</span></div>
  </div>

  <div class="dc-setup-layout">
    <div>
      <section class="card">
        <div class="card-toolbar"><strong>${esc(state.scope)} · Defender plans</strong><span class="muted">Plan availability and pricing vary by scope and resource type</span></div>
        <div class="dc-plan-list">
          ${DEFENDER_CLOUD_AZURE_PLANS.map(plan => {
            const value = state.plans[plan.id];
            const suffix = plan.id === 'servers' && value.enabled ? ` · ${esc(value.tier)}` : '';
            return `<label class="dc-plan-row">
              <input type="checkbox" ${value.enabled ? 'checked' : ''} onchange="setDefenderCloudSetupPlan('${plan.id}', this.checked)">
              <span><strong>${esc(plan.name)}${suffix}</strong><small>${esc(plan.note)}</small></span>
              <span class="dc-plan-kind">${esc(plan.kind)}</span>
              <em>${value.enabled ? 'On' : 'Off'}</em>
            </label>`;
          }).join('')}
        </div>
        <div class="card-body dc-plan-footnote">
          Foundational CSPM is not one of these paid toggles. Enabling every paid plan can create charges; select plans according to the protected workloads and required detections.
        </div>
      </section>

      <section class="card">
        <div class="card-toolbar"><strong>Plan settings that affect signal coverage</strong><span class="muted">Configure after selecting the plan</span></div>
        <div class="dc-feature-grid">
          <div class="dc-feature-group ${server.enabled ? '' : 'disabled'}">
            <div class="dc-feature-head"><div><strong>Servers</strong><small>Plan 2 features are not available in Plan 1.</small></div>
              <select class="ipt input-sm" onchange="setDefenderCloudServersTier(this.value)" ${server.enabled ? '' : 'disabled'}><option ${server.tier === 'Plan 1' ? 'selected' : ''}>Plan 1</option><option ${server.tier === 'Plan 2' ? 'selected' : ''}>Plan 2</option></select>
            </div>
            <label><input type="checkbox" ${server.endpointProtection ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('servers','endpointProtection',this.checked)" ${server.enabled ? '' : 'disabled'}> Endpoint protection auto-provisioning</label>
            <label><input type="checkbox" ${server.agentlessScanning ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('servers','agentlessScanning',this.checked)" ${server.enabled && server.tier === 'Plan 2' ? '' : 'disabled'}> Agentless machine scanning</label>
            <label><input type="checkbox" ${server.fim ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('servers','fim',this.checked)" ${server.enabled && server.tier === 'Plan 2' ? '' : 'disabled'}> File integrity monitoring configured</label>
          </div>
          <div class="dc-feature-group ${containers.enabled ? '' : 'disabled'}">
            <div class="dc-feature-head"><div><strong>Containers</strong><small>Access requirements differ across AKS, EKS, and GKE.</small></div></div>
            <label><input type="checkbox" ${containers.defenderSensor ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('containers','defenderSensor',this.checked)" ${containers.enabled ? '' : 'disabled'}> Defender sensor</label>
            <label><input type="checkbox" ${containers.registryAccess ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('containers','registryAccess',this.checked)" ${containers.enabled ? '' : 'disabled'}> Registry access for image assessment</label>
          </div>
          <div class="dc-feature-group ${storage.enabled ? '' : 'disabled'}">
            <div class="dc-feature-head"><div><strong>Storage</strong><small>Malware scanning is billed separately from the base plan.</small></div></div>
            <label><input type="checkbox" ${storage.malwareScanning ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('storage','malwareScanning',this.checked)" ${storage.enabled ? '' : 'disabled'}> On-upload malware scanning add-on</label>
            <label><input type="checkbox" ${storage.sensitiveData ? 'checked' : ''} onchange="setDefenderCloudSetupFeature('storage','sensitiveData',this.checked)" ${storage.enabled ? '' : 'disabled'}> Sensitive-data threat detection</label>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-toolbar"><strong>Coverage validation</strong><span class="muted">Saving a plan starts component deployment; verify the result</span></div>
        <div class="dc-coverage-list">
          <div><span><strong>vm-app-01</strong><small>Azure virtual machine</small></span>${protectionStatus(server.enabled && state.saved, server.tier === 'Plan 2' ? 'Servers Plan 2 · MDE and agentless scanning selected' : 'Servers Plan 1 · endpoint protection selected')}</div>
          <div><span><strong>aks-prod</strong><small>Azure Kubernetes Service</small></span>${protectionStatus(containers.enabled && state.saved, 'Containers · sensor and registry coverage selected')}</div>
          <div><span><strong>stprodeuw</strong><small>Azure Storage account</small></span>${protectionStatus(storage.enabled && state.saved, `Storage · malware scanning ${storage.malwareScanning ? 'on' : 'off'} · sensitivity context ${storage.sensitiveData ? 'on' : 'off'}`)}</div>
          <div><span><strong>sql-orders-prod</strong><small>Azure SQL database</small></span>${protectionStatus(state.plans.databases.enabled && state.saved, 'Databases · confirm the Azure SQL subplan is selected')}</div>
        </div>
        <div class="card-body dc-coverage-actions"><span class="muted">Use the Coverage workbook for plan/resource gaps; then confirm the asset appears in inventory and produces recommendations or alerts.</span><a class="btn btn-secondary btn-sm" href="#/defender-cloud/inventory">Open inventory</a></div>
      </section>
    </div>

    <aside>
      <section class="card card-body">
        <div class="alert-section-title">Enablement path</div>
        <ol class="dc-step-list">
          <li><strong>Open Environment settings</strong><span>Select the Azure subscription or supported workspace to protect.</span></li>
          <li><strong>Select plans</strong><span>Choose only the workload plans the environment needs; use plan settings for extensions and add-ons.</span></li>
          <li><strong>Save and deploy</strong><span>Required monitoring components are provisioned to supported resources. Deployment can take time.</span></li>
          <li><strong>Verify coverage</strong><span>Check the Coverage workbook, inventory, recommendations, and component health—not just the toggle.</span></li>
          <li><strong>Investigate the signal</strong><span>Defender for Cloud alerts also flow automatically into the Defender portal for correlated SOC investigation.</span></li>
        </ol>
      </section>

      <section class="card card-body">
        <div class="alert-section-title">Permissions to remember</div>
        <dl class="dc-fact-list">
          <dt>View resource information</dt><dd>Owner, Contributor, or Reader at the subscription or resource-group scope.</dd>
          <dt>Change security policy</dt><dd>Security Admin, Owner, or Contributor at the relevant subscription scope.</dd>
          <dt>Least privilege</dt><dd>Grant the role at the narrowest scope that still covers the analyst or administrator's job.</dd>
        </dl>
      </section>

      <section class="card card-body">
        <div class="alert-section-title">Hybrid and multicloud are separate</div>
        <p class="muted">On-premises servers use Azure Arc. AWS accounts and GCP projects use native connectors with federated access; their connector flow also establishes the access needed for selected CSPM and workload-protection capabilities.</p>
        <a class="btn btn-secondary" href="#/defender-cloud/environment">Open connector lab</a>
      </section>

      <section class="card card-body">
        <div class="alert-section-title">SC-200 response handoff</div>
        <div class="button-stack">
          <a class="btn btn-primary" href="#/defender-cloud/alerts">Investigate workload alerts</a>
          <a class="btn btn-secondary" href="#/defender-cloud/attack-paths">Review attack paths</a>
          <a class="btn btn-secondary" href="#/defender-cloud/recommendations">Remediate recommendations</a>
        </div>
      </section>
    </aside>
  </div>`;
};

VIEWS['defender-cloud/explorer'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Defender for Cloud › <strong>Cloud Security Explorer</strong></div><h1>Cloud Security Explorer</h1><div class="page-subtitle">Explore resource queries that combine exposure, alerts, and recommendations.</div></div></div>
  <div class="card card-body">
    <div class="alert-section-title">Saved exploration</div>
    <pre class="kql">Resources
| where InternetExposure == "Public"
| join kind=leftouter SecurityAlerts on ResourceId
| join kind=leftouter Recommendations on ResourceId
| project ResourceName, ResourceType, AlertCount, RecommendationCount, AttackPath</pre>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>Explorer results</strong><a class="chip-link" href="#/defender-cloud/inventory">Open inventory →</a></div>
    <table class="grid"><thead><tr><th>Resource</th><th>Exposure</th><th>Risk</th><th>Reason</th></tr></thead><tbody>${CLOUD_ASSETS.filter(a=>a.risk !== 'Low').map(a => `<tr><td><strong>${esc(a.name)}</strong></td><td>${esc(a.exposure)}</td><td><span class="sev ${a.risk === 'High' ? 'high' : 'medium'}">${esc(a.risk)}</span></td><td>${a.alerts} alert(s), ${a.recs} recommendation(s)</td></tr>`).join('')}</tbody></table>
  </div>`;

VIEWS['defender-cloud/cloud-security'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Defender for Cloud › <strong>Cloud Security</strong></div><h1>Cloud Security</h1><div class="page-subtitle">Workload protection hub for alerts, attack paths, inventory, recommendations, and regulatory context.</div></div></div>
  <div class="tile-grid">
    <a class="tile" href="#/defender-cloud/alerts"><strong>Security alerts</strong><span>Investigate active workload-protection findings.</span></a>
    <a class="tile" href="#/defender-cloud/attack-paths"><strong>Attack paths</strong><span>Break exploitable paths across resources and identities.</span></a>
    <a class="tile" href="#/defender-cloud/inventory"><strong>Inventory</strong><span>Prioritize resources by risk and exposure.</span></a>
    <a class="tile" href="#/defender-cloud/recommendations"><strong>Recommendations</strong><span>Reduce posture findings that feed attack paths.</span></a>
  </div>`;

VIEWS['defender-cloud/environment'] = () => {
  const state = defenderCloudMulticloudState();
  const awsPlans = ['CSPM', 'Servers', 'Containers', 'Databases'];
  const gcpPlans = ['CSPM', 'Servers', 'Containers', 'Databases'];
  return `
  <div class="page-header">
    <div><div class="breadcrumb">Defender for Cloud › Management › <strong>Environment settings</strong></div><h1>Environment settings</h1><div class="page-subtitle">Onboard AWS and GCP connectors, then review file integrity monitoring and just-in-time VM access.</div></div>
    <div class="page-actions"><button class="btn btn-secondary" onclick="resetDefenderCloudMulticloudState()">Reset lab</button></div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">AWS connector</span><span class="kpi-value">${esc(state.aws.health)}</span></div>
    <div class="kpi"><span class="kpi-label">GCP connector</span><span class="kpi-value">${esc(state.gcp.health)}</span></div>
    <div class="kpi"><span class="kpi-label">FIM</span><span class="kpi-value">${state.fim.enabled ? 'On' : 'Off'}</span></div>
    <div class="kpi"><span class="kpi-label">JIT requests</span><span class="kpi-value">${esc(state.jit.requestState)}</span></div>
  </div>
  <div class="two-col">
    <section class="card card-body">
      <div class="alert-section-title">AWS connector wizard</div>
      <div class="flowline vertical-flow" style="margin-top:12px;">
        <div class="flow-step"><strong>1. Account and region scope</strong><span>Account ${esc(state.aws.accountId)} with coverage in ${esc((state.aws.regions || []).join(', '))}.</span></div>
        <div class="flow-step"><strong>2. Plan selection</strong><span>The lab includes CSPM and Servers coverage; you can toggle Containers or Databases if the scenario calls for it.</span></div>
        <div class="flow-step"><strong>3. Template deployment</strong><span>A CloudFormation-style stack provisions the cross-account role, permissions, and monitoring hooks in one pass.</span></div>
        <div class="flow-step"><strong>4. Connector health</strong><span>Status: <span class="tag ${state.aws.health === 'Healthy' ? 'green' : 'orange'}">${esc(state.aws.health)}</span> · Last sync ${fmtTime(state.aws.lastSync)}</span></div>
      </div>
      <div class="form-grid two" style="margin-top:14px;">
        ${awsPlans.map(plan => `<button class="btn ${state.aws.plans.includes(plan) ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="toggleDefenderCloudPlan('aws', '${plan}')">${esc(plan)}</button>`).join('')}
      </div>
      <div class="callout info" style="margin-top:14px;">${esc(state.aws.bootstrap)}. The lab keeps the workflow static, but the connector list, plan selection, and health state are persisted locally.</div>
      <div class="button-row" style="margin-top:14px;"><button class="btn btn-primary" onclick="advanceDefenderCloudOnboarding('aws')">Validate AWS connector</button></div>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">GCP connector wizard</div>
      <div class="flowline vertical-flow" style="margin-top:12px;">
        <div class="flow-step"><strong>1. Project and region scope</strong><span>Project ${esc(state.gcp.projectId)} with coverage in ${esc((state.gcp.regions || []).join(', '))}.</span></div>
        <div class="flow-step"><strong>2. Plan selection</strong><span>Containers and Databases are included for the lab scenario, with CSPM keeping posture findings in view.</span></div>
        <div class="flow-step"><strong>3. Cloud Shell bootstrap</strong><span>A short shell bootstrap script assigns the project permissions and prepares the connector registration.</span></div>
        <div class="flow-step"><strong>4. Connector health</strong><span>Status: <span class="tag ${state.gcp.health === 'Healthy' ? 'green' : 'orange'}">${esc(state.gcp.health)}</span> · Last sync ${fmtTime(state.gcp.lastSync)}</span></div>
      </div>
      <div class="form-grid two" style="margin-top:14px;">
        ${gcpPlans.map(plan => `<button class="btn ${state.gcp.plans.includes(plan) ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="toggleDefenderCloudPlan('gcp', '${plan}')">${esc(plan)}</button>`).join('')}
      </div>
      <div class="callout info" style="margin-top:14px;">${esc(state.gcp.bootstrap)}. Warning health keeps the inventory and alert surfaces noisy enough for triage practice.</div>
      <div class="button-row" style="margin-top:14px;"><button class="btn btn-primary" onclick="advanceDefenderCloudOnboarding('gcp')">Validate GCP connector</button></div>
    </section>
  </div>
  <div class="two-col" style="margin-top:16px;">
    <section class="card card-body">
      <div class="alert-section-title">File integrity monitoring</div>
      <div class="callout ${state.fim.enabled ? 'success' : 'warn'}">Enable FIM on the plan that matters most, then watch for unexpected edits to critical files on servers and container nodes.</div>
      <div class="flowline vertical-flow" style="margin-top:12px;">
        <div class="flow-step"><strong>Monitored entities</strong><span>${esc(state.fim.monitored.join(' · '))}</span></div>
        <div class="flow-step"><strong>Recent change events</strong><span>${esc(state.fim.recentChanges.map(ev => `${ev.item} (${ev.source})`).join(' · '))}</span></div>
      </div>
      <table class="grid" style="margin-top:14px;"><thead><tr><th>Item</th><th>Change</th><th>Source</th></tr></thead><tbody>${state.fim.recentChanges.map(ev => `<tr><td>${esc(ev.item)}</td><td>${esc(ev.change)}</td><td>${esc(ev.source)}</td></tr>`).join('')}</tbody></table>
      <div class="button-row" style="margin-top:14px;"><button class="btn ${state.fim.enabled ? 'btn-secondary' : 'btn-primary'}" onclick="toggleDefenderCloudFim()">${state.fim.enabled ? 'Disable FIM' : 'Enable FIM'}</button></div>
    </section>
    <section class="card card-body">
      <div class="alert-section-title">Just-in-time VM access</div>
      <div class="callout info">Request access only when you need a port open briefly. In the lab, the approval is static and local-only, but the sequence mirrors the real decision path.</div>
      <table class="grid" style="margin-top:14px;"><thead><tr><th>VM</th><th>Ports</th><th>Duration</th><th>Status</th></tr></thead><tbody>
        <tr><td><strong>${esc(state.jit.vm)}</strong></td><td>${esc(state.jit.ports.join(', '))}</td><td>${esc(state.jit.duration)}</td><td><span class="tag green">${esc(state.jit.requestState)}</span></td></tr>
      </tbody></table>
      <div class="flowline vertical-flow" style="margin-top:14px;">
        <div class="flow-step"><strong>Requester</strong><span>${esc(state.jit.requestor)}</span></div>
        <div class="flow-step"><strong>Note</strong><span>${esc(state.jit.note)}</span></div>
      </div>
      <div class="button-row" style="margin-top:14px;"><button class="btn btn-primary" onclick="requestDefenderCloudJitAccess()">Request access</button></div>
    </section>
  </div>`;
};

VIEWS['defender-cloud/workflow'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Defender for Cloud › Management › <strong>Workflow automation</strong></div><h1>Workflow automation</h1><div class="page-subtitle">Route Defender for Cloud alerts and recommendations into local response steps.</div></div></div>
  <div class="two-col">
    <section class="card"><div class="card-toolbar"><strong>Automation rules</strong><span class="muted">No real Logic Apps called</span></div><table class="grid"><thead><tr><th>Status</th><th>Trigger</th><th>Action</th><th>Scope</th></tr></thead><tbody>
      <tr><td><span class="tag green">Enabled</span></td><td>High severity security alert</td><td>Create SOC task and notify cloud responder</td><td>sub-prod-001</td></tr>
      <tr><td><span class="tag green">Enabled</span></td><td>Attack path severity high</td><td>Open incident note and link affected assets</td><td>Production resources</td></tr>
      <tr><td><span class="tag orange">Draft</span></td><td>Storage public network recommendation</td><td>Create remediation ticket</td><td>Storage accounts</td></tr>
    </tbody></table></section>
    <section class="card card-body"><div class="alert-section-title">Response mapping</div><ul><li>Workload-protection alerts feed the Defender for Cloud alert queue.</li><li>High-risk attack paths should link to inventory and recommendations.</li><li>Automation in this lab is local-only and represented by static task creation.</li></ul></section>
  </div>`;

// ====================================================================
// PURVIEW
// ====================================================================
VIEWS['purview/home'] = () => `
  <section class="purview-welcome">
    <div class="purview-welcome-visual" aria-label="Connected data estate">
      <div class="purview-source-map">
        ${PURVIEW_CONNECTED_SOURCES.map((s, index) => `
          <button class="purview-source-node ${s.status === 'Connected' ? 'connected' : ''} node-${index}" onclick="navigate('${s.status === 'Connected' ? '#/purview/solutions' : '#/purview/settings'}')">
            <span>${esc(s.icon)}</span>
            <strong>${esc(s.name)}</strong>
          </button>
        `).join('')}
        <div class="purview-cloud-hub">
          <span class="purview-cloud-mark"></span>
          <strong>Hack Smarter Labs<br>Purview</strong>
        </div>
      </div>
      <div class="purview-connection-status"><span class="status-dot resolved"></span>2 connected sources · 280 discovered assets</div>
    </div>

    <div class="purview-welcome-copy">
      <div class="breadcrumb">Purview</div>
      <h1>Welcome to the Purview portal</h1>
      <p>
        Use the unified portal for data security, risk and compliance, audit,
        eDiscovery, records, lifecycle, and modern governance workflows across
        365, Azure, and connected third-party data sources.
      </p>
      <div class="purview-consent">
        <label><input type="checkbox" checked disabled> Terms of data-flow disclosure accepted for this lab tenant</label>
        <span>Static lab mode · no real tenant data leaves this browser.</span>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="navigate('#/purview/solutions')">Get started</button>
        <button class="btn btn-secondary" onclick="navigate('#/purview/classic-governance')">Go to classic portal</button>
      </div>
    </div>
  </section>

  <div class="purview-notice">
    <span class="purview-info">i</span>
    <div>
      <strong>Which portal should this lab use?</strong>
      Use the Purview portal for current data security, compliance, audit, eDiscovery, records, lifecycle, and modern governance tasks. Use classic only when the lab explicitly references Data Catalog classic, Data Health Insights classic, Workflow classic, Azure-launched Purview accounts, or web.purview.azure.com.
    </div>
  </div>

  <section class="purview-mode-grid" aria-label="Purview portal options">
    <button class="purview-mode-card active" onclick="navigate('#/purview/solutions')">
      <span class="purview-mode-label">New portal</span>
      <strong>Purview portal</strong>
      <small>Unified data security, risk and compliance, audit, eDiscovery, records, and lifecycle workflows.</small>
    </button>
    <button class="purview-mode-card classic" onclick="navigate('#/purview/classic-governance')">
      <span class="purview-mode-label">Classic option</span>
      <strong>Classic governance portal</strong>
      <small>Use when a lab step mentions Data Catalog classic, Data Health Insights classic, Workflow classic, or web.purview.azure.com.</small>
    </button>
  </section>

  <section class="purview-solution-strip" aria-label="Purview solutions">
    <button class="purview-solution-card" onclick="navigate('#/purview/classic-governance')">
      <span class="purview-solution-icon">▥</span>
      <strong>Data Catalog classic</strong>
    </button>
    <button class="purview-solution-card" onclick="navigate('#/purview/information-protection')">
      <span class="purview-solution-icon">🔐</span>
      <strong>Information Protection</strong>
    </button>
    <button class="purview-solution-card" onclick="navigate('#/purview/dlp')">
      <span class="purview-solution-icon">🛡</span>
      <strong>Data Loss Prevention</strong>
    </button>
    <button class="purview-solution-card" onclick="navigate('#/purview/insider-risk')">
      <span class="purview-solution-icon">👤</span>
      <strong>Insider Risk Management</strong>
    </button>
    <button class="purview-solution-card" onclick="navigate('#/purview/ai-hub')">
      <span class="purview-solution-icon">✦</span>
      <strong>AI Hub preview</strong>
    </button>
    <button class="purview-solution-card" onclick="navigate('#/purview/solutions')">
      <span class="purview-solution-icon">▦</span>
      <strong>View all solutions →</strong>
    </button>
  </section>

  <div class="section-title">Related portals</div>
  <section class="purview-related-grid">
    ${[
      ['Privacy Center', 'Discover privacy risk workflows.', '🔒', '#/purview/solutions'],
      ['Data Fabric', 'Analytics lakehouse and warehouse context.', '▣', '#/sentinel/logs'],
      ['Defender', 'Monitor security incidents and alerts.', '🛡', '#/defender/home'],
      ['Entra', 'Identity and access context.', '◈', '#/defender/identities'],
      ['Service Trust', 'Compliance resources and trust documentation.', '▤', '#/purview/records'],
    ].map(([name, detail, icon, route]) => `
      <button class="purview-related-card" onclick="navigate('${route}')">
        <span class="purview-related-icon">${icon}</span>
        <div>
          <strong>${name}</strong>
          <small>${detail}</small>
        </div>
        <span class="purview-external">↗</span>
      </button>
    `).join('')}
  </section>
`;

VIEWS['purview/classic-governance'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Purview › <strong>Classic governance portal</strong></div>
      <h1>Classic Purview governance portal</h1>
      <div class="page-subtitle">Support-mode governance experience for older Azure Purview-style lab steps.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="navigate('#/purview/home')">Back to Purview home</button>
      <button class="btn btn-primary" onclick="navigate('#/purview/home')">Open Purview portal</button>
    </div>
  </div>

  <div class="purview-classic-note">
    <strong>Classic support-mode note</strong>
    <span>Use this path when instructions refer to the classic governance portal, a Purview account launched from Azure, or <code>web.purview.azure.com</code>. New labs should prefer the unified Purview portal unless the step explicitly calls for classic catalog, insights, or workflow screens.</span>
  </div>

  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Data sources</span><span class="kpi-value">12</span><span class="kpi-delta">Registered in catalog</span></div>
    <div class="kpi"><span class="kpi-label">Assets</span><span class="kpi-value">428</span><span class="kpi-delta">Scanned metadata rows</span></div>
    <div class="kpi"><span class="kpi-label">Glossary terms</span><span class="kpi-value">37</span><span class="kpi-delta">Business taxonomy</span></div>
    <div class="kpi"><span class="kpi-label">Workflows</span><span class="kpi-value">3</span><span class="kpi-delta">Approval demos</span></div>
  </div>

  <div class="two-col">
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>Classic quick access</strong>
        <span class="muted">Role-dependent shortcuts</span>
      </div>
      <div class="classic-action-grid">
        <button class="classic-action">Browse assets</button>
        <button class="classic-action">Manage glossary</button>
        <button class="classic-action">Knowledge center</button>
        <button class="classic-action">View glossary</button>
      </div>
    </div>
    <div class="card card-body">
      <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
        <strong>When to use classic</strong>
      </div>
      <ol class="mini-steps">
        <li>Lab says launch a Purview account from Azure portal.</li>
        <li>Lab URL references web.purview.azure.com or a Purview account resource path.</li>
        <li>Task names Data Catalog classic, Data Health Insights classic, or Purview Workflow classic.</li>
        <li>Task asks for classic home features such as catalog analytics, recently accessed assets, or guided tours.</li>
      </ol>
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>Classic governance features</strong><span class="muted">Mapped to local lab context</span></div>
    <div class="solution-grid">
      ${CLASSIC_PURVIEW_FEATURES.map(f => `
        <button class="solution-card" onclick="navigate('${f.route}')">
          <strong>${esc(f.name)}</strong>
          <span>${esc(f.detail)}</span>
        </button>
      `).join('')}
    </div>
  </div>

  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>Recently accessed assets</strong><span class="muted">Classic catalog mock data</span></div>
    <table class="grid">
      <thead><tr><th>Asset</th><th>Type</th><th>Collection</th><th>Owner</th><th>Classification</th></tr></thead>
      <tbody>
        <tr><td><strong>customer-list.xlsx</strong></td><td>Excel workbook</td><td>Finance</td><td>jdoe@hacksmarterlabs.example</td><td><span class="tag">Credit card number</span></td></tr>
        <tr><td><strong>employee-roster.csv</strong></td><td>CSV file</td><td>HR</td><td>maria.ross@hacksmarterlabs.example</td><td><span class="tag">U.S. SSN</span></td></tr>
        <tr><td><strong>audit-export-2026</strong></td><td>Storage path</td><td>Security</td><td>soc@hacksmarterlabs.example</td><td><span class="tag">Operational logs</span></td></tr>
      </tbody>
    </table>
  </div>
`;

VIEWS['purview/solutions'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Purview › <strong>Solutions</strong></div>
      <h1>Solutions</h1>
      <div class="page-subtitle">Solution cards are grouped by Core, Risk & Compliance, Data Governance, and Data Security.</div>
    </div>
  </div>
  ${['Core','Data Security','Risk & Compliance','Data Governance'].map(area => `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-toolbar"><strong>${esc(area)}</strong></div>
      <div class="solution-grid">
        ${PURVIEW_SOLUTIONS.filter(s => s.area === area).map(s => `
          <button class="solution-card" onclick="navigate('${s.route}')">
            <strong>${esc(s.name)}</strong>
            <span>${esc(s.detail)}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('')}
`;

VIEWS['purview/ai-hub'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Purview › <strong>AI Hub preview</strong></div>
      <h1>AI Hub preview</h1>
      <div class="page-subtitle">Synthetic view for monitoring AI app usage, risky prompts, and sensitive-data exposure in this lab.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="navigate('#/purview/dlp')">Review DLP policies</button>
      <button class="btn btn-primary" onclick="navigate('#/purview/audit')">Search audit events</button>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">AI apps discovered</span><span class="kpi-value">7</span><span class="kpi-delta">3 sanctioned</span></div>
    <div class="kpi"><span class="kpi-label">Sensitive prompts</span><span class="kpi-value">14</span><span class="kpi-delta bad">4 need review</span></div>
    <div class="kpi"><span class="kpi-label">Labeled files used</span><span class="kpi-value">29</span><span class="kpi-delta">Confidential scope</span></div>
    <div class="kpi"><span class="kpi-label">Policy matches</span><span class="kpi-value">5</span><span class="kpi-delta">DLP + audit</span></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-toolbar"><strong>Recent AI activity</strong><span class="muted">Lab-only examples</span></div>
      <table class="grid">
        <thead><tr><th>User</th><th>App</th><th>Signal</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>jdoe@hacksmarterlabs.example</td><td>Copilot for 365</td><td>Prompt referenced customer-list.xlsx</td><td><span class="tag orange">Review</span></td></tr>
          <tr><td>maria.ross@hacksmarterlabs.example</td><td>Approved summarizer</td><td>Used labeled HR document</td><td><span class="tag green">Allowed</span></td></tr>
          <tr><td>sales.rep@hacksmarterlabs.example</td><td>Unsanctioned AI app</td><td>Browser upload attempted</td><td><span class="tag orange">Blocked</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="card card-body">
      <div class="alert-section-title">Expected SC-200 workflow</div>
      <ol class="mini-steps">
        <li>Review discovered AI apps and users.</li>
        <li>Pivot sensitive prompts to DLP incidents.</li>
        <li>Use audit search to validate file access and sharing.</li>
        <li>Adjust labels, DLP rules, or allowed app controls.</li>
      </ol>
    </div>
  </div>
`;

VIEWS['purview/dlp'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Purview › <strong>DLP</strong></div><h1>Data loss prevention policies</h1></div></div>
  <div class="card" style="margin-bottom:16px;">
    <div class="card-toolbar"><strong>DLP incidents</strong><span class="muted">SC-200 review and override workflow</span></div>
    <table class="grid">
      <thead><tr><th>Severity</th><th>Incident</th><th>User</th><th>Location</th><th>Sensitive info</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${DLP_INCIDENTS.map(i => `
          <tr>
            <td><span class="sev ${i.severity}">${cap(i.severity)}</span></td>
            <td><strong>${esc(i.id)}</strong><br><span class="muted">${esc(i.activity)} · ${fmtTime(i.time)}</span></td>
            <td>${esc(i.user)}</td>
            <td>${esc(i.location)}<br><span class="kv">${esc(i.item)}</span></td>
            <td>${i.sensitiveInfo.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</td>
            <td>${esc(i.status)}</td>
            <td>${i.actions.slice(0,3).map(a => `<span class="entity-chip">${esc(a)}</span>`).join('')}</td>
          </tr>
          <tr class="detail-row"><td></td><td colspan="6">
            <ol class="mini-steps">${i.timeline.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
          </td></tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ${DLP_POLICIES.map(p => `
    <div class="card">
      <div class="card-toolbar">
        <strong>${esc(p.name)}</strong>
        <span><span class="status-dot ${p.enabled?'resolved':'warn'}"></span>${p.enabled?'Enabled':'Disabled'} · ${esc(p.scope)}</span>
      </div>
      <div class="card-body">
        ${p.rules.map(r => `
          <div style="margin-bottom:10px;">
            <strong>${esc(r.name)}</strong>
            <div class="alert-section-title" style="margin:8px 0 4px;">Conditions</div>
            <ul style="margin:0; padding-left:18px; font-size:12px;">${r.conditions.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
            <div class="alert-section-title" style="margin:8px 0 4px;">Actions</div>
            <ul style="margin:0; padding-left:18px; font-size:12px;">${r.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
`;

VIEWS['purview/insider-risk'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Purview › <strong>Insider risk</strong></div><h1>Insider risk management</h1></div></div>
  <div class="card" style="margin-bottom:16px;">
    <div class="card-toolbar"><strong>Cases</strong><a class="chip-link" href="#/purview/ediscovery">Open eDiscovery →</a></div>
    <table class="grid">
      <thead><tr><th>Priority</th><th>Case</th><th>User</th><th>Risk score</th><th>Evidence</th><th>Next steps</th></tr></thead>
      <tbody>
        ${INSIDER_RISK_CASES.map(c => `
          <tr>
            <td><span class="sev ${c.priority.toLowerCase() === 'high' ? 'high' : 'medium'}">${esc(c.priority)}</span></td>
            <td><strong>${esc(c.id)}</strong><br><span class="muted">${esc(c.policy)} · ${esc(c.status)}</span></td>
            <td>${esc(c.user)}<br><span class="muted">${esc(c.trigger)}</span></td>
            <td><strong>${c.riskScore}</strong></td>
            <td>${c.evidence.map(e => `<span class="tag">${esc(e)}</span>`).join('')}</td>
            <td>${c.nextSteps.map(s => `<span class="entity-chip">${esc(s)}</span>`).join('')}</td>
          </tr>
          <tr class="detail-row"><td></td><td colspan="5">${esc(c.summary)}</td></tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <div class="card">
    <table class="grid">
      <thead><tr><th>Policy</th><th>Status</th><th>Alerts</th><th>Triggers</th></tr></thead>
      <tbody>
        ${INSIDER_RISK_POLICIES.map(p => `
          <tr>
            <td><strong>${esc(p.name)}</strong></td>
            <td><span class="tag ${p.status==='Active'?'green':'orange'}">${esc(p.status)}</span></td>
            <td>${p.alerts}</td>
            <td><span class="muted" style="font-size:12px;">${p.triggers.map(esc).join(' · ')}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
`;

VIEWS['purview/communication-compliance'] = () => `
  <div class="page-header">
    <div><div class="breadcrumb">Purview › <strong>Communication compliance</strong></div><h1>Communication compliance</h1></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>${COMMUNICATION_REVIEWS.length}</strong> items pending or recently reviewed</div>
    <table class="grid">
      <thead><tr><th>Severity</th><th>Review</th><th>User</th><th>Channel</th><th>Detected condition</th><th>Status</th></tr></thead>
      <tbody>
        ${COMMUNICATION_REVIEWS.map(r => `
          <tr>
            <td><span class="sev ${r.severity}">${cap(r.severity)}</span></td>
            <td><strong>${esc(r.id)}</strong><br><span class="muted">${esc(r.policy)}</span></td>
            <td>${esc(r.user)}</td>
            <td>${esc(r.channel)}</td>
            <td>${esc(r.detected)}<br><span class="muted">${esc(r.message)}</span></td>
            <td>${esc(r.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

VIEWS['purview/graph-activity'] = () => {
  const rows = MOCK_QUERY_RESULTS.GraphActivityLogs || [];
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Purview › <strong>Graph activity logs</strong></div>
        <h1>Graph activity logs</h1>
        <div class="page-subtitle">Investigation guidance and fixture rows for API activity after OAuth consent, risky sign-ins, or compromised-token events.</div>
      </div>
      <div class="page-actions">
        <a class="btn btn-secondary" href="#/defender/hunting">Advanced hunting</a>
        <a class="btn btn-primary" href="#/purview/audit">Audit search</a>
      </div>
    </div>
    <div class="three-col">
      ${GRAPH_ACTIVITY_GUIDANCE.map(g => `
        <div class="card card-body">
          <div class="alert-section-title">${esc(g.title)}</div>
          <p class="muted">${esc(g.detail)}</p>
        </div>
      `).join('')}
    </div>
    <div class="two-col" style="margin-top:16px; grid-template-columns: 1fr 340px;">
      <div class="card">
        <div class="card-toolbar"><strong>GraphActivityLogs fixture rows</strong><span class="muted">${rows.length} rows</span></div>
        <table class="grid">
          <thead><tr><th>Time</th><th>User</th><th>App</th><th>Operation</th><th>Request</th><th>IP</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${fmtTime(r.TimeGenerated)}</td>
                <td>${esc(r.UserPrincipalName)}</td>
                <td><strong>${esc(r.AppDisplayName)}</strong><br><span class="muted">${esc(r.AppId)}</span></td>
                <td>${esc(r.Operation)}</td>
                <td class="kv">${esc(r.RequestUri)}</td>
                <td>${esc(r.IPAddress)}</td>
                <td>${esc(r.ResultStatus)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="card card-body">
        <div class="alert-section-title">Hunting query</div>
        <pre class="kql-snippet">GraphActivityLogs
| where AppDisplayName == "DocViewer Pro"
| project TimeGenerated, UserPrincipalName, AppDisplayName, Operation, RequestUri, IPAddress, ResultStatus</pre>
        <div class="alert-section-title">Use with</div>
        <div class="connector-list">
          <div><strong>Threat analytics</strong><span>Validate affected assets and exposed apps.</span></div>
          <div><strong>CloudAppEvents</strong><span>Correlate consent grants and app governance events.</span></div>
          <div><strong>Purview Audit</strong><span>Confirm user-visible mailbox and file operations.</span></div>
        </div>
      </div>
    </div>
  `;
};

VIEWS['purview/ediscovery'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Purview › <strong>eDiscovery</strong></div>
      <h1>eDiscovery cases</h1>
      <div class="page-subtitle">Build a Content search, preview matching evidence, then prepare an investigation export.</div>
    </div>
  </div>
  <div class="three-col">
    ${EDISCOVERY_CASES.map(c => `
      <div class="card card-body">
        <div class="card-toolbar" style="padding:0 0 8px; border-bottom:0;">
          <strong>${esc(c.name)}</strong>
          <span class="tag ${c.status === 'Active' ? 'green' : 'orange'}">${esc(c.status)}</span>
        </div>
        <div class="muted">${esc(c.id)} · linked to ${esc(c.linkedCase)}</div>
        <div class="alert-section-title">Custodians</div>
        ${c.custodians.map(x => `<span class="entity-chip">${esc(x)}</span>`).join('')}
        <div class="alert-section-title">Sources and holds</div>
        ${c.sources.concat(c.holds).map(x => `<span class="tag">${esc(x)}</span>`).join('')}
        <div class="alert-section-title">Searches</div>
        <ol class="mini-steps">${c.searches.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>
    `).join('')}
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Content search workflow</strong>
      <span class="muted">${esc(EDISCOVERY_CONTENT_SEARCH.caseId)} · ${esc(EDISCOVERY_CONTENT_SEARCH.name)}</span>
    </div>
    <div class="two-col" style="grid-template-columns: 340px 1fr; padding:14px;">
      <div>
        <div class="alert-section-title">Build search</div>
        <div class="connector-list">
          <div><strong>Query</strong><span class="kv">${esc(EDISCOVERY_CONTENT_SEARCH.query)}</span></div>
          <div><strong>Locations</strong><span>${EDISCOVERY_CONTENT_SEARCH.locations.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</span></div>
          <div><strong>Conditions</strong><span>${EDISCOVERY_CONTENT_SEARCH.conditions.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</span></div>
        </div>
        <div class="alert-section-title">Export for investigation</div>
        <ol class="mini-steps">${EDISCOVERY_CONTENT_SEARCH.export.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      </div>
      <div>
        <div class="alert-section-title">Preview results</div>
        <table class="grid">
          <thead><tr><th>Location</th><th>Item</th><th>Custodian</th><th>Date</th><th>Match</th></tr></thead>
          <tbody>
            ${EDISCOVERY_CONTENT_SEARCH.preview.map(r => `
              <tr>
                <td>${esc(r.location)}<br><span class="muted">${esc(r.kind)}</span></td>
                <td><strong>${esc(r.item)}</strong></td>
                <td>${esc(r.custodian)}</td>
                <td>${fmtTime(r.date)}</td>
                <td>${esc(r.match)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="callout info" style="margin-top:12px;">${esc(EDISCOVERY_CONTENT_SEARCH.interpretation)}</div>
      </div>
    </div>
  </div>
`;

VIEWS['purview/records'] = () => `
  <div class="page-header">
    <div><div class="breadcrumb">Purview › <strong>Records management</strong></div><h1>Records management</h1></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>Retention and record labels</strong></div>
    <table class="grid">
      <thead><tr><th>Status</th><th>Name</th><th>Type</th><th>Locations</th><th>Disposition</th></tr></thead>
      <tbody>
        ${RECORD_LABELS.map(r => `
          <tr>
            <td><span class="status-dot resolved"></span>${esc(r.status)}</td>
            <td><strong>${esc(r.name)}</strong></td>
            <td>${esc(r.type)}</td>
            <td>${esc(r.locations)}</td>
            <td>${esc(r.disposition)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

VIEWS['purview/lifecycle'] = () => `
  <div class="page-header">
    <div><div class="breadcrumb">Purview › <strong>Data lifecycle management</strong></div><h1>Data lifecycle management</h1></div>
  </div>
  <div class="card">
    <div class="card-toolbar"><strong>Lifecycle policies</strong></div>
    <table class="grid">
      <thead><tr><th>Status</th><th>Policy</th><th>Scope</th><th>Rule</th><th>Action</th></tr></thead>
      <tbody>
        ${LIFECYCLE_POLICIES.map(p => `
          <tr>
            <td><span class="tag ${p.status === 'Active' ? 'green' : 'orange'}">${esc(p.status)}</span></td>
            <td><strong>${esc(p.name)}</strong></td>
            <td>${esc(p.scope)}</td>
            <td>${esc(p.rule)}</td>
            <td>${esc(p.action)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
`;

VIEWS['purview/settings'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Purview › <strong>Settings</strong></div>
      <h1>Settings</h1>
      <div class="page-subtitle">Centralized portal and solution settings, matching the new Purview portal model.</div>
    </div>
  </div>
  <div class="three-col">
    <div class="card card-body"><div class="alert-section-title">Portal-wide</div><span class="entity-chip">Themes</span><span class="entity-chip">Language and time zone</span><span class="entity-chip">Contact preferences</span></div>
    <div class="card card-body"><div class="alert-section-title">Solution settings</div><span class="entity-chip">DLP</span><span class="entity-chip">Insider risk</span><span class="entity-chip">Audit</span><span class="entity-chip">eDiscovery</span></div>
    <div class="card card-body"><div class="alert-section-title">Roles and scopes</div><span class="entity-chip">Role groups</span><span class="entity-chip">Administrative units</span><span class="entity-chip">PIM delay note</span></div>
  </div>
`;

VIEWS['purview/information-protection'] = () => `
  <div class="page-header"><div><div class="breadcrumb">Purview › <strong>Information protection</strong></div><h1>Sensitivity labels</h1></div></div>
  <div class="two-col">
    <div class="card">
      <div class="card-toolbar"><strong>${SENSITIVITY_LABELS.length}</strong> labels</div>
      <table class="grid">
        <thead><tr><th>Label</th><th>Protection</th></tr></thead>
        <tbody>
          ${SENSITIVITY_LABELS.map(l => `
            <tr>
              <td><span class="status-dot" style="background:${l.color}"></span><strong>${esc(l.name)}</strong></td>
              <td>${esc(l.protection)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-toolbar"><strong>Label policies</strong></div>
      <div class="card-body">
        ${LABEL_POLICIES.map(p => `
          <div style="margin-bottom:14px;">
            <strong>${esc(p.name)}</strong> <span class="tag green">${esc(p.status)}</span>
            <div class="muted" style="font-size:12px;">${esc(p.users)} · ${p.labels.map(esc).join(', ')}</div>
            <ul style="margin:6px 0 0; padding-left:18px; font-size:12px; line-height:1.6;">${p.settings.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar"><strong>Recent labeling activity</strong></div>
    <table class="grid">
      <thead><tr><th>Time</th><th>User</th><th>File</th><th>Label</th><th>Action</th></tr></thead>
      <tbody>${LABEL_ACTIVITY.map(a => `
        <tr><td>${fmtTime(a.time)}</td><td>${esc(a.user)}</td><td class="kv">${esc(a.file)}</td><td>${esc(a.label)}</td><td>${esc(a.action)}</td></tr>
      `).join('')}</tbody>
    </table>
  </div>
`;

VIEWS['purview/audit'] = () => ({
  html: `<div id="audit-premium-root"></div>`,
  onMount: () => {
    const state = {
      tab: 'search',
      filters: { op: '', user: '', workload: '', ip: '' },
      selected: new Set(),
      exportSummary: null,
      policies: AUDIT_RETENTION_POLICIES.map(p => ({ ...p, recordTypes: [...p.recordTypes], users: [...p.users] })),
      draft: { name: '', users: '', recordTypes: 'ExchangeItem, SharePointFileOperation', duration: '90 days', priority: '3' },
    };

    const root = document.getElementById('audit-premium-root');

    function filteredRows() {
      const op = state.filters.op.trim().toLowerCase();
      const user = state.filters.user.trim().toLowerCase();
      const workload = state.filters.workload.trim().toLowerCase();
      const ip = state.filters.ip.trim().toLowerCase();
      return AUDIT_LOG.filter(a =>
        (!op || op === 'any' || a.op.toLowerCase().includes(op)) &&
        (!user || a.user.toLowerCase().includes(user)) &&
        (!workload || a.workload.toLowerCase().includes(workload)) &&
        (!ip || a.ip.toLowerCase().includes(ip)));
    }

    function selectedRows(rows) {
      return rows.filter(row => state.selected.has(row.time + '|' + row.user + '|' + row.op));
    }

    function estimateExport(rows) {
      const count = rows.length;
      return {
        count,
        size: `${Math.max(1, count * 9)} KB`,
        limit: 'Mock preview capped at 50 rows in the lab; export packages are fictional and local only.',
      };
    }

    function renderSearchTab(rows) {
      const picked = selectedRows(rows);
      const exportBase = picked.length ? picked : rows;
      const exportInfo = state.exportSummary || estimateExport(exportBase);
      return `
        <div class="two-col" style="margin-top:14px;">
          <section class="card card-body">
            <div class="alert-section-title">Search audit events</div>
            <div class="two-col">
              <div><label class="lbl">Activity</label><input id="audit-op" class="ipt" value="${esc(state.filters.op)}" placeholder="FileDownloaded, UserLoggedIn, CopilotInteraction"></div>
              <div><label class="lbl">User</label><input id="audit-user" class="ipt" value="${esc(state.filters.user)}" placeholder="user@hacksmarterlabs.example"></div>
            </div>
            <div class="two-col" style="margin-top:8px;">
              <div><label class="lbl">Workload</label><input id="audit-workload" class="ipt" value="${esc(state.filters.workload)}" placeholder="AzureAD, SharePoint, OneDrive"></div>
              <div><label class="lbl">IP address</label><input id="audit-ip" class="ipt" value="${esc(state.filters.ip)}" placeholder="76.21.55.4"></div>
            </div>
            <div class="sidepanel-footer" style="padding-top:12px; align-items:center;">
              <button id="audit-search" class="btn btn-primary">Search</button>
              <button id="audit-export" class="btn btn-secondary">Prepare export</button>
              <span class="muted">${rows.length} matched rows</span>
            </div>
            <div class="callout info" style="margin-top:12px;">
              Premium audit keeps older activity searchable and includes record types such as <strong>CopilotInteraction</strong>. Use it when the investigation spans beyond the default retention window.
            </div>
          </section>
          <section class="card card-body">
            <div class="alert-section-title">Audit export summary</div>
            <div class="callout ${state.exportSummary ? 'success' : 'info'}">
              <strong>${esc(exportInfo.count)} row preview</strong>
              <div>${esc(exportInfo.size)}</div>
              <div style="margin-top:4px;">${esc(exportInfo.limit)}</div>
            </div>
            ${state.exportSummary ? `
              <div class="callout success" style="margin-top:12px;">
                Export queued for ${esc(state.exportSummary.count)} rows from ${esc(state.exportSummary.source)}.
              </div>
            ` : ''}
            <div class="alert-section-title" style="margin-top:12px;">Premium-only samples</div>
            <table class="grid">
              <thead><tr><th>Time</th><th>User</th><th>Workload</th><th>Detail</th></tr></thead>
              <tbody>
                ${AUDIT_COPILOT_EVENTS.map(a => `
                  <tr>
                    <td>${fmtTime(a.time)}</td>
                    <td>${esc(a.user)}</td>
                    <td>${esc(a.workload)}</td>
                    <td class="kv">${esc(a.detail)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </section>
        </div>
        <div class="card" style="margin-top:16px;">
          <div class="card-toolbar">
            <strong>Audit results</strong>
            <span class="muted">${rows.length} matching rows</span>
          </div>
          <table class="grid">
            <thead><tr><th></th><th>Date (UTC)</th><th>User</th><th>Operation</th><th>Workload</th><th>Item</th><th>IP</th></tr></thead>
            <tbody>
              ${rows.map(a => {
                const id = a.time + '|' + a.user + '|' + a.op;
                const checked = state.selected.has(id) ? 'checked' : '';
                return `
                  <tr>
                    <td><input type="checkbox" class="audit-select" data-audit-id="${esc(id)}" ${checked}></td>
                    <td>${fmtTime(a.time)}</td>
                    <td>${esc(a.user)}</td>
                    <td><strong>${esc(a.op)}</strong></td>
                    <td>${esc(a.workload)}</td>
                    <td class="kv">${esc(a.item)}</td>
                    <td>${esc(a.ip)}</td>
                  </tr>`;
              }).join('') || '<tr><td colspan="7" class="muted">No matching audit events.</td></tr>'}
            </tbody>
          </table>
        </div>`;
    }

    function renderPoliciesTab() {
      return `
        <div class="two-col" style="margin-top:14px;">
          <section class="card card-body">
            <div class="alert-section-title">Standard vs Premium</div>
            <div class="two-col">
              <div class="callout info">
                <strong>Standard audit</strong>
                <div>Good for recent activity and baseline triage. The lab keeps the surface intentionally small here.</div>
              </div>
              <div class="callout success">
                <strong>Audit (Premium)</strong>
                <div>Longer searchable retention, policy-based retention control, and record types like <strong>CopilotInteraction</strong>.</div>
              </div>
            </div>
            <div class="callout warn" style="margin-top:12px;">
              Premium search matters when the incident timeline crosses retention windows or when you need to track Copilot activity alongside mailbox and file events.
            </div>
          </section>
          <section class="card card-body">
            <div class="alert-section-title">Create retention policy</div>
            <div class="two-col">
              <div><label class="lbl">Policy name</label><input id="audit-policy-name" class="ipt" value="${esc(state.draft.name)}" placeholder="Finance quarterly retention"></div>
              <div><label class="lbl">Users</label><input id="audit-policy-users" class="ipt" value="${esc(state.draft.users)}" placeholder="user1@hacksmarterlabs.example, user2@hacksmarterlabs.example"></div>
            </div>
            <div class="two-col" style="margin-top:8px;">
              <div><label class="lbl">Record types</label><input id="audit-policy-recordtypes" class="ipt" value="${esc(state.draft.recordTypes)}" placeholder="ExchangeItem, CopilotInteraction"></div>
              <div><label class="lbl">Duration</label><input id="audit-policy-duration" class="ipt" value="${esc(state.draft.duration)}" placeholder="90 days"></div>
            </div>
            <div class="two-col" style="margin-top:8px;">
              <div><label class="lbl">Priority</label><input id="audit-policy-priority" class="ipt" value="${esc(state.draft.priority)}" placeholder="3"></div>
              <div class="callout info" style="margin-top:0;">Priority decides which policy wins when a user matches more than one rule.</div>
            </div>
            <div class="sidepanel-footer" style="padding-top:12px;">
              <button id="audit-policy-save" class="btn btn-primary">Save policy</button>
            </div>
          </section>
        </div>
        <div class="card" style="margin-top:16px;">
          <div class="card-toolbar">
            <strong>Retention policy table</strong>
            <span class="muted">${state.policies.length} policies</span>
          </div>
          <table class="grid">
            <thead><tr><th>Name</th><th>Users</th><th>Record types</th><th>Duration</th><th>Priority</th></tr></thead>
            <tbody>
              ${state.policies.map(p => `
                <tr>
                  <td><strong>${esc(p.name)}</strong></td>
                  <td>${esc(p.users.length ? p.users.join(', ') : 'All users')}</td>
                  <td>${esc(p.recordTypes.join(', '))}</td>
                  <td>${esc(p.duration)}</td>
                  <td>${esc(p.priority)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    function renderExportTab(rows) {
      const selectedCount = state.selected.size;
      const exportRows = selectedCount ? rows.filter(r => state.selected.has(r.time + '|' + r.user + '|' + r.op)) : rows;
      const preview = estimateExport(exportRows);
      return `
        <div class="two-col" style="margin-top:14px;">
          <section class="card card-body">
            <div class="alert-section-title">Export workflow</div>
            <ol style="margin:0; padding-left:18px; line-height:1.7;">
              <li>Run a search and pick the rows you want to investigate.</li>
              <li>Prepare a mock export for the selected rows, or export the filtered set if nothing is selected.</li>
              <li>Keep the package local; this lab never calls a real Purview service.</li>
            </ol>
            <div class="callout info" style="margin-top:12px;">
              Export preview respects the current search filters and selected checkboxes. The mock package estimates size from row count only.
            </div>
          </section>
          <section class="card card-body">
            <div class="alert-section-title">Export limits</div>
            <div class="callout warn">
              <strong>${esc(preview.count)} rows selected for export</strong>
              <div>${esc(preview.size)} package estimate</div>
              <div style="margin-top:4px;">Fictional lab limit: preview bundles stay under 50 rows.</div>
            </div>
            ${state.exportSummary ? `
              <div class="callout success" style="margin-top:12px;">
                Latest export request: ${esc(state.exportSummary.count)} rows from ${esc(state.exportSummary.source)}.
              </div>
            ` : ''}
          </section>
        </div>`;
    }

    function render() {
      const rows = filteredRows();
      root.innerHTML = `
        <div class="page-header">
          <div>
            <div class="breadcrumb">Purview › <strong>Audit</strong></div>
            <h1>Audit search</h1>
            <div class="page-subtitle">Search standard and premium audit events, create retention policies, and prepare local export previews.</div>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary" data-audit-tab="search">Search</button>
            <button class="btn btn-secondary" data-audit-tab="policies">Retention policies</button>
            <button class="btn btn-secondary" data-audit-tab="export">Export</button>
          </div>
        </div>
        <div class="card card-body">
          <div class="two-col">
            <div class="callout info">
              <strong>Standard vs Premium</strong>
              <div>Standard audit is enough for recent triage. Premium adds longer retention, policy-based control, and CopilotInteraction visibility for this lab.</div>
            </div>
            <div class="callout success">
              <strong>Searchable record types</strong>
              <div>Use the search form to query file activity, role changes, app consent, risky sign-ins, and Copilot interactions across the lab fixtures.</div>
            </div>
          </div>
          <div class="tabs" style="margin-top:12px;">
            <span class="tab ${state.tab === 'search' ? 'active' : ''}" data-audit-tab="search">Search</span>
            <span class="tab ${state.tab === 'policies' ? 'active' : ''}" data-audit-tab="policies">Retention policies</span>
            <span class="tab ${state.tab === 'export' ? 'active' : ''}" data-audit-tab="export">Export</span>
          </div>
        </div>
        <div id="audit-section">
          ${state.tab === 'search' ? renderSearchTab(rows) : state.tab === 'policies' ? renderPoliciesTab() : renderExportTab(rows)}
        </div>`;

      const bind = () => {
        root.querySelectorAll('[data-audit-tab]').forEach(el => {
          el.addEventListener('click', () => {
            state.tab = el.getAttribute('data-audit-tab');
            state.exportSummary = null;
            render();
          });
        });

        if (state.tab === 'search') {
          ['audit-op', 'audit-user', 'audit-workload', 'audit-ip'].forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', () => {
              state.filters[id.replace('audit-', '')] = input.value;
              state.selected.clear();
              state.exportSummary = null;
              render();
            });
          });
          const searchBtn = document.getElementById('audit-search');
          if (searchBtn) searchBtn.addEventListener('click', () => render());
          const exportBtn = document.getElementById('audit-export');
          if (exportBtn) exportBtn.addEventListener('click', () => {
            const exportRows = selectedRows(rows);
            const effective = exportRows.length ? exportRows : rows;
            state.exportSummary = {
              source: selectedRows(rows).length ? 'selected rows' : 'filtered rows',
              count: effective.length,
              size: `${Math.max(1, effective.length * 9)} KB`,
            };
            state.tab = 'export';
            render();
          });
          root.querySelectorAll('.audit-select').forEach(cb => {
            cb.addEventListener('change', () => {
              const id = cb.getAttribute('data-audit-id');
              if (cb.checked) state.selected.add(id);
              else state.selected.delete(id);
            });
          });
        }

        if (state.tab === 'policies') {
          ['audit-policy-name', 'audit-policy-users', 'audit-policy-recordtypes', 'audit-policy-duration', 'audit-policy-priority'].forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', () => {
              state.draft[id.replace('audit-policy-', '')] = input.value;
            });
          });
          const save = document.getElementById('audit-policy-save');
          if (save) save.addEventListener('click', () => {
            const name = document.getElementById('audit-policy-name').value.trim();
            const users = document.getElementById('audit-policy-users').value.split(',').map(s => s.trim()).filter(Boolean);
            const recordTypes = document.getElementById('audit-policy-recordtypes').value.split(',').map(s => s.trim()).filter(Boolean);
            const duration = document.getElementById('audit-policy-duration').value.trim() || '90 days';
            const priority = Number(document.getElementById('audit-policy-priority').value.trim() || '3');
            if (!name) {
              toast('Add a policy name first.');
              return;
            }
            state.policies.unshift({ name, users, recordTypes, duration, priority });
            state.draft = { name:'', users:'', recordTypes:'ExchangeItem, SharePointFileOperation', duration:'90 days', priority:'3' };
            state.exportSummary = null;
            render();
            toast('Retention policy saved in the lab.');
          });
        }
      };
      bind();
    }

    render();
  }
});

// ====================================================================
// Helper renderers used by side panels (called from app.js)
// ====================================================================
// Derive the entities of a single alert (source device/IP -> account -> target/DC)
// so the alert page can draw its own "Alert graph" — the Defender for Identity
// alert-page diagram, as opposed to the incident-scoped Attack story.
function alertGraphEntities(a) {
  const e = a.event || {};
  const isIp = v => /^\d{1,3}(\.\d{1,3}){3}$/.test(v);
  const isDc = v => /^DC\d/i.test(v) || /^DC\d.*\.[a-z]/i.test(v);
  const nodes = [];
  const source = e.source_ip || e.source || e.device;
  if (source) nodes.push({ type: isIp(source) ? 'IP address' : 'Device', label: source });
  if (e.user) nodes.push({ type: 'User', label: e.user });
  const target = e.target || a.asset;
  if (target) {
    const type = isDc(target) ? 'Domain controller'
      : /^CN=|DC=/.test(target) ? 'Directory object'
      : /@/.test(target) ? 'Mailbox'
      : 'Asset';
    if (!nodes.some(n => n.label === target)) nodes.push({ type, label: target });
  }
  if (nodes.length < 2 && a.asset && !nodes.some(n => n.label === a.asset)) {
    nodes.push({ type: 'Asset', label: a.asset });
  }
  return nodes;
}

function renderAlertGraph(a) {
  const nodes = alertGraphEntities(a);
  if (nodes.length < 2) return '';
  const pos = nodes.map((n, i) => ({ ...n, x: ((i + 1) / (nodes.length + 1)) * 100, y: 50 }));
  return `
    <div class="alert-section-title">Alert graph</div>
    <div class="blast-web-canvas alert-graph-canvas">
      <svg class="attack-web-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${pos.slice(1).map((to, i) => {
          const from = pos[i];
          return `<line class="attack-web-line related active" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
        }).join('')}
      </svg>
      ${pos.map((n, i) => `
        <div class="blast-web-node ${i === 0 ? 'source' : ''}" style="left:${n.x}%; top:${n.y}%;">
          <span>${esc(n.type)}</span>
          <strong>${esc(n.label)}</strong>
        </div>`).join('')}
    </div>`;
}

function renderAlertDetail(a) {
  const rule = matchedRule(a);
  return `
    <dl class="alert-meta">
      <dt>Alert ID</dt><dd>${esc(a.id)}</dd>
      <dt>Severity</dt><dd><span class="sev ${a.severity}">${cap(a.severity)}</span></dd>
      <dt>Status</dt><dd>${rule ? `<span class="tag green">Suppressed by "${esc(rule.name)}"</span>` : esc(a.status)}</dd>
      <dt>Category</dt><dd>${esc(a.category)}</dd>
      <dt>Detection source</dt><dd>${esc(a.detectionSource)}</dd>
      <dt>Asset</dt><dd>${esc(a.asset)}</dd>
      <dt>First activity</dt><dd>${fmtTime(a.firstActivity)}</dd>
      ${a.incidentId ? `<dt>Incident</dt><dd><a href="#" onclick="openIncident('${a.incidentId}'); return false;">${esc(a.incidentId)}</a></dd>` : ''}
    </dl>
    ${renderAlertGraph(a)}
    <div class="alert-section-title">Evidence</div>
    <div class="kv">${Object.entries(a.event).map(([k,v]) => `<div><span class="k">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
    ${a.event && a.event.user ? `
      <div class="alert-pivot">
        <button class="btn btn-secondary" type="button" data-pivot="signin-logs"
                onclick="navigate('#/entra/sign-in-logs')">Investigate sign-ins for this account</button>
        <span class="muted">The alert summarizes; the sign-in log holds the records behind it.</span>
      </div>` : ''}
    ${a.scriptAnalysis ? `
      <div class="alert-section-title">Analyzed script</div>
      <div class="detail-row"><div><span class="k">File:</span> ${esc(a.scriptAnalysis.fileName)}</div><div><span class="k">Spawned by:</span> ${esc(a.scriptAnalysis.spawnedBy)}</div></div>
      <div class="sidepanel-footer">
        <button class="btn btn-primary" onclick="openScriptAnalysis('${esc(a.id)}')">Analyze script</button>
      </div>` : ''}
    ${a.note ? `<div class="alert-section-title">Lab note</div><div class="callout warn">${esc(a.note)}</div>` : ''}
    <div class="alert-section-title">Suppression rule evaluation</div>
    <div class="kv">${ruleEvalSummary(a)}</div>
    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="openRulePanel('${a.id}')">Create suppression rule from alert</button>
    </div>`;
}

function ruleEvalSummary(a) {
  if (rules.length === 0) return '<div class="muted">No suppression rules defined.</div>';
  return rules.map(r => {
    const parts = r.conditions.map(c => {
      const ok = a.event[c.field] === c.value;
      const want = c.field === 'sha256' ? c.value.slice(0,12) + '…' : c.value;
      const actual = a.event[c.field];
      const got = c.field === 'sha256' && actual ? actual.slice(0,12) + '…' : actual;
      return `  ${ok?'✓':'✗'} ${fieldLabel(c.field)} == ${esc(want)}  (event: ${esc(got ?? 'n/a')})`;
    }).join('<br>');
    const overall = r.conditions.every(c => a.event[c.field] === c.value);
    return `<div><strong>${esc(r.name)}</strong> — ${overall?'MATCH (suppressed)':'no match'}<br>${parts}</div>`;
  }).join('<br>');
}

function attackStoryFor(inc, incAlerts) {
  const story = ATTACK_STORIES[inc.id];
  if (story) return story;
  const nodes = inc.entities.map((e, index) => ({
    id:`${inc.id}-entity-${index}`,
    type:e.type,
    label:e.name,
    ring:index === 0 ? 0 : (index % 2 === 1 ? 1 : 2),
    verdict:index === 0 ? 'Suspicious' : 'Related',
    evidence:incAlerts.map(a => `${a.title} on ${a.asset}`).slice(0, 3),
    remediation:e.type === 'User' ? 'Review sign-ins, revoke sessions, and reset credentials if activity is suspicious.'
      : e.type === 'Device' ? 'Inspect device timeline, collect package, and isolate if malicious activity is confirmed.'
      : 'Inspect related alerts and pivot to hunting for broader scope.',
  }));
  const edges = nodes.slice(0, -1).map((n, index) => ({
    from:n.id,
    to:nodes[index + 1].id,
    label:index === 0 ? 'related to' : 'pivoted to',
  }));
  const steps = incAlerts.map((a, index) => ({
    time:a.firstActivity,
    node:nodes[Math.min(index, Math.max(nodes.length - 1, 0))]?.id,
    alertId:a.id,
    title:a.title,
    detail:`${a.detectionSource} alert on ${a.asset}.`,
  }));
  return { nodes, edges, steps };
}

function deviceExists(name) {
  return DEVICES.some(d => d.id === name || d.name === name);
}

function entityTypeForName(inc, name) {
  const entity = inc.entities.find(e => e.name === name);
  if (entity) return entity.type;
  return deviceExists(name) ? 'Device' : 'Entity';
}

function clickableEntity(type, name) {
  const isDevice = type === 'Device' && deviceExists(name);
  const label = `${type}: ${name}`;
  return `<button class="entity-chip clickable" onclick="event.stopPropagation(); openEntityPivot('${esc(type)}', '${esc(name)}')">
    ${isDevice ? 'Open device: ' : ''}<strong>${esc(isDevice ? name : label)}</strong>
  </button>`;
}

function renderAttackStory(inc, incAlerts) {
  const story = attackStoryFor(inc, incAlerts);
  const activeStep = story.steps[0] || {};
  const activeNode = story.nodes.find(node => node.id === activeStep.node) || story.nodes[0] || {};
  return `
    <div class="attack-story" data-incident-id="${esc(inc.id)}">
      <div class="attack-story-toolbar">
        <div>
          <strong>Attack story</strong>
          <span>Replay the incident graph, inspect entity evidence, and keep response actions in the same context.</span>
        </div>
        <div class="attack-story-actions">
          <button class="btn btn-secondary btn-sm" onclick="setAttackStoryStep('${esc(inc.id)}', 0)">Reset</button>
          <button class="btn btn-primary btn-sm" onclick="playAttackStory('${esc(inc.id)}')">Play attack story</button>
        </div>
      </div>
      ${renderIncidentGraph(inc.id, story, activeStep.node)}
      <div class="attack-story-stage">
        <div class="attack-story-now" data-story-now>
          ${story.steps.length ? `
            <div class="t-time">${fmtTime(story.steps[0].time)}</div>
            <div class="t-title">${esc(story.steps[0].title)}</div>
            <p>${esc(story.steps[0].detail)}</p>
            <div class="attack-story-actions-inline">
              <button class="btn btn-secondary btn-sm" onclick="openAlert('${esc(story.steps[0].alertId)}')">Open alert</button>
              <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender/hunting')">Go hunt</button>
            </div>
            <div class="attack-story-remediation"><strong>Response action:</strong> ${esc(story.steps[0].remediation || activeNode.remediation || 'Review the entity details and choose the least disruptive containment action.')}</div>
          ` : '<div class="muted">No ordered alerts available for this incident.</div>'}
        </div>
          <div class="attack-story-entity" data-story-entity>
          <div class="attack-entity-kicker">${esc(activeNode.type || 'Entity')}</div>
          <div class="attack-entity-title">${esc(activeNode.label || 'No entity selected')}</div>
          <dl class="attack-entity-meta">
            <dt>Related alerts</dt><dd>${story.steps.filter(step => step.node === activeNode.id).length || 'None highlighted'}</dd>
            <dt>Verdict</dt><dd>${esc(activeNode.verdict || 'Suspicious')}</dd>
            <dt>Remediation</dt><dd>${esc(activeNode.remediation || 'Review evidence, validate verdict, then contain or dismiss.')}</dd>
          </dl>
          <div class="attack-entity-subtitle">Evidence and response</div>
          <div class="attack-entity-actions">
            ${activeNode.type === 'Device' && deviceExists(activeNode.label)
              ? `<button class="btn btn-primary btn-sm" onclick="openDevice('${esc(activeNode.label)}')">Open device page</button>`
              : `<button class="btn btn-secondary btn-sm" onclick="toast('Entity pivot opened for ${esc(activeNode.type || 'entity')} (lab stub).')">Open entity page</button>`}
            <button class="btn btn-primary btn-sm" onclick="viewBlastRadius('${esc(inc.id)}', '${esc(activeNode.id || '')}')">View blast radius</button>
            <button class="btn btn-secondary btn-sm" onclick="runSentinelEntityPlaybook('${esc(activeNode.label || inc.id)}', 'Defender incident side panel')">Run playbook (entity)</button>
            <button class="btn btn-secondary btn-sm" onclick="navigate('#/defender/hunting')">Go hunt</button>
          </div>
          <ul class="attack-evidence-list">
            ${(activeNode.evidence || story.steps.filter(step => step.node === activeNode.id).map(step => step.title)).map(item => `<li>${esc(item)}</li>`).join('') || '<li>No evidence attached to this entity.</li>'}
          </ul>
          <div class="attack-related-alerts">
            ${story.steps.map((step, index) => `
              <button class="${index === 0 ? 'active' : ''}" data-story-alert="${esc(step.alertId)}"
                onclick="setAttackStoryStep('${esc(inc.id)}', ${index})">
                ${esc(step.alertId)} · ${esc(step.title)}
              </button>
            `).join('')}
          </div>
        </div>
        <ol class="attack-story-events">
          ${story.steps.map((step, index) => `
            <li class="${index === 0 ? 'active' : ''}" data-story-step="${index}" onclick="setAttackStoryStep('${esc(inc.id)}', ${index})">
              <span>${fmtTime(step.time)}</span>
              <strong>${esc(step.title)}</strong>
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); openAlert('${esc(step.alertId)}')">${esc(step.alertId)}</button>
            </li>
          `).join('')}
        </ol>
      </div>
      <div class="hidden" data-story-json="${esc(JSON.stringify(story))}"></div>
    </div>
  `;
}

// Graph geometry, tuned so node boxes (104x82px in the 1040x560 stage) never
// overlap across all incident stories. Nodes are spread evenly around each ring
// by count (not fixed slots), so sparse rings don't cluster on one side.
// Node-clearance percentages below (NODE_CLEAR_X/Y) mirror the box half-size in
// the stage and are used to keep edge labels off node bodies.
const GRAPH_GEOM = {
  cx: 50, cy: 50,
  ring1: { rX: 25, rY: 22, arc: 300, start: -150 },
  ring2: { rX: 44, rY: 40, arc: 312, start: -156 },
};
const NODE_CLEAR_X = 6.2; // ~half node width (%) + margin
const NODE_CLEAR_Y = 8.5; // ~half node height (%) + margin

function graphPoint(node, index, counts) {
  const ring = Number(node.ring || 0);
  if (ring === 0) return { x: GRAPH_GEOM.cx, y: GRAPH_GEOM.cy };
  const total = counts[ring] || 1;
  const pos = counts['_seen_' + ring] = (counts['_seen_' + ring] || 0) + 1;
  const g = ring === 1 ? GRAPH_GEOM.ring1 : GRAPH_GEOM.ring2;
  const t = total === 1 ? 0.5 : (pos - 1) / (total - 1);
  const angle = (g.start + t * g.arc) * Math.PI / 180;
  return {
    x: GRAPH_GEOM.cx + Math.cos(angle) * g.rX,
    y: GRAPH_GEOM.cy + Math.sin(angle) * g.rY,
  };
}

function graphLayout(story) {
  const counts = {};
  story.nodes.forEach(node => { counts[node.ring || 0] = (counts[node.ring || 0] || 0) + 1; });
  return story.nodes.reduce((map, node, index) => {
    map[node.id] = graphPoint(node, index, counts);
    return map;
  }, {});
}

function graphBoundaryPoint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.max(Math.hypot(dx, dy), 1);
  const rx = 5.2;
  const ry = 7.4;
  return {
    x: from.x + (dx / len) * rx,
    y: from.y + (dy / len) * ry,
  };
}

function graphEdgeRoute(from, to, edge) {
  const start = graphBoundaryPoint(from, to);
  const end = graphBoundaryPoint(to, from);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const awayX = midX - GRAPH_GEOM.cx;
  const awayY = midY - GRAPH_GEOM.cy;
  const awayLen = Math.max(Math.hypot(awayX, awayY), 1);
  const push = edge.kind === 'blast' ? 9 : 6;
  const ctrlX = midX + (awayX / awayLen) * push;
  const ctrlY = midY + (awayY / awayLen) * push;
  return `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`;
}

// Place an edge label at the edge midpoint, then nudge it (outward from centre,
// then perpendicular to the edge) until it clears every node box. Guarantees
// labels don't sit on top of node bubbles regardless of story density.
function graphLabelPoint(from, to, nodes, layout) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  let ax = mx - GRAPH_GEOM.cx, ay = my - GRAPH_GEOM.cy;
  const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
  const dx = to.x - from.x, dy = to.y - from.y;
  const dl = Math.hypot(dx, dy) || 1;
  const px = -dy / dl, py = dx / dl;
  const clears = (x, y) => nodes.every(n => {
    const p = layout[n.id];
    if (!p) return true;
    return Math.abs(x - p.x) >= NODE_CLEAR_X || Math.abs(y - p.y) >= NODE_CLEAR_Y;
  });
  const cands = [];
  for (let d = 3; d <= 16; d += 1.5) cands.push({ x: mx + ax * d, y: my + ay * d });
  for (let d = 6; d <= 16; d += 2) {
    cands.push({ x: mx + px * d, y: my + py * d });
    cands.push({ x: mx - px * d, y: my - py * d });
  }
  return cands.find(c => clears(c.x, c.y)) || { x: mx + ax * 4, y: my + ay * 4 };
}

function renderIncidentGraph(incidentId, story, activeNodeId) {
  const layout = graphLayout(story);
  const routes = story.edges.map(edge => {
    const from = layout[edge.from];
    const to = layout[edge.to];
    if (!from || !to) return null;
    return {
      edge,
      path: graphEdgeRoute(from, to, edge),
      label: graphLabelPoint(from, to, story.nodes, layout),
    };
  }).filter(Boolean);
  return `
    <div class="attack-web-viewport">
      <div class="attack-web" data-graph-web>
        <svg class="attack-web-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${routes.map(({ edge, path }) => `<path class="attack-web-line ${esc(edge.kind || 'related')}" data-edge-from="${esc(edge.from)}" data-edge-to="${esc(edge.to)}" d="${path}" />`).join('')}
        </svg>
        ${routes.map(({ edge, label }) => `<span class="attack-web-edge-label ${esc(edge.kind || 'related')}" style="left:${label.x}%; top:${label.y}%;">${esc(edge.label)}</span>`).join('')}
        ${story.nodes.map(node => {
          const point = layout[node.id];
          const initials = node.type === 'IP' ? 'IP' : (node.type || 'E').split(/\s+/).map(w => w[0]).join('').slice(0, 3);
          return `
            <button class="attack-web-node ${activeNodeId === node.id ? 'active' : ''} ring-${esc(node.ring || 0)}" type="button"
              data-node-id="${esc(node.id)}" style="left:${point.x}%; top:${point.y}%;"
              title="${esc(node.type)}: ${esc(node.label)}" onclick="selectAttackStoryNode('${esc(incidentId)}', '${esc(node.id)}')">
              <span class="attack-web-node-icon">${esc(initials)}</span>
              <span class="attack-web-node-label">${esc(node.label)}</span>
              <span class="attack-web-node-type">${esc(node.type)}</span>
            </button>`;
        }).join('')}
      </div>
    </div>
  `;
}

function shortestGraphPath(story, sourceId, targetId) {
  const next = {};
  story.edges.forEach(edge => {
    (next[edge.from] ||= []).push(edge.to);
    if (edge.kind !== 'attack') (next[edge.to] ||= []).push(edge.from);
  });
  const queue = [[sourceId]];
  const seen = new Set([sourceId]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === targetId) return path;
    (next[last] || []).forEach(id => {
      if (!seen.has(id)) {
        seen.add(id);
        queue.push([...path, id]);
      }
    });
  }
  return [sourceId, targetId];
}

function topBlastPaths(story, sourceId) {
  const source = story.nodes.find(n => n.id === sourceId) || story.nodes[0];
  const targets = story.nodes
    .filter(node => node.id !== source.id && (node.ring >= 2 || /risk|critical|admin|cfo|finance|backup|pki|payroll|legal/i.test(`${node.verdict} ${node.label}`)))
    .map(node => {
      const path = shortestGraphPath(story, source.id, node.id);
      const score = (node.ring || 0) * 20 + (/critical|at risk|malicious/i.test(node.verdict || '') ? 20 : 0) - path.length;
      return { target: node, path, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return { source, paths: targets };
}

function renderBlastRadiusGraph(story, sourceId) {
  const blast = topBlastPaths(story, sourceId);
  const nodes = [blast.source, ...blast.paths.map(p => p.target)];
  const layout = nodes.reduce((map, node, index) => {
    if (index === 0) map[node.id] = { x: 50, y: 50 };
    else {
      const angle = (-150 + (index - 1) * (300 / Math.max(blast.paths.length - 1, 1))) * Math.PI / 180;
      map[node.id] = { x: 50 + Math.cos(angle) * 41, y: 50 + Math.sin(angle) * 38 };
    }
    return map;
  }, {});
  return `
    <div class="blast-web" data-blast-web>
      <div class="blast-web-head">
        <div>
          <div class="attack-entity-kicker">Blast radius</div>
          <div class="attack-entity-title">${esc(blast.source.label)}</div>
          <p>Initial view: graph showing the 8 top-rated attack paths from the selected node.</p>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="restoreAttackStoryEntity()">Back to node</button>
      </div>
      <div class="blast-web-canvas">
        <svg class="attack-web-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${blast.paths.map(path => {
            const from = layout[blast.source.id];
            const to = layout[path.target.id];
            return `<line class="attack-web-line blast active" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
          }).join('')}
        </svg>
        ${nodes.map((node, index) => `
          <div class="blast-web-node ${index === 0 ? 'source' : ''}" style="left:${layout[node.id].x}%; top:${layout[node.id].y}%;">
            <span>${esc(index === 0 ? 'Source' : node.type)}</span>
            <strong>${esc(node.label)}</strong>
          </div>
        `).join('')}
      </div>
      <div class="blast-full-list">
        <button class="btn btn-secondary btn-sm" onclick="toast('Full blast radius list opened on the right-side panel (lab stub).')">View full blast radius list</button>
        ${blast.paths.map((path, index) => `
          <div class="blast-list-row">
            <strong>${index + 1}. ${esc(path.target.label)}</strong>
            <span>${esc(path.path.map(id => story.nodes.find(n => n.id === id)?.label || id).join(' -> '))}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function verdictDot(v) {
  const key = (v || '').toLowerCase();
  return `<span class="verdict-dot ${key}"></span>${esc(v)}`;
}

function remediationPill(r) {
  const key = (r || '').toLowerCase().replace(/\s+/g, '-');
  return `<span class="remediation-pill ${key}">${esc(r)}</span>`;
}

function renderIncidentSummary(inc, incAlerts) {
  const tacticCounts = {};
  inc.tactics.forEach(t => { tacticCounts[t] = (tacticCounts[t] || 0) + 1; });
  const entityCounts = {};
  inc.entities.forEach(e => { entityCounts[e.type] = (entityCounts[e.type] || 0) + 1; });
  const evidence = INCIDENT_EVIDENCE[inc.id] || [];
  return `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-title">Alerts and categories</div>
        <div class="summary-kill-chain">
          ${inc.tactics.map(t => `<span class="kill-chain-step">${esc(t)}</span>`).join('<span class="kill-chain-arrow">›</span>')}
        </div>
        <div class="summary-card-foot">${incAlerts.length} alert${incAlerts.length===1?'':'s'} across ${inc.tactics.length} tactic${inc.tactics.length===1?'':'s'}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Scope</div>
        <ul class="summary-scope">
          ${Object.entries(entityCounts).map(([k,v]) => `<li><strong>${v}</strong> ${esc(k)}${v>1?'s':''}</li>`).join('')}
        </ul>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Evidence</div>
        <div class="summary-evidence-row">
          <span><strong>${evidence.length}</strong> entities</span>
          <span class="verdict-malicious">${evidence.filter(e=>e.verdict==='Malicious').length} malicious</span>
          <span class="verdict-suspicious">${evidence.filter(e=>e.verdict==='Suspicious').length} suspicious</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Incident information</div>
        <dl class="summary-info">
          <dt>Status</dt><dd>${esc(inc.status)}</dd>
          <dt>Severity</dt><dd><span class="sev ${inc.severity}">${cap(inc.severity)}</span></dd>
          <dt>Assigned</dt><dd>${esc(inc.assignedTo)}</dd>
        </dl>
      </div>
    </div>`;
}

function renderIncidentActivities(inc) {
  const items = (INCIDENT_ACTIVITIES[inc.id] || []).concat((inc.disruptionActions || []).map(a => ({
    time:a.time,
    origin:'System',
    category:'Attack disruption',
    performedBy:'Automatic attack disruption',
    detail:`${a.action}: ${a.target}. ${a.result}`,
  })));
  if (!items.length) {
    return `<div class="muted">No analyst or automation activity recorded for this incident yet. The Activities tab shows manual and automated actions in a unified timeline.</div>`;
  }
  return `
    <table class="grid activities-grid">
      <thead><tr><th>Time</th><th>Origin</th><th>Category</th><th>Performed by</th><th>Detail</th></tr></thead>
      <tbody>
        ${items.map(a => `
          <tr>
            <td>${fmtTime(a.time)}</td>
            <td><span class="origin-pill ${a.origin.toLowerCase()}">${esc(a.origin)}</span></td>
            <td>${esc(a.category)}</td>
            <td>${esc(a.performedBy)}</td>
            <td>${esc(a.detail)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderIncidentEvidence(inc) {
  const items = INCIDENT_EVIDENCE[inc.id];
  if (!items) {
    return `<div class="muted">Defender XDR auto-analyzes events and entities and tags them Malicious, Suspicious, or Clean with a remediation status. None recorded for this incident yet.</div>`;
  }
  const pending = items.filter(e => e.remediation === 'Pending approval');
  return `
    ${pending.length ? `<div class="callout warn"><strong>${pending.length}</strong> remediation action${pending.length===1?'':'s'} pending approval. Approve or reject from the row.</div>` : ''}
    <table class="grid evidence-grid">
      <thead><tr><th>Type</th><th>Entity</th><th>Verdict</th><th>Remediation</th><th>Action</th><th></th></tr></thead>
      <tbody>
        ${items.map(e => `
          <tr>
            <td>${esc(e.type)}</td>
            <td>${clickableEntity(e.type, e.name)}</td>
            <td>${verdictDot(e.verdict)}</td>
            <td>${remediationPill(e.remediation)}</td>
            <td>${esc(e.action)}</td>
            <td>${e.remediation === 'Pending approval'
              ? `<button class="btn btn-primary btn-sm">Approve</button> <button class="btn btn-ghost btn-sm">Reject</button>`
              : `<button class="btn btn-ghost btn-sm" onclick="navigate('#/defender/hunting')">Go hunt</button>`}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderBlastRadius(inc) {
  const data = BLAST_RADIUS_PATHS[inc.id];
  if (!data) {
    return `<div class="muted">No blast radius paths calculated. Requires Sentinel data lake onboarding and critical-asset definitions.</div>`;
  }
  return `
    <div class="blast-mini">
      <div class="blast-source">${esc(data.source)}</div>
      <div class="blast-paths">
        ${data.paths.map(p => `
          <div class="blast-path ${p.critical ? 'critical' : ''}">
            <div class="blast-hops">${'─'.repeat(p.hops)}▶</div>
            <div class="blast-target">
              <strong>${esc(p.target)}</strong>
              ${p.critical ? '<span class="blast-crit">CRITICAL</span>' : ''}
              <div class="muted">${esc(p.reach)} · ${p.hops} hop${p.hops===1?'':'s'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderSimilarIncidents(inc) {
  const items = SIMILAR_INCIDENTS[inc.id];
  if (!items) {
    return `<div class="muted">No similar incidents found in the last 30 days.</div>`;
  }
  return `
    <table class="grid">
      <thead><tr><th>Sev</th><th>Incident</th><th>Why it's similar</th></tr></thead>
      <tbody>
        ${items.map(s => `
          <tr>
            <td><span class="sev ${s.severity}">${cap(s.severity)}</span></td>
            <td><strong>${esc(s.id)}</strong> — ${esc(s.title)}</td>
            <td>${esc(s.similarity)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderIncidentDetail(inc) {
  const incAlerts = alerts.filter(a => inc.alertIds.includes(a.id));
  return `
    <div class="incident-preview-open">
      <div>
        <strong>Incident preview</strong>
        <span>Open the full incident page to work in the Defender attack story and graph area.</span>
      </div>
      <button class="btn btn-primary" onclick="openIncidentPage('${esc(inc.id)}')">Open incident page</button>
    </div>
    <dl class="alert-meta">
      <dt>Incident ID</dt><dd>${esc(inc.id)}</dd>
      <dt>Severity</dt><dd><span class="sev ${inc.severity}">${cap(inc.severity)}</span></dd>
      <dt>Status</dt><dd>${esc(inc.status)}</dd>
      ${inc.responseTag ? `<dt>Response tag</dt><dd><span class="tag orange">${esc(inc.responseTag)}</span></dd>` : ''}
      <dt>Assigned to</dt><dd>${esc(inc.assignedTo)}</dd>
      <dt>Tactics</dt><dd>${inc.tactics.map(t=>`<span class="mitre">${esc(t)}</span>`).join('')}</dd>
      <dt>Created</dt><dd>${fmtTime(inc.createdAt)}</dd>
    </dl>
    <div class="callout">${esc(inc.summary)}</div>

    ${renderAttackStory(inc, incAlerts)}

    <div class="alert-section-title">Entities (${inc.entities.length})</div>
    <div class="entity-chip-list">${inc.entities.map(e => clickableEntity(e.type, e.name)).join('')}</div>

    <div class="alert-section-title">Alerts in this incident (${incAlerts.length})</div>
    <table class="grid">
      <thead><tr><th>Sev</th><th>Title</th><th>Asset</th><th>Time</th></tr></thead>
      <tbody>${incAlerts.map(a => `
        <tr onclick="openAlert('${a.id}')">
          <td><span class="sev ${a.severity}">${cap(a.severity)}</span></td>
          <td>${esc(a.title)}</td>
          <td>${clickableEntity(entityTypeForName(inc, a.asset), a.asset)}</td>
          <td>${fmtTime(a.firstActivity)}</td>
        </tr>`).join('')}</tbody>
    </table>

    <div class="alert-section-title">Timeline</div>
    <ul class="timeline">
      <li><div class="t-time">${fmtTime(inc.createdAt)}</div><div class="t-title">Incident created</div></li>
      ${incAlerts.map(a => `<li><div class="t-time">${fmtTime(a.firstActivity)}</div><div class="t-title">${esc(a.title)} (${esc(a.asset)})</div></li>`).join('')}
      ${(inc.disruptionActions || []).map(a => `<li><div class="t-time">${fmtTime(a.time)}</div><div class="t-title">${esc(a.action)} - ${esc(a.target)}</div><div class="muted">${esc(a.result)}</div></li>`).join('')}
    </ul>

    <div class="alert-section-title">Summary</div>
    ${renderIncidentSummary(inc, incAlerts)}

    <div class="alert-section-title">Activities</div>
    ${renderIncidentActivities(inc)}

    <div class="alert-section-title">Evidence and Response</div>
    ${renderIncidentEvidence(inc)}

    <div class="alert-section-title">Blast radius (possible paths)</div>
    ${renderBlastRadius(inc)}

    <div class="alert-section-title">Similar incidents</div>
    ${renderSimilarIncidents(inc)}

    <div class="alert-section-title">Defender portal investigation workflow</div>
    <div class="incident-guide">
      <div class="incident-guide-head">
        <strong>Incident page tabs and pivots</strong>
        <span>${esc(INCIDENT_INVESTIGATION_GUIDE.source)} · ${esc(INCIDENT_INVESTIGATION_GUIDE.lastUpdated)}</span>
      </div>
      <div class="incident-guide-grid">
        ${INCIDENT_INVESTIGATION_GUIDE.workflow.map(step => `
          <div class="incident-guide-step">
            <div class="incident-guide-title">${esc(step.title)}</div>
            <div>${esc(step.detail)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="alert-section-title">Blast radius analysis</div>
    <div class="blast-radius-box">
      <div>
        <div class="incident-guide-title">Prerequisites</div>
        <ul>
          ${INCIDENT_INVESTIGATION_GUIDE.blastRadius.prerequisites.map(p => `<li>${esc(p)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <div class="incident-guide-title">Use by role</div>
        <dl class="role-use-list">
          ${INCIDENT_INVESTIGATION_GUIDE.blastRadius.roleUses.map(r => `
            <dt>${esc(r.role)}</dt><dd>${esc(r.use)}</dd>
          `).join('')}
        </dl>
      </div>
      <div class="blast-radius-notes">
        ${INCIDENT_INVESTIGATION_GUIDE.blastRadius.notes.map(n => `<span>${esc(n)}</span>`).join('')}
      </div>
    </div>

    <div class="sidepanel-footer">
      <button class="btn btn-primary" onclick="openIncidentPage('${esc(inc.id)}')">Open incident page</button>
      <button class="btn btn-primary">Classify & resolve</button>
      <button class="btn btn-secondary">Assign to me</button>
    </div>`;
}

// ---------- Sentinel › Hunting › ASIM DNS ----------
VIEWS['sentinel/hunting/dns'] = () => renderMockAsimLab({
  crumb:'Sentinel › Hunting',
  title:'ASIM DNS',
  heading:'ASIM DNS hunting',
  subtitle:'Query the unifying _Im_Dns parser across normalized DNS sources, then pivot on clients, domains, response codes, and returned addresses.',
  schemaVersion:'ASIM 0.1.7',
  nextHref:'#/sentinel/hunting/authentication',
  nextLabel:'Authentication',
  runFn:'runAsimDnsQuery',
  loadFn:'loadAsimDnsQuery',
  queryId:'asim-dns-query',
  resultsId:'asim-dns-results',
  statusId:'asim-dns-status',
  listId:'asim-dns-list',
  storageKey:'defender-lab.asim-dns.query',
  queryHint:'Use parser parameters for filter pushdown, then add standard KQL operators to shape the normalized rows.',
  sourceLabel:'ASIM DNS rows',
  sourceColumns:['TimeGenerated','EventProduct','SrcHostname','SrcIpAddr','DnsQuery','DnsQueryTypeName','EventResultDetails'],
  rows:IM_DNS,
  savedQueries:ASIM_DNS_SAVED_QUERIES,
  notes:ASIM_DNS_NOTES,
  mappings:[
    { source:'SrcIpAddr / SrcHostname', asim:'Source endpoint', note:'Keeps the requesting client consistent across Microsoft DNS and Corelight rows.' },
    { source:'DnsQuery', asim:'Queried domain', note:'Provides the primary IOC and tunneling pivot regardless of the original DNS source.' },
    { source:'EventResultDetails', asim:'Response code', note:'Normalizes NXDOMAIN and successful response outcomes for shared detections.' },
    { source:'DnsResponseName', asim:'Returned answer', note:'Supports response-IP and known-bad-prefix filtering across normalized sources.' },
  ],
  studyNote:'Pass time, source, domain, response-code, and response-prefix filters into _Im_Dns when possible so source parsers can reduce data before the rest of the query runs.',
});

// Register deliberate study surfaces for secondary navigation entries that do
// not yet need a full interactive lab. This keeps every visible NAV route
// renderable while preserving richer hand-built views above.
(function registerSecondaryNavViews() {
  const workloadNotes = {
    defender: {
      context:'Defender XDR',
      goal:'Use this surface to orient where the portal feature sits during incident response, tuning, or tenant configuration.',
      pivots:['#/defender/incidents', '#/defender/hunting', '#/defender/settings'],
    },
    sentinel: {
      context:'Sentinel',
      goal:'Use this surface as a map back to Sentinel operations: content, workspace configuration, hunting, and automation.',
      pivots:['#/sentinel/incidents', '#/sentinel/data-connectors', '#/sentinel/analytics'],
    },
    'defender-cloud': {
      context:'Defender for Cloud',
      goal:'Use this supporting surface for workload-protection and posture context while keeping SC-200 focus on alerts and response.',
      pivots:['#/defender-cloud/alerts', '#/defender-cloud/recommendations', '#/defender-cloud/regulatory'],
    },
    purview: {
      context:'Purview',
      goal:'Use this surface for investigation context that supports Audit, eDiscovery, Graph activity logs, and risk cases.',
      pivots:['#/purview/audit', '#/purview/ediscovery', '#/purview/graph-activity'],
    },
  };

  const routeMeta = {};
  Object.entries(NAV).forEach(([workload, items]) => {
    items.filter(item => item.route).forEach(item => {
      routeMeta[item.route.replace(/^#\//, '')] = {
        workload,
        label:item.label,
        icon:item.icon || '•',
      };
    });
  });

  Object.entries(routeMeta).forEach(([route, meta]) => {
    if (VIEWS[route]) return;
    const note = workloadNotes[meta.workload] || workloadNotes.defender;
    VIEWS[route] = () => `
      <div class="page-header">
        <div>
          <div class="breadcrumb">${esc(note.context)} › <strong>${esc(meta.label)}</strong></div>
          <h1>${esc(meta.label)}</h1>
          <div class="page-subtitle">Secondary study surface for SC-200 lab navigation.</div>
        </div>
      </div>
      <div class="card">
        <div class="card-toolbar">
          <strong>${esc(meta.icon)} ${esc(meta.label)}</strong>
          <span class="muted">Local-only placeholder</span>
        </div>
        <div class="card-body">
          <p class="muted">${esc(note.goal)}</p>
          <div class="callout info">
            This page is intentionally static. It exists so the portal navigation is complete while the hands-on exam workflows remain concentrated in the linked lab views.
          </div>
        </div>
      </div>
      <div class="tile-grid">
        ${note.pivots.map(pivot => {
          const target = routeMeta[pivot.replace(/^#\//, '')];
          return `
            <a class="tile" href="${esc(pivot)}">
              <div class="tile-title">${esc(target?.label || pivot)}</div>
              <div class="tile-sub">Open the related hands-on lab view.</div>
            </a>`;
        }).join('')}
      </div>
    `;
  });
})();

// ---------- Security Copilot standalone workload ----------

function copilotSessionsSorted() {
  return getCopilotSessions().slice().sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

function copilotSelectedSession() {
  const sessions = copilotSessionsSorted();
  const selectedId = sessionStorage.getItem('defender-lab.copilot.session.id') || sessions[0]?.id;
  return getCopilotSession(selectedId) || sessions[0];
}

function copilotSelectedPromptbook() {
  const books = getCopilotPromptbooks();
  const tab = sessionStorage.getItem('defender-lab.copilot.promptbook.tab') || 'Hack Smarter Labs';
  const selectedId = sessionStorage.getItem('defender-lab.copilot.promptbook.id');
  const list = books.filter(book => tab === 'All' || book.source === tab);
  return books.find(book => book.id === selectedId) || list.find(book => book.id === selectedId) || list[0] || books[0];
}

function copilotSelectedPlugin() {
  const plugins = getCopilotPlugins();
  const selectedId = sessionStorage.getItem('defender-lab.copilot.plugin.id');
  return plugins.find(plugin => plugin.id === selectedId) || plugins[0];
}

function copilotSelectedKnowledgeSource() {
  const sources = getCopilotKnowledge();
  const selectedId = sessionStorage.getItem('defender-lab.copilot.knowledge.id');
  return sources.find(source => source.id === selectedId) || sources[0];
}

VIEWS['copilot/home'] = () => {
  const sessions = copilotSessionsSorted();
  const promptbooks = getCopilotPromptbooks();
  const pinned = sessions.filter(s => s.pinned).slice(0, 4);
  const activePrompt = sessionStorage.getItem('defender-lab.copilot.home.prompt') || 'Summarize incident INC-1042';
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Home</strong></div>
        <h1>Security Copilot</h1>
        <div class="page-subtitle">Standalone experience for sessions, promptbooks, plugins, knowledge, and capacity. All content is fictional and local.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openCopilot()">Open embedded panel</button>
        <button class="btn btn-primary" onclick="openCopilotSession('cs-009')">Open agentic session</button>
      </div>
    </div>

    <div class="copilot-home-layout">
      <section class="card card-body copilot-hero">
        <div class="card-toolbar">
          <strong>Prompt bar</strong>
          <span class="muted">Static input with local study shortcuts</span>
        </div>
        <textarea id="copilot-home-prompt" class="copilot-home-prompt" spellcheck="false" placeholder="Ask for an incident summary, KQL draft, entity expansion, or MITRE mapping.">${esc(activePrompt)}</textarea>
        <div class="copilot-chip-row">
          ${COPILOT_PROMPTS.map((prompt, index) => `
            <button class="chip-link" type="button" onclick="openCopilot(${index})">${esc(prompt.title)}</button>
          `).join('')}
        </div>
        <div class="sidepanel-footer">
          <button class="btn btn-primary" onclick="openCopilot(0)">Open in panel</button>
          <button class="btn btn-secondary" onclick="openCopilotSession('cs-009')">Open matching session</button>
          <button class="btn btn-secondary" onclick="navigate('#/copilot/promptbooks')">Browse promptbooks</button>
        </div>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Recent sessions</strong>
          <span class="muted">${sessions.length} local sessions</span>
        </div>
        <div class="copilot-session-list">
          ${pinned.map(session => `
            <article class="copilot-session-tile">
              <div class="tile-title">${esc(session.name)}</div>
              <div class="tile-sub">${esc(session.owner)} · ${esc(session.workspace)} · ${fmtTime(session.lastActivity)}</div>
              <div class="muted">${session.promptCount} prompts · ${session.plugins.map(esc).join(', ')}</div>
              <div class="sidepanel-footer">
                <button class="btn btn-primary btn-sm" onclick="openCopilotSession('${esc(session.id)}')">Open session</button>
                <button class="btn btn-secondary btn-sm" onclick="openCopilotPromptForSession('${esc(session.id)}')">Open panel</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    </div>

    <div class="copilot-home-columns">
      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Promptbook shortcuts</strong>
          <span class="muted">built-in and custom study flows</span>
        </div>
        <div class="copilot-shortcut-grid">
          ${promptbooks.slice(0, 4).map(book => `
            <button class="copilot-shortcut" onclick="selectCopilotPromptbook('${esc(book.id)}'); navigate('#/copilot/promptbooks');">
              <span class="copilot-shortcut-title">${esc(book.name)}</span>
              <span class="copilot-shortcut-meta">${esc(book.source)} · ${book.prompts.length} steps</span>
            </button>
          `).join('')}
        </div>
      </section>
      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Embedded vs standalone</strong>
          <span class="muted">Same tenant, two surfaces</span>
        </div>
        <div class="muted">
          The topbar Copilot button opens the embedded panel for quick prompts inside Defender or Purview.
          This workload manages durable sessions, promptbooks, plugins, grounding sources, and SCU settings.
        </div>
        <div class="callout info" style="margin-top:12px;">
          Use the panel for fast summaries, then jump into the matching standalone session when you need the transcript, pin board, or rerun controls.
        </div>
      </section>
    </div>
  `;
};

VIEWS['copilot/sessions'] = () => {
  const sessions = copilotSessionsSorted();
  const selected = copilotSelectedSession();
  const transcript = getCopilotTranscript(selected?.id);
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Sessions</strong></div>
        <h1>Sessions</h1>
        <div class="page-subtitle">Session list and transcript preview for the local Security Copilot tenant.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openCopilot()">Open embedded panel</button>
        <button class="btn btn-primary" onclick="navigate('#/copilot/promptbooks')">Run promptbook</button>
      </div>
    </div>

    <div class="copilot-session-layout">
      <section class="card">
        <div class="card-toolbar">
          <strong>Session list</strong>
          <span class="muted">${sessions.length} sessions</span>
        </div>
        <table class="grid">
          <thead><tr><th>Session</th><th>Owner</th><th>Workspace</th><th>Last activity</th><th>Plugins</th><th>Action</th></tr></thead>
          <tbody>
            ${sessions.map(session => `
              <tr class="${session.id === selected?.id ? 'selected-row' : ''}">
                <td>
                  <strong>${esc(session.name)}</strong>
                  ${session.generatedFrom ? `<div class="muted">Generated from ${esc(session.generatedFrom)}</div>` : ''}
                </td>
                <td>${esc(session.owner)}</td>
                <td>${esc(session.workspace)}</td>
                <td>${fmtTime(session.lastActivity)}</td>
                <td>${session.plugins.map(plugin => `<span class="tag">${esc(plugin)}</span>`).join(' ')}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="openCopilotSession('${esc(session.id)}')">Open</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Selected session</strong>
          <span class="muted">${esc(selected?.id || '—')}</span>
        </div>
        ${selected ? `
          <div class="summary-info">
            <div><span class="muted">Owner</span><strong>${esc(selected.owner)}</strong></div>
            <div><span class="muted">Workspace</span><strong>${esc(selected.workspace)}</strong></div>
            <div><span class="muted">Prompts</span><strong>${esc(selected.promptCount)}</strong></div>
            <div><span class="muted">Plugins</span><strong>${selected.plugins.map(esc).join(', ')}</strong></div>
          </div>
          <div class="alert-section-title">Preview</div>
          <div class="copilot-preview">
            ${transcript.slice(0, 4).map(step => `
              <div class="copilot-step ${step.role}">
                <div class="copilot-step-meta">${esc(cap(step.role))}${step.plugin && step.plugin !== 'none' ? ` · ${esc(step.plugin)}` : ''}${step.skill ? ` · ${esc(step.skill)}` : ''}</div>
                <div class="copilot-step-text">${esc(step.text)}</div>
              </div>
            `).join('')}
          </div>
          <div class="sidepanel-footer">
            <button class="btn btn-primary" onclick="openCopilotSession('${esc(selected.id)}')">Open transcript</button>
            <button class="btn btn-secondary" onclick="openCopilotPromptForSession('${esc(selected.id)}')">Open embedded panel</button>
          </div>
        ` : `
          <div class="muted">No session selected.</div>
        `}
      </section>
    </div>
  `;
};

VIEWS['copilot/session'] = () => {
  const selected = copilotSelectedSession();
  const transcript = selected ? getCopilotTranscript(selected.id) : [];
  const firstAnalystPrompt = transcript.find(step => step.role === 'analyst')?.text || '';
  const draft = sessionStorage.getItem(`defender-lab.copilot.prompt.${selected?.id || ''}`) || firstAnalystPrompt;
  const rerun = sessionStorage.getItem(`defender-lab.copilot.rerun.${selected?.id || ''}`);
  const pinned = transcript.filter(step => step.pinned);
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Sessions</strong> › ${esc(selected?.name || 'Session')}</div>
        <h1>${esc(selected?.name || 'Session detail')}</h1>
        <div class="page-subtitle">Transcript view with prompts, plugin context, pin board, and local rerun controls.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="openCopilotPromptForSession('${esc(selected?.id || '')}')">Open embedded panel</button>
        <button class="btn btn-secondary" onclick="navigate('#/copilot/sessions')">Back to sessions</button>
      </div>
    </div>

    ${selected ? `
      <div class="copilot-session-detail">
        <section class="card card-body">
          <div class="card-toolbar">
            <strong>Session facts</strong>
            <span class="muted">${fmtTime(selected.lastActivity)}</span>
          </div>
          <div class="summary-info">
            <div><span class="muted">Owner</span><strong>${esc(selected.owner)}</strong></div>
            <div><span class="muted">Workspace</span><strong>${esc(selected.workspace)}</strong></div>
            <div><span class="muted">Prompt count</span><strong>${esc(selected.promptCount)}</strong></div>
            <div><span class="muted">Plugins</span><strong>${selected.plugins.map(esc).join(', ')}</strong></div>
          </div>
          <div class="alert-section-title">Pin board</div>
          <div class="copilot-pinboard">
            ${pinned.map(step => `
              <div class="copilot-pin">
                <span class="tag">${esc(cap(step.role))}</span>
                <strong>${esc(step.text)}</strong>
              </div>
            `).join('')}
          </div>
          <div class="sidepanel-footer">
            <button class="btn btn-primary" onclick="exportCopilotSession('${esc(selected.id)}')">Export transcript</button>
            <button class="btn btn-secondary" onclick="copyCopilotSessionLink('${esc(selected.id)}')">Copy local link</button>
          </div>
        </section>

        <section class="card card-body">
          <div class="card-toolbar">
            <strong>Transcript</strong>
            <span class="muted">${transcript.length} turns</span>
          </div>
          <div class="copilot-transcript">
            ${transcript.map((step, index) => `
              <article class="copilot-turn ${step.role} ${step.pinned ? 'pinned' : ''}">
                <div class="copilot-turn-head">
                  <strong>${esc(cap(step.role))}</strong>
                  <span>${step.plugin && step.plugin !== 'none' ? esc(step.plugin) : 'No plugin'}${step.skill ? ` · ${esc(step.skill)}` : ''}</span>
                </div>
                <div class="copilot-turn-text">${esc(step.text)}</div>
                ${step.pinned ? `<div class="muted">Pinned note</div>` : ''}
              </article>
            `).join('')}
          </div>
        </section>

        <section class="card card-body">
          <div class="card-toolbar">
            <strong>Edit and rerun</strong>
            <span class="muted">Stored in sessionStorage only</span>
          </div>
          <textarea id="copilot-prompt-edit" class="copilot-prompt-edit" spellcheck="false">${esc(draft)}</textarea>
          <div class="sidepanel-footer">
            <button class="btn btn-secondary" onclick="editCopilotPrompt('${esc(selected.id)}')">Save draft</button>
            <button class="btn btn-primary" onclick="rerunCopilotPrompt('${esc(selected.id)}')">Rerun prompt</button>
          </div>
          ${rerun ? `
            <div class="callout info" style="margin-top:12px;">
              Last rerun prompt: ${esc(rerun)}
            </div>
          ` : ''}
        </section>
      </div>
    ` : `<div class="callout warn">No session is selected.</div>`}
  `;
};

VIEWS['copilot/promptbooks'] = () => {
  const tab = sessionStorage.getItem('defender-lab.copilot.promptbook.tab') || 'Hack Smarter Labs';
  const books = getCopilotPromptbooks();
  const filtered = books.filter(book => tab === 'All' || book.source === tab);
  const selected = copilotSelectedPromptbook();
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Promptbooks</strong></div>
        <h1>Promptbooks</h1>
        <div class="page-subtitle">Browse built-in and custom promptbooks, then run one to create a canned session.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="navigate('#/copilot/home')">Home</button>
        <button class="btn btn-primary" onclick="runCopilotPromptbook('${esc(selected?.id || books[0]?.id || '')}')">Run selected promptbook</button>
      </div>
    </div>

    <div class="copilot-tabbar">
      ${['Hack Smarter Labs', 'Custom', 'All'].map(source => `
        <button class="copilot-tab ${tab === source ? 'active' : ''}" onclick="sessionStorage.setItem('defender-lab.copilot.promptbook.tab', '${source}'); render();">${source}</button>
      `).join('')}
    </div>

    <div class="copilot-promptbook-layout">
      <section class="card">
        <div class="card-toolbar">
          <strong>Library</strong>
          <span class="muted">${filtered.length} promptbooks</span>
        </div>
        <div class="copilot-book-list">
          ${filtered.map(book => `
            <button class="copilot-book ${selected?.id === book.id ? 'active' : ''}" onclick="selectCopilotPromptbook('${esc(book.id)}')">
              <span class="copilot-book-title">${esc(book.name)}</span>
              <span class="copilot-book-meta">${esc(book.source)} · ${book.prompts.length} prompts${book.inputs.length ? ` · ${book.inputs.length} inputs` : ''}</span>
              <span class="copilot-book-desc">${esc(book.description)}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Promptbook detail</strong>
          <span class="muted">${esc(selected?.source || '—')}</span>
        </div>
        ${selected ? `
          <div class="summary-info">
            <div><span class="muted">Inputs</span><strong>${selected.inputs.length ? selected.inputs.join(', ') : 'None'}</strong></div>
            <div><span class="muted">Prompts</span><strong>${selected.prompts.length}</strong></div>
            <div><span class="muted">Source</span><strong>${esc(selected.source)}</strong></div>
          </div>
          <div class="alert-section-title">Sequenced prompts</div>
          <ol class="copilot-book-steps">
            ${selected.prompts.map(prompt => `<li>${esc(prompt)}</li>`).join('')}
          </ol>
          <div class="sidepanel-footer">
            <button class="btn btn-primary" onclick="runCopilotPromptbook('${esc(selected.id)}')">Run promptbook</button>
            <button class="btn btn-secondary" onclick="openCopilotPromptForSession('cs-009')">Open agentic session</button>
          </div>
        ` : `<div class="muted">Choose a promptbook from the library.</div>`}
      </section>
    </div>

    <div class="copilot-builder-grid">
      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Create your own</strong>
          <span class="muted">Saved locally in browser storage</span>
        </div>
        <div class="form-grid two">
          <label class="lbl">Name<input class="ipt" id="copilot-pb-name" placeholder="Custom incident summarizer"></label>
          <label class="lbl">Inputs<input class="ipt" id="copilot-pb-inputs" placeholder="Incident ID, User principal name"></label>
        </div>
        <label class="lbl">Description<textarea class="ipt" id="copilot-pb-description" rows="3" placeholder="Describe when to use this promptbook."></textarea></label>
        <label class="lbl">Prompts<textarea class="ipt" id="copilot-pb-prompts" rows="6" placeholder="First prompt line&#10;Second prompt line&#10;Third prompt line"></textarea></label>
        <div class="sidepanel-footer">
          <button class="btn btn-primary" onclick="saveCopilotPromptbook()">Save promptbook</button>
        </div>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Run promptbook flow</strong>
          <span class="muted">Creates a canned session</span>
        </div>
        <div class="muted">Running a promptbook records a local session transcript and opens it in the session detail view, which makes it easy to compare built-in and custom promptbooks side by side.</div>
        <div class="callout info" style="margin-top:12px;">
          Use this flow to practice repeatable triage: pick a promptbook, run it, then inspect the transcript and rerun a prompt from the generated session.
        </div>
      </section>
    </div>
  `;
};

VIEWS['copilot/plugins'] = () => {
  const plugins = getCopilotPlugins();
  const selected = copilotSelectedPlugin();
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Plugins</strong></div>
        <h1>Plugins</h1>
        <div class="page-subtitle">Manage first-party, third-party, and custom plugins that can ground a Copilot answer.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="navigate('#/copilot/knowledge')">Knowledge</button>
        <button class="btn btn-primary" onclick="toast('platform-native plugins win before third-party or custom plugins when multiple are enabled.')">Precedence note</button>
      </div>
    </div>

    <div class="copilot-plugin-layout">
      <section class="card">
        <div class="card-toolbar">
          <strong>Plugin manager</strong>
          <span class="muted">Toggle and select a plugin to review its setup note</span>
        </div>
        <div class="copilot-plugin-grid">
          ${plugins.map(plugin => `
            <button class="copilot-plugin-card ${selected?.id === plugin.id ? 'active' : ''}" onclick="selectCopilotPlugin('${esc(plugin.id)}')">
              <div class="copilot-plugin-head">
                <strong>${esc(plugin.name)}</strong>
                <label class="copilot-toggle">
                  <input type="checkbox" ${plugin.status === 'On' ? 'checked' : ''} onclick="event.stopPropagation(); toggleCopilotPlugin('${esc(plugin.id)}')">
                  <span>On</span>
                </label>
              </div>
              <div class="copilot-plugin-meta">${esc(plugin.category)} · ${esc(plugin.status)}</div>
              <div class="copilot-plugin-desc">${esc(plugin.description)}</div>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Setup panel</strong>
          <span class="muted">${esc(selected?.category || '—')}</span>
        </div>
        ${selected ? `
          <div class="summary-info">
            <div><span class="muted">Status</span><strong>${esc(selected.status)}</strong></div>
            <div><span class="muted">Category</span><strong>${esc(selected.category)}</strong></div>
          </div>
          <div class="alert-section-title">What it adds</div>
          <div class="muted">${esc(selected.description)}</div>
          <div class="alert-section-title">Setup note</div>
          <div class="callout info">${esc(selected.setupNote)}</div>
          <div class="alert-section-title">Precedence</div>
          <div class="muted">When multiple plugins are enabled, platform-native plugins are checked before third-party or custom plugins. The highest-priority enabled plugin gets the first chance to answer.</div>
        ` : `<div class="muted">Pick a plugin from the list.</div>`}
      </section>
    </div>
  `;
};

VIEWS['copilot/knowledge'] = () => {
  const sources = getCopilotKnowledge();
  const selected = copilotSelectedKnowledgeSource();
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Knowledge</strong></div>
        <h1>Knowledge base connections</h1>
        <div class="page-subtitle">File uploads and Azure AI Search style sources ground responses in the lab tenant.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="addCopilotKnowledgeSource('file')">Upload file</button>
        <button class="btn btn-primary" onclick="addCopilotKnowledgeSource('search')">Connect search source</button>
      </div>
    </div>

    <div class="copilot-knowledge-layout">
      <section class="card">
        <div class="card-toolbar">
          <strong>Knowledge sources</strong>
          <span class="muted">${sources.length} connected</span>
        </div>
        <div class="copilot-knowledge-list">
          ${sources.map(source => `
            <button class="copilot-knowledge-card ${selected?.id === source.id ? 'active' : ''}" onclick="sessionStorage.setItem('defender-lab.copilot.knowledge.id','${esc(source.id)}'); render();">
              <span class="copilot-knowledge-title">${esc(source.name)}</span>
              <span class="copilot-knowledge-meta">${esc(source.type)} · ${esc(source.status)}</span>
              <span class="copilot-knowledge-meta">${esc(source.scope)} · Added by ${esc(source.addedBy)}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Grounding example</strong>
          <span class="muted">${esc(selected?.type || '—')}</span>
        </div>
        ${selected ? `
          <div class="summary-info">
            <div><span class="muted">Items</span><strong>${esc(selected.items)}</strong></div>
            <div><span class="muted">Status</span><strong>${esc(selected.status)}</strong></div>
            <div><span class="muted">Scope</span><strong>${esc(selected.scope)}</strong></div>
          </div>
          <div class="alert-section-title">Prompt</div>
          <div class="copilot-user">Where do I look for the policy that explains external sharing decisions?</div>
          <div class="alert-section-title">Grounded answer</div>
          <div class="copilot-response">Use the connected knowledge source to ground the response, then cite the local policy language and the most recent audit or DLP evidence before recommending an action.</div>
          <div class="alert-section-title">Sources used</div>
          <div class="copilot-chip-row">
            <span class="tag">${esc(selected.name)}</span>
            <span class="tag">${esc(selected.type)}</span>
            <span class="tag">${esc(selected.scope)}</span>
          </div>
          <div class="callout info" style="margin-top:12px;">
            Grounding makes Copilot answer with tenant-specific context instead of generic advice. File uploads are best for runbooks; search indexes are better for large policy or knowledge repositories.
          </div>
        ` : `<div class="muted">Choose a source to see a grounded answer example.</div>`}
      </section>
    </div>
  `;
};

VIEWS['copilot/settings'] = () => {
  const settings = getCopilotSettings();
  const usage = COPILOT_USAGE;
  const avgUnits = usage.reduce((sum, row) => sum + row.unitsUsed, 0) / usage.length;
  const avgSessions = usage.reduce((sum, row) => sum + row.sessions, 0) / usage.length;
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Security Copilot › <strong>Settings</strong></div>
        <h1>Capacity and owner settings</h1>
        <div class="page-subtitle">Provision SCUs, choose ownership, and decide how much data the tenant shares with Copilot.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" onclick="sessionStorage.removeItem('defender-lab.copilot.settings'); render();">Reset defaults</button>
        <button class="btn btn-primary" onclick="toast('Settings are persisted locally in browser storage.')">Saved locally</button>
      </div>
    </div>

    <div class="copilot-settings-grid">
      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Capacity dashboard</strong>
          <span class="muted">${settings.region} · ${settings.tenant}</span>
        </div>
        <div class="kpi-strip">
          <div class="kpi"><span class="kpi-label">Provisioned SCUs</span><span class="kpi-value">${esc(settings.provisionedSCU)}</span></div>
          <div class="kpi"><span class="kpi-label">Average burn</span><span class="kpi-value">${avgUnits.toFixed(1)}</span></div>
          <div class="kpi"><span class="kpi-label">Average sessions</span><span class="kpi-value">${avgSessions.toFixed(1)}</span></div>
          <div class="kpi"><span class="kpi-label">Overage</span><span class="kpi-value">${settings.overageAllowed ? 'On' : 'Off'}</span></div>
        </div>
        <table class="grid">
          <thead><tr><th>Date</th><th>SCU used</th><th>Sessions</th></tr></thead>
          <tbody>
            ${usage.map(row => `
              <tr><td>${fmtTime(row.date)}</td><td>${row.unitsUsed.toFixed(1)}</td><td>${row.sessions}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <section class="card card-body">
        <div class="card-toolbar">
          <strong>Owner settings</strong>
          <span class="muted">Persisted locally</span>
        </div>
        <div class="form-grid two">
          <label class="lbl">Role
            <select class="ipt" onchange="updateCopilotSetting('ownerRole', this.value)">
              <option ${settings.ownerRole === 'Owner' ? 'selected' : ''}>Owner</option>
              <option ${settings.ownerRole === 'Contributor' ? 'selected' : ''}>Contributor</option>
            </select>
          </label>
          <label class="lbl">Tenant<input class="ipt" value="${esc(settings.tenant)}" onchange="updateCopilotSetting('tenant', this.value)"></label>
          <label class="lbl">Provisioned SCUs
            <input class="ipt" type="range" min="1" max="20" value="${esc(settings.provisionedSCU)}" onchange="updateCopilotSetting('provisionedSCU', Number(this.value))">
          </label>
          <label class="lbl">Daily session limit
            <input class="ipt" type="range" min="1" max="20" value="${esc(settings.dailyLimit)}" onchange="updateCopilotSetting('dailyLimit', Number(this.value))">
          </label>
        </div>
        <label class="check-row"><input type="checkbox" ${settings.dataSharing ? 'checked' : ''} onchange="updateCopilotSetting('dataSharing', this.checked)"> Allow tenant data to ground answers</label>
        <label class="check-row"><input type="checkbox" ${settings.logging ? 'checked' : ''} onchange="updateCopilotSetting('logging', this.checked)"> Keep session logging for local review</label>
        <label class="check-row"><input type="checkbox" ${settings.overageAllowed ? 'checked' : ''} onchange="updateCopilotSetting('overageAllowed', this.checked)"> Allow overage when SCU demand spikes</label>
        <div class="alert-section-title">Usage notes</div>
        <div class="muted">Owners provision capacity, contributors run investigations, and the lab keeps all telemetry local. Geo and tenant notes are informational only.</div>
      </section>
    </div>
  `;
};

// === local-tasks views (auto-merged by add_view.py — do not hand-edit between markers) ===

// --- v17-defender-vulnerabilities ---
// nav: Endpoints | Vulnerability management | 🩹
VIEWS['defender/vulnerabilities'] = () => {
  const recs = currentTvmRecommendations();
  const tracker = currentTvmTracker().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const exceptions = currentTvmExceptionsWithDefaults().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const severityRank = { Critical: 3, High: 2, Medium: 1, Low: 0 };
  const topSoftware = [...TVM_SOFTWARE].sort((a, b) => b.weaknesses - a.weaknesses).slice(0, 5);
  const topCves = [...TVM_CVES].sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) || b.exposedDevices - a.exposedDevices).slice(0, 6);
  const exploitable = TVM_CVES.filter(c => c.exploitAvailable).length;
  const active = recs.filter(r => r.status === 'Active' || r.status === 'In progress').length;
  const exceptionCount = recs.filter(r => r.status === 'Exception').length;
  const fixed = recs.filter(r => r.status === 'Completed').length;
  const trendMax = Math.max(...TVM_EXPOSURE_TREND.map(item => item.score));
  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Exposure management › <strong>Vulnerability management</strong></div>
      <h1>Vulnerability management</h1>
      <div class="page-subtitle">Track exposed software, exploitable CVEs, remediation requests, and scoped exceptions for the lab tenant.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/defender/exposure">Exposure management</a>
      <a class="btn btn-secondary" href="#/defender/device" onclick="openDevice('WKS-03', 'vulnerabilities')">Open device TVM</a>
      <button class="btn btn-primary" onclick="openTvmRemediationFlow('tr-01')">Request remediation</button>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Open recommendations</span><span class="kpi-value">${active}</span><span class="kpi-delta">In flight</span></div>
    <div class="kpi"><span class="kpi-label">Exceptions</span><span class="kpi-value">${exceptionCount}</span><span class="kpi-delta">Scoped risk accepted</span></div>
    <div class="kpi"><span class="kpi-label">Exploitable CVEs</span><span class="kpi-value">${exploitable}</span><span class="kpi-delta bad">Prioritize these</span></div>
    <div class="kpi"><span class="kpi-label">Completed fixes</span><span class="kpi-value">${fixed}</span><span class="kpi-delta good">Closed</span></div>
  </div>

  <div class="two-col">
    <section class="card card-body">
      <div class="card-toolbar">
        <strong>Exposure score trend</strong>
        <a class="chip-link" href="#/defender/exposure">Open exposure management →</a>
      </div>
      <div class="tvm-trend">
        ${TVM_EXPOSURE_TREND.map(item => `
          <div class="tvm-trend-item">
            <strong>${item.score}%</strong>
            <span>${esc(item.date)}</span>
            <div class="tvm-trend-bar" style="width:${Math.max(24, Math.round((item.score / trendMax) * 100))}%"></div>
          </div>
        `).join('')}
      </div>
      <div class="callout info">The trend is strongest when exploit-available CVEs line up with active remediation tickets. Exceptions do not remove the issue; they only scope it.</div>
    </section>
    <section class="card card-body">
      <div class="card-toolbar">
        <strong>Remediation tracker</strong>
        <span class="muted">${tracker.length} items</span>
      </div>
      <div class="tvm-track">
        ${tracker.map(item => `
          <div class="tvm-track-row">
            <div><strong>${esc(item.title)}</strong><span>${esc(item.scope)}</span></div>
            <div><span class="tvm-chip ${tvmStatusClass(item.status)}">${esc(item.status)}</span></div>
            <div><strong>${esc(item.owner)}</strong><span>Owner</span></div>
            <div><strong>${fmtTime(item.due)}</strong><span>Due</span></div>
            <div>
              <div class="tvm-progress" aria-label="Remediation progress"><i style="width:${Math.max(10, parseInt(item.progress || '0', 10) || 0)}%"></i></div>
              <span>${esc(item.handoff)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  </div>

  <div class="card" style="margin-top:16px;">
    <div class="card-toolbar">
      <strong>Security recommendations</strong>
      <span class="muted">${recs.length} total</span>
    </div>
    <table class="grid">
      <thead><tr><th>Recommendation</th><th>Software</th><th>Exposure</th><th>Impact</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${recs.map(r => `
          <tr class="${r.status === 'Exception' ? 'tvm-exception-row' : ''}">
            <td><strong>${esc(r.title)}</strong>${r.exception ? `<div class="muted">Exception scope: ${esc(r.exception.scope)}</div>` : ''}</td>
            <td><a class="tvm-soft-link" onclick="openTvmSoftware('${esc(TVM_SOFTWARE.find(sw => sw.name === r.software)?.id || '')}')">${esc(r.software)}</a></td>
            <td>${esc(r.exposedDevices)}</td>
            <td>${esc(r.impact)}</td>
            <td><span class="tvm-chip ${tvmStatusClass(r.status)}">${esc(r.status)}</span></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="openTvmRemediationFlow('${esc(r.id)}')">Request remediation</button>
              <button class="btn btn-secondary btn-sm" onclick="openTvmExceptionFlow('${esc(r.id)}')">File exception</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="two-col" style="margin-top:16px;">
    <section class="card card-body">
      <div class="card-toolbar">
        <strong>Software inventory</strong>
        <span class="muted">${topSoftware.length} top entries</span>
      </div>
      <table class="grid tvm-side-table">
        <thead><tr><th>Software</th><th>Vendor</th><th>Version</th><th>Weaknesses</th><th>Devices</th></tr></thead>
        <tbody>
          ${topSoftware.map(item => `
            <tr>
              <td><a class="tvm-soft-link" onclick="openTvmSoftware('${esc(item.id)}')">${esc(item.name)}</a></td>
              <td>${esc(item.vendor)}</td>
              <td>${esc(item.version)}</td>
              <td>${esc(item.weaknesses)}</td>
              <td>${esc(item.deviceCount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    <section class="card card-body">
      <div class="card-toolbar">
        <strong>Exploitable CVEs</strong>
        <span class="muted">Click any row for detail</span>
      </div>
      <table class="grid tvm-side-table">
        <thead><tr><th>CVE</th><th>Software</th><th>Severity</th><th>CVSS</th><th>Devices</th></tr></thead>
        <tbody>
          ${topCves.map(item => `
            <tr>
              <td><a class="tvm-soft-link" onclick="openTvmCve('${esc(item.id)}')">${esc(item.cve)}</a></td>
              <td>${esc(item.software)}</td>
              <td><span class="sev ${item.severity === 'Critical' ? 'high' : item.severity === 'High' ? 'medium' : 'low'}">${esc(item.severity)}</span></td>
              <td>${esc(item.cvss)}</td>
              <td>${esc(item.affectedDevices ? item.affectedDevices.length : item.exposedDevices)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  </div>

  <div class="two-col" style="margin-top:16px;">
    <section class="card card-body">
      <div class="card-toolbar">
        <strong>Exceptions in effect</strong>
        <span class="muted">${exceptions.length} entries</span>
      </div>
      <table class="grid tvm-side-table">
        <thead><tr><th>Recommendation</th><th>Scope</th><th>Owner</th><th>Expires</th></tr></thead>
        <tbody>
          ${exceptions.map(item => `
            <tr>
              <td><strong>${esc(item.title)}</strong></td>
              <td>${esc(item.scope)}</td>
              <td>${esc(item.owner)}</td>
              <td>${fmtTime(item.expires)}</td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="muted">No exceptions recorded yet.</td></tr>'}
        </tbody>
      </table>
    </section>
    <section class="card card-body">
      <div class="card-toolbar">
        <strong>Workflow guidance</strong>
        <span class="muted">Static lab notes</span>
      </div>
      <ul>
        <li>Use remediation tickets when the fix is available and you want the recommendation to move to In progress.</li>
        <li>Use scoped exceptions only when business need exists and the recommendation must remain visible for review.</li>
        <li>Open a software row to inspect the CVEs and the affected device groups behind the recommendation.</li>
      </ul>
    </section>
  </div>
  `;
};

// --- v18-defender-threat-explorer ---
// nav: Email & collaboration | Threat explorer | 📧
VIEWS['defender/threat-explorer'] = () => ({
  html: `<div id="threat-explorer-root"><div class="page-header"><div><h1>Threat explorer</h1><div class="page-subtitle">Loading the local message investigation queue…</div></div></div></div>`,
  onMount: () => {
    const root = document.getElementById('threat-explorer-root');
    const campaigns = THREAT_EXPLORER_CAMPAIGNS;
    const state = {
      pivot: 'all',
      campaign: campaigns[0]?.name || 'Invoice lure June',
      selectedId: TX_EMAILS[0]?.id || '',
      selectedBatch: new Set([TX_EMAILS[0]?.id].filter(Boolean)),
      remediation: null,
    };

    function visibleEmails() {
      let rows = TX_EMAILS.slice();
      if (state.pivot === 'phish') rows = rows.filter(e => e.verdict === 'Phish');
      if (state.pivot === 'malware') rows = rows.filter(e => e.verdict === 'Malware');
      if (state.pivot === 'campaign') rows = rows.filter(e => e.campaign === state.campaign);
      return rows;
    }

    function openMessage(id) {
      const email = TX_EMAILS.find(row => row.id === id);
      if (!email) return;
      state.selectedId = id;
      state.selectedBatch.add(id);
      render();
      document.getElementById('threat-message-title').textContent = email.subject;
      document.getElementById('threat-message-body').innerHTML = `
        <div class="callout info" style="margin-bottom:16px;">
          Message entity <strong>${esc(email.id)}</strong> from the Threat Explorer queue.
        </div>
        ${detailFor(email)}
      `;
      showPanel('panel-threat-message');
    }

    function topTargets(rows) {
      const counts = new Map();
      rows.forEach(row => counts.set(row.recipient, (counts.get(row.recipient) || 0) + 1));
      return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }

    function detailFor(email) {
      if (!email) return '<div class="muted">Select an email to inspect headers, verdict, and response actions.</div>';
      const actionList = email.verdict === 'Malware'
        ? ['Quarantine message', 'Block sender domain', 'Sweep matching attachments', 'Notify the recipient owner']
        : email.verdict === 'Phish'
          ? ['Soft delete message', 'Revoke user sessions', 'Search and purge campaign', 'Check for follow-on consent']
          : ['Review delivery action', 'Confirm no user impact', 'Keep for reference'];
      const authResults = email.verdict === 'Malware'
        ? 'spf=pass dkim=pass dmarc=fail'
        : 'spf=pass dkim=pass dmarc=bestguesspass';
      return `
        <dl class="alert-meta">
          <dt>Subject</dt><dd>${esc(email.subject)}</dd>
          <dt>Sender</dt><dd>${esc(email.sender)}</dd>
          <dt>Recipient</dt><dd>${esc(email.recipient)}</dd>
          <dt>Verdict</dt><dd><span class="sev ${email.verdict === 'Malware' ? 'high' : email.verdict === 'Phish' ? 'medium' : 'low'}">${esc(email.verdict)}</span></dd>
          <dt>Delivery</dt><dd>${esc(email.deliveryAction)}</dd>
          <dt>Campaign</dt><dd>${esc(email.campaign)}</dd>
        </dl>
        <div class="alert-section-title">Header summary</div>
        <div class="kv">
          <div><span class="k">Message-ID:</span> &lt;${esc(email.id)}@mail.lab.example&gt;</div>
          <div><span class="k">Authentication-Results:</span> ${esc(authResults)}</div>
          <div><span class="k">Return-Path:</span> ${esc(email.sender)}</div>
          <div><span class="k">Received:</span> from mail-gateway.lab.example by defender-lab</div>
        </div>
        <div class="alert-section-title">Delivery and ZAP actions</div>
        <div class="callout ${email.verdict === 'Malware' ? 'warn' : 'info'}">
          <strong>${esc(email.deliveryAction)}</strong>
          <div>${email.verdict === 'Malware' ? 'Malware payload was quarantined or removed by ZAP. Review the attachment and sender lineage before release.' : 'Phish message is a candidate for soft delete, user purge, and follow-on session revocation.'}</div>
        </div>
        <ul style="margin:10px 0 0; padding-left:18px; line-height:1.7;">${actionList.map(action => `<li>${esc(action)}</li>`).join('')}</ul>
      `;
    }

    function renderCampaignCards() {
      return campaigns.map(c => `
        <button class="tile" type="button" data-campaign="${esc(c.name)}" style="text-align:left; width:100%; border:none; background:#fff;">
          <strong>${esc(c.name)}</strong>
          <span>${esc(c.verdict)} wave · ${esc(c.messageCount)} messages · ${esc(c.summary)}</span>
        </button>
      `).join('');
    }

    function render() {
      const rows = visibleEmails();
      const selected = rows.find(r => r.id === state.selectedId) || rows[0] || TX_EMAILS[0];
      const phishCount = TX_EMAILS.filter(e => e.verdict === 'Phish').length;
      const malwareCount = TX_EMAILS.filter(e => e.verdict === 'Malware').length;
      const zapCount = TX_EMAILS.filter(e => e.deliveryAction.toLowerCase().includes('zap') || e.deliveryAction === 'Removed by ZAP').length;
      const targetRows = topTargets(TX_EMAILS);
      root.innerHTML = `
        <div class="page-header">
          <div>
            <div class="breadcrumb">Email & collaboration › <strong>Threat explorer</strong></div>
            <h1>Threat explorer</h1>
            <div class="page-subtitle">Pivot by verdict or campaign, inspect message entities, and queue a mock remediation batch.</div>
          </div>
          <div class="page-actions">
            <a class="btn btn-secondary" href="#/defender/email-collab">Email &amp; collaboration</a>
            <a class="btn btn-secondary" href="#/defender/email-collab/threat-explorer/campaigns">Campaign pivots</a>
            <button class="btn btn-primary" id="remediate-selected">Remediate selected</button>
          </div>
        </div>
        <div class="kpi-strip">
          <div class="kpi"><span class="kpi-label">Phish count</span><span class="kpi-value">${phishCount}</span></div>
          <div class="kpi"><span class="kpi-label">Malware count</span><span class="kpi-value">${malwareCount}</span></div>
          <div class="kpi"><span class="kpi-label">ZAP removals</span><span class="kpi-value">${zapCount}</span></div>
          <div class="kpi"><span class="kpi-label">Campaigns</span><span class="kpi-value">${campaigns.length}</span></div>
        </div>
        <div class="card card-body">
          <div class="tabs">
            <span class="tab ${state.pivot === 'all' ? 'active' : ''}" data-pivot="all">All</span>
            <span class="tab ${state.pivot === 'phish' ? 'active' : ''}" data-pivot="phish">Phish</span>
            <span class="tab ${state.pivot === 'malware' ? 'active' : ''}" data-pivot="malware">Malware</span>
            <span class="tab ${state.pivot === 'campaign' ? 'active' : ''}" data-pivot="campaign">Campaigns</span>
          </div>
          <div class="callout info" style="margin-top:12px;">
            The table below reflects the active pivot. Use checkboxes to batch a local remediation preview, then inspect one message in the detail pane.
          </div>
        </div>
        <div class="two-col" style="margin-top:16px;">
          <section class="card">
            <div class="card-toolbar">
              <strong>Message queue</strong>
              <span class="muted">${rows.length} rows in the current pivot</span>
            </div>
            <table class="grid">
              <thead><tr><th></th><th>Time</th><th>Subject</th><th>Sender</th><th>Recipient</th><th>Verdict</th><th>Delivery action</th><th>Campaign</th></tr></thead>
              <tbody>
                ${rows.map(e => `
                  <tr class="threat-message-row ${e.id === selected.id ? 'selected' : ''}"
                      data-email-id="${esc(e.id)}" tabindex="0" role="button"
                      aria-label="Open message: ${esc(e.subject)}">
                    <td><input type="checkbox" class="threat-select" data-email-id="${esc(e.id)}" ${state.selectedBatch.has(e.id) ? 'checked' : ''}></td>
                    <td>${esc(fmtTime(e.time))}</td>
                    <td><button class="link-button strong threat-row" type="button" data-email-id="${esc(e.id)}">${esc(e.subject)}</button></td>
                    <td>${esc(e.sender)}</td>
                    <td>${esc(e.recipient)}</td>
                    <td><span class="sev ${e.verdict === 'Malware' ? 'high' : e.verdict === 'Phish' ? 'medium' : 'low'}">${esc(e.verdict)}</span></td>
                    <td>${esc(e.deliveryAction)}</td>
                    <td>${esc(e.campaign)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${state.remediation ? `
              <div class="callout success" style="margin-top:12px;">
                ${esc(state.remediation)}
              </div>
            ` : ''}
          </section>
          <section class="card card-body">
            <div class="card-toolbar">
              <strong>Email entity detail</strong>
              <span class="muted">${selected ? esc(selected.id) : 'No selection'}</span>
            </div>
            ${detailFor(selected)}
          </section>
        </div>
        <div class="two-col" style="margin-top:16px;">
          <section class="card card-body">
            <div class="card-toolbar">
              <strong>Top targeted users</strong>
              <span class="muted">Recipient counts from the corpus</span>
            </div>
            <table class="grid">
              <thead><tr><th>User</th><th>Messages</th><th>Why it matters</th></tr></thead>
              <tbody>
                ${targetRows.map(([user, count]) => `
                  <tr>
                    <td>${esc(user)}</td>
                    <td>${count}</td>
                    <td>${count > 2 ? 'Repeated target across lure waves' : 'Single-message target worth reviewing'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </section>
          <section class="card card-body">
            <div class="card-toolbar">
              <strong>Campaign pivots</strong>
              <span class="muted">Click a card to narrow to one wave</span>
            </div>
            <div class="tile-grid">${renderCampaignCards()}</div>
          </section>
        </div>
      `;

      root.querySelectorAll('[data-pivot]').forEach(tab => {
        tab.addEventListener('click', () => {
          state.pivot = tab.getAttribute('data-pivot');
          if (state.pivot !== 'campaign') state.campaign = campaigns[0]?.name || state.campaign;
          const visible = visibleEmails();
          state.selectedId = visible[0]?.id || TX_EMAILS[0]?.id || '';
          render();
        });
      });
      root.querySelectorAll('.threat-message-row').forEach(row => {
        row.addEventListener('click', event => {
          if (event.target.closest('.threat-select')) return;
          openMessage(row.getAttribute('data-email-id'));
        });
        row.addEventListener('keydown', event => {
          if (event.target.closest('.threat-select')) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openMessage(row.getAttribute('data-email-id'));
        });
      });
      root.querySelectorAll('.threat-select').forEach(cb => {
        cb.addEventListener('click', event => event.stopPropagation());
        cb.addEventListener('change', () => {
          const id = cb.getAttribute('data-email-id');
          if (cb.checked) state.selectedBatch.add(id);
          else state.selectedBatch.delete(id);
        });
      });
      root.querySelectorAll('[data-campaign]').forEach(card => {
        card.addEventListener('click', () => {
          state.pivot = 'campaign';
          state.campaign = card.getAttribute('data-campaign');
          const visible = visibleEmails();
          state.selectedId = visible[0]?.id || TX_EMAILS[0]?.id || '';
          render();
        });
      });
      const remediate = document.getElementById('remediate-selected');
      if (remediate) remediate.addEventListener('click', () => {
        const chosen = rows.filter(r => state.selectedBatch.has(r.id));
        const batch = chosen.length ? chosen : (selected ? [selected] : []);
        state.remediation = batch.length
          ? `Queued ${batch.length} message${batch.length === 1 ? '' : 's'} for soft delete and ZAP cleanup in the lab.`
          : 'Select one or more messages first.';
        render();
        toast(state.remediation);
      });
    }

    render();
  }
});

VIEWS['defender/email-collab/threat-explorer/campaigns'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Email &amp; collaboration › <strong>Threat explorer › Campaigns</strong></div>
      <h1>Campaign pivots</h1>
      <div class="page-subtitle">Break the mail corpus into lure waves, affected users, and the response pattern you would take in the portal.</div>
    </div>
    <div class="page-actions">
      <a class="btn btn-secondary" href="#/defender/threat-explorer">Back to explorer</a>
    </div>
  </div>
  <div class="two-col">
    <section class="card card-body">
      <div class="alert-section-title">Campaign summaries</div>
      ${THREAT_EXPLORER_CAMPAIGNS.map(c => `
        <div class="callout ${c.verdict === 'Malware' ? 'warn' : 'info'}" style="margin-top:12px;">
          <strong>${esc(c.name)}</strong>
          <div>${esc(c.summary)}</div>
          <div style="margin-top:4px;">Messages: ${esc(c.messageCount)} · Targets: ${esc(c.topTargets.join(', '))}</div>
          <div style="margin-top:4px;">${esc(c.deliveryActions)}</div>
        </div>
      `).join('')}
    </section>
    <section class="card card-body">
      <div class="alert-section-title">Guidance</div>
      <ul style="margin:0; padding-left:18px; line-height:1.7;">
        <li>Use verdict pivots to separate phish from malware before you decide on response scope.</li>
        <li>Use campaign pivots when the same sender pattern or lure text repeats across multiple messages.</li>
        <li>Use entity detail to review headers, authentication clues, and ZAP/delivery actions before remediation.</li>
      </ul>
      <div class="callout success" style="margin-top:12px;">
        Selected batches stay local to the lab. No real mailboxes, exports, or purge actions are touched.
      </div>
    </section>
  </div>
`;
// === end local-tasks views ===

// ===================== Entra =====================
// ---------- Entra overview: tenant directory helpers ----------
const ENTRA_USER_FILTERS = [
  { key:'all',        label:'All users',          test:() => true },
  { key:'risk',       label:'Flagged for risk',   test:u => u.riskState === 'At risk' || u.riskState === 'Confirmed compromised' },
  { key:'privileged', label:'Privileged',         test:u => u.roles.length > 0 },
  { key:'nomfa',      label:'MFA not registered', test:u => u.mfa === 'Not registered' },
  { key:'service',    label:'Service principals', test:u => u.userType === 'Service principal' },
  { key:'guest',      label:'Guests',             test:u => u.userType === 'Guest' },
];

function currentEntraUserFilter() {
  const key = sessionStorage.getItem('defender-lab.entra.users.filter') || 'all';
  return ENTRA_USER_FILTERS.some(f => f.key === key) ? key : 'all';
}
function setEntraUserFilter(key) {
  sessionStorage.setItem('defender-lab.entra.users.filter', key);
  render();
}
function currentEntraUserSearch() {
  return sessionStorage.getItem('defender-lab.entra.users.search') || '';
}
function setEntraUserSearch(value) {
  sessionStorage.setItem('defender-lab.entra.users.search', value);
  render();
}
function entraUserRows() {
  const filter = ENTRA_USER_FILTERS.find(f => f.key === currentEntraUserFilter());
  const q = currentEntraUserSearch().trim().toLowerCase();
  return ENTRA_USERS.filter(u => filter.test(u)).filter(u => !q
    || u.displayName.toLowerCase().includes(q)
    || u.upn.toLowerCase().includes(q)
    || u.department.toLowerCase().includes(q)
    || u.jobTitle.toLowerCase().includes(q));
}
// Risk level → severity class used by the .sev pill.
function entraRiskClass(level) {
  return level === 'High' ? 'high' : level === 'Medium' ? 'medium' : level === 'Low' ? 'low' : 'info';
}
function entraMfaTag(mfa) {
  if (mfa === 'Not registered') return '<span class="tag red">Not registered</span>';
  if (mfa === 'Passkey (FIDO2)') return '<span class="tag green">Passkey (FIDO2)</span>';
  if (mfa === 'SMS') return '<span class="tag orange">SMS</span>';
  return `<span class="tag blue">${esc(mfa)}</span>`;
}

VIEWS['entra/overview'] = () => {
  const rows       = entraUserRows();
  const filter     = currentEntraUserFilter();
  const search     = currentEntraUserSearch();
  const members    = ENTRA_USERS.filter(u => u.userType === 'Member');
  const guests     = ENTRA_USERS.filter(u => u.userType === 'Guest');
  const spns       = ENTRA_USERS.filter(u => u.userType === 'Service principal');
  const atRisk     = ENTRA_USERS.filter(u => u.riskState === 'At risk' || u.riskState === 'Confirmed compromised');
  const noMfa      = ENTRA_USERS.filter(u => u.mfa === 'Not registered');
  const privileged = ENTRA_USERS.filter(u => u.roles.length > 0);
  const detections = ENTRA_RISK_DETECTION_SUMMARY.reduce((n, d) => n + d.count, 0);
  const t = ENTRA_TENANT;

  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Entra › <strong>Overview</strong></div>
      <h1>Entra admin center</h1>
      <div class="page-subtitle">Identity and access management for <strong>${esc(t.name)}</strong>. The directory below is the same synthetic tenant the Defender XDR and Sentinel views investigate.</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" onclick="toast('Lab action: a user CSV export would be generated for ${ENTRA_USERS.length} principals.')">⬇ Export directory</button>
      <button class="btn btn-primary" onclick="navigate('#/entra/identity-protection')">Open Identity Protection</button>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi"><span class="kpi-label">Directory principals</span><span class="kpi-value">${ENTRA_USERS.length}</span><span class="kpi-delta">${members.length} member · ${guests.length} guest · ${spns.length} service</span></div>
    <div class="kpi"><span class="kpi-label">Flagged for risk</span><span class="kpi-value">${atRisk.length}</span><span class="kpi-delta bad">${ENTRA_USERS.filter(u=>u.riskState==='Confirmed compromised').length} confirmed compromised · ${detections} detections/7d</span></div>
    <div class="kpi"><span class="kpi-label">MFA not registered</span><span class="kpi-value">${noMfa.length}</span><span class="kpi-delta bad">Cannot self-remediate risk</span></div>
    <div class="kpi"><span class="kpi-label">Privileged</span><span class="kpi-value">${privileged.length}</span><span class="kpi-delta">Role-bearing · secure score ${t.secureScore}%</span></div>
  </div>

  <div class="two-col">
    <section class="card card-body">
      <div class="alert-section-title">Tenant</div>
      <table class="grid compact-grid">
        <tbody>
          <tr><td class="muted">Organization</td><td><strong>${esc(t.name)}</strong></td></tr>
          <tr><td class="muted">Primary domain</td><td>${esc(t.domain)}</td></tr>
          <tr><td class="muted">Tenant ID</td><td><code>${esc(t.tenantId)}</code></td></tr>
          <tr><td class="muted">License</td><td>${esc(t.license)} — ${t.seatsUsed}/${t.seatsTotal} seats assigned</td></tr>
          <tr><td class="muted">Hybrid sync</td><td><span class="tag green">${esc(t.syncStatus)}</span> ${esc(t.syncServer)} · last sync ${fmtTime(t.lastSync)}</td></tr>
        </tbody>
      </table>
      <div class="callout info" style="margin-top:12px;">
        Directory synchronization runs as <code>MSOL_AzureSync</code> from ${esc(t.syncServer)}. Its replication traffic is expected — that is why the Defender for Identity DCSync alert on that principal classifies as a <strong>benign true positive</strong>.
      </div>
    </section>

    <section class="card">
      <div class="card-toolbar"><strong>Risk detections</strong><span class="muted">Last 7 days · ${detections} total</span></div>
      <table class="grid compact-grid">
        <thead><tr><th>Detection type</th><th>Risk</th><th>Count</th><th>7-day change</th></tr></thead>
        <tbody>${ENTRA_RISK_DETECTION_SUMMARY.map(d => `
          <tr onclick="navigate('#/entra/identity-protection')">
            <td><strong>${esc(d.type)}</strong></td>
            <td><span class="sev ${entraRiskClass(d.level)}">${esc(d.level)}</span></td>
            <td>${d.count}</td>
            <td class="${d.trend.startsWith('+') ? 'muted' : ''}">${esc(d.trend)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </section>
  </div>

  <div class="tabs">
    ${ENTRA_USER_FILTERS.map(f => `
      <button class="tab ${f.key === filter ? 'active' : ''}" onclick="setEntraUserFilter('${f.key}')">
        ${esc(f.label)}<span class="pill">${ENTRA_USERS.filter(f.test).length}</span>
      </button>`).join('')}
  </div>

  <div class="inventory-toolbar">
    <span class="muted">${rows.length} of ${ENTRA_USERS.length} principals</span>
    <div class="inventory-toolbar-actions">
      <input class="input-sm" style="width:260px;" type="search" placeholder="Search name, UPN, department"
        value="${esc(search)}" onchange="setEntraUserSearch(this.value)">
      ${search ? `<button class="chip active" onclick="setEntraUserSearch('')">Clear search ✕</button>` : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-toolbar"><strong>All users</strong><span class="muted">Select a principal to open its Defender XDR identity page</span></div>
    <table class="grid">
      <thead><tr><th>Display name</th><th>User principal name</th><th>Type</th><th>Department</th><th>Risk state</th><th>MFA method</th><th>Roles</th><th>Source</th><th>Last sign-in</th></tr></thead>
      <tbody>
        ${rows.length === 0 ? `<tr><td colspan="9" class="muted">No principals match this filter.</td></tr>` : rows.map(u => `
          <tr onclick="openEntraUser('${esc(u.upn)}')">
            <td><strong>${esc(u.displayName)}</strong>${u.enabled ? '' : ' <span class="tag red">Disabled</span>'}<div class="muted">${esc(u.jobTitle)}</div></td>
            <td>${esc(u.upn)}</td>
            <td>${esc(u.userType)}</td>
            <td>${esc(u.department)}</td>
            <td>${u.riskState === 'None' ? '<span class="muted">None</span>'
                 : `<span class="sev ${entraRiskClass(u.riskLevel)}">${esc(u.riskState)}</span>`}</td>
            <td>${entraMfaTag(u.mfa)}</td>
            <td>${u.roles.length ? u.roles.map(r => `<span class="tag">${esc(r)}</span>`).join(' ') : '<span class="muted">—</span>'}</td>
            <td>${esc(u.source)}</td>
            <td>${fmtTime(u.lastSignIn)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="two-col">
    <section class="card">
      <div class="card-toolbar"><strong>Recent risky sign-ins</strong><span class="muted">Tenant-wide · last 24 hours</span></div>
      <table class="grid compact-grid">
        <thead><tr><th>Time</th><th>User</th><th>App</th><th>IP / location</th><th>Result</th><th>Risk</th><th>Conditional Access</th></tr></thead>
        <tbody>${ENTRA_RECENT_SIGNINS.map(s => `
          <tr onclick="openEntraUser('${esc(s.user)}')">
            <td>${fmtTime(s.time)}</td>
            <td>${esc(s.user)}</td>
            <td>${esc(s.app)}</td>
            <td>${esc(s.ip)}<div class="muted">${esc(s.location)}</div></td>
            <td>${esc(s.result)}</td>
            <td><span class="sev ${entraRiskClass(s.risk)}">${esc(s.risk)}</span></td>
            <td>${esc(s.ca)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </section>

    <section class="card">
      <div class="card-toolbar"><strong>Privileged role assignments</strong><span class="muted">${ENTRA_ROLE_ASSIGNMENTS.length} roles in use</span></div>
      <table class="grid compact-grid">
        <thead><tr><th>Role</th><th>Active</th><th>PIM eligible</th><th>Members</th></tr></thead>
        <tbody>${ENTRA_ROLE_ASSIGNMENTS.map(r => `
          <tr onclick="toast('${esc(r.note)}')">
            <td><strong>${esc(r.role)}</strong><div class="muted">${esc(r.note)}</div></td>
            <td>${r.active}</td>
            <td>${r.eligible}</td>
            <td>${r.members.map(m => `<div>${esc(m)}</div>`).join('')}</td>
          </tr>`).join('')}</tbody>
      </table>
    </section>
  </div>

  <div class="card">
    <div class="card-toolbar"><strong>Identity posture recommendations</strong><span class="muted">Identity secure score ${t.secureScore}/${t.secureScoreMax}</span></div>
    <table class="grid compact-grid">
      <thead><tr><th>Recommendation</th><th>Impact</th><th>Status</th><th>Why it matters here</th></tr></thead>
      <tbody>${ENTRA_RECOMMENDATIONS.map(r => `
        <tr onclick="navigate('#/entra/conditional-access')">
          <td><strong>${esc(r.title)}</strong></td>
          <td><span class="sev ${entraRiskClass(r.impact)}">${esc(r.impact)}</span></td>
          <td>${esc(r.status)}</td>
          <td>${esc(r.detail)}</td>
        </tr>`).join('')}</tbody>
    </table>
  </div>

  <div class="two-col">
    <section class="card card-body" onclick="navigate('#/entra/identity-protection')" style="cursor:pointer;">
      <div class="alert-section-title">🛡 Identity Protection</div>
      <p class="muted">Risk detections, risky users, and risky sign-ins from Entra ID Protection. Understand sign-in risk vs. user risk.</p>
    </section>
    <section class="card card-body" onclick="navigate('#/entra/conditional-access')" style="cursor:pointer;">
      <div class="alert-section-title">🔐 Conditional Access</div>
      <p class="muted">Build the sign-in risk-based policy that lets users self-remediate with MFA. Interactive builder inside.</p>
    </section>
  </div>
`;
};

// Raw authentication evidence. This is the first table a Module 01 student ever
// reads, so it stays close to a real sign-in log: one row per attempt, an error
// code on failures, and no verdict text anywhere. The filters are the lesson —
// a burst is invisible in a mixed log until you narrow it to one account.
VIEWS['entra/sign-in-logs'] = () => {
  const logType = sessionStorage.getItem('defender-lab.signin.logtype') || 'interactive';
  const userFilter = sessionStorage.getItem('defender-lab.signin.user') || '';
  const resultFilter = sessionStorage.getItem('defender-lab.signin.result') || '';
  const users = [...new Set(SIGNIN_LOG_EVENTS.map(e => e.user))].sort();
  const rows = SIGNIN_LOG_EVENTS
    .slice()
    .sort((a, b) => b.time.localeCompare(a.time))   // newest first, whatever order the fixture is in
    .filter(e => !userFilter || e.user === userFilter)
    .filter(e => !resultFilter || e.result === resultFilter);
  const filtered = userFilter || resultFilter;

  return `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Entra › Monitoring &amp; health › <strong>Sign-in logs</strong></div>
      <h1>Sign-in logs</h1>
      <div class="page-subtitle">Every interactive authentication attempt in the tenant. One row is one attempt — success and failure alike.</div>
    </div>
  </div>

  <div class="filterbar signin-filterbar">
    <label class="signin-filter">Date range:
      <select disabled><option>2026-06-27 → 2026-06-28</option></select>
    </label>
    <label class="signin-filter">User:
      <select id="signin-user-filter" onchange="setSigninFilter('user', this.value)">
        <option value="">All users</option>
        ${users.map(u => `<option value="${escHtml(u)}" ${u === userFilter ? 'selected' : ''}>${esc(u)}</option>`).join('')}
      </select>
    </label>
    <label class="signin-filter">Result:
      <select id="signin-result-filter" onchange="setSigninFilter('result', this.value)">
        <option value="">Any result</option>
        ${['Success', 'Failure'].map(r => `<option value="${r}" ${r === resultFilter ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
    </label>
    ${filtered ? `<button class="btn btn-ghost btn-sm" onclick="clearSigninFilters()">Clear filters</button>` : ''}
  </div>

  <div class="tabs signin-type-tabs">
    ${SIGNIN_LOG_TYPES.map(type => `<button class="tab ${type.key === logType ? 'active' : ''}" type="button"
      onclick="setSigninLogType('${type.key}')">${esc(type.label)}</button>`).join('')}
  </div>

  ${logType !== 'interactive' ? `<div class="card card-body">
    <div class="alert-section-title">${esc(SIGNIN_LOG_TYPES.find(t => t.key === logType).label)}</div>
    <p class="muted">${esc(SIGNIN_LOG_TYPES.find(t => t.key === logType).empty)}</p>
    <p class="muted">This lab's evidence is in the interactive log. Switch back to <strong>User sign-ins (interactive)</strong>.</p>
  </div>` : `
  <div class="card">
    <div class="card-toolbar">
      <strong>${rows.length}</strong> sign-in${rows.length === 1 ? '' : 's'}
      <span class="muted">${filtered ? 'Filtered view' : 'All tenant sign-ins, newest first'}</span>
    </div>
    <table class="grid signin-grid">
      <thead><tr>
        <th>Date (UTC)</th><th>User</th><th>Application</th><th>Status</th>
        <th>IP address</th><th>Location</th><th>Device</th><th>Sign-in risk</th>
      </tr></thead>
      <tbody>
        ${rows.length === 0 ? `<tr><td colspan="8" class="muted">No sign-ins match these filters.</td></tr>` : ''}
        ${rows.map(e => `
          <tr class="signin-row ${e.result === 'Failure' ? 'is-fail' : ''} ${e.flag ? 'flag-' + e.flag : ''}"
              data-signin-id="${escHtml(e.id)}" onclick="openSigninEvent('${escHtml(e.id)}')">
            <td>${fmtUtc(e.time, { seconds:true })}</td>
            <td>${esc(e.user)}</td>
            <td>${esc(e.app)}</td>
            <td>${e.result === 'Failure'
                  ? `<span class="tag red">Failure</span> <span class="muted">${esc(e.code)}</span>`
                  : `<span class="tag green">Success</span>`}</td>
            <td>${esc(e.ip)}</td>
            <td>${esc(e.location)}</td>
            <td>${esc(e.device)}</td>
            <td>${e.risk === 'None' ? '<span class="muted">None</span>' : `<span class="sev ${String(e.risk).toLowerCase()}">${esc(e.risk)}</span>`}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`}
`;
};

VIEWS['entra/identity-protection'] = () => `
  <div class="page-header">
    <div>
      <div class="breadcrumb">Entra › Protection › <strong>Identity Protection</strong></div>
      <h1>Identity Protection</h1>
      <div class="page-subtitle">Risk signals feed risk-based Conditional Access. Requires Entra ID P2.</div>
    </div>
  </div>
  <div class="card card-body">
    <div class="alert-section-title">Sign-in risk vs. user risk — and how each self-remediates</div>
    <table class="grid">
      <thead><tr><th>Risk type</th><th>What it means</th><th>Self-remediation grant control</th></tr></thead>
      <tbody>
        <tr><td><strong>Sign-in risk</strong></td><td>Probability that a specific authentication request wasn't the legitimate owner (anonymous IP, impossible travel, unfamiliar properties, AiTM).</td><td><strong>Require multifactor authentication</strong> — completing MFA closes the sign-in risk.</td></tr>
        <tr><td><strong>User risk</strong></td><td>Probability the account itself is compromised (leaked credentials, offline detections).</td><td><strong>Require password change</strong> (secure change, also forces MFA) — resets the user risk.</td></tr>
      </tbody>
    </table>
    <div class="callout info" style="margin-top:12px;">
      Self-remediation only works if the user is <strong>registered for MFA/SSPR before</strong> the risk is detected — otherwise the policy just blocks them.
      <span class="muted">See your licensed product documentation for risk-policy configuration.</span>
    </div>
  </div>
`;

VIEWS['entra/conditional-access'] = () => {
  const grant = sessionStorage.getItem('defender-lab.entra.ca.grant') || '';
  const stateSel = sessionStorage.getItem('defender-lab.entra.ca.state') || 'On';
  const riskCsv = sessionStorage.getItem('defender-lab.entra.ca.risk');
  const riskLevels = (riskCsv === null ? 'High,Medium' : riskCsv).split(',').filter(Boolean);
  const RISK_CHOICES = ['High', 'Medium', 'Low'];

  let createdPolicies = [];
  try { createdPolicies = JSON.parse(localStorage.getItem('defender-lab.entra.ca.policies.created') || '[]'); } catch { createdPolicies = []; }
  const allPolicies = [...ENTRA_CA_POLICIES, ...createdPolicies];

  // Which row (if any) is currently open in the blade: '', 'seed:<i>' or 'created:<i>'.
  const selectedPtr = sessionStorage.getItem('defender-lab.entra.ca.selected') || '';
  const isSeedSel = selectedPtr.startsWith('seed:');
  const isEditing = selectedPtr !== '';
  const workingName = sessionStorage.getItem('defender-lab.entra.ca.name');
  const nameValue = workingName !== null ? workingName : 'Require MFA for medium and high sign-in risk';

  // Feedback keyed on the grant control the learner picked for a SIGN-IN risk policy.
  const FEEDBACK = {
    '':          { cls:'info', msg:'Choose a grant control below. You are building a <strong>sign-in</strong> risk policy that should let users self-remediate.' },
    'mfa':       { cls:'success', msg:'✅ Correct. <strong>Require multifactor authentication</strong> lets a user self-remediate a medium/high <strong>sign-in</strong> risk — completing MFA closes the risk automatically. Prereq: the user is already registered for MFA.' },
    'pwd':       { cls:'warn', msg:'⚠ <strong>Require password change</strong> is the self-remediation for a <strong>user</strong> risk policy, not sign-in risk. For sign-in risk, use Require MFA.' },
    'compliant': { cls:'warn', msg:'⚠ <strong>Require device to be marked compliant</strong> enforces device state but does not let users self-remediate — an unenrolled user is simply blocked.' },
    'block':     { cls:'warn', msg:'⚠ <strong>Block access</strong> stops the risky sign-in but is not self-remediation; the user cannot regain access on their own.' },
  };
  const fb = FEEDBACK[grant] || FEEDBACK[''];

  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Entra › Protection › <strong>Conditional Access</strong></div>
        <h1>Conditional Access | Policies</h1>
        <div class="page-subtitle">Create a sign-in risk-based policy that allows self-remediation.</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="newCaPolicy()">+ New policy</button>
      </div>
    </div>

    <div class="automation-layout">
      <section class="card">
        <div class="card-toolbar"><strong>Policies</strong><span class="muted">${allPolicies.length} policies · click a row to open it</span></div>
        <table class="grid">
          <thead><tr><th>Policy name</th><th>Assignment</th><th>Conditions</th><th>Grant</th><th>State</th></tr></thead>
          <tbody>
            ${ENTRA_CA_POLICIES.map((p, i) => `<tr class="${selectedPtr === 'seed:' + i ? 'active-row' : ''}" style="cursor:pointer;" onclick="selectCaPolicy('seed', ${i})">
              <td>${esc(p.name)}</td><td>${esc(p.assignment)}</td><td>${esc(p.conditions)}</td><td>${esc(p.grant)}</td>
              <td><span class="status-dot ${p.state === 'On' ? 'resolved' : 'warn'}"></span>${esc(p.state)}</td>
            </tr>`).join('')}
            ${createdPolicies.map((p, i) => `<tr class="${selectedPtr === 'created:' + i ? 'active-row' : ''}" style="cursor:pointer;" onclick="selectCaPolicy('created', ${i})">
              <td>${esc(p.name)}</td><td>${esc(p.assignment)}</td><td>${esc(p.conditions)}</td><td>${esc(p.grant)}</td>
              <td><span class="status-dot ${p.state === 'On' ? 'resolved' : 'warn'}"></span>${esc(p.state)} <button class="chip-link" onclick="event.stopPropagation(); deleteCaPolicy(${i})">Delete</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
        ${createdPolicies.length ? `<div style="margin-top:10px;"><button class="btn btn-secondary" onclick="resetCaPolicies()">Clear created policies (${createdPolicies.length})</button></div>` : ''}
      </section>

      <section class="card automation-blade">
        <div class="blade-mini-header">
          <div>
            <div class="breadcrumb">${isEditing ? 'Edit Conditional Access policy' : 'New Conditional Access policy'}</div>
            <h2>${isEditing ? esc(nameValue) : 'Sign-in risk self-remediation'}</h2>
          </div>
          ${isEditing ? `<button class="iconbtn" title="Close / new policy" onclick="newCaPolicy()">×</button>` : ''}
        </div>

        ${isSeedSel ? `<div class="callout info" style="margin-bottom:10px;">Built-in lab policy — read-only. Edit the fields and choose <strong>Duplicate as new</strong> to save a copy.</div>` : ''}

        <div class="wizard-section">
          <label class="lbl">Policy name<input id="caName" class="ipt" value="${esc(nameValue)}" oninput="setCaName(this.value)"></label>
        </div>

        <div class="wizard-section">
          <div class="dropdown-label">Assignments</div>
          <div class="muted">Users: <strong>All users</strong> · Exclude: <strong>Break-glass accounts</strong> · Target resources: <strong>All cloud apps</strong></div>
        </div>

        <div class="wizard-section">
          <div class="dropdown-label">Conditions › Sign-in risk</div>
          <div style="display:flex; gap:14px; flex-wrap:wrap;">
            ${RISK_CHOICES.map(r => `<label class="lbl" style="flex-direction:row; align-items:center; gap:6px;">
              <input type="checkbox" onchange="toggleCaRisk('${r}')" ${riskLevels.includes(r) ? 'checked' : ''}> ${r}
            </label>`).join('')}
          </div>
        </div>

        <div class="wizard-section">
          <div class="dropdown-label">Access controls › Grant</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${ENTRA_CA_GRANTS.map(g => `<label class="lbl" style="flex-direction:row; align-items:center; gap:8px;">
              <input type="radio" name="caGrant" onchange="selectCaGrant('${g.id}')" ${grant === g.id ? 'checked' : ''}> ${esc(g.label)}
            </label>`).join('')}
          </div>
        </div>

        <div class="callout ${fb.cls}" style="margin-top:6px;">${fb.msg}</div>

        <div class="wizard-section form-grid two">
          <label class="lbl">Enable policy<select id="caState" class="ipt" onchange="selectCaState(this.value)">
            ${['On', 'Report-only', 'Off'].map(s => `<option ${s === stateSel ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        </div>

        <div class="blade-actions" style="display:flex; gap:8px; margin-top:8px;">
          ${selectedPtr.startsWith('created:')
            ? `<button class="btn btn-primary" onclick="saveCaPolicy()">Save changes</button>
               <button class="btn btn-secondary" onclick="createCaPolicy()">Save as new</button>`
            : isSeedSel
              ? `<button class="btn btn-primary" onclick="createCaPolicy()">Duplicate as new</button>`
              : `<button class="btn btn-primary" onclick="createCaPolicy()">Create</button>`}
          ${isEditing ? `<button class="btn btn-secondary" onclick="newCaPolicy()">New policy</button>` : ''}
        </div>
      </section>
    </div>
  `;
};

// ===================== 365 admin center =====================
// The workload follows the Dashboard view information architecture described
// by Product documentation. It is a supporting tenant-administration surface; all
// actions and telemetry remain fictional and local to this lab.
function m365AdminHeader(title, subtitle, actions = '') {
  return `
    <div class="page-header">
      <div>
        <div class="breadcrumb">365 admin center › <strong>${esc(title)}</strong></div>
        <h1>${esc(title)}</h1>
        <div class="page-subtitle">${subtitle}</div>
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;
}

function m365ServiceTag(status) {
  return status === 'Healthy'
    ? '<span class="tag green">Healthy</span>'
    : '<span class="tag orange">Advisory</span>';
}

VIEWS['m365-admin/home'] = () => {
  const users = ENTRA_USERS.filter(u => u.userType !== 'Service principal');
  const licensed = users.filter(u => u.licenses.some(l => l.startsWith('365')));
  const assigned = M365_LICENSE_PRODUCTS.reduce((sum, p) => sum + p.assigned, 0);
  const purchased = M365_LICENSE_PRODUCTS.reduce((sum, p) => sum + p.purchased, 0);
  const advisories = M365_SERVICE_HEALTH.filter(s => s.status !== 'Healthy');
  return `
    ${m365AdminHeader('Home', `Dashboard view for <strong>${esc(M365_ADMIN_TENANT.name)}</strong> · ${esc(M365_ADMIN_TENANT.domain)}`,
      '<button class="btn btn-secondary" onclick="toast(\'Cards can be rearranged in the real admin center; this lab keeps a fixed study layout.\')">＋ Add card</button>')}

    <div class="callout info" style="margin-bottom:16px;">
      <strong>Product documentation alignment:</strong> this is the common 365 administration entry point. Use the left navigation for users, licenses, reports, health, setup, and links to specialist admin centers. The lab models Dashboard view, which exposes the more detailed task set.
    </div>

    <div class="kpi-strip">
      <div class="kpi"><span class="kpi-label">Active users</span><span class="kpi-value">${users.filter(u => u.enabled).length}</span><span class="kpi-delta">${licensed.length} licensed · ${users.filter(u => u.userType === 'Guest').length} guest</span></div>
      <div class="kpi"><span class="kpi-label">License assignments</span><span class="kpi-value">${assigned}</span><span class="kpi-delta">${purchased - assigned} available across products</span></div>
      <div class="kpi"><span class="kpi-label">Service health</span><span class="kpi-value">${advisories.length}</span><span class="kpi-delta ${advisories.length ? 'bad' : ''}">${advisories.length ? 'active advisory' : 'no active issues'}</span></div>
      <div class="kpi"><span class="kpi-label">Message center</span><span class="kpi-value">${M365_MESSAGE_CENTER.length}</span><span class="kpi-delta">${M365_MESSAGE_CENTER.filter(m => m.impact === 'Action required').length} action required</span></div>
    </div>

    <div class="section-title">Common tasks</div>
    <div class="tile-grid" style="margin-bottom:16px;">
      <button class="tile" onclick="navigate('#/m365-admin/users')"><span class="tile-title"><span class="tile-icon">👥</span>Manage users</span><span class="tile-sub">Add or review users, reset passwords, and inspect assigned products.</span><strong>Users › Active users</strong></button>
      <button class="tile" onclick="navigate('#/m365-admin/licenses')"><span class="tile-title"><span class="tile-icon">🪪</span>Manage licenses</span><span class="tile-sub">Review product capacity and which assignments are direct or group based.</span><strong>Billing › Licenses</strong></button>
      <button class="tile" onclick="navigate('#/m365-admin/service-health')"><span class="tile-title"><span class="tile-icon">💚</span>Check service health</span><span class="tile-sub">Review active incidents and advisories affecting 365 services.</span><strong>Health › Service health</strong></button>
      <button class="tile" onclick="navigate('#/m365-admin/usage')"><span class="tile-title"><span class="tile-icon">📊</span>Review usage</span><span class="tile-sub">Compare enabled and active users across 365 products.</span><strong>Reports › Usage</strong></button>
    </div>

    <div class="two-col">
      <section class="card">
        <div class="card-toolbar"><strong>Service health</strong><button class="chip-link" onclick="navigate('#/m365-admin/service-health')">View all</button></div>
        <table class="grid compact-grid"><tbody>${M365_SERVICE_HEALTH.slice(0,4).map(s => `<tr onclick="navigate('#/m365-admin/service-health')"><td><strong>${esc(s.service)}</strong><div class="muted">${esc(s.detail)}</div></td><td>${m365ServiceTag(s.status)}</td></tr>`).join('')}</tbody></table>
      </section>
      <section class="card">
        <div class="card-toolbar"><strong>Message center</strong><button class="chip-link" onclick="navigate('#/m365-admin/message-center')">View all</button></div>
        <table class="grid compact-grid"><tbody>${M365_MESSAGE_CENTER.map(m => `<tr onclick="openM365Message('${esc(m.id)}')"><td><strong>${esc(m.title)}</strong><div class="muted">${esc(m.service)} · ${esc(m.id)}</div></td><td><span class="tag ${m.impact === 'Action required' ? 'orange' : 'blue'}">${esc(m.impact)}</span></td></tr>`).join('')}</tbody></table>
      </section>
    </div>`;
};

const M365_USER_FILTERS = [
  { key:'all', label:'All users', test:() => true },
  { key:'licensed', label:'Licensed users', test:u => u.licenses.some(l => l.startsWith('365')) },
  { key:'unlicensed', label:'Unlicensed users', test:u => !u.licenses.some(l => l.startsWith('365')) },
  { key:'admins', label:'Admins', test:u => u.roles.length > 0 },
  { key:'guests', label:'Guest users', test:u => u.userType === 'Guest' },
];
function currentM365UserFilter() {
  const key = sessionStorage.getItem('defender-lab.m365.users.filter') || 'all';
  return M365_USER_FILTERS.some(f => f.key === key) ? key : 'all';
}
function setM365UserFilter(key) {
  sessionStorage.setItem('defender-lab.m365.users.filter', key);
  render();
}
function currentM365UserSearch() {
  return sessionStorage.getItem('defender-lab.m365.users.search') || '';
}
function setM365UserSearch(value) {
  sessionStorage.setItem('defender-lab.m365.users.search', value);
  render();
}
function m365AdminUserRows() {
  const filter = M365_USER_FILTERS.find(f => f.key === currentM365UserFilter());
  const query = currentM365UserSearch().trim().toLowerCase();
  return ENTRA_USERS
    .filter(u => u.userType !== 'Service principal')
    .filter(filter.test)
    .filter(u => !query || [u.displayName, u.upn, u.department, u.jobTitle].some(v => String(v).toLowerCase().includes(query)));
}

VIEWS['m365-admin/users'] = () => {
  const rows = m365AdminUserRows();
  const filter = currentM365UserFilter();
  const search = currentM365UserSearch();
  const allUsers = ENTRA_USERS.filter(u => u.userType !== 'Service principal');
  return `
    ${m365AdminHeader('Active users', 'Create and manage people who can access 365 apps and services.',
      '<button class="btn btn-secondary" onclick="toast(\'CSV user export prepared from fictional lab rows.\')">⬇ Export users</button><button class="btn btn-primary" onclick="toast(\'Lab-only flow: add identity details, assign a product license, choose optional roles, then review.\')">＋ Add a user</button>')}
    <div class="callout info" style="margin-bottom:14px;">Product documentation path: <strong>Users › Active users</strong>. Select a user to review its shared Entra/Defender identity details. Product licenses can be managed here per user or from <button class="chip-link" onclick="navigate('#/m365-admin/licenses')">Billing › Licenses</button>.</div>
    <div class="tabs">${M365_USER_FILTERS.map(f => `<button class="tab ${f.key === filter ? 'active' : ''}" onclick="setM365UserFilter('${f.key}')">${esc(f.label)}<span class="pill">${allUsers.filter(f.test).length}</span></button>`).join('')}</div>
    <div class="inventory-toolbar"><span class="muted">${rows.length} of ${allUsers.length} users</span><div class="inventory-toolbar-actions"><input class="input-sm" style="width:280px" type="search" placeholder="Search users" value="${esc(search)}" onchange="setM365UserSearch(this.value)">${search ? '<button class="chip active" onclick="setM365UserSearch(\'\')">Clear search ✕</button>' : ''}</div></div>
    <div class="card table-scroll"><table class="grid"><thead><tr><th>Display name</th><th>Username</th><th>Licenses</th><th>Admin roles</th><th>Sign-in status</th><th>User type</th><th>Last sign-in</th></tr></thead><tbody>
      ${rows.length ? rows.map(u => `<tr onclick="openEntraUser('${esc(u.upn)}')"><td><strong>${esc(u.displayName)}</strong><div class="muted">${esc(u.jobTitle)} · ${esc(u.department)}</div></td><td>${esc(u.upn)}</td><td>${u.licenses.length ? u.licenses.map(l => `<span class="tag blue">${esc(l)}</span>`).join(' ') : '<span class="muted">Unlicensed</span>'}</td><td>${u.roles.length ? esc(u.roles.join(', ')) : '<span class="muted">—</span>'}</td><td><span class="tag ${u.enabled ? 'green' : 'red'}">${u.enabled ? 'Allowed' : 'Blocked'}</span></td><td>${esc(u.userType)}</td><td>${fmtTime(u.lastSignIn)}</td></tr>`).join('') : '<tr><td colspan="7" class="muted">No users match the current filter.</td></tr>'}
    </tbody></table></div>`;
};

VIEWS['m365-admin/licenses'] = () => `
  ${m365AdminHeader('Licenses', 'Review subscriptions, assignment capacity, and license errors.', '<button class="btn btn-primary" onclick="toast(\'Lab-only purchase flow opened. No subscription is changed.\')">Buy licenses</button>')}
  <div class="callout info" style="margin-bottom:14px;">Product documentation path: <strong>Billing › Licenses</strong>. Select a product to assign licenses by product; use <button class="chip-link" onclick="navigate('#/m365-admin/users')">Users › Active users</button> when managing one or more specific users.</div>
  <div class="card"><table class="grid"><thead><tr><th>Product</th><th>Status</th><th>Assigned</th><th>Available</th><th>Total purchased</th><th>Renewal</th><th></th></tr></thead><tbody>${M365_LICENSE_PRODUCTS.map(p => `<tr><td><strong>${esc(p.product)}</strong></td><td><span class="tag green">${esc(p.status)}</span></td><td>${p.assigned}</td><td>${p.purchased - p.assigned}</td><td>${p.purchased}</td><td>${esc(p.renewal)}</td><td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toast('Assignment panel opened for ${esc(p.product)}. Changes remain local to the lab.')">Assign licenses</button></td></tr>`).join('')}</tbody></table></div>
  <div class="callout success" style="margin-top:14px;"><strong>Least privilege:</strong> the real workflow requires at least the License Administrator or User Administrator role. Global Administrator should be reserved for tasks that cannot use a narrower role.</div>`;

VIEWS['m365-admin/usage'] = () => `
  ${m365AdminHeader('Usage', '365 product adoption for the fictional Hack Smarter Labs tenant.', '<button class="btn btn-secondary" onclick="toast(\'A fictional usage CSV would be exported.\')">⬇ Export</button>')}
  <div class="callout info" style="margin-bottom:14px;">Product documentation path: <strong>Reports › Usage</strong>. Real usage reports can cover 7, 30, 90, or 180 days and normally conceal user, group, and site names by default. This lab shows only aggregate fictional values.</div>
  <div class="card"><div class="card-toolbar"><strong>Active users by product</strong><span class="muted">Last 30 days</span></div><table class="grid"><thead><tr><th>Product</th><th>Enabled users</th><th>Active users</th><th>Adoption</th><th>Activity</th></tr></thead><tbody>${M365_USAGE_REPORTS.map(r => { const pct = Math.round(r.active / r.enabled * 100); return `<tr><td><strong>${esc(r.product)}</strong></td><td>${r.enabled}</td><td>${r.active}</td><td>${pct}%</td><td style="min-width:220px"><div style="height:8px;background:var(--bg-selected);border-radius:4px"><div style="height:8px;width:${pct}%;background:var(--workload);border-radius:4px"></div></div></td></tr>`; }).join('')}</tbody></table></div>`;

VIEWS['m365-admin/service-health'] = () => `
  ${m365AdminHeader('Service health', 'Current health and active advisories for services used by Hack Smarter Labs.', '<button class="btn btn-secondary" onclick="toast(\'Fictional service-health snapshot refreshed.\')">↻ Refresh</button>')}
  <div class="callout info" style="margin-bottom:14px;">Product documentation path: <strong>Health › Service health</strong>. The Health area also provides health history; Message center is where admins track upcoming product changes.</div>
  <div class="card"><table class="grid"><thead><tr><th>Service</th><th>Status</th><th>Current detail</th><th>Last updated</th></tr></thead><tbody>${M365_SERVICE_HEALTH.map(s => `<tr><td><strong>${esc(s.service)}</strong></td><td>${m365ServiceTag(s.status)}</td><td>${esc(s.detail)}</td><td>${fmtTime(s.updated)}</td></tr>`).join('')}</tbody></table></div>
  <div class="two-col" style="margin-top:14px"><section class="card card-body"><div class="alert-section-title">Active issue</div><strong>SharePoint search indexing delay</strong><p class="muted">Classification: advisory. Search results can lag behind recent content changes; file access and collaboration remain available.</p><button class="btn btn-secondary btn-sm" onclick="toast('Notification preference saved locally for this fictional advisory.')">Notify me</button></section><section class="card card-body"><div class="alert-section-title">Operations note</div><p>Service incidents describe outages or degradation. Advisories describe a condition administrators should know about even when the service remains available.</p><button class="chip-link" onclick="navigate('#/m365-admin/message-center')">Open Message center →</button></section></div>`;

VIEWS['m365-admin/message-center'] = () => {
  const state = currentM365MessageCenterState();
  const tab = currentM365MessageCenterTab();
  const active = M365_MESSAGE_CENTER.filter(m => !state.archived[m.id]);
  const archived = M365_MESSAGE_CENTER.filter(m => state.archived[m.id]);
  const rows = tab === 'archive' ? archived : active;
  return `
  ${m365AdminHeader('Message center', 'Announcements that help administrators plan for 365 service changes.', '<button class="btn btn-secondary" onclick="toast(\'Choose-columns panel is represented by the current study-focused table.\')">Choose columns</button><button class="btn btn-secondary" onclick="toast(\'Message center preferences are simulated locally.\')">Preferences</button>')}
  <div class="callout info" style="margin-bottom:14px;"><strong>Select a post to open its reading pane.</strong> Opening marks it read. Use the pane to move between posts, favorite, mark unread, share, or archive, then review rollout, organizational impact, required actions, and compliance considerations.</div>
  <div class="tabs m365-message-tabs">
    <button class="tab ${tab === 'active' ? 'active' : ''}" onclick="setM365MessageCenterTab('active')">Active <span class="pill">${active.length}</span></button>
    <button class="tab ${tab === 'archive' ? 'active' : ''}" onclick="setM365MessageCenterTab('archive')">Archive <span class="pill">${archived.length}</span></button>
  </div>
  <div class="card table-scroll"><table class="grid m365-message-table"><thead><tr><th aria-label="Favorite"></th><th>Message title</th><th>Service</th><th>Tag</th><th>Last updated</th><th>Timing of change</th><th>Act by</th></tr></thead><tbody>
    ${rows.length ? rows.map(m => `<tr class="m365-message-row ${state.read[m.id] ? '' : 'unread'}" tabindex="0" onclick="openM365Message('${esc(m.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openM365Message('${esc(m.id)}')}">
      <td><button class="m365-favorite-button ${state.favorites[m.id] ? 'active' : ''}" onclick="event.stopPropagation();toggleM365MessageFavorite('${esc(m.id)}')" aria-label="${state.favorites[m.id] ? 'Remove from favorites' : 'Add to favorites'}">${state.favorites[m.id] ? '★' : '☆'}</button></td>
      <td><strong>${esc(m.title)}</strong><div class="muted">${state.read[m.id] ? '' : '<span class="m365-unread-dot"></span>Unread · '}${esc(m.id)} · ${esc(m.category)}</div></td>
      <td>${esc(m.service)}</td><td><span class="tag ${m.tag === 'Major update' ? 'orange' : 'blue'}">${esc(m.tag)}</span></td><td>${esc(m.updated)}</td><td>${esc(m.timing)}</td><td>${esc(m.due)}</td>
    </tr>`).join('') : `<tr><td colspan="7" class="muted">${tab === 'archive' ? 'No archived posts. Archive a post from its reading pane to place it here.' : 'No active posts.'}</td></tr>`}
  </tbody></table></div>`;
};

VIEWS['m365-admin/setup'] = () => `
  ${m365AdminHeader('Setup', 'Guided configuration tasks for domains, sign-in security, data protection, apps, and service readiness.')}
  <div class="callout info" style="margin-bottom:14px;">Product documentation places domains, multifactor authentication, admin access, mailbox migration, feature updates, and app installation guidance under <strong>Setup</strong>. This SC-200 lab links only the security-relevant exercises.</div>
  <div class="tile-grid">${M365_SETUP_TASKS.map(t => `<button class="tile" onclick="navigate('${t.route}')"><span class="tile-title"><span class="tile-icon">🧩</span>${esc(t.title)}</span><span class="tile-sub">${esc(t.category)}</span><span class="tag ${t.status === 'In progress' ? 'orange' : 'blue'}">${esc(t.status)}</span></button>`).join('')}</div>`;

VIEWS['m365-admin/admin-centers'] = () => `
  ${m365AdminHeader('Admin centers', 'Open specialist workspaces for deeper service-specific administration.')}
  <div class="callout info" style="margin-bottom:14px;">Product documentation describes 365 Admin as the common entry point. Specialist centers provide deeper controls and vary by subscription plan and region.</div>
  <div class="solution-grid sentinel-content-grid">
    <button class="solution-card" onclick="navigate('#/defender/home')"><strong>Security</strong><span>Defender XDR incidents, alerts, hunting, identities, endpoints, and email security.</span></button>
    <button class="solution-card" onclick="navigate('#/purview/home')"><strong>Compliance</strong><span>Purview data security, Audit, eDiscovery, and compliance workflows.</span></button>
    <button class="solution-card" onclick="navigate('#/entra/overview')"><strong>Entra</strong><span>Identity, roles, Conditional Access, risky users, and sign-in protection.</span></button>
    <button class="solution-card" onclick="toast('Exchange admin center is outside the SC-200 lab scope.')"><strong>Exchange</strong><span>Mail flow, recipients, calendars, and Exchange organization settings.</span></button>
    <button class="solution-card" onclick="toast('Teams admin center is outside the SC-200 lab scope.')"><strong>Teams</strong><span>Messaging, meetings, voice, teams, and organization-wide settings.</span></button>
    <button class="solution-card" onclick="toast('SharePoint admin center is outside the SC-200 lab scope.')"><strong>SharePoint</strong><span>Sites, sharing, OneDrive, migration, and content-service settings.</span></button>
  </div>`;
