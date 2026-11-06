export interface BenchmarkResult {
  category: 'Intelligence' | 'Knowledge' | 'Reasoning' | 'Multimodal' | 'Agentic' | 'Coding' | 'Thai';
  modelType: 'CORE_NATIVE' | 'CORE_ADAPTED' | 'CLOUD_MODEL';
  score: number | null; // null = ยังไม่ได้ทดสอบ (NOT_EVALUATED)
  metrics: {
    accuracy: number;
    hallucinationRate: number;
    latencyMs: number;
    costPerTask: number;
  };
}

export class GlobalIntelligenceScore {
  // น้ำหนักคะแนนตาม Vision
  private static WEIGHTS = {
    Intelligence: 20,
    Knowledge: 15,
    Reasoning: 20,
    Multimodal: 10,
    Agentic: 15,
    Coding: 10,
    Thai: 10
  };

  /**
   * คำนวณคะแนนรวม 100 คะแนน (Fail-Closed: ถ้าขาดหมวดไหน ให้ Throw Error)
   */
  static calculate(results: BenchmarkResult[]): { totalScore: number; breakdown: any } {
    let totalScore = 0;
    const breakdown: any = {};

    // ตรวจสอบว่ามีครบทุกหมวดหรือไม่
    for (const [category, weight] of Object.entries(this.WEIGHTS)) {
      const result = results.find(r => r.category === category);
      
      if (!result || result.score === null) {
        throw new Error(`❌ INCOMPLETE: Benchmark missing for category '${category}'. Cannot calculate Global Score.`);
      }

      const weightedScore = (result.score / 100) * weight;
      totalScore += weightedScore;
      breakdown[category] = {
        rawScore: result.score,
        weightedScore: weightedScore,
        weight: weight
      };
    }

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown
    };
  }
}
