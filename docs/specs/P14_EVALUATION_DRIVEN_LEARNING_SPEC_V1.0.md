# P14 — Evaluation-Driven Learning Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P14

## 1. Objective

Convert verified outcomes and authorized feedback into measurable learning signals without treating arbitrary user data as training data.

## 2. Existing components to reuse

Reuse `src/services/selfImprovementEngine.ts`, existing evaluation reports, dataset quality tools, and native training data pipeline. Separate experience logging from dataset admission.

## 3. Scope

- Versioned benchmark registry for reasoning, coding, Thai/English, safety, tool use, and long-context tasks.
- Feedback ingestion with consent, provenance, and quality labels.
- Error taxonomy and verified root-cause capture.
- Dataset candidate queue with deduplication, leakage checks, license/provenance, and human curation.
- Regression tracking across model and prompt versions.

## 4. Mandatory architecture and security contracts

- Only authorized and provenance-complete samples may enter training datasets.
- Evaluation test sets remain isolated from training and tuning.
- Anecdotal user satisfaction is not a benchmark score.
- Every score records benchmark version, sample count, run ID, model digest, and configuration digest.

## 5. Required verification

- Train/test leakage detection.
- Duplicate and near-duplicate detection.
- Consent and provenance rejection.
- Benchmark reproducibility.
- Regression detection and metric uncertainty reporting.

## 6. Exit criteria

- Benchmark suite and data admission policy are frozen.
- Evaluation is reproducible from immutable fixtures.
- No private memory is admitted to training without explicit authorization.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
