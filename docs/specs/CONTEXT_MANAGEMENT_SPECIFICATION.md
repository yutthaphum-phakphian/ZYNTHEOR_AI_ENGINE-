# Context Management Specification
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Overview

The **Context Management Engine** ensures relevant workspace data is retrieved, relevance-ranked, bounded within strict token budgets, and tagged with line-level provenance while enforcing complete multi-tenant and workspace isolation.

---

## 2. Context Retrieval & Relevance Ranking Pipeline

1. **Keyword Extraction**: Parses user query into normalized tokens and technical identifiers.
2. **Code Graph Symbol Lookup**: Cross-references identifiers against the workspace Code Graph (`src/services/codeGraph.ts`).
3. **Scoring Algorithm**:
   - Direct file path match: +10 points
   - Symbol import/export match: +8 points
   - Keyword frequency in source: +2 points per occurrence
4. **Token Budget Enforcement**: Default budget max ~4,000 tokens (~16,000 characters). Content is truncated safely when budget limit is reached with `[TRUNCATED_FOR_CONTEXT_BUDGET]`.
5. **Prompt Injection Sanitization**: Neutralizes potential prompt injection markers embedded in workspace source files (`<|im_start|>`, `System Instruction:`, etc.).

---

## 3. Context Provenance Schema

Every excerpt injected into the model prompt includes explicit provenance metadata:

```ts
export interface ContextProvenance {
  file: string;               // e.g. "src/routes/billing.ts"
  startLine: number;          // e.g. 1
  endLine: number;            // e.g. 120
  relevanceScore: number;     // e.g. 28
  retrievalSource: 'DIRECT_MATCH' | 'CODE_GRAPH_EDGE' | 'MANIFEST_ENTRY';
  matchedKeywords: string[];  // e.g. ["billing", "reconciliation"]
  symbols: string[];          // e.g. ["reconcileBankTransfer"]
}
```

---

## 4. Workspace & Organization Isolation

- Context searches are strictly scoped by `workspaceId`.
- Files outside `rootDir` or matching sensitive key patterns (`.env*`, `*.pem`, `id_rsa`, `cloud_sql_proxy`) are filtered before scoring.
- Different workspaces cannot access or view each other's indexed file graphs or task memories.
