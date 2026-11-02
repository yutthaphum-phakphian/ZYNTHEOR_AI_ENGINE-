import { SandboxAdapter } from '../infrastructure/SandboxAdapter.ts';
import { AuditLedger } from './auditLedger.ts';
import { ExecutionRequest, ExecutionStatus, ExecutionResult, generateRequestDigest } from '../types/execution.ts';

export class ExecutionGateway {
  static async runAndVerify(req: ExecutionRequest, approvedDigest: string): Promise<ExecutionResult> {
    // 1. Verify Approval Digest matches canonical request (Prevent TOCTOU attack)
    const currentDigest = generateRequestDigest(req);
    if (currentDigest !== approvedDigest) {
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
    await AuditLedger.log('Execution Started', {
      jobId: req.jobId,
      executable: req.executable,
      args: req.args,
      workingDirectory: req.workingDirectory,
      digest: approvedDigest,
    });

    // 3. Dispatch to Isolated Sandbox
    const result = await SandboxAdapter.execute(req);

    // 4. Log Execution Completed to Cryptographic Audit Chain
    await AuditLedger.log('Execution Completed', {
      jobId: req.jobId,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      cleanup: result.cleanupStatus,
    });

    return result;
  }
}
