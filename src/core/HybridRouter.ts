export type ProviderType = 'LOCAL_NATIVE' | 'CLOUD_API';
export type PrivacyLevel = 'STRICT_LOCAL' | 'STANDARD' | 'MAX_PERFORMANCE';

export interface RoutingContext {
  prompt: string;
  tokenCount: number;
  userPrivacyPreference: PrivacyLevel;
  requiresHighReasoning: boolean;
  userConsentForCloud?: boolean; // 🛑 ต้องมี Consent ชัดเจน
}

export class HybridRouter {
  static determineProvider(context: RoutingContext): { provider: ProviderType; reason: string } {
    
    // 1. ถ้าผู้ใช้เลือก STRICT_LOCAL ห้ามส่งออก Cloud เด็ดขาด (Sovereign Control)
    if (context.userPrivacyPreference === 'STRICT_LOCAL') {
      return { 
        provider: 'LOCAL_NATIVE', 
        reason: 'User privacy preference is STRICT_LOCAL. Enforcing local execution only.' 
      };
    }

    // 2. ถ้างานต้องการ Reasoning สูงมาก (เช่น แก้โค้ดซับซ้อน, วิเคราะห์สถาปัตยกรรม)
    // และผู้ใช้ยินยอมให้ใช้ Cloud
    if (context.requiresHighReasoning && context.userConsentForCloud) {
      return { 
        provider: 'CLOUD_API', 
        reason: 'High reasoning required and user consented to cloud execution.' 
      };
    }

    // 3. ถ้า Context Window ใหญ่เกินกว่า Local Model จะรับไหว (เช่น อ่านไฟล์ 100 ไฟล์)
    if (context.tokenCount > 32000) {
      if (context.userConsentForCloud) {
        return { 
          provider: 'CLOUD_API', 
          reason: 'Context length exceeds local window. Cloud consent granted.' 
        };
      } else {
        throw new Error('BLOCKED: Context length exceeds local capacity, and user denied cloud consent.');
      }
    }

    // 4. Default: ใช้ Local เสมอถ้าไม่ตรงเงื่อนไขข้างบน
    return { 
      provider: 'LOCAL_NATIVE', 
      reason: 'Defaulting to Local Native for standard tasks.' 
    };
  }
}
