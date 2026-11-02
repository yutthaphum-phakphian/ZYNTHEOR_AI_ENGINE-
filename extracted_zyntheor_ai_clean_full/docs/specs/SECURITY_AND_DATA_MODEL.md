# ZYNTHEOR AI ENGINE — Security & Data Model Specification

**Document Version**: 1.0.0  
**Compliance Standard**: Sovereign Security Architecture  

---

## 1. Data Ownership & Tenant Isolation

- **Data Ownership**: 100% of user chat messages, workspace projects, prompt templates, task memories, and audit logs belong strictly to the tenant/user.
- **Tenant Isolation**:
  - Workspace task files are isolated per project ID under `/workspace_data/tasks/workspace_<id>.tasks.json`.
  - In-memory inference caches and task memories enforce explicit `workspaceId` equality checks.
  - Multi-user requests validate session headers via `serverSessionMiddleware` to prevent Insecure Direct Object Reference (IDOR) access.

---

## 2. Authentication & Authorization Architecture

- **Session Middleware**: `serverSessionMiddleware` inspects incoming request tokens and assigns verified roles (`admin`, `engineer`, `viewer`).
- **Role Permissions**:
  - `admin`: Full administrative access, settings persistence, system error clearance, model deployment promotion.
  - `engineer`: Workspace project execution, prompt forge testing, chat stream invocation.
  - `viewer`: Read-only inspection; blocked from clearing error logs or promoting models.
- **Header Tampering Defense**: Unverified incoming headers (e.g. `x-user-role`) are stripped or overridden by server-verified session state.

---

## 3. Secret & Credential Governance

- **Zero Client Key Exposure**: API Keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ZYNTHEOR_MODEL_API_KEY`) are stored strictly in server-side environment variables (`.env`) and are never rendered in client JavaScript or HTTP response bodies.
- **Session Master Token**: Optional `ZYNTHEOR_ACCESS_TOKEN` is passed via `Authorization: Bearer <token>` in `sessionStorage` and verified server-side via `tokenMatches()` with constant-time comparison.

---

## 4. Local-Only Policy & Consent Governance

- **Default Stance**: `ZYNTHEOR_LOCAL_ONLY=true` by default.
- **Backend Policy Check**:
  ```ts
  function remoteAllowed(provider, localOnly, onlineConsent) {
    if (provider.isLocal) return true;
    if (localOnly) return false;
    return onlineConsent;
  }
  ```
- **Consent Enforcement**: Attempting to query an external cloud provider while `localOnly` is active or without `onlineConsent=true` returns an immediate HTTP 403 `online_provider_blocked_by_policy`.

---

## 5. Audit Ledger & Cryptographic Integrity

- **Hash Chain Specification**:
  $$\text{Hash}_n = \text{SHA-256}(\text{ID}_n \parallel \text{Timestamp}_n \parallel \text{Type}_n \parallel \text{Detail}_n \parallel \text{Hash}_{n-1})$$
- **Verification Routine**: `verifyAuditHashChain()` evaluates the full sequence from `GENESIS` to ensure zero entry modification, deletion, or insertion.
- **Human Approval Intercept**: Critical actions (code mutations, model deployment promotions) trigger a modal requiring explicit human operator signature before proceeding.

---

## 6. Retention, Backup & Recovery

- **Backup Snapshots**: Automatic workspace project backups created under `/workspace_data/backups/projects_snapshot_<timestamp>.json`.
- **System Error Logs**: Persistent error logging under `/workspace_data/system_errors.json` with resolution tracking.
