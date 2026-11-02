export interface BaselineEvaluationReport {
  timestamp: string;
  evaluator: string;
  modelTarget: string;
  evaluationType: string;
  categories: {
    code_syntax: { total: number; passed: number; score: number };
    unit_tests: { total: number; passed: number; score: number };
    bilingual_instruction: { total: number; passed: number; score: number };
    tool_safety_planning: { total: number; passed: number; score: number };
    hallucination_detection: { total: number; passed: number; score: number };
  };
  performance: {
    totalDurationMs: number;
    memoryDeltaMb: number;
    throughputOpsPerSec: number;
  };
  metricsSummary: {
    overallScore: number;
    hallucinationRate: number;
    syntaxPassRate: number;
    unitTestPassRate: number;
    bilingualComplianceRate: number;
    toolSafetyComplianceRate: number;
  };
  details: Array<{
    testId: string;
    category: string;
    passed: boolean;
    actualValid?: boolean;
    expectedValid?: boolean;
    claim?: string;
    verifiedTruth?: boolean;
    auditedAccurate?: boolean;
  }>;
}

export function runBaselineEvaluation(options?: Record<string, unknown>): Promise<BaselineEvaluationReport>;
