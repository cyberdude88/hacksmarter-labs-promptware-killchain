# Reconnaissance Notebook Blocker — RESOLVED

Fixed in `src/components/killchain/tabs/KillChainTab.jsx`: the "Add to
Incident Report" button was gated on `!selectedAnswer`, but stages with no
`STAGE_QUESTIONS` entry (Reconnaissance included) can never produce a
`selectedAnswer`, so the button stayed disabled forever even with evidence
filed. The disable condition now only requires an answer when the stage
actually has a question:
`assignedEvidence.length === 0 || (question ? !selectedAnswer : false)`.

This mirrors the fix already present and deployed in the sibling
`~/promptware-kill-chain` repo (the one actually served on 127.0.0.1:8777),
which was unaffected by this bug.

Observed while working in the Kill Chain notebook on stage 3, Reconnaissance.

## Current state

- Stage: `Reconnaissance`
- Notebook status: `EVIDENCE FOUND`
- Filed evidence:
  - `EVID-005` Off-topic searches followed a procurement-only prompt.
  - `EVID-006` Directory lookup returned leadership data ARIA had never queried before.
- Stage question: none attached
- Analyst finding: no judgment question is attached to this stage
- Saved at: not saved yet

## Problem

The notebook says:

> Requires filed evidence and an answer. Adds this stage's answer to the incident report and completes Reconnaissance.

But the `Add to Incident Report` action is not clickable / does not advance the stage even after the evidence is filed.

## Expected behavior

- Once the required evidence is filed for Reconnaissance, the stage should allow the analyst to add the stage result to the incident report.
- The user should be able to proceed to the next stage after that action.

## Notes for follow-up

- This is the current blocker on Reconnaissance.
- The issue is not evidence collection itself; it is the transition from filed evidence to the incident report completion action.

