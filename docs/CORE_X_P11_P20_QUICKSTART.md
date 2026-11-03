# CORE X P11–P20 — Local Verification Commands

Run from the project root. These commands do not install packages or download weights.

```bash
python3 -m unittest discover -s tests/native_cpu -v
python3 -m unittest discover -s tests -p 'test_sovereign_infra.py' -v
python3 training/native_cpu/train_native_cpu.py hardware
python3 training/native_cpu/train_native_cpu.py validate
python3 training/native_cpu/native_runtime.py probe
node --test tests/corex-model-lifecycle.test.mjs tests/corex-platform-gate.test.mjs
node lib/corex-platform-gate.mjs
python3 scripts/sovereign_infra.py preflight
```

Actual training is intentionally blocked until every sample's source and license provenance is verified and the authorized human reviewer records approval. Do not change governance fields solely to bypass this gate. Native inference remains unavailable until a real registered checkpoint exists.

To generate text after a valid experimental checkpoint exists:

```bash
printf '%s' '<instruction>\n...\n<answer>\n' | python3 training/native_cpu/native_runtime.py generate --stdin --max-new-tokens 64
```


## P16 Dataset approval gate

Read `docs/training/DATASET_GOVERNANCE_APPROVAL_GUIDE.md` before requesting any native training run. The guide explains per-sample source/license proof, human review, and content-hash requirements. The trainer intentionally remains blocked until an authorized owner has reviewed and recorded those approvals.
