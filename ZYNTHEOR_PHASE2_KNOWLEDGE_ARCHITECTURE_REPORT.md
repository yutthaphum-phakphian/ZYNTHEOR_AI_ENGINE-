# ZYNTHEOR AI ENGINE — PHASE 2 NATIVE KNOWLEDGE INTELLIGENCE ARCHITECTURE REPORT

**Product:** ZYNTHEOR AI ENGINE  
**Intelligence System:** ZYNTHEOR INTELLIGENCE  
**Model Family:** ZYNTHEOR CORE  
**Master Principle:** ZERO FAKE — REAL COMPLETENESS ONLY  
**Evaluation Timestamp:** 2026-11-06T01:39:35Z  

---

## 1. Architecture Overview

The Native Knowledge Intelligence architecture implements a modular, high-throughput pipeline for ingesting, indexing, searching, and contextually assembling document knowledge for ZYNTHEOR INTELLIGENCE:

```
DOCUMENT SOURCE (PDF, Markdown, TXT, Code)
  │
  ▼
KnowledgeIngestionService (Sanitization, SHA-256 Hash Deduplication, Structural Chunking)
  │
  ▼
128D Dense Vector Embedding + BM25 Lexical Keyword Tokenization
  │
  ▼
KnowledgeRetrievalService (BM25 Lexical Search + Vector Similarity + Hybrid RRF Weighting)
  │
  ▼
ContextAssemblyEngine (Origin Isolation: User vs Docs vs Memory vs Reasoning, Token Budgeting)
  │
  ▼
ZyntheorIntelligenceRuntime Execution Engine
```

---

## 2. Component Pipeline Implementations

### P2.1 — Knowledge Ingestion Service (`src/services/knowledgeIngestionService.ts`)
- **Supported Formats**: PDF (`.pdf`), Markdown (`.md`), Plain Text (`.txt`), Code (`.ts`, `.js`, `.py`, `.json`, `.rs`, `.go`, `.sql`).
- **File Validation**: Enforces size caps (25MB default), MIME/extension verification, UTF-8 decoding, and malformed content checks.
- **SHA-256 Deduplication**: Calculates document content hashes (`sha256`) scoped by `workspaceId`. Duplicate uploads return `isDuplicate: true` without creating redundant chunks.
- **Structure-Aware Chunking**:
  - **Markdown**: Splits along heading boundaries (`#`, `##`, `###`) and preserves code blocks.
  - **PDF**: Preserves page numbers (`--- Page X ---`) and page boundary references.
  - **Code**: Preserves file paths, language tags, line numbers (`L10-L45`), and structural boundaries.

### P2.2 & P2.3 — Knowledge Retrieval & BM25 Hybrid Search (`src/services/knowledgeRetrievalService.ts`)
- **128D Vector Search**: Cosine similarity calculations using sovereign 128D unit vectors ($L_2\text{-norm} = 1.0$).
- **BM25 Lexical Search**: Full mathematical BM25 term scoring:
  $$\text{Score}_{\text{BM25}}(D, Q) = \sum_{q \in Q} \text{IDF}(q) \cdot \frac{f(q, D) \cdot (k_1 + 1)}{f(q, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
  where $k_1 = 1.2$, $b = 0.75$.
- **Hybrid Weighting**: Combines vector semantic similarity and BM25 keyword score:
  $$\text{Score}_{\text{Hybrid}} = 0.6 \cdot \text{Score}_{\text{Vector}} + 0.4 \cdot \text{Score}_{\text{BM25\_Normalized}}$$
- **Workspace Isolation**: Rejects queries without `workspaceId` and filters out cross-workspace chunks.

### P2.4 — Context Assembly Engine (`src/services/contextAssemblyEngine.ts`)
- **5 Distinct Origin Boundaries**:
  1. `USER_PROMPT` (Current User Instruction)
  2. `DOCUMENT_KNOWLEDGE` (Retrieved document evidence with filename/page citations)
  3. `PERSISTENT_MEMORY` (ZyntheorMemoryEngine long-term memories)
  4. `MODEL_REASONING` (Internal chain-of-thought steps)
  5. `EXTERNAL_GROUNDING` (Explicit online search results)
- **Token Budget & Truncation**: Caps character length (default 3,200 chars) and sets `isTruncated: true` if budget is reached.
- **Prompt Injection Security**: Escapes script tags, system overrides, and prompt injection keywords (`[REDACTED_SECURITY_BOUNDARY]`).

---

## 3. Classification of Implementation Status

| Component Module | Status | Evidence / Source Code |
| :--- | :---: | :--- |
| **KnowledgeIngestionService** | `VERIFIED` | `src/services/knowledgeIngestionService.ts` & `src/tests/knowledgeIntelligence.test.ts` |
| **KnowledgeRetrievalService** | `VERIFIED` | `src/services/knowledgeRetrievalService.ts` (BM25 + 128D Vector + Hybrid) |
| **ContextAssemblyEngine** | `VERIFIED` | `src/services/contextAssemblyEngine.ts` (5 Origin Isolation & Budget Capping) |
| **KnowledgeEvaluationFramework** | `VERIFIED` | `src/services/knowledgeEvaluationFramework.ts` (Precision@K, Recall@K, MRR, NDCG@K) |
| **Thai & Multilingual Processing** | `VERIFIED` | `src/services/knowledgeEvaluationFramework.ts` (Ground-truth TH/EN fixtures) |
