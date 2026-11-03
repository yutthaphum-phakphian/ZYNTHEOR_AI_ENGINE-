import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveExistingWorkspacePath, WorkspacePathError } from '../lib/workspace-path-security';

let tempRoot = '';
afterEach(() => { if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true }); tempRoot = ''; });

describe('workspace path security', () => {
  it('resolves regular files and directories inside the workspace', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-workspace-'));
    fs.mkdirSync(path.join(tempRoot, 'src'));
    fs.writeFileSync(path.join(tempRoot, 'src', 'main.ts'), 'export {};');
    expect(resolveExistingWorkspacePath(tempRoot, 'src', 'directory')).toBe(path.join(tempRoot, 'src'));
    expect(resolveExistingWorkspacePath(tempRoot, 'src/main.ts', 'file')).toBe(path.join(tempRoot, 'src', 'main.ts'));
  });

  it('rejects traversal, absolute paths, and sensitive segments', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-workspace-'));
    for (const candidate of ['../outside', '/etc/passwd', '.env', 'config/secret.json']) {
      expect(() => resolveExistingWorkspacePath(tempRoot, candidate)).toThrow(WorkspacePathError);
    }
  });

  it('rejects symlink escapes', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-workspace-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-outside-'));
    try {
      fs.writeFileSync(path.join(outside, 'private.txt'), 'private');
      fs.symlinkSync(outside, path.join(tempRoot, 'linked'), 'dir');
      expect(() => resolveExistingWorkspacePath(tempRoot, 'linked/private.txt', 'file')).toThrow(WorkspacePathError);
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
  });
});
