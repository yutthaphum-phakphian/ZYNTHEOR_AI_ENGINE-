import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
test('analysis mode is available in chat UI', () => {
  assert.match(app, /setAnalysisMode/);
  assert.match(app, /\/api\/intelligence\/analyze/);
  assert.match(app, /executionVerified/);
  assert.match(app, /Analysis mode sends the submitted text/);
});
test('analysis mode does not claim code execution was verified', () => {
  assert.match(app, /ยังไม่ได้ดำเนินการหรือยืนยัน/);
});
