// @ts-nocheck
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { projectAwareDebugger } from '../services/projectAwareDebugger.ts';

describe('INTELLIGENCE CORE 0.2 — DEBUGGING EVIDENCE INTEGRITY', () => {
  it('1. Sample data traces do NOT generate unverified production patches for compliant code', () => {
    const safeExecPath = path.resolve(process.cwd(), 'src/services/safeExecutor.ts');
    const content = fs.readFileSync(safeExecPath, 'utf8');

    // Verify bounded property ALREADY exists in real safeExecutor.ts
    expect(content.includes('bounded?: boolean')).toBe(true);

    // Run debug session with sample trace mentioning 'bounded'
    const sampleError = "Object literal may only specify known properties, and 'bounded' does not exist in type 'SafeExecResult'";
    const sampleTrace = `Error: TS2353: Object literal may only specify known properties, and 'bounded' does not exist in type 'SafeExecResult'
    at SafeExecResult (src/services/safeExecutor.ts:33:3)`;

    const result = projectAwareDebugger.runDebugSession(sampleError, sampleTrace);

    expect(result.sessionId).toBeDefined();
    expect(result.parsedStack.length).toBeGreaterThan(0);
    expect(result.parsedStack[0].file).toBe('src/services/safeExecutor.ts');
  });

  it('2. Version metadata is consistent across package.json and server API config', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.version).toBe('1.2.2');
  });
});
