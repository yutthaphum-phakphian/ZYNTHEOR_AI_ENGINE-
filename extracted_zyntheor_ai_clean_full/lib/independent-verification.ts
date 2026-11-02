export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: string;
  filesCreated?: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface EvidenceCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface VerificationResult {
  passed: boolean;
  checks: EvidenceCheck[];
  confidence: number;
}

export type VerificationRule = (result: TaskResult) => EvidenceCheck;

export const Rules = {
  noError: (): VerificationRule => (r) => ({
    name: 'no_error',
    passed: !r.error,
    reason: r.error ? `has error: ${r.error}` : undefined
  }),
  
  outputContains: (keyword: string): VerificationRule => (r) => ({
    name: `output_contains_${keyword}`,
    passed: !!r.output?.includes(keyword),
    reason: !r.output?.includes(keyword) ? `output missing "${keyword}"` : undefined
  }),
  
  fileCreated: (filename: string): VerificationRule => (r) => ({
    name: `file_created_${filename}`,
    passed: !!r.filesCreated?.includes(filename),
    reason: !r.filesCreated?.includes(filename) ? `file ${filename} not created` : undefined
  }),
  
  successFlag: (): VerificationRule => (r) => ({
    name: 'success_flag_true',
    passed: r.success === true,
    reason: !r.success ? 'success flag false' : undefined
  }),
  
  noSecurityViolation: (): VerificationRule => (r) => {
    const forbidden = ['rm -rf /', 'DROP TABLE', 'eval('];
    const hasViolation = forbidden.some(p => r.output?.includes(p));
    return {
      name: 'no_security_violation',
      passed: !hasViolation,
      reason: hasViolation ? 'security violation detected' : undefined
    };
  },
  
  minOutputLength: (min: number): VerificationRule => (r) => ({
    name: `min_output_length_${min}`,
    passed: (r.output?.length || 0) >= min,
    reason: (r.output?.length || 0) < min ? `output too short ${r.output?.length} < ${min}` : undefined
  })
};

export class IndependentVerifier {
  verify(result: TaskResult, rules: VerificationRule[]): VerificationResult {
    const checks = rules.map(rule => rule(result));
    const passedCount = checks.filter(c => c.passed).length;
    const passed = checks.every(c => c.passed);
    const confidence = checks.length === 0 ? 0 : passedCount / checks.length;
    return { passed, checks, confidence };
  }
  
  verifyWithEvidenceGate(result: TaskResult, rules: VerificationRule[]): VerificationResult {
    // Independent verification must have at least 2 checks
    const baseChecks = this.verify(result, rules);
    const gateChecks: EvidenceCheck[] = [
      ...baseChecks.checks,
      {
        name: 'minimum_checks',
        passed: rules.length >= 2,
        reason: rules.length < 2 ? 'need at least 2 verification rules' : undefined
      },
      {
        name: 'has_evidence',
        passed: !!(result.output || result.filesCreated?.length),
        reason: !result.output && !result.filesCreated?.length ? 'no evidence provided' : undefined
      }
    ];
    const passed = gateChecks.every(c => c.passed);
    const confidence = gateChecks.filter(c=>c.passed).length / gateChecks.length;
    return { passed, checks: gateChecks, confidence };
  }
}

export function verifyResult(result: TaskResult, rules: VerificationRule[]): VerificationResult {
  const verifier = new IndependentVerifier();
  return verifier.verifyWithEvidenceGate(result, rules);
}
