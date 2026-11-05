/**
 * ZYNTHEOR Model Sovereignty Constants & Validation Standard
 */

export const ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY = {
  PRODUCT_IDENTITY: 'ZYNTHEOR AI ENGINE',
  INTELLIGENCE_LAYER: 'ZYNTHEOR INTELLIGENCE',
  PRIMARY_MODEL_FAMILY: 'ZYNTHEOR CORE',
  ALLOWED_MODEL_PREFIXES: ['zyntheor-core', 'zyntheor-buffalo', 'zyntheor-native'],
  ENFORCE_AIRGAP_CAPABILITY: true,
  GATEWAY_IS_PROVIDER: false, // Internet Gateway is a data source, NOT a model provider
} as const;

export interface ValidationResult {
  valid: boolean;
  model: string;
  reason?: string;
}

/**
 * Validates that an active or requested model strictly adheres to ZYNTHEOR CORE sovereignty rules.
 * 
 * @param modelIdentifier The identifier string of the model attempting execution.
 * @returns ValidationResult indicating compliance status.
 */
export function validateModelSovereignty(modelIdentifier: string): ValidationResult {
  if (!modelIdentifier || typeof modelIdentifier !== 'string') {
    return {
      valid: false,
      model: modelIdentifier,
      reason: 'Invalid or missing model identifier.',
    };
  }

  const normalized = modelIdentifier.toLowerCase().trim();
  const isCompliant = ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.ALLOWED_MODEL_PREFIXES.some(
    (prefix) => normalized.startsWith(prefix)
  );

  if (!isCompliant) {
    return {
      valid: false,
      model: modelIdentifier,
      reason: `Model '${modelIdentifier}' violates ZYNTHEOR CORE sovereignty policy. Primary execution must route through ${ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL_FAMILY}.`,
    };
  }

  return {
    valid: true,
    model: modelIdentifier,
  };
}
