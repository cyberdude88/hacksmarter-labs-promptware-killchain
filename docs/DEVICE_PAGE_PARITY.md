# Defender for Endpoint device page — lab parity checklist

Source of truth: Microsoft Learn → *Investigate devices in Microsoft Defender for Endpoint*
(pasted into the design conversation 2026-06-29).

Project rule: **no porting of Microsoft CSS/JS** — look-alike from scratch only,
using the project's own Fluent-tokens in `ui/styles.css`
(SC200_LAB.md §1).

## Status legend
- [x] Implemented in the lab
- [~] Partial / stub
- [ ] Not implemented yet

## Device discovery (added 2026-07-16 — see HANDOFF.md)
- [x] Discovered/unmanaged devices in the inventory (`DISCOVERED_DEVICES`)
- [x] Inventory tabs: Endpoints / Network devices / IoT devices
- [x] Onboarding status: Onboarded / Can be onboarded / Unsupported / Insufficient info
- [x] Filter flyout (health, onboarding, antivirus, excluded, Windows 10 versions)
- [x] Choose columns (real picker) + Export (real CSV)
- [x] Dedicated page per discovered asset (`#/defender/discovered-device`)
- [x] Discovery settings (`#/defender/device-discovery`): mode, monitored networks,
      exclusions, authenticated scans, Enterprise IoT
- [x] Home "Discovered devices" card + "Devices discovered in the last 7 days"
- [ ] Discovered-device advanced hunting pivot (DeviceInfo `OnboardingStatus`) — not modeled

## Access paths to the device page
- [x] Device inventory (`#/defender/devices` → row click)
- [~] Alerts queue → device name link (incident/asset pivots open devices; alert-detail body link still not fully modeled)
- [ ] Incidents → incident graph → device node
- [ ] Global search (top-bar search input is decorative; needs entity router)
- [ ] File details → "Devices where file was observed"
- [ ] IP / domain details → "Devices that communicated"

## Header — response actions strip
Learn lists 12. Build has 5. Missing:
- [x] Isolate device (functional stub)
- [x] Restrict app execution
- [x] Run antivirus scan
- [x] Collect investigation package (opens static collection flow + contents)
- [x] Initiate Live Response Session (opens static lab console)
- [x] Initiate automated investigation
- [x] Consult a threat expert
- [x] Action center link
Built:
- [x] View in map
- [x] Device value
- [x] Set criticality
- [x] Manage tags
- [x] "⋯" overflow

## Header — badges / tags
- [x] Risk level pill
- [x] Criticality pill (we map to exposureLevel)
- [x] Health state pill
- [x] **Internet facing** tag on WKS-03 with hover text "This device received external incoming communication."

## Tabs (Learn order)
- [x] Overview
- [x] Incidents and alerts
- [x] Timeline
- [x] Security recommendations
- [x] **Configuration management → Effective settings**
- [x] Security policies (under our `policies` tab key)
- [x] Software inventory (under our `inventories` tab key — also includes browser extensions / certificates / hardware mini-cards as Learn implies)
- [x] Discovered vulnerabilities
- [x] Missing KBs
- [x] Security baselines (Learn doesn't list this as a separate tab — we have it; harmless extra)
- [x] Sentinel events (Learn doesn't show this in the screenshot list; useful bridge for the lab)

## Overview cards
Learn variants exist:
- **4-card variant** (Active alerts · Security assessments · Logged on users · Device health status) — **what we built**.
- **3-card variant** (Active alerts · Logged on users · Security assessments — *no Device health*). User-pasted snippet 2026-06-29.
- [ ] Add a CSS toggle (`.dev-overview-grid.is-3col`) so the page can render either variant — the 4-card is the modern shape per Learn body text, the 3-card matches older screenshots and some smaller-tenant views.

Card-by-card detail vs Learn:
- Active alerts: [x] risk-level pill · [x] active alert + incident counts · [x] severity bar · [x] legend · [x] **"X active alerts in Y incident(s)"** wording.
- Security assessments: [x] exposure pill · [x] recommendations count · [x] **installed software count** · [x] **discovered vulnerabilities count**.
- Logged on users: [x] count + primary user · [x] **Most frequent / Least frequent** rows · [ ] "See all users" pane that opens a flyout.
- Device health status: [x] table with state dots · [x] **header status message** ("Full scan status is unknown" etc., selected from the priority list in Learn).

## Timeline tab
Learn capabilities:
- [x] Search box
- [x] Filter / Time range / Export buttons (visual stubs)
- [x] Interleaved **technique markers** (blue T) and **event rows** (gray)
- [x] Technique side pane on click — title, ID, name, tactic, description, **Hunt for related events** button
- [x] Canonical wording: "the query returns the underlying events related to the technique, not the marker row itself"
- [x] **Flag column** + flag-events-only filter
- [x] **Process tree** in event side pane
- [x] **EDR client (MsSense.exe) Resource Manager** row on FIN-FS-02
- [ ] Custom-date-range picker (the button is decorative)
- [ ] "Customize columns" pop-out
- [ ] Filter pills showing currently-applied filters
- [ ] Bold-text styling on technique titles (we use bold but no left-side blue T icon column treatment beyond the circular badge)
- [ ] User-name → user-page navigation
- [x] "Copy command line" / "Copy SHA1" actions inside the event side pane

## Hunt for related events — KQL hand-off
- [x] Side pane button generates a query scoped to **DeviceId** + **AttackTechniques has "T####"** + **±30-minute time window** around the technique time
- [x] Query is loaded into the Advanced hunting editor via `sessionStorage`
- [x] Auto-run on arrival so the analyst sees rows immediately
- [x] Result set excludes the technique marker (we only seed `kind='event'` rows into `MOCK_QUERY_RESULTS`)
- [x] Mock executor supports `where Timestamp between (datetime(..)..datetime(..))`, `where DeviceId == "..."`, `where AttackTechniques has "..."`
- [~] **Process tree** preview alongside the query results (implemented in Timeline event side pane, not beside Advanced hunting results)
- [ ] Source-table picker (we pick the dominant table per technique; Learn doesn't promise this either)

## Internet-facing investigation section
- [x] Add `isInternetFacing` field to `DEVICES`
- [x] "Internet facing" pill in the badges with hover text per Learn
- [x] Top-of-page counter on Devices list
- [x] Saved query: "Find all devices that are internet facing" added to `SAVED_QUERIES`

## Data retention note
- [x] No-op for the lab (all data is in-memory). Could add a copy-line "Timeline retention is 90 days by default" to the Timeline tab header for exam realism.

---

## What's enough for the SC-200 Timeline → Hunt scenario
For the specific exam question Alex asked
(*"From the side pane, the analyst selects Hunt for related events. What does the
resulting Advanced Hunting query return?"*) — **the implemented flow is enough**:
device page → Timeline tab → technique marker → side pane → Hunt for related
events → Advanced hunting opens prefilled and auto-runs, returning the underlying
events on this device for that technique within a time window, and explicitly NOT
the technique marker row.

The rest of this file is gravy for fuller exam realism.
