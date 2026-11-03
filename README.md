<p align="center">
  <img src="public/zyntheor-header.svg" alt="ZYNTHEOR AI ENGINE" width="840" />
</p>

<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml/badge.svg" alt="Native CORE checks" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml/badge.svg" alt="Pages workflow" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml/badge.svg" alt="Audit workflow" /></a>
</p>

<p align="center"><b>Active Development</b> · Evidence-Based Engineering · Security-First Architecture</p>

<p align="center"><img src="public/status-cards.svg" alt="Local status cards. Values depend on the latest status generation run; UNVERIFIED means evidence is unavailable." width="840" /></p>

<p align="center"><img src="public/zyntheor-features.svg" alt="ZYNTHEOR AI ENGINE engineering pillars" width="840" /></p>

<p align="center">
  <a href="#installation--testing">Installation &amp; Testing</a> ·
  <a href="#security--governance">Security</a> ·
  <a href="#architecture-matrix">Architecture</a> ·
  <a href="#team-management">Team Management</a> ·
  <a href="#core-x-vision">CORE X Vision</a>
</p>

# ZYNTHEOR AI ENGINE — Sovereign AI Workspace (Buffalo Edition)

ZYNTHEOR AI ENGINE is a local-first AI engineering workspace for software development, code analysis, AI provider routing, and governed workflows. The application uses React 19, TypeScript, Vite, and an Express 5 backend. It can connect to a configured local Ollama runtime and to Google Gemini when remote use is configured and permitted.

> Engineering principle: real implementation, no fabricated evidence, fail-closed gates, human approval for consequential actions, and explicit separation of implemented foundations from accepted capabilities.

---

## Evidence-Based Status

**Inspection snapshot:** 2026-11-03 · **Repository commit inspected:** [`07c1d50556b3602e5dbbde067cd8dfe8fd9dcb09`](https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/commit/07c1d50556b3602e5dbbde067cd8dfe8fd9dcb09). This identifies the inspected repository snapshot; it does not prove that every separately reported test result was run against that exact tree.

The current evidence-derived P11–P20 integration status is `BLOCKED`; `releaseApproved` is `false`. Source files and test fixtures alone are not acceptance evidence. See [the status snapshot](docs/audit/P11_P20_INTEGRATION_STATUS.json), [the implementation report](docs/audit/P16_P20_IMPLEMENTATION_REPORT.md), and [the audit evidence index](docs/audit/README.md).

| Area | Status | Verified boundary / limitation |
|---|---|---|
| P11 Cognitive Reasoning | `NOT_VERIFIED` | Source foundations exist; current end-to-end and security acceptance evidence is not attached. |
| P12 Persistent Memory | `NOT_VERIFIED` in the current P11–P20 gate | Earlier focused implementation report describes tenant-boundary and storage hardening; current end-to-end acceptance and PostgreSQL runtime integration are not verified. |
| P13 Multi-Agent | `NOT_VERIFIED` in the current P11–P20 gate | Coordinator foundations and focused tests are reported; durable cross-restart storage is not established by the default in-memory store. |
| P14 Evaluation | `NOT_VERIFIED` in the current P11–P20 gate | Evaluation foundations exist; acceptance-grade model benchmark evidence is unavailable. |
| P15 Governed Improvement | `NOT_VERIFIED` | End-to-end governed improvement and rollback acceptance are not established. |
| P16 Native Training | `BLOCKED` | Training was not executed; dataset source/license review is incomplete and no checkpoint was created. |
| P17 Native Inference | `BLOCKED` | A local runtime foundation exists, but no approved trained checkpoint or accepted live inference is evidenced. |
| P18 Model Lifecycle | `NOT_VERIFIED` in the current gate | Lifecycle code exists; no model promotion has been established. |
| P19 Sovereign Infrastructure | `BLOCKED` | Local-only policy and backup/restore foundations exist; air-gap and hardened isolation are unverified. |
| P20 Integrated Release Gate | `BLOCKED` | Upstream evidence is incomplete; release approval remains false. |
| PostgreSQL runtime integration | `BLOCKED / NOT_VERIFIED` | No live PostgreSQL connection or accepted runtime integration evidence is attached to the inspected audit. |

### Test evidence and provenance

These are distinct evidence sources and must not be added together as if they were one test run.

| Source / date | Test runner or check | Reported result | Provenance and limits |
|---|---|---|---|
| P16–P20 implementation report, dated 2026-11-03; baseline named `ZYNTHEOR_AI_ENGINE_P16_NATIVE_CPU_PATCHED.zip` | Targeted Node regression tests | 33 passed; 0 failed implied by the report; skipped count not reported | Reported totals: 19 P12/P14/no-simulation and 14 P13/P17/P18/P20. The report does not identify this repository commit as the tested source revision. |
| Same report | Python native CPU and P17 runtime tests | 12 passed; 0 failed implied; skipped count not reported | Focused tests only. |
| Same report | Python P19 backup/restore tests | 3 passed; 0 failed implied; skipped count not reported | Test fixtures; not a production deployment drill. |
| Same report | Full npm/Vite project-wide test/build | `NOT_VERIFIED` | Dependencies were unavailable; no installation was performed. |
| User-supplied result with no raw logs, source revision, or run date | Vitest | 35 files / 294 tests passed; failed/skipped counts not supplied | `NOT_VERIFIED` for this repository snapshot; not represented as a current-tree test result. |
| User-supplied result with no raw logs, source revision, or run date | TypeScript | 0 errors | `NOT_VERIFIED` for this repository snapshot. |
| User-supplied result with no raw logs, source revision, or run date | Production build | `PASS` | `NOT_VERIFIED` for this repository snapshot. |
| Current integration status / audit | PostgreSQL runtime integration | `BLOCKED / NOT_VERIFIED` | No live database connection evidence. |

The implementation report records 15 dataset records (8 train / 3 validation / 4 test), but also says training was blocked by source/license verification and human-review gates. **No training run or checkpoint creation is claimed.** Run `npm run corex:p20:status` to inspect the current release gate; `BLOCKED` is the documented outcome while required evidence is missing.

---

## Engineering Highlights

- React/TypeScript workspace with an Express gateway, code intelligence, model-provider settings, and team-oriented UI components.
- Evidence and governance foundations include hash-chained records, model lifecycle gates, and a fail-closed P11–P20 status aggregator. Hash chaining is tamper-evident; it is not, by itself, proof of immutable storage.
- Persistent-memory and native CPU training/inference code exists, but its presence is not acceptance, a trained model, or production approval.
- **Midnight Teal / Zero-Purple is a design specification, not a verified audit of every UI surface.** The current `TeamRoleDistributionChart` source still assigns Developer the indigo color `#818cf8`; the desired specification color is Teal `#0d9488`. No claim is made that the UI itself has been corrected by this documentation change.

---

## CORE X Vision — First-Party AI Independence

CORE X is a **long-term roadmap**, not a statement that first-party AI capabilities are complete. Model identity must remain explicit:

- **`CORE_ADAPTED`** — a model adapted from a pretrained base model; disclose its upstream lineage and applicable licenses.
- **`CORE_NATIVE`** — intended for a model initialized from random weights and trained through an evidenced ZYNTHEOR process. The identity requires initialization, training lineage, dataset provenance, and checkpoint-integrity evidence; source code or a registry entry alone is insufficient.
- **`CORE_DISTILLED`** — a model produced through a documented knowledge-distillation process, with teacher lineage and data/provenance requirements recorded.

Long-term capability objectives (none of these headings imply completion):

1. Native Tokenizer — develop and validate tokenization for Thai, English, and source code.
2. Native Dataset & Provenance — establish source, license, review, and reproducible validation for every admitted dataset.
3. Native Model Architecture — define and maintain first-party model architecture and verifiable model identity.
4. Random-Initialization Training — execute governed training from random initialization with reviewed data and reproducible evidence.
5. Native Inference Runtime — load and run approved native checkpoints without unapproved downloads or provider fallback.
6. Native Intelligence — build and evaluate reasoning, planning, memory, tool execution, and agent orchestration against repeatable acceptance criteria.
7. Model Lifecycle & Governance — govern evaluation, checkpoint versioning, human-approved promotion, monitoring, and rollback.

Current P16 evidence says training has not been run, no checkpoint exists, and the model is not inference-ready or production-approved. CORE X independence remains a goal, not a completed capability.

---

## Architecture Matrix

![ZYNTHEOR AI ENGINE multi-tier architecture](public/zyntheor-architecture.svg)

1. **Client workspace UI:** React 19, Vite, TypeScript, Tailwind, Recharts, and D3.js. The repository includes workspace, code-intelligence, and team UI components; feature acceptance varies by surface.
2. **Backend gateway:** Express 5 and Node.js handle API requests, identity/session resolution, authorization, consent and local-only policy checks, and protected operations. The exact protection depends on route and configuration.
3. **AI provider and tool gateway:** Local Ollama is an optional local inference provider. Google Gemini is a remote provider and requires configuration/consent. Local inference does not imply the whole application has no network access.
4. **Evidence and storage:** Includes evidence/lifecycle foundations, local storage paths, and backup/restore verification code. PostgreSQL runtime integration and production-grade multi-instance storage acceptance remain unverified.

### Network and execution terminology

- **Local inference:** model computation is performed by a local runtime such as Ollama. This describes inference location, not all application traffic.
- **Local-Only Mode:** an application policy/configuration intended to restrict provider or application behavior to local operation. A flag or loopback bind alone does not establish that all egress is blocked.
- **Network-Isolated Environment:** an environment with network paths restricted and independently verified by an isolation/egress test. Such evidence is not currently established here.
- **Air-Gapped Environment:** a stronger, verified absence of external network connectivity for the defined system boundary. The repository does not claim an air gap or “100% offline” operation.

---

## Intelligence & Models

The project includes AI provider configuration for local Ollama and Google Gemini, prompt/workspace interfaces, code-intelligence foundations, and native CPU training/inference source paths. Provider availability and behavior depend on local configuration, model availability, dependencies, and applicable consent controls.

Native pipeline status is **blocked** pending dataset governance and human review. The current audit does not establish an accepted native checkpoint, checkpoint-based benchmark, or model promotion. See [the native training report](docs/audit/P16_TRAINING_REPORT.json), [native architecture audit](docs/audit/P16_ARCHITECTURE_AUDIT.md), and [model evaluation status](docs/audit/P16_NATIVE_MODEL_EVALUATION.json).

---

## Security & Governance

- See [`SECURITY.md`](SECURITY.md) for security reporting and policy details.
- Local-first behavior is a design preference; remote Gemini calls are possible when configured. Treat provider selection and consent as explicit runtime conditions.
- `HOST=127.0.0.1` binds a server to loopback; it does not prove that the process or host has no external network access. The current package `dev` script declares `HOST=0.0.0.0`, so check the effective runtime configuration rather than assuming loopback defaults.
- `ZYNTHEOR_LOCAL_ONLY` is a policy input. Its presence does not certify network isolation or an air gap.
- The backend should derive identity and authorization from server-verified sessions/tokens, not caller-supplied role headers. Role mapping and authorization are described below.
- High-impact actions and model lifecycle operations are subject to approval/evidence gates where implemented. No blanket production-security certification is claimed.
- The identity/storage audit calls out remaining requirements, including live PostgreSQL/ACID migration, multi-instance tests, browser token handling, and dependency-backed integration/E2E validation. See [the audit](docs/audit/IDENTITY_STORAGE_HARDENING_2026-11-03.md).

---

## Team Management

The repository has two role representations. They must not be conflated:

| Database/account role | Workspace/session role mapping | Role chart display behavior |
|---|---|---|
| `OWNER` | `admin` | No separate Owner bucket in the chart's counted roles; chart input `OWNER` is not counted by its current four-bucket configuration. |
| `ADMIN` | `admin` | Displayed as Admin. |
| `DEVELOPER` | `engineer` | Displayed in the Developer bucket. |
| `MEMBER` | `engineer` | The chart currently groups `MEMBER` records into the Developer display bucket. This is a presentation aggregation, **not** evidence that `MEMBER` equals `DEVELOPER` in the account/database role model. |
| `VIEWER` | `viewer` | Displayed as Viewer. |

The account-role authorization matrix distinguishes `DEVELOPER` from `MEMBER` and grants them different permissions. Workspace roles (`admin`, `engineer`, `viewer`) are a separate coarser authorization representation; for example, both `DEVELOPER` and `MEMBER` map to `engineer` in the current session mapping. Effective permissions should be determined by the server authorization policy, not inferred from a chart label.

The chart source currently defines four display buckets (Owner is not a bucket) and has a Developer color of `#818cf8`. The requested Zero-Purple Teal value `#0d9488` is documented as a **design specification only**; UI-wide compliance has not been verified. See [`TeamRoleDistributionChart.tsx`](src/components/TeamRoleDistributionChart.tsx), [`authService.ts`](src/services/authService.ts), and [`authorizationService.ts`](src/services/authorizationService.ts).

---

## Installation & Testing

### Prerequisites

- **Node.js 22.x recommended for the documented verification environment.** The package metadata declares `node >=20`, while repository workflows have used both Node 20 and Node 22. This README does not claim Node 20 compatibility as tested support; use Node 22.x unless a current, reproducible compatibility run establishes otherwise.
- npm (the package workflows use npm).
- Ollama only if using a configured local inference workflow.

### Development

```bash
npm install
cp .env.example .env
npm run dev
```

Review `.env` before use and do not commit secrets. The package's `dev` command sets `HOST=0.0.0.0`; do not assume it is loopback-only. Verify the effective host, port, authentication, and network policy before exposing the service. The command declares port 3000.

### Quality checks

```bash
npm run typecheck
node scripts/check-manifest.js
npm test
npm run build
```

These are commands to run, not a guarantee of success. Test evidence above is scoped to its stated report/source version; user-provided aggregate figures without raw logs and a source SHA remain `NOT_VERIFIED` for the repository snapshot.

---

## P4–P20 Roadmap

The existing roadmap/audit materials cover P4–P10 and P11–P20. Their status must be read with the source version and evidence limitations in each report. The current P11–P20 integration snapshot is `BLOCKED`; its release approval is false. P4–P10 audit also reports blocked or dependency-blocked phases and does not approve production release.

- [P4–P10 audit and execution plan](docs/roadmap/ZYNTHEOR_CORE_X_P4_P10_AUDIT_AND_PLAN.md)
- [P11–P20 integration status](docs/audit/P11_P20_INTEGRATION_STATUS.json)
- [P16–P20 implementation report](docs/audit/P16_P20_IMPLEMENTATION_REPORT.md)
- [Audit evidence index and interpretation](docs/audit/README.md)

A successful documentation update does not change any engineering phase gate and does not imply production readiness.

---

## Screenshots

No verified application screenshots are included here. Add genuine captures from the running application under `docs/screenshots/` before embedding them; do not use mockups as evidence of implemented UI.

---

## Contribution

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development guidance. Contributions should include scoped changes, relevant tests, security/tenant-boundary consideration, and evidence for claims made in documentation. Keep design specifications distinct from verified UI behavior.

---

## License & Attribution

Distributed under the **AGPL-3.0 License**. Third-party libraries, pretrained model bases, datasets, and external components retain their applicable attribution, license, and provenance requirements. First-party AI independence is a long-term objective and does not reclassify current third-party components as first-party technology.

<p align="center"><img src="public/zyntheor-footer.svg" alt="ZYNTHEOR AI ENGINE · Buffalo Edition" width="840" /></p>
