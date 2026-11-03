# P18 — Model Evolution & Lifecycle Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P18

## 1. Objective

Manage model versions, lineage, evaluation, promotion, rollback, and optional distillation under cryptographic provenance.

## 2. Existing components to reuse

Reuse `ModelIdentityRegistry`, model registry, checkpoint manifests, evaluation tooling, and deployment promotion controls.

## 3. Scope

- Immutable model versions and parent-child lineage.
- Checkpoint and tokenizer registry with signed provenance.
- Candidate evaluation and regression comparison.
- Canary deployment, staged promotion, and rollback.
- Optional distillation with teacher/student provenance and explicit CORE_DISTILLED identity.
- Retirement and reproducible restore.

## 4. Mandatory architecture and security contracts

- Released artifacts are immutable and content-addressed.
- Promotion requires benchmark thresholds and human approval.
- A model cannot promote itself.
- Distillation cannot be mislabeled CORE_NATIVE.
- Rollback must restore model, tokenizer, config, and routing as a coherent bundle.

## 5. Required verification

- Lineage tampering and signature failures.
- Promotion threshold rejection.
- Canary failure rollback.
- Identity mislabeling rejection.
- Restore and reproducibility tests.

## 6. Exit criteria

- Model lifecycle is auditable from dataset to production deployment.
- Promotion/rollback is tested and human-approved.
- No model status is advanced by metadata edits alone.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
