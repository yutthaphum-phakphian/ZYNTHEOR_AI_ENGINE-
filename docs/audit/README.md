# Audit Evidence Index

## Current authoritative CORE X reports

- `P11_P20_INTEGRATION_STATUS.json` — latest evidence-derived phase gate snapshot; `releaseApproved` is a separate field and must remain false until all required gates pass.
- `P16_P20_IMPLEMENTATION_REPORT.md` — changes made in the current P16-based source branch and the verification performed for this delivery.
- `P16_TRAINING_REPORT.json` — native training status; do not infer training completion from source existence.
- `P16_NATIVE_MODEL_EVALUATION.json` — held-out evaluation status; `NOT_RUN` means no checkpoint-based evaluation occurred.
- `P16_ARCHITECTURE_AUDIT.md` — native CPU training architecture and boundaries.

## Historical reports

Other audit documents in this directory were supplied with earlier project versions. They are retained for traceability, but their PASS/READY statements do not establish that the same code, dependencies, hardware, or deployment state exists in this source branch today. Use the current status snapshot and reproduce the relevant tests before making release claims.

## Gate meanings

- `PASS`: required evidence passed for the inspected scope.
- `NOT_VERIFIED`: code or historical evidence exists, but current acceptance proof is missing.
- `BLOCKED`: a required precondition is absent or an intentional fail-closed gate denied the operation.
- `FAIL` / `ERROR`: an observed failed condition or execution error.

A source file existing is not proof of a running feature. A local test fixture is not proof of production deployment. A checkpoint is not a production-approved model.
