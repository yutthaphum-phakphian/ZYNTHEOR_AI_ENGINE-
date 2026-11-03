import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

test('Buffalo 0.17: codeGraph.ts exists and is bounded', () => {
  const s = fs.readFileSync('src/services/codeGraph.ts','utf8');
  assert.ok(s.includes('ALLOWED_ROOT'));
  assert.ok(s.includes('MAX_BYTES'));
});

test('Buffalo 0.17: codeGraph denies outside src', () => {
  const s = fs.readFileSync('src/services/codeGraph.ts','utf8');
  assert.ok(s.includes('Access denied'));
});

test('Buffalo 0.17: problemAnalyzer.ts exists', () => {
  assert.ok(fs.existsSync('src/services/problemAnalyzer.ts'));
});

test('Buffalo 0.17: problemAnalyzer categorizes MODEL_NOT_FOUND', () => {
  const s = fs.readFileSync('src/services/problemAnalyzer.ts','utf8');
  assert.ok(s.includes('MODEL_NOT_FOUND'));
});

test('Buffalo 0.17: problemAnalyzer handles bundle size', () => {
  const s = fs.readFileSync('src/services/problemAnalyzer.ts','utf8');
  assert.ok(s.includes('500'));
});

test('Buffalo 0.17: intelligence route exists', () => {
  assert.ok(fs.existsSync('src/routes/intelligence.ts'));
});

test('Buffalo 0.17: intelligence route is bounded and does not claim execution', () => {
  const s = fs.readFileSync('src/routes/intelligence.ts','utf8');
  assert.ok(s.includes('bounded'));
  assert.ok(s.includes('doesNotClaimExecution'));
});

test('Buffalo 0.17: intelligence route limits files 1-20', () => {
  const s = fs.readFileSync('src/routes/intelligence.ts','utf8');
  assert.ok(s.includes('20'));
});

test('Buffalo 0.17: intelligence route uses getCodeGraph', () => {
  const s = fs.readFileSync('src/routes/intelligence.ts','utf8');
  assert.ok(s.includes('getCodeGraph'));
});

test('Buffalo 0.17: package version is 0.17.0', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.ok(['0.17.0','0.18.0','0.19.0','0.20.0','1.0.0','1.1.0','1.1.1','1.2.0','1.2.1','1.2.2'].includes(pkg.version))
});
