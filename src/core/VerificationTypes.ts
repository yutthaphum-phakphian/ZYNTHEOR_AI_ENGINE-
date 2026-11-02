export enum VerificationStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED',
  UNVERIFIED = 'UNVERIFIED',
}

export enum VerificationLevel {
  L1_STRUCTURE = 'L1_STRUCTURE',
  L2_STATIC = 'L2_STATIC',
  L3_TYPE_CHECK = 'L3_TYPES',
  L4_UNIT_TEST = 'L4_UNIT_TEST',
  L5_SECURITY = 'L5_SECURITY',
}

export interface VerificationEvidence {
  level: VerificationLevel;
  status: VerificationStatus;
  commandExecuted: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  failureReason?: string;
  timestamp: string;
}

export interface VerificationReport {
  taskId: string;
  overallStatus: VerificationStatus;
  evidences: VerificationEvidence[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
  };
}
