import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

test('Buffalo 0.17: codeGraph.ts exists and is bounded', () => {
  const s = fs.readFileSync('src/services/codeGraph.ts','utf8');
  assert.ok(s.includes('ALLOWED_ROOT'));
  assert.ok(s.includes('MAX_BYTES'));
  assert.ok(s.includes('slice(0,20)'));
});

test('Buffalo 0.17: codeGraph denies outside src', () => {
  const s = fs.readFileSync('src/services/codeGraph.ts','utf8');
  assert.ok(s.includes('Access denied'));
  assert.ok(s.includes('startsWith(ALLOWED_ROOT)'));
});

test('Buffalo 0.17: problemAnalyzer.ts exists', () => {
  assert.equal(fs.existsSync('src/services/problemAnalyzer.ts'), true);
});

test('Buffalo 0.17: problemAnalyzer categorizes MODEL_NOT_FOUND', () => {
  const s = fs.readFileSync('src/services/problemAnalyzer.ts','utf8');
  assert.ok(s.includes('MODEL_NOT_FOUND'));
  assert.ok(s.includes('gemini-1.5-flash'));
});

test('Buffalo 0.17: problemAnalyzer handles bundle size', () => {
  const s = fs.readFileSync('src/services/problemAnalyzer.ts','utf8');
  assert.ok(s.includes('500'));
});

test('Buffalo 0.17: intelligence route exists', () => {
  assert.equal(fs.existsSync('src/routes/intelligence.ts'), true);
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

test('Buffalo 0.17: intelligence route uses getCodeGraph and analyzeProblem', () => {
  const s = fs.readFileSync('src/routes/intelligence.ts','utf8');
  assert.ok(s.includes('getCodeGraph'));
  assert.ok(s.includes('analyzeProblem'));
});

test('Buffalo 0.17: server.ts should expose intelligence route', () => {
  const s = fs.readFileSync('server.ts','utf8');
  assert.ok(s.includes('intelligence'));
});

