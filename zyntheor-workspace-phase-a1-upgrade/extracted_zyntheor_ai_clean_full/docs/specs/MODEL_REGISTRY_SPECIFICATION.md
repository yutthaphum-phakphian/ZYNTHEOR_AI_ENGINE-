# ZYNTHEOR CORE 0.1 — MODEL REGISTRY SPECIFICATION

## 1. Model Registry Architecture

The Model Registry (`training/registry/model_registry.json`) provides a cryptographically verifiable store for model metadata, base model provenance, dataset digests, training specs, and checkpoint hashes.

## 2. Model Record Schema
Each model registered in `model_registry.json` contains:
- `model_id`: Canonical unique model string (e.g. `zyntheor-core-0.10.0-foundation`).
- `display_name`: Human-readable title.
- `version`: Version string adhering to SemVer (`0.1.0-alpha`).
- `status`: Lifecycle gate status (`SPECIFICATION_LOCKED_PENDING_GPU_RUN`, `TRAINING_COMPLETED`, `PRODUCTION_APPROVED`).
- `trained_weights_exist`: Boolean flag reflecting physical disk presence.
- `base_model`: Name (`Qwen/Qwen2.5-Coder-7B-Instruct`), parameters (`7.61B`), license (`Apache-2.0`), tokenizer (`Qwen2Tokenizer`).
- `dataset_provenance`: Manifest name, version, sample count, domain array, split breakdown, and SHA-256 digest.
- `training_spec`: Config file path, fine-tuning method (`QLoRA 4-bit / LoRA 16-bit`), precision (`bf16`), learning rate, seed (`849202`).
- `checkpoints`: Active checkpoint path and SHA-256 digest.
- `export_compatibility`: Quantization format (`Q4_K_M`), Ollama Modelfile reference (`Modelfile_ZYNTHEOR_CORE_0.1`), llama.cpp compatibility.

## 3. Governance Lifecycle & Human Approval Gate

Model progression strictly enforces a sequential 10-stage state machine:
1. `FOUNDATION_READY`
2. `DATASET_READY`
3. `TRAINING_CONFIG_READY`
4. `GPU_RUNTIME_READY`
5. `TRAINING_RUNNING`
6. `TRAINING_COMPLETED`
7. `BASELINE_EVALUATION_PASSED`
8. `FINETUNED_EVALUATION_PASSED`
9. `PRODUCTION_APPROVAL_PENDING`
10. `PRODUCTION_APPROVED`

**Security Rule:** AI agents are strictly prohibited from approving their own model promotion. Production promotion requires explicit human operator signature recorded with a cryptographic nanosecond timestamp in the Audit Ledger.
