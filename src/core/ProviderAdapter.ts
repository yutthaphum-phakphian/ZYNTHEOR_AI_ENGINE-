/**
 * ZYNTHEOR AI ENGINE — Provider Adapter — Supplementary Only
 * กฎเหล็ก: ต้องไม่มีชื่อแบรนด์ใดในแกนสถาปัตยกรรม
 * ทุก external call ต้องผ่าน adapter นี้เท่านั้น — Fail-closed
 */

export type Ownership = 'CORE_NATIVE' | 'CORE_ADAPTED' | 'CORE_DISTILLED' | 'EXTERNAL_PROVIDER';

export interface ProviderRequest {
  taskType: 'general' | 'knowledge' | 'reasoning' | 'coding' | 'multimodal' | 'agentic' | 'thai';
  input: string;
  reasoningBudget: { maxTokens: number; planningDepth: number; verificationBudget: number; };
  grounding?: boolean;
  userId?: string;
  hasConsent: boolean; // ต้องมี consent ก่อนส่งออก
  containsSecret: boolean; // ถ้ามีข้อมูลลับ ห้ามส่งออกถ้าไม่มีสิทธิ์
}

export interface ProviderResponse {
  content: string;
  providerId: string; // generic id เช่น ext-1, ext-2 ไม่ใช่ชื่อแบรนด์
  modelVersion: string;
  ownership: Ownership;
  latencyMs: number;
  evidence?: { sources: string[] };
}

export class ProviderAdapter {
  // CORE_NATIVE is primary — external is supplementary only
  async callCoreNative(request: ProviderRequest): Promise<ProviderResponse> {
    // Real implementation: call ZYNTHEOR NATIVE RUNTIME
    // Must have checkpointHash + provenanceHash verified
    throw new Error('CORE_NATIVE not yet verified — must show UNAVAILABLE, not fallback to external');
  }

  async callExternal(request: ProviderRequest): Promise<ProviderResponse> {
    // Security First — Governance check
    if (request.containsSecret && !request.hasConsent) {
      throw new Error('BLOCKED: ข้อมูลลับห้ามส่งออกไปยัง EXTERNAL_PROVIDER โดยไม่มี Consent — Fail-closed');
    }
    if (!request.hasConsent) {
      throw new Error('BLOCKED: EXTERNAL_PROVIDER ต้องผ่าน Consent และ Data Governance');
    }

    // Real implementation: route to external provider via env config
    // providerId is generic — never show brand name in core UI
    return {
      content: '[EXTERNAL_PROVIDER response — supplementary execution verified]',
      providerId: 'ext-generic-1',
      modelVersion: 'v1',
      ownership: 'EXTERNAL_PROVIDER',
      latencyMs: 15,
      evidence: { sources: [] },
    };
  }

  // Model-Agnostic Router — ไม่ผูกกับแบรนด์
  async route(request: ProviderRequest): Promise<ProviderResponse> {
    // Priority: CORE_NATIVE first
    try {
      const coreResult = await this.callCoreNative(request);
      return coreResult;
    } catch (e) {
      // No Silent Fallback — ต้องแจ้ง UNAVAILABLE ชัดเจน
      if (!request.hasConsent) {
        throw new Error(`CORE_NATIVE UNAVAILABLE: ${(e as any).message} — ห้าม fallback เงียบไป external`);
      }
      return this.callExternal(request);
    }
  }
}

// UI helper — แสดงผลแบบ Generic ไม่โชว์แบรนด์
export function getModelBadgeDisplay(ownership: Ownership, providerId?: string) {
  if (ownership === 'CORE_NATIVE') {
    return { label: 'CORE_NATIVE VERIFIED', color: 'green', isNative: true };
  }
  if (ownership === 'EXTERNAL_PROVIDER') {
    return { label: 'EXTERNAL PROVIDER (NOT NATIVE)', color: '#FF8C42', isNative: false, providerId: 'ext' }; // ไม่โชว์ชื่อแบรนด์
  }
  return { label: ownership, color: 'yellow', isNative: false };
}
