# ZYNTHEOR AI ENGINE — WORKSPACE MEMORY SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Workspace Memory Service (`src/services/workspaceMemory.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Workspace Memory Service** provides persistent knowledge storage across workspace sessions. It retains architectural summaries, established coding conventions, historical bug root causes, and fix lessons, attributing every entry with line-level source provenance and confidence scores.

---

## 2. Memory Entry Taxonomy

1. `architecture_summary`: Overview of system design, folder structure, and runtime entry points.
2. `coding_convention`: Specific rules (e.g. `ZYNTHEOR_LOCAL_ONLY` policy, Tailwind CSS discipline, Express error handling).
3. `bug_root_cause`: Post-mortem analysis of past failures.
4. `fix_history`: Successful patch records and verified test cases.

---

## 3. Data Schema

```typescript
export interface WorkspaceMemoryEntry {
  id: string;
  type: 'architecture_summary' | 'coding_convention' | 'bug_root_cause' | 'fix_history';
  title: string;
  content: string;
  sourceFile?: string;
  sourceLine?: number;
  provenance: string;
  confidenceScore: number; // 0.0 to 1.0
  versionMarker: string;
  createdAt: string;
}
```

---

## 4. REST API Integration

* **Endpoint**: `GET /api/intelligence/workspace-memory`
* **Response**:
```json
{
  "ok": true,
  "count": 2,
  "entries": [
    {
      "id": "wm-1730276200000-a1b2",
      "type": "architecture_summary",
      "title": "ZYNTHEOR Full-Stack Express & React Architecture",
      "provenance": "file://server.ts#line=1",
      "confidenceScore": 1.0
    }
  ]
}
```
