# P6 Dataset Factory Spec v1.0 — ZYNTHEOR AI Engine

**Status:** OPEN  
**P5 reference:** `cac3891` — P5.2 verification report records all mandatory gates as PASS.  
**Goal:** Build a native Thai dataset for six capabilities, with independent train/validation/test splits and auditable integrity evidence.

## Capabilities

1. **Thai Understanding** — Natural Thai, including slang, abbreviations, and tone marks.
2. **Mixed Language** — Thai-English code-switching, such as “deploy โค้ดแล้ว build fail”.
3. **Intent Detection** — Identify Thai requests, questions, complaints, and help-seeking.
4. **Context Awareness** — Preserve relevant information across long Thai conversations.
5. **Thai Code Assistance** — Explain code in Thai and write code from Thai instructions.
6. **Thai Response** — Respond naturally in Thai rather than translating from English.

## Dataset format

Store one JSON object per line (JSONL):

```json
{"id":"th_u_0001","capability":"thai_understanding","input":"วันนี้ deploy ไม่ได้เลยบง","output":"เข้าใจว่า deploy ไม่สำเร็จ ผู้ใช้น่าจะต้องการความช่วยเหลือ","split":"train"}
```

Each record must have a unique stable `id`, one of the six capability names, non-empty `input` and `output`, and a split of `train`, `val`, or `test`.

## Split, isolation, and storage rules

- Do not use or mix in any P5 test-set data.
- Split independently within each capability: 80% train, 10% validation, and 10% test. For the initial 50 examples per capability, this is 40/5/5.
- Keep P6 test examples isolated from training and checkpoint selection, and never use them to train P7.
- Store raw source data under `native_data/p6_factory/raw/`; raw binary files (`*.bin`) must remain ignored by Git.
- Commit dataset manifests and verification evidence as JSON. Do not commit raw binary artifacts, checkpoints, private keys, or trust-store secrets.

## Initial acceptance gates

- **dataset_integrity:** unique IDs; no duplicate or cross-split leakage.
- **capability_coverage:** all six capabilities represented, balanced, and at least 50 samples each for the initial release.
- **thai_quality:** authentic Thai content, not machine translation; Thai-language ratio greater than 60%. Measure Thai Unicode letters divided by all Unicode letters across inputs and natural-language outputs; exclude fenced code blocks and ignore punctuation, whitespace, and digits.
- **manifest_signature:** valid detached signature from the approved external trust store.
- **p6_readiness:** PASS only when all mandatory gates pass; P7 remains blocked otherwise.

## P6 milestones

- **P6.1:** Hand-curate 300 seed examples, 50 per capability, then apply per-capability 80/10/10 splits.
- **P6.2:** Add Thai-aware augmentation (inflection and spelling variants, word-order variations where valid, and colloquial phrasing) without introducing leakage.
- **P6.3:** Implement `p6_verifier_v1.py` and verify the manifest signature against the approved external trust store.

The accompanying `seed_thai_6caps.jsonl` currently contains 50 Thai Code Assistance examples (40/5/5) and one starter example for each of the other five capabilities. It is partial and does not satisfy the six-capability P6.1 coverage target.
