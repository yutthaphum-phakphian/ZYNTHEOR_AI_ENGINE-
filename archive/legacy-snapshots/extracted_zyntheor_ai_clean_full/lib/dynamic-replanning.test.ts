import { describe, it, expect } from 'vitest';
import { DynamicReplanner, verifyReplan, Plan, ToolFailure } from './dynamic-replanning';

const basePlan: Plan = {
  id: 'p1',
  steps: [
    { id: 's1', tool: 'web_search' },
    { id: 's2', tool: 'code_execute', dependencies: ['s1'] },
    { id: 's3', tool: 'gpt-4', optional: true }
  ]
};

describe('DynamicReplanner - Evidence Gate 9 PASS', () => {
  it('1. retry_same on transient timeout', () => {
    const r = new DynamicReplanner();
    const f: ToolFailure = { stepId: 's1', toolName: 'web_search', error: 'timeout', attempt: 1, isTransient: true };
    const d = r.replan(basePlan, f);
    expect(d.strategy).toBe('retry_same');
    expect(d.evidence.passed).toBe(true);
  });

  it('2. retry_alternate with fallback map', () => {
    const r = new DynamicReplanner();
    const f: ToolFailure = { stepId: 's1', toolName: 'web_search', error: '403', attempt: 1 };
    const d = r.replan(basePlan, f);
    expect(d.strategy).toBe('retry_alternate');
    expect(d.newPlan?.steps.find(s=>s.id==='s1')?.tool).toBe('local_search');
  });

  it('3. reorder_dependencies on dependency error', () => {
    const r = new DynamicReplanner();
    const plan: Plan = { id: 'p2', steps: [{ id: 'a', tool: 't1', dependencies: ['b'] }, { id: 'b', tool: 't2' }] };
    const f: ToolFailure = { stepId: 'a', toolName: 't1', error: 'dependency failed', attempt: 1 };
    const d = r.replan(plan, f);
    expect(d.strategy).toBe('reorder_dependencies');
  });

  it('4. skip_optional when optional fails', () => {
    const r = new DynamicReplanner();
    const f: ToolFailure = { stepId: 's3', toolName: 'gpt-4', error: 'quota', attempt: 1 };
    const d = r.replan(basePlan, f);
    expect(d.strategy).toBe('skip_optional');
    expect(d.newPlan?.steps.length).toBe(2);
  });

  it('5. abort after max retries', () => {
    const r = new DynamicReplanner();
    const f: ToolFailure = { stepId: 's2', toolName: 'code_execute', error: 'crash', attempt: 3 };
    const d = r.replan(basePlan, f);
    expect(d.strategy).toBe('abort');
  });

  it('6. evidence gate passes valid replan', () => {
    const newPlan: Plan = { id: 'p1', steps: [{ id: 's1', tool: 'local_search' }, { id: 's2', tool: 'code_execute' }] };
    const ev = verifyReplan(newPlan, basePlan);
    expect(ev.passed).toBe(true);
  });

  it('7. evidence gate fails duplicate ids', () => {
    const newPlan: Plan = { id: 'p1', steps: [{ id: 's1', tool: 'a' }, { id: 's1', tool: 'b' }] };
    const ev = verifyReplan(newPlan, basePlan);
    expect(ev.passed).toBe(false);
    expect(ev.checks.find(c=>c.name==='no_duplicate_ids')?.passed).toBe(false);
  });

  it('8. evidence gate fails circular deps', () => {
    const newPlan: Plan = { id: 'p1', steps: [{ id: 's1', tool: 'a', dependencies: ['s2'] }, { id: 's2', tool: 'b', dependencies: ['s1'] }] };
    const ev = verifyReplan(newPlan, basePlan);
    expect(ev.passed).toBe(false);
  });

  it('9. integration: transient -> retry -> evidence pass', () => {
    const r = new DynamicReplanner();
    const f: ToolFailure = { stepId: 's2', toolName: 'code_execute', error: 'timeout', attempt: 0, isTransient: true };
    expect(r.shouldReplan(f)).toBe(true);
    const d = r.replan(basePlan, f);
    expect(d.evidence.passed).toBe(true);
    expect(d.confidence).toBeGreaterThan(0.5);
  });
});
