# ZYNTHEOR CORE X — Remaining Blockers

1. **P21 migrations** — Add Drizzle migration configuration, versioned forward migrations, rollback strategy and PostgreSQL integration tests before changing persistence.
2. **P22 acceptance** — Verify Docker sandbox, path/symlink/sensitive-file protections, timeout/resource limits and emergency stop with integration tests.
3. **Regression triage** — Resolve the 16 failing tests without removing assertions or weakening security. Start with `tests/autonomous-intelligence-execution.test.mjs`, `tests/dataset-quality.test.mjs`, `tests/deployment-validation-and-gpu-training.test.mjs`, `tests/intelligence-runtime-integration.test.mjs`, `tests/p4-accounts-and-entitlements.test.mjs` and `tests/p8-core-intelligence-advancement.test.mjs`.
4. **Python reproducibility** — Provide an approved environment/lockfile containing the required Torch version, then rerun native unit tests and dataset validation.
5. **Dataset governance** — Record source/license/provenance and human approval for every sample and aggregate dataset before `native:cpu:train`.
6. **Native checkpoint** — Only after governance and training gates pass, create and register a real checkpoint with lineage/digest; never call an adapted or distilled model native.
7. **P19 sovereign mode** — Explicitly run and verify `ZYNTHEOR_LOCAL_ONLY=1`, air-gap behavior, container isolation, backup and restore; no silent cloud fallback.
8. **Browser E2E** — Start a controlled local server and verify registration, login, session revocation, tenant isolation, team management and workspace boundary flows.
9. **Release integrity** — Recompute SHA-256 manifest after final source changes and ensure package excludes dependencies, caches, workspace runtime data and secrets.

Until all applicable blockers are closed with current evidence, the release must remain `releaseApproved: false`.
