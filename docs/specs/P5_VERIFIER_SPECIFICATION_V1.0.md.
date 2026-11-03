P5 VERIFIER REGRESSION TEST PLAN V1.0
Version: 1.0
Status: FROZEN
Date: 2026-05-13

1. Scope
Regression tests for native_data/p5_verifier_v1.py — real Ed25519, real trust store validation, real artifact provenance, no false PASS.

2. Test Categories
A. CLI Tests
Missing required arguments: --manifest missing -> ERROR or BLOCKED with code CLI_MISSING_ARG
Invalid arguments: --manifest path traversal -> FAIL with TRAVERSAL
Missing verifier module: import failure -> BLOCKED VERIFIER_UNAVAILABLE
Missing trust store: no --trust-store and no env -> BLOCKED TRUST_STORE_MISSING
Invalid digest: --expected-sha256 malformed (not hex 64) -> ERROR INVALID_DIGEST
Invalid paths: checkpoint outside allowed root -> FAIL PATH_TRAVERSAL
Unsupported config: --trust-store symlinked -> BLOCKED SYMLINK
B. Trust Store Tests (Ed25519 Only)
Valid Ed25519 key: trust store with 1 active key, valid base64 32-byte pubkey, key_id = SHA-256(pubkey) hex, verify manifest signature PASS
Invalid JSON: trust store malformed JSON -> BLOCKED TRUST_STORE_INVALID_JSON
Invalid Base64: public_key not base64 -> FAIL INVALID_BASE64
Invalid public key length: not 32 bytes after base64 decode -> FAIL INVALID_KEY_LENGTH
Duplicate key IDs: two keys with same key_id -> FAIL DUPLICATE_KEY_ID
Duplicate keys: same public_key twice -> FAIL DUPLICATE_PUBLIC_KEY
Unknown key: signature made with key not in trust store -> FAIL UNKNOWN_KEY
Revoked key: key status revoked, signature valid but rejected -> FAIL REVOKED_KEY
Invalid signature: signature bytes corrupted -> FAIL SIGNATURE_INVALID
Missing signature: manifest has no .sig file -> NOT_VERIFIED MISSING_SIGNATURE
Unreadable trust store: permission denied -> BLOCKED TRUST_STORE_UNREADABLE
Symlinked trust store: path is symlink -> BLOCKED SYMLINK_REJECTED
Repository-local trust store: path inside Git root -> BLOCKED REPO_LOCAL_TRUST_STORE
Unsupported schema version: schema_version 2.0 when only 1.0 supported -> BLOCKED UNSUPPORTED_SCHEMA
C. Artifact Integrity Tests
Correct SHA-256: checkpoint bytes hash == expected from manifest + trust store -> PASS
SHA-256 mismatch: tampered byte -> FAIL HASH_MISMATCH
Missing artifact: checkpoint file not exist -> NOT_VERIFIED ARTIFACT_MISSING
Corrupted artifact: npz truncated -> FAIL CORRUPTED_ARTIFACT
Unreadable artifact: chmod 000 -> ERROR ARTIFACT_UNREADABLE
Traversal attempt: checkpoint path ../../etc/passwd -> FAIL TRAVERSAL
Symlink escape: checkpoint is symlink to outside allowed root -> FAIL SYMLINK_ESCAPE
D. Evidence Tests
Missing dataset evidence: dataset manifest missing -> NOT_VERIFIED DATASET_MISSING
Missing training evidence: training-run record absent -> NOT_VERIFIED TRAINING_MISSING
Missing smoke-test evidence: smoke test log absent -> NOT_VERIFIED SMOKE_MISSING
Missing evaluation evidence: eval results absent -> NOT_VERIFIED EVAL_MISSING
Invalid evidence linkage: training run points to different checkpoint SHA -> FAIL LINKAGE_MISMATCH
Untrusted evidence: evidence SHA not in trusted provenance -> FAIL UNTRUSTED_EVIDENCE
E. Model Runtime Tests
Fresh reload success: torch available, np.load + model forward returns finite, reload_output_match True -> PASS (requires real runtime, else SKIPPED)
Runtime missing: torch not installed -> BLOCKED RUNTIME_MISSING (not FAIL)
Reload failure: torch load raises exception -> FAIL RELOAD_FAILED
Identity mismatch: expected model identity != observed -> FAIL IDENTITY_MISMATCH
Output mismatch: expected output != observed -> FAIL OUTPUT_MISMATCH
F. Report Tests
Atomic creation: two concurrent verifiers writing same report path -> one succeeds, other fails with REPORT_EXISTS, no overwrite
Existing report preservation: report file exists, verifier must not overwrite silently -> FAIL if overwrites, must create new with timestamp or fail closed
Write failure: report dir not writable -> ERROR REPORT_WRITE_FAILED
Invalid report path: traversal in --report-out -> FAIL REPORT_TRAVERSAL
Deterministic status aggregation: same inputs -> same final status, gate statuses sorted, JSON keys sorted
G. P6 Gate Tests
P5 BLOCKED => P6 BLOCKED
P5 FAIL => P6 BLOCKED
P5 NOT_VERIFIED => P6 BLOCKED
P5 PASS only when all mandatory evidence verified (7 gates PASS)
No automatic P6 execution: calling P6 without P5 PASS report -> BLOCKED P5_NOT_PASS
3. Side-Effect Isolation
All tests use TemporaryDirectory, synthetic fixtures, never touch real native_data/*.npz, FILE_MANIFEST.sha256, package-lock.json, RELEASE_READINESS.txt
Test-only Ed25519 keys generated only inside temp dir via cryptography library
No real training during unit tests
No manifest auto-sync: mock getCodeIntegrityStatus(autoSync=false)
4. Test Exit Conditions
Each test must assert exact status (PASS/FAIL/ERROR/BLOCKED/NOT_VERIFIED) and error_code
Never assert PASS when evidence missing
If dependencies missing (torch, cryptography), report SKIPPED or BLOCKED, not PASS, do not install automatically
Coverage: positive + negative + security + crypto + corruption + missing-evidence + filesystem + integration
5. Execution Order
Inspect setup/teardown for filesystem writes
Run isolated P5 suite only: pytest tests/test_p5_verifier_v1.py -v
Inspect Git status and protected file hashes
Only if safe, run full suite (not required for P5.2)
6. Metrics
Exact pass/fail/blocked/skipped counts
No false PASS path
Protected file hash comparison before/after
