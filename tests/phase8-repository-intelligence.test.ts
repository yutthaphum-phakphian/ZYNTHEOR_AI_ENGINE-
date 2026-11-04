import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CodeIntelligence } from '../lib/code-intelligence.ts';
import {
  scanRepository,
  buildSymbolIndex,
  searchSymbols,
  detectEntryPoints,
  DEFAULT_REPOSITORY_SCAN_LIMITS
} from '../src/services/repositoryIntelligence.ts';
import { ChangeImpactEngine } from '../src/services/changeImpactEngine.ts';
import {
  proposePatch,
  approvePatch,
  applyPatch,
  _clearTestState,
  PatchSecurityError,
  ERROR_CODES
} from '../src/services/patchApplier.ts';

describe('ZYNTHEOR CORE X — Phase 8: Repository Intelligence & Impact Analysis Suite', () => {

  test('AST Extraction: parses functions, interfaces, types, react components and api routes', () => {
    const code = `
      import React from 'react';
      import express from 'express';

      export interface UserProfile {
        id: string;
        username: string;
      }

      export type SessionStatus = 'active' | 'expired';

      export class TokenValidator {
        validate(token: string): boolean {
          return token.length > 0;
        }
      }

      export function parseQuery(query: string): string[] {
        return query.split(' ');
      }

      export const DashboardWidget = ({ title }: { title: string }) => {
        return React.createElement('div', null, title);
      };

      const app = express();
      app.get('/api/users/profile', (req, res) => {
        res.json({ ok: true });
      });
    `;

    const analysis = CodeIntelligence.analyzeSourceFile('test-module.tsx', code);

    assert.ok(analysis, 'Analysis should succeed');
    assert.strictEqual(analysis.language, 'typescript');
    assert.ok(analysis.symbols.length >= 6, 'Should extract all declared symbols');

    // Check specific symbol types
    const types = analysis.symbols.map(s => s.type);
    assert.ok(types.includes('interface'), 'Should extract interface');
    assert.ok(types.includes('type'), 'Should extract type alias');
    assert.ok(types.includes('class'), 'Should extract class');
    assert.ok(types.includes('function'), 'Should extract function');
    assert.ok(types.includes('react-component'), 'Should identify React component');
    assert.ok(types.includes('api-route'), 'Should identify express route');

    // Check exact source range
    const userProfile = analysis.symbols.find(s => s.name === 'UserProfile');
    assert.ok(userProfile, 'UserProfile interface found');
    assert.ok(userProfile.line > 0, 'Start line must be > 0');
    assert.ok(userProfile.endLine !== undefined && userProfile.endLine >= userProfile.line, 'End line must be >= start line');
    assert.ok(userProfile.character !== undefined, 'Character position must be present');

    const route = analysis.symbols.find(s => s.name === 'GET /api/users/profile');
    assert.ok(route, 'API Route symbol found');
    assert.strictEqual(route.type, 'api-route');
  });

  test('Call Graph Extraction: resolves caller, callee, and categorizes LOCAL, IMPORTED, and DYNAMIC', () => {
    const ci = new CodeIntelligence();
    const code = `
      import { sha256Hex } from './patchApplier';

      function helper(val: string): string {
        return val.trim();
      }

      export function processPayload(data: string): string {
        const cleaned = helper(data);
        const hash = sha256Hex(cleaned);
        const dynamicCaller = eval('dynamic()');
        return hash;
      }
    `;

    const calls = ci.extractCallGraph(code, 'sample.ts');
    assert.ok(Array.isArray(calls), 'Calls must be an array');
    assert.ok(calls.length >= 3, 'Must capture all 3 call expressions');

    const helperCall = calls.find(c => c.callee === 'helper');
    assert.ok(helperCall, 'Must find helper() call');
    assert.strictEqual(helperCall.caller, 'processPayload');
    assert.strictEqual(helperCall.resolvedKind, 'LOCAL');

    const hashCall = calls.find(c => c.callee === 'sha256Hex');
    assert.ok(hashCall, 'Must find sha256Hex() call');
    assert.strictEqual(hashCall.resolvedKind, 'IMPORTED');

    const evalCall = calls.find(c => c.callee === 'eval');
    assert.ok(evalCall, 'Must capture dynamic invocation call');
  });

  test('Symbol Indexing: indexes symbols and supports fast queries by name and type', () => {
    const scan = scanRepository({
      workspaceRoot: process.cwd(),
      limits: {
        ...DEFAULT_REPOSITORY_SCAN_LIMITS,
        maxFiles: 50,
      }
    });

    assert.ok(scan.inventory.length > 0, 'Scan inventory must contain files');
    assert.ok(scan.fileInventory.length > 0, 'fileInventory must contain records');

    // SHA-256 fingerprint verification
    const firstAnalyzed = scan.fileInventory.find(f => f.sha256);
    assert.ok(firstAnalyzed, 'Analyzed file must have sha256 fingerprint');
    assert.strictEqual(firstAnalyzed.sha256!.length, 64, 'SHA-256 must be 64 hex characters');

    // Build symbol index
    const index = buildSymbolIndex(scan);
    assert.ok(index.length > 0, 'Index must have indexed symbols');

    // Search query
    const results = searchSymbols(scan, 'Workspace', 'all');
    assert.ok(Array.isArray(results), 'Search returns array');
  });

  test('Entry Point Detection: identifies server, client, and operational scripts in repository', () => {
    const scan = scanRepository({
      workspaceRoot: process.cwd(),
      limits: DEFAULT_REPOSITORY_SCAN_LIMITS,
    });

    const entryPoints = detectEntryPoints(scan.files, scan.dependencyGraph);
    assert.ok(Array.isArray(entryPoints), 'Entry points must be array');
    assert.ok(entryPoints.length > 0, 'Must detect at least 1 entry point');

    const serverEntry = entryPoints.find(e => e.type === 'SERVER_ENTRY');
    assert.ok(serverEntry, 'Must identify server.ts as SERVER_ENTRY');
    assert.strictEqual(serverEntry.path, 'server.ts');
  });

  test('Dependency Graph: discovers direct, reverse dependencies and detects circular paths', () => {
    const scan = scanRepository({
      workspaceRoot: process.cwd(),
      limits: {
        ...DEFAULT_REPOSITORY_SCAN_LIMITS,
        maxFiles: 60,
      }
    });

    const graph = scan.dependencyGraph;
    assert.ok(graph.nodes.length > 0, 'Graph nodes must be present');
    assert.ok(graph.reverseDependencies, 'Reverse dependencies map must be present');
    assert.ok(graph.changePropagationMap, 'Change propagation map must be present');

    // Circular dependency detection
    assert.ok(Array.isArray(graph.circularDependencies), 'Circular dependencies is array');
  });

  test('Impact Analysis with 4-Tier Categorization: verified facts, analysis, hypotheses, and unknowns', () => {
    const engine = new ChangeImpactEngine();
    const impact = engine.analyzeImpact('src/services/patchApplier.ts', {
      diff: `
@@ -211,2 +211,4 @@
 export function approvePatch(...args: any[]): any {
+  // Added security assertion
+  console.log('approving patch');
      `,
      lang: 'th',
    });

    assert.ok(impact, 'Impact analysis generated');
    assert.ok(Array.isArray(impact.directlyAffectedFiles), 'directlyAffectedFiles must be array');
    assert.ok(Array.isArray(impact.indirectlyAffectedFiles), 'indirectlyAffectedFiles must be array');
    assert.ok(Array.isArray(impact.affectedFunctionsAndClasses), 'affectedFunctionsAndClasses must be array');
    assert.ok(Array.isArray(impact.recommendedRegressionTests), 'recommendedRegressionTests must be array');

    // Check 4-Tier Partition
    assert.ok(Array.isArray(impact.verifiedFacts), 'verifiedFacts must be array');
    assert.ok(impact.verifiedFacts.length > 0, 'verifiedFacts must contain items');
    assert.ok(Array.isArray(impact.analysis), 'analysis must be array');
    assert.ok(impact.analysis.length > 0, 'analysis must contain items');
    assert.ok(Array.isArray(impact.hypotheses), 'hypotheses must be array');
    assert.ok(impact.hypotheses.length > 0, 'hypotheses must contain items');
    assert.ok(Array.isArray(impact.unknowns), 'unknowns must be array');
    assert.ok(impact.unknowns.length > 0, 'unknowns must contain items');

    // Verify recommendations
    const hasHighPriorityTest = impact.recommendedRegressionTests.some(r => r.priority === 'HIGH');
    assert.ok(hasHighPriorityTest, 'Must recommend at least 1 high priority regression test');
  });

  test('Engineering Change Gate: enforces Human Approval before patch application', async () => {
    _clearTestState();

    // 1. Propose change 1
    const proposal1 = proposePatch({
      targetFile: 'test-sandbox-file1.txt',
      newContent: 'Unapproved execution attempt',
      workspaceId: 'ws-test',
    });

    assert.ok(proposal1.patchId, 'Proposal has patchId');
    assert.strictEqual(proposal1.status, 'proposed');

    // 2. Attempt execute WITHOUT human approval -> MUST FAIL CLOSED and reject
    await assert.rejects(
      async () => {
        await applyPatch(proposal1.patchId);
      },
      (err: any) => {
        return err instanceof PatchSecurityError && err.code === ERROR_CODES.APPROVAL_MISMATCH;
      },
      'Unapproved patch execution must be denied by security boundary'
    );

    // 3. Propose change 2 and verify full human approval workflow
    const proposal2 = proposePatch({
      targetFile: 'test-sandbox-file2.txt',
      newContent: 'Hello from governed change gate',
      workspaceId: 'ws-test',
    });
    const approval = approvePatch(proposal2.patchId, 'human-approver-lead');
    assert.ok(approval.approvalHash, 'Approval hash recorded');
    assert.strictEqual(approval.status, 'approved');

    // 4. Execute approved patch -> Succeeds atomically
    const applied = await applyPatch(proposal2.patchId, 'human-approver-lead');
    assert.ok(applied, 'Patch applied successfully');
    assert.strictEqual(applied.status, 'applied');
  });

  test('Security & Isolation: excludes sensitive files and rejects path traversal', () => {
    const scan = scanRepository({
      workspaceRoot: process.cwd(),
      limits: DEFAULT_REPOSITORY_SCAN_LIMITS,
    });

    const sensitiveMatches = scan.inventory.filter(f =>
      (f.includes('.env') && !f.includes('.env.example')) ||
      f.endsWith('.key') ||
      f.endsWith('.pem') ||
      f.includes('credentials')
    );

    assert.strictEqual(sensitiveMatches.length, 0, 'Sensitive files must not be included in repository index');
  });

  test('Thai-First Intelligence & Bilingual Integrity: preserves technical identifiers and validates Thai text', () => {
    const engine = new ChangeImpactEngine();
    const thaiImpact = engine.analyzeImpact('src/routes/auth.ts', { lang: 'th' });

    // Technical identifiers preserved
    assert.strictEqual(thaiImpact.targetFile, 'src/routes/auth.ts');
    assert.ok(
      thaiImpact.verifiedFacts.some(f => f.includes('src/routes/auth.ts')),
      'Technical file path preserved in Thai fact string'
    );

    // Thai characters present in explanations
    const containsThai = (text: string) => /[\u0E00-\u0E7F]/.test(text);
    assert.ok(
      thaiImpact.verifiedFacts.some(containsThai),
      'Verified facts must contain Thai language description'
    );
    assert.ok(
      thaiImpact.analysis.some(containsThai),
      'Analysis must contain Thai language description'
    );
    assert.ok(
      thaiImpact.hypotheses.some(containsThai),
      'Hypotheses must contain Thai language description'
    );
    assert.ok(
      thaiImpact.unknowns.some(containsThai),
      'Unknowns must contain Thai language description'
    );
  });

});
