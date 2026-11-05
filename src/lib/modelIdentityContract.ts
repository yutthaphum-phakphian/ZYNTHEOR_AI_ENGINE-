// @ts-nocheck
export * from '../contracts/modelIdentityContract';

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

export function validateModelIdentity(model: any) {
  if (!model || typeof model !== 'object') {
    return { valid: false, errors: ['No model object provided'] };
  }
  const errors: string[] = [];
  if (!model.modelId) errors.push('Missing modelId');
  if (model.status === 'SPECIFICATION_LOCKED_PENDING_GPU_RUN' && model.isVerified) {
    errors.push('Model claimed verified without trained checkpoint');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
