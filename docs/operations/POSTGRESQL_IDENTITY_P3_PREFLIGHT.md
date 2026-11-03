# PostgreSQL Identity — P3 Cutover Preflight

**Current status:** `BLOCKED_PENDING_DATABASE_CONNECTION`. The owner correction is approved for an import projection only and validated against the exact original source-file hashes. No live PostgreSQL endpoint is configured; no P1/P2 migration, database import, authentication integration or identity cutover has been performed.

## Source conflict and recorded approval

The original JSON contains 7 users, 7 organizations, 7 memberships, and 8 sessions. Its owner inconsistency is: organization `org-usr-3` has `ownerId=3`; sole membership `mem-3-org-usr-3` belongs to user `3` with role `ADMIN`; the organization has zero `OWNER` memberships.

The user explicitly self-attested as authorized and approved only this correction: project `mem-3-org-usr-3` from `ADMIN` to `OWNER`, preserve `organizations.ownerId=3`, and leave all four original JSON files unchanged. Approval record: `chat-p3-owner-override-org-usr-3-2026-11-04-0019`, stored at `workspace_data/identity/migration-overrides/approved-owner-corrections.json` (private, mode 0600; parent directory mode 0700). The approval record does not claim independent identity verification.

The importer validates four exact source SHA-256 hashes, the organization/member IDs, expected owner pointer, current role, and zero prior OWNER memberships. It changes a deep-copied in-memory import projection only. The canonical source digest and exact override-file digest are both incorporated into the idempotency key. Hash/value mismatch blocks the projection. Pre-import backups are written from the same byte snapshots used for validation. The importer checks the source/override hashes before database work and before commit; original JSON is never rewritten.

## P3 tools and evidence

- `scripts/identity-import-projection.mjs`: shared hash-bound projection and source-snapshot verification.
- `scripts/migrate-identity-json.mjs`: applies the approved projection in memory, retains both raw-source and projected conflict reports, backs up original bytes plus the override, and imports only the validated projection.
- `scripts/postgres-preflight.mjs` / `npm run db:preflight`: read-only P1/P2 connection, schema, migration-checksum, record-count, duplicate, FK, owner and session-tenant checks. It uses a bounded `BEGIN READ ONLY` transaction and performs no DDL/DML.

`npm run db:preflight` now reports `BLOCKED_PENDING_DATABASE_CONNECTION`, `DATABASE_URL_NOT_CONFIGURED`, and `writesPerformed: false`. It records the original JSON conflicts, zero projected conflicts, and the one approved `ADMIN → OWNER` projection with `ownerId=3` preserved.

`npm run db:identity:dry-run` returned `BLOCKED_PENDING_DATABASE_CONNECTION`, with `conflicts: []`, `overrideValidationErrors: []`, and `sourceSnapshotVerified: true`. It created a private byte-for-byte pre-import backup at:

`workspace_data/identity/backups/p2-2026-11-03T17-27-52-221Z-3d2a88c0f49b`

The four JSON files' SHA-256 values matched before and after the dry-run. Since there is no PostgreSQL endpoint, this run could not check existing database duplicates/counts, apply P1/P2, or test transactions; it is not a live database pass.

## Final verification

- P1 focused tests: **4 passed, 0 failed**.
- P2 focused tests: **6 passed, 0 failed, 1 real-PostgreSQL test skipped**.
- P3 focused tests: **3 passed, 0 failed**.
- Full `npm test`: Node **472 passed, 0 failed, 2 skipped** (474 total); Vitest **276 passed across 33 files**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**, with existing Node-core externalization and large vendor-chunk warnings.
- Full regression confirmed the four original JSON SHA-256 hashes remained unchanged.
- Live PostgreSQL integration: **NOT RUN**; `DATABASE_URL` and `P2_TEST_DATABASE_URL` are absent.

## Remaining gates

1. Configure a real, isolated PostgreSQL test endpoint and pass the read-only connection/schema/checksum/integrity preflight.
2. Apply P1/P2 only on that test endpoint; run actual PostgreSQL migration, rollback, transaction, authentication, CSRF, revocation and tenant-isolation tests.
3. Re-run dry-run against that endpoint to verify database duplicates and record counts; only then review transactional import and before/after FK/count checks.
4. Production identity import/cutover needs a separate explicit authorization. This P3 approval is **not** production cutover authorization.
5. Preserve original JSON and private backups until every acceptance gate passes.

At the user's explicit request, the final ZIP includes every file under `workspace_data/identity` (32 files, 87,801 bytes at inventory time): all five current JSON files, all six backup directories and the approved override record. One historical backup (`p2-2026-11-03T16-48-32-402Z-5ab70f057fa4`) contains test-generated 25/25/25/29 records; it is included for completeness but is **not** a migration source. The original root JSON and the later preflight backups match the preserved source snapshot. Project files are placed directly at the ZIP root (no enclosing `work/` folder), so extracting into the Codespaces repository root places `package.json` there. Unrelated workspace data, environment secrets, external credential files, dependencies and build output are excluded; the requested identity bundle does contain password hashes, session token hashes and profile records, so store it securely. No cutover or live database success is claimed.
