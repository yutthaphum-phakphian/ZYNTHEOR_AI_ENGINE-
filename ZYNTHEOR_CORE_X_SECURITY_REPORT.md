# ZYNTHEOR CORE X — Security Report

## Verified controls

- Production startup requires `ZYNTHEOR_ACCESS_TOKEN`.
- API routes apply session/tenant middleware and access checks.
- Workspace routes have a dedicated auth gate.
- Local-only policy blocks remote providers without explicit consent.
- Native gateway never downloads models and now suppresses Python traceback/local-path leakage on missing runtime dependency.
- Audit/evidence and human-approval concepts are present; platform gate denies release when evidence is missing.
- `.env.example` contains placeholders only; no real credentials were included in release.

## Findings

### SEC-001 — PostgreSQL persistence not operationally complete
Severity: High. `src/db/schema.ts` defines PostgreSQL tables, but no migration directory or Drizzle migration configuration was found. Do not switch production persistence until forward migration, rollback, backup and restore verification exist.

### SEC-002 — Sovereign preflight is blocked
Severity: High. `npm run corex:p19:preflight` returned `BLOCKED`, with local-only not explicitly enabled and air-gap/container isolation not verified. Local-only mode must never silently fall back to cloud.

### SEC-003 — Native runtime dependency is unavailable
Severity: Medium/High. Torch is not installed, so P17 probe/training cannot execute. The gateway now fails closed with a stable status/error instead of leaking a traceback.

### SEC-004 — Regression suite is not green
Severity: High. 16 failures remain. These include tenant fixture setup, memory isolation, provider availability, evidence expectations and dataset-version assertions. Release approval must remain false.

### SEC-005 — Browser E2E not verified
Severity: Medium. Authentication/team/workspace UI exists, but no running browser/server E2E acceptance evidence was produced in this run.

## Release decision

**BLOCKED — not production ready.**
