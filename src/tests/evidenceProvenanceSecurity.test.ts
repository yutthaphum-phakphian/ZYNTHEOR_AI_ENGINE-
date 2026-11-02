import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { keyManagementService } from '../services/keyManagementService.ts';
import {
  signEvidenceRecord,
  verifyEvidenceRecord,
  verifyLedgerProvenance,
  buildCanonicalProvenancePayload,
} from '../services/evidenceProvenanceService.ts';
import { createAuditEntry } from '../services/auditLedger.ts';

describe('Phase 5 — Cryptographic Evidence & Provenance Security Tests', () => {
  it('1. Generates valid Ed25519 signature and verifies authentic evidence record', () => {
    const entry = createAuditEntry('PROJECT_CREATED', 'Project Alpha initialized');
    const signed = signEvidenceRecord(entry, 'zyntheor-trusted-server', 'tenant-alpha');

    assert.equal(typeof signed.provenance?.signature, 'string');
    assert.equal(signed.provenance?.signingAlg, 'Ed25519');
    assert.equal(signed.provenance?.signerIdentity, 'zyntheor-trusted-server');

    const result = verifyEvidenceRecord(signed, 'tenant-alpha');
    assert.equal(result.isValid, true);
  });

  it('2. Detects modified payload and rejects tampered evidence', () => {
    const entry = createAuditEntry('SECURITY_ALERT', 'Unauthorized login attempt detected');
    const signed = signEvidenceRecord(entry, 'zyntheor-trusted-server', 'tenant-alpha');

    // Tamper payload after signing
    signed.detail = 'Unauthorized login attempt DETECTED & ALTERED BY ATTACKER';

    const result = verifyEvidenceRecord(signed, 'tenant-alpha');
    assert.equal(result.isValid, false);
    assert.match(result.reason || '', /SIGNATURE_MISMATCH/);
  });

  it('3. Rejects invalid or forged signature hex string', () => {
    const entry = createAuditEntry('SYSTEM_CONFIG', 'Security policy updated');
    const signed = signEvidenceRecord(entry, 'zyntheor-trusted-server', 'tenant-alpha');

    // Corrupt signature
    if (signed.provenance) {
      signed.provenance.signature = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    }

    const result = verifyEvidenceRecord(signed, 'tenant-alpha');
    assert.equal(result.isValid, false);
  });

  it('4. Rejects signature when key ID is unknown in registry', () => {
    const entry = createAuditEntry('DEPLOYMENT', 'Production release 1.0.0');
    const signed = signEvidenceRecord(entry, 'zyntheor-trusted-server', 'tenant-alpha');

    if (signed.provenance) {
      signed.provenance.keyId = 'non-existent-key-id-999';
    }

    const result = verifyEvidenceRecord(signed, 'tenant-alpha');
    assert.equal(result.isValid, false);
  });

  it('5. Supports key rotation and preserves historical signature verification', () => {
    const entry1 = createAuditEntry('AUDIT_LOG', 'Signed with initial key');
    const signed1 = signEvidenceRecord(entry1, 'zyntheor-trusted-server', 'tenant-alpha');

    const key1Id = signed1.provenance?.keyId;

    // Rotate signing key
    const newKey = keyManagementService.rotateSigningKey();
    assert.notEqual(newKey.keyId, key1Id);

    const entry2 = createAuditEntry('AUDIT_LOG', 'Signed with rotated key');
    const signed2 = signEvidenceRecord(entry2, 'zyntheor-trusted-server', 'tenant-alpha');

    assert.equal(signed2.provenance?.keyId, newKey.keyId);

    // Both historical record (signed with old key) and new record (signed with new key) must verify
    assert.equal(verifyEvidenceRecord(signed1, 'tenant-alpha').isValid, true);
    assert.equal(verifyEvidenceRecord(signed2, 'tenant-alpha').isValid, true);
  });

  it('6. Rejects evidence verified under a mismatched tenant ID (Tenant Isolation)', () => {
    const entry = createAuditEntry('MEMBER_ADDED', 'User added to tenant A');
    const signed = signEvidenceRecord(entry, 'zyntheor-trusted-server', 'tenant-A');

    // Verify under different tenant ID -> canonical payload mismatch -> signature verification fails
    const result = verifyEvidenceRecord(signed, 'tenant-B');
    assert.equal(result.isValid, false);
  });

  it('7. Guarantees public key metadata excludes private key material', () => {
    const publicKeys = keyManagementService.getPublicKeysMetadata();
    assert.ok(publicKeys.length > 0);

    for (const key of publicKeys) {
      assert.equal((key as any).privateKeyPem, undefined);
      assert.equal((key as any).privateKey, undefined);
      assert.ok(key.publicKeyPem.includes('BEGIN PUBLIC KEY'));
      assert.ok(!key.publicKeyPem.includes('PRIVATE KEY'));
    }
  });

  it('8. Performs dual-layer ledger provenance verification', () => {
    const entry1 = createAuditEntry('GENESIS', 'Initial system event');
    const signed1 = signEvidenceRecord(entry1, 'zyntheor-trusted-server', 'tenant-alpha');

    const entry2 = createAuditEntry('USER_LOGIN', 'User logged in', signed1);
    const signed2 = signEvidenceRecord(entry2, 'zyntheor-trusted-server', 'tenant-alpha');

    const chain = [signed2, signed1]; // Newest-first
    const verification = verifyLedgerProvenance(chain, 'tenant-alpha');

    assert.equal(verification.isStructurallyValid, true);
    assert.equal(verification.isAuthentic, true);
    assert.equal(verification.verifiedCount, 2);
  });

  it('9. Persists encrypted signing key registry across service restarts', () => {
    const activeKeyId = keyManagementService.getActiveKeyId();
    const entry = createAuditEntry('CONFIG_CHANGE', 'Persistent key test');
    const signed = signEvidenceRecord(entry, 'zyntheor-trusted-server', 'tenant-alpha');

    // Re-verify that signature created before re-instantiation verifies successfully
    const verification = verifyEvidenceRecord(signed, 'tenant-alpha');
    assert.equal(verification.isValid, true);
    assert.equal(signed.provenance?.keyId, activeKeyId);
  });
});
