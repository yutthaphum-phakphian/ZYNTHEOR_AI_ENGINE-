# ZYNTHEOR CORE Native — Identity Policy

## Non-negotiable identity
- `CORE_NATIVE` uses an independently designed architecture and randomly initialized weights. It must not load, merge, ensemble, or silently inherit weights from a third-party foundation model.
- A third-party model may appear only as a separately identified `CORE_ADAPTED` research/compatibility track, with provenance and licensing recorded. It is never renamed or presented as CORE Native.
- `CORE_DISTILLED` is a separate identity and requires explicit teacher lineage, dataset provenance, and evaluation evidence. It is not CORE Native.

## Product behavior
- CORE Native is the primary product identity and first-party development target.
- External provider adapters, if retained for migration or comparison, are optional runtime integrations; they are not merged into CORE weights and must be visibly labeled as external.
- Do not claim inference readiness, training completion, or production approval without a registered checkpoint digest, reproducible evaluation, and explicit human approval.
- Unknown or unavailable evidence must remain `UNKNOWN` / `NOT_TRAINED`, never green by default.

## Current repository evidence
`training/registry/native_model_identity.json` currently records `zyntheor-native-cpu-001` as `NOT_TRAINED`, with no trained weights, checkpoint, inference readiness, or production approval. Therefore the UI must present CORE Native as the active development target, not as an already completed production model.
