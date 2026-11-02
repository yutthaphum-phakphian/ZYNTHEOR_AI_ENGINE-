# ZYNTHEOR AI ENGINE — CODE RELATIONSHIP INTELLIGENCE SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Workspace Graph Service (`src/services/workspaceGraph.ts` / `src/services/codeGraph.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Code Relationship Intelligence** module constructs a multi-dimensional semantic graph across workspace files, modules, functions, classes, interfaces, API routes, database schemas, and test coverage linkages.

---

## 2. Graph Schema & Node Types

* **Node Categories**: `component`, `service`, `route`, `lib`, `test`, `config`, `other`
* **Edge Relationships**:
  - `IMPORTS`: Source file imports target file module or symbol.
  - `CALLS`: Function or method invocation across module boundary.
  - `DEPENDS_ON`: Node depends on third-party npm package (`package:name`).
  - `TESTS`: Test file asserts behavior of source code module.
  - `SERVES_API`: Route handler exposes HTTP API endpoint calling underlying service.

---

## 3. Advanced Provenance & Line Tracking

Each symbol definition tracks:
- Exact source relative path (`src/services/billingService.ts`)
- Source line number & provenance URI (`file://src/services/billingService.ts#symbol=transitionSubscriptionState`)
- Export status (`exported: true`)
- API Route mapping with HTTP method & RBAC permission matrix.

---

## 4. REST API Integration

* **Endpoint**: `GET /api/intelligence/code-graph`
* **Response**:
```json
{
  "ok": true,
  "summary": {
    "indexedAt": "2026-10-30T08:16:30.000Z",
    "totalFiles": 142,
    "totalEdges": 310
  },
  "symbolsCount": 85,
  "apiRoutesCount": 18
}
```
