import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IntelligenceCore,
  ToolGateway,
  VerificationEngine,
  createEvidence,
} from '../lib/intelligence-core.ts';

// Mock Provider for testing intelligence core without hitting external networks
const mockProvider = {
  id: 'mock-provider',
  configuredModel: 'mock-model-v1',
  endpointHost: '127.0.0.1',
  isLocal: true,
  listModels: async () => [{ id: 'mock-model-v1', name: 'Mock Model' }],
  chat: async ({ messages }) => {
    const userMsg = messages.find(m => m.role === 'user')?.content || '';
    return {
      reply: `Mock synthesis for: ${userMsg.slice(0, 40)}`,
      model: 'mock-model-v1',
      provider: 'mock-provider',
    };
  },
  chatStream: async function* () {
    yield { type: 'delta', text: 'Mock streamed token' };
    yield { type: 'done' };
  },
  testInference: async () => ({
    ok: true,
    model: 'mock-model-v1',
    latencyMs: 5,
    matchedExpectedText: true,
  }),
};

test('VerificationEngine creates SHA-256 evidence digests and classifies evidence correctly', () => {
  const engine = new VerificationEngine();
  const rawData = { testCount: 56, passed: true, suite: 'all' };
  const evidence = engine.record('test-run', 'automated-tests', rawData, 'VERIFIED');

  assert.ok(evidence.id.startsWith('ev-'));
  assert.equal(evidence.type, 'test-run');
  assert.equal(evidence.source, 'automated-tests');
  assert.equal(evidence.evidenceStatus, 'VERIFIED');
  assert.equal(typeof evidence.digest, 'string');
  assert.equal(evidence.digest.length, 64, 'SHA-256 digest must be 64 hex characters');

  // Verify hash repeatability
  const manualEvidence = createEvidence('test-run', 'automated-tests', rawData, 'VERIFIED');
  assert.equal(manualEvidence.digest, evidence.digest);

  // Status check
  assert.equal(engine.evaluateStatus([evidence]), 'VERIFIED');

  const unverified = engine.record('claim', 'untested-feature', { note: 'no test yet' }, 'UNVERIFIED');
  assert.equal(engine.evaluateStatus([evidence, unverified]), 'UNVERIFIED');
});

test('ToolGateway enforces tool allowlist and argument schema validation', async () => {
  const gateway = new ToolGateway();
  const tools = gateway.listTools();
  assert.ok(tools.length >= 4, 'Tool allowlist must contain at least 4 registered tools');
  assert.ok(gateway.hasTool('repo.inspect'));
  assert.ok(gateway.hasTool('repo.package_info'));
  assert.ok(gateway.hasTool('code.analyze'));
  assert.ok(gateway.hasTool('prompt.forge'));
  assert.ok(gateway.hasTool('workspace.mutate'));
  assert.equal(gateway.hasTool('arbitrary.dangerous.command'), false);

  const ctx = {
    requestId: 'req-test-1',
    humanApprovals: {},
    language: 'en',
  };

  // Calling unknown tool must be blocked
  await assert.rejects(
    async () => gateway.executeTool('unknown.tool', {}, ctx),
    /tool_not_allowed/
  );

  // Calling tool with invalid arguments must fail validation
  await assert.rejects(
    async () => gateway.executeTool('code.analyze', { code: 123 }, ctx),
    /invalid_arguments/
  );
});

test('ToolGateway enforces Human Approval Gate for consequential tools (models cannot self-approve)', async () => {
  const gateway = new ToolGateway();

  const ctxWithoutApproval = {
    requestId: 'req-gate-1',
    humanApprovals: {}, // No approval provided
    language: 'th',
  };

  // workspace.mutate is consequential and requires approval
  await assert.rejects(
    async () =>
      gateway.executeTool(
        'workspace.mutate',
        {
          action: 'write_file',
          targetPath: 'test.txt',
          proposedContent: 'hello',
        },
        ctxWithoutApproval
      ),
    /human_approval_required/
  );

  // When human approval is explicitly granted:
  const ctxWithApproval = {
    requestId: 'req-gate-2',
    humanApprovals: {
      'workspace.mutate': true,
    },
    language: 'th',
  };

  const result = await gateway.executeTool(
    'workspace.mutate',
    {
      action: 'write_file',
      targetPath: 'test.txt',
      proposedContent: 'hello',
    },
    ctxWithApproval
  );

  assert.equal(result.status, 'PROPOSED');
  assert.equal(result.humanApproved, true);
  assert.ok(result.changeReview);
});

test('ToolGateway non-consequential tools execute safely without approval', async () => {
  const gateway = new ToolGateway();
  const ctx = {
    requestId: 'req-read-1',
    humanApprovals: {},
    language: 'en',
  };

  const pkgInfo = await gateway.executeTool('repo.package_info', {}, ctx);
  assert.equal(pkgInfo.name, 'zyntheor-ai-engine');
  assert.ok(pkgInfo.dependencies['@google/genai']);

  const forgeResult = await gateway.executeTool(
    'prompt.forge',
    {
      goal: 'Write a React button component with dark mode support',
      targetLanguage: 'en',
    },
    ctx
  );
  assert.ok(forgeResult.prompt);
  assert.ok(forgeResult.prompt.includes('# ROLE'));
});

test('IntelligenceCore classifies tasks accurately in both Thai and English', async () => {
  const core = new IntelligenceCore({
    provider: mockProvider,
    localOnly: true,
    onlineConsent: false,
  });

  const reqTh = await core.processRequest({
    query: 'ช่วยวิเคราะห์บั๊กในฟังก์ชันคำนวณภาษีและหาวิธีแก้ไข',
    language: 'th',
  });
  assert.equal(reqTh.classification.category, 'bug_analysis');
  assert.equal(reqTh.classification.targetLanguage, 'th');

  const reqEn = await core.processRequest({
    query: 'Review the architecture and security boundaries of our authentication layer',
    language: 'en',
  });
  assert.equal(reqEn.classification.category, 'system_architecture');
  assert.equal(reqEn.classification.targetLanguage, 'en');

  const reqForge = await core.processRequest({
    query: 'สร้าง system prompt สำหรับ AI assistant สายวิทยาศาสตร์ข้อมูล',
    language: 'th',
  });
  assert.equal(reqForge.classification.category, 'prompt_forge');
});

test('IntelligenceCore uses actual provider inference for simple questions', async () => {
  const actualReply = 'A reducer combines values from a collection into one result.';
  let providerCalls = 0;
  const recordingProvider = {
    ...mockProvider,
    chat: async () => {
      providerCalls++;
      return { reply: actualReply, model: mockProvider.configuredModel, provider: mockProvider.id };
    },
  };
  const core = new IntelligenceCore({
    provider: recordingProvider,
    localOnly: true,
    onlineConsent: false,
  });

  const response = await core.processRequest({ query: 'What is a reducer?', language: 'en', bypassCache: true });

  assert.equal(providerCalls, 1);
  assert.equal(response.finalAnswer, actualReply);
  assert.equal(response.plan.status, 'COMPLETED');
  assert.equal(response.plan.steps.length, 1);
  assert.equal(response.executionSummary.pendingApprovalSteps, 0);
  assert.equal(response.proposedDiff, undefined);
});

test('IntelligenceCore strictly separates Plan Status, Execution Status, and Verification Status', async () => {
  const core = new IntelligenceCore({
    provider: mockProvider,
    localOnly: true,
    onlineConsent: false,
  });

  const response = await core.processRequest({
    query: 'สร้าง REST API สำหรับระบบจัดการสินค้าในคลัง',
    language: 'th',
  });

  // 1. Plan Status
  assert.ok(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED'].includes(response.plan.status));
  assert.equal(response.plan.status, 'COMPLETED', 'Analysis must not wait for approval to perform a generic mutation');
  assert.ok(response.plan.steps.length > 0);
  assert.equal(response.executionSummary.pendingApprovalSteps, 0);

  for (const step of response.plan.steps) {
    // 2. Execution Status
    assert.ok(
      ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'].includes(step.executionStatus),
      `Invalid executionStatus: ${step.executionStatus}`
    );

    // 3. Verification Status (Evidence status: VERIFIED, ASSUMPTION, PROPOSED, UNVERIFIED)
    assert.ok(
      ['VERIFIED', 'ASSUMPTION', 'PROPOSED', 'UNVERIFIED'].includes(step.verificationStatus),
      `Invalid verificationStatus: ${step.verificationStatus}`
    );

    // If step requires human approval and was not approved, it must NOT be marked COMPLETED
    if (step.requiresHumanApproval && step.approvalStatus !== 'APPROVED') {
      assert.notEqual(step.executionStatus, 'COMPLETED');
    }
  }

  // 4. Evidence audit
  assert.ok(Array.isArray(response.evidenceAudit));
  assert.ok(response.evidenceAudit.length > 0);
  for (const ev of response.evidenceAudit) {
    assert.equal(typeof ev.digest, 'string');
    assert.equal(ev.digest.length, 64);
  }
});

test('IntelligenceCore respects AbortSignal and does not hang on timeout', async () => {
  const core = new IntelligenceCore({
    provider: mockProvider,
    localOnly: true,
    onlineConsent: false,
  });

  const controller = new AbortController();
  controller.abort(); // already aborted

  await assert.rejects(
    async () => {
      await core.processRequest({
        query: 'Test cancellation handling',
        signal: controller.signal,
      });
    },
    /abort|cancel/i
  );
});

test('IntelligenceCore blocks external inference when ZYNTHEOR_LOCAL_ONLY is active', async () => {
  let providerCalls = 0;
  const remoteMockProvider = {
    ...mockProvider,
    id: 'remote-gemini',
    isLocal: false,
    endpointHost: 'generativelanguage.googleapis.com',
    chat: async () => {
      providerCalls++;
      return { reply: 'must not run', model: 'remote-model', provider: 'remote-gemini' };
    },
  };

  const coreLocalOnly = new IntelligenceCore({
    provider: remoteMockProvider,
    localOnly: true,
    onlineConsent: false,
  });

  await assert.rejects(
    coreLocalOnly.processRequest({ query: 'Generate a code plan', language: 'en', bypassCache: true }),
    /online_provider_blocked_by_policy/
  );
  assert.equal(providerCalls, 0);
});

test('IntelligenceCore does not convert provider failures into successful responses', async () => {
  const unavailableProvider = {
    ...mockProvider,
    chat: async () => { throw new Error('model_unavailable'); },
  };
  const core = new IntelligenceCore({ provider: unavailableProvider, localOnly: true });

  await assert.rejects(
    core.processRequest({ query: 'What is a reducer?', language: 'en', bypassCache: true }),
    /unavailable/
  );
});
