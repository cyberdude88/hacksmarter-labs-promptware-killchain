# The Promptware Kill Chain

A lightweight, frontend-only SOC training environment, being converted from a
generic SOC simulator into a range built around **promptware** — the seven-stage
kill chain (Initial Access → Privilege Escalation → Reconnaissance →
Persistence → Command & Control → Lateral Movement → Actions on Objective)
described in Brodt, Feldman, Schneier & Nassi, *"The Promptware Kill Chain"*
(arXiv:2601.09625, 2026).

Built with **React + Vite**. Deployable to **GitHub Pages** with no backend.

## Nav / incident-response lifecycle mapping

| Nav item      | IR lifecycle phase          | Status |
| ------------- | ---------------------------- | ------ |
| Alerts        | Detection (trigger)          | live, on placeholder data |
| Kill Chain    | Detect & Analyze — dropdown over the 7 promptware stages | shell only, no tasks yet |
| Containment   | Containment & Eradication     | placeholder |
| Recovery      | Recovery                      | placeholder |
| Incident Report | Post-Incident Activity      | live, on placeholder data |

## What it currently simulates (placeholder — being replaced)

The alert/telemetry data still driving Alerts and Incident Report is the
original **AI-Accelerated Edge Compromise** scenario: an exposed FortiGate
appliance hit by an AI-augmented brute-force tool that probes admin login
from a known TOR exit, authenticates as `admin`, exports the device config,
and mixes in benign workstation noise as a distractor. This has nothing to
do with promptware — it's placeholder content until a real prompt-injection
/ AI-agent-compromise narrative is authored for the new stages above.

## Layout

```
┌────────────────────────────────────────────────────────────┐
│  Header  (scenario, replay control)                        │
├──────────┬─────────────────────────────┬───────────────────┤
│          │                             │  Scenario panel   │
│  Alert   │       Log / Telemetry       ├───────────────────┤
│  Queue   │           Viewer            │  Rule Builder     │
│          │                             │                   │
├──────────┴─────────────────────────────┴───────────────────┤
│  Incident Report                       │   Score           │
└────────────────────────────────────────┴───────────────────┘
```

## Quickstart

```bash
cd hacksmarterSOC
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ locally
```

## OVA Appliance

The supported appliance path is `appliance/debian/`.

```bash
appliance/debian/build-ova.sh
```

That flow builds `dist/`, installs it into a minimal Debian VM with native `nginx`, hardens the guest, and exports `appliance/debian/output/hacksmarter-soc.ova`.

## Deploy to GitHub Pages

1. Create a GitHub repo (e.g. `hacksmarter-soc`) and push this folder.
2. Build with the correct base path (matches the repo name):

   ```bash
   VITE_BASE=/hacksmarter-soc/ npm run build
   ```

3. Deploy `dist/`. Easiest:

   ```bash
   npm run deploy   # uses gh-pages package, pushes dist/ to gh-pages branch
   ```

4. In **Settings → Pages**, set source to `gh-pages` branch.

## Adding a new scenario

1. Drop a new JSON file in `public/scenarios/`, e.g. `okta_token_theft.json`. Schema:

   ```json
   {
     "id": "okta_token_theft",
     "name": "...",
     "summary": "...",
     "narrative": ["..."],
     "objectives": ["..."],
     "iocs": ["..."],
     "duration": 90,
     "replayLogIds": ["LOG-100", "..."],
     "expectedDetections": ["LOG-101"]
   }
   ```

2. Add the new alerts to `public/data/alerts.json` (set `scenario` to the new ID, give each a `tOffset` in seconds).
3. Add the supporting logs to `public/data/logs.json`.
4. (Optional) add IOCs to `public/data/iocs.json`.
5. Update the fetch in `src/App.jsx` if you want to swap which scenario loads, or extend it to a scenario selector.

## File layout

```
hacksmarterSOC/
├─ public/
│  ├─ data/
│  │  ├─ alerts.json
│  │  ├─ logs.json
│  │  └─ iocs.json
│  └─ scenarios/
│     └─ promptware_kill_chain.json
├─ src/
│  ├─ App.jsx              # composes the SOC layout
│  ├─ main.jsx
│  ├─ styles.css
│  ├─ components/
│  │  ├─ Header.jsx
│  │  ├─ AlertQueue.jsx
│  │  ├─ LogViewer.jsx
│  │  ├─ ScenarioPanel.jsx
│  │  ├─ RuleBuilder.jsx
│  │  ├─ ReportPanel.jsx
│  │  └─ ScorePanel.jsx
│  ├─ hooks/
│  │  ├─ useAlertStream.js   # setInterval-based alert reveal
│  │  └─ useReplay.js        # ticks through scenario logs
│  └─ lib/
│     ├─ ruleEngine.js       # eq / contains / regex
│     └─ scoring.js          # triage + detection + timing + report
├─ index.html
├─ vite.config.js
└─ package.json
```

## Scoring

| Component               | Max | Notes                                                  |
| ----------------------- | --- | ------------------------------------------------------ |
| Triage accuracy         | 30  | +6 per correct verdict, −5 per wrong                  |
| Detection coverage      | 30  | Rules firing on `expectedDetections` log IDs           |
| Rule false positives    | −15 | Penalty for rules that match non-expected logs         |
| Early-detection bonus   | 10  | Awarded once any expected detection fires              |
| Incident report quality | 30  | Verdict + severity + IOC selection + narrative length  |

## Suggested first rules (try these)

- `event` **equals** `auth.login.fail` — catches the brute force.
- `event` **equals** `config.export` — catches the exfiltration.
- `src_ip` **equals** `185.220.101.42` — catches the IOC IP.

## Design notes

- **No backend.** All data is fetched as static JSON from `/public/`.
- **Streaming** is simulated via `setInterval` against alerts' `tOffset` timestamps.
- **Replay** ticks one log per second through `scenario.replayLogIds`.
- **Rule engine** supports `eq`, `contains`, and `regex` against any log field.
- **State** is plain `useState` / `useMemo` — no Redux, no context gymnastics.
