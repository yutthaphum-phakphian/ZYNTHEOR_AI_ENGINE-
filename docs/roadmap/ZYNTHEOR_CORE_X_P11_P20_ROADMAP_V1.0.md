# ZYNTHEOR CORE X — P11–P20 Roadmap v1.0

**Status:** PROPOSED / SPECIFICATION BASELINE  
**Date:** 2026-11-03  
**Scope:** P11 through P20  
**Rule:** This roadmap defines target capabilities and gates. It does not certify implementation.

## Product objective

Evolve ZYNTHEOR from a workspace-aware engineering assistant into a sovereign intelligence platform whose model lifecycle, reasoning, memory, agents, execution, and evidence remain under first-party governance.

## Phase sequence

| Phase | Name | Primary outcome | Depends on |
|---|---|---|---|
| P11 | Cognitive Reasoning Engine | Structured reasoning, planning, critique, and evidence-linked conclusions | P8 orchestration, P9 workspace context, verified P5/P6/P7/P8 gates |
| P12 | Persistent Memory 2.0 | Tenant-isolated, durable, provenance-aware memory with transactional persistence | P11 contracts; existing MemoryManager/VectorMemory audit |
| P13 | Multi-Agent Intelligence | Reliable agent graph, task leases, idempotency, bounded delegation, shared verification | P11 + P12 + ExecutionGateway |
| P14 | Evaluation-Driven Learning | Feedback and experience become curated, benchmarked learning signals | P11–P13 |
| P15 | Governed Self-Improvement | System proposes, tests, approves, applies, and rolls back improvements under human control | P14 + P8 approval + P13 execution |
| P16 | Native Model Training | Reproducible first-party pretraining from random initialization | P10 architecture + P14 data governance + hardware readiness |
| P17 | Native Inference Runtime | First-party model loading, tokenization, generation, serving, and runtime verification | P16 artifacts |
| P18 | Model Evolution & Lifecycle | Versioning, evaluation, promotion, rollback, distillation, lineage | P16 + P17 |
| P19 | Sovereign AI Infrastructure | Local-first/air-gap operations, secure deployment, backups, observability, key and supply-chain governance | P12 + P13 + P17 + P18 |
| P20 | Integrated Sovereign Intelligence Platform | End-to-end, policy-governed, evidence-backed product release | P11–P19 |

## Dependency graph

```text
P11 Cognitive Reasoning
  └── P12 Persistent Memory 2.0
       └── P13 Multi-Agent Intelligence
            └── P14 Evaluation-Driven Learning
                 └── P15 Governed Self-Improvement

P10 Native Architecture ───────┐
P14 Data Governance ───────────┼── P16 Native Training
                               └── P17 Native Inference
                                      └── P18 Model Evolution
P12 + P13 + P17 + P18 ──────────────── P19 Sovereign Infrastructure

P11 + P12 + P13 + P14 + P15 + P16 + P17 + P18 + P19
                                      └── P20 Integrated Platform
```

P16 may begin architecture and data-readiness work before P15 is complete, but actual training runs must not consume unapproved or unprovenanced data. P19 design can proceed in parallel, but production acceptance depends on the model and memory interfaces being stable.

## Existing capability reuse

The uploaded archive already contains relevant foundations:
- Reasoning/orchestration: `lib/intelligence-orchestrator.ts`, `lib/intelligence-core.ts`, `src/services/crossFileReasoning.ts`.
- Memory: `src/server/MemoryManager.ts`, `src/services/VectorMemory.ts`, `src/services/taskMemory.ts`.
- Agents: `src/server/MultiAgentOrchestrator.ts`, `src/agents/*`, `src/server/AgentOrchestrator.ts`.
- Execution governance: `src/services/ExecutionGateway.ts`, `src/infrastructure/SandboxAdapter.ts`, `src/services/auditLedger.ts`.
- Learning/self-improvement: `src/services/selfImprovementEngine.ts`.
- Native model: `src/native/TrainingEngine.ts`, `src/native/SmallScaleModel.ts`, `src/native/ModelIdentityRegistry.ts`, `lib/native-model-runtime.ts`, `src/native/scaling/base_model.py`, `scripts/p10_scale_train.py`.

Do not create duplicate engines until these components have been inspected and mapped.

## Universal phase gate

Every phase must produce:
1. A frozen specification and threat model.
2. Source implementation integrated with existing services.
3. Unit, integration, regression, and security tests appropriate to the phase.
4. Reproducible evidence with run ID, source revision, configuration digest, and artifact hashes.
5. A report whose status is derived from evidence, not manually typed.
6. A rollback plan for stateful or mutating changes.
7. Human approval for consequential operations and releases.

Allowed statuses: `PASS`, `FAIL`, `ERROR`, `BLOCKED`, `NOT_VERIFIED`, `SKIPPED`.  
A phase is `PASS` only when all mandatory gates pass. Missing evidence is never PASS. A downstream phase cannot open when a required upstream gate is not PASS.

## Non-negotiable product invariants

- Local-only mode has no silent cloud fallback.
- External inference requires explicit, per-operation consent.
- Workspace and tenant isolation are enforced server-side.
- Retrieved memory is not training data by default.
- No model can approve its own proposed actions.
- No agent may bypass the Execution Gateway, sandbox, policy checks, or audit ledger.
- Native model identity distinguishes `CORE_NATIVE`, `CORE_ADAPTED`, and `CORE_DISTILLED`.
- A model is not `TRAINED`, `EVALUATED`, or `RELEASED` based only on architecture, parameter count, checkpoint existence, or a self-declared manifest.
- No P20 production-ready claim without reproducible deployment, recovery, security, and operational evidence.

## Delivery strategy

Implement in order P11 → P20, but keep the codebase usable at each checkpoint. Prefer small vertical slices over a large rewrite. Preserve existing user changes, manifests, datasets, checkpoints, and reports. Never use destructive Git operations.
