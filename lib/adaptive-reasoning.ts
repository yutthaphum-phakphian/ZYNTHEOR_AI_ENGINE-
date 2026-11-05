/**
 * ZYNTHEOR INTELLIGENCE ENGINE — ADAPTIVE REASONING MODULE
 * ========================================================
 * Dynamically adjusts model parameters (temperature, topP, CoT depth,
 * reasoning tokens, verification gates) based on inferred complexity of user input.
 *
 * Tiers:
 * 1. TIER_1_DIRECT: Greetings, conversational, simple factual lookup (low CoT, higher temp)
 * 2. TIER_2_BALANCED: Explanations, summarization, drafting (medium CoT, balanced temp)
 * 3. TIER_3_DEEP: Logic, architecture, multi-file reasoning, root cause (deep CoT, low temp)
 * 4. TIER_4_CRITICAL: High-risk mutations, security, migration, audit (max CoT, deterministic, human gate)
 */

export type ComplexityTier =
  | 'TIER_1_DIRECT'
  | 'TIER_2_BALANCED'
  | 'TIER_3_DEEP'
  | 'TIER_4_CRITICAL';

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'maximum';

export interface ReasoningParameters {
  temperature: number;
  topP: number;
  cotDepth: number; // 0 to 8 steps
  reasoningEffort: ReasoningEffort;
  reasoningBudget: number; // explicit token budget allocated for internal thinking
  chainOfThoughtBudget: number; // alias for reasoningBudget
  planningDepth: number; // step count for problem decomposition (0 to 8)
  verificationBudget: number; // number of verification & falsification passes (0 to 5)
  maxOutputTokens: number;
  requiredVerifications: string[];
  executionStrategy: 'DIRECT_INFERENCE' | 'STRUCTURED_REASONING' | 'VERIFIED_CHAIN_OF_THOUGHT' | 'GOVERNED_MULTI_STEP_AGENT';
}

export interface AdaptiveReasoningResult {
  tier: ComplexityTier;
  complexityScore: number; // 0 to 100
  tierLabel: string;
  tierLabelThai: string;
  parameters: ReasoningParameters;
  inferredFactors: {
    hasCode: boolean;
    hasMultiStepClauses: boolean;
    hasLogicalDeduction: boolean;
    hasArchitecturalDesign: boolean;
    hasRestrictedOrHighRisk: boolean;
    hasMathematicalNotation: boolean;
    documentsCount: number;
    imagesCount: number;
    textLength: number;
  };
  reasoningPlan: string[];
  explanation: string;
}

export class AdaptiveReasoningEngine {
  /**
   * Infer the complexity of input and return dynamically calibrated model parameters
   */
  public inferComplexity(
    query: string,
    context?: {
      documentsCount?: number;
      imagesCount?: number;
      hasCode?: boolean;
      historyLength?: number;
      modeHint?: string;
    }
  ): AdaptiveReasoningResult {
    const text = (query || '').trim();
    const lower = text.toLowerCase();
    const docCount = context?.documentsCount || 0;
    const imgCount = context?.imagesCount || 0;

    // 1. Feature Extraction
    const hasCode =
      context?.hasCode ||
      /```[\s\S]*?```/.test(text) ||
      /(const|let|var|function|class|import|export|interface|def|return|SELECT|FROM|WHERE|sql|nosql|schema)/i.test(text);

    const hasMultiStepClauses =
      /(step|ขั้นตอน|ก่อนอื่น|จากนั้น|ถัดไป|แล้วค่อย|เปรียบเทียบ|ข้อแตกต่าง|ความแตกต่าง|สรุป|อธิบาย|เป็นข้อ|pros and cons|trade-?off|alternatives)/i.test(lower) ||
      /(1\.|2\.|3\.|first|second|then|finally)/i.test(lower);

    const hasLogicalDeduction =
      /(เพราะเหตุใด|ทำไม|ทำความเข้าใจ|วิเคราะห์สาเหตุ|พิสูจน์|ตรรกะ|สมมติฐาน|why|prove|deduce|logic|inference|hypothesis|root cause)/i.test(lower);

    const hasArchitecturalDesign =
      /(สถาปัตยกรรม|โครงสร้างระบบ|microservice|database schema|distributed|scalability|system design|architecture|pipeline|lifecycle)/i.test(lower);

    const hasRestrictedOrHighRisk =
      /(delete|drop|mutate|migrate|production|deploy|credentials|permission|secret|rm -rf|overwrite|audit seal|hardware enclave|ลบ|ทำลาย)/i.test(lower);

    const hasMathematicalNotation =
      /[∑∏∫√≠≤≥≈∞\^]/.test(text) ||
      /(matrix|eigen|vector|integral|derivative|probability|algorithm|complexity O\()/i.test(lower);

    // 2. Score Calculation (0 - 100)
    let score = 10; // Baseline for any query

    // Length factor
    if (text.length > 500) score += 15;
    else if (text.length > 200) score += 10;
    else if (text.length > 60) score += 5;
    else if (text.length < 20 && !hasCode && !hasLogicalDeduction) score -= 5;

    // Multimodal attachments factor
    if (docCount > 0) score += Math.min(20, docCount * 10);
    if (imgCount > 0) score += Math.min(15, imgCount * 8);

    // Contextual and semantic flags
    if (hasCode) score += 15;
    if (hasMultiStepClauses) score += 15;
    if (hasLogicalDeduction) score += 20;
    if (hasArchitecturalDesign) score += 25;
    if (hasMathematicalNotation) score += 20;
    if (hasRestrictedOrHighRisk) {
      score += 45;
      // Extra boost if production or destructive
      if (/production|delete|drop|rm -rf/i.test(lower)) score += 15;
    }

    // Greeting / trivial suppression
    const isGreeting = /^(สวัสดี|hi|hello|hey|test|ping|สบายดีไหม|ขอบคุณ|thank you)[\s!.]*$/i.test(lower);
    if (isGreeting && docCount === 0 && imgCount === 0) {
      score = 5;
    }

    // Bound score
    score = Math.max(5, Math.min(100, score));

    // 3. Tier Classification and Calibration
    let tier: ComplexityTier;
    let tierLabel: string;
    let tierLabelThai: string;
    let parameters: ReasoningParameters;
    let reasoningPlan: string[];
    let explanation: string;

    if (score <= 25) {
      tier = 'TIER_1_DIRECT';
      tierLabel = 'Direct / Conversational';
      tierLabelThai = 'การตอบสนองโดยตรง (รวดเร็ว ทั่วไป)';
      parameters = {
        temperature: 0.7,
        topP: 0.95,
        cotDepth: 0,
        reasoningEffort: 'minimal',
        reasoningBudget: 0,
        chainOfThoughtBudget: 0,
        planningDepth: 1,
        verificationBudget: 0,
        maxOutputTokens: 1024,
        requiredVerifications: [],
        executionStrategy: 'DIRECT_INFERENCE',
      };
      reasoningPlan = ['Direct Intent Parsing', 'Immediate Response Generation'];
      explanation = 'คำถามสั้นหรือการสนทนาทั่วไป ระบบใช้โหมดประมวลผลตรงโดยไม่มี Chain-of-Thought เพื่อความรวดเร็ว';
    } else if (score <= 55) {
      tier = 'TIER_2_BALANCED';
      tierLabel = 'Balanced / Analytical';
      tierLabelThai = 'การคิดแบบสมดุล (การอธิบายและเรียบเรียง)';
      parameters = {
        temperature: 0.4,
        topP: 0.90,
        cotDepth: 2,
        reasoningEffort: 'medium',
        reasoningBudget: 512,
        chainOfThoughtBudget: 512,
        planningDepth: 3,
        verificationBudget: 1,
        maxOutputTokens: 2048,
        requiredVerifications: ['SYNTACTIC_CHECK'],
        executionStrategy: 'STRUCTURED_REASONING',
      };
      reasoningPlan = [
        'Intent & Context Analysis',
        'Key Points Structuring',
        'Clear & Verified Synthesis'
      ];
      explanation = 'งานต้องการการวิเคราะห์หรือเรียบเรียงเนื้อหา ระบบปรับอุณหภูมิลงและเปิดใช้การคิดแบบโครงสร้าง 2 ขั้นตอน พร้อม Verification Budget = 1';
    } else if (score <= 80) {
      tier = 'TIER_3_DEEP';
      tierLabel = 'Deep Reasoning / Multi-Layer';
      tierLabelThai = 'การให้เหตุผลเชิงลึก (ตรรกะและสถาปัตยกรรม)';
      parameters = {
        temperature: 0.15,
        topP: 0.85,
        cotDepth: 4,
        reasoningEffort: 'high',
        reasoningBudget: 2048,
        chainOfThoughtBudget: 2048,
        planningDepth: 5,
        verificationBudget: 3,
        maxOutputTokens: 4096,
        requiredVerifications: ['LOGICAL_CONSISTENCY', 'EVIDENCE_PROVENANCE', 'ROOT_CAUSE_ISOLATION'],
        executionStrategy: 'VERIFIED_CHAIN_OF_THOUGHT',
      };
      reasoningPlan = [
        'Problem Decomposition & Constraint Mapping',
        'Hypothesis Generation & Edge-Case Identification',
        'Cross-Layer Logical Verification',
        'Rigorous Synthesis with Provenance'
      ];
      explanation = 'ตรวจพบโจทย์ตรรกะ สถาปัตยกรรม หรือการหาสาเหตุเชิงลึก ระบบจัดสรร Reasoning Budget 2,048 tokens, Planning Depth 5 ขั้น และ Verification Budget 3 รอบ';
    } else {
      tier = 'TIER_4_CRITICAL';
      tierLabel = 'Autonomous / Critical Governance';
      tierLabelThai = 'การประมวลผลวิกฤต (ความปลอดภัยและกำกับดูแล)';
      parameters = {
        temperature: 0.05,
        topP: 0.80,
        cotDepth: 6,
        reasoningEffort: 'maximum',
        reasoningBudget: 4096,
        chainOfThoughtBudget: 4096,
        planningDepth: 8,
        verificationBudget: 5,
        maxOutputTokens: 8192,
        requiredVerifications: [
          'LOGICAL_CONSISTENCY',
          'EVIDENCE_PROVENANCE',
          'FAIL_CLOSED_GATE',
          'HUMAN_APPROVAL_GATE',
          'CRYPTOGRAPHIC_AUDIT_SEAL'
        ],
        executionStrategy: 'GOVERNED_MULTI_STEP_AGENT',
      };
      reasoningPlan = [
        'Security & Impact Boundary Assessment',
        'Fail-Closed State Machine Validation',
        'Step-by-Step Multi-Phase Rollback Strategy',
        'Evidence Cryptographic Seal Check',
        'Human Approval Enforcement',
        'Controlled Execution and Audit Recording'
      ];
      explanation = 'ตรวจพบการกระทำที่มีความเสี่ยงสูงหรือการเปลี่ยนแปลงโครงสร้างหลัก ระบบจัดสรร Reasoning Budget 4,096 tokens, Planning Depth 8 ขั้น, Verification Budget 5 รอบ และบังคับผ่านประตูการอนุมัติ';
    }

    return {
      tier,
      complexityScore: score,
      tierLabel,
      tierLabelThai,
      parameters,
      inferredFactors: {
        hasCode,
        hasMultiStepClauses,
        hasLogicalDeduction,
        hasArchitecturalDesign,
        hasRestrictedOrHighRisk,
        hasMathematicalNotation,
        documentsCount: docCount,
        imagesCount: imgCount,
        textLength: text.length,
      },
      reasoningPlan,
      explanation,
    };
  }
}

export const adaptiveReasoningEngine = new AdaptiveReasoningEngine();
export const AdaptiveReasoningModule = AdaptiveReasoningEngine;
export const adaptiveReasoningModule = adaptiveReasoningEngine;
