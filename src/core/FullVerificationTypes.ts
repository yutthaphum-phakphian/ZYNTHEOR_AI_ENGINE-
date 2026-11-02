export enum VStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED',
  UNVERIFIED = 'UNVERIFIED',
}

export enum VLevel {
  L1_STRUCTURE = 'L1_STRUCTURE',
  L2_STATIC = 'L2_STATIC',
  L3_TYPE = 'L3_TYPE_CHECK',
  L4_UNIT = 'L4_UNIT_TEST',
  L5_INTEGRATION = 'L5_INTEGRATION',
  L6_SECURITY = 'L6_SECURITY',
  L7_REGRESSION = 'L7_REGRESSION',
  L8_RUNTIME = 'L8_RUNTIME',
}

export interface Evidence {
  level: VLevel;
  status: VStatus;
  whatChecked: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  failureReason?: string;
  unverifiedConditions?: string[];
  timestamp: string;
}

export interface FullVerificationReport {
  taskId: string;
  overall: VStatus;
  evidences: Evidence[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
    unverified: number;
  };
  timestamp: string;
}
