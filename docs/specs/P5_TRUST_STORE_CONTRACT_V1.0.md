P5 TRUST STORE CONTRACT V1.0
Version: 1.0
Status: FROZEN — Ed25519 Only
Date: 2026-05-13

1. Purpose
Trust Store is external root of trust for P5 verifier. Trust must originate outside Git repo, not from artifact itself.

2. Schema
{
  "schema_version": "1.0",
  "keys": [
    {
      "key_id": "hex SHA-256 of raw public key, 64 hex chars",
      "algorithm": "Ed25519",
      "public_key": "base64 of 32-byte raw public key",
      "status": "active | verify_only | revoked"
    }
  ]
}
3. Field Requirements
schema_version
Must be string "1.0" for V1.0
Reject unknown versions: return BLOCKED UNSUPPORTED_SCHEMA_VERSION, do not silently accept
keys[]
Array, may be empty (then no signatures can verify -> NOT_VERIFIED)
Each key must have key_id, algorithm, public_key, status
key_id
Must be hex lowercase SHA-256 of raw public key bytes (32 bytes)
Compute: key_id = hex(sha256(base64_decode(public_key)))
Reject if mismatch: FAIL KEY_ID_MISMATCH
Reject duplicate key_id: FAIL DUPLICATE_KEY_ID
algorithm
Must be exactly "Ed25519" case-sensitive
Reject unsupported: FAIL UNSUPPORTED_ALGORITHM
Only Ed25519 allowed in V1.0
public_key
Must be valid Base64 (standard, no url-safe unless explicitly allowed, padding allowed)
After base64 decode, must be exactly 32 bytes (Ed25519 raw public key)
Reject malformed Base64: FAIL INVALID_BASE64
Reject invalid length: FAIL INVALID_KEY_LENGTH
Reject duplicate public_key: FAIL DUPLICATE_PUBLIC_KEY
Must be valid Ed25519 point (cryptography library will check on verify)
status
Enum: active, verify_only, revoked
active: can sign and verify
verify_only: can only verify existing signatures, cannot be used for new signing (in trust store context, both active and verify_only allow verification, but revoked does not)
revoked: must be rejected for verification, return FAIL REVOKED_KEY
Reject unknown status: FAIL INVALID_STATUS
4. Trust Store Location & Protection (CRITICAL)
Location
Must be OUTSIDE Git repository root
Must be supplied via deployment config or explicit CLI arg --trust-store /path/outside/repo/trust_store.json or env ZYNTHEOR_TRUST_STORE
Must NOT have repository-local fallback: if path inside repo, BLOCKED REPO_LOCAL_TRUST_STORE
If not supplied, BLOCKED TRUST_STORE_MISSING
Path Validation
Reject symlinks: lstat vs stat, if symlink -> BLOCKED SYMLINK_REJECTED
Reject non-regular files: must be regular file (S_ISREG), if dir, fifo, socket -> BLOCKED NOT_REGULAR_FILE
Validate canonical paths: realpath must be outside repo, must not contain .. traversal after resolution
Check ownership and permissions where supported: file should be owned by trusted user, permissions 0600 or 0644 max, not world-writable. If cannot verify (e.g., Windows), return BLOCKED if protection cannot be verified? Per spec: If protection cannot be verified, return BLOCKED.
Canonical path check: Path.resolve() must equal realpath, must be absolute
5. Detached Signature Verification
Manifest Bytes
Verify exact manifest bytes as stored on disk, not reserialized JSON
Read manifest file as bytes, keep exact
Signature file: manifest_path + ".sig" or detached .sig supplied via --signature
Signature must be Base64 encoded Ed25519 signature (64 bytes after decode)
Verification Steps
Load trust store, validate schema, keys, no duplicates, no revoked in use
Read manifest bytes exactly
Read signature bytes (base64 decode -> 64 bytes)
For each key with status active or verify_only, attempt Ed25519 verify(manifest_bytes, signature, public_key)
If any key verifies and status active/verify_only and not revoked and known -> PASS
If signature valid but key revoked -> FAIL REVOKED_KEY
If signature valid but key unknown (not in trust store) -> FAIL UNKNOWN_KEY (should not happen if we only try keys from store, but if manifest contains key_id, check)
If no key verifies -> FAIL SIGNATURE_INVALID
If no signature file -> NOT_VERIFIED MISSING_SIGNATURE
Never trust key supplied only by artifact itself: if manifest contains "public_key", ignore, trust must come from external store
6. Negative Cases (Must Reject)
Malformed JSON trust store
Malformed Base64 public_key or signature
Invalid key length (not 32 bytes pubkey, not 64 bytes sig)
Duplicate key_id or public_key
Unsupported algorithm (e.g., RS256, ES256)
Unknown schema version
Symlinked trust store
Repo-local trust store
Non-regular file trust store
Revoked key
Unknown key
Signature over reserialized JSON (must fail if manifest whitespace changed)
7. Test Keys
Do NOT invent trusted public key for production
Do NOT generate production trust keys automatically
Test keys must be generated only inside isolated temporary test directories, using cryptography.hazmat.primitives.asymmetric.ed25519 or ed25519 test vectors, and deleted after test
8. Example Valid Trust Store (Test Only, NOT Production)
{
  "schema_version": "1.0",
  "keys": [
    {
      "key_id": "a3f5c1d2e4b6... (64 hex, sha256 of pubkey)",
      "algorithm": "Ed25519",
      "public_key": "MC4CAQAwBQYDK2VwBCIEI... (base64 32 bytes)",
      "status": "active"
    }
  ]
}
9. Error Codes
TRUST_STORE_MISSING
TRUST_STORE_INVALID_JSON
INVALID_BASE64
INVALID_KEY_LENGTH
DUPLICATE_KEY_ID
DUPLICATE_PUBLIC_KEY
UNSUPPORTED_ALGORITHM
UNSUPPORTED_SCHEMA_VERSION
SYMLINK_REJECTED
NOT_REGULAR_FILE
REPO_LOCAL_TRUST_STORE
REVOKED_KEY
UNKNOWN_KEY
SIGNATURE_INVALID
MISSING_SIGNATURE
KEY_ID_MISMATCH
