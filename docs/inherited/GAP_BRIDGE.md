# GAP_BRIDGE — study-app vs lab content gap mission

Mission brief for a fresh AI session. Written 2026-07-06.

**Goal:** find every SC-200 topic that exists in Alex's study app
(`~/sc-200_app`) but has NO corresponding interactive surface in the lab
(`~/defender-lab`), then define and run numbered bridge agents to close
those gaps. Dead nav routes and one-off misses (workspace manager) proved
the lab's own delta doc is not a sufficient coverage source — the study
app corpus is the authority.

## The two projects

| | Study app | Lab |
|---|---|---|
| Path | `/home/alex/sc-200_app` | `/home/alex/defender-lab` |
| What | RAG/MCQ study tool over downloaded Microsoft Learn content | Original-code portal look-alike (Defender XDR, Sentinel, Defender for Cloud, Purview) |
| Serve | `server.py` (runs on 127.0.0.1:8766) | `python3 -m http.server 8767 --bind 127.0.0.1` from `ui/` |
| Role here | **Source of truth** (read-only) | **Target** (gets the fixes) |

## Study-app corpus files (read these, never edit)

- `SC-200_manual.md` — ~79k lines, the full compiled manual, sectioned by
  topic (`#`/`##` headers mirror the link-index sections).
- `chunks.jsonl` — 3,853 chunks: `{id, order, section, source_url, text}`.
- `concepts.jsonl` — same 3,853 chunks tagged with concepts:
  `{chunk_id, concepts: [...]}`. ~45 real concepts (plus a few junk tags
  like `https en-us` — ignore anything with ≤1 chunk).
- `sc-200_microsoft_learn_links.txt` — curated official-only link index
  (2026-07-03), sectioned. Agent 11 already used this; see below.
- `pages/learn.microsoft.com/` — raw downloaded pages (fallback detail).

Concept vocabulary with chunk counts (proxy for exam emphasis):

```
1215 data connectors      497 microsoft defender xdr   139 ueba
 839 log ingestion        443 rbac and roles           122 kql basics
 683 alert management     399 automation rules          89 vulnerability management
 537 incident management  387 defender for endpoint     79 mitre attack
 530 entities             301 sentinel workspaces       79 device investigation
 515 threat intelligence  259 defender for cloud        68 attack surface reduction
 249 analytics rules      241 security copilot          64 kql joins
 221 microsoft purview    201 workbooks                 64 identity protection
 196 threat hunting       182 kql parsing               54 device response actions
 176 playbooks            171 kql summarize             53 search jobs
 171 sentinel solutions   141 advanced hunting          48 defender for cloud apps
                                                        45 data normalization
  42 watchlists   36 exam preparation   30 defender for identity
  30 fusion and ml   27 soc optimization   27 notebooks
  25 defender for office 365   19 sentinel overview   12 nrt rules
```

## Lab-side inputs

- `ui/data.js` — NAV routes (`route:'#/...'`) and all fixtures.
- `ui/views.js` — registered views (`VIEWS['...']`). A NAV route with no
  VIEWS entry renders "Page not found".
- `AGENTS.md` — Sprint 2 state: Agents 1–9 (delta objectives + QA) and
  Agents 10–11 (dead-route triage, link-index sweep). Check their boxes
  before assuming a gap still exists.
- `COVERAGE_SWEEP.md` — Agent 11's link-index coverage report (if present).
  Use it as input; this mission goes deeper (chunk/concept level), so
  verify rather than trust.
- `HANDOFF.md` — per-agent build log.
- Git history — one commit per agent since baseline `9b07a2a`.

## Method

1. For each concept in the vocabulary (highest chunk count first), pull a
   sample of its chunks (`concepts.jsonl` → `chunks.jsonl` by chunk_id)
   and list the distinct capabilities/workflows the text describes
   (e.g. "data connectors" chunks describe: AMA-family connectors,
   codeless connector platform, Logs Ingestion API, S3 connector, …).
2. For each capability, check the lab: does an interactive surface exist
   (route + view + fixture), only a study card/fixture, or nothing?
   Grep `ui/data.js` + `ui/views.js`; click-check ambiguous ones at
   `http://127.0.0.1:8767`.
3. Record every `missing` and `partial` capability in a table in
   `GAP_BRIDGE_FINDINGS.md`: concept, capability, chunk-count weight,
   lab status, existing nearest route, proposed fix size (S/M/L).
4. Cluster the findings into numbered bridge agents (**continue from
   Agent 12**) with one portal surface per agent, same shape as the
   Sprint 2 sections in `AGENTS.md`. Append them to `AGENTS.md`.
5. Run them with the committed orchestrator:
   `bin/run-codex-agents.sh 12 13 14 ...` (sequential, commit per agent —
   agents share ui/*.js files, NEVER run two in parallel).
6. Finish with a QA agent (route sweep + `node --check` + headless-Chrome
   click-through), then update `HANDOFF.md` per the sprint-handoff rule.

## Hard rules (same as AGENTS.md — non-negotiable)

1. No copying Microsoft proprietary HTML/CSS/JS or Learn text. Original
   look-alike code; summaries in our own words.
2. No build step; vanilla HTML/CSS/JS. No real auth/network calls.
3. No secrets in any file; fake hashes stay `aaa…`/`bbb…` style.
4. Study app is read-only for this mission. All changes land in
   `~/defender-lab` with a git commit per agent.
5. Terse comms; update `HANDOFF.md` and `AGENTS.md` checkboxes when done.

## Known context (don't re-derive)

- Codex CLI sandbox is broken on this machine (`bwrap` AppArmor userns) —
  always use `codex exec -s danger-full-access`; `workspace-write`
  silently writes nothing.
- Agents 1–11 already covered: the OBJECTIVES_DELTA objectives (Logs
  Ingestion API lab, AMA/CEF/WEF/Azure Activity ingestion, retention
  tiers, SOC optimization, summary rules, notebooks, NRT/TI/ML rule
  types, anomalies, MDCA/Entra/case management, Graph activity logs,
  threat analytics, eDiscovery search, live response, ASR, AIR), dead
  nav routes incl. a full workspace manager, and the link-index sweep.
  The bridge agents cover whatever the chunk-level compare still finds.
