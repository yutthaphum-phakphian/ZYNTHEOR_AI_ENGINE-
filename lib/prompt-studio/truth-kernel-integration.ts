import { TruthKernel } from '../truth-kernel.ts';
import type { PromptTestCase } from './test-lab.ts';

export function enforceTruthKernelForPrompt(
  prompt: string,
  testResults: PromptTestCase[],
  versionHistory: any[]
) {
  const kernel = new TruthKernel();

  if (!testResults || testResults.length === 0) {
    kernel.registerClaim(
      `Prompt '${prompt.slice(0, 30)}…' evaluated without Test Lab execution`,
      'runtime_behavior',
      {
        evidenceState: 'UNVERIFIED',
        source: 'TruthKernelPromptEnforcer',
      }
    );
    return {
      canClaimVerified: false,
      state: 'UNVERIFIED' as const,
      reason: 'Prompt not tested in Test Lab yet - cannot claim verified execution',
    };
  }

  const passedCount = testResults.filter(r => r.passed === true).length;
  const failedCount = testResults.filter(r => r.passed === false || r.evidenceState === 'CONTRADICTED').length;

  if (failedCount > 0 || passedCount === 0) {
    kernel.registerClaim(
      `Prompt '${prompt.slice(0, 30)}…' has ${failedCount} failing test lab runs`,
      'runtime_behavior',
      {
        evidenceState: 'CONTRADICTED',
        source: 'TruthKernelPromptEnforcer',
      }
    );
    return {
      canClaimVerified: false,
      state: 'CONTRADICTED' as const,
      reason: `Test Lab execution contains ${failedCount} failing tests. Cannot claim verified execution.`,
    };
  }

  const verifiedRecord = kernel.registerClaim(
    `Prompt '${prompt.slice(0, 30)}…' verified with ${passedCount} passing test lab runs`,
    'runtime_behavior',
    {
      evidenceState: 'VERIFIED',
      source: 'TruthKernelPromptEnforcer',
    }
  );

  return {
    canClaimVerified: true,
    state: 'VERIFIED' as const,
    reason: `Verified ${passedCount}/${testResults.length} passing Test Lab execution proofs`,
    digest: verifiedRecord.sha256Digest,
  };
}
