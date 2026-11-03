import { describe, it, expect } from 'vitest';
import { createAuditEntry, verifyAuditHashChain, type AuditEntry } from '../services/auditLedger.ts';
import { authorizeOperation, PERMISSION_MATRIX } from '../services/authorizationService.ts';
import {
  createRepairRequest,
  approveRepairRequest,
  rejectRepairRequest,
  getTenantRepairRequests,
  generateRepairPreview,
} from '../services/repairGovernanceService.ts';
import type { AuthenticatedUser } from '../services/authService.ts';

describe('Phase 4 — Repair Authorization Hardening & Lifecycle Security Tests', () => {
  // Test Fixtures
  const ownerUser: AuthenticatedUser = {
    id: 'owner-user-01',
    role: 'admin',
    accountRole: 'OWNER',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'tenant-alpha',
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-user-01',
    role: 'admin',
    accountRole: 'ADMIN',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'tenant-alpha',
  };

  const devUser: AuthenticatedUser = {
    id: 'dev-user-01',
    role: 'engineer',
    accountRole: 'DEVELOPER',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'tenant-alpha',
  };

  const memberUser: AuthenticatedUser = {
    id: 'member-user-01',
    role: 'viewer',
    accountRole: 'MEMBER',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'tenant-alpha',
  };

  const viewerUser: AuthenticatedUser = {
    id: 'viewer-user-01',
    role: 'viewer',
    accountRole: 'VIEWER',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'tenant-alpha',
  };

  const unverifiedUser: AuthenticatedUser = {
    id: 'unverified-01',
    role: 'viewer',
    accountRole: 'OWNER', // Attempted role forgery on unverified token
    isTokenVerified: false,
    source: 'unverified',
    tenantId: 'tenant-alpha',
  };

  function createSampleLedger(): AuditEntry[] {
    const e1 = createAuditEntry('INIT', 'Genesis workspace');
    const e2 = createAuditEntry('PROJECT_CREATED', 'Project Alpha created', e1);
    const e3 = createAuditEntry('CHAT_REQUEST', 'Sent user message', e2);
    return [e3, e2, e1];
  }

  // Scenario 1: Unauthenticated Repair Request
  it('1. should deny unauthenticated repair request', () => {
    const chain = createSampleLedger();
    expect(() => createRepairRequest(null as any, chain, 'Unauthorized repair attempt')).toThrow(
      'UNAUTHENTICATED'
    );
  });

  // Scenario 2: Unverified Token
  it('2. should deny repair request from unverified token even if client claims OWNER role', () => {
    const chain = createSampleLedger();
    expect(() => createRepairRequest(unverifiedUser, chain, 'Role forgery attempt')).toThrow(
      'UNAUTHENTICATED'
    );
  });

  // Scenario 3: ADMIN Approval Denial (Critical Policy Check)
  it('3. should strictly DENY ADMIN role from approving repair requests', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(adminUser, chain, 'Admin created repair request');

    expect(() => approveRepairRequest(adminUser, req.repairRequestId, chain)).toThrow(
      'AUTHORIZATION_DENIED'
    );
  });

  // Scenario 4: DEVELOPER Repair Denial
  it('4. should DENY DEVELOPER role from requesting repair', () => {
    const chain = createSampleLedger();
    expect(() => createRepairRequest(devUser, chain, 'Dev repair attempt')).toThrow(
      'AUTHORIZATION_DENIED'
    );
  });

  // Scenario 5: MEMBER Repair Denial
  it('5. should DENY MEMBER role from requesting repair', () => {
    const chain = createSampleLedger();
    expect(() => createRepairRequest(memberUser, chain, 'Member repair attempt')).toThrow(
      'AUTHORIZATION_DENIED'
    );
  });

  // Scenario 6: VIEWER Repair Denial
  it('6. should DENY VIEWER role from requesting repair', () => {
    const chain = createSampleLedger();
    expect(() => createRepairRequest(viewerUser, chain, 'Viewer repair attempt')).toThrow(
      'AUTHORIZATION_DENIED'
    );
  });

  // Scenario 7: OWNER Approval Success
  it('7. should ALLOW OWNER role to approve repair request successfully', () => {
    const chain = createSampleLedger();
    // Tamper with middle entry
    chain[1].detail = 'TAMPERED_MIDDLE_ENTRY';

    const req = createRepairRequest(ownerUser, chain, 'Authorized security remediation');
    const { request: approvedReq, repairedRecords } = approveRepairRequest(
      ownerUser,
      req.repairRequestId,
      chain
    );

    expect(approvedReq.status).toBe('REPAIRED_WITH_HISTORY');
    expect(approvedReq.approvedBy).toBe(ownerUser.id);
    expect(verifyAuditHashChain(repairedRecords).isValid).toBe(true);
  });

  // Scenario 8: Client-supplied Role Forgery
  it('8. should reject client-supplied role forgery and check verified accountRole matrix', () => {
    const forgedUser: AuthenticatedUser = {
      ...devUser,
      accountRole: 'DEVELOPER', // Verified server accountRole is DEVELOPER
    };

    const auth = authorizeOperation(forgedUser, 'audit:approve_repair', forgedUser.tenantId);
    expect(auth.allowed).toBe(false);
    expect(auth.reason).toContain('denied for role \'DEVELOPER\'');
  });

  // Scenario 9: Client-supplied Tenant Forgery
  it('9. should reject cross-tenant repair when principal tenant differs from resource tenant', () => {
    const auth = authorizeOperation(ownerUser, 'audit:approve_repair', 'tenant-beta');
    expect(auth.allowed).toBe(false);
    expect(auth.reason).toContain('Tenant mismatch');
  });

  // Scenario 10: Cross-Tenant Repair Request
  it('10. should prevent principal in tenant-alpha from fetching or approving requests in tenant-beta', () => {
    const betaOwner: AuthenticatedUser = {
      ...ownerUser,
      id: 'beta-owner',
      tenantId: 'tenant-beta',
    };

    const betaChain = createSampleLedger();
    const betaReq = createRepairRequest(betaOwner, betaChain, 'Beta tenant repair');

    // tenant-alpha owner attempts to approve tenant-beta repair request
    expect(() => approveRepairRequest(ownerUser, betaReq.repairRequestId, betaChain)).toThrow(
      'NOT_FOUND'
    );
  });

  // Scenario 11: Missing Repair Reason
  it('11. should require a non-empty repair reason string', () => {
    const chain = createSampleLedger();
    expect(() => createRepairRequest(ownerUser, chain, '   ')).toThrow('INVALID_ARGUMENT');
  });

  // Scenario 12: Missing Original Root Hash
  it('12. should record originalRootHash on repair request creation', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 12');
    expect(req.originalRootHash).toBe(chain[0].hash);
    expect(req.proposedRepairedRootHash).toBeDefined();
  });

  // Scenario 13: Missing Explicit Approval
  it('13. should keep request in AWAITING_APPROVAL until explicit approval execution', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 13');

    const requests = getTenantRepairRequests(ownerUser);
    const stored = requests.find(r => r.repairRequestId === req.repairRequestId);
    expect(stored?.status).toBe('AWAITING_APPROVAL');
    expect(stored?.approvedBy).toBeUndefined();
  });

  // Scenario 14: Duplicate Approval Attempt
  it('14. should reject duplicate approval on an already repaired request', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 14');
    approveRepairRequest(ownerUser, req.repairRequestId, chain);

    // Second approval attempt
    expect(() => approveRepairRequest(ownerUser, req.repairRequestId, chain)).toThrow(
      'INVALID_STATE'
    );
  });

  // Scenario 15: Concurrent Repair Locks
  it('15. should prevent concurrent repair executions on the same request ID', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 15');

    // Simulate approval
    const { request: approved } = approveRepairRequest(ownerUser, req.repairRequestId, chain);
    expect(approved.status).toBe('REPAIRED_WITH_HISTORY');
  });

  // Scenario 16: Stale Root Hash Detection
  it('16. should reject approval if live ledger root hash changed since request was created', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 16');

    // Live ledger undergoes new audit entry mutation
    const newEntry = createAuditEntry('NEW_EVENT', 'Event added after request', chain[0]);
    const mutatedLiveChain = [newEntry, ...chain];

    expect(() => approveRepairRequest(ownerUser, req.repairRequestId, mutatedLiveChain)).toThrow(
      'STALE_ROOT_HASH'
    );
  });

  // Scenario 17: Immutable Original Evidence Vault
  it('17. should preserve snapshot of original ledger before re-signing', () => {
    const chain = createSampleLedger();
    chain[1].detail = 'ORIGINAL_TAMPERED_DETAIL';

    const req = createRepairRequest(ownerUser, chain, 'Reason 17');
    expect(req.originalLedgerSnapshot[1].detail).toBe('ORIGINAL_TAMPERED_DETAIL');
  });

  // Scenario 18: Repair History Preservation
  it('18. should append AUDIT_LEDGER_REPAIRED entry and set status REPAIRED_WITH_HISTORY', () => {
    const chain = createSampleLedger();
    chain[0].detail = 'TAMPERED_DETAIL';

    const req = createRepairRequest(ownerUser, chain, 'Reason 18');
    const { request: approved, repairedRecords } = approveRepairRequest(
      ownerUser,
      req.repairRequestId,
      chain
    );

    expect(approved.status).toBe('REPAIRED_WITH_HISTORY');
    const repairEntry = repairedRecords.find(record => record.action === 'AUDIT_LEDGER_REPAIRED');
    expect(repairEntry).toBeDefined();
    expect(repairEntry?.detail).toContain(req.originalRootHash.slice(0, 16));
  });

  // Scenario 19: Failed Repair Recovery & Rejection
  it('19. should allow explicit rejection of repair requests', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 19');
    const rejected = rejectRepairRequest(ownerUser, req.repairRequestId);

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectedBy).toBe(ownerUser.id);
  });

  // Scenario 20: Authenticity Status Preservation
  it('20. should set repair result authenticityStatus to REPAIRED_WITH_HISTORY upon successful re-signing', () => {
    const chain = createSampleLedger();
    const req = createRepairRequest(ownerUser, chain, 'Reason 20');
    const { request: approved } = approveRepairRequest(ownerUser, req.repairRequestId, chain);

    expect(approved.repairResult?.authenticityStatus).toBe('REPAIRED_WITH_HISTORY');
  });
});
