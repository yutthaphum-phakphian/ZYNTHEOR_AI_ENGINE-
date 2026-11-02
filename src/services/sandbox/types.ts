/**
 * ZYNTHEOR LEVEL 4 — ISOLATED EXECUTION INFRASTRUCTURE
 * Types and interfaces for secure isolated sandbox execution.
 */

export type SandboxStatus =
  | 'PASS'
  | 'FAIL'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'SANDBOX_UNAVAILABLE'
  | 'SECURITY_VIOLATION';

export type SandboxRuntimeType = 'docker' | 'microvm' | 'container_jail' | 'none';

export type SandboxApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface SandboxResourceLimits {
  cpuLimit: number; // e.g. 1.0 (vCPU core equivalent)
  memoryLimitMb: number; // e.g. 512 MB
  timeoutMs: number; // e.g. 30,000 ms
  maxProcesses: number; // e.g. 32 pids
  maxDiskMb: number; // e.g. 256 MB
}

export interface SandboxNetworkPolicy {
  allowOutbound: boolean;
  blockedHosts: string[];
  allowedHosts?: string[];
}

export interface SandboxJobSpec {
  jobId: string;
  sessionId: string;
  workspaceId: string;
  command: string;
  args: string[];
  targetFile?: string;
  sourceCode?: string;
  readOnlyMounts?: string[];
  resourceLimits: SandboxResourceLimits;
  networkPolicy: SandboxNetworkPolicy;
  commandHash: string; // SHA-256 of canonical execution payload
  approvalStatus: SandboxApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalToken?: string;
  createdAt: string;
}

export interface SandboxExecutionResult {
  jobId: string;
  status: SandboxStatus;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  resourceUsage: {
    peakMemoryMb: number;
    cpuDurationMs: number;
  };
  workspaceChanges: string[];
  cleanupStatus: 'CLEANED' | 'FAILED' | 'RETAINED_FOR_AUDIT';
  securityViolations?: string[];
  auditHash?: string;
  executedAt: string;
}

export interface SandboxRuntimeInfo {
  activeRuntime: SandboxRuntimeType;
  availableAdapters: {
    docker: { available: boolean; reason?: string };
    microvm: { available: boolean; reason?: string };
    containerJail: { available: boolean; reason?: string };
  };
  defaultLimits: SandboxResourceLimits;
  defaultNetworkPolicy: SandboxNetworkPolicy;
}
