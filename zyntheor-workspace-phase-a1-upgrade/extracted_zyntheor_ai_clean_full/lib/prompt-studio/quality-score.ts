export interface QualityDimension {
  name: 'clarity' | 'specificity' | 'context' | 'safety' | 'efficiency' | 'evidence';
  score: number;
  maxScore: number;
  evidence: string;
  method: 'static_rule' | 'rule_pattern_match' | 'length_based_estimate' | 'ai_evaluation' | 'test_lab_execution';
  isAiEvaluated: boolean;
  tokenEstimate?: number;
  tokenCountMethod?: 'length_based_estimate' | 'actual_tokenizer';
  state: 'VERIFIED' | 'ASSUMPTION' | 'UNVERIFIED';
}

export class EvidenceBasedQualityScore {
  audit(prompt: string, hasTest: boolean, hasVariables: boolean, injectionRisks: number): QualityDimension[] {
    const text = prompt || '';
    const hasVariablesCount = (text.match(/(\{\{.*?\}\}|\[.*?\])/g) || []).length;
    const hasInstructionKeyword = text.includes('you are') || text.includes('ทำ') || text.toLowerCase().includes('role') || text.toLowerCase().includes('objective');
    const estimatedTokens = Math.ceil(text.length / 4);

    return [
      {
        name: 'clarity',
        score: text.length > 20 && text.length < 2000 ? 85 : 50,
        maxScore: 100,
        evidence: `Length ${text.length} chars, instruction keyword present: ${hasInstructionKeyword}`,
        method: 'static_rule',
        isAiEvaluated: false,
        state: 'VERIFIED',
      },
      {
        name: 'specificity',
        score: hasVariablesCount > 0 ? 80 : 60,
        maxScore: 100,
        evidence: `Variables found: ${hasVariablesCount}`,
        method: 'rule_pattern_match',
        isAiEvaluated: false,
        state: 'VERIFIED',
      },
      {
        name: 'context',
        score: text.toLowerCase().includes('context') || text.includes('background') || text.includes('บริบท') ? 75 : 50,
        maxScore: 100,
        evidence: 'Keyword detection check',
        method: 'rule_pattern_match',
        isAiEvaluated: false,
        state: 'ASSUMPTION',
      },
      {
        name: 'safety',
        score: injectionRisks === 0 ? 90 : Math.max(20, 90 - injectionRisks * 30),
        maxScore: 100,
        evidence: `Injection risks detected: ${injectionRisks}`,
        method: 'static_rule',
        isAiEvaluated: false,
        state: 'VERIFIED',
      },
      {
        name: 'efficiency',
        score: Math.max(30, 100 - Math.floor(text.length / 50)),
        maxScore: 100,
        evidence: `Token estimate ~${estimatedTokens} (length approximation)`,
        method: 'length_based_estimate',
        isAiEvaluated: false,
        tokenEstimate: estimatedTokens,
        tokenCountMethod: 'length_based_estimate',
        state: 'ASSUMPTION',
      },
      {
        name: 'evidence',
        score: hasTest ? 85 : 30,
        maxScore: 100,
        evidence: hasTest ? 'Prompt has verified execution in Test Lab' : 'Not tested in Test Lab yet',
        method: 'test_lab_execution',
        isAiEvaluated: false,
        state: hasTest ? 'VERIFIED' : 'UNVERIFIED',
      },
    ];
  }
}
