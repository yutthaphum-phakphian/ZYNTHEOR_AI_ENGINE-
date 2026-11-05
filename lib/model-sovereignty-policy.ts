/**
 * ZYNTHEOR MODEL SOVEREIGNTY POLICY & GOVERNANCE CONTRACT
 * ========================================================
 * Absolute Architectural Constraint:
 * 1. PRIMARY_MODEL = 'ZYNTHEOR_CORE'
 * 2. AUTO_PROVIDER_FALLBACK = false (Fail-closed on CORE unavailability)
 * 3. EXTERNAL_MODEL_ROUTING = 'EXPLICIT_ONLY' (Never silent substitution)
 * 4. INTERNET_AS_MODEL_PROVIDER = false (Internet is an information source, not a model provider)
 * 5. CORE_UNAVAILABLE = 'FAIL_CLOSED'
 *
 * Supported Model Identity Categories:
 * - CORE_NATIVE: Random-init weights trained from scratch with cryptographic provenance.
 * - CORE_ADAPTED: Open foundation weights adapted/fine-tuned by ZYNTHEOR with verifiable lineage.
 * - CORE_DISTILLED: First-party distilled model with reproducible distillation dataset & checkpoints.
 * - EXTERNAL_MODEL_PROVIDER: Third-party models (Google Gemini, OpenAI, Anthropic, etc.).
 *   MUST be labeled truthfully and never disguised as ZYNTHEOR CORE.
 */

export const MODEL_SOVEREIGNTY_POLICY = Object.freeze({
  PRIMARY_MODEL: 'ZYNTHEOR_CORE',
  AUTO_PROVIDER_FALLBACK: false,
  EXTERNAL_MODEL_ROUTING: 'EXPLICIT_ONLY' as const,
  INTERNET_AS_MODEL_PROVIDER: false,
  CORE_UNAVAILABLE: 'FAIL_CLOSED' as const,
  POLICY_VERSION: '2.0.0-sovereign',
});

export type ModelIdentityCategory =
  | 'CORE_NATIVE'
  | 'CORE_ADAPTED'
  | 'CORE_DISTILLED'
  | 'EXTERNAL_MODEL_PROVIDER';

export type OperatingIntelligenceMode =
  | 'ONLINE_INTELLIGENCE'
  | 'LOCAL_INTELLIGENCE'
  | 'AIRGAP_MODE';

export interface ModelAttribution {
  modelId: string;
  category: ModelIdentityCategory;
  provider: string;
  isFirstParty: boolean;
  provenanceHash?: string;
  license?: string;
  sovereignPolicyCompliant: boolean;
}

export interface SovereigntyEnforcementResult {
  allowed: boolean;
  effectiveModel: string;
  attribution: ModelAttribution;
  operatingMode: OperatingIntelligenceMode;
  error?: string;
  sovereigntyNotice?: string;
}

export function enforceModelSovereigntyPolicy(options: {
  requestedModel?: string;
  requestedProvider?: string;
  explicitExternalConsent?: boolean;
  coreAvailable?: boolean;
  operatingMode?: OperatingIntelligenceMode;
}): SovereigntyEnforcementResult {
  const mode = options.operatingMode || 'LOCAL_INTELLIGENCE';
  const isCoreAvailable = options.coreAvailable ?? true;
  const requestedModel = (options.requestedModel || '').trim();
  const requestedProvider = (options.requestedProvider || '').toLowerCase().trim();

  // 1. Strict Airgap Mode Enforcement
  if (mode === 'AIRGAP_MODE') {
    if (requestedProvider && requestedProvider !== 'core' && requestedProvider !== 'local') {
      return {
        allowed: false,
        effectiveModel: 'BLOCKED_BY_AIRGAP',
        attribution: {
          modelId: 'AIRGAP_BLOCKED',
          category: 'CORE_NATIVE',
          provider: 'ZYNTHEOR_LOCAL',
          isFirstParty: true,
          sovereignPolicyCompliant: true,
        },
        operatingMode: 'AIRGAP_MODE',
        error: 'AIRGAP_POLICY_VIOLATION: Outbound model provider calls are strictly prohibited in Airgap Mode.',
      };
    }
  }

  // 2. Explicit External Model Routing Check
  const isExternalRequested =
    Boolean(requestedProvider && requestedProvider !== 'core' && requestedProvider !== 'local') ||
    requestedModel.startsWith('gemini') ||
    requestedModel.startsWith('gpt-') ||
    requestedModel.startsWith('claude-');

  if (isExternalRequested) {
    if (!options.explicitExternalConsent) {
      return {
        allowed: false,
        effectiveModel: 'ZYNTHEOR_CORE_REJECTED_EXTERNAL',
        attribution: {
          modelId: 'ZYNTHEOR_CORE',
          category: 'CORE_ADAPTED',
          provider: 'ZYNTHEOR',
          isFirstParty: true,
          sovereignPolicyCompliant: true,
        },
        operatingMode: mode,
        error: 'EXTERNAL_MODEL_ROUTING_UNAUTHORIZED: External models require explicit user opt-in and consent. Auto-routing to external models is forbidden by Model Sovereignty Policy.',
      };
    }

    // External provider explicitly chosen
    return {
      allowed: true,
      effectiveModel: requestedModel || 'external-provider-model',
      attribution: {
        modelId: requestedModel || 'external-provider-model',
        category: 'EXTERNAL_MODEL_PROVIDER',
        provider: requestedProvider || 'external',
        isFirstParty: false,
        sovereignPolicyCompliant: true,
      },
      operatingMode: mode,
      sovereigntyNotice: 'EXTERNAL_MODEL_ACTIVE: Running under explicit user selection. Output is attributed to the external provider and is NOT ZYNTHEOR CORE.',
    };
  }

  // 3. First-party ZYNTHEOR CORE Primary Path
  if (!isCoreAvailable) {
    // FAIL-CLOSED: NEVER silently fallback to Gemini or OpenAI
    return {
      allowed: false,
      effectiveModel: 'CORE_OFFLINE',
      attribution: {
        modelId: 'ZYNTHEOR_CORE_PRIMARY',
        category: 'CORE_ADAPTED',
        provider: 'ZYNTHEOR',
        isFirstParty: true,
        sovereignPolicyCompliant: true,
      },
      operatingMode: mode,
      error: 'CORE_UNAVAILABLE_FAIL_CLOSED: ZYNTHEOR CORE is currently unavailable or offline. Under Model Sovereignty Policy, automatic fallback to third-party models is strictly prohibited.',
    };
  }

  // Normal compliant CORE execution
  return {
    allowed: true,
    effectiveModel: requestedModel || 'ZYNTHEOR_CORE',
    attribution: {
      modelId: 'ZYNTHEOR_CORE',
      category: 'CORE_ADAPTED',
      provider: 'ZYNTHEOR',
      isFirstParty: true,
      sovereignPolicyCompliant: true,
    },
    operatingMode: mode,
  };
}
