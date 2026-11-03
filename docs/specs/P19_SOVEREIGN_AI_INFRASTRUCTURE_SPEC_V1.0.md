# P19 — Sovereign AI Infrastructure Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P19

## 1. Objective

Operate the platform in local-first and air-gapped environments with controlled updates, resilient storage, secure observability, and reproducible deployment.

## 2. Existing components to reuse

Reuse Docker Compose, health/metrics endpoints, backup scripts, database migrations, Local-Only policy, and existing security/audit controls. Inspect actual deployment topology before changing it.

## 3. Scope

- Local-first deployment profile and explicit air-gap profile.
- Network egress allowlist and observable deny-by-default policy.
- Database durability, backup, restore drills, and disaster recovery.
- Secrets/key management, rotation, trust-store protection, and least privilege.
- SBOM, dependency provenance, signed release artifacts, and vulnerability response.
- Monitoring, alerting, resource budgets, and offline operations runbook.

## 4. Mandatory architecture and security contracts

- Air-gap mode has no external DNS/API dependency for core workflows.
- Telemetry is disabled or locally retained by explicit policy.
- Backups are encrypted where required, integrity-checked, and restore-tested.
- Secrets are not embedded in images, logs, reports, or public static assets.

## 5. Required verification

- Network isolation and egress-denial tests.
- Backup restore into isolated environment.
- Key rotation and revoked-key tests.
- Dependency/SBOM verification.
- Service recovery and data consistency under failure.

## 6. Exit criteria

- Air-gap acceptance suite passes on documented hardware.
- Restore drill meets declared RPO/RTO.
- Supply-chain and operational controls are evidenced.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
