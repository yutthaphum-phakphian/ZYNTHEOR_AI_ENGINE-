# ZYNTHEOR CORE X — P11–P20 Implementation Map

Date: 2026-11-03  
Baseline: current `ZYNTHEOR_AI_ENGINE_P16_NATIVE_CPU_PATCHED.zip` source tree.

## Integration rule

Reuse existing first-party modules; create only missing boundaries. Source presence is not phase acceptance. A phase is `PASS` only with current, reproducible tests and evidence bound to the source and artifact digests. Missing evidence is `NOT_VERIFIED` or `BLOCKED`.

| Phase | Existing foundation / implementation in this tree | Status policy |
|---|---|---|
| P11 Cognitive Reasoning | `lib/intelligence-core.ts`, `lib/intelligence-orchestrator.ts`, `src/services/crossFileReasoning.ts` | Existing foundation; end-to-end phase evidence NOT_VERIFIED |
| P12 Persistent Memory | `src/services/taskMemory.ts`, `workspaceMemory.ts`, `tenantScopedStorage.ts`, `tenantIsolation.ts`; P12 hardening in this patch | Hardened file-backed task memory; PostgreSQL/Cloud SQL ACID single-source-of-truth remains NOT_VERIFIED |
| P13 Multi-Agent | `lib/agent-orchestrator.ts`, `src/services/safeExecutor.ts`, tool gateway/verification in `lib/intelligence-core.ts` | Bounded DAG scheduling, dependency checks, worker registration, idempotency replay and human gates added; durable cross-restart idempotency and end-to-end app integration NOT_VERIFIED |
| P14 Evaluation-Driven Learning | `src/services/selfImprovementEngine.ts`; empty-history score corrected to NOT_EVALUATED | Heuristic experience scoring exists; benchmark-grade learning evaluation NOT_VERIFIED |
| P15 Governed Self-Improvement | `selfImprovementEngine.ts`, `patchApplier.ts`, `auditLedger.ts` | Proposal/approval foundations exist; end-to-end rollback/security acceptance NOT_VERIFIED |
| P16 Native Training | `training/native_cpu/*`, governed dataset gate, checkpoint registry | Pipeline implemented; actual training BLOCKED by provenance/review gate |
| P17 Native Inference | `training/native_cpu/native_runtime.py`, `lib/native-model-gateway.mjs` | Real load/generation path; NOT_READY until verified checkpoint exists |
| P18 Model Lifecycle | `lib/model-lifecycle.mjs`, hash-chained registry ledger | Lifecycle registry and approval/rollback boundaries implemented; promotion BLOCKED without P14/P16/P17 evidence |
| P19 Sovereign Infrastructure | `infra/sovereign/*`, `scripts/sovereign_infra.py` | Local-only policy and backup/restore verification implemented; air-gap and hardened container isolation NOT_VERIFIED |
| P20 Integrated Platform | `lib/corex-platform-gate.mjs` | Evidence-derived system gate implemented; release BLOCKED while upstream gates remain open |

## Shared invariants

- `CORE_NATIVE`, `CORE_ADAPTED`, and `CORE_DISTILLED` identities are distinct.
- Native weights must be random-initialized, independently trained, and checkpoint-digest verified.
- Memory retrieval never implicitly grants permission to use memory as training data.
- External inference requires explicit per-operation consent; local-only mode has no cloud fallback.
- Agents cannot approve their own proposed actions or bypass existing safety/tool controls.
- Model promotion and rollback require a human owner approval and append-only lifecycle evidence.
- Backups are integrity checked, not presumed encrypted or signed.
- No air-gap, production readiness, or successful training claim follows from configuration or source presence alone.
