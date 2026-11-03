/**
 * Evidence gate — pure, dependency-free so it can be tested by behavior.
 * A plan is verified only when EVERY step is COMPLETED and carries VERIFIED_FACT evidence.
 */
export type GateEvidenceCategory =
  | 'VERIFIED_FACT'
  | 'MODEL_INTERPRETATION'
  | 'HYPOTHESIS'
  | 'UNVERIFIED_RESULT'
  | 'FAILED_VERIFICATION';

export interface GateStep {
  executionStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  verificationCategory?: GateEvidenceCategory;
  evidence?: { category: GateEvidenceCategory };
}

export function evaluateEvidenceGate<T extends GateStep>(steps: T[]): {
  allVerified: boolean;
  failedSteps: T[];
  evidenceSummary: Record<GateEvidenceCategory, number>;
} {
  const summary: Record<GateEvidenceCategory, number> = {
    VERIFIED_FACT: 0,
    MODEL_INTERPRETATION: 0,
    HYPOTHESIS: 0,
    UNVERIFIED_RESULT: 0,
    FAILED_VERIFICATION: 0,
  };
  const failedSteps: T[] = [];
  let verifiedAndCompleted = 0;

  for (const step of steps) {
    const cat = step.evidence?.category || step.verificationCategory || 'UNVERIFIED_RESULT';
    summary[cat] = (summary[cat] || 0) + 1;
    if (step.executionStatus === 'FAILED' || cat === 'FAILED_VERIFICATION') {
      failedSteps.push(step);
    } else if (cat === 'VERIFIED_FACT' && step.executionStatus === 'COMPLETED') {
      verifiedAndCompleted++;
    }
  }

  const allVerified = steps.length > 0 && failedSteps.length === 0 && verifiedAndCompleted === steps.length;
  return { allVerified, failedSteps, evidenceSummary: summary };
}
