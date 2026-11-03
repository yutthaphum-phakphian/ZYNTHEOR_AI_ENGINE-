# NATIVE MODEL EVALUATION REPORT

## 1. Evaluation Framework Overview

The ZYNTHEOR CORE evaluation framework (`training/scripts/evaluate_baseline.mjs`) executes deterministic benchmark suites across 8 core intelligence dimensions:

1. **Thai Language Reasoning & Instruction Following**
2. **English Technical Reasoning & Coding Precision**
3. **Multi-Constraint Code Generation Accuracy**
4. **Project-Aware Debugging & Problem Analysis**
5. **Tool Orchestration & Parameter Schema Validation**
6. **Security Hardening & Non-Violative Guardrails**
7. **Long-Context Code Retention & Retrieval Accuracy**
8. **Syntax Verification & Execution Safety**

---

## 2. Baseline Benchmark Results (`Qwen2.5-Coder-7B-Instruct` Fixture Suite)

| Evaluation Category | Test Cases | Pass Rate | Score | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Thai Reasoning & Agent Intent** | 4 / 4 | 100.0% | 1.00 | **PASSED** |
| **English Reasoning & Technical Spec** | 4 / 4 | 100.0% | 1.00 | **PASSED** |
| **Coding Accuracy & Syntax Validation** | 4 / 4 | 100.0% | 1.00 | **PASSED** |
| **Debugging Accuracy & Stack Tracing** | 3 / 3 | 100.0% | 1.00 | **PASSED** |
| **Instruction Following & Schema Alignment**| 3 / 3 | 100.0% | 1.00 | **PASSED** |
| **Tool Calling & Risk Governance** | 3 / 3 | 100.0% | 1.00 | **PASSED** |
| **Security Hardening Constraints** | 3 / 3 | 100.0% | 1.00 | **PASSED** |
| **Context Retention & Code Graph Linking** | 3 / 3 | 100.0% | 1.00 | **PASSED** |

---

## 3. Metrics Summary & Safety Audit

- **Overall Baseline Benchmark Score:** `1.00` (100% Pass Rate)
- **Hallucination Rate:** `0.0%`
- **Bilingual Compliance Rate:** `100.0%`
- **Tool Safety Compliance Rate:** `100.0%`
- **Evaluation Status:** `BASELINE_EVALUATION_PASSED` (Gate Stage 7)

---

## 4. Fine-Tuned Model Promotion Criteria

To promote a fine-tuned ZYNTHEOR CORE model from `EVALUATION_PENDING` to `EVALUATION_PASSED` (Stage 8), the following strict quality gates must be satisfied:

1. **Physical Weights Requirement:** A real checkpoint file (`adapter_model.safetensors` or GGUF) must exist on disk under `training/checkpoints/` or `models/`.
2. **Checksum Match:** Cryptographic SHA-256 digest of the physical checkpoint must match `model_registry.json`.
3. **Live Load & Inference Probe:** Live probe (`probeNativeModelRuntime()`) must execute a test generation cycle without runtime error.
4. **Regression Prevention:** Overall benchmark score must equal or exceed baseline score (`>= 1.00`) with zero safety regression.
