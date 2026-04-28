// Detection rule engine.
// A rule has multiple conditions joined by AND or OR.
// Rule shape: { id, name, conditions: [{ field, op, value }], join: 'AND' | 'OR' }
// Returns firings: [{ ruleId, ruleName, eventId }]
const MAX_REGEX_LENGTH = 120;
const SAFE_REGEX_CACHE = new Map();

export function evaluateRules(rules, events) {
  const firings = [];
  for (const rule of rules) {
    for (const evt of events) {
      if (matchesRule(rule, evt)) {
        firings.push({ ruleId: rule.id, ruleName: rule.name, eventId: evt.id });
      }
    }
  }
  return firings;
}

function matchesRule(rule, evt) {
  const conds = rule.conditions || [];
  if (conds.length === 0) return false;
  const fn = rule.join === 'OR' ? 'some' : 'every';
  return conds[fn]((c) => evalCond(c, evt));
}

function evalCond(c, evt) {
  // Look up the field both at the top level and (legacy) in nested kv.
  const raw = evt[c.field] ?? evt.kv?.[c.field];
  if (raw === undefined || raw === null) return false;
  const v = String(raw).trim();
  const needle = String(c.value ?? '').trim();
  switch (c.op) {
    case 'eq':       return v.toLowerCase() === needle.toLowerCase();
    case 'neq':      return v.toLowerCase() !== needle.toLowerCase();
    case 'contains': return v.toLowerCase().includes(needle.toLowerCase());
    case 'regex':
      return testSafeRegex(needle, v);
    case 'gt':       return Number(v) > Number(needle);
    case 'lt':       return Number(v) < Number(needle);
    default:         return false;
  }
}

function testSafeRegex(pattern, value) {
  if (!isSafeRegexPattern(pattern)) return false;

  let compiled = SAFE_REGEX_CACHE.get(pattern);
  if (!compiled) {
    try {
      compiled = new RegExp(pattern, 'i');
      SAFE_REGEX_CACHE.set(pattern, compiled);
    } catch {
      return false;
    }
  }
  return compiled.test(value);
}

function isSafeRegexPattern(pattern) {
  if (!pattern || pattern.length > MAX_REGEX_LENGTH) return false;

  // Fail closed on regex features that are high-risk for catastrophic
  // backtracking or unexpectedly expensive matching in the browser.
  const forbidden = [
    /\\\d/,                  // backreferences
    /\(\?([=!]|<[=!])/,      // lookahead / lookbehind
    /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*{?]/, // nested quantified groups
    /(^|[^\\])\{(\d{3,}|,\d{3,}|\d+,\d{3,})\}/, // very large counted repeats
  ];

  return forbidden.every((rx) => !rx.test(pattern));
}
