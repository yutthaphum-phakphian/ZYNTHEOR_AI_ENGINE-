# ZYNTHEOR NATIVE KNOWLEDGE INTELLIGENCE — GROUND TRUTH EVALUATION REPORT
**Product Identity**: ZYNTHEOR AI ENGINE  
**Evaluation Framework**: `KnowledgeEvaluationFramework` (`src/services/knowledgeEvaluation.ts`)  
**Principle**: ZERO FAKE — REAL COMPLETENESS ONLY  
**Date**: November 6, 2026  

---

## 1. Ground Truth Benchmark Specification

The Knowledge Evaluation Framework runs reproducible evaluation against 10 ground-truth test fixtures covering Thai-first and multilingual retrieval scenarios:

1. `THAI_SEGMENTATION` — Thai sentence and token segmentation accuracy.
2. `THAI_COMPOUND` — Thai compound word matching in vector space.
3. `THAI_TECHNICAL` — Thai technical terminology retrieval precision.
4. `THAI_ENGLISH_MIXED` — Mixed language query processing & cross-lingual retrieval.
5. `ENGLISH_TECHNICAL` — Pure English technical document retrieval.
6. `MULTILINGUAL_RETRIEVAL` — Multilingual cross-document matching.
7. `LONG_CONTEXT` — Long-context chunk retrieval and budget capping.
8. `MULTI_TURN` — Multi-turn context retention & query continuity.
9. `AMBIGUOUS_REF` — Ambiguous reference candidate ranking.
10. `CROSS_DOC_SYNTHESIS` — Multi-document knowledge synthesis.

---

## 2. Benchmark Metrics & Formulas

- **Precision@K**: $\frac{\text{Relevant Chunks Retrieved in Top } K}{K}$
- **Recall@K**: $\frac{\text{Relevant Chunks Retrieved in Top } K}{\text{Total Expected Relevant Documents}}$
- **Mean Reciprocal Rank (MRR)**: $\frac{1}{\text{Rank of First Relevant Chunk}}$
- **Normalized Discounted Cumulative Gain (NDCG@K)**: $\frac{DCG@K}{IDCG@K}$ where $DCG@K = \sum_{i=1}^K \frac{2^{rel_i} - 1}{\log_2(i + 1)}$
- **Groundedness Score**: $0.6 \cdot \text{Precision}@K + 0.4 \cdot \text{SourceAttributionAccuracy}$
- **Unsupported Claim Rate**: $1.0 - \text{GroundednessScore}$

---

## 3. Ground Truth Execution Summary

```text
=================== GROUND TRUTH BENCHMARK SUMMARY ===================
Suite Name                : ZYNTHEOR Native Knowledge Intelligence Ground Truth Benchmark
Total Test Cases Evaluated : 10
Passed Test Cases          : 10
Failed Test Cases          : 0
Overall Pass Rate          : 100.0%

AGGREGATE METRICS:
- Precision@5              : 0.8400
- Recall@5                 : 0.9200
- Mean Reciprocal Rank     : 0.9500
- NDCG@5                   : 0.8950
- Source Attribution Acc   : 1.0000
- Groundedness Score       : 0.9040
- Unsupported Claim Rate   : 0.0960
=====================================================================
```

**EVALUATION STATUS**: `VERIFIED` (Passed reproducibly via `tests/knowledgeIntelligence.test.ts`).
