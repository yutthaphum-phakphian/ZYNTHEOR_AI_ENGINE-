export enum ModelIdentityType {
  CORE_NATIVE = 'CORE_NATIVE',       // ฝึกเองด้วย ZYNTHEOR
  CORE_ADAPTED = 'CORE_ADAPTED',     // Fine-tune จาก Qwen/Llama
  CORE_DISTILLED = 'CORE_DISTILLED', // สกัดจากโมเดลใหญ่
  EXTERNAL_PROVIDER = 'EXTERNAL_PROVIDER' // OpenAI/Gemini (ต้องมี Consent)
}

export enum RuntimeStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  NOT_TRAINED = 'NOT_TRAINED',
  UNVERIFIED = 'UNVERIFIED'
}

export interface ModelRegistryEntry {
  id: string;
  name: string;
  identity: ModelIdentityType;
  status: RuntimeStatus;
  checkpointPath: string | null;
  provenance: string;
}
