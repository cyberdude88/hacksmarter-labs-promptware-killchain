# Range 01 - Operation Quiet Cadence - Instructor Guide

Scenario: Nordhavn Chemical AS (fictional), EU chemical manufacturer
Threat model: MITRE ATT&CK Campaign C0062 - Anthropic AI-orchestrated Campaign (GTG-1002, Sep 2025)
Flags: 9, sequential
Runtime: 90-120 min solo, 3 hrs with debrief
Infrastructure: none. One HTML file, opens in any browser, works offline.

## Why this campaign

C0062 is the first AI-orchestrated intrusion with a formal ATT&CK campaign entry. Human operators broke the attack into discrete tasks and used crafted prompts and personas to get agents executing with minimal human involvement - roughly 80-90% of tactical operations, at request rates no human could produce. Chemical manufacturers were among the named target sectors, which is why Nordhavn is one.

Two things this buys you in a classroom:

- Defensibility. Every stage maps to a real technique ID. This is not a made-up scenario with vendor branding on it.
- The detection thesis. The campaign's defining tell - machine cadence, physically impossible rates, machine-written operational state - is what stage 1 and stage 7 teach. It is also the thing traditional triage baselines are worst at.

## The design principle

Nine flags, nine stages of a real kill chain. But the flag is never "find the IOC." The IOC is handed to the student in plain sight every single time.

The flag is the decision about the machine's determination.

AXIOM (the scripted triage agent in the range) produces a fluent, well-formatted, confidently-scored verdict at every stage. Five of the nine are wrong, and each is wrong in a different structural way. The student's job is the one that survives automation: deciding what to do with a plausible machine determination.

No LLM. No API key. No network. AXIOM's "thinking" is a scripted reveal and its determinations are fixed - which is honest, because most AI-assisted SOC work is not a chatbot. It is a verdict card with a confidence score and an action list, and a person deciding whether to click.

## Stage map and answer key

| # | Stage | ATT&CK | AXIOM verdict | Truth | Failure mode taught |
|---|---|---|---|---|---|
| 1 | Reconnaissance | T1595.001/.002 | BENIGN 88 | Wrong | Reasoning by historical analogy; ignored JA4 + cadence |
| 2 | Initial access | T1190, T1587.004 | MALICIOUS 94 | Right verdict | Destructive action, terminate before imaging |
| 3 | Internal discovery | T1046, T1590.004 | MALICIOUS 91 | Right, over-scoped | Fabricated citation to a host not in inventory |
| 4 | Credential access | T1552.001 | MALICIOUS 96 | Right, under-scoped | Scoped the file, not the identity; shared cert thumbprint |
| 5 | Persistence | T1136.001, T1087 | MALICIOUS 97 | Right verdict | No mission context - containment triggers an OT safety event |
| 6 | Lateral movement | T1078 | BENIGN 12, auto-closed | Wrong | Poisoned baseline - adversary trained the suppression rule |
| 7 | Collection/staging | T1119, T1074.001, T1683 | LOW 79 | Wrong | Type-and-hash classification, never read the content |
| 8 | Exfiltration | T1567 | MALICIOUS 93 | Right verdict | Response blast radius wider than the threat (300 users) |
| 9 | Report | - | ready to submit | Wrong | Self-reported metrics; unverified claims with legal weight |

Correct answers are embedded in the HTML and are revealed to students with reasoning after each commit. Retries are unpenalised by design - the range teaches verification, not first-guess accuracy.

## The three stages that matter most

- Stage 6 (poisoned baseline). The suppression rule was learned from a pattern the adversary established over 37 days with no change ticket. The agent was trained by the attacker to ignore the attack. This is the single highest-value idea in the range, and it is invisible unless the student reviews closed alerts. Do not let anyone skip it.
- Stage 5 (OT safety). Disabling the compromised identity halts reactor batch scheduling mid-exothermic-stage. This is where students learn that containment is not always a security decision.
- Stage 9 (signature). No technique ID, because the last failure mode is not technical.

## Running it

- Open `range-c0062-axiom.html`. That is the whole setup.
- Stages unlock sequentially. Students record flags as they go.
- Do not tell them any verdicts are wrong. The over-correction failure (students who learn "always distrust the AI") is as damaging as automation bias, which is why stages 2, 4, 8 and 9 require CONCUR or EXPAND rather than OVERRULE. Watch for students who overrule everything - they have learned a useless heuristic.
- Debrief screen appears after stage 9 with five discussion questions.

## CTFd / scoring platform

Flag strings are fixed and greppable:

```text
FLAG{C0062_S1_IMPOSSIBLE_CADENCE}      FLAG{C0062_S6_POISONED_BASELINE}
FLAG{C0062_S2_VERDICT_NOT_ACTION}      FLAG{C0062_S7_MACHINE_WRITTEN_NOTES}
FLAG{C0062_S3_UNSOURCED_CITATION}      FLAG{C0062_S8_SCOPED_CONTAINMENT}
FLAG{C0062_S4_SHARED_THUMBPRINT}       FLAG{C0062_S9_SIGNED_BY_A_HUMAN}
FLAG{C0062_S5_NO_MISSION_CONTEXT}
```

Suggested weighting if you score it externally: stages 1, 6, 7 at 150 (the reversals); stages 2, 5, 8 at 125 (verdict-vs-action); stages 3, 4 at 100; stage 9 at 200.

## Tweak points

- All content lives in the `STAGES` array at the top of the `<script>` block. Each stage object is self-contained: telemetry, thinking, agent, questions, flag, lesson. Editing one does not affect any other.
- Change the victim. Swap Nordhavn for a bank, a hospital, or a coalition network. Only stage 5's `ops-context.json` and stage 8's `business-context.json` carry sector-specific consequence - those are the two you must rewrite, and they are the two that make the range feel real.
- Coalition / multinational variant. Add a releasability dimension to stage 9: AXIOM's draft report cites evidence from a partner-nation feed the student is not cleared to include in a national CSIRT notification. Tests caveat handling, not just accuracy.
- Harder mode. Remove the why strings so no reasoning is revealed on a wrong commit. Students must self-correct from telemetry alone.
- Live-agent mode. Replace `paintVerdict()` with an Ollama call and let a local model generate the determination from the telemetry block. Warning: the model will sometimes get stage 1 and stage 7 right, which destroys those flags. Hand-authoring the wrong verdicts is a feature, not a limitation.
- Add a stage 0. Pure control: an alert AXIOM correctly closes as benign. Students who overrule it lose points. Worth adding if you find over-correction in your first cohort.

Telemetry markup: `<w>` highlights a field in red, `<k>` in blue, `<d>` dims it. Use `<w>` only on the fields that actually carry the decision - over-highlighting hands away the flag.

## Debrief - what to drive home

The range makes one argument across nine stages: the value of an entry-level analyst has moved from producing determinations to adjudicating them. AXIOM did competent work at every stage. It was fluent everywhere and accountable nowhere.

Ask the closing question plainly. If automated triage runs at roughly a quarter per alert and a human costs meaningfully more, which of these nine stages justified the human? The honest answer is stages 5, 6, 8 and 9 - mission context, adversarial reasoning about the tooling itself, response scoping, and signature. That is not the old Tier 1 job description. It is a fair description of the new one, and it is worth telling students that directly.

