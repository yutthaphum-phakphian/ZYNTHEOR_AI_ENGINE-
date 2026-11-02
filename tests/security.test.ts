import { describe, it, expect, beforeAll } from 'vitest';
import { SandboxAdapter } from '../src/infrastructure/SandboxAdapter.ts';
import { ExecutionGateway } from '../src/services/ExecutionGateway.ts';
import { ExecutionStatus, generateRequestDigest, type ExecutionRequest } from '../src/types/execution.ts';
import { AuditLedger } from '../src/services/auditLedger.ts';
import fs from 'fs';
import path from 'path';

const TEST_WORKSPACE = path.resolve(process.cwd(), 'workspace/test-sec');

describe('P11.1 Security Hardening Tests', () => {
  beforeAll(() => {
    if (!fs.existsSync(TEST_WORKSPACE)) {
      fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
    }
  });

  // 1. Host Canary File Protection & Path Traversal Guard
  it('Cannot read Host Canary file or traverse outside workspace', async () => {
    const canaryPath = path.join(process.cwd(), 'workspace', 'canary-secret.txt');
    fs.writeFileSync(canaryPath, 'TOP_SECRET_HOST_CANARY_DATA', 'utf-8');

    // Attempting traversal with ../ outside allowed boundaries
    const req: ExecutionRequest = {
      jobId: 'test-canary',
      workspaceId: 'test',
      workingDirectory: path.resolve(process.cwd(), '../../'),
      executable: 'cat',
      args: ['canary-secret.txt'],
      timeoutMs: 5000,
      capabilities: [],
    };

    const result = await SandboxAdapter.execute(req);
    // Should fail closed with SECURITY_VIOLATION due to path boundary check
    expect(result.status).toBe(ExecutionStatus.SECURITY_VIOLATION);
    expect(result.stderr).toContain('SECURITY_VIOLATION');
    expect(result.stdout).not.toContain('TOP_SECRET_HOST_CANARY_DATA');

    try {
      fs.unlinkSync(canaryPath);
    } catch {}
  });

  // 2. Command Injection & Executable Allowlist Resistance
  it('Rejects non-allowlisted executable (e.g., rm, sh, bash, perl)', async () => {
    const req: ExecutionRequest = {
      jobId: 'test-inject',
      workspaceId: 'test',
      workingDirectory: TEST_WORKSPACE,
      executable: 'sh',
      args: ['-c', 'rm -rf /'],
      timeoutMs: 5000,
      capabilities: [],
    };

    const result = await SandboxAdapter.execute(req);
    expect(result.status).toBe(ExecutionStatus.SECURITY_VIOLATION);
    expect(result.stderr).toContain('Executable not allowed');
  });

  // 3. Approval Digest Binding & TOCTOU Attack Prevention
  it('Fails closed when approval digest does not match execution request', async () => {
    const originalReq: ExecutionRequest = {
      jobId: 'test-approval-1',
      workspaceId: 'test',
      workingDirectory: TEST_WORKSPACE,
      executable: 'node',
      args: ['-e', 'console.log("Safe approved code")'],
      timeoutMs: 5000,
      capabilities: [],
    };

    const legitimateDigest = generateRequestDigest(originalReq);

    // Attacker tampers with args after approval was granted
    const tamperedReq: ExecutionRequest = {
      ...originalReq,
      args: ['-e', 'console.log("Malicious altered code")'],
    };

    const result = await ExecutionGateway.runAndVerify(tamperedReq, legitimateDigest);
    expect(result.status).toBe(ExecutionStatus.SECURITY_VIOLATION);
    expect(result.stderr).toContain('Approval digest mismatch');
  });

  // 4. Cryptographic Audit Ledger Recording
  it('Records execution start and completion in sequential SHA-256 audit chain', async () => {
    const auditEntry = await AuditLedger.log('SANDBOX_TEST_EVENT', { testId: 'sec-4' });
    expect(auditEntry.hash).toBeDefined();
    expect(auditEntry.hash.length).toBe(64); // SHA-256 hex string

    const chainVerification = AuditLedger.verifyChain();
    expect(chainVerification.isValid).toBe(true);
  });
});
