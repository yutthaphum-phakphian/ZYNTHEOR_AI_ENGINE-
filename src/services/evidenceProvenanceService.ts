// @ts-nocheck
import { keyManagementService } from './keyManagementService.ts';
import { canonicalAuditPayload, sha256Sync, verifyAuditHashChain, type AuditEntry } from './auditLedger.ts';

export interface EvidenceProvenanceMetadata {
  signature: string;
  signingAlg: 'Ed25519';
  keyId: string;
  signerIdentity: string;
  schemaVersion: '2.0';
  signedAt: string;
  isSignatureValid: boolean;
}

export interface ProvenanceVerificationResult {
  isStructurallyValid: boolean; // Sequential SHA-256 hash chain continuity
  isAuthentic: boolean;        // Cryptographic Ed25519 digital signature valid
  verifiedCount: number;
  totalCount: number;
  activeKeyId: string;
  signerIdentity: string;
  failedEntryId?: string;
  reason?: string;
}

export interface SignedEvidenceEntry extends AuditEntry {
  provenance?: EvidenceProvenanceMetadata;
}

/**
 * Builds the canonical provenance payload string for Ed25519 signing.
 */
export function buildCanonicalProvenancePayload(entry: AuditEntry, tenantId = 'default-tenant'): string {
  const prevHash = entry.prevHash || 'GENESIS';
  const nanoAt = entry.nanoAt || '0';
  return `v2.0|${entry.id}|${tenantId}|${entry.at}|${nanoAt}|${entry.action}|${entry.detail}|${prevHash}`;
}

/**
 * Cryptographically signs an audit entry with the server's Ed25519 key.
 */
export function signEvidenceRecord(
  entry: AuditEntry,
  signerIdentity = 'zyntheor-trusted-server',
  tenantId = 'default-tenant'
): SignedEvidenceEntry {
  const canonicalPayload = buildCanonicalProvenancePayload(entry, tenantId);
  const signed = keyManagementService.signData(canonicalPayload);

  const provenance: EvidenceProvenanceMetadata = {
    signature: signed.signature,
    signingAlg: signed.algorithm,
    keyId: signed.keyId,
    signerIdentity,
    schemaVersion: '2.0',
    signedAt: new Date().toISOString(),
    isSignatureValid: true,
  };

  return {
    ...entry,
    keyId: signed.keyId,
    algorithm: signed.algorithm,
    metadata: {
      ...(entry.metadata || {}),
      provenance,
    },
    provenance,
  };
}

/**
 * Verifies the Ed25519 cryptographic signature of a single evidence entry.
 */
export function verifyEvidenceRecord(
  entry: SignedEvidenceEntry,
  tenantId = 'default-tenant'
): { isValid: boolean; reason?: string } {
  const provenance: EvidenceProvenanceMetadata | undefined =
    entry.provenance || entry.metadata?.provenance;

  if (!provenance) {
    return { isValid: false, reason: 'UNSIGNED_EVIDENCE: Record lacks cryptographic Ed25519 digital signature' };
  }

  if (provenance.signingAlg !== 'Ed25519') {
    return { isValid: false, reason: `UNSUPPORTED_ALGORITHM: Algorithm '${provenance.signingAlg}' is not supported` };
  }

  const canonicalPayload = buildCanonicalProvenancePayload(entry, tenantId);
  const isSignatureValid = keyManagementService.verifySignature(
    canonicalPayload,
    provenance.signature,
    provenance.keyId
  );

  if (!isSignatureValid) {
    return { isValid: false, reason: 'SIGNATURE_MISMATCH: Ed25519 signature is invalid or payload was modified after signing' };
  }

  return { isValid: true };
}

/**
 * Performs a comprehensive dual-layer verification of an audit ledger chain:
 * 1. Structural Hash Chain Integrity (SHA-256 sequential pointers)
 * 2. Cryptographic Evidence Authenticity (Ed25519 digital signatures)
 */
export function verifyLedgerProvenance(
  records: SignedEvidenceEntry[],
  tenantId = 'default-tenant'
): ProvenanceVerificationResult {
  const activeKeyId = keyManagementService.getActiveKeyId();
  const signerIdentity = 'zyntheor-trusted-server';

  if (!Array.isArray(records) || records.length === 0) {
    return {
      isStructurallyValid: true,
      isAuthentic: true,
      verifiedCount: 0,
      totalCount: 0,
      activeKeyId,
      signerIdentity,
    };
  }

  const structuralCheck = verifyAuditHashChain(records);
  let isStructurallyValid = structuralCheck.isValid;
  let isAuthentic = true;
  let verifiedCount = 0;
  let failedEntryId: string | undefined = structuralCheck.brokenRecordId;
  let reason: string | undefined = structuralCheck.reason;

  for (const current of records) {
    const sigCheck = verifyEvidenceRecord(current, tenantId);
    if (!sigCheck.isValid) {
      isAuthentic = false;
      if (!failedEntryId) {
        failedEntryId = current.id;
        reason = sigCheck.reason;
      }
    } else {
      verifiedCount++;
    }
  }

  return {
    isStructurallyValid,
    isAuthentic,
    verifiedCount,
    totalCount: records.length,
    activeKeyId,
    signerIdentity,
    failedEntryId,
    reason,
  };
}

export const evidenceProvenanceService = {
  buildCanonicalProvenancePayload,
  signEvidenceRecord,
  verifyEvidenceRecord,
  verifyLedgerProvenance,
};

export default evidenceProvenanceService;
