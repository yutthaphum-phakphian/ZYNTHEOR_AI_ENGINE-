# DATASET QUALITY & PROVENANCE REPORT

## 1. Executive Summary

The ZYNTHEOR CORE instruction-tuning corpus (`zyntheor-core-engineering-v1.2`) is a handcrafted bilingual Thai-English engineering benchmark dataset designed specifically for software engineering, agent orchestration, code analysis, debugging, and workspace operations.

All 15 dataset samples carry explicit metadata, zero synthetic data inflation, and strict split isolation across `train`, `validation`, and `test` subsets.

---

## 2. Dataset Metrics & Split Distribution

- **Total Sample Count:** 15 Handcrafted Seed Samples
- **Target Domains:** 8 Engineering Domains (`software_engineering`, `agent_reasoning`, `code_analysis`, `debugging`, `tool_usage`, `security_engineering`, `workspace_operations`, `instruction_following`)
- **Data Splits:**
  - **Train (`train`):** 9 samples (60%)
  - **Validation (`validation`):** 3 samples (20%)
  - **Test (`test`):** 3 samples (20%)
- **Language Distribution:**
  - **Bilingual Thai-English (`th-en`):** 9 samples (60%)
  - **English (`en`):** 3 samples (20%)
  - **Thai (`th`):** 3 samples (20%)

---

## 3. Categories & Coverage

| Category | Count | Sample IDs |
| :--- | :--- | :--- |
| **Code Generation** | 3 | `th-en-code-001`, `en-code-002`, `th-code-011` |
| **Debugging** | 2 | `th-en-debug-003`, `th-debug-008` |
| **Tool Orchestration** | 2 | `en-tool-004`, `th-en-tool-010` |
| **Instruction Following** | 2 | `th-instruct-005`, `th-en-instruct-009` |
| **Code Explanation** | 1 | `th-en-explain-006` |
| **Multi-Constraint Optimization** | 1 | `en-constraint-007` |
| **Agent Reasoning** | 1 | `th-en-reasoning-012` |
| **Security Engineering** | 1 | `th-en-security-013` |
| **Workspace Operations** | 1 | `th-en-workspace-014` |
| **Code Analysis** | 1 | `th-en-analysis-015` |

---

## 4. Leakage & Near-Duplicate Analysis

- **Train-Val-Test Leakage:** 0% (Exact instruction match across splits: 0)
- **Near-Duplicate Check (Jaccard Distance Threshold < 0.25):** Passed (0 near-duplicate warnings)
- **Schema Validation:** 100% compliant with `manifest.json` schema requirements (`id`, `split`, `domain`, `category`, `language`, `license`, `source`, `instruction`, `expected_output`)

---

## 5. Cryptographic Provenance Digests

- **Manifest File SHA-256:** `46b94720a7bdc7408add785e108e8cc4e43ab16b089d6ddd09ff19f3ae376d41`
- **Samples JSON SHA-256:** `427a714f3cd2c4a89966cd623716489a642e9a74e700355374d4d99ed2c15610`
- **Human Review Gate:** `PASSED_PRE_FLIGHT_CHECK`
