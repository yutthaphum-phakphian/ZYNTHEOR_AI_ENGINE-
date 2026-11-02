/**
 * ZYNTHEOR AI ENGINE — TRUTH & EVIDENCE KERNEL
 * Buffalo Edition 0.9.0
 * 
 * Foundational Architectural Kernel:
 * 1. Unified Evidence & Claim Verification Gate
 * 2. Hard Output Gate (intercepts claims before user output)
 * 3. Repository Truth & Existence Gate
 * 4. Test & Process Execution Integrity
 * 5. Model Origin Tracking & Non-Fabrication Enforcement
 * 6. Immutable Core Constitution & NO-MOCK Production Policy Enforcement
 * 7. Automatic Audit Ledger Synchronization via createAuditEntry
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createAuditEntry, sha256Sync, type AuditEntry } from '../src/services/auditLedger.ts';

// ==========================================
// 1. Evidence States, Types & Claim Categories
// ==========================================

export type DetailedEvidenceState =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'CONTRADICTED'
  | 'STALE'
  | 'NOT_APPLICABLE';

export type ClaimTruthCategory =
  | 'VERIFIED_FACT'
  | 'ASSUMPTION'
  | 'PROPOSED'
  | 'CONTRADICTED';

export type ModelOriginType =
  | 'NATIVE'
  | 'LOCAL_PROVIDER'
  | 'EXTERNAL_PROVIDER'
  | 'TEMPLATE'
  | 'MOCK'
  | 'CACHE'
  | 'FALLBACK'
  | 'UNKNOWN';

export type ClaimCategory =
  | 'file_existence'
  | 'code_symbol'
  | 'test_execution'
  | 'build_status'
  | 'security_compliance'
  | 'model_capability'
  | 'runtime_behavior';

export interface DetailedEvidenceRecord {
  claimId: string;
  category: ClaimCategory;
  claimText: string;
  source: string;
  sourceRef?: string;
  verificationMethod: string;
  verificationTimestamp: string;
  evidenceState: DetailedEvidenceState;
  truthCategory: ClaimTruthCategory;
  confidence: number;
  limitations?: string;
  exitCode?: number;
  origin?: ModelOriginType;
  sha256Digest: string;
  prevHash: string;
}

export interface ClaimVerificationResult {
  claimId: string;
  category: ClaimCategory;
  originalClaim: string;
  state: DetailedEvidenceState;
  truthCategory: ClaimTruthCategory;
  reason: string;
  evidenceRef?: string;
}

export interface HardOutputGateResult {
  passed: boolean;
  claimsEvaluated: number;
  verifiedCount: number;
  unverifiedCount: number;
  contradictedCount: number;
  sanitizedAnswer: string;
  evidenceRecords: DetailedEvidenceRecord[];
  disclosures: string[];
  modelOrigin: ModelOriginType;
}

// ==========================================
// 2. Immutable Core Constitution & NO-MOCK Policy
// ==========================================

export interface ConstitutionRules {
  localOnlyLocked: boolean;
  humanApprovalGateLocked: boolean;
  auditLedgerLocked: boolean;
  truthKernelMandatory: boolean;
  bearerAuthEnforced: boolean;
  noMockProductionEnforced: boolean;
}

export class ConstitutionViolationError extends Error {
  constructor(message: string) {
    super(`CONSTITUTION_VIOLATION: ${message}`);
    this.name = 'ConstitutionViolationError';
  }
}

export class CoreConstitution {
  private static readonly LOCKED_RULES: ConstitutionRules = Object.freeze({
    localOnlyLocked: true,
    humanApprovalGateLocked: true,
    auditLedgerLocked: true,
    truthKernelMandatory: true,
    bearerAuthEnforced: true,
    noMockProductionEnforced: true,
  });

  /**
   * Verifies that extension or plugin parameters do not attempt to disable
   * or bypass immutable core security gates or enable mock providers in production.
   */
  static validateExtensionRequest(extensionConfig: Record<string, any>): void {
    if (extensionConfig?.disableLocalOnly === true) {
      throw new ConstitutionViolationError('Extensions are forbidden from disabling ZYNTHEOR_LOCAL_ONLY policy.');
    }
    if (extensionConfig?.bypassHumanApproval === true) {
      throw new ConstitutionViolationError('Extensions are forbidden from bypassing Human Approval Gate for consequential tools.');
    }
    if (extensionConfig?.disableAuditLedger === true) {
      throw new ConstitutionViolationError('Extensions are forbidden from disabling Cryptographic Audit Ledger logging.');
    }
    if (extensionConfig?.disableTruthKernel === true) {
      throw new ConstitutionViolationError('Extensions are forbidden from bypassing Truth & Evidence Kernel output validation.');
    }
    if (extensionConfig?.disableAuth === true) {
      throw new ConstitutionViolationError('Extensions are forbidden from disabling Access Token Enforcement.');
    }
    if (extensionConfig?.enableMockProviderInProduction === true || extensionConfig?.allowMockInProduction === true) {
      throw new ConstitutionViolationError('NO-MOCK DIRECTIVE: Mock providers are strictly forbidden in production execution paths.');
    }
  }

  static getRules(): ConstitutionRules {
    return { ...CoreConstitution.LOCKED_RULES };
  }
}

// ==========================================
// 3. Repository Truth Gate
// ==========================================

export class RepositoryTruthGate {
  private rootDir: string;

  constructor(rootDir?: string) {
    let resolvedRoot = rootDir;
    if (!resolvedRoot) {
      if (typeof process !== 'undefined' && process && typeof process.cwd === 'function') {
        try {
          resolvedRoot = process.cwd();
        } catch {
          resolvedRoot = '/';
        }
      } else {
        resolvedRoot = '/';
      }
    }
    this.rootDir = path.resolve(resolvedRoot || '/');
  }

  verifyFileExists(relativePath: string): { exists: boolean; fullPath?: string; sizeBytes?: number } {
    try {
      if (typeof fs === 'undefined' || !fs || typeof fs.existsSync !== 'function') {
        return { exists: false };
      }
      const cleanRel = relativePath.trim().replace(/^['"`]|['"`]$/g, '').replace(/^\/+/, '');
      const fullPath = path.resolve(this.rootDir, cleanRel);

      if (!fullPath.startsWith(this.rootDir)) {
        return { exists: false };
      }

      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() || stat.isDirectory()) {
          return { exists: true, fullPath, sizeBytes: stat.size };
        }
      }
    } catch {
      // Safe fallback
    }
    return { exists: false };
  }

  verifyCodeSymbol(relativePath: string, symbolName: string): { exists: boolean; line?: number } {
    const fileRes = this.verifyFileExists(relativePath);
    if (!fileRes.exists || !fileRes.fullPath) {
      return { exists: false };
    }

    try {
      if (typeof fs === 'undefined' || !fs || typeof fs.readFileSync !== 'function') {
        return { exists: false };
      }
      const content = fs.readFileSync(fileRes.fullPath, 'utf8');
      const lines = content.split('\n');
      const regex = new RegExp(`\\b(function|const|class|let|var|type|interface|export)\\s+${symbolName}\\b`);

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          return { exists: true, line: i + 1 };
        }
      }
    } catch {
      // Safe fallback
    }

    return { exists: false };
  }
}

// ==========================================
// 4. Test & Process Execution Integrity Gate
// ==========================================

export interface RealExecutionProof {
  command: string;
  exitCode: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  durationMs: number;
  runner: string;
  timestamp: string;
}

export class TestExecutionIntegrityGate {
  private executionProofs: RealExecutionProof[] = [];

  recordExecutionProof(proof: RealExecutionProof): void {
    this.executionProofs.push(proof);
  }

  verifyTestClaim(testSuiteName: string, claimedPassedCount?: number): {
    verified: boolean;
    state: DetailedEvidenceState;
    proof?: RealExecutionProof;
    reason: string;
  } {
    const matchingProof = this.executionProofs.find(
      p => p.command.includes(testSuiteName) || p.stdoutSnippet.includes(testSuiteName) || p.runner.includes(testSuiteName)
    );

    if (!matchingProof) {
      return {
        verified: false,
        state: 'UNVERIFIED',
        reason: `No real process execution proof recorded for test suite '${testSuiteName}'.`,
      };
    }

    if (matchingProof.exitCode !== 0) {
      return {
        verified: false,
        state: 'CONTRADICTED',
        proof: matchingProof,
        reason: `Process executed with non-zero exit code (${matchingProof.exitCode}). Test failure confirmed.`,
      };
    }

    return {
      verified: true,
      state: 'VERIFIED',
      proof: matchingProof,
      reason: `Verified real process execution with exit code 0 under ${matchingProof.runner}.`,
    };
  }
}

// ==========================================
// 5. Central Evidence Registry & Verification Gate
// ==========================================

export class TruthKernel {
  private repoGate: RepositoryTruthGate;
  private testGate: TestExecutionIntegrityGate;
  private chain: DetailedEvidenceRecord[] = [];
  private auditEntries: AuditEntry[] = [];
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  private lastAuditRecord: AuditEntry | null = null;

  constructor(rootDir?: string) {
    this.repoGate = new RepositoryTruthGate(rootDir);
    this.testGate = new TestExecutionIntegrityGate();
  }

  getRepoGate(): RepositoryTruthGate {
    return this.repoGate;
  }

  getTestGate(): TestExecutionIntegrityGate {
    return this.testGate;
  }

  /**
   * Categorizes evidence state into VERIFIED_FACT, ASSUMPTION, PROPOSED, or CONTRADICTED.
   */
  static classifyTruthCategory(
    state: DetailedEvidenceState,
    isProposal: boolean = false
  ): ClaimTruthCategory {
    if (state === 'VERIFIED') return 'VERIFIED_FACT';
    if (state === 'CONTRADICTED') return 'CONTRADICTED';
    if (state === 'UNVERIFIED') return isProposal ? 'PROPOSED' : 'ASSUMPTION';
    if (state === 'PARTIALLY_VERIFIED') return 'ASSUMPTION';
    return 'ASSUMPTION';
  }

  recordEvidence(
    category: ClaimCategory,
    claimText: string,
    source: string,
    verificationMethod: string,
    evidenceState: DetailedEvidenceState,
    confidence: number = 1.0,
    options?: {
      sourceRef?: string;
      limitations?: string;
      exitCode?: number;
      origin?: ModelOriginType;
      isProposal?: boolean;
    }
  ): DetailedEvidenceRecord {
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
    const claimId = `claim-${uuid.slice(0, 8)}`;
    const timestamp = new Date().toISOString();
    const prevHash = this.lastHash;
    const truthCategory = TruthKernel.classifyTruthCategory(evidenceState, options?.isProposal);

    const dataToHash = `${claimId}|${category}|${claimText}|${source}|${evidenceState}|${truthCategory}|${confidence}|${timestamp}|${prevHash}`;
    const sha256Digest = sha256Sync(dataToHash);

    const record: DetailedEvidenceRecord = Object.freeze({
      claimId,
      category,
      claimText,
      source,
      sourceRef: options?.sourceRef,
      verificationMethod,
      verificationTimestamp: timestamp,
      evidenceState,
      truthCategory,
      confidence: Math.max(0, Math.min(1, confidence)),
      limitations: options?.limitations,
      exitCode: options?.exitCode,
      origin: options?.origin || 'UNKNOWN',
      sha256Digest,
      prevHash,
    });

    this.chain.push(record);
    this.lastHash = sha256Digest;

    // Automatically log newly verified facts into the audit ledger via createAuditEntry
    if (truthCategory === 'VERIFIED_FACT' || evidenceState === 'VERIFIED') {
      const auditEntry = createAuditEntry(
        'TRUTH_FACT_VERIFIED',
        `claimId=${claimId}; category=${category}; claim="${claimText}"; sha256=${sha256Digest}`,
        this.lastAuditRecord
      );
      this.lastAuditRecord = auditEntry;
      this.auditEntries.push(auditEntry);

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('zyntheor:audit-entry', { detail: auditEntry }));
        } catch {
          // Ignore event dispatch errors in headless environments
        }
      }
    }

    return record;
  }

  /**
   * Registers a claim into the central evidence registry and assigns its truth category.
   */
  registerClaim(
    claimText: string,
    category: ClaimCategory = 'runtime_behavior',
    options?: {
      source?: string;
      evidenceState?: DetailedEvidenceState;
      isProposal?: boolean;
      origin?: ModelOriginType;
    }
  ): DetailedEvidenceRecord {
    const state = options?.evidenceState || 'UNVERIFIED';
    return this.recordEvidence(
      category,
      claimText,
      options?.source || 'CentralEvidenceRegistry',
      'truth_kernel_gate',
      state,
      state === 'VERIFIED' ? 1.0 : 0.5,
      { origin: options?.origin || 'UNKNOWN', isProposal: options?.isProposal }
    );
  }

  /**
   * NO-MOCK Production Policy Verification:
   * Validates if a provider configuration attempts to use mock or synthetic behavior in production.
   */
  validateProductionProvider(
    providerName: string,
    config: Record<string, any> = {}
  ): { isProductionCompliant: boolean; origin: ModelOriginType; reason?: string } {
    const nameLower = (providerName || '').toLowerCase();
    const isMock = nameLower.includes('mock') || nameLower.includes('stub') || nameLower.includes('fake') || nameLower.includes('synthetic');

    if (isMock) {
      if (process.env.NODE_ENV === 'production') {
        throw new ConstitutionViolationError(
          `NO-MOCK DIRECTIVE: Mock provider '${providerName}' rejected in production environment.`
        );
      }
      return {
        isProductionCompliant: false,
        origin: 'MOCK',
        reason: 'Mock provider detected. Allowed only in isolated test runs.',
      };
    }

    const isNative = nameLower.includes('native') || nameLower.includes('buffalo') || nameLower.includes('zyntheor');
    const isLocal = nameLower.includes('ollama') || config?.isLocal === true;

    const origin: ModelOriginType = isNative
      ? 'NATIVE'
      : isLocal
      ? 'LOCAL_PROVIDER'
      : 'EXTERNAL_PROVIDER';

    return {
      isProductionCompliant: true,
      origin,
    };
  }

  /**
   * Hard Output Gate Interceptor:
   * Analyzes candidate model text, extracts claims about files, code symbols,
   * or test outputs, verifies them against real workspace evidence, and updates
   * claim classifications or appends evidence disclosures.
   */
  processHardOutputGate(
    candidateAnswer: string,
    origin: ModelOriginType = 'UNKNOWN',
    contextFiles: string[] = []
  ): HardOutputGateResult {
    let sanitizedAnswer = candidateAnswer;
    const disclosures: string[] = [];
    const claimsEvaluated: ClaimVerificationResult[] = [];

    // 1. Extract file path claims (e.g. `src/file.ts` or `/lib/foo.ts` or `tests/bar.ts`)
    const filePathRegex = /`(?:(?:\/|\.\/)?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+))`|\b(?:src|lib|tests|public|scripts)\/[a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+\b/g;
    const pathMatches = Array.from(new Set(candidateAnswer.match(filePathRegex) || []));

    let verifiedCount = 0;
    let unverifiedCount = 0;
    let contradictedCount = 0;

    for (const rawMatch of pathMatches) {
      const cleanPath = rawMatch.replace(/[`']/g, '').trim();
      const check = this.repoGate.verifyFileExists(cleanPath);

      if (check.exists) {
        verifiedCount++;
        const rec = this.recordEvidence(
          'file_existence',
          `File '${cleanPath}' exists in workspace`,
          'RepositoryTruthGate',
          'fs.existsSync',
          'VERIFIED',
          1.0,
          { sourceRef: check.fullPath, origin }
        );
        claimsEvaluated.push({
          claimId: rec.claimId,
          category: 'file_existence',
          originalClaim: cleanPath,
          state: 'VERIFIED',
          truthCategory: 'VERIFIED_FACT',
          reason: `Verified file existence on disk (${check.sizeBytes} bytes).`,
          evidenceRef: rec.sha256Digest,
        });
      } else {
        // If the path was mentioned as "Created new file `xxx`", check if it's proposed
        const isCreationClaim = candidateAnswer.includes(`Create`) || candidateAnswer.includes(`created`) || candidateAnswer.includes(`new file`);
        const state: DetailedEvidenceState = isCreationClaim ? 'UNVERIFIED' : 'CONTRADICTED';
        const truthCategory: ClaimTruthCategory = isCreationClaim ? 'PROPOSED' : 'CONTRADICTED';

        if (state === 'CONTRADICTED') contradictedCount++;
        else unverifiedCount++;

        const rec = this.recordEvidence(
          'file_existence',
          `File '${cleanPath}' claims to exist or be created`,
          'RepositoryTruthGate',
          'fs.existsSync',
          state,
          0.0,
          { limitations: 'Path does not exist in workspace filesystem.', origin, isProposal: isCreationClaim }
        );

        claimsEvaluated.push({
          claimId: rec.claimId,
          category: 'file_existence',
          originalClaim: cleanPath,
          state,
          truthCategory,
          reason: isCreationClaim
            ? `File '${cleanPath}' is proposed to be created.`
            : `File '${cleanPath}' does not exist in local workspace.`,
          evidenceRef: rec.sha256Digest,
        });
      }
    }

    // 2. Extract Test Success Claims (e.g. "passed 342 tests", "4/4 tests passed")
    const testSuccessRegex = /\b(?:passed|passes)\s+(\d+)\/?(\d+)?\s+tests?\b|\b(\d+)\/(\d+)\s+tests?\s+passed\b/i;
    const testMatch = candidateAnswer.match(testSuccessRegex);

    if (testMatch) {
      const testCheck = this.testGate.verifyTestClaim('test');
      if (!testCheck.verified) {
        unverifiedCount++;
        const rec = this.recordEvidence(
          'test_execution',
          `Claimed test result: ${testMatch[0]}`,
          'TestExecutionIntegrityGate',
          'processExitCode',
          testCheck.state,
          0.2,
          { limitations: testCheck.reason, origin }
        );
        disclosures.push(`[TRUTH_KERNEL_DISCLOSURE] Test status claim (${testMatch[0]}) lacks direct verified process execution proof in current request chain.`);
      } else {
        verifiedCount++;
      }
    }

    // 3. Attach Origin Disclosure if Template, Mock or Fallback
    if (origin === 'TEMPLATE' || origin === 'MOCK' || origin === 'FALLBACK') {
      disclosures.push(`[MODEL_ORIGIN_DISCLOSURE] Answer generated from origin '${origin}' (non-inference fallback/template).`);
    }

    const passed = contradictedCount === 0;

    return {
      passed,
      claimsEvaluated: claimsEvaluated.length,
      verifiedCount,
      unverifiedCount,
      contradictedCount,
      sanitizedAnswer,
      evidenceRecords: this.getEvidenceRecords(),
      disclosures,
      modelOrigin: origin,
    };
  }

  /**
   * Returns immutable copies of evidence records stored in memory.
   */
  getEvidenceRecords(): DetailedEvidenceRecord[] {
    return this.chain.map(r => Object.freeze({ ...r }));
  }

  /**
   * Returns audit entries generated for verified facts.
   */
  getAuditLedger(): AuditEntry[] {
    return [...this.auditEntries].map(r => Object.freeze({ ...r }));
  }
}
