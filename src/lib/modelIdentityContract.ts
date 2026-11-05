// @ts-nocheck
export * from '../contracts/modelIdentityContract';
import {
  validateModelIdentity as validateModelCategoryIdentity,
  validateDefaultInferenceModel,
  getActiveModel as getContractActiveModel,
  type DefaultInferenceValidationResult,
  type ModelCategory,
  type ModelIdentity,
  type ActiveModelInfo
} from '../contracts/modelIdentityContract';

export type { ActiveModelInfo };

export function getActiveModel(): ActiveModelInfo {
  return getContractActiveModel();
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
