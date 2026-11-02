import { describe, it, expect } from 'vitest';
import { PromptTestLab } from './test-lab';

describe('Prompt Test Lab 9 PASS', () => {
  const mockAI = async (prompt: string) => ({ output: `result for ${prompt}`, origin: 'NATIVE', latencyMs: 100 });

  it('1 run single test', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: { name: 'test' }, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('hello ', cases, mockAI);
    expect(res[0].actualOutput).toContain('result');
  });

  it('2 fill variables', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: { city: 'Bangkok' }, expectedOutput: 'Bangkok', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('city {{city}}', cases, async (p) => ({ output: p, origin: 'NATIVE', latencyMs: 50 }));
    expect(res[0].actualOutput).toContain('Bangkok');
  });

  it('3 passed true', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: {}, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('test', cases, mockAI);
    expect(res[0].passed).toBe(true);
  });

  it('4 evidence VERIFIED on pass', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: {}, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('test', cases, mockAI);
    expect(res[0].evidenceState).toBe('VERIFIED');
  });

  it('5 evidence UNVERIFIED on error', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: {}, expectedOutput: 'x', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('test', cases, async () => { throw new Error('fail'); });
    expect(res[0].evidenceState).toBe('UNVERIFIED');
  });

  it('6 latency recorded', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: {}, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('test', cases, mockAI);
    expect(res[0].latencyMs).toBeGreaterThan(0);
  });

  it('7 origin recorded', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: {}, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('test', cases, mockAI);
    expect(res[0].origin).toBe('NATIVE');
  });

  it('8 multiple cases', async () => {
    const lab = new PromptTestLab();
    const cases = [
      { id: '1', input: {}, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const },
      { id: '2', input: {}, expectedOutput: 'result', evidenceState: 'UNVERIFIED' as const },
    ];
    const res = await lab.runTests('test', cases, mockAI);
    expect(res.length).toBe(2);
  });

  it('9 empty input', async () => {
    const lab = new PromptTestLab();
    const cases = [{ id: '1', input: {}, expectedOutput: '', evidenceState: 'UNVERIFIED' as const }];
    const res = await lab.runTests('test', cases, mockAI);
    expect(res[0]).toBeDefined();
  });
});
