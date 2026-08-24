# HackSmarter SOC — QA Tuning Handoff

Snapshot for the next agent. As of 2026-06-04.

## Goal
QA team-lead review pass on the SOC Analyst lab. Current focus is final OVA
validation after tightening completion-gate behavior.

## Current live VM (UAT)
- Boot via `appliance/aws/test-local.sh` (already installed/running at handoff time).
- QEMU PID is in `appliance/aws/build/qemu.pid`. Display `:1` with `-display gtk`.
- HTTP forward: **http://127.0.0.1:18080/** (chose 18080 because Chrome had a stale
  Keycloak/OpenRMF service-worker on 127.0.0.1:8080 hijacking the URL).
- SSH: `ssh -i appliance/aws/build/id_test -p 2223 ubuntu@127.0.0.1`
- Console creds: `ubuntu` / `hacksmarter`

## Hot-deploy loop (do NOT rebuild the OVA between tweaks)
```
cd /home/alex/hacksmarterSOC && npm run build && \
cd appliance/aws && ./build-bundle.sh && \
scp -i build/id_test -P 2223 -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null build/soc-bundle.tar.gz \
    ubuntu@127.0.0.1:/tmp/soc-bundle.tar.gz && \
ssh  -i build/id_test -p 2223 -o StrictHostKeyChecking=no \
     -o UserKnownHostsFile=/dev/null ubuntu@127.0.0.1 \
     'sudo tar -xzf /tmp/soc-bundle.tar.gz -C /opt/soc-install && sudo /opt/soc-install/install-soc.sh'
```
About 8s total. User reloads tab + clicks **↻ reset session** in sidebar.

## QA changes applied in this session

### Wording — SOC Analyst (not Detection Engineer)
- `WALKTHROUGH.txt` — title + overview rewritten as "SOC Analyst Lab".
- `src/pages/ReportPage.jsx` — completion modal reads "SOC Analyst Lab
  Successfully Completed" / "SOC Analyst Track".
- `src/pages/AlertsPage.jsx` — legend "back to detection engineering" →
  "back to the detection team".
- `public/scenarios/fortigate_ai_attack.json` — added `"role": "SOC Analyst"`
  and rewrote `summary` as analyst POV.
- `src/state/SocContext.jsx` — only internal comment that said "Detection
  engineering" was scrubbed.

### Pass flag
- Real completion flag: `HSM{08c9232e8135}`.
- The real flag is reconstructed in `ReportPage.jsx` only after a passing,
  complete workflow report.
- `ReportPage.jsx` completion modal renders a flag block with copy-to-clipboard
  + "Submit at hacksmarter.org" instructions.
- CSS in `styles.css` (`.completion-flag*`).
- Anti-scrape coaching: scenario JSON `flag` now returns
  "Great job offensively, but you won't learn security analysis that way."
  for direct scrapers. This is obfuscation only, not cryptographic security.

### Completion gate / scoring
- Submitting the final report without completing the lab workflow now shows a
  **Lab Not Completed** / **Flag Locked** modal instead of the flag.
- Flag unlock requires:
  - Passing report score.
  - Detection Builder rule created.
  - Replay Attack run successfully with detections.
  - Confirmed incident alerts triaged/escalated correctly.
- IOC identification is **optional**. Extra IOC matches still award small bonus
  points, but missing IOC follow-up does not block the flag.
- Incomplete modal hint now says to complete the workflow steps and notes that
  Investigation supports report answers and optional IOC bonus points.

### Pacing (CURRENT TARGET)
- Attack chain: all authored attack events complete by timer **00:60**.
  The t+0 AUTH_FAIL is telemetry-only. First visible incident alert is at
  timer 00:10 (LOW repeated auth fail), then t+20 (MEDIUM brute force),
  t+30 (HIGH login), t+52 (CRIT exfil), t+60 (CRIT persist).
- Scheduled benign/noise alerts complete by t+58.
- `TICK` 1s (game clock = real time).
- `STREAM_TICK` 1s polling (immediate dispatch on scenario load too).
- `BENIGN_TICK` self-rescheduling setTimeout, 5–10s varied, capped at 60s.
- Random benign noise alerts every 10–25s, capped at 60s.
- `STORAGE_KEY` bumped to `hsoc:state:v4` so browsers do not keep a slow
  pre-tuning session after refresh.

### Pre-seeded queues (visible at landing)
- `benignAlertPreSeed` (19 entries) — all status=TRIAGED or ESCALATED,
  assignedTo varied teammates (tier1-bob, tier1-sarah, tier1-priya, tier2-mike,
  tier2-amir, swing-shift-jin). NEW status reserved for live emissions.
- `telemetryPreSeed` (52 hand-authored) + **500 programmatically generated**
  bulk events from the benign pool, ages 70s–8h. Pool of ~552 historical
  evidence-log entries for analyst to search through.

### Benign pools
- `benignAlertPool` — **104 entries**, 48 distinct src_ips, internal subnets
  (10.20.x, 10.30.x, 172.16.x, 192.168.x), external (M365/OneDrive/Teams/
  GitHub/Cloudflare/AWS/Slack edges), DNS resolvers. Includes 10 entries
  flagged as `[INC-44xx]` other-incident framing (phishing, DMZ latency,
  helpdesk slow VPN, PUA, etc.) so the queue looks like several concurrent
  investigations.
- `benignPool` (telemetry events for evidence log) — 30 entries.

### Visual emphasis on real threats
- `.alert-row.is-priority` (reddish tint + 5px left border + bright rule_name)
  applied when `expectedVerdict in ['true_positive', 'escalate']`.
- `.alert-row.is-benign` dimmed to 78% opacity (full opacity on hover/select).

### Alerts page default filter
- Default landing filter is **"All"** (was "Unassigned") so analyst sees the
  19 historical resolved + live new alerts.

### Risk meter
- **Filtered to non-benign alerts only** so benign noise never moves the meter.
- Re-added natural movement via:
  - `progress * 50` (chain advancement)
  - `chainDrift` 0.35/sec while chain active, cap 18
  - `backlogPressure` from real untriaged × elapsed chain time, cap 15
- Old formula coefficients tuned up: untriaged 5→8, kept resolved/correctTriages
  the same.

### Timestamps
- Switched from `toISOString()` (UTC) to `toLocaleTimeString('en-GB', {hour12:false})`
  so wall-clock matches the analyst's device clock. Pre-seeded uses the same
  helper backdated via `ageSec`.

### Walkthrough
- Stripped specific t+N timestamps from kill chain (depended on tuning).
  Now describes phases by **what to look for**.

## Fixed in follow-up — immediate first event now fires on reset

User reported: after clicking ↻ reset session, the first 185.220.101.42
event does NOT appear immediately. It takes ~1 minute (when the LOW
alert at t+60 fires).

Root cause was: the immediate-dispatch I added was inside
`useEffect(() => { ... }, [state.scenario])`. On RESET the
`state.scenario` reference doesn't change (we reuse the loaded scenario),
so the effect doesn't re-run. Only the first scenario load triggers
the immediate fire.

Fix applied: `src/state/SocContext.jsx` now includes `state.startedAt` in
the dependency arrays for both the immediate `STREAM_TICK` effect and the
self-rescheduling `BENIGN_TICK` effect. `RESET` sets a new `Date.now()`, so
both effects restart cleanly after reset. Rebuilt and hot-deployed to UAT.

Follow-up pacing fix: `public/scenarios/fortigate_ai_attack.json` now keeps
the t+0 AUTH_FAIL as telemetry-only and schedules the first visible incident
alert for timer 00:10. All authored/simulated lab activity is capped inside
the first minute. Rebuilt, installed into a fresh VM disk, repackaged, and
boot-tested from the OVA-derived disk.

## Outstanding QA items (not yet implemented)
1. **Richer STATUS values** — user floated adding IN_PROGRESS, ON_HOLD,
   CLOSED_TP, CLOSED_FP, REOPENED. Not done yet; current four are NEW /
   ASSIGNED / TRIAGED / ESCALATED.

## QA items completed in follow-up
- **Process Gaps / completion gate on report submit** —
  `src/pages/ReportPage.jsx` now derives workflow review notes and blocks flag
  display until the required workflow is complete. Missing IOC enrichment is no
  longer a review note or blocker.
- **Workflow-based score contribution** — `src/state/SocContext.jsx` now awards
  points for Detection Builder, Replay Attack, and incident triage completion.
  IOC enrichment remains an optional bonus.
- **OVA repackaging** — rebuilt after the IOC-optional gate change via
  `cd appliance/aws && FORCE_REBUILD=1 OUT_NAME=hacksmarter-soc-qa ./make-ova.sh`.
  Manifest hashes validate. OVA SHA256:
  `ef96eccc27dac6b0f318ceab1eb8fcade34023809319c5429fdeff73df9c04d5`.
- **Mounted QA test image** — converted the rebuilt packaged VMDK to
  `appliance/aws/build/hacksmarter-soc-qa-boot-test.qcow2` and booted locally.
  Test URL: `http://127.0.0.1:18080/`. PID file:
  `appliance/aws/build/qemu-qa-test.pid`.
- **Fresh OVA live check** — served bundle is `assets/index-BNYyy5jj.js`; the
  stale mandatory-IOC phrases `"No IOCs were flagged from the evidence log"`
  and `"investigate and flag an IOC"` are absent from the served bundle.

## Files touched this session
- `public/scenarios/fortigate_ai_attack.json` (most changes)
- `src/state/SocContext.jsx` (reducer + provider timing)
- `src/pages/AlertsPage.jsx` (filter default + cadence label + priority class)
- `src/pages/ReportPage.jsx` (completion modal + flag)
- `src/styles.css` (flag block + priority/benign row styling)
- `WALKTHROUGH.txt` (re-framed, timestamps stripped)

## User preferences (carried forward, from auto-memory)
- Terse responses, no trailing summaries.
- Confirmed: deploy via hot-bundle scp is preferred over OVA rebuild during
  iteration. Save make-ova.sh for sign-off.
