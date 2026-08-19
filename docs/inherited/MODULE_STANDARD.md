# HSL Academy — Standard Module Layout

Status: canonical. Applies to **all four tracks**.
Companion to `PLATFORM_ARCHITECTURE.md` §5A and `SPRINT_PLAN.md` Agent 31.

Every module in every program has the same shape. Not similar — identical. That
is what lets one set of components render four tracks, lets four authors work in
parallel without coordinating, and lets a student who finishes one program
recognize the structure of the next one.

---

## 1. The program frame

Fixed across all four tracks, because the site advertises all four the same way:

| Property | Value |
|---|---|
| Duration | 6 weeks |
| Modules | 12 |
| Modules per week | 2 |
| Module 12 | Always the capstone |
| Module 11 | Always professional practice — communication, documentation, workflow |
| Estimated training | 80–100 hours |
| Delivery | Online, self-paced + guided |

### The six-week arc

Every track follows the same pedagogical progression. The phase names are
domain-specific; the progression is not.

| Week | Phase | Purpose |
|---|---|---|
| 1 | **Foundations** | Vocabulary, mental model, the environment the work happens in |
| 2 | **Core Systems** | The primary tools and systems of the discipline |
| 3 | **Applied Practice** | First real work — guided, with a safety net |
| 4 | **Analysis & Specialization** | The deep technical middle; the hardest modules live here |
| 5 | **Operations & Response** | Doing the job under real conditions — troubleshooting, incidents, failure |
| 6 | **Professional Practice & Capstone** | Communicating the work, then proving it end to end |

Week 4 is deliberately the heaviest in every track. Module 08 is the largest
single module in the program — for SOC Analyst it is Vulnerability Management at
9–12 hours. Track authors should expect the same weighting.

---

## 2. The module contract

Every module object carries **all** of these keys. A field with no content yet is
present and empty — never absent. Missing keys are what break shared components.

```ts
interface Module {
  key:           string;      // '<track>-01' … '<track>-12'. Stable forever.
  number:        number;      // 1–12
  week:          number;      // 1–6
  title:         string;
  summary:       string;      // one or two sentences, what and why
  hours:         string;      // '6–8 Hours' — a range, never a point estimate
  lessons:       number;
  labs:          number;
  objectives:    string[];    // 3–6, measurable, start with a verb
  topics:        TopicGroup[];// flat list = one unnamed group
  handsOn:       HandsOn[];   // exercises, with numbered steps where procedural
  skills:        string[];    // 4–6 chips, résumé-grade nouns
  assessment:    Assessment;
  prerequisites: string[];    // module keys that should come first
  isCapstone:    boolean;
  status:        'draft' | 'authored' | 'published';
}

interface TopicGroup { label?: string; items: string[] }
interface HandsOn    { title: string; steps?: string[]; note?: string }
interface Assessment { knowledgeCheck: boolean; practicalLab: boolean; capstoneGate: boolean }
```

### Field rules

**`key`** — `<track>-NN`, zero-padded. This is the join key to Postgres and it
never changes, even if the module is renamed or reordered. Renumbering keys
orphans every student's progress row.

**`summary`** — what the student will be able to do, not what the module
"covers". Compare: *"Investigate suspicious activity occurring on endpoints"*
against *"This module covers endpoint security topics."*

**`hours`** — always a range. Accelerated programs attract career changers with
jobs; a single number reads as a promise.

**`objectives`** — 3 to 6, each beginning with a measurable verb: *investigate,
configure, analyze, prioritize, document, isolate, validate.* Avoid *understand,
learn about, be familiar with* — they cannot be assessed, and an objective that
cannot be assessed cannot anchor a lab.

**`topics`** — use one unnamed group for most modules. Use named groups only
when the module is large enough to need internal navigation. SOC Module 08 uses
six named groups (Asset Discovery, Vulnerability Assessment, Environments,
Analysis & Prioritization, Remediation, Application Security). Everything else
in the SOC track is flat.

**`handsOn`** — every module has at least one. This is the product claim: *this
is a technical training program, not a collection of videos.* A module with an
empty `handsOn` array is not finished.

**`skills`** — the words a graduate puts on a résumé and an employer searches
for. `SIEM`, `CVSS`, `Active Directory`, `PyTorch`, `Ohm's Law`. Not
`communication skills`.

**`prerequisites`** — module keys, used for optional drip/sequencing. Empty is
normal; the default enrollment opens everything at once.

**`status`** — the authoring lifecycle, not the student's progress:

| Status | Meaning |
|---|---|
| `draft` | Skeleton exists — title, week, position. Body is empty. |
| `authored` | Content written, pending review. |
| `published` | Reviewed and live. |

A program flips `isPublished` only when all 12 modules reach `published`.

---

## 3. Module 11 and 12 are the same everywhere

**Module 11 — Professional Practice.** Every discipline needs its practitioners
to write up findings, hand off work, and talk to non-specialists. Named per
track, but always: workflow, documentation, metrics, communication to technical
and non-technical audiences.

**Module 12 — Capstone.** Never a quiz. A single realistic multi-stage scenario
requiring most of the program's skills, ending in a written deliverable the
student can put in a portfolio. The SOC capstone runs 12 stages; other tracks
should land in the same 8–12 stage range at 8–12 hours.

---

## 4. Standard skeletons

All four tracks are seeded with industry-aligned 12-module skeletons. Titles and
positions are set; bodies are empty and `status: 'draft'`.

### IT Help Desk & Career Accelerator
Aligned to CompTIA A+ domains and ITIL 4 service management practice.

| # | Wk | Module |
|---|---|---|
| 01 | 1 | IT Support Fundamentals & Service Desk Operations |
| 02 | 1 | Hardware, Devices & Peripherals |
| 03 | 2 | Operating Systems: Windows, macOS & Linux |
| 04 | 2 | Networking Fundamentals for Support |
| 05 | 3 | Windows Server & Active Directory Administration |
| 06 | 3 | Identity, Accounts & Access Management |
| 07 | 4 | Software, Applications & Endpoint Management |
| 08 | 4 | Troubleshooting Methodology & Diagnostics |
| 09 | 5 | Security Fundamentals for IT Support |
| 10 | 5 | Ticketing, ITIL Service Management & SLAs |
| 11 | 6 | Customer Service, Documentation & Escalation |
| 12 | 6 | IT Support Capstone |

### Security Operation Center (SOC) Analyst
Aligned to cybersecurity analyst objectives (CySA+ domains) and NIST SP 800-61
incident handling. **Authored** — the reference implementation.

| # | Wk | Module |
|---|---|---|
| 01 | 1 | SOC & Security Architecture |
| 02 | 1 | Network, Identity & Security Foundations |
| 03 | 2 | SIEM & Log Analysis |
| 04 | 2 | Detection Engineering, Threat Intelligence & Automation |
| 05 | 3 | Endpoint & Malware Investigation |
| 06 | 3 | Threat Hunting & Investigation |
| 07 | 4 | Network & Email Analysis |
| 08 | 4 | Vulnerability Management & Exposure Analysis |
| 09 | 5 | Incident Response |
| 10 | 5 | Digital Evidence, Forensics & Incident Frameworks |
| 11 | 6 | SOC Operations, Metrics, Reporting & Communication |
| 12 | 6 | SOC Analyst Capstone |

### Foundations of AI & Machine Learning
Aligned to the CRISP-DM lifecycle and current MLOps practice.

| # | Wk | Module |
|---|---|---|
| 01 | 1 | Python Programming Foundations |
| 02 | 1 | Data Fundamentals, Mathematics & Statistics |
| 03 | 2 | Data Acquisition, Cleaning & Preparation |
| 04 | 2 | Exploratory Data Analysis & Visualization |
| 05 | 3 | Supervised Learning: Regression & Classification |
| 06 | 3 | Unsupervised Learning & Feature Engineering |
| 07 | 4 | Model Evaluation, Validation & Tuning |
| 08 | 4 | Neural Networks & Deep Learning Foundations |
| 09 | 5 | Applied AI: Language, Vision & Generative Models |
| 10 | 5 | MLOps: Deployment, Pipelines & Monitoring |
| 11 | 6 | Responsible AI, Ethics & Communicating Results |
| 12 | 6 | AI & Machine Learning Capstone |

### Electrical Engineering Essentials
Aligned to NCEES FE Electrical fundamentals and NFPA 70E / NEC safety practice.

| # | Wk | Module |
|---|---|---|
| 01 | 1 | Electrical Fundamentals & Safety |
| 02 | 1 | DC Circuit Analysis & Ohm's Law |
| 03 | 2 | AC Fundamentals & Waveforms |
| 04 | 2 | Series, Parallel & Complex Circuits |
| 05 | 3 | Components: Resistors, Capacitors & Inductors |
| 06 | 3 | Semiconductors & Power Electronics |
| 07 | 4 | Digital Logic & Boolean Algebra |
| 08 | 4 | Motors, Generators & Transformers |
| 09 | 5 | Test Equipment & Measurement |
| 10 | 5 | Electrical Troubleshooting & Fault Isolation |
| 11 | 6 | Codes, Standards, Schematics & Documentation |
| 12 | 6 | Electrical Engineering Capstone |

---

## 5. What a track author does

1. Open your one file: `src/content/programs/<your-track>.ts`.
2. Fill in each module's `objectives`, `topics`, `handsOn`, `skills`,
   `assessment`, `hours`, `lessons`, `labs`.
3. Move `status` to `authored` as you finish each one.
4. Run `npm run validate:content`.
5. When all 12 are `published`, flip the program's `isPublished` to `true`.

Do not rename `key`. Do not reorder modules. Do not edit a component. If the
standard cannot express what your track needs, that is a platform ticket — the
schema changes for all four tracks or not at all.

---

## 6. Non-negotiables

- 12 modules, 6 weeks, 2 per week — no track deviates.
- Module 12 is a capstone with a portfolio-grade deliverable.
- Every module has at least one hands-on exercise.
- `hours` is a range.
- Objectives use measurable verbs.
- No certification endorsement, partnership, or pass-guarantee language in any
  track. Alignment may be stated; affiliation may not.
