# ZYNTHEOR AI ENGINE — INCREMENTAL INDEXING SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Incremental Indexer (`src/services/incrementalIndexer.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Incremental Indexer** maintains sub-second freshness of the workspace code graph. Instead of re-parsing the entire workspace on every query, it monitors file mtime changes, computes graph deltas (`addedFiles`, `modifiedFiles`, `deletedFiles`), and invalidates stale context caches.

---

## 2. Delta Processing Lifecycle

1. **File System Event Capture**: Tracks file modified timestamps (`mtimeMs`).
2. **Delta Extraction**: Categorizes changes into file additions, modifications, or deletions.
3. **Graph Node Splice**: Re-parses only modified/added AST nodes while preserving unchanged cache entries.
4. **Cache Invalidation**: Clears stale symbols and context units in memory.

---

## 3. Data Schema

```typescript
export interface IncrementalIndexDelta {
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  invalidatedSymbols: string[];
  graphData: CodeGraphData;
  indexedAt: string;
}
```
