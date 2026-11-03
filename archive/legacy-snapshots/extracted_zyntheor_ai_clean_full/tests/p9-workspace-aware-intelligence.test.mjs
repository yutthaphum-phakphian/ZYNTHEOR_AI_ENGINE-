import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { projectStructureEngine } from '../src/services/projectStructureEngine.ts';
import { workspaceGraphService } from '../src/services/workspaceGraph.ts';
import { crossFileReasoningEngine } from '../src/services/crossFileReasoning.ts';
import { changeImpactEngine } from '../src/services/changeImpactEngine.ts';
import { workspaceMemoryService } from '../src/services/workspaceMemory.ts';
import { incrementalIndexer } from '../src/services/incrementalIndexer.ts';
import { projectAwareDebugger } from '../src/services/projectAwareDebugger.ts';

describe('P9 — Workspace-Aware Intelligence Test Suite', () => {

  test('1. Project Structure Engine analyzes hierarchy, stack, entry points, and test structure', () => {
    const analysis = projectStructureEngine.analyzeProjectStructure();

    assert.ok(analysis.totalFiles > 0, 'Total files should be > 0');
    assert.ok(analysis.frameworks.length > 0, 'Should detect frameworks');
    assert.ok(analysis.entryPoints.includes('server.ts') || analysis.entryPoints.includes('src/App.tsx'), 'Should detect main entry points');
    assert.ok(analysis.testStructure.totalTestFiles > 0, 'Should detect test files');
    assert.ok(analysis.files.some(f => f.category === 'source'), 'Should classify source files');
  });

  test('2. Workspace Graph Service computes symbols with line provenance, API routes, and DB mappings', () => {
    const details = workspaceGraphService.getWorkspaceGraph(true);

    assert.ok(details.graph.nodes.length > 0, 'Nodes count should be > 0');
    assert.ok(details.symbols.length > 0, 'Symbols count should be > 0');
    assert.ok(details.symbols[0].provenance.startsWith('file://'), 'Symbol should have valid provenance URI');
    assert.ok(details.apiRoutes.length > 0, 'Should map API routes');
    assert.ok(details.dbSchemas.length > 0, 'Should map DB schemas');
  });

  test('3. Cross-File Reasoning Engine assembles context and plans multi-file edits', () => {
    const contextResult = crossFileReasoningEngine.assembleCrossFileContext('billing subscription', ['src/routes/billing.ts']);
    assert.ok(contextResult.contextUnits.length > 0, 'Should assemble context units');
    assert.ok(contextResult.totalTokensEstimated > 0, 'Should estimate token count');

    const editPlan = crossFileReasoningEngine.planMultiFileChanges('src/routes/billing.ts', 'Update billing routes');
    assert.equal(editPlan.primaryFile, 'src/routes/billing.ts');
    assert.ok(editPlan.edits.length >= 1, 'Should contain edit operations');
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(editPlan.riskAssessment), 'Risk level should be valid');
  });

  test('4. Change Impact Engine assesses risk levels and predicts broken tests', () => {
    const schemaImpact = changeImpactEngine.analyzeImpact('database/schema.ts');
    assert.equal(schemaImpact.changeType, 'schema');
    assert.equal(schemaImpact.riskLevel, 'CRITICAL');
    assert.ok(schemaImpact.recommendations.length > 0);

    const apiImpact = changeImpactEngine.analyzeImpact('src/routes/billing.ts');
    assert.equal(apiImpact.changeType, 'api');
    assert.equal(apiImpact.riskLevel, 'HIGH');
  });

  test('5. Workspace Memory Service stores and retrieves architectural summaries with provenance', () => {
    const entry = workspaceMemoryService.addMemoryEntry('default', {
      type: 'architecture_summary',
      title: 'Test Architecture Summary',
      content: 'Express + Vite fullstack architecture',
      provenance: 'file://server.ts#line=1',
      confidenceScore: 0.95,
      versionMarker: '1.1.0',
    });

    assert.ok(entry.id.startsWith('wm-'));
    assert.equal(entry.confidenceScore, 0.95);

    const entries = workspaceMemoryService.getMemoryEntries('default', 'architecture_summary');
    assert.ok(entries.some(e => e.title === 'Test Architecture Summary'));
  });

  test('6. Incremental Indexer detects graph deltas', () => {
    const delta = incrementalIndexer.processIncrementalUpdate(['src/services/billingService.ts']);
    assert.ok(delta.graphData.totalFiles > 0);
    assert.ok(delta.indexedAt);
  });

  test('7. Project-Aware Debugger executes 11-step evidence-backed debugging workflow', () => {
    const session = projectAwareDebugger.runDebugSession(
      'TypeError: Cannot read properties of undefined in billingService',
      'Error: TypeError\n at verifyAndApprovePayment (src/services/billingService.ts:85:12)'
    );

    assert.equal(session.steps.length, 11, 'Should execute all 11 workflow steps');
    assert.equal(session.overallStatus, 'ISOLATED');
    assert.equal(session.rootCauseFile, 'src/services/billingService.ts');
    assert.equal(session.rootCauseLine, 85);
    assert.ok(session.suggestedFixes.length > 0);
  });

  test('8. Billing Dashboard and SubscriptionStateTracker components are properly defined', () => {
    const trackerPath = path.join(process.cwd(), 'src/components/SubscriptionStateTracker.tsx');
    const dashboardPath = path.join(process.cwd(), 'src/components/BillingDashboard.tsx');

    assert.ok(fs.existsSync(trackerPath), 'SubscriptionStateTracker.tsx file should exist');
    assert.ok(fs.existsSync(dashboardPath), 'BillingDashboard.tsx file should exist');

    const trackerContent = fs.readFileSync(trackerPath, 'utf8');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

    assert.ok(trackerContent.includes('export function SubscriptionStateTracker'), 'SubscriptionStateTracker should export component function');
    assert.ok(dashboardContent.includes('export function BillingDashboard'), 'BillingDashboard should export component function');
  });

});
