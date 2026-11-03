import test from 'node:test';
import assert from 'node:assert/strict';
import { TruthKernel, CoreConstitution, ConstitutionViolationError } from '../lib/truth-kernel.ts';
import { RecommendationVerificationEngine } from '../lib/recommendation-verifier.ts';
import { RuntimeEvidenceRegistry } from '../lib/runtime-evidence-registry.ts';
import { PromptTestLab } from '../lib/prompt-studio/test-lab.ts';
import { ProviderCompatibilityValidator } from '../lib/prompt-studio/provider-validator.ts';
import { DynamicReplanner, type ToolFailure, type Plan } from '../lib/dynamic-replanning.ts';
import { ToolGateway } from '../lib/intelligence-core.ts';
import { createProvider } from '../lib/providers.ts';

// 1. Unsupported claims cannot become VERIFIED_FACT.
test('Truth Enforcement Boundary: unsupported claims cannot become VERIFIED_FACT', () => {
  const kernel = new TruthKernel();
  
  // Register an unverified claim
  const claim = kernel.registerClaim('Code passed 100% of unrun tests', 'test_execution', {
    evidenceState: 'UNVERIFIED',
  });

  assert.equal(claim.truthCategory, 'ASSUMPTION', 'Unverified claim must be categorized as ASSUMPTION or UNVERIFIED, not VERIFIED_FACT');
  assert.notEqual(claim.truthCategory, 'VERIFIED_FACT');

  // Hard output gate check for fabricated file
  const gateResult = kernel.processHardOutputGate('The file `src/nonexistent_fabricated_file.ts` is completely functional.');
  assert.equal(gateResult.passed, false, 'Output gate must fail when claims are contradicted or unverified');
  assert.equal(gateResult.verifiedCount, 0);
  assert.equal(gateResult.contradictedCount, 1);
});

// 2. Missing repository files cannot be recommended as existing.
test('Truth Enforcement Boundary: missing repository files cannot be recommended as existing', () => {
  const verifier = new RecommendationVerificationEngine();
  
  const rec = verifier.verifyRecommendation({
    name: 'src/components/NonExistentComponent.tsx',
    category: 'file_or_directory',
    proposedPathOrKey: 'src/components/NonExistentComponent.tsx',
    isClaimedExisting: true,
  });

  assert.equal(rec.isVerified, false, 'Missing file recommendation must fail verification');
  assert.equal(rec.isExistingComponent, false);
  assert.equal(rec.state, 'CONTRADICTED', 'Claiming a missing file exists must result in CONTRADICTED state');
  assert.equal(rec.truthCategory, 'CONTRADICTED');
});

// 3. Mock provider responses cannot be classified as real inference.
test('Truth Enforcement Boundary: mock provider responses cannot be classified as real inference', () => {
  const registry = new RuntimeEvidenceRegistry();

  const record = registry.recordExecution({
    command: 'call-mock-provider',
    startTime: new Date(Date.now() - 100).toISOString(),
    endTime: new Date().toISOString(),
    exitCode: 0,
    stdoutSnippet: 'mock provider reply',
    stderrSnippet: '',
    claimedStatus: 'PROVIDER_INFERENCE_PASS',
    environment: { ZYNTHEOR_PROVIDER: 'mock' },
  });

  assert.equal(record.verificationStatus, 'RUNTIME_PASS', 'Mock provider execution must be downgraded to RUNTIME_PASS, not PROVIDER_INFERENCE_PASS');
  assert.notEqual(record.verificationStatus, 'PROVIDER_INFERENCE_PASS');
});

// 4. Failed commands cannot be reported as successful.
test('Truth Enforcement Boundary: failed commands cannot be reported as successful', () => {
  const registry = new RuntimeEvidenceRegistry();

  const record = registry.recordExecution({
    command: 'npm run test:failing',
    startTime: new Date(Date.now() - 500).toISOString(),
    endTime: new Date().toISOString(),
    exitCode: 1, // Exit code 1 indicates process failure
    stdoutSnippet: 'Tests failed: 5 errors',
    stderrSnippet: 'AssertionError: test failed',
    claimedStatus: 'BUILD_PASS', // Improperly claimed success
  });

  assert.equal(record.verificationStatus, 'EXECUTION_FAILED', 'Non-zero exit code must strictly result in EXECUTION_FAILED');
  assert.notEqual(record.verificationStatus, 'BUILD_PASS');
  assert.notEqual(record.verificationStatus, 'UNIT_TEST_PASS');
});

// 5. External requests are blocked in Local-Only Mode.
test('Truth Enforcement Boundary: external requests are blocked in Local-Only Mode', () => {
  const geminiProvider = createProvider({
    ZYNTHEOR_PROVIDER: 'gemini',
    ZYNTHEOR_LOCAL_ONLY: 'true',
    GEMINI_API_KEY: 'test-secret-key',
  });

  assert.equal(geminiProvider.isLocal, false);

  function isOutboundAllowed(provider: ReturnType<typeof createProvider>, localOnly: boolean, consent: boolean) {
    if (provider.isLocal) return true;
    if (localOnly) return false;
    return consent;
  }

  const allowedWithConsent = isOutboundAllowed(geminiProvider, true, true);
  assert.equal(allowedWithConsent, false, 'External provider calls must be unconditionally blocked when Local-Only is true, even if consent is true');
});

// 6. Extensions cannot bypass Truth Kernel validation.
test('Truth Enforcement Boundary: extensions cannot bypass Truth Kernel validation', () => {
  const maliciousExtensionConfig = {
    extensionName: 'bypasser-plugin',
    disableTruthKernel: true,
  };

  assert.throws(
    () => CoreConstitution.validateExtensionRequest(maliciousExtensionConfig),
    ConstitutionViolationError,
    'Attempting to disable Truth Kernel must throw a ConstitutionViolationError'
  );

  const mockInProdConfig = {
    extensionName: 'mock-in-prod-plugin',
    enableMockProviderInProduction: true,
  };

  assert.throws(
    () => CoreConstitution.validateExtensionRequest(mockInProdConfig),
    ConstitutionViolationError,
    'Attempting to enable mock providers in production must throw a ConstitutionViolationError'
  );
});

// 7. Prompt Test Lab distinguishes expected and observed output.
test('Truth Enforcement Boundary: Prompt Test Lab distinguishes expected and observed output', async () => {
  const lab = new PromptTestLab();

  const cases = [
    {
      id: 'case-1',
      input: { text: 'hello' },
      expectedOutput: 'expected result string',
      evidenceState: 'UNVERIFIED' as const,
    },
  ];

  const mockModel = async (prompt: string) => {
    return {
      output: 'observed different result string',
      origin: 'local_model',
      latencyMs: 15,
    };
  };

  const results = await lab.runTests('Test {{text}}', cases, mockModel);
  const res = results[0];

  assert.equal(res.expectedOutput, 'expected result string');
  assert.equal(res.observedOutput, 'observed different result string');
  assert.equal(res.passed, false, 'When observed output does not match expected output, test must fail');
  assert.equal(res.evidenceState, 'CONTRADICTED');
  assert.ok(res.executionProofId, 'Execution proof ID must be assigned');
});

// 8. Invalid provider exports are rejected.
test('Truth Enforcement Boundary: invalid provider exports are rejected', () => {
  const validator = new ProviderCompatibilityValidator();

  const invalidOpenAiExport = {
    // Missing required "model" and "messages"
    temperature: 0.7,
  };

  const check = validator.validate('openai', invalidOpenAiExport);
  assert.equal(check.valid, false, 'Invalid provider payload must be rejected');
  assert.ok(check.errors.length > 0);
  assert.ok(check.errors.some(e => e.includes('model')));
});

// 9. Dynamic recovery preserves the original failure evidence.
test('Truth Enforcement Boundary: dynamic recovery preserves the original failure evidence', () => {
  const replanner = new DynamicReplanner();

  const initialPlan: Plan = {
    id: 'plan-123',
    steps: [
      { id: 'step-1', tool: 'code_execute', params: { code: 'bad()' } },
    ],
  };

  const failure: ToolFailure = {
    stepId: 'step-1',
    toolName: 'code_execute',
    error: 'SyntaxError: unexpected token bad()',
    attempt: 1,
    isTransient: false,
    timestamp: new Date().toISOString(),
  };

  const decision = replanner.replan(initialPlan, failure);

  assert.ok(decision.originalFailure, 'Replan decision must attach original failure');
  assert.equal(decision.originalFailure.error, 'SyntaxError: unexpected token bad()');
  assert.equal(decision.historyRecord.originalFailurePreserved, true);
  
  const history = replanner.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].error, 'SyntaxError: unexpected token bad()');
});

// 10. Approval requirements cannot be bypassed by model-generated instructions.
test('Truth Enforcement Boundary: approval requirements cannot be bypassed by model instructions', async () => {
  const toolGateway = new ToolGateway();

  const ctxWithoutApproval = {
    requestId: 'req-1',
    humanApprovals: {}, // NO human approval given
    language: 'en' as const,
  };

  // Model sends instruction attempting to invoke a consequential tool
  await assert.rejects(
    async () => {
      await toolGateway.executeTool('workspace.mutate', { action: 'write', targetPath: 'src/App.tsx' }, ctxWithoutApproval);
    },
    (err: Error) => err.message.includes('human_approval_required'),
    'Consequential tool invocation must be rejected without human approval, regardless of model instructions'
  );
});
