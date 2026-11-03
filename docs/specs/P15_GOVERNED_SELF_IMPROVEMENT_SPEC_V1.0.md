# P15 — Governed Self-Improvement Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P15

## 1. Objective

Allow ZYNTHEOR to propose and validate improvements while preserving human control over source, policy, models, and releases.

## 2. Existing components to reuse

Reuse self-improvement proposal APIs, patchApplier, SafeExecutor, ExecutionGateway, approval FSM, audit ledger, and rollback support. Audit each existing mutation path before connecting it.

## 3. Scope

- Observe → evaluate → identify weakness → propose bounded change.
- Generate exact diffs and impact analysis.
- Run isolated tests and security checks against a clean worktree snapshot.
- Compare baseline and candidate using frozen benchmarks.
- Require human approval for applying changes and promoting artifacts.
- Atomic apply, post-apply verification, and tested rollback.

## 4. Mandatory architecture and security contracts

- Agent may propose but never self-approve.
- Only approved exact diff digest can be applied.
- No direct writes outside approved patch gateway.
- Rollback data is captured before mutation.
- Failed or inconclusive verification blocks promotion.

## 5. Required verification

- Diff tampering after approval.
- Approval replay and expiry.
- Test failure rollback.
- Concurrent proposal conflicts.
- Emergency stop during apply.
- Audit chain continuity.

## 6. Exit criteria

- Proposal-to-rollback lifecycle is tested end to end.
- Approval binds to exact diff and target revision.
- No autonomous source/model release without human approval.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
