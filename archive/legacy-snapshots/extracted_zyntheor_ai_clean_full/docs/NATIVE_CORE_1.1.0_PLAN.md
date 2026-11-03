ZYNTHEOR CORE Native Model Development 1.1.0 Plan (Path C)
Goal: Make CORE training verifiable, not fabricated. Status remains SPECIFICATION_LOCKED_PENDING_GPU_RUN until GPU run with real checkpoint.

Phase C1 - Dataset Honest Provenance
 Verify training/dataset/manifest.json SHA-256
 Verify samples.json schema + no leakage train/val/test
 Run training/scripts/verify_dataset.mjs in CI
 Near-duplicate detection threshold < 0.85
Phase C2 - Training Config & Hardware Truth
 training/config/training_config.json seeds fixed
 train_baseline.py auto-detect CPU-only 12GB RAM 0 VRAM
 CPU smoke test passes without GPU
 Config marks target Qwen2.5-Coder-7B-Instruct Apache-2.0 7.61B params
Phase C3 - Evaluation Harness
 evaluate_baseline.mjs runs code syntax, unit test, bilingual TH-EN, tool safety
 Results saved to training/registry/RELEASE_READINESS.txt
 Report marks native CORE NOT ALLOWED for promotion until checkpoint exists
 ModelsPage shows real-time status from /api/training/status
Acceptance Gates C
Dataset verify PASS
Quality gates PASS
Eval harness runs (even without checkpoint) -> UNVERIFIED checkpoint is expected
160/160 + 69 training tests PASS
No fabricated weights
Rollback
Keep v1.0.0 Sovereign as stable
Native training on separate branch feature/native-core-1.1.0 if needed
