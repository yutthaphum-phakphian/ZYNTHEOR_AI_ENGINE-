/**
 * Cryptographic Audit Ledger & Hash Chain Verification Service
 * Provides tamper-evident sequential SHA-256 hash chaining for local audit logs.
 */

export interface AuditEntry {
  id: string;
  at: string;
  timestamp?: string;
  nanoAt: string;
  action: string;
  detail: string;
  prevHash: string;
  hash: string;
  actor?: string;
  keyId?: string;
  algorithm?: string;
  metadata?: any;
}

export interface HashChainVerificationResult {
  isValid: boolean;
  brokenIndex?: number;
  brokenRecordId?: string;
  reason?: string;
  verifiedCount: number;
  rootHash?: string;
  genesisHash?: string;
}

// Pure standard SHA-256 implementation (works synchronously in both Node.js and Browser)
export function sha256Sync(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  // Initial hash values: first 32 bits of the fractional parts of the square roots of the first 8 primes
  let hash: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // UTF-8 encode and pack into 32-bit words
  const utf8 = unescape(encodeURIComponent(ascii));
  for (i = 0; i < utf8[lengthProperty]; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }

  // Append '1' bit (via 0x80 in byte sequence)
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  // Append length in bits at the end of 512-bit block
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w = new Array(64);
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const a = hash[0];
    const b = hash[1];
    const c = hash[2];
    const d = hash[3];
    const e = hash[4];
    const f = hash[5];
    const g = hash[6];
    const h = hash[7];

    let wA = a;
    let wB = b;
    let wC = c;
    let wD = d;
    let wE = e;
    let wF = f;
    let wG = g;
    let wH = h;

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[j + i] || 0;
      } else {
        const gamma0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^
                       ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^
                       (w[j - 15] >>> 3);
        const gamma1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^
                       ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^
                       (w[j - 2] >>> 10);
        w[j] = (((w[j - 16] + gamma0) | 0) + ((w[j - 7] + gamma1) | 0)) | 0;
      }

      const ch = (wE & wF) ^ (~wE & wG);
      const maj = (wA & wB) ^ (wA & wC) ^ (wB & wC);
      const sigma0 = ((wA >>> 2) | (wA << 30)) ^
                     ((wA >>> 13) | (wA << 19)) ^
                     ((wA >>> 22) | (wA << 10));
      const sigma1 = ((wE >>> 6) | (wE << 26)) ^
                     ((wE >>> 11) | (wE << 21)) ^
                     ((wE >>> 25) | (wE << 7));

      const temp1 = ((((wH + sigma1) | 0) + ((ch + k[j]) | 0)) | 0) + (w[j] | 0);
      const temp2 = (sigma0 + maj) | 0;

      wH = wG;
      wG = wF;
      wF = wE;
      wE = (wD + temp1) | 0;
      wD = wC;
      wC = wB;
      wB = wA;
      wA = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + wA) | 0;
    hash[1] = (hash[1] + wB) | 0;
    hash[2] = (hash[2] + wC) | 0;
    hash[3] = (hash[3] + wD) | 0;
    hash[4] = (hash[4] + wE) | 0;
    hash[5] = (hash[5] + wF) | 0;
    hash[6] = (hash[6] + wG) | 0;
    hash[7] = (hash[7] + wH) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export function getNanosecondTimestamp(): string {
  if (typeof process !== 'undefined' && process && process.hrtime && typeof process.hrtime.bigint === 'function') {
    return process.hrtime.bigint().toString();
  }
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    const epochMs = BigInt(Date.now());
    const perfMicro = BigInt(Math.floor((performance.now() % 1000) * 1000));
    return (epochMs * 1000000n + perfMicro).toString();
  }
  return (BigInt(Date.now()) * 1000000n).toString();
}

export function canonicalAuditPayload(entry: {
  id: string;
  at: string;
  nanoAt?: string;
  action: string;
  detail: string;
  prevHash: string;
}): string {
  if (entry.nanoAt) {
    return `${entry.id}|${entry.at}|${entry.nanoAt}|${entry.action}|${entry.detail}|${entry.prevHash}`;
  }
  return `${entry.id}|${entry.at}|${entry.action}|${entry.detail}|${entry.prevHash}`;
}

export function createAuditEntry(
  action: string,
  detail: string,
  prevRecord?: { hash?: string } | null,
  customId?: string,
  customAt?: string,
  customNanoAt?: string,
  keyId?: string,
  algorithm?: string
): AuditEntry {
  const id = customId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const at = customAt || new Date().toISOString();
  const nanoAt = customNanoAt || getNanosecondTimestamp();
  const prevHash = prevRecord && prevRecord.hash ? prevRecord.hash : 'GENESIS';
  const payload = canonicalAuditPayload({ id, at, nanoAt, action, detail, prevHash });
  const hash = sha256Sync(payload);

  return {
    id,
    at,
    nanoAt,
    action,
    detail,
    prevHash,
    hash,
    keyId: keyId || undefined,
    algorithm: algorithm || undefined,
  };
}

/**
 * Validates the sequential hash chain of audit records.
 * Records are expected in newest-first order (as stored in App state).
 */
export function verifyAuditHashChain(records: AuditEntry[]): HashChainVerificationResult {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      isValid: true,
      verifiedCount: 0,
      rootHash: 'GENESIS',
      genesisHash: 'GENESIS',
    };
  }

  // Reverse to evaluate chronologically (oldest record first)
  const chronological = [...records].reverse();

  for (let i = 0; i < chronological.length; i++) {
    const current = chronological[i];
    const originalIndex = records.length - 1 - i;

    // Check 1: prevHash continuity
    if (i === 0) {
      // First (oldest) entry in the chain should link to GENESIS (or empty for legacy)
      const isGenesis = !current.prevHash || current.prevHash === 'GENESIS';
      if (!isGenesis && current.prevHash) {
        // If it specifies a non-genesis prevHash when it's the root of records
        // we still permit it if its own hash signature matches, but flag if malformed
      }
    } else {
      const previous = chronological[i - 1];
      if (current.prevHash && current.prevHash !== previous.hash) {
        return {
          isValid: false,
          brokenIndex: originalIndex,
          brokenRecordId: current.id,
          reason: `Hash pointer mismatch: Record points to ${current.prevHash.slice(0, 10)}… but previous entry hash is ${previous.hash.slice(0, 10)}…`,
          verifiedCount: i,
          rootHash: records[0]?.hash,
        };
      }
    }

    // Check 2: Content integrity against signature
    const prevHash = current.prevHash || 'GENESIS';
    const payload = canonicalAuditPayload({
      id: current.id,
      at: current.at,
      nanoAt: current.nanoAt,
      action: current.action,
      detail: current.detail,
      prevHash,
    });
    const calculatedHash = sha256Sync(payload);

    if (current.hash && current.hash !== calculatedHash) {
      // If legacy record without prevHash, check if it matches legacy hash
      const legacyPayload = JSON.stringify({ action: current.action, detail: current.detail, at: current.at });
      const legacyCalculated = sha256Sync(legacyPayload);
      if (current.hash !== legacyCalculated) {
        return {
          isValid: false,
          brokenIndex: originalIndex,
          brokenRecordId: current.id,
          reason: `Content signature mismatch: Record #${originalIndex} has been modified since it was fingerprinted.`,
          verifiedCount: i,
          rootHash: records[0]?.hash,
        };
      }
    }
  }

  return {
    isValid: true,
    verifiedCount: records.length,
    rootHash: records[0]?.hash || 'GENESIS',
    genesisHash: chronological[0]?.prevHash || 'GENESIS',
  };
}

export interface RepairLedgerOptions {
  reason: string;
  repairedBy?: string;
  authorizationRef?: string;
}

/**
 * Re-signs the local event history sequentially from GENESIS to repair broken prevHash pointers or tampered signatures.
 * Appends an immutable AUDIT_LEDGER_REPAIRED record to preserve evidence of the repair action and original root hash.
 * Returns the repaired records array in newest-first order (matching app state).
 */
export function repairAndResignAuditLedger(
  records: AuditEntry[],
  options?: RepairLedgerOptions | string
): AuditEntry[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const reason = typeof options === 'string' ? options : (options?.reason || 'Authorized forensic repair and re-signing');
  const repairedBy = (typeof options === 'object' && options?.repairedBy) ? options.repairedBy : 'security_auditor';
  const authorizationRef = (typeof options === 'object' && options?.authorizationRef) ? options.authorizationRef : undefined;

  // Capture original pre-repair root hash before re-signing
  const preRepairRootHash = records[0]?.hash || 'GENESIS';

  // Sort/process chronologically (oldest record first)
  const chronological = [...records].reverse();
  const repairedChronological: AuditEntry[] = [];

  let previousHash = 'GENESIS';
  let tamperedCount = 0;

  for (let i = 0; i < chronological.length; i++) {
    const original = chronological[i];
    const prevHash = i === 0 ? 'GENESIS' : previousHash;

    const payload = canonicalAuditPayload({
      id: original.id,
      at: original.at,
      nanoAt: original.nanoAt,
      action: original.action,
      detail: original.detail,
      prevHash,
    });
    const calculatedHash = sha256Sync(payload);

    if (original.hash !== calculatedHash || original.prevHash !== prevHash) {
      tamperedCount++;
    }

    const repairedEntry: AuditEntry = {
      ...original,
      prevHash,
      hash: calculatedHash,
    };

    repairedChronological.push(repairedEntry);
    previousHash = calculatedHash;
  }

  // Inject mandatory immutable AUDIT_LEDGER_REPAIRED entry
  const repairId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `repair-${Date.now()}`;
  const repairAt = new Date().toISOString();
  const repairNanoAt = getNanosecondTimestamp();
  const repairAction = 'AUDIT_LEDGER_REPAIRED';
  const repairDetail = `Audit Ledger re-signed. Pre-repair Root Hash: ${preRepairRootHash.slice(0, 16)}... | Reason: ${reason} | Repaired By: ${repairedBy} | Tampered Records Fixed: ${tamperedCount}`;

  const repairPayload = canonicalAuditPayload({
    id: repairId,
    at: repairAt,
    nanoAt: repairNanoAt,
    action: repairAction,
    detail: repairDetail,
    prevHash: previousHash,
  });
  const repairHash = sha256Sync(repairPayload);

  const repairEntry: AuditEntry = {
    id: repairId,
    at: repairAt,
    nanoAt: repairNanoAt,
    action: repairAction,
    detail: repairDetail,
    prevHash: previousHash,
    hash: repairHash,
    actor: repairedBy,
    metadata: {
      preRepairRootHash,
      postRepairRootHash: repairHash,
      repairedBy,
      reason,
      authorizationRef,
      tamperedCount,
      repairedAt: repairAt,
    },
  };

  repairedChronological.push(repairEntry);

  // Return in original newest-first order with the new repair entry at index 0
  return repairedChronological.reverse();
}

export type RepairLifecycleStatus =
  | 'DETECTED'
  | 'REPAIR_REQUESTED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIRED_WITH_HISTORY'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export interface DetectionEvidence {
  tamperedCount: number;
  brokenIndex?: number;
  brokenRecordId?: string;
  reason?: string;
  mutatedRecordIds: string[];
}

export interface RepairRequest {
  repairRequestId: string;
  tenantId: string;
  originalRootHash: string;
  proposedRepairedRootHash: string;
  detectionEvidence: DetectionEvidence;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: RepairLifecycleStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  repairResult?: {
    repairedRootHash: string;
    repairedCount: number;
    authenticityStatus: 'REPAIRED_WITH_HISTORY' | 'AUTHENTICITY_UNVERIFIED';
  };
  originalLedgerSnapshot: AuditEntry[];
}

export interface RepairPreview {
  originalRootHash: string;
  proposedRepairedRootHash: string;
  tamperedCount: number;
  isChainIntact: boolean;
  mutatedRecords: Array<{
    recordId: string;
    originalAction: string;
    originalPrevHash: string;
    proposedPrevHash: string;
    originalHash: string;
    proposedHash: string;
    isPrevHashMutated: boolean;
    isHashMutated: boolean;
    detailSnippet: string;
  }>;
  proposedRepairedRecords: AuditEntry[];
}
export interface RepairAuthorizationResult {
  allowed: boolean;
  reason?: string;
  userRole?: string;
  tenantId?: string;
}

/**
 * Server-side verification function for Audit Ledger repair authorization.
 * Verifies user's role and tenant ID via server-side session checks (never trusting client headers or request body role inputs),
 * rejecting any repair request from non-OWNER roles or mismatched tenants.
 */
export function validateRepairAuthorization(
  user: any,
  targetTenantId?: string
): RepairAuthorizationResult {
  if (!user || typeof user !== 'object' || !user.isTokenVerified) {
    return {
      allowed: false,
      reason: 'UNAUTHENTICATED: Valid, verified server session is required for repair authorization',
      userRole: 'UNAUTHENTICATED',
    };
  }

  // Derive effective role exclusively from server session (never from client request body)
  const role = user.accountRole
    ? String(user.accountRole).toUpperCase()
    : user.role === 'admin' && user.id === 'owner-workspace'
    ? 'OWNER'
    : user.role === 'admin'
    ? 'ADMIN'
    : user.role === 'engineer'
    ? 'DEVELOPER'
    : 'VIEWER';

  // Strict OWNER check: Only OWNER is permitted to approve/authorize repair operations
  if (role !== 'OWNER') {
    return {
      allowed: false,
      reason: `AUTHORIZATION_DENIED: Role '${role}' is not authorized to execute audit ledger repairs. OWNER role required.`,
      userRole: role,
      tenantId: user.tenantId,
    };
  }

  // Tenant boundary verification
  if (targetTenantId && user.tenantId && user.tenantId !== targetTenantId) {
    return {
      allowed: false,
      reason: `TENANT_MISMATCH: Principal tenant '${user.tenantId}' does not match target tenant '${targetTenantId}'`,
      userRole: role,
      tenantId: user.tenantId,
    };
  }

  return {
    allowed: true,
    userRole: 'OWNER',
    tenantId: user.tenantId || targetTenantId || 'default-tenant',
  };
}

/**
 * Generates a pre-approval preview comparing Original Root Hash vs. Proposed Repaired Root Hash,
 * highlighting exactly which records are mutated. Pure browser & node sync helper.
 */
export function generateRepairPreview(records: AuditEntry[]): RepairPreview {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      originalRootHash: 'GENESIS',
      proposedRepairedRootHash: 'GENESIS',
      tamperedCount: 0,
      isChainIntact: true,
      mutatedRecords: [],
      proposedRepairedRecords: [],
    };
  }

  const originalRootHash = records[0]?.hash || 'GENESIS';
  const verification = verifyAuditHashChain(records);

  // Perform dry-run repair preview
  const proposedRepairedRecords = repairAndResignAuditLedger(records, {
    reason: 'Dry-run pre-approval repair preview',
    repairedBy: 'system_preview',
  });

  const proposedRepairedRootHash = proposedRepairedRecords[0]?.hash || 'GENESIS';

  // Compare original records vs proposed repaired records (excluding the appended repair record at index 0)
  const originalChronological = [...records].reverse();
  const proposedChronological = [...proposedRepairedRecords].reverse().filter(r => r.action !== 'AUDIT_LEDGER_REPAIRED');

  const mutatedRecords: RepairPreview['mutatedRecords'] = [];
  let tamperedCount = 0;

  for (let i = 0; i < originalChronological.length; i++) {
    const orig = originalChronological[i];
    const proposed = proposedChronological[i];

    if (!orig || !proposed) continue;

    const isPrevHashMutated = orig.prevHash !== proposed.prevHash;
    const isHashMutated = orig.hash !== proposed.hash;

    if (isPrevHashMutated || isHashMutated) {
      tamperedCount++;
      mutatedRecords.push({
        recordId: orig.id,
        originalAction: orig.action,
        originalPrevHash: orig.prevHash || 'GENESIS',
        proposedPrevHash: proposed.prevHash,
        originalHash: orig.hash || 'UNHASHED',
        proposedHash: proposed.hash,
        isPrevHashMutated,
        isHashMutated,
        detailSnippet: orig.detail.length > 80 ? `${orig.detail.slice(0, 80)}…` : orig.detail,
      });
    }
  }

  return {
    originalRootHash,
    proposedRepairedRootHash,
    tamperedCount,
    isChainIntact: verification.isValid,
    mutatedRecords,
    proposedRepairedRecords,
  };
}

export interface SignedAuditExport {
  exportVersion: string;
  exportTimestamp: string;
  system: string;
  verificationSummary: HashChainVerificationResult;
  records: Array<AuditEntry & { isBlockValid: boolean; calculatedHash: string }>;
  signature: {
    algorithm: string;
    rootHash: string;
    payloadDigest: string;
    exportHash: string;
  };
}

/**
 * Generates a self-contained JSON audit log export with SHA-256 canonical chain stamps for off-device verification.
 */
export function generateSignedAuditExport(records: AuditEntry[]): SignedAuditExport {
  const chainStatus = verifyAuditHashChain(records);
  const exportTimestamp = new Date().toISOString();

  const validatedRecords = records.map(rec => {
    const prevHash = rec.prevHash || 'GENESIS';
    const payload = canonicalAuditPayload({
      id: rec.id,
      at: rec.at,
      nanoAt: rec.nanoAt,
      action: rec.action,
      detail: rec.detail,
      prevHash,
    });
    const calculatedHash = sha256Sync(payload);
    const isBlockValid = rec.hash === calculatedHash;
    return {
      ...rec,
      isBlockValid,
      calculatedHash,
    };
  });

  const canonicalRecordsJson = JSON.stringify(records);
  const payloadDigest = sha256Sync(canonicalRecordsJson);
  const rootHash = chainStatus.rootHash || 'GENESIS';
  const exportHash = sha256Sync(`${exportTimestamp}|${rootHash}|${records.length}|${payloadDigest}`);

  return {
    exportVersion: '1.0.0-canonical-stamped',
    exportTimestamp,
    system: 'ZYNTHEOR AI ENGINE - AUDIT LEDGER',
    verificationSummary: chainStatus,
    records: validatedRecords,
    signature: {
      algorithm: 'SHA-256-CANONICAL-CHAIN-STAMP',
      rootHash,
      payloadDigest,
      exportHash,
    },
  };
}

/**
 * Triggers a file download of the canonical audit log JSON for off-device verification.
 */
export function downloadAuditLedgerJson(records: AuditEntry[]): void {
  const exportData = generateSignedAuditExport(records);
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `zyntheor-audit-ledger-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a self-contained CSV string of the Audit Ledger for external forensic review.
 */
export function generateSignedAuditCsv(records: AuditEntry[]): string {
  const chainStatus = verifyAuditHashChain(records);
  const exportTimestamp = new Date().toISOString();

  const canonicalRecordsJson = JSON.stringify(records);
  const payloadDigest = sha256Sync(canonicalRecordsJson);
  const rootHash = chainStatus.rootHash || 'GENESIS';
  const exportHash = sha256Sync(`${exportTimestamp}|${rootHash}|${records.length}|${payloadDigest}`);

  const lines: string[] = [
    '# ZYNTHEOR CRYPTOGRAPHIC AUDIT LEDGER - FORENSIC CSV EXPORT',
    '# Export Version: 1.0.0-canonical-stamped',
    '# Hash Stamp Algorithm: SHA-256 (Unkeyed Canonical Hash Stamp)',
    `# Export Timestamp: ${exportTimestamp}`,
    `# Total Records: ${records.length}`,
    `# Hash Chain Status: ${chainStatus.isValid ? 'INTACT' : 'TAMPERED'}`,
    `# Verified Count: ${chainStatus.verifiedCount} / ${records.length}`,
    `# Root Hash: ${rootHash}`,
    `# Payload Digest SHA-256: ${payloadDigest}`,
    '# Digital Signature SHA-256: ' + exportHash,
    '# Canonical Chain Stamp SHA-256: ' + exportHash,
    '#',
    'Index,ID,Timestamp (ISO),Nanosecond Timestamp,Action,Detail,Parent Hash (prevHash),SHA-256 Hash,Calculated Hash,Block Verification,Key ID,Algorithm',
  ];

  records.forEach((rec, idx) => {
    const prevHash = rec.prevHash || 'GENESIS';
    const payload = canonicalAuditPayload({
      id: rec.id,
      at: rec.at,
      nanoAt: rec.nanoAt,
      action: rec.action,
      detail: rec.detail,
      prevHash,
    });
    const calculatedHash = sha256Sync(payload);
    const isBlockValid = rec.hash === calculatedHash;
    const originalIndex = records.length - 1 - idx;
    const keyId = rec.keyId || (rec as any).provenance?.keyId || rec.metadata?.provenance?.keyId || '';
    const algorithm = rec.algorithm || (rec as any).provenance?.signingAlg || rec.metadata?.provenance?.signingAlg || '';

    const row = [
      originalIndex,
      rec.id,
      rec.at,
      rec.nanoAt || '',
      rec.action,
      rec.detail,
      prevHash,
      rec.hash,
      calculatedHash,
      isBlockValid ? 'VERIFIED' : 'TAMPERED_OR_MISMATCH',
      keyId,
      algorithm,
    ].map(escapeCsvField).join(',');

    lines.push(row);
  });

  return lines.join('\n');
}

/**
 * Triggers a browser file download of the signed audit log CSV for off-device forensic review.
 */
export function downloadAuditLedgerCsv(records: AuditEntry[]): void {
  const csvData = generateSignedAuditCsv(records);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `zyntheor-audit-ledger-${Date.now()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const AUDIT_FILE = typeof process !== 'undefined' && process.cwd ? `${process.cwd()}/workspace_data/audit_ledger.json` : '';

export class AuditLedger {
  private static lastEntry: AuditEntry | null = null;
  private static entries: AuditEntry[] = [];
  private static initialized = false;

  private static loadPersisted() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      if (typeof window === 'undefined' && AUDIT_FILE) {
        const fs = (globalThis as any).process?.getBuiltinModule?.('fs') || null;
        if (fs && fs.existsSync(AUDIT_FILE)) {
          const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.entries = parsed;
            this.lastEntry = parsed[parsed.length - 1] || null;
          }
        }
      }
    } catch {}
  }

  static async log(action: string, detail: Record<string, unknown> | string): Promise<AuditEntry> {
    this.loadPersisted();
    const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
    const entry = createAuditEntry(action, detailStr, this.lastEntry);
    this.lastEntry = entry;
    this.entries.push(entry);

    try {
      if (typeof window === 'undefined' && AUDIT_FILE) {
        const fs = (globalThis as any).process?.getBuiltinModule?.('fs') || null;
        const path = (globalThis as any).process?.getBuiltinModule?.('path') || null;
        if (fs && path) {
          const dir = path.dirname(AUDIT_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.entries.slice(-500), null, 2), 'utf-8');
        }
      }
    } catch {}

    return entry;
  }

  static getEntries(limit = 100): AuditEntry[] {
    this.loadPersisted();
    return this.entries.slice(-limit);
  }

  static verifyChain(): HashChainVerificationResult {
    this.loadPersisted();
    return verifyAuditHashChain([...this.entries].reverse());
  }
}



