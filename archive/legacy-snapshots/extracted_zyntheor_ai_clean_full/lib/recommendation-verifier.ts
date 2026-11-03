/**
 * ZYNTHEOR AI ENGINE — RECOMMENDATION VERIFICATION ENGINE
 * 
 * Verifies technical recommendations (files, code symbols, API endpoints,
 * package dependencies, CLI tools, provider capabilities) before presenting
 * them as existing components versus proposed future components.
 */

import fs from 'node:fs';
import path from 'node:path';
import { TruthKernel, type DetailedEvidenceState, type ClaimTruthCategory } from './truth-kernel.ts';

export type ComponentCategory =
  | 'file_or_directory'
  | 'code_symbol'
  | 'api_endpoint'
  | 'package_dependency'
  | 'package_version'
  | 'configuration_key'
  | 'provider_capability'
  | 'cli_command'
  | 'runtime_executable'
  | 'test_file'
  | 'documentation_reference';

export interface ComponentRecommendation {
  name: string;
  category: ComponentCategory;
  proposedPathOrKey?: string;
  isClaimedExisting: boolean;
  metadata?: Record<string, any>;
}

export interface RecommendationVerificationResult {
  recommendation: ComponentRecommendation;
  isVerified: boolean;
  state: DetailedEvidenceState;
  truthCategory: ClaimTruthCategory;
  evidenceSummary: string;
  isExistingComponent: boolean;
  isProposedComponent: boolean;
  sha256Digest?: string;
  error?: string;
}

export class RecommendationVerificationEngine {
  private rootDir: string;
  private kernel: TruthKernel;
  private packageJsonCache: any = null;

  constructor(rootDir: string = process.cwd(), kernel?: TruthKernel) {
    this.rootDir = path.resolve(rootDir);
    this.kernel = kernel || new TruthKernel(this.rootDir);
    this.loadPackageJson();
  }

  private loadPackageJson() {
    try {
      const pkgPath = path.join(this.rootDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        this.packageJsonCache = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      }
    } catch {
      this.packageJsonCache = null;
    }
  }

  /**
   * Verifies a component recommendation against workspace evidence.
   */
  public verifyRecommendation(rec: ComponentRecommendation): RecommendationVerificationResult {
    let isVerified = false;
    let state: DetailedEvidenceState = 'UNVERIFIED';
    let summary = '';

    switch (rec.category) {
      case 'file_or_directory':
      case 'test_file':
      case 'documentation_reference': {
        const targetPath = rec.proposedPathOrKey || rec.name;
        const cleanPath = targetPath.replace(/^\/+/, '');
        const fullPath = path.resolve(this.rootDir, cleanPath);
        if (fullPath.startsWith(this.rootDir) && fs.existsSync(fullPath)) {
          isVerified = true;
          state = 'VERIFIED';
          const stat = fs.statSync(fullPath);
          summary = `Verified ${stat.isDirectory() ? 'directory' : 'file'} exists at '${cleanPath}' (${stat.size} bytes).`;
        } else {
          state = rec.isClaimedExisting ? 'CONTRADICTED' : 'UNVERIFIED';
          summary = rec.isClaimedExisting
            ? `CONTRADICTION: Claimed existing component '${cleanPath}' does not exist on disk.`
            : `Proposed component '${cleanPath}' does not yet exist.`;
        }
        break;
      }

      case 'code_symbol': {
        const filePath = rec.proposedPathOrKey || '';
        const symbolRes = this.kernel.getRepoGate().verifyCodeSymbol(filePath, rec.name);
        if (symbolRes.exists) {
          isVerified = true;
          state = 'VERIFIED';
          summary = `Verified symbol '${rec.name}' in file '${filePath}' at line ${symbolRes.line}.`;
        } else {
          state = rec.isClaimedExisting ? 'CONTRADICTED' : 'UNVERIFIED';
          summary = rec.isClaimedExisting
            ? `CONTRADICTION: Symbol '${rec.name}' not found in file '${filePath}'.`
            : `Proposed symbol '${rec.name}' not found in file '${filePath}'.`;
        }
        break;
      }

      case 'package_dependency': {
        const pkgName = rec.name;
        const deps = { ...(this.packageJsonCache?.dependencies || {}), ...(this.packageJsonCache?.devDependencies || {}) };
        if (deps[pkgName]) {
          isVerified = true;
          state = 'VERIFIED';
          summary = `Verified package '${pkgName}' installed at version ${deps[pkgName]}.`;
        } else {
          state = rec.isClaimedExisting ? 'CONTRADICTED' : 'UNVERIFIED';
          summary = rec.isClaimedExisting
            ? `CONTRADICTION: Package '${pkgName}' is not installed in package.json.`
            : `Proposed package '${pkgName}' is not currently in dependencies.`;
        }
        break;
      }

      case 'package_version': {
        const pkgName = rec.name;
        const expectedVersion = rec.proposedPathOrKey || '';
        const deps = { ...(this.packageJsonCache?.dependencies || {}), ...(this.packageJsonCache?.devDependencies || {}) };
        const actualVersion = deps[pkgName];
        if (actualVersion && (actualVersion.includes(expectedVersion) || expectedVersion.includes(actualVersion))) {
          isVerified = true;
          state = 'VERIFIED';
          summary = `Verified package '${pkgName}' version '${actualVersion}' matches '${expectedVersion}'.`;
        } else {
          state = rec.isClaimedExisting ? 'CONTRADICTED' : 'UNVERIFIED';
          summary = `Package '${pkgName}' version check failed. Actual: ${actualVersion || 'none'}, Expected: ${expectedVersion}.`;
        }
        break;
      }

      case 'configuration_key': {
        const envKey = rec.name;
        const hasEnv = process.env[envKey] !== undefined;
        let envExampleHasKey = false;
        try {
          const envEx = fs.readFileSync(path.join(this.rootDir, '.env.example'), 'utf8');
          envExampleHasKey = envEx.includes(`${envKey}=`);
        } catch {}

        if (hasEnv || envExampleHasKey) {
          isVerified = true;
          state = 'VERIFIED';
          summary = `Verified configuration key '${envKey}' (Env set: ${hasEnv}, .env.example: ${envExampleHasKey}).`;
        } else {
          state = rec.isClaimedExisting ? 'CONTRADICTED' : 'UNVERIFIED';
          summary = `Configuration key '${envKey}' not defined in environment or .env.example.`;
        }
        break;
      }

      case 'provider_capability': {
        const cap = rec.name;
        const validCapabilities = ['chat', 'reasoning', 'coding', 'research', 'agent', 'streaming', 'tools', 'MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'];
        if (validCapabilities.includes(cap)) {
          isVerified = true;
          state = 'VERIFIED';
          summary = `Verified provider capability '${cap}'.`;
        } else {
          state = 'UNVERIFIED';
          summary = `Unverified or unsupported provider capability '${cap}'.`;
        }
        break;
      }

      case 'cli_command':
      case 'runtime_executable': {
        const cmd = rec.name;
        const validCmds = ['npm', 'node', 'npx', 'tsc', 'vite', 'vitest', 'git'];
        if (validCmds.includes(cmd)) {
          isVerified = true;
          state = 'VERIFIED';
          summary = `Verified executable/command '${cmd}' is allowed in environment.`;
        } else {
          state = rec.isClaimedExisting ? 'CONTRADICTED' : 'UNVERIFIED';
          summary = `Command '${cmd}' is not in verified executable list.`;
        }
        break;
      }

      default: {
        state = 'UNVERIFIED';
        summary = `Unverified component category '${rec.category}'.`;
      }
    }

    const truthCategory = TruthKernel.classifyTruthCategory(state, !rec.isClaimedExisting);
    const recorded = this.kernel.recordEvidence(
      rec.category === 'file_or_directory' ? 'file_existence' : 'runtime_behavior',
      `Recommendation '${rec.name}' (${rec.category})`,
      'RecommendationVerificationEngine',
      'workspace_inspection',
      state,
      isVerified ? 1.0 : 0.0,
      { isProposal: !rec.isClaimedExisting, limitations: summary }
    );

    return {
      recommendation: rec,
      isVerified,
      state,
      truthCategory,
      evidenceSummary: summary,
      isExistingComponent: isVerified && rec.isClaimedExisting,
      isProposedComponent: !rec.isClaimedExisting,
      sha256Digest: recorded.sha256Digest,
    };
  }
}
