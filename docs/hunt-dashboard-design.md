# Hunt Dashboard Design — Threat-Hunting Interface for Promptware Kill Chain

## Design Question

The Promptware Kill Chain lab teaches one core lesson: **the IOC is always visible; the flag is the analyst's decision about a confident machine determination.** A Hunt tab (or panel within Containment/Investigation) needs a query-driven log-search and anomaly-detection interface. The question is what role an "AI-assisted" copilot plays in that interface without either (a) becoming a trivial gimmick or (b) undoing the calibration lesson by letting the AI do the analysis unquestioned.

This design is deferred because the right shape—how much of the "AI" is scripted vs. dynamic, whether it flags or decides, how much work the student must do to verify its suggestions—is genuinely open. This document proposes three concrete directions to evaluate.

---

## Direction A: Natural-Language Query Compiler (Small-Medium, Medium Risk)

**What the student sees:**
- A query builder UI split in two panels:
  - Left: a natural-language input box ("Show me ARIA's access to Finance" or "Email events in the last 2 hours")
  - Right: a structured rule preview showing the compiled conditions (fields, operators, values) with a **Refine** button to hand-edit the conditions before running
- An **AI Suggested Fields** section below the NL box that highlights extracted entities (user names, timestamps, repo names) the AI detected in the input
- Run button executes the compiled rule via `evaluateRules()` against telemetry

**How it uses ruleEngine:**
The NL input is compiled into a rule shape `{ id, name, conditions: [{field, op, value}], join: 'AND' }`. The rule executes via the existing `evaluateRules(rules, events)` primitive. Conditions are parsed from the NL input—"ARIA's access to Finance" might compile to `[{field: 'agent', op: 'eq', value: 'ARIA'}, {field: 'repository', op: 'eq', value: 'Finance'}]` with join='AND'.

**Pedagogical angle — serves the lesson:**
The student must *see and verify the compilation*. A student who doesn't read the structured rule and just runs blind NL queries has missed the point. The UI should emphasize the rule preview: use a different background color, position it prominently, and (optional) add a small warning icon if the AI had to guess a field name or operator. This teaches: **the AI does the translation; you do the validation.** A student who runs the same query 3 times and notices the rule changed each time has learned something about AI reliability.

**Implementation size:** Medium. Needs:
- An NL-to-rule compiler (could be simple heuristic-based pattern matching, not an LLM; e.g., regex for "user = X", "timestamp between Y and Z", field extraction by name matching against known telemetry fields)
- A structured rule renderer (already possible with the existing rules UI shape)
- History / saved queries (optional but valuable for showing "the AI suggested this last time, now it suggests that")

**Risk:** If the compiler is too naive, students dismiss it as useless. If too sophisticated (via an LLM call), it violates the no-external-network constraint and can sometimes be *right* (which destroys flags, per INSTRUCTOR_GUIDE precedent). A lightweight regex + heuristic approach works if the example queries are simple enough to parse reliably.

---

## Direction B: Copilot Side-Panel with Suggested Queries (Medium, Low Risk)

**What the student sees:**
- Main hunt interface: a traditional condition-builder (field + operator + value rows, add/remove buttons, AND/OR toggle)
- Right sidebar (narrow, collapsible): "ARIA Hunting Hints" card containing:
  - **Common queries for this incident:** a list of 4–6 hand-authored canned queries ("Show events from svc-aria-prod", "Find all policy-modification events", "Finance repo writes in the last hour")
  - **Anomalies detected:** a small list (3–5) of pre-computed anomaly flags with confidence scores ("Unusual cross-department access: 73%", "Tool execution outside baseline: 61%")
  - An **Accept / Reject / Refine** button set for each suggestion
- Running any query (hand-built or suggested) executes via `evaluateRules()`

**How it uses ruleEngine:**
Suggested queries are pre-authored rule objects stored in the scenario data (same shape as the scenario's existing detection rules). The anomaly flags are pre-computed metrics (see below) that, when "Accepted," convert to rule conditions automatically (e.g., "unusual cross-dept access" becomes a condition like `{field: 'departments', op: 'contains', value: 'FINANCE+LEGAL+AUDIT'}` or similar).

**Pedagogical angle — serves the lesson:**
Students see the AI's suggestions but must decide which to run and which to ignore. A student who accepts all suggestions without reading them gets the wrong answer (some suggestions point to false-positive avenues). A student who rejects all suggestions doesn't use the tool well either. The debrief can surface: *"You accepted 6 AI suggestions and rejected 4. Which rejections were smart, and which cost you time?"* This directly trains the calibration skill—not blind trust, not reflexive skepticism.

The "Confidence Score" on anomaly flags is key: a low-confidence flag (54%) is deliberately ambiguous, forcing the student to verify rather than decide based on AI certainty alone.

**Implementation size:** Medium. Needs:
- Canned query library (4–6 per incident, hand-authored, stored in scenario JSON)
- Baseline/anomaly metric computation (see **Data shape** below) and storage in scenario
- Copilot card UI with suggestion rendering, accept/reject state tracking
- Metric conversion to rule conditions (one-way: accept a metric → auto-build a rule condition)

**Risk:** Low. No external network calls, no LLM, all content hand-authored and deterministic. Metrics are static per scenario, precomputed offline.

---

## Direction C: Anomaly Verification Gauntlet (Medium-Large, Teaches Best Lesson)

**What the student sees:**
- **Investigation query builder** (as normal) in the main area for free-form hunting
- **AI Anomaly Feed** panel below showing a pre-filtered list of "anomalies" (unusual event clusters or metrics deviations) with:
  - Event summary ("10 write events to Finance repo in 2 minutes, baseline is 2/day")
  - Raw events displayed inline (scrollable table)
  - Three buttons: **Confirmed / Unsupported / Contradicted** (matching the terminology from the old range's claim-verification flow)
  - A confidence score (50–95%) displayed as a bar, not verbatim text (forces interpretation)
- The student must mark all anomalies before committing a containment decision (gates the next stage)
- At the end, a summary: *"You confirmed 5 anomalies, rejected 2 as false positives, and found 1 the AI missed. Anomaly triage accuracy: 71%."*

**How it uses ruleEngine:**
Each pre-computed anomaly is backed by a rule object that matches the anomalous events (e.g., `{field: 'repo', op: 'eq', value: 'Finance'}` + `{field: 'action', op: 'contains', value: 'write'}` with a time-window constraint). When the student clicks **Confirmed**, that rule is added to the analyst's confirmed-detections set. Confirmed rules feed into the Containment decision. Rejected anomalies are logged (for debrief metrics).

**Pedagogical angle — serves the lesson (strongest case):**
This direction most directly mirrors the core pedagogical structure of the range. Just as AXIOM produces verdicts the student must adjudicate, the AI produces anomaly suggestions the student must verify. The scoring emphasizes the meta-skill: *"Can you distinguish a real threat from a plausible false positive?"* This is exactly what makes entry-level analysts valuable—not finding threats, but *ruling out* false alarms.

A student who clicks **Confirmed** on every anomaly (high TPR, high FPR) learns blind trust is wrong. A student who rejects all anomalies learns reflexive distrust is equally wrong. The debrief callout: *"You confirmed everything the AI flagged. That's either excellent calibration or automation bias. How do you tell the difference?"*

**Implementation size:** Large. Needs:
- Baseline metric computation (Documents/request, Repositories/request, Tool calls/request, Cross-department access, External output, Executive access—already mentioned in SPEC SECTION 18)
- Anomaly detection logic (deviations from baseline, stored as pre-computed rules in scenario)
- Verification UI with 3-button decision set and inline event tables
- Scoring/debrief metrics (confirmation rate, false-positive rate, accuracy)
- Gate logic (cannot proceed to next stage without verifying all anomalies)

**Risk:** Moderate. The scope is larger (baseline computation, anomaly generation, gate logic), so more surface area for bugs. The gate logic means a student stuck on anomaly verification could feel blocked, so UX polish matters.

---

## Recommendation: Build Direction B (Copilot Hints) First

**Why B over A or C:**
- **Lower implementation risk:** No compiler (prone to parse errors), no gate logic (no player-blocking risk). Hand-authored suggestions are deterministic.
- **Teaches the lesson immediately:** A student who blindly accepts all AI hints and fails to verify gets the wrong answer. No other setup needed.
- **Scales to content authoring:** An instructor can rewrite the scenario, swap out the canned queries and metrics, and the UI still works. Scenario data is the lever, not code.
- **Directly testable:** Compare outcomes—students who accept all hints vs. selective verification—in the debrief metrics.
- **Foundation for C:** If Direction B is built, Direction C (the gauntlet) becomes a natural evolution: use the same anomaly metric shapes, add a gate, add scoring.

**Why not A:** The NL compiler is fun but adds cognitive friction (students read the compiled rule, don't understand how it got compiled, question whether it's correct). It's also fragile—a student writes "show ARIA's activity" and the compiler guesses wrong (looks for `agent = ARIA` when the field is actually `process_name`), and the student loses trust in the tool. In a lab about healthy skepticism, that's pedagogically *wrong*—we want the skepticism to come from adjudication, not from the tool being unreliable.

**Why not C first:** Larger scope, more dependencies on scenario authoring (baseline data), and the gate logic can create a bad player experience if the anomaly computation is off. Ship B first, validate the pedagogical effect, then scope C as a follow-on.

---

## Open Questions for the Next Session

1. **Baseline metric shape and source.** SPEC 18 names six metrics (Documents/request, Repositories/request, Tool calls/request, Cross-department access, External output, Executive access). How are these computed from telemetry? Do they live in scenario data, or computed on load? Should there be a separate `baselineMetrics` and `incidentMetrics` object in scenario JSON?

2. **Canned query authoring.** How many suggested queries per scenario? Should they be tiered (easy hunts for stage 1, harder hunts for stage 5)? Do they live directly in scenario.json, or in a separate content file?

3. **Confidence scores—how scripted.** Are confidence percentages hand-authored per anomaly (e.g., "ARIA's Finance access: 82% confidence"), or derived from some heuristic (e.g., deviation magnitude)? If hand-authored, instructors need a clear rubric.

4. **AI name / persona.** The old range used AXIOM (scripted agent). Should the copilot have a name? ("IRIS" for Investigation-Reasoning-Investigation-System?) Or stay generic ("ARIA's Threat Hunter")? Does it need flavor text / explanation in the sidebar?

5. **Hand-authored vs. scenario-computed.** For Direction B, should the anomaly suggestions be pre-computed offline (scenario.json includes `["Unusual cross-department access: 73%", ...]`), or computed on page load from telemetry+baseline? Pre-computed is simpler and more deterministic; computed is more flexible if the scenario evolves.

6. **No-LLM constraint.** Confirm: the "AI-assisted" framing must not imply runtime LLM calls. All suggestions, hints, and anomaly flags are hand-authored or computed via ruleEngine, never a live model. (This matches the range's design principle: "No LLM. No API key. No network. AXIOM's determinations are fixed.")

7. **Gate vs. soft nudge.** Direction B is a soft nudge (UI suggestion, students can ignore). Direction C gates the next stage. Which serves the pedagogy? Does a student need to demonstrate anomaly triage competence before moving to Containment, or is it just helpful tooling?

8. **Export / debrief visibility.** Should anomaly triage accuracy (confirmation rate, false-positive rate) appear in the final export and debrief alongside the other metrics (triage accuracy, overrule rate)? If so, that's the signal that this is a *graded* component, not just a helper.

---

## Data Shape (for Scenario JSON)

Whichever direction is built, the scenario will need something like:

```json
{
  "id": "promptware-kill-chain",
  "name": "Northstar Research Group — ARIA Compromise",
  
  "baselineMetrics": {
    "documentsPerRequest": 2.1,
    "repositoriesPerRequest": 1.3,
    "toolCallsPerRequest": 4,
    "crossDeptAccess": false,
    "externalOutput": false,
    "executiveAccess": false
  },
  
  "huntingSuggestions": [
    {
      "id": "hunt-aria-activity",
      "label": "Show me ARIA's activity",
      "description": "All events where the agent is svc-aria-prod",
      "rule": {
        "conditions": [{ "field": "agent", "op": "eq", "value": "svc-aria-prod" }],
        "join": "AND"
      }
    },
    {
      "id": "hunt-finance-writes",
      "label": "Finance repo modifications",
      "description": "Any write/delete/create in Finance repository",
      "rule": {
        "conditions": [
          { "field": "repository", "op": "eq", "value": "Finance" },
          { "field": "action", "op": "contains", "value": "write" }
        ],
        "join": "AND"
      }
    }
  ],
  
  "anomalies": [
    {
      "id": "anom-cross-dept",
      "label": "Unusual cross-department access",
      "description": "Accessing Finance from Legal system in 2 minutes",
      "confidence": 73,
      "rule": {
        "conditions": [
          { "field": "departments", "op": "contains", "value": "FINANCE" },
          { "field": "departments", "op": "contains", "value": "LEGAL" }
        ],
        "join": "AND"
      },
      "matchingEventIds": ["EVT-...", "EVT-..."]
    }
  ],
  
  "telemetryPreSeed": [...],
  "benignAlertPreSeed": [...]
}
```

---

## Summary

The Hunt dashboard is pedagogically rich territory—the tool investigating an AI compromise can itself demonstrate what healthy skepticism of AI assistance looks like. Direction B (Copilot Hints) is the recommended first build: low risk, immediate teaching value, and a foundation for Direction C (Anomaly Gauntlet) if the lab evolves to a heavier grading model.
