# Identity Storage & Credential Hardening — 2026-11-03

## Implemented in this patch

1. **Fail-closed identity-state loading**
   - `users.json`, `sessions.json`, `organizations.json`, and `organization_members.json` must parse as JSON arrays.
   - A malformed file or unexpected top-level shape now stops IdentityService initialization with a file-specific error.
   - Corrupt state is no longer silently treated as an empty identity database, preventing a subsequent registration from overwriting the in-memory view of existing accounts.

2. **Atomic per-file persistence**
   - Writes use unique temporary files with exclusive creation and restrictive `0600` permissions.
   - The temporary file is flushed and renamed into place; failed writes clean up their temporary file and propagate the error.
   - This is atomic per file, not a cross-file transaction. PostgreSQL/ACID migration remains required before multi-instance production use.

3. **Password work-factor upgrade**
   - New password hashes use versioned `pbkdf2-sha512$310000$<hex>` encoding.
   - Existing unversioned 10,000-iteration PBKDF2-SHA512 hashes remain verifiable.
   - After a successful legacy login, the password hash is upgraded and persisted using the current work factor.
   - Malformed, unsupported, or out-of-range hash encodings fail verification.

4. **Authentication rate-limit source hardening**
   - Authentication throttling and login IP metadata no longer trust caller-controlled `X-Forwarded-For` values.
   - The direct socket address is used until an explicit trusted-proxy policy is configured.
   - Expired rate-limit entries are periodically pruned when the in-memory map grows.

## Verification performed

- Native CPU / runtime Python tests: **12/12 PASS**.
- Dataset validation: **PASS** (15 samples; train 8, validation 3, test 4).
- P13 multi-agent coordinator tests: **7/7 PASS**.
- P18 lifecycle ledger verification: **PASS** (empty ledger verified; no model promoted).
- P17 runtime probe: **MODEL_NOT_FOUND**, expected because no approved native checkpoint exists.
- P19 preflight: **BLOCKED**; Local-Only was not explicitly enabled and air-gap/container isolation remain unverified.
- P20 platform gate: **BLOCKED**, expected while upstream gates remain open.
- Python compileall: **PASS**.
- Runtime smoke test using Node 22 type stripping: **PASS** for versioned hash, legacy hash verification and automatic upgrade, registration/session validation.
- Corrupt identity JSON startup test: **PASS**; initialization fails closed.
- Full TypeScript typecheck/build: **NOT VERIFIED** because `@types/node`, `vite/client`, and project dependencies are absent. No dependencies were installed.
- Browser E2E and multi-process/concurrent-write tests: **NOT VERIFIED**.

## Remaining production requirements

- Move identity, membership, and session state to PostgreSQL with migrations, transactions, unique constraints, and multi-instance concurrency tests.
- Replace browser-readable bearer-token storage with Secure, HttpOnly, SameSite cookies and a CSRF defense before public internet deployment.
- Use a shared rate limiter (database/Redis/edge) for multi-instance deployments and configure trusted proxies explicitly.
- Add session rotation, password reset, email verification, account recovery, and session/device management workflows.
- Add an explicit audited owner-transfer workflow; generic role editing intentionally cannot create or demote an OWNER.
- Complete dependency-backed typecheck, build, API integration tests, and browser E2E.

## Status

`SOURCE_PATCHED_WITH_RUNTIME_SMOKE_EVIDENCE`; **not a production security certification**. Existing JSON identity state must be backed up before upgrading. Corrupt identity files now stop startup and require owner-led recovery; do not delete or recreate them to bypass the guard.
