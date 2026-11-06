# Security Policy & Governance — ZYNTHEOR AI ENGINE

**Repository:** `https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-.git`  
**Edition:** Buffalo Edition (`v1.3.1_LTS_GOLD_MASTER` / `1.3.1-clean-first-party`)  
**Status:** Active Security Governance · Cryptographic Hash Chain Baseline · Fail-Closed Local-First Isolation

---

## 🛡️ Security Philosophy & Core Principles

ZYNTHEOR AI ENGINE is designed from the ground up for high-security, enterprise-grade, local-first engineering and universal intelligence environments. Security, privacy, and evidence integrity are not afterthought features; they are foundational invariants embedded into the execution architecture.

### Key Safeguards
1. **Local-First Processing Standard**: By default, all code analysis, prompt execution, and task memory are processed locally on the operator's machine or self-hosted deployment (`ZYNTHEOR_LOCAL_ONLY=true`).
2. **Server-Side Secret Isolation**: API Keys (e.g. `GEMINI_API_KEY`, `ZYNTHEOR_MODEL_API_KEY`, `TENANT_STORAGE_HMAC_SECRET`, `BILLING_WEBHOOK_SECRET`) are stored exclusively in server environment variables (`.env`) and proxied through Node Express endpoints (`/api/*`). Secrets are never exposed to browser client-side bundles or web state.
3. **Explicit Consent Gate for Remote Data**: Any outbound calls to external services or Internet Gateways require explicit user consent (`onlineConsent=true`). The Internet Gateway functions strictly as a data retrieval mechanism, never as the model provider.
4. **Cryptographic Evidence Hashing**: Rationale, tool execution steps, and AST code modifications are linked into immutable SHA-256 hash chains (`src/services/auditLedger.ts`) anchored to Genesis Block #849202 and Merkle Root `909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68`.
5. **Human-in-the-Loop Governance Gate**: Destructive operations (writing code patches, applying git commits, invoking system commands, restoring backups) require explicit human approval in the UI before execution (`Fail-Closed` invariant).
6. **10 Control Center Governance Categories**: My Profile, General, Intelligence Settings, Model & Runtime, Knowledge & Memory, Security & Privacy, Workspace, Notifications, System Configuration (Admin Gated), and About ZYNTHEOR.

---

## 🔒 Supported Versions

| Version Line | Status | Security Support |
| :--- | :--- | :--- |
| **v1.3.1 LTS (Current Gold Master)** | 🟢 Active | Full security updates, PQC ML-DSA-87, & cryptographic audits |
| **v1.2.x (Buffalo Edition)** | 🟢 Supported | Cryptographic audit support & maintenance patches |
| **v1.1.x** | 🟡 Maintenance | Critical security patches only |
| **< 1.0.0 (Legacy)** | 🔴 End-of-Life | Unsupported — clean migration required |

---

## 🚨 Reporting a Vulnerability

**Security Email**: `yuttaphumphakphian@gmail.com` / `hugeplease66@gmail.com`  
**GitHub Security**: Open a private security advisory on [`yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-`](https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-)

**Please Include:**
- Description of the vulnerability and attack vector
- Reproduction steps and proof of concept
- Affected subsystem (Express API Gateway, Token Verification, Evidence Hash Ledger, Tenant Isolation, or Sandbox)
- Environment context (Node.js version, platform, host binding)

**SLA:** Initial response within 24 hours, triage within 48 hours, critical security fix within 7 business days.

---

## 🔐 Security Architecture Details

### 1. Authentication & Token Verification
- `ZYNTHEOR_ACCESS_TOKEN` enables Bearer protection for `/api/workspace/*`, `/api/chat`, `/api/settings`, `/api/diagnostics`, `/api/intelligence/analyze`.
- Request sanitizers validate tenant contexts and neutralize directory traversal attacks.

### 2. Rate-Limiting & Containment
- In-memory sliding window rate limiters (429 Too Many Requests).
- Isolated Node.js VM context execution with strict blocklists (`process`, `eval`, `child_process`).

### 3. Cryptographic Verification & Audit Chain
- Canonical Merkle Root: `909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68` (Genesis #849202).
- Post-Quantum Cryptography: NIST FIPS 203/204/205 ML-DSA-87 + SPHINCS+.
- Legal Compliance: ETDA B.E. 2544 Sec 9/26/28, PDPA B.E. 2562 Sec 37, NCSA CII Act.

### 4. Tenant Isolation & Storage Integrity
- **Zero Client Trust**: `principal.tenantId` derived strictly from verified server sessions.
- **Persistence**: Atomic file writes (tmp + fsync + rename) with HMAC-SHA256 signature verification.
- **Backup & Restore**: Cross-tenant restore strictly blocked with security audit entries; restore restricted to `OWNER` role only.

---

## 🛠️ Best Practices for Operators

1. Bind the development server to `127.0.0.1:3000` or local loopback in personal environments.
2. If exposing over `0.0.0.0`, always set `ZYNTHEOR_ACCESS_TOKEN` and run behind an HTTPS reverse proxy.
3. Never commit `.env` or raw API keys to Git.
4. Periodically inspect the Forensic Diagnostics panel and Audit Ledger.
