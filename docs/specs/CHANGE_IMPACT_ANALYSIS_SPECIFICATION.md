# ZYNTHEOR AI ENGINE — CHANGE IMPACT ANALYSIS SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Change Impact Engine (`src/services/changeImpactEngine.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Change Impact Analysis Engine** predicts the ripple effects of code or schema modifications before execution. It scans dependency graphs to identify affected modules, broken tests, altered API contracts, and database schema impacts, preventing regression bugs.

---

## 2. Risk Classification Matrix

| Risk Level | Trigger Conditions | Mandated Actions |
|---|---|---|
| **CRITICAL** | Database Schema edits (`database/schema.ts`), SQL migrations | Human Approval Gate required, DB rollback plan |
| **HIGH** | Core API routes (`src/routes/*`), Authentication, Billing, RBAC | Human Approval Gate required, full test suite run |
| **MEDIUM** | Shared UI components (`src/components/*`), UI pages | Component visual regression check |
| **LOW** | Isolated utility functions, documentation files | Automated test verification |

---

## 3. REST API Integration

* **Endpoint**: `POST /api/intelligence/change-impact`
* **Request Body**:
```json
{
  "targetFile": "database/schema.ts",
  "proposedChange": "Add tenant_metadata column"
}
```
* **Response**:
```json
{
  "ok": true,
  "report": {
    "targetFile": "database/schema.ts",
    "changeType": "schema",
    "riskLevel": "CRITICAL",
    "affectedFiles": ["src/services/tenantIsolation.ts", "src/services/rbacService.ts"],
    "recommendations": [
      "Require Human Approval Gate before applying patch.",
      "Run full automated regression test suite."
    ]
  }
}
```
