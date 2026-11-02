import {
  type AuditEntry,
  verifyAuditHashChain,
  repairAndResignAuditLedger,
  canonicalAuditPayload,
  sha256Sync,
  createAuditEntry,
} from './auditLedger.ts';
import { authorizeOperation } from './authorizationService.ts';
import type { AuthenticatedUser } from './authService.ts';
import { signEvidenceRecord } from './evidenceProvenanceService.ts';

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

// In-memory tenant-scoped repair requests store & evidence vault
const repairRequestsStore = new Map<string, RepairRequest[]>();
// Active repair locks for concurrency control
const activeLocks = new Set<string>();

/**
 * Generates a pre-approval preview comparing Original Root Hash vs. Proposed Repaired Root Hash,
 * highlighting exactly which records are mutated.
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

/**
 * Creates a formal Repair Request in 'AWAITING_APPROVAL' state.
 * Requires 'audit:request_repair' operation permission (OWNER or ADMIN).
 */
export function createRepairRequest(
  user: AuthenticatedUser,
  records: AuditEntry[],
  reason: string
): RepairRequest {
  if (!user || !user.isTokenVerified) {
    throw new Error('UNAUTHENTICATED: Valid session required for repair request');
  }

  const tenantId = user.tenantId || 'default-tenant';
  const auth = authorizeOperation(user, 'audit:request_repair', tenantId);
  if (!auth.allowed) {
    throw new Error(`AUTHORIZATION_DENIED: ${auth.reason}`);
  }

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new Error('INVALID_ARGUMENT: Explicit repair reason is required');
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('INVALID_ARGUMENT: Non-empty audit ledger records required');
  }

  const preview = generateRepairPreview(records);
  const repairRequestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}`;

  const request: RepairRequest = {
    repairRequestId,
    tenantId,
    originalRootHash: preview.originalRootHash,
    proposedRepairedRootHash: preview.proposedRepairedRootHash,
    detectionEvidence: {
      tamperedCount: preview.tamperedCount,
      mutatedRecordIds: preview.mutatedRecords.map(m => m.recordId),
    },
    reason: reason.trim(),
    requestedBy: user.id || 'unidentified_principal',
    requestedAt: new Date().toISOString(),
    status: 'AWAITING_APPROVAL',
    originalLedgerSnapshot: JSON.parse(JSON.stringify(records)),
  };

  const tenantRequests = repairRequestsStore.get(tenantId) || [];
  tenantRequests.unshift(request);
  repairRequestsStore.set(tenantId, tenantRequests);

  return request;
}

/**
 * Executes explicit approval of a pending Repair Request.
 * CRITICAL PHASE 4 REQUIREMENT: Strictly requires 'audit:approve_repair' (OWNER ONLY).
 * ADMIN is DENIED approval.
 */
export function approveRepairRequest(
  user: AuthenticatedUser,
  repairRequestId: string,
  currentRecords: AuditEntry[]
): { request: RepairRequest; repairedRecords: AuditEntry[] } {
  if (!user || !user.isTokenVerified) {
    throw new Error('UNAUTHENTICATED: Valid session required for repair approval');
  }

  const tenantId = user.tenantId || 'default-tenant';
  const auth = authorizeOperation(user, 'audit:approve_repair', tenantId);
  if (!auth.allowed) {
    throw new Error(`AUTHORIZATION_DENIED: ${auth.reason}`);
  }

  const tenantRequests = repairRequestsStore.get(tenantId) || [];
  const request = tenantRequests.find(r => r.repairRequestId === repairRequestId);

  if (!request) {
    throw new Error(`NOT_FOUND: Repair request '${repairRequestId}' not found for tenant`);
  }

  if (request.status !== 'AWAITING_APPROVAL') {
    throw new Error(`INVALID_STATE: Repair request is in state '${request.status}' (expected AWAITING_APPROVAL)`);
  }

  // Concurrency lock check
  const lockKey = `${tenantId}:${repairRequestId}`;
  if (activeLocks.has(lockKey)) {
    throw new Error('CONCURRENCY_CONFLICT: Repair operation already in progress');
  }

  // Optimistic concurrency / Stale Root Hash check
  const liveRootHash = currentRecords[0]?.hash || 'GENESIS';
  if (liveRootHash !== request.originalRootHash) {
    request.status = 'CANCELLED';
    throw new Error(
      `STALE_ROOT_HASH: Audit Ledger changed since repair was requested. Expected '${request.originalRootHash.slice(0, 10)}...' but live is '${liveRootHash.slice(0, 10)}...'`
    );
  }

  activeLocks.add(lockKey);

  try {
    request.status = 'REPAIR_IN_PROGRESS';

    const repairedRecordsRaw = repairAndResignAuditLedger(currentRecords, {
      reason: request.reason,
      repairedBy: user.id || 'owner_principal',
      authorizationRef: repairRequestId,
    });

    // Phase 5: Cryptographically sign the newly created repair entry (index 0) using Ed25519
    const signedRepairedRecords = repairedRecordsRaw.map((record, index) => {
      if (index === 0 && record.action === 'AUDIT_LEDGER_REPAIRED') {
        return signEvidenceRecord(record, `approved_by_${user.id || 'owner'}`, tenantId);
      }
      return record;
    });

    request.status = 'REPAIRED_WITH_HISTORY';
    request.approvedBy = user.id || 'owner_principal';
    request.approvedAt = new Date().toISOString();

    // Log explicit immutable audit entry of who authorized each repair and at what time
    const approvalAuditEntry = createAuditEntry(
      'REPAIR_APPROVAL_GRANTED',
      `Audit Ledger repair requestId '${repairRequestId}' authorized by OWNER '${request.approvedBy}' at ${request.approvedAt} for tenant '${tenantId}'. Reason: ${request.reason}`,
      signedRepairedRecords[0]
    );
    const signedApprovalEntry = signEvidenceRecord(approvalAuditEntry, request.approvedBy, tenantId);
    signedRepairedRecords.unshift(signedApprovalEntry);

    const postVerification = verifyAuditHashChain(signedRepairedRecords);
    const repairedRootHash = signedRepairedRecords[0]?.hash || 'GENESIS';

    request.repairResult = {
      repairedRootHash,
      repairedCount: signedRepairedRecords.length,
      authenticityStatus: postVerification.isValid ? 'REPAIRED_WITH_HISTORY' : 'AUTHENTICITY_UNVERIFIED',
    };

    return { request, repairedRecords: signedRepairedRecords };
  } catch (err: any) {
    request.status = 'FAILED';
    throw err;
  } finally {
    activeLocks.delete(lockKey);
  }
}

/**
 * Rejects a pending repair request. Requires 'audit:request_repair' (OWNER or ADMIN).
 */
export function rejectRepairRequest(user: AuthenticatedUser, repairRequestId: string): RepairRequest {
  if (!user || !user.isTokenVerified) {
    throw new Error('UNAUTHENTICATED: Valid session required for rejection');
  }

  const tenantId = user.tenantId || 'default-tenant';
  const auth = authorizeOperation(user, 'audit:request_repair', tenantId);
  if (!auth.allowed) {
    throw new Error(`AUTHORIZATION_DENIED: ${auth.reason}`);
  }

  const tenantRequests = repairRequestsStore.get(tenantId) || [];
  const request = tenantRequests.find(r => r.repairRequestId === repairRequestId);

  if (!request) {
    throw new Error(`NOT_FOUND: Repair request '${repairRequestId}' not found`);
  }

  if (request.status !== 'AWAITING_APPROVAL') {
    throw new Error(`INVALID_STATE: Repair request is in state '${request.status}'`);
  }

  request.status = 'REJECTED';
  request.rejectedBy = user.id;
  request.rejectedAt = new Date().toISOString();

  return request;
}

/**
 * Gets tenant-scoped repair requests. Requires 'audit:view'.
 */
export function getTenantRepairRequests(user: AuthenticatedUser): RepairRequest[] {
  if (!user || !user.isTokenVerified) {
    throw new Error('UNAUTHENTICATED: Valid session required');
  }

  const tenantId = user.tenantId || 'default-tenant';
  const auth = authorizeOperation(user, 'audit:view', tenantId);
  if (!auth.allowed) {
    throw new Error(`AUTHORIZATION_DENIED: ${auth.reason}`);
  }

  return repairRequestsStore.get(tenantId) || [];
}

export interface AuthorizationValidationResult {
  allowed: boolean;
  reason?: string;
  userRole?: string;
  tenantId?: string;
}

/**
 * Validates whether the authenticated principal has the required role to authorize or approve audit ledger repairs.
 * Performs server-side session checks and rejects any repair request from non-OWNER roles for approval.
 */
export function validateRepairAuthorization(
  user: AuthenticatedUser | any,
  targetTenantId?: string,
  requiredRole: 'OWNER' | 'ADMIN' = 'OWNER'
): AuthorizationValidationResult {
  if (!user || typeof user !== 'object' || !user.isTokenVerified) {
    return {
      allowed: false,
      reason: 'UNAUTHENTICATED: Valid, verified server session is required for repair authorization',
      userRole: 'UNAUTHENTICATED',
    };
  }

  // Derive effective role from verified server session (never trust client header or body role inputs)
  const role = user.accountRole
    ? String(user.accountRole).toUpperCase()
    : user.role === 'admin' && user.id === 'owner-workspace'
    ? 'OWNER'
    : user.role === 'admin'
    ? 'ADMIN'
    : user.role === 'engineer'
    ? 'DEVELOPER'
    : 'VIEWER';

  if (requiredRole === 'OWNER' && role !== 'OWNER') {
    return {
      allowed: false,
      reason: `AUTHORIZATION_DENIED: Role '${role}' is not authorized to execute audit ledger repairs. OWNER role required.`,
      userRole: role,
      tenantId: user.tenantId,
    };
  }

  if (requiredRole === 'ADMIN' && role !== 'OWNER' && role !== 'ADMIN') {
    return {
      allowed: false,
      reason: `AUTHORIZATION_DENIED: Role '${role}' is not authorized to request audit ledger repairs. OWNER or ADMIN required.`,
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
    userRole: role,
    tenantId: user.tenantId || 'default-tenant',
  };
}

/**
 * Enforces tenant isolation on repair requests, ensuring operations are strictly tenant-scoped
 * and preventing cross-tenant ledger modification or inspection.
 */
export function enforceTenantIsolation(
  principalTenantId: string | undefined,
  targetTenantId: string | undefined
): { isolated: boolean; reason?: string } {
  const pTenant = principalTenantId || 'default-tenant';
  const tTenant = targetTenantId || 'default-tenant';

  if (pTenant !== tTenant) {
    return {
      isolated: false,
      reason: `TENANT_ISOLATION_VIOLATION: Principal tenant '${pTenant}' is not authorized to access target tenant '${tTenant}'`,
    };
  }

  return { isolated: true };
}

export const repairGovernanceService = {
  generateRepairPreview,
  createRepairRequest,
  approveRepairRequest,
  rejectRepairRequest,
  getTenantRepairRequests,
  validateRepairAuthorization,
  enforceTenantIsolation,
};

export default repairGovernanceService;
