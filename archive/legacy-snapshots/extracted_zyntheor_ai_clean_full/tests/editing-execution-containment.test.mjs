import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync(new URL('../src/routes/editing.ts', import.meta.url), 'utf8');
const executorSource = readFileSync(new URL('../src/services/safeExecutor.ts', import.meta.url), 'utf8');

test('editing execution route is disabled without reaching a command executor', () => {
  assert.match(routeSource, /\/api\/editing\/execute/);
  assert.match(routeSource, /execution_disabled/);
  assert.doesNotMatch(routeSource, /safeExec\s*\(|execSync|child_process/);
});

test('safeExec has no shell or process execution implementation', () => {
  assert.doesNotMatch(executorSource, /execSync|execFile|spawn\s*\(/);
  assert.match(executorSource, /Command execution is disabled/);
});
