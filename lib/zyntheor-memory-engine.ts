/**
 * ZYNTHEOR MEMORY ENGINE
 * Sovereign Long-Term & Contextual Memory Subsystem.
 * 
 * Provides vector-backed context persistence, semantic retrieval, workspace segmentation,
 * and governance controls for user sovereignty.
 */

import {
  vectorMemoryService,
  type VectorMemoryEntry,
  type MemorySearchResult,
  type MemoryCategory,
} from '../src/services/vectorMemory.js';

export interface MemoryRecallQuery {
  text: string;
  category?: MemoryCategory;
  workspaceId?: string;
  limit?: number;
  minSimilarity?: number;
  tags?: string[];
}

export class ZyntheorMemoryEngine {
  private static instance: ZyntheorMemoryEngine;

  private constructor() {}

  public static getInstance(): ZyntheorMemoryEngine {
    if (!ZyntheorMemoryEngine.instance) {
      ZyntheorMemoryEngine.instance = new ZyntheorMemoryEngine();
    }
    return ZyntheorMemoryEngine.instance;
  }

  /**
   * Stores a persistent user preference (e.g. coding style, language choice, response format).
   */
  public async storeUserPreference(
    key: string,
    preference: string,
    workspaceId: string = 'workspace-main'
  ): Promise<VectorMemoryEntry> {
    return vectorMemoryService.storeMemory({
      workspaceId,
      category: 'USER_PREFERENCE',
      title: key,
      content: preference,
      tags: ['preference', 'user-setting'],
    });
  }

  /**
   * Stores project-specific knowledge (architecture, schemas, invariants).
   */
  public async storeProjectKnowledge(
    key: string,
    knowledgeContent: string,
    workspaceId: string = 'workspace-main',
    tags: string[] = []
  ): Promise<VectorMemoryEntry> {
    return vectorMemoryService.storeMemory({
      workspaceId,
      category: 'PROJECT_KNOWLEDGE',
      title: key,
      content: knowledgeContent,
      tags: ['knowledge', ...tags],
    });
  }

  /**
   * Stores a critical session turning point or summarized context.
   */
  public async recordSessionContext(
    sessionId: string,
    summary: string,
    workspaceId: string = 'workspace-main'
  ): Promise<VectorMemoryEntry> {
    return vectorMemoryService.storeMemory({
      workspaceId,
      category: 'SESSION_CONTEXT',
      title: `session-summary-${sessionId}-${Date.now()}`,
      content: summary,
      tags: ['session', sessionId],
      sessionId,
    });
  }

  /**
   * Recalls relevant memories for a prompt or query.
   */
  public async recallRelevantContext(query: MemoryRecallQuery): Promise<MemorySearchResult[]> {
    const ws = query.workspaceId || 'workspace-main';
    return vectorMemoryService.search(ws, query.text, {
      category: query.category,
      topK: query.limit || 5,
      minScore: query.minSimilarity || 0.35,
    });
  }

  /**
   * Formats relevant memories into an injected system prompt block.
   */
  public async buildInjectedContextPrompt(
    queryText: string,
    workspaceId: string = 'workspace-main'
  ): Promise<string> {
    const res = vectorMemoryService.buildMemoryPromptContext(workspaceId, queryText);
    return res.contextText;
  }

  /**
   * Returns memory storage statistics and governance overview.
   */
  public getMemoryStats(workspaceId: string = 'default') {
    return vectorMemoryService.getStats(workspaceId);
  }

  /**
   * Deletes a specific memory entry (User Sovereignty & Data Governance).
   */
  public async deleteMemory(id: string): Promise<boolean> {
    return vectorMemoryService.delete(id);
  }

  /**
   * Wipes all memories in a given workspace (User Sovereignty).
   */
  public async clearWorkspaceMemories(workspaceId: string): Promise<number> {
    return vectorMemoryService.clear(workspaceId);
  }
}

export const zyntheorMemoryEngine = ZyntheorMemoryEngine.getInstance();
