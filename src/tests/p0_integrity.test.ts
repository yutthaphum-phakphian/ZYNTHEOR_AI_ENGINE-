import { describe, it, expect } from 'vitest';
import { HybridRouter } from '../core/HybridRouter';
import { ModelIdentityType, RuntimeStatus } from '../core/ModelIdentity';
import { AdaptiveReasoningEngine } from '../core/AdaptiveReasoningEngine';
import { SourceVerifier, SourceQuality } from '../core/SourceVerifier';
import { GlobalIntelligenceScore } from '../evaluation/GlobalIntelligenceScore';

describe('P0 Integrity & Sovereign Core Checks', () => {
  it('should NOT fallback to external provider without explicit consent when STRICT_LOCAL is requested', () => {
    const context = {
      prompt: 'test prompt',
      tokenCount: 100,
      userPrivacyPreference: 'STRICT_LOCAL' as const,
      requiresHighReasoning: true,
      userConsentForCloud: false,
    };

    const result = HybridRouter.determineProvider(context);

    // Must strictly route to LOCAL_NATIVE under STRICT_LOCAL
    expect(result.provider).toBe('LOCAL_NATIVE');
    expect(result.reason).toContain('STRICT_LOCAL');
  });

  it('should route to CLOUD_API only when requiresHighReasoning AND userConsentForCloud is granted', () => {
    const context = {
      prompt: 'complex architecture design',
      tokenCount: 500,
      userPrivacyPreference: 'STANDARD' as const,
      requiresHighReasoning: true,
      userConsentForCloud: true,
    };

    const result = HybridRouter.determineProvider(context);
    expect(result.provider).toBe('CLOUD_API');
  });

  it('should block execution when token count exceeds 32k without cloud consent', () => {
    const context = {
      prompt: 'huge prompt',
      tokenCount: 40000,
      userPrivacyPreference: 'STANDARD' as const,
      requiresHighReasoning: false,
      userConsentForCloud: false,
    };

    expect(() => HybridRouter.determineProvider(context)).toThrow(/BLOCKED/);
  });

  it('should allocate reasoning budget dynamically according to task complexity', () => {
    const highComplexity = AdaptiveReasoningEngine.allocateBudget(90);
    expect(highComplexity.maxTokens).toBe(4096);
    expect(highComplexity.verificationLevel).toBe('STRICT');

    const lowComplexity = AdaptiveReasoningEngine.allocateBudget(20);
    expect(lowComplexity.maxTokens).toBe(512);
    expect(lowComplexity.verificationLevel).toBe('NONE');
  });

  it('should classify source credibility deterministically without AI guesswork', () => {
    const eduSource = SourceVerifier.verifySource('https://stanford.edu/research/paper.pdf');
    expect(eduSource.quality).toBe(SourceQuality.PEER_REVIEWED);

    const docsSource = SourceVerifier.verifySource('https://docs.python.org/3/library');
    expect(docsSource.quality).toBe(SourceQuality.OFFICIAL_DOCS);
  });

  it('should fail-closed on incomplete GlobalIntelligenceScore benchmark results', () => {
    const partialResults = [
      { category: 'Intelligence' as const, modelType: 'CORE_NATIVE' as const, score: 90, metrics: { accuracy: 0.9, hallucinationRate: 0.05, latencyMs: 120, costPerTask: 0 } },
    ];

    expect(() => GlobalIntelligenceScore.calculate(partialResults)).toThrow(/INCOMPLETE/);
  });

  it('should correctly export ModelIdentityType and RuntimeStatus enums', () => {
    expect(ModelIdentityType.CORE_NATIVE).toBe('CORE_NATIVE');
    expect(RuntimeStatus.NOT_TRAINED).toBe('NOT_TRAINED');
  });
});
