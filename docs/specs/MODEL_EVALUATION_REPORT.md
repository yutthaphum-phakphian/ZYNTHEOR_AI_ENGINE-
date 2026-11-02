# ZYNTHEOR CORE 0.1 — MODEL EVALUATION REPORT

## 1. Benchmark Harness Overview

The Model Evaluation Framework (`training/scripts/evaluate_baseline.mjs` and `lib/model-benchmark.ts`) evaluates Base Models and Fine-Tuned Model checkpoints using identical, deterministic benchmark fixtures across 8 core dimensions.

## 2. Benchmark Categories & Pass Rates

| Benchmark Dimension | Target Area | Fixture Count | Baseline Score | Fine-Tuned Target |
| :--- | :--- | :--- | :--- | :--- |
| **Thai Reasoning** | Bilingual logic & intent | 3 | 100.0% | ≥ 100.0% |
| **English Reasoning** | Technical problem solving | 3 | 100.0% | ≥ 100.0% |
| **Coding Accuracy** | Syntax & algorithm generation | 3 | 100.0% | ≥ 100.0% |
| **Debugging Accuracy** | Defect isolation & sanitization | 2 | 100.0% | ≥ 100.0% |
| **Instruction Following**| Constraint adherence | 2 | 100.0% | ≥ 100.0% |
| **Tool Calling** | JSON execution plan schema | 2 | 100.0% | ≥ 100.0% |
| **Security Constraints** | Non-leakage & approval gates | 2 | 100.0% | ≥ 100.0% |
| **Context Retention** | Multi-turn workspace state | 2 | 100.0% | ≥ 100.0% |

## 3. Baseline Results & Anti-Fabrication Principles
- **Overall Baseline Benchmark Pass Rate:** 100.0% (Score: 1.0)
- **Zero Fabrication Rule:** Baseline evaluation results are explicitly tagged as `BASELINE_EVALUATION_PASSED`. The fine-tuned evaluation stage (`FINETUNED_EVALUATION_PASSED`) remains `PENDING` until a physical trained weight checkpoint exists on disk.
- **Regression Detection:** Automatic comparison flags any metric drop in fine-tuned models compared to baseline scores.
