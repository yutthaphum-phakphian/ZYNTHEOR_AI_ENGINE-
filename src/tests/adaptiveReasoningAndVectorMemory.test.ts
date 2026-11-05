// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  adaptiveReasoningEngine,
  AdaptiveReasoningEngine,
} from '../../lib/adaptive-reasoning.ts';
import {
  generateDenseEmbedding,
  cosineSimilarity,
  LongTermVectorMemoryService,
} from '../services/vectorMemory.ts';
import {
  ZYNTHEOR_PLATFORM_PILLARS,
  ZYNTHEOR_PRODUCT_CONSTITUTION,
  GLOBAL_COMPETITION_ARENAS,
  DIFFERENTIATING_STRENGTHS,
  DECISION_FILTER_QUESTIONS,
} from '../contracts/platformArchitectureContract.ts';

describe('ZYNTHEOR Adaptive Reasoning Engine', () => {
  it('calibrates TIER_1_DIRECT for conversational greetings and simple queries', () => {
    const result = adaptiveReasoningEngine.inferComplexity('สวัสดีครับ วันนี้อากาศดีไหม');
    expect(result.tier).toBe('TIER_1_DIRECT');
    expect(result.parameters.temperature).toBe(0.7);
    expect(result.parameters.cotDepth).toBe(0);
    expect(result.parameters.reasoningEffort).toBe('minimal');
    expect(result.parameters.executionStrategy).toBe('DIRECT_INFERENCE');
  });

  it('calibrates TIER_2_BALANCED for explanations and summarization', () => {
    const result = adaptiveReasoningEngine.inferComplexity(
      'ช่วยสรุปและอธิบายข้อแตกต่างระหว่าง SQL กับ NoSQL ให้เข้าใจง่ายเป็นข้อๆ'
    );
    expect(result.tier).toBe('TIER_2_BALANCED');
    expect(result.parameters.temperature).toBe(0.4);
    expect(result.parameters.cotDepth).toBe(2);
    expect(result.parameters.reasoningEffort).toBe('medium');
    expect(result.parameters.executionStrategy).toBe('STRUCTURED_REASONING');
  });

  it('calibrates TIER_3_DEEP for multi-step logic, architecture, and root cause diagnosis', () => {
    const result = adaptiveReasoningEngine.inferComplexity(
      'เพราะเหตุใดระบบจึงเกิด deadlock เมื่อมี concurrent transactions? ช่วยวิเคราะห์ root cause และพิสูจน์ตามหลักตรรกะ พร้อมออกแบบสถาปัตยกรรม database schema เพื่อแก้ปัญหานี้'
    );
    expect(result.tier).toBe('TIER_3_DEEP');
    expect(result.parameters.temperature).toBe(0.15);
    expect(result.parameters.cotDepth).toBe(4);
    expect(result.parameters.reasoningEffort).toBe('high');
    expect(result.parameters.executionStrategy).toBe('VERIFIED_CHAIN_OF_THOUGHT');
    expect(result.reasoningPlan.length).toBeGreaterThanOrEqual(4);
  });

  it('calibrates TIER_4_CRITICAL for high-risk operations requiring governance gates', () => {
    const result = adaptiveReasoningEngine.inferComplexity(
      'ช่วย migrate production database โดยรันคำสั่ง delete และ drop ตารางเก่า พร้อมปรับเปลี่ยน permission credentials'
    );
    expect(result.tier).toBe('TIER_4_CRITICAL');
    expect(result.parameters.temperature).toBe(0.05);
    expect(result.parameters.cotDepth).toBe(6);
    expect(result.parameters.reasoningEffort).toBe('maximum');
    expect(result.parameters.executionStrategy).toBe('GOVERNED_MULTI_STEP_AGENT');
    expect(result.parameters.requiredVerifications).toContain('HUMAN_APPROVAL_GATE');
  });

  it('dynamically factors in multimodal attachments (documents & images)', () => {
    const base = adaptiveReasoningEngine.inferComplexity('ช่วยวิเคราะห์ข้อมูล');
    const withDocs = adaptiveReasoningEngine.inferComplexity('ช่วยวิเคราะห์ข้อมูล', {
      documentsCount: 3,
      imagesCount: 2,
    });
    expect(withDocs.complexityScore).toBeGreaterThan(base.complexityScore);
  });
});

describe('ZYNTHEOR Long-Term Vector Memory Layer', () => {
  it('generates 128-dimensional unit-normalized embeddings', () => {
    const embedding = generateDenseEmbedding('ZYNTHEOR Sovereign Intelligence Platform');
    expect(embedding).toHaveLength(128);

    // Verify L2 norm is approximately 1.0
    let sumSq = 0;
    for (const val of embedding) {
      sumSq += val * val;
    }
    expect(Math.abs(Math.sqrt(sumSq) - 1.0)).toBeLessThan(0.05);
  });

  it('computes cosine similarity accurately between vectors', () => {
    const vecA = generateDenseEmbedding('microservices architecture distributed systems');
    const vecB = generateDenseEmbedding('microservices software design architecture');
    const vecC = generateDenseEmbedding('cooking thai food recipes curry');

    const simSimilar = cosineSimilarity(vecA, vecB);
    const simDifferent = cosineSimilarity(vecA, vecC);

    expect(simSimilar).toBeGreaterThan(simDifferent);
    expect(simSimilar).toBeGreaterThanOrEqual(0.5);
  });

  it('stores and retrieves contextual knowledge via semantic search', () => {
    const memoryService = new LongTermVectorMemoryService();
    const testWs = `test-ws-${Date.now()}`;

    memoryService.storeMemory({
      workspaceId: testWs,
      category: 'PROJECT_KNOWLEDGE',
      title: 'Database Fail-Closed Policy',
      content: 'When database disconnects, fallback to mock proxy and enforce fail-closed rule without leaking credentials.',
      tags: ['database', 'security', 'fail-closed'],
    });

    memoryService.storeMemory({
      workspaceId: testWs,
      category: 'USER_PREFERENCE',
      title: 'User Output Preference',
      content: 'Prefer concise bullet points with Thai explanations and English technical terms.',
      tags: ['preference', 'formatting'],
    });

    const searchResults = memoryService.search(testWs, 'fail-closed security database policy', {
      topK: 2,
      minScore: 0.45,
    });

    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].entry.title).toBe('Database Fail-Closed Policy');
    expect(searchResults[0].score).toBeGreaterThan(0.5);

    // Build prompt context
    const contextResult = memoryService.buildMemoryPromptContext(testWs, 'database policy');
    expect(contextResult.recalledMemories.length).toBeGreaterThan(0);
    expect(contextResult.contextText).toContain('LONG-TERM RECALLED MEMORY CONTEXT');
  });
});

describe('ZYNTHEOR Platform Architecture Contract', () => {
  it('defines the 6 Core Product Pillars', () => {
    expect(ZYNTHEOR_PLATFORM_PILLARS.INTELLIGENCE).toBeDefined();
    expect(ZYNTHEOR_PLATFORM_PILLARS.CORE).toBeDefined();
    expect(ZYNTHEOR_PLATFORM_PILLARS.KNOWLEDGE).toBeDefined();
    expect(ZYNTHEOR_PLATFORM_PILLARS.MEMORY).toBeDefined();
    expect(ZYNTHEOR_PLATFORM_PILLARS.CAPABILITIES).toBeDefined();
    expect(ZYNTHEOR_PLATFORM_PILLARS.TRUST).toBeDefined();
  });

  it('defines the 10 rules of the Product Constitution', () => {
    expect(ZYNTHEOR_PRODUCT_CONSTITUTION).toHaveLength(10);
    expect(ZYNTHEOR_PRODUCT_CONSTITUTION[0].title).toBe('Not a Chatbot');
    expect(ZYNTHEOR_PRODUCT_CONSTITUTION[1].title).toBe('First-Party Intelligence');
    expect(ZYNTHEOR_PRODUCT_CONSTITUTION[5].title).toBe('Model Transparency');
  });

  it('defines the 6 Global Competition Arenas', () => {
    expect(GLOBAL_COMPETITION_ARENAS).toHaveLength(6);
    const domains = GLOBAL_COMPETITION_ARENAS.map(a => a.domain);
    expect(domains).toContain('Intelligence');
    expect(domains).toContain('Knowledge');
    expect(domains).toContain('Reasoning');
    expect(domains).toContain('Multimodal');
    expect(domains).toContain('Agentic Capabilities');
    expect(domains).toContain('Model Ownership');
  });

  it('defines the 5 Differentiating Strengths and 3-Question Decision Filter', () => {
    expect(DIFFERENTIATING_STRENGTHS).toHaveLength(5);
    const names = DIFFERENTIATING_STRENGTHS.map(s => s.name);
    expect(names).toContain('Unified Intelligence');
    expect(names).toContain('Online-First');
    expect(names).toContain('Sovereign Architecture');

    expect(DECISION_FILTER_QUESTIONS).toHaveLength(3);
  });
});
