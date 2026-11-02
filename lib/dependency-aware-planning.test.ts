import { describe, it, expect } from 'vitest';
import { planWithDependencies, verifyPlan, TaskPlan } from './dependency-aware-planning';

describe('Dependency-aware Task Planning - 9 PASS', () => {
  it('1. sorts chain a->b->c correctly', () => {
    const plan: TaskPlan = { id: 'p1', tasks: [{ id: 'c', dependencies: ['b'] }, { id: 'b', dependencies: ['a'] }, { id: 'a' }] };
    const r = planWithDependencies(plan);
    expect(r.valid).toBe(true);
    expect(r.sorted.map(t=>t.id)).toEqual(['a','b','c']);
  });

  it('2. groups independent tasks same layer', () => {
    const plan: TaskPlan = { id: 'p2', tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c', dependencies: ['a','b'] }] };
    const r = planWithDependencies(plan);
    expect(r.parallelGroups[0].length).toBe(2);
    expect(r.parallelGroups[1][0].id).toBe('c');
  });

  it('3. detects missing dependency', () => {
    const plan: TaskPlan = { id: 'p3', tasks: [{ id: 'a', dependencies: ['x'] }] };
    const ev = verifyPlan(plan);
    expect(ev.passed).toBe(false);
    expect(ev.checks.find(c=>c.name==='no_missing_deps')?.passed).toBe(false);
  });

  it('4. detects circular dependency', () => {
    const plan: TaskPlan = { id: 'p4', tasks: [{ id: 'a', dependencies: ['b'] }, { id: 'b', dependencies: ['a'] }] };
    const r = planWithDependencies(plan);
    expect(r.valid).toBe(false);
  });

  it('5. respects priority in same level', () => {
    const plan: TaskPlan = { id: 'p5', tasks: [{ id: 'a', priority: 1 }, { id: 'b', priority: 10 }] };
    const r = planWithDependencies(plan);
    expect(r.sorted[0].id).toBe('b');
  });

  it('6. evidence gate passes valid plan', () => {
    const plan: TaskPlan = { id: 'p6', tasks: [{ id: 'a' }, { id: 'b', dependencies: ['a'] }] };
    const ev = verifyPlan(plan);
    expect(ev.passed).toBe(true);
  });

  it('7. evidence fails duplicate ids', () => {
    const plan: TaskPlan = { id: 'p7', tasks: [{ id: 'a' }, { id: 'a' }] };
    const ev = verifyPlan(plan);
    expect(ev.passed).toBe(false);
  });

  it('8. critical path longest duration', () => {
    const plan: TaskPlan = { id: 'p8', tasks: [{ id: 'a', duration: 5 }, { id: 'b', dependencies: ['a'], duration: 10 }, { id: 'c', duration: 1 }] };
    const r = planWithDependencies(plan);
    expect(r.criticalPath).toEqual(['a','b']);
  });

  it('9. integration complex 5 tasks', () => {
    const plan: TaskPlan = {
      id: 'p9',
      tasks: [
        { id: 'setup', duration: 1 },
        { id: 'fetch', dependencies: ['setup'], duration: 2 },
        { id: 'parse', dependencies: ['fetch'], duration: 3 },
        { id: 'validate', dependencies: ['parse'], duration: 1 },
        { id: 'save', dependencies: ['validate'], duration: 1 },
      ]
    };
    const r = planWithDependencies(plan);
    expect(r.valid).toBe(true);
    expect(r.parallelGroups.length).toBe(5);
    expect(r.criticalPath).toEqual(['setup','fetch','parse','validate','save']);
  });
});
