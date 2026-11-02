/**
 * ZYNTHEOR AI ENGINE (Buffalo 1.1.1 / 1.2.0-prep)
 * End-to-End Security & Governance Audit Test Suite
 * 
 * Verifies strict cryptographic integrity, TOCTOU prevention, lifecycle state transitions,
 * and fine-grained RBAC / Workspace Isolation enforcement.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Types & Mock Definitions
export type UserRole = 'viewer' | 'engineer' | 'admin';

export interface UserSession {
  userId: string;
  role: UserRole;
  workspaceIds: string[];
  expiresAt: number;
}

export type PatchStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'STALE' | 'APPLIED';

export interface PatchProposal {
  patchId: string;
  workspaceId: string;
  targetFile: string;
  originalHash: string; // SHA-256 of disk file at proposal creation
  proposedHash: string; // SHA-256 of content after proposed changes
  status: PatchStatus;
  proposedBy: string;
  approvedBy?: string;
  approvalTimestamp?: number;
}

// In-Memory Storage & Lock Manager for TOCTOU Prevention Simulation
class MockFileSystem {
  private files: Map<string, string> = new Map();
  private lockTable: Set<string> = new Set();

  public setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  public getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  public computeHash(path: string): string {
    const content = this.files.get(path) ?? '';
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  public acquireLock(path: string): boolean {
    if (this.lockTable.has(path)) return false;
    this.lockTable.add(path);
    return true;
  }

  public releaseLock(path: string): void {
    this.lockTable.delete(path);
  }
}

// Backend Core Services Engine Implementation
class SecurePatchEngine {
  constructor(private fs: MockFileSystem) {}

  public proposePatch(workspaceId: string, filePath: string, newContent: string, userId: string): PatchProposal {
    const currentContent = this.fs.getFile(filePath);
    if (currentContent === undefined) {
      throw new Error(`FILE_NOT_FOUND: ${filePath}`);
    }

    const originalHash = this.fs.computeHash(filePath);
    const proposedHash = crypto.createHash('sha256').update(newContent, 'utf8').digest('hex');

    return {
      patchId: `patch-${crypto.randomBytes(4).toString('hex')}`,
      workspaceId,
      targetFile: filePath,
      originalHash,
      proposedHash,
      status: 'PROPOSED',
      proposedBy: userId
    };
  }

  public approvePatch(proposal: PatchProposal, approver: UserSession): PatchProposal {
    if (!approver.workspaceIds.includes(proposal.workspaceId)) {
      throw new Error('WORKSPACE_ACCESS_DENIED');
    }

    if (proposal.status !== 'PROPOSED') {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot approve patch in state ${proposal.status}`);
    }

    // Backend-Side Disk SHA-256 Audit prior to approval signature
    const currentDiskHash = this.fs.computeHash(proposal.targetFile);
    if (currentDiskHash !== proposal.originalHash) {
      proposal.status = 'STALE';
      throw new Error('FILE_MUTATED_PRIOR_TO_APPROVAL');
    }

    proposal.status = 'APPROVED';
    proposal.approvedBy = approver.userId;
    proposal.approvalTimestamp = Date.now();
    return proposal;
  }

  public applyPatch(proposal: PatchProposal, executorSession: UserSession, patchContent: string): void {
    // 1. Session & Workspace Verification
    if (Date.now() > executorSession.expiresAt) {
      throw new Error('SESSION_EXPIRED');
    }
    if (!executorSession.workspaceIds.includes(proposal.workspaceId)) {
      throw new Error('WORKSPACE_ACCESS_DENIED');
    }

    // 2. Reject non-approved lifecycle states
    if (proposal.status === 'REJECTED') {
      throw new Error('REJECTED_PATCH_DENIED');
    }
    if (proposal.status === 'STALE') {
      throw new Error('STALE_PATCH_DENIED');
    }
    if (proposal.status === 'APPLIED') {
      throw new Error('REPLAY_ATTEMPT_DENIED: Patch already applied');
    }
    if (proposal.status !== 'APPROVED') {
      throw new Error('UNAPPROVED_PATCH_DENIED');
    }

    // 3. Acquire File Mutex Lock to prevent TOCTOU race conditions
    const locked = this.fs.acquireLock(proposal.targetFile);
    if (!locked) {
      throw new Error('CONCURRENCY_LOCK_FAILED');
    }

    try {
      // 4. Server-Side Live Disk SHA-256 Verification (Source of Truth)
      const liveDiskHash = this.fs.computeHash(proposal.targetFile);
      if (liveDiskHash !== proposal.originalHash) {
        proposal.status = 'STALE';
        throw new Error('FILE_MUTATED_SINCE_APPROVAL');
      }

      // 5. Verify Content Hash Matching
      const contentHash = crypto.createHash('sha256').update(patchContent, 'utf8').digest('hex');
      if (contentHash !== proposal.proposedHash) {
        throw new Error('HASH_MISMATCH_MUTATION_DETECTED');
      }

      // 6. Execute Mutation & Mark Lifecycle Complete
      this.fs.setFile(proposal.targetFile, patchContent);
      proposal.status = 'APPLIED';
    } finally {
      this.fs.releaseLock(proposal.targetFile);
    }
  }
}

// RBAC Middleware Logic
function authorizeEndpoint(session: UserSession | null, targetWorkspaceId: string, requiredRoleRank: number): boolean {
  if (!session || Date.now() > session.expiresAt) return false;
  if (!session.workspaceIds.includes(targetWorkspaceId)) return false;

  const roleRanks: Record<UserRole, number> = { viewer: 1, engineer: 2, admin: 3 };
  return roleRanks[session.role] >= requiredRoleRank;
}

// --- SUITE TESTS ---
describe('ZYNTHEOR Security Hardening & RBAC Enforcement Suite', () => {
  let fs: MockFileSystem;
  let engine: SecurePatchEngine;

  const adminSession: UserSession = {
    userId: 'usr-admin-01',
    role: 'admin',
    workspaceIds: ['ws-alpha'],
    expiresAt: Date.now() + 3600000
  };

  const engineerSession: UserSession = {
    userId: 'usr-eng-01',
    role: 'engineer',
    workspaceIds: ['ws-alpha'],
    expiresAt: Date.now() + 3600000
  };

  const viewerSession: UserSession = {
    userId: 'usr-view-01',
    role: 'viewer',
    workspaceIds: ['ws-alpha'],
    expiresAt: Date.now() + 3600000
  };

  beforeEach(() => {
    fs = new MockFileSystem();
    engine = new SecurePatchEngine(fs);
    fs.setFile('/src/config.ts', 'const MODE = "AUTO";');
  });

  describe('1. TOCTOU & Cryptographic Mutation Detection', () => {
    it('1.1 Should block patch application if disk file is mutated after proposal generation', () => {
      const proposal = engine.proposePatch('ws-alpha', '/src/config.ts', 'const MODE = "AGENT";', engineerSession.userId);
      engine.approvePatch(proposal, adminSession);

      // External mutation happens on disk
      fs.setFile('/src/config.ts', 'const MODE = "REASONING"; // Concurrent Edit');

      expect(() => engine.applyPatch(proposal, adminSession, 'const MODE = "AGENT";'))
        .toThrow('FILE_MUTATED_SINCE_APPROVAL');
      
      expect(proposal.status).toBe('STALE');
    });

    it('1.2 Should reject modified patch content payload (SHA-256 Tampering)', () => {
      const proposal = engine.proposePatch('ws-alpha', '/src/config.ts', 'const MODE = "AGENT";', engineerSession.userId);
      engine.approvePatch(proposal, adminSession);

      // Malicious or modified payload passed to apply
      const tamperedContent = 'const MODE = "AGENT"; injectMaliciousCode();';

      expect(() => engine.applyPatch(proposal, adminSession, tamperedContent))
        .toThrow('HASH_MISMATCH_MUTATION_DETECTED');
    });
  });

  describe('2. Lifecycle State Enforcement', () => {
    it('2.1 Should prevent applying patches in REJECTED state', () => {
      const proposal = engine.proposePatch('ws-alpha', '/src/config.ts', 'const MODE = "CHAT";', engineerSession.userId);
      proposal.status = 'REJECTED';

      expect(() => engine.applyPatch(proposal, adminSession, 'const MODE = "CHAT";'))
        .toThrow('REJECTED_PATCH_DENIED');
    });

    it('2.2 Should prevent double application / replay attacks', () => {
      const proposal = engine.proposePatch('ws-alpha', '/src/config.ts', 'const MODE = "CODING";', engineerSession.userId);
      engine.approvePatch(proposal, adminSession);
      engine.applyPatch(proposal, adminSession, 'const MODE = "CODING";');

      // Attempting to apply again
      expect(() => engine.applyPatch(proposal, adminSession, 'const MODE = "CODING";'))
        .toThrow('REPLAY_ATTEMPT_DENIED: Patch already applied');
    });
  });

  describe('3. Fine-Grained RBAC & Workspace Isolation', () => {
    it('3.1 Admin endpoint (/deploy) should accept admin and reject engineer / viewer', () => {
      const ADMIN_RANK = 3;
      expect(authorizeEndpoint(adminSession, 'ws-alpha', ADMIN_RANK)).toBe(true);
      expect(authorizeEndpoint(engineerSession, 'ws-alpha', ADMIN_RANK)).toBe(false);
      expect(authorizeEndpoint(viewerSession, 'ws-alpha', ADMIN_RANK)).toBe(false);
    });

    it('3.2 Pipeline trigger endpoint should accept engineer & admin, reject viewer', () => {
      const ENGINEER_RANK = 2;
      expect(authorizeEndpoint(adminSession, 'ws-alpha', ENGINEER_RANK)).toBe(true);
      expect(authorizeEndpoint(engineerSession, 'ws-alpha', ENGINEER_RANK)).toBe(true);
      expect(authorizeEndpoint(viewerSession, 'ws-alpha', ENGINEER_RANK)).toBe(false);
    });

    it('3.3 User of Workspace A should be denied access to Workspace B regardless of role', () => {
      const ENGINEER_RANK = 2;
      expect(authorizeEndpoint(engineerSession, 'ws-beta', ENGINEER_RANK)).toBe(false);
    });

    it('3.4 Expired session should be denied immediately', () => {
      const expiredSession: UserSession = {
        ...adminSession,
        expiresAt: Date.now() - 1000
      };
      expect(authorizeEndpoint(expiredSession, 'ws-alpha', 1)).toBe(false);
    });
  });
});
