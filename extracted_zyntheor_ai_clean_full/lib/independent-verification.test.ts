import { describe, it, expect } from 'vitest';
import { IndependentVerifier, Rules, TaskResult } from './independent-verification';

describe('Independent Verification - 9 PASS', () => {
  const verifier = new IndependentVerifier();
  
  it('1. passes when all rules pass', () => {
    const result: TaskResult = { taskId: 't1', success: true, output: 'hello world', filesCreated: ['a.ts'] };
    const r = verifier.verify(result, [Rules.successFlag(), Rules.outputContains('hello'), Rules.fileCreated('a.ts')]);
    expect(r.passed).toBe(true);
    expect(r.confidence).toBe(1);
  });

  it('2. fails when file missing', () => {
    const result: TaskResult = { taskId: 't2', success: true, output: 'ok', filesCreated: [] };
    const r = verifier.verify(result, [Rules.fileCreated('missing.ts')]);
    expect(r.passed).toBe(false);
  });

  it('3. fails when output missing keyword', () => {
    const result: TaskResult = { taskId: 't3', success: true, output: 'nope' };
    const r = verifier.verify(result, [Rules.outputContains('expected')]);
    expect(r.passed).toBe(false);
  });

  it('4. passes security check', () => {
    const result: TaskResult = { taskId: 't4', success: true, output: 'safe code' };
    const r = verifier.verify(result, [Rules.noSecurityViolation()]);
    expect(r.passed).toBe(true);
  });

  it('5. fails when error present', () => {
    const result: TaskResult = { taskId: 't5', success: false, error: 'crash' };
    const r = verifier.verify(result, [Rules.noError()]);
    expect(r.passed).toBe(false);
  });

  it('6. evidence gate requires at least 2 rules', () => {
    const result: TaskResult = { taskId: 't6', success: true, output: 'ok' };
    const r = verifier.verifyWithEvidenceGate(result, [Rules.successFlag()]);
    expect(r.passed).toBe(false);
    expect(r.checks.find(c=>c.name==='minimum_checks')?.passed).toBe(false);
  });

  it('7. evidence gate fails no evidence', () => {
    const result: TaskResult = { taskId: 't7', success: true };
    const r = verifier.verifyWithEvidenceGate(result, [Rules.successFlag(), Rules.noError()]);
    expect(r.passed).toBe(false);
  });

  it('8. confidence calculation', () => {
    const result: TaskResult = { taskId: 't8', success: true, output: 'hello' };
    const r = verifier.verify(result, [Rules.successFlag(), Rules.outputContains('hello'), Rules.outputContains('bye')]);
    expect(r.confidence).toBeCloseTo(2/3);
  });

  it('9. integration complex verification', () => {
    const result: TaskResult = { taskId: 't9', success: true, output: 'Build succeeded 346 PASS', filesCreated: ['dist/index.js'], metadata: { tests: 346 } };
    const r = verifier.verifyWithEvidenceGate(result, [
      Rules.successFlag(),
      Rules.noError(),
      Rules.outputContains('PASS'),
      Rules.fileCreated('dist/index.js'),
      Rules.noSecurityViolation()
    ]);
    expect(r.passed).toBe(true);
    expect(r.confidence).toBe(1);
  });
});
