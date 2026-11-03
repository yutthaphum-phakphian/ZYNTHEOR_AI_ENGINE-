import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCoreX } from '../lib/corex-platform-gate.mjs';

test('P20 gate never releases when native checkpoint or upstream evidence is missing', () => {
  const report=inspectCoreX(process.cwd());
  assert.notEqual(report.status,'PASS');
  assert.equal(report.releaseApproved,false);
  assert.notEqual(report.phases.P17.status,'PASS');
  assert.notEqual(report.phases.P20.status,'PASS');
});
