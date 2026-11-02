# Security Policy & Governance — ZYNTHEOR AI ENGINE

**Edition:** Buffalo Edition (1.2.2)  
**Status:** Active Security Governance | Cryptographic Hash Chain Baseline | Local-First Isolation | Native Core Evidence Hardening  
**Last Audited:** 2026-11-02

---

## 🛡️ Security Philosophy & Core Principles

ZYNTHEOR AI ENGINE is designed from the ground up for high-security, enterprise-grade, local-first engineering environments. Security, cryptographic provenance, and evidence integrity are not afterthought features; they are foundational architectural constraints.

### Key Safeguards
1. **Local-First Processing Standard**: By default, all code analysis, prompt execution, AST parsing, and task memory are processed locally on the operator's machine or self-hosted container deployment (`ZYNTHEOR_LOCAL_ONLY=true`, `HOST=127.0.0.1` or isolated container network).
2. **Server-Side Secret Isolation**: API Keys (e.g. `GEMINI_API_KEY`, `ZYNTHEOR_MODEL_API_KEY`, `TENANT_STORAGE_HMAC_SECRET`, `ZYNTHEOR_ACCESS_TOKEN`) are stored exclusively in server environment variables and proxied through Node Express endpoints (`/api/*`). Secrets are never exposed to browser client-side bundles or web state.
3. **Explicit Consent Gate for Remote APIs**: Outbound calls to external model providers require explicit user consent and server configuration (`ZYNTHEOR_LOCAL_ONLY=false`).
4. **Cryptographic Evidence Hashing**: Rationale, tool execution steps, and AST code modifications are linked into immutable SHA-256 hash chains (`lib/evidence-manager.ts` and `lib/governance-ledger.ts`) to prevent tampering or silent injection.
5. **Human-in-the-Loop Governance Gate**: Destructive operations (writing code patches, applying git commits, invoking system commands, restoring backups) require explicit human approval in the UI before execution.
6. **Strict No-Fake Model Integrity**: All native AI models, metrics, and training progress must correspond to real execution evidence. Simulated benchmarks, fake GPU readings, and unverified weights are prohibited.

---

## 🔒 Supported Versions

| Version Line | Status | Security Support |
| :--- | :--- | :--- |
| **Buffalo 1.2.x (Current - v1.2.2)** | 🟢 Active | Full security updates, native core audits, cryptographic ledger |
| **Buffalo 1.1.x** | 🟡 Maintenance | Critical security patches only |
| **< 1.0.0 (Legacy)** | 🔴 End-of-Life | Unsupported — upgrade recommended |

---

## 🚨 Reporting a Vulnerability

**Email**: `yuttaphumphakphian@gmail.com`  
**GitHub**: Open a private security advisory via repository settings.

**Include:**
- Vulnerability description and impact assessment
- Minimal reproduction steps (PoC script or HTTP request trace)
- Affected subsystem (Express Gateway, Token Verification, Evidence Ledger, Tenant Storage, Native Model Runtime)
- Environment context (OS, Node version, deployment target: Local / Docker / Render / Fly.io)

**SLA**:
- **Initial Response**: Within 24 hours
- **Triage & Assessment**: Within 48 hours
- **Critical Fix Release**: Within 7 business days

---

## 🔐 Security Architecture Details

### 1. Authentication & Token Verification
- `ZYNTHEOR_ACCESS_TOKEN` enforces Bearer token authentication on all sensitive endpoints (`/api/workspace/*`, `/api/chat`, `/api/settings`, `/api/diagnostics`, `/api/codebase/*`).
- When running in production (`NODE_ENV=production`), startup is blocked if `ZYNTHEOR_ACCESS_TOKEN` is unset or blank.
- Middleware sanitizes all workspace IDs and file paths using canonical path resolution to strictly prevent Path Traversal attacks (`../`).

### 2. Rate-Limiting & Containment
- In-memory rate limiters enforce request quotas on semantic search, prompt execution, and agent tooling to mitigate denial-of-service and abuse.
- Workspace file modifications execute within sandbox constraints and require manual approval before disk commits.

### 3. Cryptographic Verification & Audit Chain
- `FILE_MANIFEST.sha256`: Codebase baseline fingerprints are verified against disk contents.
- `verifyAuditHashChain()`: Validates cryptographic chaining for all governance events, preventing retroactive history alteration.
- `/api/evidence`: Real-time streaming audit endpoint for forensic analysis.

### 4. Tenant Isolation & Backup Integrity
- **Zero Client Trust**: `principal.tenantId` is derived exclusively from verified server session tokens, never from client body or URL queries.
- **Atomic Tenant Storage**: `tenantScopedStorage.ts` performs atomic write patterns (write to temporary file $\to$ `fsync` $\to$ rename) to prevent partial write corruption.
- **Quarantine Safeguard**: Legacy records without a valid `tenantId` are isolated as `unclassified: true, quarantineStatus: quarantine_non_secret` and excluded from default queries.
- **Signed Backups**: Backup format v1.0 enforces SHA-256 integrity check and HMAC-SHA256 signature verification using `TENANT_STORAGE_HMAC_SECRET`.
- **Restore Authorization**: Only authorized workspace owners can initiate restore procedures. Cross-tenant restorations are hard-blocked and logged.

### 5. Native Model & Training Provenance Governance (P5.2 Hardened)
- **Zero External Foundation Weights**: All native weights are trained from scratch with deterministic seed control (`SEED = 42`).
- **Data Leakage Immunity**: Strict document-level SHA-256 partition (14 train, 3 val, 3 test) ensures held-out evaluation sets are never exposed to tokenizer training or backpropagation.
- **Checkpoint Cryptographic Fingerprint**: Native checkpoints (e.g. `p5_2_checkpoint_full.npz`, SHA-256 `25781542f18591134d4d83618c8a8f3d2cdf958c07b0f89ece0c6c0991047c67`) are verified prior to loading, guaranteeing output reproducibility (`diff: 0.0`) and parameter finiteness.

---

## 🛠️ Best Practices for Operators

1. **Local Deployments**: Run with default `.env` (`HOST=127.0.0.1`, `ZYNTHEOR_LOCAL_ONLY=true`).
2. **Cloud & PaaS (Render, Fly.io, Self-Hosted Docker)**:
   - Always set `HOST=0.0.0.0` and enforce HTTPS at the reverse proxy / cloud load balancer.
   - Configure a strong, unpredictable `ZYNTHEOR_ACCESS_TOKEN` (Render `generateValue: true` handles this automatically).
   - Set `TENANT_STORAGE_HMAC_SECRET` to secure multi-tenant storage signatures.
   - Restrict network egress when operating in air-gapped or confidential computing setups.
3. **Audit Monitoring**: Periodically inspect `/api/evidence` and `/api/health` to confirm hash-chain continuity and runtime integrity.
