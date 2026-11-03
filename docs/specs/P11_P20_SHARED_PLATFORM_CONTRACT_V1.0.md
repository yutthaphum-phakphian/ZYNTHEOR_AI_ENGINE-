# P11–P20 Shared Platform Contract v1.0

**Status:** Proposed contract for review  
**Applies to:** P11–P20

## 1. Evidence envelope

Every phase result and consequential tool operation must carry:
- `evidence_id`
- `phase_id`
- `run_id`
- `workspace_id` and tenant scope where applicable
- `source_revision`
- `created_at`
- `actor` / service identity
- `operation`
- `status`
- `reason_code`
- `input_digests[]`
- `output_digests[]`
- `policy_decision`
- `approval_reference` when approval is required

Evidence must be append-only or tamper-evident. Reports must not invent missing fields or infer execution from source-code presence.

## 2. Status semantics

- `PASS`: all mandatory checks independently verified.
- `FAIL`: a check ran and disproved integrity, correctness, or policy compliance.
- `ERROR`: verification could not complete due to an operational fault.
- `BLOCKED`: prerequisite, authorization, dependency, or trusted configuration is unavailable.
- `NOT_VERIFIED`: evidence is absent or insufficient.
- `SKIPPED`: intentionally not executed; never equivalent to PASS.

Overall precedence: `FAIL > ERROR > BLOCKED > NOT_VERIFIED > SKIPPED > PASS` for reporting severity. A phase passes only if every mandatory gate is PASS; optional skipped checks must be explicitly justified.

## 3. Identity and tenancy

Every durable record, memory item, task, agent run, model artifact, evaluation, and audit event must be scoped to a validated tenant/workspace. Tenant scope must come from authenticated server context, not model output or untrusted request body fields.

## 4. Tool and execution governance

All write, shell, network, deployment, training, model-promotion, and destructive operations must:
1. Be planned and schema-validated.
2. Be classified by risk.
3. Pass server-side authorization.
4. Require explicit human approval when consequential.
5. Execute through the approved gateway and isolated runtime.
6. Be cancellable and bounded by time/resource limits.
7. Produce immutable/tamper-evident audit evidence.
8. Be independently verified after execution.

No direct `child_process`, provider SDK, database write, or filesystem mutation may bypass the approved service boundary.

## 5. Model provenance

Each model artifact must declare:
- identity: `CORE_NATIVE`, `CORE_ADAPTED`, or `CORE_DISTILLED`
- architecture/config digest
- tokenizer identity and digest
- dataset manifest and provenance
- training run identity and reproducibility metadata
- checkpoint digest
- evaluation suite/version and results
- license/provenance of all upstream components
- lifecycle status and promotion history

`CORE_NATIVE` requires evidence of random initialization and training without third-party pretrained weights. Distillation must be labeled `CORE_DISTILLED`.

## 6. Memory and learning boundary

Memory retrieval, user conversations, task history, and private workspace content are not automatically training data. Training use requires explicit authorization, provenance, purpose limitation, retention policy, and exclusion/deletion handling. Secrets and credentials must never enter memory embeddings or training corpora.

## 7. Release and rollback

A release is eligible only when:
- all mandatory upstream gates are PASS;
- SBOM/dependency and security checks are acceptable;
- backup and restore have been exercised;
- migration rollback is documented;
- health/readiness/metrics are verified;
- local-only and consent policies are tested;
- human release approval is recorded.

No phase may set its own downstream gate to OPEN by writing a status string. The gate must be computed from signed or trusted evidence.
