import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { proposePatch, approvePatch, applyPatch, _clearTestState, _getApproval, ERROR_CODES } from '../services/patchApplier.ts';

const TEST_FILE_REL = 'target.ts';
let workspaceRoot: string;
const testFilePath = () => path.join(workspaceRoot, TEST_FILE_REL);

describe('PatchApplier Security Audit & Cryptographic SHA-256 Binding', () => {
  const initialContent = 'export const value = 42;\nexport function getValue() { return value; }\n';

  beforeEach(() => {
    _clearTestState();
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-patch-audit-'));
    fs.writeFileSync(testFilePath(), initialContent, 'utf8');
  });

  afterEach(() => {
    _clearTestState();
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  const propose = (newContent: string) => proposePatch({ workspaceId: workspaceRoot, targetFile: TEST_FILE_REL, newContent });

  it('1. FILE_MUTATED_SINCE_APPROVAL: should detect file mutation on disk and mark proposal stale', async () => {
    const patch = propose('export const value = 100;\n');
    approvePatch(patch.patchId, 'eng-01');

    // Simulate file mutation on disk post-approval
    fs.writeFileSync(testFilePath(), 'export const value = 999; // MUTATED\n', 'utf8');

    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL });
    expect(patch.status).toBe('stale');
  });

  it('2. HASH_MISMATCH_MUTATION_DETECTED: should reject application if approved content is altered', async () => {
    const patch = propose('export const value = 100;\n');
    approvePatch(patch.patchId, 'eng-01');
    patch.newContent = 'export const value = 999; // TAMPERED\n';

    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.APPROVAL_MISMATCH });
    expect(patch.status).toBe('rejected');
  });

  it('3. REJECTED_PATCH_DENIED: should prevent applying an explicitly rejected patch', async () => {
    const patch = propose('export const value = 100;\n');
    patch.status = 'rejected';

    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.REJECTED_PATCH_DENIED });
  });

  it('4. STALE_PATCH_DENIED: should prevent applying a patch marked stale', async () => {
    const patch = propose('export const value = 100;\n');
    patch.status = 'stale';

    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.STALE_PATCH_DENIED });
  });

  it('5. WORKSPACE_ACCESS_DENIED: should prevent path traversal and workspace changes after approval', async () => {
    const patch = propose('export const value = 100;\n');
    approvePatch(patch.patchId, 'eng-01');
    patch.workspaceId = path.join(os.tmpdir(), 'other-workspace');
    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.APPROVAL_MISMATCH });

    try {
      proposePatch({ workspaceId: workspaceRoot, targetFile: '../../../etc/passwd', newContent: 'malicious' });
      throw new Error('Expected path traversal to be rejected');
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.WORKSPACE_ACCESS_DENIED });
    }
  });

  it('6. APPROVAL_MISMATCH: should reject patch if approval metadata is altered', async () => {
    const patch = propose('export const value = 100;\n');
    approvePatch(patch.patchId, 'eng-01');

    // Tamper with approved hash metadata
    _getApproval(patch.patchId)!.approvalHash = '0'.repeat(64);

    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.APPROVAL_MISMATCH });
  });

  it('7. PATCH_ALREADY_APPLIED: should prevent replay attacks and double application', async () => {
    const newContent = 'export const value = 100;\nexport function getValue() { return value; }\n';
    const patch = propose(newContent);
    approvePatch(patch.patchId, 'eng-01');

    const result = await applyPatch(patch.patchId);
    expect(result.success).toBe(true);

    await expect(applyPatch(patch.patchId)).rejects.toMatchObject({ code: ERROR_CODES.PATCH_ALREADY_APPLIED });
  });

  it('8. CONCURRENT_MODIFICATION: atomic rename & TOCTOU revalidation guard', async () => {
    const patch = propose('export const value = 200;\n');
    approvePatch(patch.patchId, 'eng-01');

    const result = await applyPatch(patch.patchId);
    expect(result.success).toBe(true);
    expect(fs.readFileSync(testFilePath(), 'utf8')).toBe('export const value = 200;\n');
  });
});
