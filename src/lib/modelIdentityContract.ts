// @ts-nocheck
export * from '../contracts/modelIdentityContract';
import {
  validateModelIdentity as validateModelCategoryIdentity,
  validateDefaultInferenceModel,
  type DefaultInferenceValidationResult,
  type ModelCategory
} from '../contracts/modelIdentityContract';

export interface ActiveModelInfo {
  modelId: string;
  displayName: string;
  category: string;
  status: string;
  baseModel?: string;
  provider: string;
  provenance: string;
  isVerified: boolean;
  license: string;
}

export function getActiveModel(): ActiveModelInfo {
  return {
    modelId: 'zyntheor-core-0.10.0-foundation',
    displayName: 'ZYNTHEOR CORE 0.1 (Foundation Spec)',
    category: 'CORE_ADAPTED',
    status: 'SPECIFICATION_LOCKED_PENDING_GPU_RUN',
    baseModel: 'Qwen/Qwen2.5-Coder-7B-Instruct',
    provider: 'ZYNTHEOR',
    provenance: 'Specification-locked native model family. Governed zero-mock policy.',
    isVerified: false,
    license: 'Apache-2.0',
  };
}

/**
 * Validates model identity supporting both contract validation overloads:
 * 1. validateModelIdentity(modelId: string, claimedCategory: ModelCategory)
 * 2. validateModelIdentity(modelObject: ActiveModelInfo | any)
 */
export function validateModelIdentity(arg1: any, arg2?: ModelCategory) {
  if (typeof arg1 === 'string') {
    return validateModelCategoryIdentity(arg1, arg2 as ModelCategory);
  }

  // Model object validation
  const model = arg1;
  if (!model || typeof model !== 'object') {
    return { valid: false, errors: ['No model object provided'], isZyntheorCore: false };
  }

  const defaultValidation = validateDefaultInferenceModel(model);
  const errors: string[] = [...defaultValidation.errors];

  return {
    valid: defaultValidation.valid,
    isZyntheorCore: defaultValidation.isZyntheorCore,
    modelId: defaultValidation.modelId,
    unauthorizedFallback: defaultValidation.unauthorizedFallback,
    errors,
    reason: defaultValidation.reason,
    timestamp: defaultValidation.timestamp,
  };
}
