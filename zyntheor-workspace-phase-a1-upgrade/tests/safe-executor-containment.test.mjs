import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safeExec } from '../src/services/safeExecutor.ts';

test('safeExec fails closed before invoking a shell for allowed or shell-expanded commands', async () => {
  const marker = path.join(tmpdir(), `zyntheor-safeexec-${randomUUID()}`);

  await assert.rejects(safeExec('npm run test'), /Command execution is disabled/);
  await assert.rejects(
    safeExec(`npm run test $(touch ${marker})`),
    /Command execution is disabled/
  );

  assert.equal(existsSync(marker), false);
  const source = readFileSync(new URL('../src/services/safeExecutor.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /execSync|execFile|spawn\s*\(/);
});
