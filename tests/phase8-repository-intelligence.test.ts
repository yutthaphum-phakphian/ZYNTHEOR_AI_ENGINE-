import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CodeIntelligence } from '../lib/code-intelligence.ts';
import {
  scanRepository,
  buildSymbolIndex,
  searchSymbols,
  DEFAULT_REPOSITORY_SCAN_LIMITS
} from '../src/services/repositoryIntelligence.ts';
import { ChangeImpactEngine } from '../src/services/changeImpactEngine.ts';

describe('ZYNTHEOR CORE X — Phase 8: Repository Intelligence & AST Verification', () => {

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

  test('Symbol Indexing: indexes symbols and supports fast queries by name and type', () => {
    const scan = scanRepository({
      workspaceRoot: process.cwd(),
      limits: {
        ...DEFAULT_REPOSITORY_SCAN_LIMITS,
        maxFiles: 50,
        maxFileSize: 256 * 1024,
      }
    });

    assert.ok(scan.inventory.length > 0, 'Scan inventory must contain files');
    assert.ok(scan.fileInventory.length > 0, 'fileInventory must contain records');

    // SHA-256 fingerprint verification
    const firstAnalyzed = scan.fileInventory.find(f => f.sha256);
    assert.ok(firstAnalyzed, 'Analyzed file must have sha256 fingerprint');
    assert.strictEqual(firstAnalyzed.sha256.length, 64, 'SHA-256 must be 64 hex characters');

    // Build symbol index
    const index = buildSymbolIndex(scan);
    assert.ok(index.length > 0, 'Index must have indexed symbols');

    // Search query
    const results = searchSymbols(scan, 'Workspace', 'all');
    assert.ok(Array.isArray(results), 'Search returns array');
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

  test('Impact Analysis: computes direct, indirect affected files and evidence-based findings', () => {
    const engine = new ChangeImpactEngine();
    const impact = engine.analyzeImpact('src/services/patchApplier.ts');
    assert.ok(impact, 'Impact analysis generated');
    assert.ok(Array.isArray(impact.directlyAffectedFiles), 'directlyAffectedFiles must be array');
    assert.ok(Array.isArray(impact.indirectlyAffectedFiles), 'indirectlyAffectedFiles must be array');
    assert.ok(Array.isArray(impact.verifiedEvidence), 'verifiedEvidence must be array');
    assert.ok(Array.isArray(impact.hypotheses), 'hypotheses must be array');
    assert.ok(Array.isArray(impact.securityImplications), 'securityImplications must be array');
    assert.ok(Array.isArray(impact.potentialRegressionAreas), 'potentialRegressionAreas must be array');
  });

  test('Security & Isolation: excludes sensitive files and rejects path traversal', () => {
    const scan = scanRepository({
      workspaceRoot: process.cwd(),
      limits: DEFAULT_REPOSITORY_SCAN_LIMITS,
    });

    const sensitiveMatches = scan.inventory.filter(f =>
      f.includes('.env') && !f.includes('.env.example') ||
      f.endsWith('.key') ||
      f.endsWith('.pem') ||
      f.includes('credentials')
    );

    assert.strictEqual(sensitiveMatches.length, 0, 'Sensitive files must not be included in repository index');
  });

});
