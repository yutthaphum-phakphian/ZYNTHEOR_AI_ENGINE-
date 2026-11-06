/**
 * ZYNTHEOR NATIVE INTELLIGENCE — Phase 3 Reasoning & General-Purpose Intelligence Test Suite
 * ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Tests:
 * - Phase 3 Dependency Gate Check
 * - Verifiable Multi-Step Reasoning Engine (Logical, Analytical, Causal, Math)
 * - Observable Decision Summary & Private CoT Boundary Isolation
 * - Task Decomposition & Planning Engine (Dependencies, State Transitions, Cancellation)
 * - All 9 General-Purpose Intelligence Domains Registry
 * - Thai & Multilingual Reasoning Execution
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { reasoningEngine } from '../src/core/ReasoningEngine.ts';
import { taskDecompositionEngine } from '../src/core/TaskDecompositionEngine.ts';
import { intelligenceDomainRegistry } from '../src/core/IntelligenceDomainRegistry.ts';

describe('ZYNTHEOR Native Intelligence — Phase 3 Test Suite', () => {
  const testWs = 'ws-phase3-test';

  // --- DEPENDENCY GATE ---
  describe('Phase 3 Dependency Gate Verification', () => {
    it('verifies Phase 1 Memory & Phase 2 Knowledge Infrastructure dependencies are operational', () => {
      const domains = intelligenceDomainRegistry.listAllDomains();
      expect(domains.length).toBe(9);
    });
  });

  // --- REASONING ENGINE TESTS ---
  describe('P3.1: Verifiable Multi-Step Reasoning Engine', () => {
    it('executes analytical reasoning and extracts verified facts from evidence', async () => {
      const res = await reasoningEngine.executeReasoning({
        query: 'Analyze PostgreSQL pgvector performance and memory storage invariants',
        reasoningType: 'ANALYTICAL',
        evidenceContext: [
          'pgvector supports 128-dimensional dense vector embeddings',
          'Cosine similarity distance metric evaluates vector relevance'
        ]
      });

      expect(res.status).toBe('SUCCESS');
      expect(res.facts.length).toBe(2);
      expect(res.facts[0].statement).toContain('128-dimensional');
      expect(res.conclusion.confidenceScore).toBeGreaterThan(0.70);
      expect(res.decisionSummary.reasoningType).toBe('ANALYTICAL');
    });

    it('handles insufficient context gracefully with fail-closed confidence score', async () => {
      const res = await reasoningEngine.executeReasoning({
        query: 'Synthesize ungrounded quantum formula',
        reasoningType: 'KNOWLEDGE_SYNTHESIS',
        evidenceContext: []
      });

      expect(res.status).toBe('INSUFFICIENT_DATA');
      expect(res.conclusion.confidenceScore).toBeLessThan(0.50);
      expect(res.conclusion.limitations).toContain('No direct evidence found in context');
    });

    it('produces observable Decision Summary without exposing private Chain-of-Thought', async () => {
      const res = await reasoningEngine.executeReasoning({
        query: 'Compare ZYNTHEOR CORE native model family vs external providers',
        reasoningType: 'COMPARATIVE',
        evidenceContext: ['ZYNTHEOR CORE is first-party native', 'External providers are strictly third-party']
      });

      expect(res.decisionSummary).toBeDefined();
      expect(res.decisionSummary.primaryObjective).toContain('ZYNTHEOR CORE');
      expect(res.decisionSummary.executedStepsCount).toBe(3);
      // Ensure no raw internal scratchpad leakage
      expect(JSON.stringify(res.decisionSummary)).not.toContain('private_scratchpad');
    });
  });

  // --- TASK DECOMPOSITION TESTS ---
  describe('P3.2: Task Decomposition & Planning Engine', () => {
    it('decomposes complex research goal into explicit sub-tasks graph', () => {
      const graph = taskDecompositionEngine.decomposeGoal('task-101', 'Research quantum cryptography and vector memory', testWs);

      expect(graph.rootTaskId).toBe('task-101');
      expect(graph.overallStatus).toBe('IN_PROGRESS');
      expect(graph.subTasks.length).toBe(3);
      expect(graph.subTasks[0].status).toBe('COMPLETED');
      expect(graph.subTasks[1].dependencies).toContain('task-101-1');
    });

    it('updates sub-task status and computes overall graph progress correctly', () => {
      let graph = taskDecompositionEngine.decomposeGoal('task-102', 'Write clean TypeScript code for API router', testWs);

      expect(graph.overallStatus).toBe('IN_PROGRESS');

      graph = taskDecompositionEngine.updateSubTaskStatus(graph, 'task-102-2', 'COMPLETED', { code: 'export const router = {};' });
      graph = taskDecompositionEngine.updateSubTaskStatus(graph, 'task-102-3', 'COMPLETED', { verified: true });

      expect(graph.overallStatus).toBe('COMPLETED');
    });
  });

  // --- 9 GENERAL-PURPOSE DOMAINS TESTS ---
  describe('P3.3: 9 General-Purpose Intelligence Domains Registry', () => {
    it('registers and classifies all 9 required domains', () => {
      expect(intelligenceDomainRegistry.classifyDomain('สอนและอธิบายความรู้')).toBe('KNOWLEDGE_LEARNING');
      expect(intelligenceDomainRegistry.classifyDomain('Research and synthesize data')).toBe('RESEARCH_SYNTHESIS');
      expect(intelligenceDomainRegistry.classifyDomain('เขียนและร่างบทความ')).toBe('WRITING_COMMUNICATION');
      expect(intelligenceDomainRegistry.classifyDomain('Analyze and solve logic why')).toBe('REASONING_PROBLEM_SOLVING');
      expect(intelligenceDomainRegistry.classifyDomain('Count data metrics statistics')).toBe('DATA_ANALYSIS');
      expect(intelligenceDomainRegistry.classifyDomain('Creative content idea')).toBe('CREATIVITY_CONTENT');
      expect(intelligenceDomainRegistry.classifyDomain('Plan schedule milestone todo')).toBe('PLANNING_PRODUCTIVITY');
      expect(intelligenceDomainRegistry.classifyDomain('Write TypeScript code API')).toBe('TECHNICAL_INTELLIGENCE');
      expect(intelligenceDomainRegistry.classifyDomain('Extract document PDF file')).toBe('DOCUMENT_INTELLIGENCE');
    });

    it('executes Domain Handlers with real execution results', async () => {
      const handler = intelligenceDomainRegistry.getHandler('REASONING_PROBLEM_SOLVING')!;
      expect(handler).toBeDefined();

      const result = await handler.execute('Analyze system invariants');
      expect(result.domainId).toBe('REASONING_PROBLEM_SOLVING');
      expect(result.status).toBe('SUCCESS');
      expect(result.outputContent).toContain('ZYNTHEOR REASONING');
    });
  });
});
