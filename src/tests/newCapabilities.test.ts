import { describe, it, expect } from 'vitest';
import { AdaptiveReasoningModule, adaptiveReasoningModule } from '../lib/reasoning/AdaptiveReasoningModule.ts';
import { datasetValidator, verifyDatasetHash } from '../lib/knowledge/datasetValidator.ts';
import { ZyntheorIntelligenceRuntime, GroundingBlockedError } from '../lib/intelligence/ZyntheorIntelligenceRuntime.ts';

describe('AdaptiveReasoningModule research synthesis keyword detection', () => {
  it('detects ทบทวน and sets complexity to L3_DEEP with planning depth 4 and verification budget 2', () => {
    const module = new AdaptiveReasoningModule();
    const result = module.evaluateComplexity('โปรดช่วย ทบทวน ภาพรวมสถาปัตยกรรมระบบ');
    expect(result.level).toBe('L3_DEEP');
    expect(result.planningDepth).toBe(4);
    expect(result.verificationBudget).toBe(2);
    expect(result.isResearchSynthesis).toBe(true);
  });

  it('detects Guidelines and sets complexity to L3_DEEP with planning depth 4 and verification budget 2', () => {
    const result = adaptiveReasoningModule.evaluateComplexity('Review security Guidelines for API endpoints');
    expect(result.level).toBe('L3_DEEP');
    expect(result.planningDepth).toBe(4);
    expect(result.verificationBudget).toBe(2);
  });

  it('detects Infrastructure and sets complexity to L3_DEEP with planning depth 4 and verification budget 2', () => {
    const result = adaptiveReasoningModule.evaluateComplexity('Analyze sovereign cloud Infrastructure requirements');
    expect(result.level).toBe('L3_DEEP');
    expect(result.planningDepth).toBe(4);
    expect(result.verificationBudget).toBe(2);
  });
});

describe('datasetValidator for Training Manifests', () => {
  it('verifies dataset hash integrity from native_data/manifest.json', () => {
    const result = verifyDatasetHash('native_data/manifest.json');
    expect(result.valid).toBe(true);
    expect(result.expectedHash).toBe('49c845eab02c5e22d5908c0f2819a7ff173e86817f1b1a12fb28439a4e4b18db');
    expect(result.randomSeed).toBe(849202);
  });

  it('computes sha256 correctly', () => {
    const hash = datasetValidator.computeSHA256('ZYNTHEOR');
    expect(hash).toHaveLength(64);
  });
});

describe('ZyntheorIntelligenceRuntime bot challenge protection', () => {
  it('throws GroundingBlockedError when grounding response contains bot challenge pattern', () => {
    const runtime = ZyntheorIntelligenceRuntime.getInstance();
    const botChallengeText = 'DuckDuckGo: Unfortunately, bots use DuckDuckGo too. Please complete challenge.';
    
    expect(() => {
      runtime.interceptGroundingResponse(botChallengeText);
    }).toThrow(GroundingBlockedError);
  });

  it('does not throw GroundingBlockedError for clean grounding responses', () => {
    const runtime = ZyntheorIntelligenceRuntime.getInstance();
    const normalText = 'ZYNTHEOR AI Engine is an online-first sovereign general intelligence platform.';
    
    expect(() => {
      runtime.interceptGroundingResponse(normalText);
    }).not.toThrow();
  });
});
