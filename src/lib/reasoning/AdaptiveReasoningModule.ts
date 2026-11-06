/**
 * ZYNTHEOR AI ENGINE — AdaptiveReasoningModule
 * Classifies prompt complexity, detects research keywords, and allocates reasoning budgets.
 */

export type ComplexityLevel =
  | 'L1_DIRECT'
  | 'L2_BALANCED'
  | 'L3_DEEP'
  | 'L4_CRITICAL'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'L1'
  | 'L2'
  | 'L3'
  | 'L4';

export interface ReasoningBudget {
  maxTokens: number;
  maxSteps: number;
  planningDepth: number;
  verificationBudget: number;
  timeBudgetMs: number;
}

export interface ComplexityAnalysis {
  level: ComplexityLevel;
  signals: Record<string, any>;
  recommendedBudget: ReasoningBudget;
  planningDepth: number;
  verificationBudget: number;
  isResearchSynthesis?: boolean;
}

export class AdaptiveReasoningModule {
  private currentBudget: ReasoningBudget | null = null;

  public evaluateComplexity(input: string): ComplexityAnalysis {
    return this.analyzeComplexity(input);
  }

  public analyzeComplexity(input: string): ComplexityAnalysis {
    const prompt = input || '';
    const lower = prompt.toLowerCase();

    // Detect keywords such as 'ทบทวน', 'Guidelines', and 'Infrastructure'
    const researchKeywords = ['ทบทวน', 'guidelines', 'infrastructure'];
    const hasResearchKeywords = researchKeywords.some(kw => lower.includes(kw));

    if (hasResearchKeywords) {
      const budget: ReasoningBudget = {
        maxTokens: 4096,
        maxSteps: 10,
        planningDepth: 4,
        verificationBudget: 2,
        timeBudgetMs: 30000,
      };
      this.currentBudget = budget;
      return {
        level: 'L3_DEEP',
        signals: {
          hasResearchKeywords: true,
          matchedKeywords: researchKeywords.filter(kw => lower.includes(kw)),
        },
        recommendedBudget: budget,
        planningDepth: 4,
        verificationBudget: 2,
        isResearchSynthesis: true,
      };
    }

    const signals = {
      multiStep: /จากนั้น|then|step \d|ขั้นตอน/.test(lower),
      hasMath: /[=∫∑∏√]|solve|คำนวณ|พิสูจน์/.test(prompt),
      hasCode: /```|function|class|import|export|def |const /.test(prompt),
      hasResearch: /ค้นคว้า|research|source|อ้างอิง/.test(lower),
      wordCount: prompt.split(/\s+/).filter(Boolean).length,
      requiresEvidence: /หลักฐาน|อ้างอิง|citation|source/.test(lower),
    };

    let level: ComplexityLevel = 'L1_DIRECT';
    if (signals.wordCount > 500 || (signals.multiStep && signals.hasMath)) level = 'L4_CRITICAL';
    else if (signals.multiStep || signals.hasMath || signals.wordCount > 200) level = 'L3_DEEP';
    else if (signals.wordCount > 50 || signals.hasCode) level = 'L2_BALANCED';

    const budget = this.allocateBudgetForLevel(level, signals);
    this.currentBudget = budget;
    return {
      level,
      signals,
      recommendedBudget: budget,
      planningDepth: budget.planningDepth,
      verificationBudget: budget.verificationBudget,
    };
  }

  public allocateBudgetForLevel(level: ComplexityLevel, signals?: any): ReasoningBudget {
    const base: Record<string, ReasoningBudget> = {
      L1: { maxTokens: 1024, maxSteps: 2, planningDepth: 1, verificationBudget: 0, timeBudgetMs: 5000 },
      L2: { maxTokens: 2048, maxSteps: 5, planningDepth: 3, verificationBudget: 1, timeBudgetMs: 15000 },
      L3: { maxTokens: 4096, maxSteps: 10, planningDepth: 4, verificationBudget: 2, timeBudgetMs: 30000 },
      L4: { maxTokens: 8192, maxSteps: 20, planningDepth: 8, verificationBudget: 3, timeBudgetMs: 60000 },
      L1_DIRECT: { maxTokens: 1024, maxSteps: 2, planningDepth: 1, verificationBudget: 0, timeBudgetMs: 5000 },
      L2_BALANCED: { maxTokens: 2048, maxSteps: 5, planningDepth: 3, verificationBudget: 1, timeBudgetMs: 15000 },
      L3_DEEP: { maxTokens: 4096, maxSteps: 10, planningDepth: 4, verificationBudget: 2, timeBudgetMs: 30000 },
      L4_CRITICAL: { maxTokens: 8192, maxSteps: 20, planningDepth: 8, verificationBudget: 3, timeBudgetMs: 60000 },
      low: { maxTokens: 1024, maxSteps: 2, planningDepth: 1, verificationBudget: 0, timeBudgetMs: 5000 },
      medium: { maxTokens: 2048, maxSteps: 5, planningDepth: 3, verificationBudget: 1, timeBudgetMs: 15000 },
      high: { maxTokens: 4096, maxSteps: 10, planningDepth: 4, verificationBudget: 2, timeBudgetMs: 30000 },
      critical: { maxTokens: 8192, maxSteps: 20, planningDepth: 8, verificationBudget: 3, timeBudgetMs: 60000 },
    };
    let budget = { ...(base[level] || base.L2_BALANCED) };
    if (signals?.requiresEvidence) budget.verificationBudget = Math.min(3, budget.verificationBudget + 1);
    if (signals?.hasMath) budget.planningDepth = Math.min(8, budget.planningDepth + 1);
    return budget;
  }

  public allocateBudget(level: ComplexityLevel, override?: Partial<ReasoningBudget>) {
    const budget = this.allocateBudgetForLevel(level);
    this.currentBudget = { ...budget, ...override };
    return this.currentBudget;
  }

  public inferComplexity(query: string) {
    const analysis = this.analyzeComplexity(query);
    return {
      tier: analysis.level === 'L3_DEEP' ? 'TIER_3_DEEP' : 'TIER_2_BALANCED',
      level: analysis.level,
      complexityScore: 70,
      parameters: {
        planningDepth: analysis.planningDepth,
        verificationBudget: analysis.verificationBudget,
      },
      analysis,
    };
  }

  public getCurrentBudget() {
    return this.currentBudget;
  }
}

export const adaptiveReasoningModule = new AdaptiveReasoningModule();
export default adaptiveReasoningModule;
