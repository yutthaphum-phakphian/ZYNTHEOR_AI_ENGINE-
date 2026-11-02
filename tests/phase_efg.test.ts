import { describe, it, expect, beforeEach } from 'vitest';
import { TaskState, CognitiveControlPlane } from '../src/core/CognitiveControlPlane';
import { CheckpointManager } from '../src/core/CheckpointManager';
import { DeterministicRecoveryEngine } from '../src/core/DeterministicRecoveryEngine';
import { DecisionEngine } from '../src/intelligence/DecisionEngine';
import {
  EngineeringMemory,
  MemoryCategory,
  MemoryVerificationStatus,
} from '../src/intelligence/EngineeringMemory';

describe('PHASE E: Deterministic Recovery & State Machine', () => {
  it('validates state transitions and rejects illegal jumps', () => {
    expect(() =>
      CognitiveControlPlane.validateTransition(TaskState.CREATED, TaskState.COMPLETED)
    ).toThrow(/INVALID STATE TRANSITION/);

    expect(
      CognitiveControlPlane.validateTransition(TaskState.PLANNING, TaskState.AWAITING_APPROVAL)
    ).toBe(true);

    expect(
      CognitiveControlPlane.validateTransition(TaskState.RUNNING, TaskState.VERIFYING)
    ).toBe(true);
  });

  it('saves checkpoints with WAL and prevents duplicate writes via idempotency check', async () => {
    const jobId = `test-efg-${Date.now()}`;
    const testFile = 'package.json';

    await CheckpointManager.save(jobId, {
      jobId,
      taskState: TaskState.RUNNING,
      taskGraph: { nodes: [] },
      approvedPlanDigest: 'plan-sha256-digest-abc',
      executionId: 'exec-phase-e-1',
      appliedChangeIds: [testFile],
      verificationResults: [],
      auditRef: 'audit-ref-1',
    });

    const isApplied = await CheckpointManager.isChangeApplied(jobId, testFile);
    expect(isApplied).toBe(true);

    const isNotApplied = await CheckpointManager.isChangeApplied(jobId, 'non-existent-change.ts');
    expect(isNotApplied).toBe(false);
  });

  it('handles recovery inspection safely', async () => {
    const jobId = `test-recover-${Date.now()}`;
    await CheckpointManager.save(jobId, {
      jobId,
      taskState: TaskState.VERIFYING,
      taskGraph: {
        nodes: [
          { id: 'T1', status: 'COMPLETED' },
          { id: 'T2', status: 'PENDING' },
        ],
      },
      approvedPlanDigest: 'digest-xyz',
      executionId: 'exec-2',
      appliedChangeIds: ['package.json'],
      verificationResults: [],
      auditRef: 'audit-2',
    });

    const recovery = await DeterministicRecoveryEngine.recover(jobId);
    expect(recovery.action).toBe('RESUME_SAFE');
    expect(recovery.resumeFrom).toBe(TaskState.VERIFYING);
  });
});

describe('PHASE F: Decision Intelligence', () => {
  it('compares alternatives using weighted multi-criteria scoring and generates evidence', () => {
    const record = DecisionEngine.compare([
      {
        id: 'APPROACH_A',
        description: 'Targeted AST indexer with local miniLM',
        scores: {
          correctness: 90,
          security: 85,
          maintainability: 85,
          performance: 80,
          complexity: 25,
          compatibility: 90,
        },
        cost: { resources: 'low', operational: 'low' },
        risks: [],
      },
      {
        id: 'APPROACH_B',
        description: 'Full remote cloud semantic indexer',
        scores: {
          correctness: 92,
          security: 40, // Low security due to external leakage
          maintainability: 70,
          performance: 85,
          complexity: 75,
          compatibility: 60,
        },
        cost: { resources: 'high', operational: 'high' },
        risks: ['Data leakage', 'Network dependency'],
      },
    ]);

    expect(record.selectedApproach).toBe('APPROACH_A');
    expect(record.decision).toContain('Select APPROACH_A');
    expect(record.confidence).toBeGreaterThan(0.7);
    expect(record.tradeOffs).toContain('Trade-off analysis');
  });
});

describe('PHASE G: Engineering Memory 2.0', () => {
  beforeEach(() => {
    EngineeringMemory.clear();
  });

  it('blocks secrets from entering persistent memory', async () => {
    await expect(
      EngineeringMemory.save({
        id: 'mem-leak-1',
        category: MemoryCategory.CODING_CONVENTIONS,
        content: 'Use api_key = ghp_testSecretToken1234567890 in requests',
        source: 'manual',
        workspaceId: 'ws-1',
        tenantId: 'tenant-alpha',
        confidence: 0.9,
        verificationStatus: MemoryVerificationStatus.VERIFIED,
        scope: 'workspace',
      })
    ).rejects.toThrow(/Secret detected/);
  });

  it('rejects unverified solutions from entering VERIFIED_SOLUTIONS category', async () => {
    await expect(
      EngineeringMemory.save({
        id: 'mem-unverified-1',
        category: MemoryCategory.VERIFIED_SOLUTIONS,
        content: 'Fix race condition by removing timeout check',
        source: 'unverified-guess',
        workspaceId: 'ws-1',
        tenantId: 'tenant-alpha',
        confidence: 0.4,
        verificationStatus: MemoryVerificationStatus.UNVERIFIED,
        scope: 'workspace',
      })
    ).rejects.toThrow(/Only VERIFIED findings may enter trusted memory/);
  });

  it('enforces tenant and workspace boundaries during retrieval', async () => {
    await EngineeringMemory.save({
      id: 'mem-tenant-a',
      category: MemoryCategory.CODING_CONVENTIONS,
      content: 'Always use strict TypeScript null checks',
      source: 'rulebook',
      workspaceId: 'ws-1',
      tenantId: 'tenant-alpha',
      confidence: 1.0,
      verificationStatus: MemoryVerificationStatus.VERIFIED,
      scope: 'workspace',
    });

    await EngineeringMemory.save({
      id: 'mem-tenant-b',
      category: MemoryCategory.CODING_CONVENTIONS,
      content: 'Always use strict TypeScript null checks',
      source: 'rulebook',
      workspaceId: 'ws-2',
      tenantId: 'tenant-beta',
      confidence: 1.0,
      verificationStatus: MemoryVerificationStatus.VERIFIED,
      scope: 'workspace',
    });

    // Query for tenant-alpha
    const resultsAlpha = await EngineeringMemory.retrieve(
      'strict TypeScript',
      'ws-1',
      'tenant-alpha'
    );
    expect(resultsAlpha.length).toBe(1);
    expect(resultsAlpha[0].id).toBe('mem-tenant-a');

    // Cross-tenant query should fail closed and yield 0 results
    const resultsCross = await EngineeringMemory.retrieve(
      'strict TypeScript',
      'ws-1',
      'tenant-gamma'
    );
    expect(resultsCross.length).toBe(0);
  });
});
