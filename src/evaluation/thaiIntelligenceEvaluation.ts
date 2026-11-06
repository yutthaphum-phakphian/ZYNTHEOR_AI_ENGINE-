/**
 * ZYNTHEOR AI ENGINE — Thai Intelligence Evaluation Framework
 * ZERO FAKE — REAL COMPLETENESS ONLY.
 */

export interface ThaiTestCase {
  id: string;
  category:
    | 'Thai Grammar Understanding'
    | 'Thai Semantic Understanding'
    | 'Thai Compound Words'
    | 'Thai Technical Terminology'
    | 'Thai Reasoning'
    | 'Thai Document Retrieval'
    | 'Thai Multi-Turn Context'
    | 'Thai-English Mixed Language'
    | 'Thai-English Translation'
    | 'Thai Knowledge Synthesis';
  input: string;
  expectedKeywords: string[];
  groundTruth: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const THAI_GROUND_TRUTH_DATASET: ThaiTestCase[] = [
  {
    id: 'thai-eval-001',
    category: 'Thai Technical Terminology',
    input: 'อธิบายความหมายของคำว่า "การประมวลผลบนคลาวด์แบบอธิปไตย" (Sovereign Cloud Computing)',
    expectedKeywords: ['อธิปไตย', 'ความมั่นคงปลอดภัย', 'ข้อมูล', 'การจัดเก็บ'],
    groundTruth: 'Sovereign Cloud Computing หมายถึงสถาปัตยกรรมคลาวด์ที่รับประกันว่าการจัดเก็บ ประมวลผล และสิทธิ์ควบคุมข้อมูลอยู่ภายใต้อธิปไตยและกฎหมายของประเทศ',
    difficulty: 'medium',
  },
  {
    id: 'thai-eval-002',
    category: 'Thai Semantic Understanding',
    input: 'คำว่า "การทบทวนวรรณกรรมเชิงสังเคราะห์" หมายถึงอะไรในการทำวิจัย',
    expectedKeywords: ['ทบทวน', 'วิจัย', 'สังเคราะห์', 'องค์ความรู้'],
    groundTruth: 'การทบทวนวรรณกรรมเชิงสังเคราะห์คือกระบวนการรวบรวม วิเคราะห์ และประมวลความสัมพันธ์จากงานวิจัยหลายแหล่งเพื่อสร้างข้อสรุปใหม่',
    difficulty: 'medium',
  },
  {
    id: 'thai-eval-003',
    category: 'Thai Reasoning',
    input: 'หากสถาปัตยกรรมระบบเกิด SSoT Drift ละเมิดเกณฑ์ ความเสี่ยงที่เกิดขึ้นคืออะไรและต้องแก้ไขอย่างไร',
    expectedKeywords: ['SSoT Drift', 'ความเสี่ยง', 'Fail-Closed', 'แก้ไข'],
    groundTruth: 'เกิดความไม่สอดคล้องของข้อมูลหลัก ต้องใช้ Fail-Closed และกู้คืนสภาวะ Canonical SSoT Parity',
    difficulty: 'hard',
  },
  {
    id: 'thai-eval-004',
    category: 'Thai-English Mixed Language',
    input: 'ช่วยเปรียบเทียบข้อดีข้อเสียระหว่าง REST API กับ GraphQL ในมุมมองของ System Scalability',
    expectedKeywords: ['REST API', 'GraphQL', 'Scalability', 'ข้อดี', 'ข้อเสีย'],
    groundTruth: 'REST API มีความเรียบง่ายและ Caching ง่าย ส่วน GraphQL ลด Over-fetching แต่เพิ่มความซับซ้อนฝั่ง Server',
    difficulty: 'medium',
  },
  {
    id: 'thai-eval-005',
    category: 'Thai Knowledge Synthesis',
    input: 'สรุปหลักการสำคัญ 3 ข้อของการกำกับดูแลข้อมูลตามมาตรฐาน PDPA และ ETDA',
    expectedKeywords: ['PDPA', 'ETDA', 'การยินยอม', 'ความปลอดภัย', 'ความโปร่งใส'],
    groundTruth: '1. การขอความยินยอมและแจ้งวัตถุประสงค์ 2. การรักษาความมั่นคงปลอดภัยของข้อมูล 3. การรับประกันสิทธิ์ของผู้ใช้และการตรวจสอบได้',
    difficulty: 'hard',
  },
];

export interface ThaiEvalReport {
  timestamp: string;
  totalCases: number;
  passedCases: number;
  scorePercentage: number;
  categoryBreakdown: Record<string, { total: number; passed: number; score: number }>;
  status: 'VERIFIED' | 'NEEDS_IMPROVEMENT' | 'NOT_EVALUATED';
}

export function evaluateThaiIntelligence(responses: Array<{ testId: string; responseText: string }>): ThaiEvalReport {
  const categoryBreakdown: Record<string, { total: number; passed: number; score: number }> = {};
  let totalPassed = 0;

  for (const testCase of THAI_GROUND_TRUTH_DATASET) {
    if (!categoryBreakdown[testCase.category]) {
      categoryBreakdown[testCase.category] = { total: 0, passed: 0, score: 0 };
    }
    categoryBreakdown[testCase.category].total += 1;

    const matchedResponse = responses.find(r => r.testId === testCase.id);
    if (matchedResponse && matchedResponse.responseText) {
      const respLower = matchedResponse.responseText.toLowerCase();
      const hits = testCase.expectedKeywords.filter(kw => respLower.includes(kw.toLowerCase()));
      const passed = hits.length >= Math.ceil(testCase.expectedKeywords.length * 0.5);

      if (passed) {
        categoryBreakdown[testCase.category].passed += 1;
        totalPassed += 1;
      }
    }
  }

  for (const cat of Object.keys(categoryBreakdown)) {
    const item = categoryBreakdown[cat];
    item.score = item.total > 0 ? Math.round((item.passed / item.total) * 100) : 0;
  }

  const scorePercentage = Math.round((totalPassed / THAI_GROUND_TRUTH_DATASET.length) * 100);

  return {
    timestamp: new Date().toISOString(),
    totalCases: THAI_GROUND_TRUTH_DATASET.length,
    passedCases: totalPassed,
    scorePercentage,
    categoryBreakdown,
    status: scorePercentage >= 80 ? 'VERIFIED' : 'NEEDS_IMPROVEMENT',
  };
}
