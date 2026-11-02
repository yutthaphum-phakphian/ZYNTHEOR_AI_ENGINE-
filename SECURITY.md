# Security Policy & Governance — ZYNTHEOR AI ENGINE

**Edition:** Buffalo Edition (1.2.x)  
**Status:** Active Security Governance | Cryptographic Hash Chain Baseline | Local-First Isolation

---

## 🛡️ Security Philosophy & Core Principles

ZYNTHEOR AI ENGINE is designed from the ground up for high-security, enterprise-grade, local-first engineering environments. Security and evidence integrity are not afterthought features; they are foundational constraints embedded into the execution architecture.

### Key Safeguards
1. **Local-First Processing Standard**: By default, all code analysis, prompt execution, and task memory are processed locally on the operator's machine or self-hosted deployment.
2. **Server-Side Secret Isolation**: API Keys (e.g. `GEMINI_API_KEY`, `ZYNTHEOR_MODEL_API_KEY`, `TENANT_STORAGE_HMAC_SECRET`, `BILLING_WEBHOOK_SECRET`) are stored exclusively in server environment variables (`.env`) and proxied through Node Express endpoints (`/api/*`). Secrets are never exposed to browser client-side bundles or web state.
3. **Explicit Consent Gate for Remote APIs**: Any fallback or outbound calls to external model providers require explicit user consent and configuration (`ZYNTHEOR_LOCAL_ONLY=false`).
4. **Cryptographic Evidence Hashing**: Rationale, tool execution steps, and AST code modifications are linked into immutable SHA-256 hash chains (`lib/evidence-manager.ts` and `lib/governance-ledger.ts`) to prevent tamper or silent injection.
5. **Human-in-the-Loop Governance Gate**: Destructive operations (writing code patches, applying git commits, invoking system commands, restoring backups) require explicit human approval in the UI before execution.

---

## 🔒 Supported Versions

| Version Line | Status | Security Support |
| :--- | :--- | :--- |
| **Buffalo 1.2.x (Current)** | 🟢 Active | Full security updates & cryptographic audits |
| **Buffalo 1.1.x** | 🟡 Maintenance | Critical security patches only |
| **< 1.0.0 (Legacy)** | 🔴 End-of-Life | Unsupported — upgrade recommended |

---

## 🚨 Reporting a Vulnerability

**Email**: `yuttaphumphakphian@gmail.com`  
**【entity-GitHub¦canonical_name=GitHub】**: Open a private security advisory

**Include:** Description, Reproduction Steps, Affected Subsystem (Express API Gateway, Token Verification, Evidence Hash Ledger, Tenant Storage), Environment Context.

**SLA:** Initial Response 24h, Triage 48h, Critical Fix 7 business days.

---

## 🔐 Security Architecture Details

### 1. Authentication & Token Verification
- `ZYNTHEOR_ACCESS_TOKEN` enables Bearer protection for `/api/workspace/*`, `/api/chat`, `/api/settings`, `/api/diagnostics`
- Middleware sanitizes workspace IDs and file paths against traversal

### 2. Rate-Limiting & Containment
- In-memory rate limiters (429), sandboxed execution with truncation

### 3. Cryptographic Verification & Audit Chain
- `FILE_MANIFEST.sha256` + `verifyAuditHashChain()` + `/api/evidence`

### 4. Tenant Isolation & Backup Integrity (Patch 3-6)
- **Zero Client Trust**: `principal.tenantId` from verified server session only, never from query/body
- **Persistence**: `tenantScopedStorage.ts` atomic write (tmp + fsync + rename) to `workspace_data/projects.json`, scoped APIs `findByTenant / createForTenant / updateForTenant / deleteForTenant`
- **Quarantine**: Legacy records without tenantId marked `unclassified:true, quarantineStatus: quarantine_non_secret`, excluded from normal queries, manual classification with audit log via `getQuarantinedLegacyProjects / classifyLegacyProject`
- **Backup Format v1.0**: `formatVersion, tenantId, createdAt, createdBy, sourceRevision, recordCount, schemaVersion, SHA-256 integrity + HMAC-SHA256 signature`
- **Restore Policy**: `backup:create` → owner+admin, `backup:restore` → owner only (admin denied), cross-tenant restore blocked with explicit audit log, staging isolated + atomic promotion, rollback verified
- **Active Workspace Isolation**: `Map<userId, ActiveWorkspace>` prevents leakage between users

---

## 🛠️ Best Practices for Operators
1. Keep `.env` private, use `.env.example` with `ZYNTHEOR_LOCAL_ONLY=true` and `HOST=127.0.0.1`
2. Enable `ZYNTHEOR_ACCESS_TOKEN` when `HOST=0.0.0.0` — do not expose it directly to the internet
3. Review Audit Ledger and Diagnostics panels regularly
4. Set `TENANT_STORAGE_HMAC_SECRET` and `BILLING_WEBHOOK_SECRET` in production env
