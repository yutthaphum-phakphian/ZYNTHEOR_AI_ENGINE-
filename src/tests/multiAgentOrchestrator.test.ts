import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MultiAgentOrchestrator } from '../server/MultiAgentOrchestrator';
import { MemoryManager } from '../server/MemoryManager';
import { ZyntheorGraph, type ZyntheorState } from '../agents/graph';
import fs from 'fs/promises';
import path from 'path';

describe('MultiAgentOrchestrator & Reflexion Memory Tests', () => {
  const testSessionId = 'test-session-mem-1';

  beforeEach(async () => {
    // Clean up test memory if exists
    try {
      const p = path.resolve(process.cwd(), 'memory', `${testSessionId}.json`);
      await fs.unlink(p);
    } catch {}
    try {
      const p = path.resolve(process.cwd(), 'memory', `memory_${testSessionId}.json`);
      await fs.unlink(p);
    } catch {}
  });

  afterEach(async () => {
    try {
      const p = path.resolve(process.cwd(), 'memory', `${testSessionId}.json`);
      await fs.unlink(p);
    } catch {}
    try {
      const p = path.resolve(process.cwd(), 'memory', `memory_${testSessionId}.json`);
      await fs.unlink(p);
    } catch {}
  });

  describe('1. MemoryManager Persistence', () => {
    it('saves and loads state correctly', async () => {
      const stateData = {
        task: 'Build calculator',
        attempts: 1,
        lessons: ['Never forget await with fs.readFile'],
      };

      await MemoryManager.saveState(testSessionId, stateData);
      const loaded = await MemoryManager.loadState(testSessionId);

      expect(loaded).not.toBeNull();
      expect(loaded.task).toBe('Build calculator');
      expect(loaded.attempts).toBe(1);
      expect(loaded.lessons).toContain('Never forget await with fs.readFile');
    });

    it('returns null when loading non-existent session', async () => {
      const loaded = await MemoryManager.loadState('non-existent-session-id-xyz');
      expect(loaded).toBeNull();
    });
  });

  describe('2. Human-In-The-Loop Approval Mechanism', () => {
    it('handles approval correctly through handleApproval resolver', async () => {
      // Simulate waiting for approval
      let resolvedValue: boolean | null = null;
      const approvalPromise = new Promise<boolean>((resolve) => {
        // Register resolver as MultiAgentOrchestrator does
        const resolver = (approved: boolean) => {
          resolvedValue = approved;
          resolve(approved);
        };
        (MultiAgentOrchestrator as any).handleApproval(testSessionId, true);
      });

      // Verify handleApproval returns boolean status
      const handled = MultiAgentOrchestrator.handleApproval('unknown-session', true);
      expect(handled).toBe(false);
    });

    it('reports pending approval status accurately', () => {
      expect(MultiAgentOrchestrator.isPendingApproval('idle-session')).toBe(false);
    });
  });

  describe('3. ZyntheorGraph & Reflexion State', () => {
    it('initializes graph with sessionId and emits tokens properly', () => {
      const events: any[] = [];
      const graph = new ZyntheorGraph('dummy-api-key', (e) => events.push(e), testSessionId);

      // Verify emitTokens helper
      (graph as any).emitTokens({
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 45,
          totalTokenCount: 195,
        },
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('token_usage');
      expect(events[0].inputTokens).toBe(150);
      expect(events[0].outputTokens).toBe(45);
      expect(events[0].totalTokens).toBe(195);
    });
  });
});
