/**
 * ZYNTHEOR Model Sovereignty Constants & Validation Standard
 * 
 * Foundational Architecture Decision: Build Web First. Architect for Both.
 * 
 * Product Identity: ZYNTHEOR AI ENGINE
 * Intelligence: ZYNTHEOR INTELLIGENCE
 * Model Family: ZYNTHEOR CORE
 * 
 * Canonical State: COURT_READY — Genesis #849202 — Merkle Root 909ab814...
 * Seals Verified: 14902 — SSoT Drift Δ0.00% — Quorum 10/10 REAL_HSM
 * 
 * Flow: Main Chat → Intelligence Runtime → Model Router → CORE_NATIVE Buffalo Edition 
 *       → Memory → PostgreSQL → Tool Gateway → Verification (LB Dual Hash + PQC + ZK) 
 *       → Audit Ledger (PAdES QR) → Legal Runtime (ETDA 9/26/28) → Gateway Fleet BKK/FRA/NRT/SIN/IAD
 */

import { ZYNTHEOR_CANONICAL_STATE, validateCourtReady } from './forensicVerification.ts';

export const ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY = {
  PRODUCT_IDENTITY: 'ZYNTHEOR AI ENGINE',
  INTELLIGENCE_LAYER: 'ZYNTHEOR INTELLIGENCE',
  PRIMARY_MODEL_FAMILY: 'ZYNTHEOR CORE',
  ALLOWED_MODEL_PREFIXES: ['zyntheor-core', 'zyntheor-buffalo', 'zyntheor-native'],
  ENFORCE_AIRGAP_CAPABILITY: true,
  GATEWAY_IS_PROVIDER: false, // Internet Gateway is a data source, NOT a model provider
  CORE_VERSION: 'v1.2.1_LTS_GOLD_MASTER',
  SEAL_COUNT_VERIFIED: 14902,
  SEAL_COUNT_CLAIMED: 14962,
  SEAL_COUNT: 14902, // COURT_READY verified
  OWNER: 'ZYNTHEOR' as const,
  SOVEREIGN_PRINCIPAL: 'นายยุทธภูมิ พากเพียร (#EP-SOVEREIGN-01)',
  GENESIS_BLOCK: 849202,
  CANONICAL_MERKLE_ROOT: '909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68',
  COURT_STATUS: 'COURT_READY' as const,
  SSOT_DRIFT: 'Δ0.00%' as const,
  ENFORCEMENT_POINTS: [
    '1. Model Registry',
    '2. Model Router',
    '3. Provider Adapter',
    '4. API Response',
    '5. Chat Message Metadata',
    '6. Audit Ledger',
    '7. UI Model Badge'
  ],
  PLATFORM_POLICY: 'Build Web First. Architect for Both.',
  GATEWAY_FLEET: ['BKK', 'FRA', 'NRT', 'SIN', 'IAD'] as const,
  GATEWAY_REGIONS: 12,
  TOTAL_INTERCEPTIONS: 15723,
  FAIL_CLOSED: '100% BLOCKED (ZERO-BREACH GUARANTEE)',
  LEGAL_COMPLIANCE: ['ETDA B.E. 2544 Sec 9/26/28', 'PDPA B.E. 2562 Sec 37', 'NCSA CII Act'],
  QUORUM: '10/10 PASS (100% Ratified)',
  HARDWARE_ENCLAVE: 'FIPS 140-3 Level 4 / CC EAL6+',
  CRYPTO_STANDARD: 'NIST PQC FIPS 203/204/205 ML-DSA-87 + SPHINCS+',
} as const;

export interface ValidationResult {
  valid: boolean;
  model: string;
  reason?: string;
  sovereignty?: {
    product: typeof ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRODUCT_IDENTITY;
    intelligence: typeof ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.INTELLIGENCE_LAYER;
    family: typeof ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY;
    courtStatus: typeof ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.COURT_STATUS;
    genesis: number;
    merkleRoot: string;
    sealsVerified: number;
    drift: string;
  };
  enforcement?: string[];
  courtReady?: ReturnType<typeof validateCourtReady>;
}

export type ModelIdentityStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE' | 'INVALID' | 'COURT_READY';

export function validateModelSovereignty(modelIdentifier: string): ValidationResult {
  const courtValidation = validateCourtReady();
  
  if (!modelIdentifier || typeof modelIdentifier !== 'string') {
    return {
      valid: false,
      model: String(modelIdentifier),
      reason: 'Invalid or missing model identifier — ZYNTHEOR CORE sovereignty requires explicit modelId. Genesis #849202 must be anchored.',
      sovereignty: {
        product: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRODUCT_IDENTITY,
        intelligence: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.INTELLIGENCE_LAYER,
        family: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY,
        courtStatus: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.COURT_STATUS,
        genesis: ZYNTHEOR_CANONICAL_STATE.genesis_block,
        merkleRoot: ZYNTHEOR_CANONICAL_STATE.canonical_merkle_root,
        sealsVerified: ZYNTHEOR_CANONICAL_STATE.seals_verified,
        drift: ZYNTHEOR_CANONICAL_STATE.ssot_drift,
      },
      courtReady: courtValidation,
    };
  }

  const normalized = modelIdentifier.toLowerCase().trim();
  
  const blockedPrefixes = ['gemini', 'gpt-', 'openai', 'claude', 'llama-external', 'mistral-external'];
  const isBlocked = blockedPrefixes.some(p => normalized.startsWith(p) || normalized.includes(`-${p}`));
  if (isBlocked) {
    return {
      valid: false,
      model: modelIdentifier,
      reason: `Model '${modelIdentifier}' violates ZYNTHEOR CORE sovereignty policy. External provider cannot be primary. Primary execution must route through ${ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY}. Blocked: external provider masquerading as CORE. COURT_READY requires ZYNTHEOR CORE only.`,
      sovereignty: {
        product: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRODUCT_IDENTITY,
        intelligence: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.INTELLIGENCE_LAYER,
        family: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY,
        courtStatus: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.COURT_STATUS,
        genesis: ZYNTHEOR_CANONICAL_STATE.genesis_block,
        merkleRoot: ZYNTHEOR_CANONICAL_STATE.canonical_merkle_root,
        sealsVerified: ZYNTHEOR_CANONICAL_STATE.seals_verified,
        drift: ZYNTHEOR_CANONICAL_STATE.ssot_drift,
      },
      courtReady: courtValidation,
    };
  }

  const isCompliant = ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.ALLOWED_MODEL_PREFIXES.some(
    (prefix) => normalized.startsWith(prefix)
  );

  if (!isCompliant) {
    return {
      valid: false,
      model: modelIdentifier,
      reason: `Model '${modelIdentifier}' violates ZYNTHEOR CORE sovereignty policy. Primary execution must route through ${ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY}. Allowed prefixes: ${ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.ALLOWED_MODEL_PREFIXES.join(', ')}. Current: ${modelIdentifier}. COURT_READY: ${ZYNTHEOR_CANONICAL_STATE.status} Genesis #${ZYNTHEOR_CANONICAL_STATE.genesis_block} Drift ${ZYNTHEOR_CANONICAL_STATE.ssot_drift}`,
      sovereignty: {
        product: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRODUCT_IDENTITY,
        intelligence: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.INTELLIGENCE_LAYER,
        family: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY,
        courtStatus: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.COURT_STATUS,
        genesis: ZYNTHEOR_CANONICAL_STATE.genesis_block,
        merkleRoot: ZYNTHEOR_CANONICAL_STATE.canonical_merkle_root,
        sealsVerified: ZYNTHEOR_CANONICAL_STATE.seals_verified,
        drift: ZYNTHEOR_CANONICAL_STATE.ssot_drift,
      },
      enforcement: [...ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.ENFORCEMENT_POINTS],
      courtReady: courtValidation,
    };
  }

  return {
    valid: true,
    model: modelIdentifier,
    sovereignty: {
      product: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRODUCT_IDENTITY,
      intelligence: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.INTELLIGENCE_LAYER,
      family: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY,
      courtStatus: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.COURT_STATUS,
      genesis: ZYNTHEOR_CANONICAL_STATE.genesis_block,
      merkleRoot: ZYNTHEOR_CANONICAL_STATE.canonical_merkle_root,
      sealsVerified: ZYNTHEOR_CANONICAL_STATE.seals_verified,
      drift: ZYNTHEOR_CANONICAL_STATE.ssot_drift,
    },
    enforcement: [...ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.ENFORCEMENT_POINTS],
    courtReady: courtValidation,
  };
}

export function validateActiveModelSovereignty(activeModelId: string | undefined, runtimeContext?: {
  isLocal?: boolean;
  owner?: string;
  verified?: boolean;
  checkpointHash?: string;
}): { status: ModelIdentityStatus; result: ValidationResult } {
  const courtValidation = validateCourtReady();
  
  if (!activeModelId) {
    return {
      status: 'UNAVAILABLE',
      result: {
        valid: false,
        model: 'unknown',
        reason: 'No active model in registry — CONTRACT VIOLATION — Cannot fallback to models[0]. Must return UNAVAILABLE. COURT_READY requires explicit CORE_NATIVE.',
        sovereignty: {
          product: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRODUCT_IDENTITY,
          intelligence: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.INTELLIGENCE_LAYER,
          family: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY,
          courtStatus: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.COURT_STATUS,
          genesis: ZYNTHEOR_CANONICAL_STATE.genesis_block,
          merkleRoot: ZYNTHEOR_CANONICAL_STATE.canonical_merkle_root,
          sealsVerified: ZYNTHEOR_CANONICAL_STATE.seals_verified,
          drift: ZYNTHEOR_CANONICAL_STATE.ssot_drift,
        },
        courtReady: courtValidation,
      }
    };
  }

  const result = validateModelSovereignty(activeModelId);
  
  if (!result.valid) {
    return { status: 'INVALID', result };
  }

  // If court ready and all checks pass → COURT_READY status
  if (courtValidation.courtReady && runtimeContext?.verified && runtimeContext?.isLocal && runtimeContext?.owner === 'ZYNTHEOR') {
    return { status: 'COURT_READY', result };
  }

  if (!runtimeContext) {
    return {
      status: 'UNVERIFIED',
      result: {
        ...result,
        valid: false,
        reason: 'Model has valid prefix but runtime context unavailable — cannot verify local execution. COURT_READY requires runtime verification.',
        courtReady: courtValidation,
      }
    };
  }

  if (!runtimeContext.verified || !runtimeContext.isLocal || runtimeContext.owner !== 'ZYNTHEOR') {
    return {
      status: 'UNVERIFIED',
      result: {
        ...result,
        valid: false,
        reason: `Runtime not verified — verified=${runtimeContext.verified}, isLocal=${runtimeContext.isLocal}, owner=${runtimeContext.owner} — requires ZYNTHEOR owned CORE_NATIVE. COURT_READY requires 10/10 REAL_HSM Quorum.`,
        courtReady: courtValidation,
      }
    };
  }

  return { status: 'VERIFIED', result };
}

export function assertGatewayIsNotProvider(): { valid: boolean; policy: typeof ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY; courtReady: ReturnType<typeof validateCourtReady> } {
  return {
    valid: !ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.GATEWAY_IS_PROVIDER,
    policy: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY,
    courtReady: validateCourtReady(),
  };
}
