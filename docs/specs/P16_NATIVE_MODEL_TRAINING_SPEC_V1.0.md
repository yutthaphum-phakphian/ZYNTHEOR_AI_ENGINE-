# P16 — Native Model Training Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P16

## 1. Objective

Train a first-party model from random initialization using ZYNTHEOR-governed tokenizer, data, architecture, and reproducible training runs.

## 2. Existing components to reuse

Reuse `src/native/SmallScaleModel.ts`, `src/native/TrainingEngine.ts`, `src/native/ModelIdentityRegistry.ts`, `src/native/scaling/base_model.py`, `scripts/p10_scale_train.py`, and training/native_data pipelines. P10 architecture/scaling evidence is not training evidence.

## 3. Scope

- Lock architecture, tokenizer, data mixture, sequence length, optimizer, schedule, and compute budget.
- Verify dataset provenance, license, deduplication, contamination, and train/validation/test separation.
- Record random initialization seed and prove no pretrained checkpoint was loaded.
- Execute training with resumable checkpoints and loss/throughput/resource telemetry.
- Evaluate against frozen baselines and report uncertainty and limitations.

## 4. Mandatory architecture and security contracts

- CORE_NATIVE must start from random initialization; adapters/fine-tunes are CORE_ADAPTED; teacher-derived weights are CORE_DISTILLED.
- Every run has immutable run ID, config digest, dataset digest, code revision, seed, hardware, and checkpoint lineage.
- No training data is silently collected from conversations or memory.
- Resource preflight must block if RAM/VRAM/disk budget is insufficient.

## 5. Required verification

- Seed reproducibility on deterministic subset.
- Data leakage and license checks.
- Checkpoint resume equivalence within declared tolerance.
- NaN/Inf and loss divergence detection.
- No-pretrained-weight loading assertion.
- Evaluation set isolation.

## 6. Exit criteria

- A real training run is independently evidenced.
- Checkpoint reload and hash verification pass.
- Evaluation demonstrates measured capability; architecture size alone is insufficient.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
