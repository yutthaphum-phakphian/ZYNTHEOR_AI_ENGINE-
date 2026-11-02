# ZYNTHEOR AI ENGINE — MULTI-TENANT DATA MODEL SPECIFICATION

## 1. Tenant Model Architecture

ZYNTHEOR implements strict multi-tenant isolation where every organization represents an isolated tenant boundary (`orgId` / `tenantId`).

```
Organization (Tenant ID)
    ├── Organization Members (Users + Roles)
    ├── Workspaces (Workspace ID)
    │     ├── Projects
    │     ├── Files
    │     └── Conversations
    ├── Usage Records
    └── Audit Events
```

## 2. Isolation Rules (`src/services/tenantIsolation.ts`)
1. **Resource Scoping:** All workspaces, projects, files, usage records, and audit events store an explicit `tenantId`.
2. **Membership Verification:** `tenantIsolationService.verifyTenantMembership(userId, tenantId)` checks membership before allowing read/write operations.
3. **Cross-Tenant Prevention:** Attempts to access resources belonging to a different tenant ID throw a `TENANT ISOLATION VIOLATION` error and trigger an audit alert.
