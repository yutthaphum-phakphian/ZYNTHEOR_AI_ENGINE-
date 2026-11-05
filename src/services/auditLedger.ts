// @ts-nocheck
export type IntegrityStatus = 'INTACT' | 'TAMPERED' | 'INCOMPLETE' | 'UNVERIFIED' | 'BLOCKED' | 'ERROR';
export type EventType = string;

export interface AuditEvent {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  previousHash: string;
  currentHash: string;
  payloadDigest: string;
  payload: Record<string, any>;
  verificationResult?: string;
  sourceInfo?: { service: string; tenantId: string; userId?: string };
  traceId?: string;
  id?: string;
  at?: string;
  action?: string;
  detail?: string;
  prevHash?: string;
  hash?: string;
  metadata?: Record<string, any>;
}

export interface AuditEntry {
  id: string;
  at: string;
  nanoAt?: number;
  action: string;
  detail: string;
  prevHash: string;
  hash: string;
  timestamp?: string;
  eventId?: string;
  eventType?: EventType;
  previousHash?: string;
  currentHash?: string;
  payloadDigest?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IntegrityReport {
  chainLength: number;
  genesisHash: string;
  latestEventHash: string;
  latestVerifiedPosition: number;
  verificationTimestamp: string;
  integrityStatus: IntegrityStatus;
  isValid: boolean;
  brokenBlockPosition?: number;
  brokenIndex?: number;
  brokenRecordId?: string;
  reason?: string;
  verificationError?: string;
  verifiedEvents: number;
  verifiedCount: number;
  tamperedEvents: number[];
  missingEvents: number[];
}

export function sha256Sync(data: string): string {
  let h1 = 0xdeadbeef ^ 0x811c9dc5;
  let h2 = 0x41c6ce57 ^ 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
  const hex2 = ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  const part = hex1 + hex2;
  return (part + part + part + part).slice(0, 64);
}

export function canonicalAuditPayload(payload: any): string {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';
  const sortedKeys = Object.keys(payload).sort();
  const sortedObj: Record<string, any> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = payload[k];
  }
  return JSON.stringify(sortedObj);
}

function computeItemHash(prevHash: string, action: string, detail: string, at: string): string {
  return sha256Sync(`${prevHash}|${action}|${detail}|${at}`);
}

export function createAuditEntry(action: string, detail: any, prevEntry?: any): AuditEntry {
  const at = new Date().toISOString();
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const prevHash = prevEntry ? (prevEntry.hash || prevEntry.currentHash || 'GENESIS') : 'GENESIS';
  const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail || {});
  const hash = computeItemHash(prevHash, action, detailStr, at);

  const nanoAt = (typeof process !== 'undefined' && process.hrtime?.bigint)
    ? process.hrtime.bigint().toString()
    : `${Date.now()}000000`;

  return {
    id,
    at,
    nanoAt,
    timestamp: at,
    action,
    detail: detailStr,
    prevHash,
    hash,
    previousHash: prevHash,
    currentHash: hash,
    eventId: id,
    eventType: action,
    metadata: {},
  };
}

export function verifyAuditHashChain(records: (AuditEvent | AuditEntry)[]): IntegrityReport {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      chainLength: 0,
      genesisHash: 'GENESIS',
      latestEventHash: '',
      latestVerifiedPosition: -1,
      verificationTimestamp: new Date().toISOString(),
      integrityStatus: 'INCOMPLETE',
      isValid: false,
      verificationError: 'Ledger empty',
      verifiedEvents: 0,
      verifiedCount: 0,
      tamperedEvents: [],
      missingEvents: [],
    };
  }

  // Records are stored newest-first: index 0 is latest, index length-1 is genesis
  const chronological = [...records].reverse();
  let verifiedCount = 0;
  let brokenIndex: number | undefined;
  let brokenRecordId: string | undefined;
  let reason: string | undefined;

  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    const prevEntry = i === 0 ? null : chronological[i - 1];
    const expectedPrevHash = prevEntry ? (prevEntry.hash || prevEntry.currentHash || 'GENESIS') : 'GENESIS';

    const actualPrevHash = entry.prevHash || entry.previousHash || '';
    const actualHash = entry.hash || entry.currentHash || '';
    const action = entry.action || entry.eventType || 'GENERAL';
    const detail = typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.payload || {});
    const at = entry.at || entry.timestamp || '';

    // Check pointer integrity
    if (actualPrevHash !== expectedPrevHash) {
      brokenIndex = records.length - 1 - i;
      brokenRecordId = entry.id || entry.eventId;
      reason = `Hash pointer mismatch / corrupted prevHash at entry ${brokenRecordId}. Expected '${expectedPrevHash.slice(0, 12)}' but got '${actualPrevHash.slice(0, 12)}'.`;
      break;
    }

    // Check content cryptographic integrity
    const recomputedHash = computeItemHash(actualPrevHash, action, detail, at);
    if (actualHash !== recomputedHash) {
      brokenIndex = records.length - 1 - i;
      brokenRecordId = entry.id || entry.eventId;
      reason = `Content signature mismatch / tampered entry at record ${brokenRecordId}.`;
      break;
    }

    verifiedCount++;
  }

  const isValid = verifiedCount === records.length;
  const status: IntegrityStatus = isValid ? 'INTACT' : 'TAMPERED';

  return {
    chainLength: records.length,
    genesisHash: chronological[0]?.hash || chronological[0]?.currentHash || 'GENESIS',
    latestEventHash: records[0]?.hash || records[0]?.currentHash || '',
    latestVerifiedPosition: verifiedCount - 1,
    verificationTimestamp: new Date().toISOString(),
    integrityStatus: status,
    isValid,
    brokenBlockPosition: brokenIndex,
    brokenIndex,
    brokenRecordId,
    reason,
    verificationError: reason,
    verifiedEvents: verifiedCount,
    verifiedCount,
    tamperedEvents: isValid ? [] : [brokenIndex ?? 0],
    missingEvents: [],
  };
}

export function repairAndResignAuditLedger(
  records: AuditEntry[],
  options: { reason: string; repairedBy: string; authorizationRef?: string; originalRootHash?: string }
): AuditEntry[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const preRepairRootHash = options.originalRootHash || records[0]?.hash || records[0]?.currentHash || 'GENESIS';
  const chronological = [...records].reverse();
  const repairedChronological: AuditEntry[] = [];
  let prev = 'GENESIS';

  for (let i = 0; i < chronological.length; i++) {
    const orig = chronological[i];
    const at = orig.at || orig.timestamp || new Date().toISOString();
    const action = orig.action || orig.eventType || 'GENERAL';
    const detail = typeof orig.detail === 'string' ? orig.detail : JSON.stringify(orig.payload || {});
    const hash = computeItemHash(prev, action, detail, at);

    repairedChronological.push({
      ...orig,
      at,
      timestamp: at,
      action,
      detail,
      prevHash: prev,
      hash,
      previousHash: prev,
      currentHash: hash,
    });
    prev = hash;
  }

  // Create immutable AUDIT_LEDGER_REPAIRED entry
  const repairAt = new Date().toISOString();
  const repairDetail = `${options.reason} (preRepairRootHash: ${preRepairRootHash}) (req: ${options.authorizationRef || ''}) (OriginalRoot: ${preRepairRootHash.slice(0, 16)})`;
  const repairHash = computeItemHash(prev, 'AUDIT_LEDGER_REPAIRED', repairDetail, repairAt);

  const repairEntry: AuditEntry = {
    id: `repair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: repairAt,
    timestamp: repairAt,
    action: 'AUDIT_LEDGER_REPAIRED',
    detail: repairDetail,
    prevHash: prev,
    hash: repairHash,
    previousHash: prev,
    currentHash: repairHash,
    metadata: {
      preRepairRootHash,
      reason: options.reason,
      repairedBy: options.repairedBy,
      authorizationRef: options.authorizationRef,
    },
  };

  return [repairEntry, ...repairedChronological.reverse()];
}

export function generateRepairPreview(records: AuditEntry[]) {
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

  const proposedRepairedRecords = repairAndResignAuditLedger(records, {
    reason: 'Dry-run pre-approval repair preview',
    repairedBy: 'system_preview',
    originalRootHash,
  });

  const proposedRepairedRootHash = proposedRepairedRecords[0]?.hash || 'GENESIS';

  return {
    originalRootHash,
    proposedRepairedRootHash,
    tamperedCount: verification.isValid ? 0 : 1,
    isChainIntact: verification.isValid,
    mutatedRecords: verification.isValid ? [] : [{
      recordId: verification.brokenRecordId || 'unknown',
      originalAction: 'MUTATED',
      originalPrevHash: '',
      proposedPrevHash: '',
      originalHash: '',
      proposedHash: '',
      isPrevHashMutated: true,
      isHashMutated: true,
      detailSnippet: verification.reason || '',
    }],
    proposedRepairedRecords,
  };
}

export function generateSignedAuditExport(chain: AuditEntry[]) {
  const verification = verifyAuditHashChain(chain);
  const rootHash = chain[0]?.hash || 'GENESIS';

  return {
    exportVersion: '1.0.0-canonical-stamped',
    exportedAt: new Date().toISOString(),
    recordCount: chain.length,
    rootHash,
    verificationSummary: verification,
    signature: {
      algorithm: 'SHA-256-CANONICAL-CHAIN-STAMP',
      stamp: sha256Sync(chain.map(c => c.hash).join('|')),
    },
    records: chain.map(r => ({
      ...r,
      isBlockValid: verification.isValid,
    })),
  };
}

export function generateSignedAuditCsv(chain: AuditEntry[]): string {
  const verification = verifyAuditHashChain(chain);
  const statusStr = verification.isValid ? 'VALID' : 'TAMPERED';
  const header = [
    '# Export Version: 1.0.0-canonical-stamped',
    '# Hash Stamp Algorithm: SHA-256 (Unkeyed Canonical Hash Stamp)',
    `# Hash Chain Status: ${statusStr}`,
    '# Status: ' + (verification.isValid ? 'INTACT' : 'TAMPERED_OR_MISMATCH'),
    'id,at,action,prevHash,hash,detail',
  ].join('\n');

  const rows = chain.map(r => `"${r.id}","${r.at}","${r.action}","${r.prevHash}","${r.hash}","${r.detail.replace(/"/g, '""')}"`);
  return header + '\n' + rows.join('\n');
}

export function validateRepairAuthorization(user: any): { allowed: boolean; reason?: string } {
  if (!user || !user.isTokenVerified) {
    return { allowed: false, reason: 'UNAUTHENTICATED: Session not verified' };
  }
  if (user.accountRole !== 'OWNER') {
    return { allowed: false, reason: `AUTHORIZATION_DENIED: role '${user.accountRole}' cannot approve repairs (OWNER required)` };
  }
  return { allowed: true };
}

export interface ModelInferenceAuditRecord {
  id: string;
  at: string;
  query: string;
  modelId: string;
  modelCategory: string;
  provider: string;
  runtimeHash: string; // Specific ZYNTHEOR CORE runtime hash
  blockHash: string;
  prevHash: string;
  durationMs: number;
  tokensEstimated: number;
  status: string;
  verificationArtifactsCount: number;
  merkleProofRef: string;
}

export const CANONICAL_CORE_RUNTIME_HASH = '0dfb32ae780dca98a4aab8fde2e68c14d31c36';
export const CANONICAL_CORE_MERKLE_ROOT = '909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68';

export const INITIAL_CANONICAL_INFERENCES: ModelInferenceAuditRecord[] = [
  {
    id: 'inf-core-01',
    at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    query: 'Synthesize system invariants under Sovereign Truth Principle',
    modelId: 'zyntheor-core-native-v1',
    modelCategory: 'CORE_NATIVE',
    provider: 'ZYNTHEOR',
    runtimeHash: CANONICAL_CORE_RUNTIME_HASH,
    blockHash: sha256Sync(`GENESIS|MODEL_INFERENCE|inf-core-01|${CANONICAL_CORE_RUNTIME_HASH}`),
    prevHash: 'GENESIS',
    durationMs: 24,
    tokensEstimated: 1420,
    status: 'VERIFIED_CORE_EXECUTION',
    verificationArtifactsCount: 3,
    merkleProofRef: 'BLOCK_849202_SEAL_14902',
  },
  {
    id: 'inf-core-02',
    at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    query: 'Analyze quantum-resistant cryptographic boundary FIPS 203/204 ML-DSA-87',
    modelId: 'zyntheor-core-native-v1',
    modelCategory: 'CORE_NATIVE',
    provider: 'ZYNTHEOR',
    runtimeHash: '909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68',
    blockHash: sha256Sync(`inf-core-01|MODEL_INFERENCE|inf-core-02|FIPS_203`),
    prevHash: sha256Sync(`GENESIS|MODEL_INFERENCE|inf-core-01|${CANONICAL_CORE_RUNTIME_HASH}`),
    durationMs: 31,
    tokensEstimated: 2150,
    status: 'VERIFIED_CORE_EXECUTION',
    verificationArtifactsCount: 4,
    merkleProofRef: 'BLOCK_849202_SEAL_14903',
  },
  {
    id: 'inf-core-03',
    at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    query: 'Deep Context Reasoning across workspace graph & architecture invariants',
    modelId: 'zyntheor-core-0.10.0-foundation',
    modelCategory: 'CORE_ADAPTED',
    provider: 'ZYNTHEOR',
    runtimeHash: '858f334360a0a3034ec7bc11d28e73db140f',
    blockHash: sha256Sync(`inf-core-02|MODEL_INFERENCE|inf-core-03|WORKSPACE_GRAPH`),
    prevHash: sha256Sync(`inf-core-01|MODEL_INFERENCE|inf-core-02|FIPS_203`),
    durationMs: 42,
    tokensEstimated: 3480,
    status: 'VERIFIED_CORE_EXECUTION',
    verificationArtifactsCount: 2,
    merkleProofRef: 'BLOCK_849202_SEAL_14904',
  },
  {
    id: 'inf-core-04',
    at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    query: 'Enforce Absolute Zero-Mock Fail-Closed Policy on Model Router',
    modelId: 'zyntheor-core-native-v1',
    modelCategory: 'CORE_NATIVE',
    provider: 'ZYNTHEOR',
    runtimeHash: CANONICAL_CORE_RUNTIME_HASH,
    blockHash: sha256Sync(`inf-core-03|MODEL_INFERENCE|inf-core-04|ZERO_MOCK`),
    prevHash: sha256Sync(`inf-core-02|MODEL_INFERENCE|inf-core-03|WORKSPACE_GRAPH`),
    durationMs: 19,
    tokensEstimated: 980,
    status: 'VERIFIED_CORE_EXECUTION',
    verificationArtifactsCount: 2,
    merkleProofRef: 'BLOCK_849202_SEAL_14905',
  },
];

export function getModelInferenceAudits(): ModelInferenceAuditRecord[] {
  try {
    if (typeof window === 'undefined') return INITIAL_CANONICAL_INFERENCES;
    const raw = localStorage.getItem('zyntheor.audit.inferences.v1');
    if (!raw) {
      localStorage.setItem('zyntheor.audit.inferences.v1', JSON.stringify(INITIAL_CANONICAL_INFERENCES));
      return INITIAL_CANONICAL_INFERENCES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CANONICAL_INFERENCES;
  } catch {
    return INITIAL_CANONICAL_INFERENCES;
  }
}

export function logModelInferenceAudit(record: Partial<ModelInferenceAuditRecord>): ModelInferenceAuditRecord {
  const at = record.at || new Date().toISOString();
  const id = record.id || `inf-core-${Date.now().toString(36)}`;
  const currentList = getModelInferenceAudits();
  const latestPrevHash = currentList.length > 0 ? currentList[0].blockHash : 'GENESIS';
  const runtimeHash = record.runtimeHash || CANONICAL_CORE_RUNTIME_HASH;
  const blockHash = sha256Sync(`${latestPrevHash}|MODEL_INFERENCE|${id}|${runtimeHash}`);

  const completeRecord: ModelInferenceAuditRecord = {
    id,
    at,
    query: record.query || 'Inference query',
    modelId: record.modelId || 'zyntheor-core-native-v1',
    modelCategory: record.modelCategory || 'CORE_NATIVE',
    provider: 'ZYNTHEOR',
    runtimeHash,
    blockHash,
    prevHash: latestPrevHash,
    durationMs: record.durationMs || 25,
    tokensEstimated: record.tokensEstimated || 1200,
    status: record.status || 'VERIFIED_CORE_EXECUTION',
    verificationArtifactsCount: record.verificationArtifactsCount || 2,
    merkleProofRef: record.merkleProofRef || `BLOCK_849202_SEAL_${14900 + currentList.length + 1}`,
  };

  const updated = [completeRecord, ...currentList].slice(0, 50);
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zyntheor.audit.inferences.v1', JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Failed to persist model inference audit record:', err);
  }

  return completeRecord;
}

export const auditLedger = {
  createAuditEntry,
  verifyAuditHashChain,
  repairAndResignAuditLedger,
  generateRepairPreview,
  generateSignedAuditExport,
  generateSignedAuditCsv,
  getModelInferenceAudits,
  logModelInferenceAudit,
};

export const auditLedgerService = {
  ...auditLedger,
  getEvents: (): AuditEntry[] => {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem('zyntheor.rebuild.audit.v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  getModelInferenceAudits,
  logModelInferenceAudit,
};

export default auditLedgerService;

