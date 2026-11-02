import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IntelligenceCore,
  ToolGateway,
  VerificationEngine,
  createEvidence,
} from '../lib/intelligence-core.ts';

// Deterministic Mock Provider for Integration Testing
const mockProvider = {
  id: 'local-test-engine',
  configuredModel: 'zyntheor-core-1.1',
  endpointHost: '127.0.0.1',
  isLocal: true,
  listModels: async () => [{ id: 'zyntheor-core-1.1', name: 'Zyntheor Core 1.1' }],
  chat: async ({ messages }) => {
    const userMsg = messages.find(m => m.role === 'user')?.content || '';
    return {
      reply: `Intelligence synthesis verified: ${userMsg.slice(0, 50)}`,
      model: 'zyntheor-core-1.1',
      provider: 'local-test-engine',
    };
  },
  chatStream: async function* () {
    yield { type: 'delta', text: 'Verified streaming token' };
    yield { type: 'done' };
  },
  testInference: async () => ({
    ok: true,
    model: 'zyntheor-core-1.1',
    latencyMs: 3,
    matchedExpectedText: true,
  }),
};

test('7-Stage Intelligence Workflow executes end-to-end with complete stage metrics', async () => {
  let providerPrompt = '';
  const provider = {
    ...mockProvider,
    chat: async ({ messages }) => {
      providerPrompt = messages.find(message => message.role === 'user')?.content || '';
      return mockProvider.chat({ messages });
    },
  };
  const core = new IntelligenceCore({
    provider,
    localOnly: true,
    onlineConsent: false,
  });

  const response = await core.processRequest({
    query: 'วิเคราะห์โครงสร้างโค้ดและปรับปรุงฟังก์ชันการคำนวณใน src/services/pipelineService.ts',
    language: 'th',
    workspaceContext: {
      activeProjectId: 'proj-001',
      activeProjectName: 'Production Pipeline Core',
      relevantFiles: ['src/services/pipelineService.ts'],
    },
  });

  // Verify 7 distinct stages exist in sequence
  const expectedStages = ['understand', 'inspect', 'plan', 'route', 'execute', 'verify', 'respond'];
  assert.equal(response.workflowStages.length, 7, 'Must execute exactly 7 workflow stages');
  
  for (let i = 0; i < expectedStages.length; i++) {
    const stage = response.workflowStages[i];
    assert.equal(stage.stage, expectedStages[i], `Stage ${i} must match ${expectedStages[i]}`);
    assert.ok(stage.title.length > 0, `Stage ${stage.stage} must have a title`);
    assert.ok(stage.detail.length > 0, `Stage ${stage.stage} must have detail`);
    assert.ok(stage.timestamp, `Stage ${stage.stage} must have a timestamp`);
  }

  // Verification stage must have an evidence digest
  const verifyStage = response.workflowStages.find(s => s.stage === 'verify');
  assert.ok(verifyStage?.evidenceDigest, 'Verify stage must contain evidence digest');
  assert.equal(verifyStage.evidenceDigest.length, 64, 'Digest must be 64-char hex SHA-256');

  assert.match(response.finalAnswer, /^Intelligence synthesis verified:/);
  assert.equal(response.proposedDiff, undefined, 'The workflow must not fabricate a code diff');
  assert.ok(response.retrievedContext.retrievedExcerpts.length > 0);
  assert.ok(response.retrievedContext.retrievedExcerpts.some(excerpt =>
    excerpt.file === 'src/services/pipelineService.ts' &&
    excerpt.content.length > 0 &&
    excerpt.endLine === excerpt.content.split('\n').length
  ), 'Workspace evidence must identify the actual retrieved file');
  assert.ok(providerPrompt.includes('### src/services/pipelineService.ts (lines '), 'Retrieved source must reach provider inference');
});

test('ToolGateway executes safe workspace tools without requiring human approval', async () => {
  const gateway = new ToolGateway();
  const ctx = {
    requestId: 'req-safe-tools',
    humanApprovals: {},
    language: 'en',
  };

  // 1. workspace.inspect
  const inspectRes = await gateway.executeTool('workspace.inspect', {}, ctx);
  assert.equal(inspectRes.status, 'VERIFIED');
  assert.ok(Array.isArray(inspectRes.securityGates));
  assert.ok(inspectRes.securityGates.includes('Human Approval Gate'));

  // 2. workspace.list_files
  const listRes = await gateway.executeTool('workspace.list_files', { directory: 'public' }, ctx);
  assert.equal(listRes.status, 'VERIFIED');
  assert.ok(Array.isArray(listRes.files));
  assert.ok(listRes.files.some(f => f.name.includes('icon') || f.name.includes('manifest')));

  // 3. workspace.read_file
  const readRes = await gateway.executeTool('workspace.read_file', { filePath: 'package.json' }, ctx);
  assert.equal(readRes.status, 'VERIFIED');
  assert.ok(readRes.content.includes('zyntheor-ai-engine'));
  assert.ok(readRes.sizeBytes > 0);

  // 4. code.propose_diff
  const diffProposal = await gateway.executeTool(
    'code.propose_diff',
    {
      file: 'src/main.tsx',
      diff: '--- a/src/main.tsx\n+++ b/src/main.tsx\n@@ -1,3 +1,4 @@\n+// verified\n import React from "react";',
    },
    ctx
  );
  assert.equal(diffProposal.status, 'PROPOSED');
  assert.equal(diffProposal.requiresHumanApproval, true);
  assert.equal(diffProposal.file, 'src/main.tsx');
});

test('ToolGateway strictly prevents directory traversal and sensitive file access', async () => {
  const gateway = new ToolGateway();
  const ctx = {
    requestId: 'req-traversal-guard',
    humanApprovals: {},
    language: 'en',
  };

  // Traversal in workspace.list_files
  await assert.rejects(
    async () => gateway.executeTool('workspace.list_files', { directory: '../../etc' }, ctx),
    /traversal/i
  );

  // Sensitive file reading (.env)
  await assert.rejects(
    async () => gateway.executeTool('workspace.read_file', { filePath: '.env' }, ctx),
    /Access denied/i
  );

  // Directory traversal in read_file
  await assert.rejects(
    async () => gateway.executeTool('workspace.read_file', { filePath: '../../../etc/passwd' }, ctx),
    /Access denied/i
  );
});

test('ToolGateway enforces Human Approval Gate on sandboxRunner', async () => {
  const gateway = new ToolGateway();

  // Without approval: must reject
  const ctxNoApproval = {
    requestId: 'req-sandbox-no-approval',
    humanApprovals: {},
    language: 'en',
  };

  await assert.rejects(
    async () => gateway.executeTool('sandboxRunner', { cmd: 'echo "test"' }, ctxNoApproval),
    /human_approval_required/
  );

  // Caller-provided approval cannot enable command execution.
  const ctxWithApproval = {
    requestId: 'req-sandbox-approved',
    humanApprovals: { sandboxRunner: true },
    language: 'en',
  };

  await assert.rejects(
    async () => gateway.executeTool('sandboxRunner', { cmd: 'npm run test' }, ctxWithApproval),
    /Command execution is disabled/
  );

  // Disallowed commands remain rejected.
  await assert.rejects(
    async () => gateway.executeTool('sandboxRunner', { cmd: 'rm -rf /' }, ctxWithApproval),
    /Command execution is disabled/
  );
});

test('Context continuity preserves project context and error state across requests', async () => {
  let receivedMessages = [];
  const contextProvider = {
    ...mockProvider,
    chat: async ({ messages }) => {
      receivedMessages = messages;
      return { reply: 'Context-aware response from model inference.', model: mockProvider.configuredModel, provider: mockProvider.id };
    },
  };
  const core = new IntelligenceCore({
    provider: contextProvider,
    localOnly: true,
    onlineConsent: false,
  });

  const response = await core.processRequest({
    query: 'Inspect system architecture, project status and current findings',
    language: 'en',
    workspaceContext: {
      activeProjectId: 'proj-alpha-12',
      activeProjectName: 'Alpha Subsystem',
      recentMessages: [
        { role: 'user', content: 'We need to check the database migrations' },
        { role: 'assistant', content: 'Database migration scripts are intact' },
      ],
      relevantFiles: ['database/schema.ts'],
      systemErrorsCount: 0,
    },
  });

  assert.equal(response.finalAnswer, 'Context-aware response from model inference.');
  assert.ok(receivedMessages.some(message => message.content.includes('Alpha Subsystem')));
  assert.ok(response.workspaceSummary.inspectedFiles.length > 0);
  assert.equal(response.classification.category, 'system_architecture');
  assert.ok(response.evidenceAudit.length >= 2, 'Evidence audit chain must be recorded');
});

test('VerificationEngine computes unique SHA-256 digests and detects mismatch', () => {
  const engine = new VerificationEngine();

  const evidence1 = engine.record('AUDIT', 'source-a', { metric: 100 }, 'VERIFIED');
  const evidence2 = engine.record('AUDIT', 'source-a', { metric: 101 }, 'VERIFIED');

  assert.notEqual(evidence1.digest, evidence2.digest, 'Different payloads must yield different digests');
  assert.equal(evidence1.digest.length, 64);
  assert.equal(evidence2.digest.length, 64);

  // Reproducibility
  const manualDigest = engine.hashEvidence(`AUDIT:source-a:${JSON.stringify({ metric: 100 })}`);
  assert.equal(evidence1.digest, manualDigest, 'Digest calculation must be deterministic');
});
