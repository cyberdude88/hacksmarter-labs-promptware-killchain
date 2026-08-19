# Anomaly detection rules in Microsoft Sentinel

Reference notes for the lab's `#/sentinel/anomalies` page. Everything here is
real-product behavior, not lab invention. Source: Microsoft Learn —
*Work with anomaly detection analytics rules*
(https://learn.microsoft.com/en-us/azure/sentinel/work-with-anomaly-rules).

## Why there is no "+ Create anomaly rule" button

You **cannot author an anomaly rule from a blank form** the way you create a
Scheduled or NRT rule. Anomaly rules are **built-in machine-learning
templates** — the models ship with Sentinel. You customize an existing
template; you never write one from scratch. That's why the Analytics page has
a "+ Create" button for *scheduled/NRT/Fusion* rules but the Anomalies tab
does not.

## Where it lives in the real product

- **Azure portal:** Microsoft Sentinel → **Analytics** → **Anomalies** tab.
- **Defender portal:** Microsoft Sentinel → **Configuration** → **Analytics** →
  **Anomalies** tab.
- You can also see anomaly templates under the **Rule templates** tab filtered
  to Rule type = **Anomaly**.

## The customize flow (this is the "creation")

1. Open the **Anomalies** tab. Each row is a built-in anomaly rule, active in
   **Production** by default.
2. Select a rule. Its details open in the right-hand pane.
3. Click **Create duplicate**. This makes your **single customizable copy**.
4. The duplicate is created in **Flighting** mode. Edit its parameters
   (threshold, and any rule-specific settings) in the config pane.
5. Compare the Flighting copy's output against the original Production rule.
6. When satisfied, set the customized copy to **Production**. Sentinel then
   moves the built-in original to **Flighting** — only one version of the rule
   runs in Production at a time.

## Production vs Flighting

| Mode | What it does |
|------|--------------|
| **Production** | Results are written to the `Anomalies` table and can drive incidents, enrichment, and downstream analytics/Fusion logic. |
| **Flighting** | A test mode. The rule runs and produces results you can inspect, but side-by-side with the Production version so you can A/B compare a tuning change **without** affecting production results or incidents. |

The tuning loop: **duplicate → tune in Flighting → compare → promote to
Production.**

## The one-copy limit (the exam trap)

You may keep **only one customized copy of any given anomaly rule at a time.**

- A second **Create duplicate** on the same rule **fails** — regardless of
  whether the first copy is enabled or disabled.
- To test *different* threshold settings, **edit the existing customized
  copy**. You do not create a second duplicate to run configurations in
  parallel.

This is exactly what SC-200 question 27 tests: attempting a second duplicate
does not create a disabled copy, does not replace the first, and does not run
two copies — it simply **fails**.

## How the lab mimics this

On `#/sentinel/anomalies`:

- **Anomaly rule templates** card = the built-in rules. Each has a
  **Create duplicate** button (no blank create button anywhere — matching the
  real product).
- Creating a duplicate adds a row to the **Customized copies** table in
  **Flighting** mode with the template's threshold pre-filled.
- **Edit threshold** changes that single copy (the correct way to test new
  settings).
- **Promote to Production** flips the copy to Production.
- A second **Create duplicate** on an already-duplicated rule is **blocked**
  ("Customized copy exists") — enforcing the one-copy rule by behavior, not by
  a wall of text on the page.

State persists in `localStorage` under
`defender-lab.sentinel.anomaly.duplicates`; clear it to reset the exercise.
