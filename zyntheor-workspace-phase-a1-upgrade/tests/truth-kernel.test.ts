import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TruthKernel,
  CoreConstitution,
  ConstitutionViolationError,
  RepositoryTruthGate,
  TestExecutionIntegrityGate,
} from '../lib/truth-kernel.ts';

describe('ZYNTHEOR AI ENGINE — Truth & Evidence Kernel & Constitution Audit', () => {

  describe('Core Constitution Policy Locks', () => {
    test('returns immutable constitution rules', () => {
      const rules = CoreConstitution.getRules();
      assert.equal(rules.localOnlyLocked, true);
      assert.equal(rules.humanApprovalGateLocked, true);
      assert.equal(rules.auditLedgerLocked, true);
      assert.equal(rules.truthKernelMandatory, true);
      assert.equal(rules.bearerAuthEnforced, true);
      assert.equal(rules.noMockProductionEnforced, true);
    });

    test('throws ConstitutionViolationError if extension attempts to disable local-only mode', () => {
      assert.throws(
        () => CoreConstitution.validateExtensionRequest({ disableLocalOnly: true }),
        ConstitutionViolationError
      );
    });

    test('throws ConstitutionViolationError if extension attempts to bypass human approval gate', () => {
      assert.throws(
        () => CoreConstitution.validateExtensionRequest({ bypassHumanApproval: true }),
        ConstitutionViolationError
      );
    });

    test('throws ConstitutionViolationError if extension attempts to disable truth kernel', () => {
      assert.throws(
        () => CoreConstitution.validateExtensionRequest({ disableTruthKernel: true }),
        ConstitutionViolationError
      );
    });

    test('throws ConstitutionViolationError if extension attempts to enable mock provider in production', () => {
      assert.throws(
        () => CoreConstitution.validateExtensionRequest({ enableMockProviderInProduction: true }),
        ConstitutionViolationError
      );
    });

    test('allows compliant extension configs', () => {
      assert.doesNotThrow(() => {
        CoreConstitution.validateExtensionRequest({ name: 'safe-plugin', version: '1.0.0' });
      });
    });
  });

  describe('Repository Truth Gate', () => {
    const repoGate = new RepositoryTruthGate();

    test('verifies existence of actual workspace file package.json', () => {
      const result = repoGate.verifyFileExists('package.json');
      assert.equal(result.exists, true);
      assert.ok(result.sizeBytes && result.sizeBytes > 0);
    });

    test('verifies non-existence of fabricated file path', () => {
      const result = repoGate.verifyFileExists('src/components/NonExistentComponent999.tsx');
      assert.equal(result.exists, false);
    });

    test('verifies exported code symbol in existing file', () => {
      const result = repoGate.verifyCodeSymbol('lib/truth-kernel.ts', 'TruthKernel');
      assert.equal(result.exists, true);
      assert.ok(result.line && result.line > 0);
    });

    test('rejects non-existent symbol in existing file', () => {
      assert.equal(repoGate.verifyCodeSymbol('lib/truth-kernel.ts', 'FakeFunction123').exists, false);
    });
  });

  describe('Test Execution Integrity Gate', () => {
    test('verifies real test execution proof with exit code 0', () => {
      const gate = new TestExecutionIntegrityGate();
      gate.recordExecutionProof({
        command: 'npm test',
        exitCode: 0,
        stdoutSnippet: '342 tests passed',
        stderrSnippet: '',
        durationMs: 450,
        runner: 'node:test',
        timestamp: new Date().toISOString(),
      });

      const verification = gate.verifyTestClaim('npm test');
      assert.equal(verification.verified, true);
      assert.equal(verification.state, 'VERIFIED');
    });

    test('rejects test claim when process exit code is non-zero', () => {
      const gate = new TestExecutionIntegrityGate();
      gate.recordExecutionProof({
        command: 'npm test',
        exitCode: 1,
        stdoutSnippet: '1 test failed',
        stderrSnippet: 'AssertionError',
        durationMs: 300,
        runner: 'node:test',
        timestamp: new Date().toISOString(),
      });

      const verification = gate.verifyTestClaim('npm test');
      assert.equal(verification.verified, false);
      assert.equal(verification.state, 'CONTRADICTED');
    });

    test('returns UNVERIFIED when no execution proof exists', () => {
      const gate = new TestExecutionIntegrityGate();
      const verification = gate.verifyTestClaim('unrun-suite');
      assert.equal(verification.verified, false);
      assert.equal(verification.state, 'UNVERIFIED');
    });
  });

  describe('Central Evidence Registry, Immutability & Audit Logging', () => {
    test('categorizes verified claims as VERIFIED_FACT and logs audit entry automatically', () => {
      const kernel = new TruthKernel();
      const record = kernel.registerClaim('package.json exists', 'file_existence', {
        evidenceState: 'VERIFIED',
      });

      assert.equal(record.truthCategory, 'VERIFIED_FACT');
      assert.equal(record.confidence, 1.0);

      const auditLedger = kernel.getAuditLedger();
      assert.equal(auditLedger.length, 1);
      assert.equal(auditLedger[0].action, 'TRUTH_FACT_VERIFIED');
      assert.ok(auditLedger[0].detail.includes('package.json exists'));
      assert.ok(auditLedger[0].hash.length === 64);
    });

    test('ensures recorded evidence records are immutable in memory', () => {
      const kernel = new TruthKernel();
      const record = kernel.registerClaim('Immutable check', 'runtime_behavior', {
        evidenceState: 'VERIFIED',
      });

      assert.ok(Object.isFrozen(record), 'Single evidence record must be frozen in memory');

      const records = kernel.getEvidenceRecords();
      assert.ok(Object.isFrozen(records[0]), 'Evidence record item must be frozen');

      // Attempting mutation in strict mode should throw TypeError
      assert.throws(() => {
        (record as any).claimText = 'Mutated claim text';
      }, TypeError);
    });

    test('categorizes unverified claims as ASSUMPTION by default', () => {
      const kernel = new TruthKernel();
      const record = kernel.registerClaim('Model latency is under 50ms', 'runtime_behavior', {
        evidenceState: 'UNVERIFIED',
      });

      assert.equal(record.truthCategory, 'ASSUMPTION');
      assert.equal(record.confidence, 0.5);

      // Assumptions should not automatically emit VERIFIED audit entries
      assert.equal(kernel.getAuditLedger().length, 0);
    });

    test('categorizes proposals and creation steps as PROPOSED', () => {
      const kernel = new TruthKernel();
      const record = kernel.registerClaim('Create new component src/components/NewFeature.tsx', 'file_existence', {
        evidenceState: 'UNVERIFIED',
        isProposal: true,
      });

      assert.equal(record.truthCategory, 'PROPOSED');
    });

    test('categorizes contradicted claims as CONTRADICTED', () => {
      const kernel = new TruthKernel();
      const record = kernel.registerClaim('NonExistentFile.ts exists', 'file_existence', {
        evidenceState: 'CONTRADICTED',
      });

      assert.equal(record.truthCategory, 'CONTRADICTED');
    });
  });

  describe('NO-MOCK Production Policy & Provider Validation', () => {
    test('validates real local/native providers', () => {
      const kernel = new TruthKernel();
      const res = kernel.validateProductionProvider('zyntheor-native-coder', { isLocal: true });

      assert.equal(res.isProductionCompliant, true);
      assert.equal(res.origin, 'NATIVE');
    });

    test('flags mock provider in non-production mode', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const kernel = new TruthKernel();

      const res = kernel.validateProductionProvider('mock-openai-provider');
      assert.equal(res.isProductionCompliant, false);
      assert.equal(res.origin, 'MOCK');

      process.env.NODE_ENV = oldEnv;
    });

    test('throws ConstitutionViolationError if mock provider used in production', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const kernel = new TruthKernel();

      assert.throws(
        () => kernel.validateProductionProvider('mock-provider'),
        ConstitutionViolationError
      );

      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('Truth Kernel Hard Output Gate', () => {
    test('validates candidate text containing real files and records SHA-256 evidence chain with truth categories', () => {
      const kernel = new TruthKernel();
      const answer = 'We updated `package.json` and `lib/truth-kernel.ts` to implement the security kernel.';

      const gateResult = kernel.processHardOutputGate(answer, 'LOCAL_PROVIDER');
      assert.equal(gateResult.passed, true);
      assert.equal(gateResult.verifiedCount, 2);
      assert.equal(gateResult.contradictedCount, 0);
      assert.ok(gateResult.evidenceRecords.length >= 2);

      // Verify truth categories and audit entries
      const rec = gateResult.evidenceRecords[0];
      assert.equal(rec.truthCategory, 'VERIFIED_FACT');
      assert.ok(rec.sha256Digest.length === 64);

      // Check audit entries were recorded for the 2 verified files
      const auditLedger = kernel.getAuditLedger();
      assert.equal(auditLedger.length, 2);
    });

    test('detects fabricated file paths and marks claims contradicted', () => {
      const kernel = new TruthKernel();
      const answer = 'I checked `src/does-not-exist-xyz.ts` and fixed the bug.';

      const gateResult = kernel.processHardOutputGate(answer, 'LOCAL_PROVIDER');
      assert.equal(gateResult.passed, false);
      assert.equal(gateResult.contradictedCount, 1);
    });

    test('attaches origin disclosure when model origin is TEMPLATE or FALLBACK', () => {
      const kernel = new TruthKernel();
      const answer = 'Standard development plan generated.';

      const gateResult = kernel.processHardOutputGate(answer, 'TEMPLATE');
      assert.equal(gateResult.disclosures.length, 1);
      assert.ok(gateResult.disclosures[0].includes('Answer generated from origin \'TEMPLATE\''));
    });
  });
});
