<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-">
    <img src="public/zyntheor-buffalo-mark.svg" alt="ZYNTHEOR Buffalo Edition" width="84" height="84" />
  </a>
</p>

<p align="center">
  <img src="public/zyntheor-header.svg?v=3" alt="ZYNTHEOR AI ENGINE" width="840" />
</p>

<p align="center">
  <b>Intelligence Without Boundaries.</b><br />
  Online-First · Sovereign · First-Party · Evidence-Based
</p>

<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml/badge.svg" alt="Native CORE checks" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml/badge.svg" alt="Pages workflow" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml/badge.svg" alt="Audit workflow" /></a>
</p>

---

## 1. Vision

**ZYNTHEOR AI ENGINE** is an online-first, sovereign, general-purpose intelligence platform. It brings models, knowledge, reasoning, memory and tools into one ecosystem, and aims to compete through **measurable** intelligence rather than interface decoration. We are not building another chatbot interface; we are building an intelligence platform.

- **Unified:** one central intelligence layer coordinates every capability.
- **Sovereign:** ZYNTHEOR owns its orchestration, routing, memory, policies and identity.
- **First-party:** ZYNTHEOR CORE is developed as its own model family, with transparent provenance.
- **Evidence-based:** every capability claim needs reproducible evidence.
- **User-controlled privacy:** Online, Hybrid and Local-Only operation follow explicit user policy.

## 2. Intelligence Architecture

| Layer | Role |
|---|---|
| Experience | User interaction and capability access |
| Intelligence | Intent understanding, orchestration, context |
| Reasoning & Planning | Analysis, planning, verification |
| Model | CORE models and authorized external routing |
| Knowledge & Tools | Research, retrieval, documents, authorized tools |
| Memory | Workspace-scoped persistent context |
| Trust | Security, governance, approval, audit |

Processing modes: `DIRECT` · `REASONING` · `RESEARCH` · `CREATION` · `TECHNICAL` · `AGENTIC`. Simple requests are not forced through expensive agent workflows.

These are logical responsibilities; actual implementation status is tracked separately. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 3. ZYNTHEOR CORE — Model Identity

| Identity | Meaning |
|---|---|
| `CORE_NATIVE` | Trained by ZYNTHEOR from its own training process |
| `CORE_ADAPTED` | Third-party base model adapted or fine-tuned for ZYNTHEOR |
| `CORE_DISTILLED` | Derived through a documented distillation process |
| `EXTERNAL_PROVIDER` | Operated by an external provider |

**Current truth:** CORE Native training is `NOT_TRAINED`; no native checkpoint is verified and native inference is not production-ready.

> Deterministic logic, adapters and orchestration must never be represented as trained model intelligence. No silent model substitution.

## 4. Capabilities

| Domain | What it covers |
|---|---|
| General & Research | Conversation, online research, source comparison, synthesis |
| Reasoning | Logic, mathematics, analysis, decision support |
| Writing & Language | Writing, editing, Thai-English translation |
| Documents & Data | Document understanding, extraction, data interpretation |
| Planning & Creativity | Goal decomposition, scheduling, ideation |
| Technical | Programming, debugging, architecture analysis |
| Multimodal | Text, voice, images — only as supported by implemented models |

A UI element alone is not a capability. More: [docs/CAPABILITIES.md](docs/CAPABILITIES.md)

## 5. Security & Privacy

- Fail-closed policies, workspace isolation, path-traversal and sensitive-file protection
- Human approval gates, sandboxed execution, tamper-evident audit ledger
- Explicit user consent before any external provider is used

| Mode | Behavior |
|---|---|
| `ONLINE_FIRST` | Uses authorized online resources when user policy and consent allow |
| `HYBRID` | Combines online and local resources under user-defined policy |
| `LOCAL_ONLY` | Blocks external model and knowledge-provider requests |

Local-only is enforced at the backend and network boundary, not just shown in the UI. Any external service used for speech, inference or storage must be disclosed.

## 6. Development Status

| Area | Status | Evidence |
|---|---|---|
| Phase 1 — Memory & PostgreSQL | Reported verified | `ZYNTHEOR_PHASE1_PRODUCTION_ACCEPTANCE_REPORT.md`, `tests/memoryPersistence.test.ts` |
| Phase 2 — Knowledge pipeline | Reported verified | `ZYNTHEOR_PHASE2_KNOWLEDGE_ARCHITECTURE_REPORT.md`, `tests/knowledgeIntelligence.test.ts` |
| Phase 3 — Reasoning engine | Reported verified | `PHASE3_ARCHITECTURE_REPORT.md`, `tests/phase3Reasoning.test.ts` |
| CORE Native training | `NOT_TRAINED` | — |
| Global benchmarks | `NOT_EVALUATED` | [docs/BENCHMARKS.md](docs/BENCHMARKS.md) |

Statuses follow the linked reports; re-run the tests to confirm in your environment. A passing build or unit test does not prove model intelligence or real-world performance. Full table: [docs/VERIFICATION.md](docs/VERIFICATION.md)

## 7. Installation

Requires Node.js 20+, npm or bun, and Git.

```bash
git clone https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-.git
cd ZYNTHEOR_AI_ENGINE-
npm install
cp .env.example .env
npm run dev          # http://localhost:3000
```

```bash
npm run typecheck && npm run build
```

Test commands: [docs/VERIFICATION.md](docs/VERIFICATION.md)

## 8. Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Capabilities](docs/CAPABILITIES.md) · [Benchmarks](docs/BENCHMARKS.md) · [Verification](docs/VERIFICATION.md)
- [Contributing](CONTRIBUTING.md) · [Security Policy](SECURITY.md)
- [Multi-Workspace Security Spec](docs/multi_workspace_security_spec.md)
- [Phase 9 Operational Evaluation](docs/audit/CORE_X_OPERATIONAL_EVALUATION_WORKSPACE.md) · [Phase 8 Repository Intelligence Audit](docs/audit/CORE_X_PHASE_8_REPOSITORY_INTELLIGENCE.md)

## License

Distributed under **AGPL-3.0**. Third-party models, datasets, libraries and services keep their own licenses and attribution requirements.

<p align="center">
  <b>Built to Compete. Measured by Intelligence. Proven by Performance.</b><br /><br />
  <img src="public/zyntheor-buffalo-mark.svg" alt="ZYNTHEOR Buffalo Edition" width="76" height="76" />
</p>
