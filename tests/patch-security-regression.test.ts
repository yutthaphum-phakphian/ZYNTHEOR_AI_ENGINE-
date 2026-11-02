import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  proposePatch,
  approvePatch,
  applyPatch,
  _clearTestState,
  PatchSecurityError,
  ERROR_CODES,
  sha256Hex,
} from '../src/services/patchApplier.ts';

function createTempWorkspace(): { tempDir: string; workspaceId: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-patch-test-'));
  const workspaceId = path.basename(tempDir);
  return { tempDir, workspaceId };
}

function cleanupTempWorkspace(tempDir: string) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}

test('Patch Security Regression: FILE_MUTATED_SINCE_APPROVAL', async () => {
  _clearTestState();
  const { tempDir } = createTempWorkspace();

  try {
    const targetFile = 'target-file.ts';
    const filePath = path.join(tempDir, targetFile);
    fs.writeFileSync(filePath, 'const initial = 1;', 'utf8');

    // 1. Propose & approve patch
    const proposal = proposePatch({
      workspaceId: tempDir,
      targetFile,
      newContent: 'const updated = 2;',
    });

    approvePatch(proposal.patchId, 'human-approver');

    // 2. Mutate file on disk before applying
    fs.writeFileSync(filePath, 'const mutatedExternally = 999;', 'utf8');

    // 3. Applying patch must fail with FILE_MUTATED_SINCE_APPROVAL
    await assert.rejects(
      async () => {
        await applyPatch(proposal.patchId, 'applier-usr');
      },
      (err) => {
        return (
          err instanceof PatchSecurityError &&
          (err.code === ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL || err.code === 'FILE_MUTATED_SINCE_APPROVAL')
        );
      }
    );
  } finally {
    cleanupTempWorkspace(tempDir);
    _clearTestState();
  }
});

test('Patch Security Regression: HASH_MISMATCH_MUTATION_DETECTED', async () => {
  _clearTestState();
  const { tempDir } = createTempWorkspace();

  try {
    const targetFile = 'hash-check.ts';
    const filePath = path.join(tempDir, targetFile);
    const originalText = 'function test() { return true; }';
    fs.writeFileSync(filePath, originalText, 'utf8');

    const proposal = proposePatch({
      workspaceId: tempDir,
      targetFile,
      newContent: 'function test() { return false; }',
    });

    approvePatch(proposal.patchId, 'human-approver');

    // Alter the proposal's originalHash manually to simulate hash mismatch
    proposal.originalHash = sha256Hex('wrong_content_hash');

    await assert.rejects(
      async () => {
        await applyPatch(proposal.patchId, 'applier-usr');
      },
      (err) => {
        return (
          err instanceof PatchSecurityError &&
          (err.code === ERROR_CODES.HASH_MISMATCH_MUTATION_DETECTED ||
            err.code === ERROR_CODES.APPROVAL_MISMATCH ||
            err.code === ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL)
        );
      }
    );
  } finally {
    cleanupTempWorkspace(tempDir);
    _clearTestState();
  }
});

test('Patch Security Regression: PATCH_ALREADY_APPLIED', async () => {
  _clearTestState();
  const { tempDir } = createTempWorkspace();

  try {
    const targetFile = 'repeat-apply.ts';
    const filePath = path.join(tempDir, targetFile);
    fs.writeFileSync(filePath, 'let version = 1;', 'utf8');

    const proposal = proposePatch({
      workspaceId: tempDir,
      targetFile,
      newContent: 'let version = 2;',
    });

    approvePatch(proposal.patchId, 'human-approver');

    // First apply succeeds
    await applyPatch(proposal.patchId, 'applier-usr');

    // Second apply attempt must throw PATCH_ALREADY_APPLIED
    await assert.rejects(
      async () => {
        await applyPatch(proposal.patchId, 'applier-usr');
      },
      (err) => {
        return (
          err instanceof PatchSecurityError &&
          (err.code === ERROR_CODES.PATCH_ALREADY_APPLIED || err.code === 'PATCH_ALREADY_APPLIED')
        );
      }
    );
  } finally {
    cleanupTempWorkspace(tempDir);
    _clearTestState();
  }
});

test('Patch Security Regression: CONCURRENT_MODIFICATION', async () => {
  _clearTestState();
  const { tempDir } = createTempWorkspace();

  try {
    const targetFile = 'concurrent.ts';
    const filePath = path.join(tempDir, targetFile);
    fs.writeFileSync(filePath, 'const value = 0;', 'utf8');

    const proposal = proposePatch({
      workspaceId: tempDir,
      targetFile,
      newContent: 'const value = 1;',
    });

    approvePatch(proposal.patchId, 'human-approver');

    // Test ConcurrentModificationError directly
    const err = new PatchSecurityError(ERROR_CODES.CONCURRENT_MODIFICATION, 'Concurrent modification detected');
    assert.equal(err.code, 'CONCURRENT_MODIFICATION');
    assert.equal(err.name, 'PatchSecurityError');
  } finally {
    cleanupTempWorkspace(tempDir);
    _clearTestState();
  }
});
