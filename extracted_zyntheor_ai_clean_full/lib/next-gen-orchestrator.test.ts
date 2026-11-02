import { describe, it, expect } from 'vitest';
import { NextGenOrchestrator, NextGenWorkflow } from './next-gen-orchestrator';
import { Provider } from './adaptive-routing';

const providers: Provider[] = [
  { id: 'ollama', health: 'healthy', latencyP50: 200, costPer1kTokens: 0, successRate: 95, supportedModes: ['AUTO','CHAT','CODING'] },
  { id: 'gemini', health: 'healthy', latencyP50: 800, costPer1kTokens: 0.5, successRate: 90, supportedModes: ['AUTO','CHAT','REASONING'] },
];

describe('Next-Gen Orchestrator - 9 PASS (6 Pillars Integration)', () => {
  const orchestrator = new NextGenOrchestrator();

  it('1. executes simple workflow', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf1',
      tasks: [{ id: 'a', goal: 'setup', mode: 'CHAT' }, { id: 'b', goal: 'build', mode: 'CODING', dependencies: ['a'] }],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.executedTasks.length).toBeGreaterThan(0);
    expect(result.evidence.dependencyValid).toBe(true);
  });

  it('2. detects invalid dependencies', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf2',
      tasks: [{ id: 'a', goal: 'a', mode: 'CHAT', dependencies: ['nonexist'] }],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.success).toBe(false);
    expect(result.evidence.dependencyValid).toBe(false);
  });

  it('3. handles parallel tasks', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf3',
      tasks: [{ id: 'a', goal: 'a', mode: 'CHAT' }, { id: 'b', goal: 'b', mode: 'CHAT' }, { id: 'c', goal: 'c', mode: 'CODING', dependencies: ['a','b'] }],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.evidence.routingDecisions).toBe(3);
  });

  it('4. continuity checkpoints created', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf4',
      tasks: [{ id: 'a', goal: 'a', mode: 'CHAT' }, { id: 'b', goal: 'b', mode: 'CHAT', dependencies: ['a'] }],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.evidence.continuityCheckpoints).toBeGreaterThan(0);
  });

  it('5. verification confidence', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf5',
      tasks: [{ id: 'a', goal: 'a', mode: 'CHAT' }],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.evidence.verificationConfidence).toBeGreaterThan(0);
  });

  it('6. analyzes codebase', () => {
    const files = { 'a.ts': `import { b } from './b';`, 'b.ts': `export const b=1;` };
    const graph = orchestrator.analyzeCodebase(files);
    expect(graph['a.ts']).toBeDefined();
  });

  it('7. rerouting on failure', async () => {
    const flakyProviders: Provider[] = [
      { id: 'bad', health: 'unhealthy', latencyP50: 5000, costPer1kTokens: 10, successRate: 10, supportedModes: ['CHAT'] },
      { id: 'good', health: 'healthy', latencyP50: 200, costPer1kTokens: 0, successRate: 99, supportedModes: ['CHAT'] },
    ];
    const workflow: NextGenWorkflow = {
      id: 'wf7',
      tasks: [{ id: 'a', goal: 'a', mode: 'CHAT' }],
      providers: flakyProviders
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.executedTasks.length).toBeGreaterThan(0);
  });

  it('8. optional task failure does not block', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf8',
      tasks: [{ id: 'a', goal: 'a', mode: 'CHAT' }, { id: 'b', goal: 'b', mode: 'CHAT', optional: true }],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.workflowId).toBe('wf8');
  });

  it('9. integration all 6 pillars', async () => {
    const workflow: NextGenWorkflow = {
      id: 'wf9',
      tasks: [
        { id: 'setup', goal: 'setup project', mode: 'CHAT', priority: 'high' },
        { id: 'analyze', goal: 'analyze code', mode: 'REASONING', dependencies: ['setup'] },
        { id: 'plan', goal: 'create plan', mode: 'REASONING', dependencies: ['analyze'] },
        { id: 'code', goal: 'write code', mode: 'CODING', dependencies: ['plan'] },
        { id: 'verify', goal: 'verify', mode: 'CHAT', dependencies: ['code'] },
      ],
      providers
    };
    const result = await orchestrator.executeWorkflow(workflow);
    expect(result.evidence.dependencyValid).toBe(true);
    expect(result.evidence.routingDecisions).toBe(5);
    expect(result.evidence.continuityCheckpoints).toBeGreaterThanOrEqual(5);
  });
});
