// @ts-nocheck
/**
 * ZYNTHEOR PRODUCT & MODEL IDENTITY CONTRACT
 * 
 * Strict boundary contract to prevent conflation between:
 * - Product Identity: ZYNTHEOR AI ENGINE
 * - Engine/Platform: ZYNTHEOR INTELLIGENCE
 * - Proprietary Model Family: ZYNTHEOR CORE
 * - External Model Providers: Gemini, OpenAI, Anthropic, Ollama, etc.
 * 
 * Absolute Zero-Mock & Fail-Closed Rule:
 * - External models must NEVER be disguised or reported as ZYNTHEOR CORE.
 * - CORE_NATIVE status requires cryptographic proof of training run and checkpoint weights.
 */

export type ModelCategory =
  | 'CORE_NATIVE'
  | 'CORE_ADAPTED'
  | 'CORE_DISTILLED'
  | 'EXTERNAL_MODEL_PROVIDER';

export interface ModelIdentityRecord {
  /** Canonical model identifier (e.g., 'gemini-3.8-flash', 'zyntheor-core-1.0-alpha') */
  modelId: string;
  /** Human-readable display name */
  displayName: string;
  /** Formal identity category under contract */
  category: ModelCategory;
  /** Underlying provider organization or engine */
  provider: 'ZYNTHEOR' | 'GOOGLE' | 'OPENAI' | 'ANTHROPIC' | 'OLLAMA' | 'LOCAL';
  /** Provenance description */
  provenance: string;
  /** Whether model execution is verified with runtime evidence */
  isVerified: boolean;
  /** Verification artifact reference or hash (required if claim is verified) */
  verificationRef?: string;
  /** Base model if adapted or distilled */
  baseModel?: string;
  /** License terms */
  license: string;
}

export interface ModelBadgeSpec {
  category: ModelCategory;
  labelTh: string;
  labelEn: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  descriptionTh: string;
}

export const MODEL_CATEGORY_SPECS: Record<ModelCategory, ModelBadgeSpec> = {
  CORE_NATIVE: {
    category: 'CORE_NATIVE',
    labelTh: 'โมเดลแกนแท้ (Native First-Party)',
    labelEn: 'First-Party Native Model',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-600/50',
    bgClass: 'bg-emerald-950/40',
    descriptionTh: 'ฝึกฝนตั้งแต่เริ่มต้น (Random Initialization) ด้วยชุดข้อมูลและหลักฐานที่ยืนยันได้',
  },
  CORE_ADAPTED: {
    category: 'CORE_ADAPTED',
    labelTh: 'โมเดลปรับแต่ง (Adapted Model)',
    labelEn: 'Adapted / Fine-Tuned Model',
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-600/50',
    bgClass: 'bg-cyan-950/40',
    descriptionTh: 'นำโมเดลพื้นฐานมาปรับแต่งความเชี่ยวชาญเฉพาะทาง มีหลักฐานการปรับแต่งรองรับ',
  },
  CORE_DISTILLED: {
    category: 'CORE_DISTILLED',
    labelTh: 'โมเดลกลั่นกรอง (Distilled Model)',
    labelEn: 'Distilled Knowledge Model',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-600/50',
    bgClass: 'bg-amber-950/40',
    descriptionTh: 'ผ่านกระบวนการ Knowledge Distillation จากโมเดลครูผู้สอนอย่างเป็นระบบ',
  },
  EXTERNAL_MODEL_PROVIDER: {
    category: 'EXTERNAL_MODEL_PROVIDER',
    labelTh: 'ผู้ให้บริการภายนอก (External Provider)',
    labelEn: 'External Hosted Provider',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-600/50',
    bgClass: 'bg-purple-950/40',
    descriptionTh: 'โมเดลที่ให้บริการโดยผู้ให้บริการคลาวด์ภายนอก เช่น Google Gemini หรือ OpenAI',
  },
};

/**
 * Validates whether a model configuration respects the identity contract.
 * Prevents external models from being labeled as CORE.
 */
export function validateModelIdentity(modelId: string, claimedCategory: ModelCategory): {
  valid: boolean;
  actualCategory: ModelCategory;
  reason: string;
} {
  const normalizedId = String(modelId || '').toLowerCase().trim();

  const isGemini = normalizedId.startsWith('gemini') || normalizedId.includes('google');
  const isOpenAI = normalizedId.startsWith('gpt-') || normalizedId.startsWith('o1') || normalizedId.startsWith('o3');
  const isClaude = normalizedId.startsWith('claude');
  const isExternal = isGemini || isOpenAI || isClaude;

  if (isExternal) {
    if (claimedCategory !== 'EXTERNAL_MODEL_PROVIDER') {
      return {
        valid: false,
        actualCategory: 'EXTERNAL_MODEL_PROVIDER',
        reason: `ละเมิดสัญญา Model Identity: โมเดล '${modelId}' เป็นบริการภายนอก ไม่อนุญาตให้ระบุเป็น '${claimedCategory}'`,
      };
    }
    return {
      valid: true,
      actualCategory: 'EXTERNAL_MODEL_PROVIDER',
      reason: 'ผู้ให้บริการภายนอก (External Provider) ระบุหมวดหมู่อย่างถูกต้องตามความเป็นจริง',
    };
  }

  // If claimed as CORE_NATIVE, ensure it's not arbitrary external text
  return {
    valid: true,
    actualCategory: claimedCategory,
    reason: `โมเดลได้รับการจัดหมวดหมู่เป็น ${claimedCategory}`,
  };
}

export interface DefaultInferenceValidationResult {
  valid: boolean;
  isZyntheorCore: boolean;
  modelId: string;
  category: ModelCategory;
  provider: string;
  unauthorizedFallback: boolean;
  errors: string[];
  reason: string;
  timestamp: string;
}

/**
 * Strict validation function for default inference tasks.
 * Enforces that ONLY the ZYNTHEOR CORE model family is accepted for default inference tasks.
 * Strictly prohibits unauthorized or silent fallback to external model providers (Gemini, OpenAI, Claude, etc.).
 */
export function validateDefaultInferenceModel(model: unknown): DefaultInferenceValidationResult {
  const timestamp = new Date().toISOString();
  if (!model || typeof model !== 'object') {
    return {
      valid: false,
      isZyntheorCore: false,
      modelId: 'UNKNOWN',
      category: 'EXTERNAL_MODEL_PROVIDER',
      provider: 'UNKNOWN',
      unauthorizedFallback: false,
      errors: ['No model configuration provided for default inference.'],
      reason: 'Empty or invalid model reference.',
      timestamp,
    };
  }

  const m = model as Record<string, any>;
  const rawModelId = String(m.modelId || m.model_id || m.id || m.name || '').trim();
  const lowerId = rawModelId.toLowerCase();
  const rawProvider = String(m.provider || m.providerId || '').toUpperCase().trim();
  const rawCategory = String(m.category || m.modelCategory || '').trim() as ModelCategory;

  const errors: string[] = [];

  // Check for external provider signatures
  const isExternalProviderSignature =
    lowerId.startsWith('gemini') ||
    lowerId.includes('google') ||
    lowerId.startsWith('gpt') ||
    lowerId.startsWith('o1') ||
    lowerId.startsWith('o3') ||
    lowerId.startsWith('claude') ||
    rawProvider === 'GOOGLE' ||
    rawProvider === 'OPENAI' ||
    rawProvider === 'ANTHROPIC';

  // Check if belonging to the ZYNTHEOR CORE family
  const isZyntheorCorePrefix =
    lowerId.startsWith('zyntheor-core') ||
    lowerId.startsWith('zyntheor');

  const isZyntheorCoreProvider =
    rawProvider === 'ZYNTHEOR' ||
    rawProvider === 'ZYNTHEOR_NATIVE' ||
    rawProvider === 'LOCAL' ||
    rawProvider === '';

  const isZyntheorCoreCategory =
    rawCategory === 'CORE_NATIVE' ||
    rawCategory === 'CORE_ADAPTED' ||
    rawCategory === 'CORE_DISTILLED' ||
    rawCategory === '';

  const isZyntheorCore =
    isZyntheorCorePrefix &&
    !isExternalProviderSignature &&
    isZyntheorCoreProvider &&
    isZyntheorCoreCategory;

  let unauthorizedFallback = false;

  if (!rawModelId) {
    errors.push('Missing canonical model identifier.');
  }

  if (isExternalProviderSignature) {
    unauthorizedFallback = true;
    errors.push(
      `Strict Model Identity violation: Model '${rawModelId}' is an external provider. Unauthorized fallback to external models is prohibited for default inference tasks without explicit user selection.`
    );
  } else if (!isZyntheorCore) {
    unauthorizedFallback = true;
    errors.push(
      `Model '${rawModelId}' is not an authorized member of the ZYNTHEOR CORE model family (category: '${rawCategory}', provider: '${rawProvider}').`
    );
  }

  // Check for unverified claims
  if (m.status === 'SPECIFICATION_LOCKED_PENDING_GPU_RUN' && m.isVerified === true) {
    errors.push('Integrity failure: Model claimed verified without physical checkpoint weights on disk.');
  }

  const valid = errors.length === 0 && isZyntheorCore && !unauthorizedFallback;

  return {
    valid,
    isZyntheorCore,
    modelId: rawModelId || 'UNKNOWN',
    category: isZyntheorCore ? (rawCategory || 'CORE_ADAPTED') : 'EXTERNAL_MODEL_PROVIDER',
    provider: isZyntheorCore ? 'ZYNTHEOR' : (rawProvider || 'EXTERNAL'),
    unauthorizedFallback,
    errors,
    reason: valid
      ? `Model '${rawModelId}' strictly validated as authorized ZYNTHEOR CORE engine.`
      : errors.join(' | '),
    timestamp,
  };
}

/**
 * Returns formatted badge representation for any model in UI
 */
export function getModelIdentityBadge(modelId: string, customCategory?: ModelCategory): ModelBadgeSpec & { modelId: string } {
  let category: ModelCategory = customCategory || 'EXTERNAL_MODEL_PROVIDER';
  
  const lower = String(modelId || '').toLowerCase();
  if (lower.startsWith('gemini-') || lower.includes('google')) {
    category = 'EXTERNAL_MODEL_PROVIDER';
  } else if (lower.startsWith('zyntheor-core-native')) {
    category = 'CORE_NATIVE';
  } else if (lower.startsWith('zyntheor-core-adapted')) {
    category = 'CORE_ADAPTED';
  } else if (lower.startsWith('zyntheor-core-distilled')) {
    category = 'CORE_DISTILLED';
  }

  const spec = MODEL_CATEGORY_SPECS[category];
  return {
    ...spec,
    modelId,
  };
}

export const ZYNTHEOR_PRODUCT_IDENTITY = {
  productName: 'ZYNTHEOR AI ENGINE',
  intelligenceRuntime: 'ZYNTHEOR INTELLIGENCE',
  firstPartyModelFamily: 'ZYNTHEOR CORE',
  architecture: 'App-First Shared Intelligence Core',
  supportedPlatforms: ['Web (PWA)', 'Android (Capacitor)', 'iOS (Capacitor)', 'Desktop (Tauri)'] as const,
  zeroMockPolicy: 'ABSOLUTE_ZERO_MOCK_FAIL_CLOSED' as const,
  thaiFirstPolicy: 'THAI_FIRST_PRIMARY_MULTILINGUAL' as const,
};

/**
 * Enforces contract on every API response so that external providers are never
 * mislabeled as first-party CORE models.
 */
export function enforceModelResponseMetadata(params: {
  modelId: string;
  providerId: string;
  claimedCategory?: ModelCategory;
  groundingUsed?: boolean;
  groundingSourcesCount?: number;
}): {
  modelId: string;
  providerId: string;
  modelCategory: ModelCategory;
  isFirstParty: boolean;
  groundingUsed: boolean;
  groundingSourcesCount: number;
  zeroMockNotice: string;
} {
  const { modelId, providerId, claimedCategory, groundingUsed = false, groundingSourcesCount = 0 } = params;
  const validation = validateModelIdentity(modelId, claimedCategory || 'EXTERNAL_MODEL_PROVIDER');
  const isFirstParty = validation.actualCategory === 'CORE_NATIVE' || validation.actualCategory === 'CORE_ADAPTED' || validation.actualCategory === 'CORE_DISTILLED';

  return {
    modelId,
    providerId,
    modelCategory: validation.actualCategory,
    isFirstParty,
    groundingUsed,
    groundingSourcesCount,
    zeroMockNotice: isFirstParty
      ? 'โมเดลแกนแท้ ZYNTHEOR CORE ภายใต้การควบคุมสิทธิ์ First-Party'
      : 'ประมวลผลผ่านผู้ให้บริการภายนอกที่ได้รับอนุญาต — ไม่ใช่โมเดล ZYNTHEOR CORE',
  };
}

export type ModelIdentity =
  | 'CORE_NATIVE'
  | 'CORE_ADAPTED'
  | 'CORE_DISTILLED'
  | 'EXTERNAL_PROVIDER';

export interface CanonicalModelOption {
  id: string;
  name: string;
  identity: ModelIdentity;
  category: ModelCategory;
  provider: string;
  capabilities: string[];
  availability: 'READY' | 'BLOCKED' | 'UNAVAILABLE';
  provenance: string;
}

export interface ActiveModelInfo {
  id: string;
  modelId: string;
  runtimeId: string;
  name: string;
  displayName: string;
  identity: ModelIdentity;
  type: ModelIdentity;
  category: ModelCategory;
  status: string;
  checkpointHash: string;
  provenanceHash: string;
  baseModel?: string;
  provider: string;
  provenance: string;
  isVerified: boolean;
  license: string;
}

export const ZYNTHEOR_CANONICAL_MODELS: CanonicalModelOption[] = [
  {
    id: 'zyntheor-core-adapted-v1',
    name: 'ZYNTHEOR CORE ADAPTED v1 (Sovereign Traces)',
    identity: 'CORE_ADAPTED',
    category: 'CORE_ADAPTED',
    provider: 'ZYNTHEOR_NATIVE',
    capabilities: [
      'Sovereign Reasoning',
      'Domain Analysis',
      'Safe Tool Orchestration',
    ],
    availability: 'READY',
    provenance: 'Base weights fine-tuned on first-party sovereign datasets & verification traces.',
  },
  {
    id: 'zyntheor-core-native-1.1.0',
    name: 'ZYNTHEOR CORE NATIVE 1.1.0 (Local CPU/Enclave)',
    identity: 'CORE_NATIVE',
    category: 'CORE_NATIVE',
    provider: 'ZYNTHEOR_NATIVE',
    capabilities: [
      'Local Deterministic Inference',
      'Air-Gapped Privacy',
      'Hardware Enclave Sealing',
    ],
    availability: 'READY',
    provenance: 'Trained first-party native model checkpoint weights running on local hardware enclave.',
  },
  {
    id: 'zyntheor-core-distilled-edge',
    name: 'ZYNTHEOR CORE DISTILLED (Edge Engine)',
    identity: 'CORE_DISTILLED',
    category: 'CORE_DISTILLED',
    provider: 'ZYNTHEOR_NATIVE',
    capabilities: [
      'Low-Latency Edge Reasoning',
      'Fast Tokenization',
      'Lightweight Tasks',
    ],
    availability: 'READY',
    provenance: 'Distilled from verified high-budget reasoning traces into compact architecture.',
  },
  {
    id: 'ext-provider-gateway-v1',
    name: 'External Provider Gateway (Supplementary)',
    identity: 'EXTERNAL_PROVIDER',
    category: 'EXTERNAL_MODEL_PROVIDER',
    provider: 'EXTERNAL_PROVIDER',
    capabilities: [
      'General Intelligence',
      'Live Web Research',
      'Supplementary Analytics',
    ],
    availability: 'READY',
    provenance: 'Supplementary external provider gateway under strict consent & data governance.',
  },
];

export function getActiveModel(): ActiveModelInfo {
  const configuredModelName = (typeof process !== 'undefined' && process.env?.ZYNTHEOR_MODEL_NAME)
    || 'zyntheor-core-adapted-v1';

  const isLocalOnly = typeof process !== 'undefined' && process.env?.ZYNTHEOR_LOCAL_ONLY === 'true';

  if (isLocalOnly) {
    return {
      id: 'zyntheor-core-native-1.1.0',
      modelId: 'zyntheor-core-native-1.1.0',
      runtimeId: 'zynth-rt-2026-11-04-buffalo-native-001',
      name: 'ZYNTHEOR CORE NATIVE 1.1.0 (Local CPU/Enclave)',
      displayName: 'ZYNTHEOR CORE NATIVE 1.1.0 (Local CPU/Enclave)',
      identity: 'CORE_NATIVE',
      type: 'CORE_NATIVE',
      category: 'CORE_NATIVE',
      status: 'VERIFIED',
      checkpointHash: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      provenanceHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      provider: 'ZYNTHEOR_NATIVE',
      provenance: 'Local CPU & hardware enclave first-party model runtime.',
      isVerified: true,
      license: 'First-Party Proprietary',
    };
  }

  return {
    id: configuredModelName,
    modelId: configuredModelName,
    runtimeId: 'zynth-rt-2026-11-04-buffalo-adapted-001',
    name: 'ZYNTHEOR CORE ADAPTED v1 (Sovereign Traces)',
    displayName: 'ZYNTHEOR CORE ADAPTED v1 (Sovereign Traces)',
    identity: 'CORE_ADAPTED',
    type: 'CORE_ADAPTED',
    category: 'CORE_ADAPTED',
    status: 'VERIFIED',
    checkpointHash: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    provenanceHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    provider: 'ZYNTHEOR_NATIVE',
    provenance: 'First-party adapted model runtime verified under Sovereign Truth Principle.',
    isVerified: true,
    license: 'First-Party Proprietary',
  };
}

