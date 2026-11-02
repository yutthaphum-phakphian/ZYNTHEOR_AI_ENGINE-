import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateEvidenceGate } from '../lib/evidence-gate.ts';

const source = readFileSync(new URL('../lib/intelligence-orchestrator.ts', import.meta.url), 'utf8');

test('planned execution is not mislabeled as verified evidence', () => {
  assert.match(source, /verificationCategory: 'UNVERIFIED_RESULT'/);
  assert.doesNotMatch(source, /verificationCategory: 'PROPOSED' as any/);
});

test('tool completion is recorded as unverified until independent verification', () => {
  assert.match(source, /'UNVERIFIED_RESULT',[\s\S]{0,180}Tool .* returned; result recorded but not independently verified/);
});

test('direct orchestration steps are not promoted to verified facts', () => {
  assert.match(source, /'MODEL_INTERPRETATION',[\s\S]{0,180}Completed orchestration step/);
});

test('planning criteria describe observable checks rather than guarantee zero unverified claims', () => {
  assert.match(source, /Every executed tool has a result artifact/);
  assert.match(source, /Unexecuted steps remain explicitly unverified/);
});


test('allVerified requires every step to carry verified-fact evidence', () => {
  assert.match(source, /evaluateEvidenceGate\(steps\)/);
});

test('pending inspection and verification steps are not pre-certified', () => {
  assert.doesNotMatch(source, /executionStatus: 'PENDING',[\s\S]{0,80}verificationCategory: 'VERIFIED_FACT'/);
});

// ---- Behavioral tests (call the real gate) ----
const st = (category, executionStatus = 'COMPLETED') => ({ executionStatus, evidence: { category } });

test('behavior: all completed VERIFIED_FACT steps verify the plan', () => {
  assert.equal(evaluateEvidenceGate([st('VERIFIED_FACT'), st('VERIFIED_FACT')]).allVerified, true);
});

for (const cat of ['MODEL_INTERPRETATION', 'HYPOTHESIS', 'UNVERIFIED_RESULT']) {
  test(`behavior: a ${cat} step blocks allVerified`, () => {
    assert.equal(evaluateEvidenceGate([st('VERIFIED_FACT'), st(cat)]).allVerified, false);
  });
}

test('behavior: PENDING step is never verified, even if labelled VERIFIED_FACT', () => {
  assert.equal(evaluateEvidenceGate([st('VERIFIED_FACT'), st('VERIFIED_FACT', 'PENDING')]).allVerified, false);
  assert.equal(evaluateEvidenceGate([st('VERIFIED_FACT'), { executionStatus: 'PENDING' }]).allVerified, false);
});

test('behavior: RUNNING and SKIPPED steps are not verified', () => {
  assert.equal(evaluateEvidenceGate([st('VERIFIED_FACT', 'RUNNING')]).allVerified, false);
  assert.equal(evaluateEvidenceGate([st('VERIFIED_FACT', 'SKIPPED')]).allVerified, false);
});

test('behavior: empty plan and failed steps are not verified', () => {
  assert.equal(evaluateEvidenceGate([]).allVerified, false);
  const r = evaluateEvidenceGate([st('VERIFIED_FACT', 'FAILED')]);
  assert.equal(r.allVerified, false);
  assert.equal(r.failedSteps.length, 1);
});

test('behavior: step without evidence defaults to UNVERIFIED_RESULT', () => {
  const r = evaluateEvidenceGate([{ executionStatus: 'COMPLETED' }]);
  assert.equal(r.allVerified, false);
  assert.equal(r.evidenceSummary.UNVERIFIED_RESULT, 1);
});
