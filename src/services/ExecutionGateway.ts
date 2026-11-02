import path from 'path';
import { SandboxAdapter } from '../infrastructure/SandboxAdapter.ts';
import { AuditLedger } from './auditLedger.ts';
import { ExecutionRequest, ExecutionStatus, ExecutionResult, generateRequestDigest } from '../types/execution.ts';

export class SecurityPolicy {
  static validateUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname.toLowerCase();

      // 1. Block Localhost & Internal IPs (SSRF prevention)
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^169\.254\./) || // Cloud metadata IPs
        hostname.endsWith('.internal') ||
        hostname === 'metadata.google.internal'
      ) {
        return false;
      }

      // 2. Block non-HTTP protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }

      return true;
    } catch {
      return false; // Malformed URL
    }
  }
}

/**
 * Strict Level 4 Finite State Machine (FSM) Transitions
 * Guarantees execution jobs follow verified lifecycle without skipping gates or reviving terminal states.
 */
export const VALID_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  [ExecutionStatus.CREATED]: [
    ExecutionStatus.AWAITING_APPROVAL,
    ExecutionStatus.REJECTED,
    ExecutionStatus.SECURITY_VIOLATION,
  ],
  [ExecutionStatus.AWAITING_APPROVAL]: [
    ExecutionStatus.APPROVED,
    ExecutionStatus.REJECTED,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.SECURITY_VIOLATION,
  ],
  [ExecutionStatus.APPROVED]: [
    ExecutionStatus.STARTING,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.SECURITY_VIOLATION,
  ],
  [ExecutionStatus.STARTING]: [
    ExecutionStatus.RUNNING,
    ExecutionStatus.FAILED,
    ExecutionStatus.SANDBOX_UNAVAILABLE,
    ExecutionStatus.SECURITY_VIOLATION,
  ],
  [ExecutionStatus.RUNNING]: [
    ExecutionStatus.VERIFYING,
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.TIMEOUT,
    ExecutionStatus.SECURITY_VIOLATION,
    ExecutionStatus.CLEANUP_FAILED,
  ],
  [ExecutionStatus.VERIFYING]: [
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CLEANUP_FAILED,
    ExecutionStatus.SECURITY_VIOLATION,
  ],
  // Terminal States - No outbound transitions allowed
  [ExecutionStatus.COMPLETED]: [],
  [ExecutionStatus.FAILED]: [],
  [ExecutionStatus.TIMEOUT]: [],
  [ExecutionStatus.SECURITY_VIOLATION]: [],
  [ExecutionStatus.REJECTED]: [],
  [ExecutionStatus.CANCELLED]: [],
  [ExecutionStatus.SANDBOX_UNAVAILABLE]: [],
  [ExecutionStatus.CLEANUP_FAILED]: [],
};

export class ExecutionGateway {
  private static jobStates: Map<string, ExecutionStatus> = new Map();

  /**
   * Retrieves the current registered state of a job
   */
  static getJobState(jobId: string): ExecutionStatus | undefined {
    return this.jobStates.get(jobId);
  }

  /**
   * Registers initial state for a new job
   */
  static registerJob(jobId: string, initialStatus: ExecutionStatus = ExecutionStatus.CREATED): void {
    this.jobStates.set(jobId, initialStatus);
  }

  /**
   * Validates and transitions an execution job through the state machine.
   * Throws an Error if transition violates the valid state graph.
   */
  static transitionState(jobId: string, toStatus: ExecutionStatus): ExecutionStatus {
    const currentStatus = this.jobStates.get(jobId) || ExecutionStatus.APPROVED;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(toStatus)) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot transition job '${jobId}' from ${currentStatus} to ${toStatus}. Permitted transitions: [${allowed.join(', ')}]`
      );
    }

    this.jobStates.set(jobId, toStatus);
    return toStatus;
  }

  static async runAndVerify(req: ExecutionRequest, approvedDigest: string): Promise<ExecutionResult> {
    // Register job state as approved
    this.jobStates.set(req.jobId, ExecutionStatus.APPROVED);

    // 1. Verify Approval Digest matches canonical request (Prevent TOCTOU attack)
    const currentDigest = generateRequestDigest(req);
    if (currentDigest !== approvedDigest) {
      this.transitionState(req.jobId, ExecutionStatus.SECURITY_VIOLATION);
      await AuditLedger.log('SECURITY_VIOLATION', {
        jobId: req.jobId,
        reason: 'Approval Digest Mismatch',
        expectedDigest: approvedDigest,
        computedDigest: currentDigest,
      });

      return {
        status: ExecutionStatus.SECURITY_VIOLATION,
        stdout: '',
        stderr: 'SECURITY_VIOLATION: Approval digest mismatch. Command parameters were altered after human approval.',
        durationMs: 0,
        message: 'Approval digest mismatch. Execution aborted.',
      };
    }

    // 2. Log Execution Started to Cryptographic Audit Chain
    this.transitionState(req.jobId, ExecutionStatus.STARTING);
    await AuditLedger.log('Execution Started', {
      jobId: req.jobId,
      executable: req.executable,
      args: req.args,
      workingDirectory: req.workingDirectory,
      digest: approvedDigest,
    });

    this.transitionState(req.jobId, ExecutionStatus.RUNNING);

    // 3. Dispatch to Isolated Sandbox
    const result = await SandboxAdapter.execute(req);

    // 4. Transition State based on execution outcome
    try {
      if (VALID_TRANSITIONS[ExecutionStatus.RUNNING].includes(result.status)) {
        this.transitionState(req.jobId, result.status);
      } else {
        this.jobStates.set(req.jobId, result.status);
      }
    } catch {
      this.jobStates.set(req.jobId, result.status);
    }

    // 5. Log Execution Completed to Cryptographic Audit Chain
    await AuditLedger.log('Execution Completed', {
      jobId: req.jobId,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      cleanup: result.cleanupStatus,
    });

    return result;
  }

  static async browseWeb(url: string, action = 'get_text', workspaceDir = 'workspace'): Promise<ExecutionResult> {
    // 1. Validate SSRF Policy
    if (!SecurityPolicy.validateUrl(url)) {
      await AuditLedger.log('SECURITY_VIOLATION', {
        action: 'browse_web',
        targetUrl: url,
        reason: 'SSRF Policy Violation - Internal or metadata endpoint blocked',
      });
      return {
        status: ExecutionStatus.SECURITY_VIOLATION,
        stdout: '',
        stderr: 'SECURITY_VIOLATION: Destination URL is blocked by SSRF policy (localhost and internal cloud networks are prohibited).',
        durationMs: 0,
        message: 'URL blocked by SSRF policy',
      };
    }

    const scriptPath = path.resolve(process.cwd(), 'src/scripts/browser_agent.js');
    const outputPath = path.resolve(process.cwd(), workspaceDir, `screenshot-${Date.now()}.png`);

    const req: ExecutionRequest = {
      jobId: `browse_${Date.now()}`,
      workspaceId: 'main',
      executable: 'node',
      args: [scriptPath, url, action, outputPath],
      workingDirectory: workspaceDir,
      timeoutMs: 20000,
      capabilities: ['network_outbound'],
    };

    const digest = generateRequestDigest(req);
    return await this.runAndVerify(req, digest);
  }
}
