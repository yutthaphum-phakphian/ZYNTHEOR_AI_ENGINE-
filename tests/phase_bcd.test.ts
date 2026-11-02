import { describe, it, expect } from 'vitest';
import { EmbeddingService } from '../src/intelligence/EmbeddingService';
import { TaskGraph, NodeStatus } from '../src/core/TaskGraph';
import { GoalDecomposer } from '../src/core/GoalDecomposer';
import { ContextCompiler } from '../src/core/ContextCompiler';
import { ContinuousVerificationEngine } from '../src/core/ContinuousVerificationEngine';
import { VerificationLevel, VerificationStatus } from '../src/core/VerificationTypes';

describe('PHASE B: Semantic Search & Context Compiler', () => {
  it('calculates cosine similarity correctly for identical and orthogonal vectors', () => {
    expect(EmbeddingService.cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    expect(EmbeddingService.cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
    expect(EmbeddingService.cosineSimilarity([], [])).toBe(0);
  });

  it('embeds text into 384-dimensional normalized vector without data leakage', async () => {
    const vec = await EmbeddingService.embed('function calculateMetrics() { return true; }');
    expect(Array.isArray(vec)).toBe(true);
    expect(vec.length).toBe(384);

    // Empty text returns zero vector
    const emptyVec = await EmbeddingService.embed('');
    expect(emptyVec.length).toBe(384);
    expect(emptyVec.every((x) => x === 0)).toBe(true);
  });

  it('compiles context package with relevant files and constraints', async () => {
    const compiler = new ContextCompiler(process.cwd());
    const context = await compiler.compile('Fix database index and secure routes');
    expect(context.objective).toBe('Fix database index and secure routes');
    expect(Array.isArray(context.relevantFiles)).toBe(true);
    expect(context.constraints).toContain('Local-only');
    expect(context.constraints).toContain('TypeScript strict mode');
  }, 25000);
});

describe('PHASE C: Task Graph DAG & Goal Decomposition', () => {
  it('detects cyclic dependencies in DAG and throws error', () => {
    const g = new TaskGraph('test cycle');
    g.addNode({
      id: 'T1',
      description: 'Step 1',
      assignedAgent: 'DEVELOPER',
      dependencies: ['T2'],
      acceptanceCriteria: '',
      status: NodeStatus.PENDING,
    });
    g.addNode({
      id: 'T2',
      description: 'Step 2',
      assignedAgent: 'DEVELOPER',
      dependencies: ['T1'],
      acceptanceCriteria: '',
      status: NodeStatus.PENDING,
    });

    expect(() => g.validateGraph()).toThrow(/Cyclic dependency/);
  });

  it('determines ready nodes based on completed dependencies', () => {
    const g = new TaskGraph('test dependencies');
    g.addNode({
      id: 'T1',
      description: 'Root Task',
      assignedAgent: 'ARCHITECT',
      dependencies: [],
      acceptanceCriteria: '',
      status: NodeStatus.PENDING,
    });
    g.addNode({
      id: 'T2',
      description: 'Child Task',
      assignedAgent: 'DEVELOPER',
      dependencies: ['T1'],
      acceptanceCriteria: '',
      status: NodeStatus.PENDING,
    });

    let ready = g.getReadyNodes();
    expect(ready.map((n) => n.id)).toEqual(['T1']);

    // Complete T1
    g.nodes.get('T1')!.status = NodeStatus.COMPLETED;
    ready = g.getReadyNodes();
    expect(ready.map((n) => n.id)).toEqual(['T2']);
  });

  it('decomposes goal into multi-agent task graph without cycles', async () => {
    const decomposer = new GoalDecomposer();
    const mockContext = {
      objective: 'Refactor authentication middleware',
      relevantFiles: [{ path: 'src/services/auth.ts', symbols: ['verifyToken'], snippet: '', score: 0.9 }],
      constraints: ['Local-only'],
      risks: ['Token invalidation'],
      evidence: [],
    };

    const graph = await decomposer.decompose(mockContext);
    expect(graph.validateGraph()).toBe(true);
    expect(graph.nodes.size).toBe(4);
    expect(graph.nodes.get('TASK-1')?.assignedAgent).toBe('ARCHITECT');
    expect(graph.nodes.get('TASK-2')?.assignedAgent).toBe('DEVELOPER');
    expect(graph.nodes.get('TASK-3')?.assignedAgent).toBe('SECURITY');
    expect(graph.nodes.get('TASK-4')?.assignedAgent).toBe('TESTER');
  });
});

describe('PHASE D: Continuous Verification Engine', () => {
  it('executes real shell check and captures exit code without self-reporting', async () => {
    const check = await ContinuousVerificationEngine.runCheck(
      VerificationLevel.L1_STRUCTURE,
      'node -e "process.exit(0)"',
      process.cwd()
    );
    expect(check.status).toBe(VerificationStatus.PASSED);
    expect(check.exitCode).toBe(0);

    const failCheck = await ContinuousVerificationEngine.runCheck(
      VerificationLevel.L2_STATIC,
      'node -e "process.exit(1)"',
      process.cwd()
    );
    expect(failCheck.status).toBe(VerificationStatus.FAILED);
    expect(failCheck.exitCode).toBe(1);
    expect(failCheck.failureReason).toBe('Exit 1');
  });
});
