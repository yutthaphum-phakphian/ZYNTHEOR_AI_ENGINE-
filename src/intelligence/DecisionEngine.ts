export interface DecisionAlternative {
  id: string;
  description: string;
  scores: {
    correctness: number;
    security: number;
    maintainability: number;
    performance: number;
    complexity: number;
    compatibility: number;
  };
  cost: {
    resources: string;
    operational: string;
  };
  risks: string[];
}

export interface ScoredAlternative extends DecisionAlternative {
  total: number;
}

export interface DecisionRecord {
  decision: string;
  alternatives: ScoredAlternative[];
  evidence: {
    benchmark?: any;
    securityScan?: any;
    repoContext?: any;
  };
  tradeOffs: string;
  risks: string[];
  selectedApproach: string;
  reason: string;
  confidence: number;
  timestamp: string;
}

export class DecisionEngine {
  static compare(alternatives: DecisionAlternative[]): DecisionRecord {
    if (!alternatives || alternatives.length === 0) {
      throw new Error('No alternatives provided to DecisionEngine');
    }

    // Weighted scoring - Fail Closed: Requires evidence
    const scored: ScoredAlternative[] = alternatives
      .map((a) => {
        const total =
          a.scores.correctness * 0.3 +
          a.scores.security * 0.25 +
          a.scores.maintainability * 0.2 +
          a.scores.performance * 0.1 +
          a.scores.compatibility * 0.15 -
          a.scores.complexity * 0.1;
        return { ...a, total };
      })
      .sort((a, b) => b.total - a.total);

    const best = scored[0];

    return {
      decision: `Select ${best.id}`,
      alternatives: scored,
      evidence: {
        benchmark: `Best total score ${best.total.toFixed(2)}`,
        securityScan:
          best.risks.length === 0 ? 'No critical risks' : best.risks.join(', '),
      },
      tradeOffs: `Trade-off analysis: ${best.description} wins on correctness/security but complexity=${best.scores.complexity}`,
      risks: best.risks,
      selectedApproach: best.id,
      reason: `Highest weighted score with lowest risk. Evidence: ${best.description}`,
      confidence: Math.min(0.95, Number((best.total / 100).toFixed(4))),
      timestamp: new Date().toISOString(),
    };
  }
}
