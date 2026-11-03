# Native Training Dataset Governance Gate

The Native CPU trainer intentionally refuses to train until the dataset is reviewed and its claims are verified. This guide describes the evidence required; it does not approve any sample or license on behalf of a data owner.

## Required aggregate fields

In `training/dataset/manifest.json`:

- `provenance.human_review_status`: must be set to `APPROVED` only after an authorized human review.
- `provenance.training_license_claim`: must be set to `APPROVED_FOR_TRAINING` only after a documented license/policy decision.

## Required per-sample evidence

In `training/dataset/DATASET_PROVENANCE_MANIFEST.json`, every row in `samples.json` must have one matching entry with:

- exact `id` and `split`;
- `sampleSha256` matching the canonical JSON content of that sample;
- `source.claim` and `source.verificationStatus: VERIFIED` backed by a traceable source;
- `license.claim` and `license.verificationStatus: VERIFIED` backed by an actual license review;
- `humanReview.status: APPROVED`, a named reviewer, and an ISO-8601 `reviewedAt` timestamp;
- explicit training consent when the data is classified as private memory, private workspace content, or personal data.

Do not infer license permission from a text label such as `Apache-2.0`. A source/author claim must be checked against the actual origin and applicable terms. Never include private workspace memories or secrets as training data without explicit authorization from the data owner.

## Validation and training

Run these commands after the authorized reviewer updates the evidence files:

```bash
npm run native:cpu:validate
npm run native:cpu:hardware
npm run native:cpu:train
npm run native:cpu:evaluate
npm run corex:p17:probe
npm run corex:p18:verify
npm run corex:p20:status
```

Training writes a new checkpoint and updates only the `zyntheor-native-cpu-001` entry in `native_model_identity.json`. It must preserve other model identities. No command in this guide bypasses the governance gate or grants production approval.
