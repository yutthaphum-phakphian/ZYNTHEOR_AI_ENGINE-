import { describe, it, expect } from 'vitest';
import { evaluateThaiIntelligence, THAI_GROUND_TRUTH_DATASET } from '../evaluation/thaiIntelligenceEvaluation.ts';
import { GlobalIntelligenceScore, type BenchmarkResult } from '../evaluation/GlobalIntelligenceScore.ts';

describe('Phase 8 — Competitive Intelligence Evaluation', () => {
  it('evaluates Thai Intelligence against Ground Truth dataset', () => {
    const responses = [
      { testId: 'thai-eval-001', responseText: 'การประมวลผลบนคลาวด์แบบอธิปไตย มุ่งเน้นความมั่นคงปลอดภัย และควบคุมสิทธิ์การจัดเก็บข้อมูล' },
      { testId: 'thai-eval-002', responseText: 'การทบทวนวรรณกรรมเชิงสังเคราะห์คือการวิเคราะห์และสังเคราะห์องค์ความรู้จากงานวิจัย' },
      { testId: 'thai-eval-003', responseText: 'เกิดความเสี่ยง SSoT Drift ต้องใช้กลไก Fail-Closed เพื่อแก้ไขและคืนสมดุล' },
      { testId: 'thai-eval-004', responseText: 'REST API กับ GraphQL มีข้อดีข้อเสียต่างกันในการปรับขยาย Scalability' },
      { testId: 'thai-eval-005', responseText: 'การขอความยินยอม PDPA และ ETDA การรักษาความปลอดภัย และความโปร่งใส' },
    ];

    const report = evaluateThaiIntelligence(responses);
    expect(report.totalCases).toBe(THAI_GROUND_TRUTH_DATASET.length);
    expect(report.passedCases).toBe(5);
    expect(report.scorePercentage).toBe(100);
    expect(report.status).toBe('VERIFIED');
  });

  it('calculates Global Intelligence Score across all 7 canonical categories', () => {
    const benchmarkResults: BenchmarkResult[] = [
      { category: 'Intelligence', modelType: 'CORE_NATIVE', score: 92, metrics: { accuracy: 92, hallucinationRate: 2, latencyMs: 120, costPerTask: 0.01 } },
      { category: 'Knowledge', modelType: 'CORE_NATIVE', score: 88, metrics: { accuracy: 88, hallucinationRate: 3, latencyMs: 150, costPerTask: 0.01 } },
      { category: 'Reasoning', modelType: 'CORE_NATIVE', score: 90, metrics: { accuracy: 90, hallucinationRate: 2, latencyMs: 210, costPerTask: 0.02 } },
      { category: 'Multimodal', modelType: 'CORE_NATIVE', score: 85, metrics: { accuracy: 85, hallucinationRate: 4, latencyMs: 180, costPerTask: 0.01 } },
      { category: 'Agentic', modelType: 'CORE_NATIVE', score: 89, metrics: { accuracy: 89, hallucinationRate: 3, latencyMs: 250, costPerTask: 0.02 } },
      { category: 'Coding', modelType: 'CORE_NATIVE', score: 91, metrics: { accuracy: 91, hallucinationRate: 2, latencyMs: 160, costPerTask: 0.01 } },
      { category: 'Thai', modelType: 'CORE_NATIVE', score: 95, metrics: { accuracy: 95, hallucinationRate: 1, latencyMs: 130, costPerTask: 0.01 } },
    ];

    const result = GlobalIntelligenceScore.calculate(benchmarkResults);
    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.breakdown.Thai.rawScore).toBe(95);
  });

  it('fails closed if any category is missing or unverified (NOT_EVALUATED)', () => {
    const incompleteResults: BenchmarkResult[] = [
      { category: 'Intelligence', modelType: 'CORE_NATIVE', score: 92, metrics: { accuracy: 92, hallucinationRate: 2, latencyMs: 120, costPerTask: 0.01 } },
      { category: 'Knowledge', modelType: 'CORE_NATIVE', score: null, metrics: { accuracy: 0, hallucinationRate: 0, latencyMs: 0, costPerTask: 0 } },
    ];

    expect(() => {
      GlobalIntelligenceScore.calculate(incompleteResults);
    }).toThrow(/INCOMPLETE: Benchmark missing for category/);
  });
});
