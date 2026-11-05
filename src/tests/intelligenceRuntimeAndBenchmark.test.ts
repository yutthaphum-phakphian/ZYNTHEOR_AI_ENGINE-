import { describe, it, expect } from 'vitest';
import { zyntheorIntelligenceRuntime } from '../../lib/zyntheor-intelligence-runtime.js';
import { zyntheorMemoryEngine } from '../../lib/zyntheor-memory-engine.js';
import { globalBenchmarkSuite, GlobalBenchmarkSuite } from '../evaluation/globalBenchmarkSuite.js';

describe('ZyntheorIntelligenceRuntime Unified Execution Interface', () => {
  it('should execute a general query through the unified runtime and return structured result', async () => {
    const result = await zyntheorIntelligenceRuntime.executeCapability(
      undefined,
      {
        text: 'สวัสดี ช่วยอธิบายหลักการของ Sovereign General Intelligence Platform สั้นๆ',
      },
      {
        operatingMode: 'ONLINE_INTELLIGENCE',
      }
    );

    expect(result).toBeDefined();
    expect(result.executionId).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.capabilityUsed).toBeDefined();
    expect(result.adaptiveReasoning).toBeDefined();
    expect(result.adaptiveReasoning.complexityTier).toBeDefined();
    expect(result.trustVerification).toBeDefined();
    expect(result.trustVerification.evidenceGenerated).toBe(true);
    expect(result.trustVerification.sha256Proof).toBeDefined();
  });

  it('should auto-route research queries to KNOWLEDGE_RESEARCH capability', async () => {
    const result = await zyntheorIntelligenceRuntime.executeCapability(
      undefined,
      {
        text: 'ค้นคว้าและ research ข้อมูลล่าสุดเกี่ยวกับ quantum computing 2026',
      }
    );

    expect(result.capabilityUsed.id).toBe('KNOWLEDGE_RESEARCH');
    expect(result.capabilityUsed.name).toBe('Research & Knowledge');
  });

  it('should handle multimodal attachments (documents & images) in runtime execution', async () => {
    const result = await zyntheorIntelligenceRuntime.executeCapability(
      'DOCUMENT_INTELLIGENCE',
      {
        text: 'วิเคราะห์โครงสร้างไฟล์สัญญานี้',
        documents: [
          {
            name: 'service_agreement.txt',
            mimeType: 'text/plain',
            contentText: 'TERMS OF SERVICE: 1. Data sovereignty is reserved to user...',
          },
        ],
      }
    );

    expect(result.success).toBe(true);
    expect(result.capabilityUsed.id).toBe('DOCUMENT_INTELLIGENCE');
    expect(result.adaptiveReasoning.inferredParameters.requiresMultimodal).toBe(true);
  });
});

describe('ZyntheorMemoryEngine Subsystem', () => {
  it('should store and recall user preferences', async () => {
    const stored = await zyntheorMemoryEngine.storeUserPreference(
      'test_pref_language',
      'User prefers responses in formal Thai with English technical terms in parentheses',
      'workspace-test'
    );

    expect(stored.id).toBeDefined();
    expect(stored.category).toBe('USER_PREFERENCE');

    const recalled = await zyntheorMemoryEngine.recallRelevantContext({
      text: 'formal Thai language preference',
      workspaceId: 'workspace-test',
    });

    expect(recalled.length).toBeGreaterThan(0);
    expect(recalled[0].entry.category).toBe('USER_PREFERENCE');

    // Clean up
    await zyntheorMemoryEngine.deleteMemory(stored.id);
  });

  it('should store and recall project knowledge', async () => {
    const stored = await zyntheorMemoryEngine.storeProjectKnowledge(
      'test_arch_rule',
      'All intelligence capabilities must route through ZyntheorIntelligenceRuntime rather than direct endpoints.',
      'workspace-test',
      ['architecture', 'constitution']
    );

    expect(stored.category).toBe('PROJECT_KNOWLEDGE');

    const contextPrompt = await zyntheorMemoryEngine.buildInjectedContextPrompt('ZyntheorIntelligenceRuntime routing capabilities', 'workspace-test');
    expect(contextPrompt).toContain('ZyntheorIntelligenceRuntime');

    // Clean up
    await zyntheorMemoryEngine.deleteMemory(stored.id);
  });
});

describe('GlobalBenchmarkSuite & Zero-Mock Sovereign Evaluator', () => {
  it('should allocate exactly 100 points across the 7 canonical arenas', () => {
    const scorecard = globalBenchmarkSuite.getScorecard();
    expect(scorecard.totalMaxPoints).toBe(100);

    const arenaList = Object.values(scorecard.arenas);
    expect(arenaList.length).toBe(7);

    const sumMax = arenaList.reduce((acc, a) => acc + a.maxPoints, 0);
    expect(sumMax).toBe(100);

    expect(scorecard.arenas.generalIntelligence.maxPoints).toBe(20);
    expect(scorecard.arenas.knowledgeAndResearch.maxPoints).toBe(15);
    expect(scorecard.arenas.advancedReasoning.maxPoints).toBe(20);
    expect(scorecard.arenas.multimodal.maxPoints).toBe(10);
    expect(scorecard.arenas.agentic.maxPoints).toBe(15);
    expect(scorecard.arenas.codingAndTechnical.maxPoints).toBe(10);
    expect(scorecard.arenas.thaiAndMultilingual.maxPoints).toBe(10);
  });

  it('should pass zero-mock integrity audit on the official baseline scorecard', () => {
    const scorecard = globalBenchmarkSuite.getScorecard();
    const audit = globalBenchmarkSuite.verifyZeroMockIntegrity(scorecard);

    expect(audit.passed).toBe(true);
    expect(audit.violations).toEqual([]);

    // Check that unevaluated arenas have earnedPoints === null
    expect(scorecard.arenas.generalIntelligence.status).toBe('NOT_EVALUATED');
    expect(scorecard.arenas.generalIntelligence.earnedPoints).toBeNull();
    expect(scorecard.arenas.multimodal.status).toBe('NOT_EVALUATED');
    expect(scorecard.arenas.multimodal.earnedPoints).toBeNull();
  });

  it('should detect and flag any fabricated score in NOT_EVALUATED arena as a violation', () => {
    const suite = GlobalBenchmarkSuite.getInstance();
    const fakeScorecard = suite.getScorecard();

    // Intentionally inject a mock violation
    fakeScorecard.arenas.generalIntelligence.earnedPoints = 18.5; // Illegal since status is NOT_EVALUATED!

    const audit = suite.verifyZeroMockIntegrity(fakeScorecard);
    expect(audit.passed).toBe(false);
    expect(audit.violations.length).toBeGreaterThan(0);
    expect(audit.violations[0]).toContain('Violation in generalIntelligence');
  });
});
