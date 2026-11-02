import crypto from 'crypto';

export interface ExecutionRequest {
  jobId: string;
  workspaceId: string;
  executable: string;
  args: string[];
  workingDirectory: string;
  timeoutMs: number;
  capabilities: string[];
}

export enum ExecutionStatus {
  CREATED = 'CREATED',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
  FAILED = 'FAILED',
  SANDBOX_UNAVAILABLE = 'SANDBOX_UNAVAILABLE',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  CLEANUP_FAILED = 'CLEANUP_FAILED'
}

export interface ExecutionResult {
  status: ExecutionStatus;
  exitCode?: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  containerId?: string;
  measuredUsage?: {
    memoryMB: string;
    cpuUsage: string;
  };
  cleanupStatus?: string;
  message?: string;
}

// Canonical serialization for tamper-evident Approval Digest Binding
export function generateRequestDigest(req: ExecutionRequest): string {
  const canonical = JSON.stringify({
    executable: req.executable,
    args: req.args,
    workingDirectory: req.workingDirectory,
    capabilities: req.capabilities,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
