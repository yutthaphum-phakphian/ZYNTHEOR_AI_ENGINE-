# ZYNTHEOR CORE X — Regression Change Audit Trail

## Base and preservation

The work continued from `ZYNTHEOR_CORE_X_FULL_INTEGRATED_RELEASE.zip` in `/home/ubuntu/workspaces/zyntheor-core-x-regression`. The original workspace was preserved. Runtime state, dependencies and build output were excluded from the release package.

## Source changes

`src/services/taskMemory.ts` now keeps anonymous reads and anonymous clears fail-closed for user-owned records, while explicit admin/sovereign authority is required for destructive workspace cleanup. `src/services/projectContextEngine.ts` prioritizes an exact current source path over legacy snapshots. `lib/intelligence-orchestrator.ts` prevents remote environment leakage into local-only fallback and accepts only loopback fallback endpoints. `.env.example`, `.gitignore`, and `server.ts` received the secure defaults, artifact policy and access-route grouping changes described in the earlier audit.

## Contract migrations

The following test changes were made as explicit contract migrations rather than assertion suppression. Dataset tests now accept the current signed manifest version `1.3.1` while retaining all schema, digest, split, leakage and quality checks. The P4 tenant test registers an actual owner and verifies membership in its generated `org-usr-N` tenant instead of recreating `org-default`. The legacy task-memory test supplies explicit requester/admin context so it no longer conflicts with P12 anonymous-read fail-closed policy. Two TypeScript suites now import `describe`/`it` from Vitest, matching the runner used by `npm test`. Repair lifecycle verification locates the repair event by action while preserving the latest approval event at index 0.

## Evidence

Baseline: 443/460 passed, 16 failed, 1 skipped.
Current Node suite: 459/460 passed, 0 failed, 1 skipped.
Current Vitest suite: 33 files, 276 passed, 0 failed.
TypeScript typecheck: PASS.

## Safety decisions

No native checkpoint was created. No dataset was downgraded. No predictable bootstrap tenant was recreated. No production deployment was attempted. Regression green does not imply PostgreSQL migration, native runtime, dataset human approval, sovereign air-gap, or platform gate completion.
