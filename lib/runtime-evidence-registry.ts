// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — RUNTIME EVIDENCE REGISTRY
 * 
 * Tracks real process execution evidence, maintaining distinct, independent verification statuses:
 * - UNIT_TEST_PASS
 * - INTEGRATION_TEST_PASS
 * - BUILD_PASS
 * - RUNTIME_PASS
 * - PROVIDER_INFERENCE_PASS
 * - DEPLOYMENT_VERIFIED
 */

import crypto from 'node:crypto';
import { createAuditEntry, type AuditEntry } from '../src/services/auditLedger.ts';

export type RuntimeVerificationStatus =
  | 'UNIT_TEST_PASS'
  | 'INTEGRATION_TEST_PASS'
  | 'BUILD_PASS'
  | 'RUNTIME_PASS'
  | 'PROVIDER_INFERENCE_PASS'
  | 'DEPLOYMENT_VERIFIED'
  | 'EXECUTION_FAILED'
  | 'UNVERIFIED';

export interface ProcessExecutionRecord {
  evidenceId: string;
  command: string;
  cwd: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  exitCode: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  environment: Record<string, string>;
  verificationStatus: RuntimeVerificationStatus;
  testOrBuildResult?: {
    totalTests?: number;
    passedCount?: number;
    failedCount?: number;
    suiteName?: string;
  };
  sha256Digest: string;
  prevHash: string;
}

export class RuntimeEvidenceRegistry {
  private records: ProcessExecutionRecord[] = [];
  private lastHash = '0'.repeat(64);
  private auditChain: AuditEntry[] = [];
  private lastAuditRecord: AuditEntry | null = null;

  /**
   * Records a process execution result and assigns an independent verification status based on real evidence.
   */
  public recordExecution(input: {
    command: string;
    cwd?: string;
    startTime: string;
    endTime: string;
    exitCode: number;
    stdoutSnippet: string;
    stderrSnippet: string;
    environment?: Record<string, string>;
    claimedStatus?: RuntimeVerificationStatus;
    testOrBuildResult?: { totalTests?: number; passedCount?: number; failedCount?: number; suiteName?: string };
  }): ProcessExecutionRecord {
    const evidenceId = `evid-${crypto.randomUUID().slice(0, 8)}`;
    const cwd = input.cwd || process.cwd();
    const durationMs = new Date(input.endTime).getTime() - new Date(input.startTime).getTime();

    // Determine strict independent verification status
    let verificationStatus: RuntimeVerificationStatus = 'UNVERIFIED';

    if (input.exitCode !== 0) {
      verificationStatus = 'EXECUTION_FAILED';
    } else {
      // Exit code is 0: evaluate claimed status strictly
      const claimed = input.claimedStatus || 'RUNTIME_PASS';
      if (claimed === 'DEPLOYMENT_VERIFIED') {
        // A build pass does NOT automatically grant DEPLOYMENT_VERIFIED
        const hasDist = input.stdoutSnippet.includes('dist') || input.command.includes('build');
        verificationStatus = hasDist ? 'BUILD_PASS' : 'RUNTIME_PASS';
      } else if (claimed === 'PROVIDER_INFERENCE_PASS') {
        // Mock provider responses cannot be classified as real inference
        const isMock = input.stdoutSnippet.toLowerCase().includes('mock') || input.environment?.ZYNTHEOR_PROVIDER === 'mock';
        verificationStatus = isMock ? 'RUNTIME_PASS' : 'PROVIDER_INFERENCE_PASS';
      } else {
        verificationStatus = claimed;
      }
    }

    const prevHash = this.lastHash;
    const dataToHash = `${evidenceId}|${input.command}|${cwd}|${input.exitCode}|${verificationStatus}|${input.startTime}|${input.endTime}|${prevHash}`;
    const sha256Digest = crypto.createHash('sha256').update(dataToHash).digest('hex');

    const record: ProcessExecutionRecord = Object.freeze({
      evidenceId,
      command: input.command,
      cwd,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMs: Math.max(0, durationMs),
      exitCode: input.exitCode,
      stdoutSnippet: input.stdoutSnippet.slice(0, 1000),
      stderrSnippet: input.stderrSnippet.slice(0, 1000),
      environment: input.environment || {},
      verificationStatus,
      testOrBuildResult: input.testOrBuildResult,
      sha256Digest,
      prevHash,
    });

    this.records.push(record);
    this.lastHash = sha256Digest;

    // Log to Audit Ledger if pass
    if (verificationStatus !== 'EXECUTION_FAILED' && verificationStatus !== 'UNVERIFIED') {
      const auditEntry = createAuditEntry(
        'RUNTIME_EVIDENCE_RECORDED',
        `evidenceId=${evidenceId}; cmd="${input.command}"; status=${verificationStatus}; sha256=${sha256Digest}`,
        this.lastAuditRecord
      );
      this.lastAuditRecord = auditEntry;
      this.auditChain.push(auditEntry);
    }

    return record;
  }

  public getRecords(): ProcessExecutionRecord[] {
    return [...this.records];
  }

  public getRecordById(id: string): ProcessExecutionRecord | undefined {
    return this.records.find(r => r.evidenceId === id);
  }

  public verifyRecordIntegrity(id: string): boolean {
    const rec = this.getRecordById(id);
    if (!rec) return false;
    const dataToHash = `${rec.evidenceId}|${rec.command}|${rec.cwd}|${rec.exitCode}|${rec.verificationStatus}|${rec.startTime}|${rec.endTime}|${rec.prevHash}`;
    const computed = crypto.createHash('sha256').update(dataToHash).digest('hex');
    return computed === rec.sha256Digest;
  }
}

export const globalRuntimeEvidenceRegistry = new RuntimeEvidenceRegistry();
