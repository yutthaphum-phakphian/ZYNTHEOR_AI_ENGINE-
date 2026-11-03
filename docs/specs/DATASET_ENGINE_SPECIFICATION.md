# ZYNTHEOR CORE 0.1 — DATASET ENGINE SPECIFICATION

## 1. Corpus Purpose & Domain Coverage

The Dataset Engine (`training/dataset/`) provides a reproducible, handcrafted Thai-English software engineering corpus designed for instruction-tuning ZYNTHEOR CORE.

### Target Domains & Schema
- **Domain Coverage:** Software Engineering, Code Generation, Code Analysis, Debugging, API Development, Architecture, Testing, Security Engineering, Thai Technical Language, English Technical Language.
- **Language Distribution:** Thai-English Bilingual (`th-en`), Thai (`th`), English (`en`).
- **Formatting Standard:** ChatML JSON schema with strict field validation:
  ```json
  {
    "id": "th-en-code-001",
    "split": "train",
    "domain": "software_engineering",
    "category": "code_generation",
    "language": "th-en",
    "license": "Apache-2.0",
    "source": "zyntheor-curated-engineering-corpus-v1",
    "instruction": "...",
    "context": "...",
    "expected_output": "..."
  }
  ```

## 2. Dataset Split Distribution & Non-Inflation Policy
- **Total Handcrafted Samples:** 15 verified benchmark samples (zero bulk synthetic duplication).
- **Split Ratio:**
  - `train`: 9 samples (60%)
  - `validation`: 3 samples (20%)
  - `test`: 3 samples (20%)

## 3. Leakage Protection & Quality Verification (`training/scripts/verify_dataset.mjs`)
- **Normalized Instruction Hash Check:** Verifies 0 cross-split duplicates between `train`, `validation`, and `test` splits.
- **Near-Duplicate Detection:** Jaccard token similarity analysis prevents near-identical prompts across splits.
- **License Fitness:** Validates `Apache-2.0` attribution and source provenance on 100% of samples.
- **Cryptographic SHA-256 Manifest:** Digest recorded in `training/dataset/SHA256SUMS`.
