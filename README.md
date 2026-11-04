<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-">
    <img src="public/zyntheor-buffalo-mark.svg" alt="ZYNTHEOR Buffalo Edition mark" width="80" height="80" />
  </a>
</p>

<p align="center">
  <img src="public/zyntheor-header.svg" alt="ZYNTHEOR AI ENGINE - Sovereign Local-First Intelligence &amp; Autonomous Engineering Core" width="840" />
</p>

<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml/badge.svg" alt="Native CORE checks" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml/badge.svg" alt="Pages workflow" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml/badge.svg" alt="Audit workflow" /></a>
</p>

<p align="center"><b>Active Development</b> · Evidence-Based Engineering · Security-First Architecture</p>

<p align="center">
  <img src="public/status-cards.svg" alt="Local status cards. Values depend on the latest status generation run; UNVERIFIED means evidence is unavailable." width="840" />
</p>

<p align="center">
  <img src="public/zyntheor-features.svg" alt="ZYNTHEOR AI ENGINE engineering pillars" width="840" />
</p>

<p align="center">
  <a href="#installation--testing">Installation &amp; Testing</a> ·
  <a href="#security--governance">Security</a> ·
  <a href="#architecture-matrix">Architecture</a> ·
  <a href="#team-management">Team Management</a> ·
  <a href="#core-x-vision">CORE X Vision</a>
</p>

# ZYNTHEOR AI ENGINE — Sovereign AI Workspace (Buffalo Edition)

ZYNTHEOR AI ENGINE is a local-first AI engineering workspace for software development, code analysis, AI provider routing, and governed workflows. The application uses React 19, TypeScript, Vite, and an Express 5 backend. It can connect to a configured local Ollama runtime and to Google Gemini when remote use is configured and permitted.

> **Engineering Principle:** Real implementation, no fabricated evidence, fail-closed gates, human approval for consequential actions, and explicit separation of implemented foundations from accepted capabilities.

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## Evidence-Based Status

**Inspection snapshot:** 2026-11-04 · **Repository commit inspected:** [`07c1d50556b3602e5dbbde067cd8dfe8fd9dcb09`](https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/commit/07c1d50556b3602e5dbbde067cd8dfe8fd9dcb09). This identifies the inspected repository snapshot; it does not prove that every separately reported test result was run against that exact tree.

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
| Phase A delivery report | Node test runner + Vitest suite | Reported 49 test files passed, 0 failures, 237 passed assertions. | Scoped to Phase A report snapshot; covers only the test files executed in that run. |
| Phase B audit | Independent Node test runner invocation | Reported 51 test files passed, 0 failures, 273 passed assertions. | Scoped to the Phase B verification run and the test set selected for it. |
| P4–P10 audit | Targeted foundation checks | Reports 3 passed test runs, 0 failures, 11 tests. | Covers only the P4–P10 test files; not an aggregate for other suites. |
| P11–P20 audit | Targeted P11–P20 checks | Reports 7 test files, 18 tests, 0 failures. | Covers only the P11–P20 test files; not an aggregate for other suites. |
| P16 native model evaluation | Python test runner | Reports 3 Python test suites passed, 15 passed checks, 0 failures. | Scoped to native CPU model checks; does not evaluate TypeScript or end-to-end system paths. |

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## Architecture Matrix

<p align="center">
  <img src="public/zyntheor-architecture.svg" alt="ZYNTHEOR AI ENGINE Multi-Tier Sovereign Architecture" width="840" />
</p>

ZYNTHEOR AI ENGINE follows a strict fail-closed, multi-tier isolation model:

1. **Client Interface Layer:** React 19 SPA running in modern browsers with dark cybernetic aesthetic, instant mode switching, and real-time execution observability.
2. **Gateway & Containment Layer:** Express 5 proxy enforcing `ZYNTHEOR_LOCAL_ONLY` policies, token verification, and tenant scoping. Remote AI calls to Gemini require explicit user consent.
3. **Dual-Inference Engine:** Supports local Ollama runtimes and remote Google Gemini API, with strict model status verification.
4. **Trust, Security & Forensic Audit:** Every critical action is recorded in an immutable SHA-256 hash-chained audit ledger with tamper detection.

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## Team Management & Authorization

The workspace features a multi-tenant role-based access control (RBAC) model:

| Account Role | Workspace Role | Notes |
|---|---|---|
| `OWNER` | `admin` | Full workspace administration and team governance privileges. |
| `ADMIN` | `admin` | Displayed as Admin in team management. |
| `DEVELOPER` | `engineer` | Code execution, prompt engineering, and debugging access. |
| `MEMBER` | `engineer` | Contributor permissions under team oversight. |
| `VIEWER` | `viewer` | Read-only inspection and audit review capabilities. |

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## Installation & Testing

### Prerequisites

- **Node.js 20+** (Node 22.x recommended for production parity)
- **npm** or **bun**
- **Ollama** (optional, for local-first inference workflows)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-.git
cd ZYNTHEOR_AI_ENGINE-

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server on port 3000
npm run dev
```

### Verification & Quality Suite

```bash
# Run TypeScript compilation and strict type check
npm run typecheck

# Run test suites
npm test

# Build production bundle
npm run build
```

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## License & Attribution

Distributed under the **AGPL-3.0 License**.

<p align="center">
  <img src="public/zyntheor-footer.svg" alt="ZYNTHEOR AI ENGINE · Buffalo Edition Footer" width="840" />
</p>

<p align="center">
  <img src="public/zyntheor-buffalo-mark.svg" alt="ZYNTHEOR Buffalo Edition mark" width="72" height="72" />
</p>
