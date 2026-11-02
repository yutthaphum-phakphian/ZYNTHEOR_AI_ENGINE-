import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IntelligenceOrchestrationEngine,
  TaskPlanningEngine,
  ContextManagementEngine,
  ModelRouter,
  ToolGovernanceEngine,
  ResultVerificationEngine,
} from '../lib/intelligence-orchestrator.ts';

test('P8 - Task Classification Engine distinguishes simple questions from complex tasks', () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const simpleType = orchestrator.classifyTaskType('What is Express 5 middleware?');
  assert.equal(simpleType, 'SIMPLE_QUESTION');

  const debugType = orchestrator.classifyTaskType('Fix bug causing crash in server.ts');
  assert.equal(debugType, 'DEBUGGING');

  const genType = orchestrator.classifyTaskType('Build a new react user profile component');
  assert.equal(genType, 'CODE_GENERATION');

  const restrictedType = orchestrator.classifyTaskType('Execute npm test command in shell');
  assert.equal(restrictedType, 'RESTRICTED_OPERATION');
});

test('P8 - Task Planning Engine produces structured 9-state plans and bypasses multi-step for simple Q&A', () => {
  const planner = new TaskPlanningEngine();

  // Simple question: single direct step
  const simplePlan = planner.createTaskPlan({
    taskId: 'task-test-1',
    workspaceId: 'ws-1',
    query: 'What is TypeScript interface?',
    taskType: 'SIMPLE_QUESTION',
    isThai: false,
  });

  assert.equal(simplePlan.status, 'CREATED');
  assert.equal(simplePlan.plannedSteps.length, 1);
  assert.equal(simplePlan.plannedSteps[0].riskTier, 'LOW');
  assert.equal(simplePlan.plannedSteps[0].requiresApproval, false);

  // Multi-step task: structured multi-step plan
  const multiPlan = planner.createTaskPlan({
    taskId: 'task-test-2',
    workspaceId: 'ws-1',
    query: 'Fix crash bug in src/App.tsx',
    taskType: 'DEBUGGING',
    isThai: false,
  });

  assert.equal(multiPlan.plannedSteps.length, 3);
  assert.equal(multiPlan.plannedSteps[1].riskTier, 'HIGH');
  assert.equal(multiPlan.plannedSteps[1].requiresApproval, true);
});

test('P8 - Context Management Engine retrieves relevance-scored context with provenance', () => {
  const contextEngine = new ContextManagementEngine();

  const { retrievedResult, provenanceList } = contextEngine.retrieveContext('default', 'server.ts Express billing route', 4000);

  assert.ok(retrievedResult);
  assert.ok(Array.isArray(provenanceList));
  assert.ok(provenanceList.length > 0);

  const topProv = provenanceList[0];
  assert.ok(topProv.file);
  assert.ok(typeof topProv.relevanceScore === 'number');
  assert.ok(topProv.startLine >= 1);
});

test('P8 - Model Router respects local-only policy and consent controls', () => {
  const env = {
    ZYNTHEOR_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key',
  };
  const router = new ModelRouter(env);

  const localOnlySelection = router.selectModel('SIMPLE_QUESTION', {
    localOnly: true,
    onlineConsent: true,
  });

  assert.equal(localOnlySelection.provider.id, 'ollama');
  assert.equal(localOnlySelection.provider.isLocal, true);
  assert.ok(localOnlySelection.policyNotes.some(n => n.includes('Local-only')));

  const noConsentSelection = router.selectModel('SIMPLE_QUESTION', {
    localOnly: false,
    onlineConsent: false,
  });
  assert.equal(noConsentSelection.provider.id, 'ollama');
  assert.ok(noConsentSelection.policyNotes.some(n => n.includes('consent is absent')));

  const consentedSelection = router.selectModel('SIMPLE_QUESTION', {
    localOnly: false,
    onlineConsent: true,
  });
  assert.equal(consentedSelection.provider.id, 'gemini');
});

test('P8 - Tool Governance Engine enforces 3 Risk Tiers and Server-Side Human Approval Gates', () => {
  const governance = new ToolGovernanceEngine();

  // Low risk tool: allowed without human approval
  const lowCheck = governance.validateToolExecution('workspace.inspect', {}, { humanApprovals: {} });
  assert.equal(lowCheck.allowed, true);
  assert.equal(lowCheck.riskTier, 'LOW');

  // High risk tool without approval: blocked server-side
  const highCheckUnapproved = governance.validateToolExecution('workspace.mutate', { action: 'write' }, { humanApprovals: {} });
  assert.equal(highCheckUnapproved.allowed, false);
  assert.equal(highCheckUnapproved.riskTier, 'HIGH');
  assert.ok(highCheckUnapproved.reason?.includes('authorization'));

  // High risk tool with explicit human approval: allowed
  const highCheckApproved = governance.validateToolExecution(
    'workspace.mutate',
    { action: 'write', targetPath: 'src/App.tsx' },
    { humanApprovals: { 'workspace.mutate': true } }
  );
  assert.equal(highCheckApproved.allowed, true);
  assert.equal(highCheckApproved.riskTier, 'HIGH');
});

test('P8 - Result Verification Engine categorizes evidence using 5-Tier Evidence Taxonomy', () => {
  const verifier = new ResultVerificationEngine();

  const factArt = verifier.createArtifact('VERIFIED_FACT', 'test-source', 'File content inspected', { size: 1024 });
  assert.equal(factArt.category, 'VERIFIED_FACT');
  assert.ok(factArt.sha256Digest);

  const hypArt = verifier.createArtifact('HYPOTHESIS', 'model-reasoning', 'Possible null pointer exception');
  assert.equal(hypArt.category, 'HYPOTHESIS');

  const evaluation = verifier.evaluatePlanVerification([
    {
      stepId: 's1',
      order: 1,
      title: 'Inspect',
      description: 'Read file',
      riskTier: 'LOW',
      requiresApproval: false,
      approvalStatus: 'NOT_REQUIRED',
      executionStatus: 'COMPLETED',
      verificationCategory: 'VERIFIED_FACT',
      evidence: factArt,
    },
  ]);

  assert.equal(evaluation.allVerified, true);
  assert.equal(evaluation.evidenceSummary.VERIFIED_FACT, 1);
});

test('P8 - Task Cancellation via AbortSignal transitions task state to CANCELLED', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();
  const controller = new AbortController();

  controller.abort(); // pre-aborted signal

  const res = await orchestrator.execute({
    query: 'Inspect repository structure',
    signal: controller.signal,
  });

  assert.equal(res.taskState, 'CANCELLED');
  assert.equal(res.error, 'Task cancelled');
});

test('P8 - High risk execution without human approval transitions to WAITING_FOR_APPROVAL', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const res = await orchestrator.execute({
    query: 'Execute npm test command in shell',
    humanApprovals: {}, // no approval provided
  });

  assert.equal(res.taskType, 'RESTRICTED_OPERATION');
  assert.equal(res.taskState, 'WAITING_FOR_APPROVAL');
  assert.ok(res.verificationArtifacts.some(a => a.category === 'FAILED_VERIFICATION'));
});

test('P8 - Full End-to-End Orchestration Execution with Human Approvals', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const res = await orchestrator.execute({
    query: 'Inspect repository structure and workspace dependencies',
    workspaceId: 'default',
    humanApprovals: { 'workspace.mutate': true, 'sandboxRunner': true },
  });

  assert.equal(res.taskState, 'COMPLETED');
  assert.ok(res.stepsExecuted > 0);
  assert.ok(res.finalAnswer.includes('ZYNTHEOR INTELLIGENCE CORE'));
  assert.ok(res.verificationArtifacts.length > 0);
  assert.ok(res.durationMs >= 0);
});
