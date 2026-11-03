import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ToolGateway,
  VerificationEngine,
  AgentOrchestrator,
} from '../lib/intelligence-core.ts';
import {
  getTaskMemories,
  saveTaskMemory,
  clearTaskMemory,
  getTaskMemoryById,
} from '../src/services/taskMemory.ts';
import { verifyAuditHashChain } from '../src/services/auditLedger.ts';

// Deterministic Local Test Provider
const mockProvider = {
  id: 'zyntheor-local-provider',
  configuredModel: 'zyntheor-core-1.1',
  endpointHost: '127.0.0.1',
  isLocal: true,
  listModels: async () => [{ id: 'zyntheor-core-1.1', name: 'Zyntheor Core 1.1' }],
  chat: async ({ messages }) => ({
    reply: `Autonomous execution verified for: ${messages.find(m => m.role === 'user')?.content?.slice(0, 40) || ''}`,
    model: 'zyntheor-core-1.1',
    provider: 'zyntheor-local-provider',
  }),
  chatStream: async function* () {
    yield { type: 'delta', text: 'Verified agent token' };
    yield { type: 'done', chars: 20 };
  },
  testInference: async () => ({
    ok: true,
    model: 'zyntheor-core-1.1',
    latencyMs: 2,
    matchedExpectedText: true,
  }),
};

test('ToolGateway Dry Run Mode: simulates tool execution, logs to Audit Ledger, and requires human confirmation before live sandboxRunner execution', async () => {
  const gateway = new ToolGateway();
  const recordedAudits = [];

  const dryRunCtx = {
    requestId: 'req-dry-run-01',
    humanApprovals: {}, // NO approval yet
    language: 'en',
    isDryRun: true,
    auditLogger: (entry) => recordedAudits.push(entry),
  };

  // 1. Dry Run simulation on sandboxRunner
  const dryRunResult = await gateway.executeTool(
    'sandboxRunner',
    { cmd: 'npm run test' },
    dryRunCtx
  );

  assert.equal(dryRunResult.isDryRun, true);
  assert.equal(dryRunResult.status, 'PROPOSED');
  assert.equal(dryRunResult.riskLevel, 'HIGH');
  assert.equal(dryRunResult.requiresHumanConfirmation, true);
  assert.ok(dryRunResult.confirmationToken.startsWith('CONFIRM_SANDBOXRUNNER_'));
  assert.ok(dryRunResult.simulatedOutcome.includes('simulated in isolated dry-run container'));

  // 2. Audit Ledger contains tamper-evident entry for dry run simulation
  const auditHistory = gateway.getAuditHistory();
  assert.ok(auditHistory.length > 0, 'Audit history must contain entry');
  const latestEntry = auditHistory[0];
  assert.equal(latestEntry.action, 'TOOL_DRY_RUN_SIMULATION');
  assert.ok(latestEntry.detail.includes('sandboxRunner'));
  assert.ok(latestEntry.detail.includes(dryRunResult.confirmationToken));

  // Verify cryptographic hash chain integrity of Audit Ledger
  const chainVerification = verifyAuditHashChain(auditHistory);
  assert.equal(chainVerification.isValid, true, 'Audit hash chain must be cryptographically valid');

  // 3. Attempting LIVE execution of sandboxRunner WITHOUT human confirmation MUST be rejected
  const liveCtxWithoutApproval = {
    requestId: 'req-live-01',
    humanApprovals: {}, // still no approval
    language: 'en',
    isDryRun: false,
  };

  await assert.rejects(
    async () => gateway.executeTool('sandboxRunner', { cmd: 'npm run test' }, liveCtxWithoutApproval),
    /human_approval_required/
  );

  // 4. Request-context approval alone cannot enable live shell execution.
  const liveCtxWithApproval = {
    requestId: 'req-live-02',
    humanApprovals: { sandboxRunner: true },
    language: 'en',
    isDryRun: false,
    auditLogger: (entry) => recordedAudits.push(entry),
  };

  await assert.rejects(
    async () => gateway.executeTool('sandboxRunner', { cmd: 'npm run test' }, liveCtxWithApproval),
    /Command execution is disabled/
  );

  // 5. Blocked execution must not be logged as confirmed.
  const updatedHistory = gateway.getAuditHistory();
  assert.notEqual(updatedHistory[0]?.action, 'TOOL_EXECUTION_CONFIRMED');
  const updatedChain = verifyAuditHashChain(updatedHistory);
  assert.equal(updatedChain.isValid, true, 'Updated audit hash chain must be cryptographically valid');
});

test('AgentOrchestrator: Multi-step autonomous execution with sub-task decomposition & prioritization', async () => {
  const orchestrator = new AgentOrchestrator({
    provider: mockProvider,
    localOnly: true,
  });

  // Test sub-task decomposition & prioritization
  const steps = orchestrator.decomposeGoal('Verify code changes and run test suite', 'software_dev', false);
  assert.equal(steps.length, 7);

  // Check stage order and priorities
  assert.equal(steps[0].stage, 'understand');
  assert.equal(steps[0].priority, 'CRITICAL');
  assert.equal(steps[1].stage, 'inspect');
  assert.equal(steps[1].priority, 'HIGH');
  assert.equal(steps[2].stage, 'plan');
  assert.equal(steps[3].stage, 'route');
  assert.equal(steps[4].stage, 'execute');
  assert.equal(steps[5].stage, 'verify');
  assert.equal(steps[5].priority, 'CRITICAL');
  assert.equal(steps[6].stage, 'respond');

  // Multi-step run with isDryRun: true
  const dryRunResponse = await orchestrator.orchestrate({
    goal: 'Run test suite to verify code stability',
    workspaceId: 'ws-orchestrator-test',
    isDryRun: true,
  });

  assert.equal(dryRunResponse.isDryRun, true);
  assert.equal(dryRunResponse.status, 'COMPLETED');
  assert.ok(dryRunResponse.dryRunSimulations.length > 0);
  assert.equal(dryRunResponse.executionSummary.dryRunCount, 1);
  assert.ok(dryRunResponse.stagesCompleted.includes('understand'));
  assert.ok(dryRunResponse.stagesCompleted.includes('inspect'));
  assert.ok(dryRunResponse.stagesCompleted.includes('verify'));
  assert.ok(dryRunResponse.evidenceAudit.length > 0);
});

test('AgentOrchestrator: Pauses at Human Approval Gate when live consequential operation lacks approval', async () => {
  const orchestrator = new AgentOrchestrator({
    provider: mockProvider,
    localOnly: true,
  });

  const response = await orchestrator.orchestrate({
    goal: 'Run automated maintenance test command',
    workspaceId: 'ws-gate-test',
    isDryRun: false,
    humanApprovals: {}, // No approval provided
  });

  // Paused at approval gate
  assert.equal(response.status, 'BLOCKED');
  assert.equal(response.executionSummary.pendingApprovalSteps, 1);
  const executeStep = response.steps.find(s => s.stage === 'execute');
  assert.equal(executeStep.executionStatus, 'PENDING');
  assert.equal(executeStep.approvalStatus, 'PENDING');
  assert.equal(executeStep.verificationStatus, 'PROPOSED');
});

test('AgentOrchestrator: Handles AbortSignal cancellation cleanly without hanging', async () => {
  const orchestrator = new AgentOrchestrator({
    provider: mockProvider,
    localOnly: true,
  });

  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => orchestrator.orchestrate({
      goal: 'Execute maintenance tasks',
      signal: controller.signal,
    }),
    /cancelled/i
  );
});

test('AgentOrchestrator: Real-time Streaming Event pipeline yields structured progress events', async () => {
  const orchestrator = new AgentOrchestrator({
    provider: mockProvider,
    localOnly: true,
  });

  const events = [];
  for await (const event of orchestrator.orchestrateStream({
    goal: 'Check system health and inspect workspace',
    workspaceId: 'ws-stream-test',
    isDryRun: true,
  })) {
    events.push(event);
  }

  assert.ok(events.length >= 3);
  assert.ok(events.some(e => e.type === 'stage_start' && e.stage === 'understand'));
  assert.ok(events.some(e => e.type === 'evidence_recorded'));
  assert.ok(events.some(e => e.type === 'delta'));
  assert.ok(events.some(e => e.type === 'done'));
});

test('Persistent Task Memory: Enforces workspace isolation and prevents cross-workspace leakage', () => {
  const wsA = 'workspace-alpha';
  const wsB = 'workspace-beta';

  // Clear test workspaces
  clearTaskMemory(wsA);
  clearTaskMemory(wsB);

  // Save task in Workspace Alpha
  const taskA = saveTaskMemory({
    workspaceId: wsA,
    userId: 'user-alice',
    goal: 'Refactor authentication middleware in Alpha',
    category: 'software_dev',
    findings: ['Found outdated token parser'],
    status: 'ACTIVE',
  });

  // Save task in Workspace Beta
  const taskB = saveTaskMemory({
    workspaceId: wsB,
    goal: 'Run model benchmark in Beta',
    category: 'data_research',
    findings: ['Benchmark completed with 94% score'],
    status: 'COMPLETED',
  });

  // Strict isolation check: Workspace Alpha must ONLY contain taskA
  const tasksAlpha = getTaskMemories(wsA);
  assert.equal(tasksAlpha.length, 1);
  assert.equal(tasksAlpha[0].id, taskA.id);
  assert.equal(tasksAlpha[0].workspaceId, wsA);
  assert.equal(tasksAlpha[0].goal, 'Refactor authentication middleware in Alpha');

  // Workspace Beta must ONLY contain taskB
  const tasksBeta = getTaskMemories(wsB);
  assert.equal(tasksBeta.length, 1);
  assert.equal(tasksBeta[0].id, taskB.id);
  assert.equal(tasksBeta[0].workspaceId, wsB);

  // Cross-workspace query must return undefined
  const crossLookup = getTaskMemoryById(wsA, taskB.id);
  assert.equal(crossLookup, undefined, 'Task from Workspace Beta must not be accessible in Workspace Alpha');

  // User isolation check: non-admin cannot mutate task owned by another user
  assert.throws(
    () => saveTaskMemory({ id: taskA.id, workspaceId: wsA, goal: 'Malicious overwrite', userId: 'user-hacker' }, { id: 'user-hacker', role: 'user' }),
    /Access denied/
  );

  // Clean up
  clearTaskMemory(wsA);
  clearTaskMemory(wsB);
  assert.equal(getTaskMemories(wsA).length, 0);
  assert.equal(getTaskMemories(wsB).length, 0);
});
