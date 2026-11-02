# ZYNTHEOR AI ENGINE — IDENTITY ARCHITECTURE

## 1. System Overview

Phase P4 introduces a secure, scalable identity and access-control architecture for ZYNTHEOR.

```
ZYNTHEOR AI ENGINE
        │
   Authentication
        │
   User Identity (PBKDF2 + Salt)
        │
   Authorization (RBAC Matrix)
        │
   Entitlement Engine (Plans)
        │
   Usage Metering (Idempotent)
        │
   ┌────┴────────────┐
   │                 │
 AI Workspace    Model Access
   │                 │
 Projects        AI Inference
   │                 │
   └──────┬──────────┘
          │
    Tenant Isolation
          │
     Audit Ledger
```

## 2. Core Identity Layers
- **User Accounts (`src/services/identityService.ts`):** Handles registration, login, PBKDF2 password hashing (10,000 iterations, 16-byte salt), session token creation, and revocation.
- **RBAC Authorization (`src/services/rbacService.ts`):** Enforces fine-grained permission checks for roles: `OWNER`, `ADMIN`, `DEVELOPER`, `MEMBER`, and `VIEWER`. Denies access by default.
- **Entitlement Engine (`src/services/entitlementEngine.ts`):** Evaluates plan capabilities (`FREE`, `PRO`, `TEAM`, `ENTERPRISE`) independently of management roles.
- **Usage Metering (`src/services/usageMetering.ts`):** Records AI requests, tokens, and tool executions idempotently.
- **Multi-Tenant Isolation (`src/services/tenantIsolation.ts`):** Ensures workspace resources and conversations are isolated by tenant ID (`orgId`).
