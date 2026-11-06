/**
 * ZYNTHEOR AI ENGINE — AdaptiveReasoningModule
 * FIX: ไม่ใช่แค่ Temperature/top-p — ต้องมี Reasoning Budget, Planning Depth, Verification Budget
 */

export type ComplexityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ReasoningBudget {
  maxTokens: number;
  maxSteps: number;
  planningDepth: number;
  verificationBudget: number;
  timeBudgetMs: number;
}

export interface InferenceParams {
  temperature: number;
  topP: number;
  reasoningBudget: ReasoningBudget;
  enableSelfVerification: boolean;
  enableChainOfThought: boolean;
  enableToolUse: boolean;
}

export interface ComplexityAnalysis {
  level: ComplexityLevel;
  signals: any;
  recommendedBudget: ReasoningBudget;
}

export class AdaptiveReasoningModule {
  private currentBudget: ReasoningBudget | null = null;

  analyzeComplexity(input: string): ComplexityAnalysis {
    const signals = {
      multiStep: /จากนั้น|then|step \d|ขั้นตอน/.test(input.toLowerCase()),
      hasMath: /[=∫∑∏√]|solve|คำนวณ|พิสูจน์/.test(input),
      hasCode: /```|function|class|import|export|def |const /.test(input),
      hasResearch: /ค้นคว้า|research|source|อ้างอิง/.test(input.toLowerCase()),
      wordCount: input.split(/\s+/).length,
      requiresEvidence: /หลักฐาน|อ้างอิง|citation|source/.test(input.toLowerCase()),
    };
    let level: ComplexityLevel = 'low';
    if (signals.wordCount > 500 || (signals.multiStep && signals.hasMath)) level = 'critical';
    else if (signals.multiStep || signals.hasMath || signals.wordCount > 200) level = 'high';
    else if (signals.wordCount > 50 || signals.hasCode) level = 'medium';
    const budget = this.allocateBudgetForLevel(level, signals);
    return { level, signals, recommendedBudget: budget };
  }

  allocateBudgetForLevel(level: ComplexityLevel, signals?: any): ReasoningBudget {
    const base: Record<ComplexityLevel, ReasoningBudget> = {
      low: { maxTokens: 1024, maxSteps: 2, planningDepth: 1, verificationBudget: 0, timeBudgetMs: 5000 },
      medium: { maxTokens: 2048, maxSteps: 5, planningDepth: 3, verificationBudget: 1, timeBudgetMs: 15000 },
      high: { maxTokens: 4096, maxSteps: 10, planningDepth: 5, verificationBudget: 2, timeBudgetMs: 30000 },
      critical: { maxTokens: 8192, maxSteps: 20, planningDepth: 8, verificationBudget: 3, timeBudgetMs: 60000 },
    };
    let budget = { ...base[level] };
    if (signals?.requiresEvidence) budget.verificationBudget = Math.min(3, budget.verificationBudget + 1);
    if (signals?.hasMath) budget.planningDepth = Math.min(8, budget.planningDepth + 1);
    return budget;
  }

  allocateBudget(level: ComplexityLevel, override?: Partial<ReasoningBudget>) {
    const budget = this.allocateBudgetForLevel(level);
    this.currentBudget = { ...budget, ...override };
    return this.currentBudget;
  }

  getInferenceParams(level: ComplexityLevel): InferenceParams {
    const budget = this.currentBudget || this.allocateBudgetForLevel(level);
    const styleMap: Record<ComplexityLevel, { temp: number; topP: number }> = {
      low: { temp: 0.3, topP: 0.9 },
      medium: { temp: 0.5, topP: 0.92 },
      high: { temp: 0.6, topP: 0.95 },
      critical: { temp: 0.4, topP: 0.93 },
    };
    const style = styleMap[level];
    return {
      temperature: style.temp,
      topP: style.topP,
      reasoningBudget: budget,
      enableSelfVerification: budget.verificationBudget > 0,
      enableChainOfThought: budget.planningDepth > 1,
      enableToolUse: level === 'high' || level === 'critical',
    };
  }

  async verifyResult(content: string, budget: ReasoningBudget): Promise<{ verified: boolean; issues: string[] }> {
    if (budget.verificationBudget === 0) return { verified: true, issues: [] };
    const issues: string[] = [];
    if (budget.verificationBudget >= 1 && content.length < 10) issues.push('Content too short');
    if (budget.verificationBudget >= 2 && content.includes('อ้างอิง') && !content.includes('http')) issues.push('Claims evidence but no source URL');
    return { verified: issues.length === 0, issues };
  }

  getCurrentBudget() {
    return this.currentBudget;
  }
}
