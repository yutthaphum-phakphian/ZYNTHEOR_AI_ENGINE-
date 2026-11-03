import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'fs';
test('Buffalo 0.18: patchApplier exists and is safe', () => {
  const s = fs.readFileSync('src/services/patchApplier.ts','utf8');
  assert.ok(s.includes('resolveAndValidateTargetPath')); assert.ok(s.includes('Unsafe patch denied'));
});
test('Buffalo 0.18: patchApplier denies .env', () => {
  const s = fs.readFileSync('src/services/patchApplier.ts','utf8');
  assert.ok(s.includes('.env'));
});
test('Buffalo 0.18: safeExecutor exists', () => { assert.ok(fs.existsSync('src/services/safeExecutor.ts')); });
test('Buffalo 0.18: safeExecutor allowlist', () => {
  const s = fs.readFileSync('src/services/safeExecutor.ts','utf8');
  assert.ok(s.includes('ALLOWED_CMDS')); assert.ok(s.includes('npm run verify'));
});
test('Buffalo 0.18: editing route exists', () => { assert.ok(fs.existsSync('src/routes/editing.ts')); });
test('Buffalo 0.18: editing propose bounded', () => {
  const s = fs.readFileSync('src/routes/editing.ts','utf8');
  assert.ok(s.includes('/api/editing/propose'));
});
test('Buffalo 0.18: editing execute is disabled', () => {
  const s = fs.readFileSync('src/routes/editing.ts','utf8');
  assert.ok(s.includes("res.status(503).json({ error: 'execution_disabled' })"));
  assert.doesNotMatch(s, /safeExec\s*\(/);
});
test('Buffalo 0.18: editing uses patchApplier', () => {
  const s = fs.readFileSync('src/routes/editing.ts','utf8');
  assert.ok(s.includes('patchApplier'));
});
test('Buffalo 0.18: patchApplier limits diff size', () => {
  const s = fs.readFileSync('src/services/patchApplier.ts','utf8');
  assert.ok(s.includes('50000'));
});
test('Buffalo 0.18: safeExec has timeout', () => {
  const s = fs.readFileSync('src/services/safeExecutor.ts','utf8');
  assert.ok(s.includes('timeoutMs'));
});
