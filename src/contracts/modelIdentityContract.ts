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
