# ZYNTHEOR CORE X — Finalization & Release Gate

Generated from the supplied `ZYNTHEOR_CORE_X_WORKSPACE_STUDIO_UPGRADE` source package.
This document is an evidence-based handoff, not a claim that blocked work has been completed.

## Product direction

ZYNTHEOR is a first-party AI engineering platform. `CORE_NATIVE` is the primary long-term model identity. Third-party model weights must never be merged into or relabeled as CORE_NATIVE. If retained for compatibility or comparison, adapted/distilled models must remain separately identified, policy-gated, and clearly labeled.

## Workspace map

| Area | Required operational contract | Release status |
|---|---|---|
| AI Workspace | Chat, Projects, Files and Repository Intelligence share the active workspace context; file operations use server-side path validation and authorization. | IMPLEMENTED_NOT_VERIFIED — browser E2E not run |
| CORE Model Studio | Dataset provenance/validation, tokenizer, architecture config, training jobs, checkpoints, registry and inference share immutable run/checkpoint lineage. | BLOCKED — approved dataset governance, Torch environment and native checkpoint absent |
| Agent Command Center | Planner → Agent → Tool Gateway → human approval → isolated sandbox → verification → audit ledger. No execution bypasses approval/policy. | IMPLEMENTED_NOT_VERIFIED — sandbox acceptance and full integration evidence incomplete |
| Memory Center | Exposes only supported memory classes, scoped by authenticated user and workspace; destructive actions require explicit confirmation and audit. | PARTIAL — Task Memory view exists; full persistence/isolation acceptance incomplete |
| Evaluation Lab | Runs reproducible benchmarks against identified model/checkpoint versions; stores raw results, environment, dataset version and regression comparisons. | PARTIAL — engine exists; end-to-end acceptance and human approval/rollback evidence incomplete |
| CI/CD | Remains in the sidebar; release status must come from actual workflow/build evidence. | PRESERVE EXISTING |

## Mandatory model identity rules

- `CORE_NATIVE`: architecture and weights trained by the ZYNTHEOR project from approved, provenance-tracked data. Must have a reproducible training run, checkpoint digest, model config, tokenizer identity, evaluation report and registry entry.
- `CORE_ADAPTED`: third-party base weights modified by fine-tuning/adapters. Record upstream model, license, adapter/checkpoint digest and modifications. Never present as native.
- `CORE_DISTILLED`: student model produced through a documented distillation process. Record teacher identity, data/permission basis and student lineage. Never present as native.
- A model is not `TRAINED` merely because a config, script, UI panel, Ollama tag or registry placeholder exists.
- Missing runtime, weights, API or evaluation evidence must render as `UNKNOWN`, `NOT READY` or `BLOCKED`, not a green success state.
- No silent cloud fallback. Local-only mode must fail closed.

## Release blockers carried forward from the source audit

1. P21: versioned Drizzle/PostgreSQL migrations, rollback and PostgreSQL integration evidence.
2. P22: Docker sandbox acceptance, resource/time limits, path/symlink/sensitive-file tests and emergency-stop verification.
3. Regression: 16 failing tests in the source report. Fix root causes; do not delete tests or weaken assertions.
4. Native training: approved reproducible Python/Torch environment, dataset provenance and human approval.
5. Native model: real checkpoint plus digest, lineage and evaluation before changing `CORE_NATIVE` from `NOT_TRAINED`.
6. Sovereign mode: explicit local-only, air-gap, container isolation, backup and restore verification.
7. Browser E2E: auth/session revocation, tenant isolation, team and workspace boundary tests.
8. Release integrity: regenerate SHA-256 manifest after source changes; exclude secrets, caches, runtime workspace data and dependencies.

## Acceptance sequence

1. Reproduce the reported TypeScript and Vite build in a clean, locked environment.
2. Triage all 16 known failing tests and rerun the complete suite.
3. Run P21/P22 integration and security acceptance tests.
4. Run browser E2E for the five primary work areas.
5. Validate dataset governance and hardware preflight; do not start training until both pass.
6. Train and evaluate a real native checkpoint; register it only after all quality gates pass.
7. Verify local-only/air-gap behavior and restore from backup.
8. Generate final hashes and issue release approval only when every mandatory gate passes.

## Current evidence summary

The source package's `ZYNTHEOR_CORE_X_IMPLEMENTATION_REPORT.md` reports TypeScript and Vite build passing in its prior run, 443 passed / 16 failed / 1 skipped across 460 discovered tests, and `CORE_NATIVE` still `NOT_TRAINED`. These are inherited report claims and were not rerun in this packaging environment. Dependencies are not installed in the extracted source, so this run performed archive integrity and source inspection only. No migrations, destructive data operations, deployment, or model training were performed.

**Release decision: NOT APPROVED.** This is intentional fail-closed behavior until the blockers above are closed with fresh evidence.
