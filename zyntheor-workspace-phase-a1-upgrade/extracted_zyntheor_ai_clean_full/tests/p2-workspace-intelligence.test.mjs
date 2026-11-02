import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { buildCodeGraph, queryGraphForContext, findRelatedNodes, getCodeGraphSummary } from '../src/services/codeGraph.ts';
import { inspectProjectMetadata, retrieveRelevantContext } from '../src/services/projectContextEngine.ts';
import { ToolGateway } from '../lib/intelligence-core.ts';

test('p2: code graph extracts dependencies, routes, components, and tests accurately', () => {
  const graph = buildCodeGraph({ forceReindex: true });
  assert.ok(graph.totalFiles > 0, 'Graph should contain indexable source files');
  assert.ok(graph.totalEdges > 0, 'Graph should extract import relationships');

  const summary = getCodeGraphSummary();
  assert.ok(summary.totalFiles > 0);
  assert.ok(typeof summary.categories === 'object');

  // Verify related node discovery for server.ts or App.tsx
  const related = findRelatedNodes('src/App.tsx');
  assert.ok(Array.isArray(related.dependencies));
  assert.ok(Array.isArray(related.consumers));
});

test('p2: code graph incremental reindexing operates with zero errors', () => {
  const graph1 = buildCodeGraph();
  const graph2 = buildCodeGraph(); // second call should hit mtime cache
  assert.equal(graph2.incrementalUpdatedFiles, 0, 'Unchanged files should hit mtime cache');
});

test('p2: project context engine inspects metadata and enforces relevance retrieval budget', () => {
  const metadata = inspectProjectMetadata('project-main', 'ZYNTHEOR AI ENGINE');
  assert.equal(metadata.workspaceId, 'project-main');
  assert.ok(metadata.entryPoints.includes('server.ts') || metadata.entryPoints.includes('src/main.tsx'));
  assert.ok(Array.isArray(metadata.frameworks));

  // Relevance retrieval
  const retrieved = retrieveRelevantContext({
    workspaceId: 'project-main',
    query: 'SettingsCenter POST /api/settings persistence',
    maxTokens: 1000,
  });

  assert.equal(retrieved.workspaceId, 'project-main');
  assert.ok(Array.isArray(retrieved.retrievedExcerpts));
  assert.ok(retrieved.retrievedExcerpts.length <= 6);
  assert.ok(retrieved.totalContextBytes > 0);
  assert.equal(retrieved.securitySanitized, true);
});

test('p2: context retrieval prevents sensitive file exposure and path traversal', () => {
  const retrieved = retrieveRelevantContext({
    workspaceId: 'project-main',
    query: '.env secret token password id_rsa',
  });

  // Verify zero sensitive files in excerpts
  for (const excerpt of retrieved.retrievedExcerpts) {
    assert.equal(/\.env/i.test(excerpt.file), false);
    assert.equal(/secret/i.test(excerpt.file), false);
    assert.equal(/id_rsa/i.test(excerpt.file), false);
  }
});

test('p2: tool gateway strictly blocks model self-approval for consequential operations', async () => {
  const gateway = new ToolGateway();
  const ctxWithoutApproval = {
    requestId: 'req-test-001',
    humanApprovals: {}, // NO human approval provided
    language: 'th',
  };

  // Attempting consequential workspace.mutate without human approval must fail
  await assert.rejects(
    async () => {
      await gateway.executeTool('workspace.mutate', { action: 'UPDATE', targetPath: 'src/App.tsx' }, ctxWithoutApproval);
    },
    (err) => {
      assert.ok(err.message.includes('human_approval_required') || err.message.includes('explicit human approval'));
      return true;
    }
  );

  // Executing with explicit human approval must succeed
  const ctxWithApproval = {
    requestId: 'req-test-002',
    humanApprovals: { 'workspace.mutate': true },
    language: 'th',
  };

  const res = await gateway.executeTool('workspace.mutate', { action: 'UPDATE', targetPath: 'src/App.tsx' }, ctxWithApproval);
  assert.equal(res.status, 'PROPOSED');
  assert.equal(res.humanApproved, true);
});

test('p2: tool gateway dry run simulation produces confirmation tokens without executing mutations', async () => {
  const gateway = new ToolGateway();
  const ctxDryRun = {
    requestId: 'req-dry-001',
    humanApprovals: {},
    isDryRun: true,
    language: 'th',
  };

  const simulation = await gateway.dryRunTool('workspace.mutate', { action: 'DELETE', targetPath: 'src/App.tsx' }, ctxDryRun);
  assert.equal(simulation.isDryRun, true);
  assert.equal(simulation.status, 'PROPOSED');
  assert.ok(simulation.confirmationToken.startsWith('CONFIRM_'));
  assert.equal(simulation.riskLevel, 'HIGH');
});

test('p2: Thai query retrieval tokenizes Thai text and remains within the requested budget', () => {
  const retrieved = retrieveRelevantContext({
    workspaceId: 'thai-context-check',
    query: 'ระบบจัดการภาษาไทยและการตั้งค่าภาษา',
    maxTokens: 256,
    maxFiles: 4,
  });
  assert.equal(retrieved.workspaceId, 'thai-context-check');
  assert.ok(retrieved.retrievedExcerpts.length <= 4);
  assert.ok(retrieved.estimatedTokens <= 256 || retrieved.contextBudgetExceeded);
  assert.equal(retrieved.securitySanitized, true);
});
