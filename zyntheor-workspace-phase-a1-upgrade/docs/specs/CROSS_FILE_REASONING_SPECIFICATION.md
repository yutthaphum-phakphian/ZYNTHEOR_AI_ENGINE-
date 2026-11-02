# ZYNTHEOR AI ENGINE — CROSS-FILE REASONING SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Cross-File Reasoning Engine (`src/services/crossFileReasoning.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Cross-File Reasoning Engine** coordinates multi-file context assembly and synchronized edit planning across workspace boundaries. It ensures that when modifying one file, all dependent modules, API consumers, and test suites are evaluated and updated synchronously.

---

## 2. Core Capabilities

1. **Context Assembly without Truncation**: Assembles relevance-scored multi-file snippets across file boundaries without truncating critical type declarations or exported functions.
2. **Data & Control Flow Propagation**: Traces function call paths (e.g. UI Component -> Express Route -> Service Layer -> Audit Ledger DB) to include complete call graphs.
3. **Synchronized Multi-File Edit Planning**: Generates structured `MultiFileEditPlan` specifications mapping primary edits and secondary ripple updates.
4. **Risk Level Categorization**: Assigns risk ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) based on module criticality.

---

## 3. REST API Integration

* **Endpoint**: `POST /api/intelligence/cross-file-reason`
* **Request Body**:
```json
{
  "prompt": "Update billing subscription status handler",
  "targetFiles": ["src/routes/billing.ts"]
}
```
* **Response**:
```json
{
  "ok": true,
  "contextUnitsCount": 3,
  "editPlan": {
    "planId": "plan-1730276200000",
    "primaryFile": "src/routes/billing.ts",
    "dependentFiles": ["src/services/billingService.ts", "src/components/BillingCenter.tsx"],
    "riskAssessment": "HIGH"
  }
}
```
