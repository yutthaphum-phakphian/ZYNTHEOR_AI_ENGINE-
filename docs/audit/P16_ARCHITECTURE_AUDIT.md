# ZYNTHEOR CORE X — P16 Architecture Audit

Date: 2026-11-03  
Scope: top-level project root from `ZYNTHEOR_AI_ENGINE_P16_NATIVE_CPU_PATCHED.zip`, extended by this P11–P20 integration pass.

## Baseline findings

- Existing `training/scripts/train_baseline.py` is a hardware/configuration smoke check for the Qwen2.5-Coder-7B specification. It does not instantiate a trainable model, execute forward/backward passes, update weights, or create checkpoints.
- Existing dataset: 15 authored samples. Actual split counts in `training/dataset/samples.json` are train=8, validation=3, test=4. The old `manifest.json` and `SHA256SUMS` contained stale digest/split metadata; the manifest and checksum file were corrected without changing sample contents.
- `DATASET_PROVENANCE_MANIFEST.json` records source/license verification as `UNVERIFIED` and human review as `NOT_RECORDED`. Aggregate manifest also requires human review and does not approve training-license fitness.
- Existing model registry correctly reports no trained weights for the foundation Qwen model. It remains a separate `CORE_ADAPTED`/third-party-base specification and is not relabeled as native.
- No trained native checkpoint was present at audit start.
- Top-level workspace contains nested extracted source/patch folders. This patch targets the top-level project only; nested archived copies were left unchanged to avoid silently editing duplicate snapshots.

## Incremental implementation

- Added a byte-level tokenizer and decoder-only causal Transformer in `training/native_cpu/native_cpu_model.py`.
- Added a real PyTorch CPU training pipeline in `training/native_cpu/train_native_cpu.py`: deterministic random initialization, parameter-count assertion, forward/loss/backpropagation, AdamW updates, gradient clipping, validation loss, atomic checkpoint writes, SHA-256 identity, and verified resume path.
- Added held-out test-split loss evaluation in `training/native_cpu/evaluate_native_cpu.py`.
- Added/updated the `CORE_NATIVE` entry within the existing `models[]` identity registry without replacing other model identities. It starts as `NOT_TRAINED`, has no parent model, and does not claim inference readiness or production approval.
- Added npm scripts for hardware audit, dataset validation, training, evaluation, and tests.
- Added eight native CPU tests covering tokenizer round-trip, parameter range, forward shape, dataset integrity, sample-level provenance digests, registry-envelope preservation, fail-closed governance, and hardware probing; four additional P17 runtime tests cover verified fixture load, generation, missing checkpoint, and tamper rejection.

## Verification

| Check | Result |
|---|---|
| Native CPU + P17 runtime Python tests | PASS — 12/12 |
| Python compileall | PASS |
| Dataset structure/hash validation | PASS — 15 samples, 8/3/4 split |
| Native architecture parameter count | PASS — 4,864,768 |
| Hardware probe | PASS — 3 CPU cores, ~5.81 GiB RAM, CPU-only, PyTorch 2.10.0+cpu |
| Real training invocation | BLOCKED as designed — dataset review/license approval absent |
| Native checkpoint created | NO |
| Native inference readiness | NOT READY |
| Full npm/Vite build | NOT VERIFIED — no project `node_modules` supplied in this environment |

## Admission blocker

Training is intentionally fail-closed until the authorized data owner records all of the following:

1. `training/dataset/manifest.json` → `provenance.human_review_status = "APPROVED"`
2. `training/dataset/manifest.json` → `provenance.training_license_claim = "APPROVED_FOR_TRAINING"`
3. Every entry in `training/dataset/DATASET_PROVENANCE_MANIFEST.json` has `source.verificationStatus = "VERIFIED"`.
4. Every entry has `license.verificationStatus = "VERIFIED"`.
5. Every entry has `humanReview.status = "APPROVED"` with reviewer and timestamp recorded.

Do not change these fields merely to bypass the gate. Approval must reflect an actual review.

## Boundary

P16 code-path implementation is present, but no model training is claimed. The current 15-sample corpus is far too small to establish useful model capability. The byte-level CPU model is a research bootstrap, not a replacement for the 7.61B adapted model and not a production-grade assistant. P17 performs a one-token local generation probe only after a real checkpoint is present; current readiness remains blocked. No external downloads, installs, cloud calls, commits, pushes, or deployments were performed.
