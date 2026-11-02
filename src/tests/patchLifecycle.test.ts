import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { proposePatch, approvePatch, applyPatch, rollbackPatch, _clearTestState, _getApproval, ERROR_CODES } from '../services/patchApplier.ts';

const TEST_FILE_REL = 'lifecycleTarget.ts';
let workspaceRoot: string;
const testFilePath = () => path.join(workspaceRoot, TEST_FILE_REL);

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
}

describe('Patch Lifecycle & SHA-256 Atomic Verification Suite', () => {
  const initialCode = 'export const API_VERSION = "v1";\nexport function getVersion() { return API_VERSION; }\n';

  beforeEach(() => {
    _clearTestState();
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-patch-lifecycle-'));
    fs.writeFileSync(testFilePath(), initialCode, 'utf8');
  });

  afterEach(() => {
    _clearTestState();
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  const propose = (newContent: string) => proposePatch({ workspaceId: workspaceRoot, targetFile: TEST_FILE_REL, newContent });

  describe('SHA-256 Verification Before & After Approval', () => {
    it('1. Pre-approval: proposePatch records cryptographic originalHash and proposedHash', () => {
      const modifiedCode = 'export const API_VERSION = "v2";\nexport function getVersion() { return API_VERSION; }\n';
      const proposal = propose(modifiedCode);

      expect(proposal.originalHash).toBe(computeSha256(initialCode));
      expect(proposal.proposedHash).toBe(computeSha256(modifiedCode));
      expect(proposal.status).toBe('proposed');
      expect(proposal.patchVersion).toBe(1);
    });

    it('2. Approval Phase: approvePatch verifies proposal modifiedContent hash binding', () => {
      const modifiedCode = 'export const API_VERSION = "v2";\nexport function getVersion() { return API_VERSION; }\n';
      const proposal = propose(modifiedCode);

      approvePatch(proposal.patchId, 'admin-user-1');
      const approval = _getApproval(proposal.patchId);

      expect(proposal.status).toBe('approved');
      expect(approval?.approvalHash).toBeTruthy();
      expect(approval?.approverId).toBe('admin-user-1');
    });

    it('3. Pre-apply: applyPatch re-calculates target file SHA-256 on disk and succeeds if un-mutated', async () => {
      const modifiedCode = 'export const API_VERSION = "v2";\nexport function getVersion() { return API_VERSION; }\n';
      const proposal = propose(modifiedCode);
      approvePatch(proposal.patchId, 'admin-user-1');

      const result = await applyPatch(proposal.patchId);

      expect(result.success).toBe(true);
      expect(proposal.status).toBe('applied');
      expect(fs.readFileSync(testFilePath(), 'utf8')).toBe(modifiedCode);
    });

    it('4. Stale Detection: rejects patch and marks status stale if target file mutates on disk post-approval', async () => {
      const modifiedCode = 'export const API_VERSION = "v2";\nexport function getVersion() { return API_VERSION; }\n';
      const proposal = propose(modifiedCode);
      approvePatch(proposal.patchId, 'admin-user-1');

      // Simulate concurrent edit on disk
      fs.writeFileSync(testFilePath(), 'export const API_VERSION = "v1.5-hotfix";\n', 'utf8');

      await expect(applyPatch(proposal.patchId)).rejects.toMatchObject({ code: ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL });
      expect(proposal.status).toBe('stale');
    });

    it('5. Tampering Detection: rejects patch and marks status rejected if content is tampered', async () => {
      const proposal = propose('export const API_VERSION = "v2";\n');
      approvePatch(proposal.patchId, 'admin-user-1');

      // Tamper with proposal payload
      proposal.newContent = 'export const API_VERSION = "v99-malicious";\n';

      await expect(applyPatch(proposal.patchId)).rejects.toMatchObject({ code: ERROR_CODES.APPROVAL_MISMATCH });
      expect(proposal.status).toBe('rejected');
    });
  });

  describe('Atomic Write Strategy & Rollback Verification', () => {
    it('6. Atomic Write Strategy: ensures target file receives clean atomic commit without orphan temp files', async () => {
      const newCode = 'export const API_VERSION = "v3";\n';
      const proposal = propose(newCode);
      approvePatch(proposal.patchId, 'admin-user-1');

      const result = await applyPatch(proposal.patchId);

      expect(result.success).toBe(true);
      expect(fs.readFileSync(testFilePath(), 'utf8')).toBe(newCode);

      // Verify no leftover .tmp files remain in target directory
      const targetDir = path.dirname(testFilePath());
      const tempFiles = fs.readdirSync(targetDir).filter(f => f.startsWith('.lifecycleTarget.ts.tmp.'));
      expect(tempFiles.length).toBe(0);
    });

    it('7. Rollback Functionality: restores original content from backup after patch application', async () => {
      const newCode = 'export const API_VERSION = "v4";\n';
      const proposal = propose(newCode);
      approvePatch(proposal.patchId, 'admin-user-1');

      const applyResult = await applyPatch(proposal.patchId);
      expect(applyResult.success).toBe(true);
      expect(fs.readFileSync(testFilePath(), 'utf8')).toBe(newCode);

      const rollbackResult = await rollbackPatch(proposal.patchId);
      expect(rollbackResult.success).toBe(true);
      expect(fs.readFileSync(testFilePath(), 'utf8')).toBe(initialCode);
    });
  });
});
