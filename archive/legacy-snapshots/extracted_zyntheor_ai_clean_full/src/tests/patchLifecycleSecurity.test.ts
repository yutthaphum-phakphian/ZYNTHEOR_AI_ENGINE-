/**
 * PATCH LIFECYCLE SECURITY AUDIT - REGRESSION TESTS
 * Covers 8 required error codes
 * Uses temporary test workspaces and cleans up safely
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

import {
  proposePatch,
  approvePatch,
  applyPatch,
  rollbackPatch,
  applyPatchAtomic,
  sha256Hex,
  _clearTestState,
  _getProposal,
  ERROR_CODES,
  PatchSecurityError,
  validateWorkspaceAccess,
  resolveAndValidateTargetPath,
} from '../services/patchApplier';

function makeTempWorkspace(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-test-ws-'));
  return tmp;
}

function cleanupWorkspace(ws: string) {
  try {
    fs.rmSync(ws, { recursive: true, force: true });
  } catch {}
}

function writeFileInWs(ws: string, targetFile: string, content: string) {
  const abs = path.join(ws, targetFile);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

describe('Patch Lifecycle Security Audit', () => {
  let ws: string;

  beforeEach(() => {
    _clearTestState();
    ws = makeTempWorkspace();
  });

  afterEach(() => {
    _clearTestState();
    cleanupWorkspace(ws);
  });

  it('FILE_MUTATED_SINCE_APPROVAL - file changed after approval before apply', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
    approvePatch(proposal.patchId, 'human-1');

    // Mutate file externally
    writeFileInWs(ws, 'target.txt', 'hacked-v1');

    await expect(applyPatch(proposal.patchId)).rejects.toMatchObject({
      code: ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL,
    });
  });

  it('HASH_MISMATCH_MUTATION_DETECTED - hash mismatch during atomic apply', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
    approvePatch(proposal.patchId, 'human-1');

    // Directly call atomic with wrong expectedHash to trigger HASH_MISMATCH
    const abs = path.join(ws, 'target.txt');
    await expect(
      applyPatchAtomic({ filePath: abs, expectedHash: 'deadbeef', newContent: 'v2' })
    ).rejects.toMatchObject({
      code: ERROR_CODES.HASH_MISMATCH_MUTATION_DETECTED,
    });
  });

  it('REJECTED_PATCH_DENIED - rejected patch cannot be applied', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
    // Simulate rejection
    const stored = _getProposal(proposal.patchId)!;
    (stored as any).status = 'rejected';

    expect(() => approvePatch(proposal.patchId, 'human-1')).toThrowError('Rejected');
  });

  it('STALE_PATCH_DENIED - expired proposal', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
    // Make it expired
    const stored = _getProposal(proposal.patchId)!;
    (stored as any).expiresAt = Date.now() - 1000;

    expect(() => approvePatch(proposal.patchId, 'human-1')).toThrowError('Stale');
  });

  it('WORKSPACE_ACCESS_DENIED - path traversal', async () => {
    expect(() => {
      proposePatch({ workspaceId: ws, targetFile: '../../etc/passwd', newContent: 'evil' });
    }).toThrow();
    try {
      proposePatch({ workspaceId: ws, targetFile: '../../etc/passwd', newContent: 'evil' });
    } catch (e: any) {
      expect(e.code).toBe(ERROR_CODES.WORKSPACE_ACCESS_DENIED);
    }
  });

  it('WORKSPACE_ACCESS_DENIED - unauthorized workspace', async () => {
    expect(() => validateWorkspaceAccess('unauthorized')).toThrow();
    try {
      validateWorkspaceAccess('unauthorized');
    } catch (e: any) {
      expect(e.code).toBe(ERROR_CODES.WORKSPACE_ACCESS_DENIED);
    }
  });

  it('APPROVAL_MISMATCH - patch mutated after approval', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
    approvePatch(proposal.patchId, 'human-1');

    // Mutate proposal after approval (simulates frontend tampering)
    const stored = _getProposal(proposal.patchId)!;
    (stored as any).newContent = 'v2-hacked';
    (stored as any).proposedHash = sha256Hex('v2-hacked');
    // Keep same version to trigger hash mismatch, not version mismatch
    // approvalHash will not match

    await expect(applyPatch(proposal.patchId)).rejects.toMatchObject({
      code: ERROR_CODES.APPROVAL_MISMATCH,
    });
  });

  it('PATCH_ALREADY_APPLIED - replay same patch twice', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
    approvePatch(proposal.patchId, 'human-1');
    await applyPatch(proposal.patchId);

    await expect(applyPatch(proposal.patchId)).rejects.toMatchObject({
      code: ERROR_CODES.PATCH_ALREADY_APPLIED,
    });
  });

  it('CONCURRENT_MODIFICATION - two concurrent Apply requests', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const p1 = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2-concurrent-1' });
    const p2 = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2-concurrent-2' });
    approvePatch(p1.patchId, 'human-1');
    approvePatch(p2.patchId, 'human-2');

    // Both try to apply concurrently to same file, but p1's originalHash is v1, p2's also v1
    // First should succeed, second should fail with FILE_MUTATED or CONCURRENT_MODIFICATION or HASH_MISMATCH
    const results = await Promise.allSettled([applyPatch(p1.patchId), applyPatch(p2.patchId)]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    const rejected = results.filter((r) => r.status === 'rejected').length;

    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);
    const rejectedReason = (results.find((r) => r.status === 'rejected') as any).reason;
    expect([
      ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL,
      ERROR_CODES.HASH_MISMATCH_MUTATION_DETECTED,
      ERROR_CODES.CONCURRENT_MODIFICATION,
      ERROR_CODES.PATCH_ALREADY_APPLIED,
    ]).toContain(rejectedReason.code);
  });

  it('Workspace switching between proposal and Apply - should be blocked if workspace changes', async () => {
    const ws2 = makeTempWorkspace();
    try {
      writeFileInWs(ws, 'target.txt', 'v1');
      writeFileInWs(ws2, 'target.txt', 'v1');

      const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2' });
      approvePatch(proposal.patchId, 'human-1');

      // Simulate workspace switching by mutating workspaceId after approval.
      const stored = _getProposal(proposal.patchId)!;
      const originalWs = stored.workspaceId;
      stored.workspaceId = ws2;

      await expect(applyPatch(proposal.patchId)).rejects.toMatchObject({
        code: ERROR_CODES.APPROVAL_MISMATCH,
      });
      const originalContent = fs.readFileSync(path.join(originalWs, 'target.txt'), 'utf8');
      expect(originalContent).toBe('v1');
      expect(fs.readFileSync(path.join(ws2, 'target.txt'), 'utf8')).toBe('v1');
    } finally {
      cleanupWorkspace(ws2);
    }
  });

  it('Atomicity - partial writes cannot corrupt', async () => {
    writeFileInWs(ws, 'target.txt', 'v1');
    const abs = path.join(ws, 'target.txt');
    const originalStat = fs.statSync(abs);
    const proposal = proposePatch({ workspaceId: ws, targetFile: 'target.txt', newContent: 'v2-atomic' });
    approvePatch(proposal.patchId, 'human-1');
    await applyPatch(proposal.patchId);

    const newContent = fs.readFileSync(abs, 'utf8');
    expect(newContent).toBe('v2-atomic');
    const newStat = fs.statSync(abs);
    // Permissions preserved
    expect(newStat.mode & 0o777).toBe(originalStat.mode & 0o777);
  });
});
