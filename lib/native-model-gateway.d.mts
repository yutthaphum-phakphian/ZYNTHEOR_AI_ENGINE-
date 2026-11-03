export interface NativeRuntimeProbe { phase: 'P17'; status: string; ready: boolean; model_id?: string; identity?: 'CORE_NATIVE'; checkpoint?: string; checkpoint_sha256?: string; parameter_count?: number; reason?: string; inference_ready?: boolean; production_approved?: boolean; [key: string]: unknown; }
export interface NativeGenerationResult { phase: 'P17'; status: string; model_id: string; identity: 'CORE_NATIVE'; checkpoint_sha256: string; generated_tokens: number; text: string; production_approved: false; }
export function probeNativeRuntime(): Promise<NativeRuntimeProbe>;
export function generateNativeText(prompt: string, options?: { maxNewTokens?: number; timeoutMs?: number }): Promise<NativeGenerationResult>;
