import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('preflight command is available and verification pipeline fails fast', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['check:env'], 'node scripts/preflight.mjs');
  assert.match(pkg.scripts.verify, /check:env.*typecheck.*test.*build/);
});

test('verification report does not claim unverified runtime checks passed', () => {
  const report = readFileSync(new URL('../docs/VERIFICATION_STATUS_TH.md', import.meta.url), 'utf8');
  assert.match(report, /13 ผ่าน \/ 1 ไม่ผ่าน/);
  assert.match(report, /ยังไม่ได้ยืนยัน/);
});
