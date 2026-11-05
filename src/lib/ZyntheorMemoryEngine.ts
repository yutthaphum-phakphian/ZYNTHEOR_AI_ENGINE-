/**
 * ZYNTHEOR MEMORY ENGINE
 * Sovereign Long-Term & Contextual Vector Memory Subsystem.
 * 
 * Implements a lightweight vector store pattern for storing project-specific
 * knowledge and contextual preferences, enabling persistent context across
 * sessions for a personalized, sovereign Intelligence Runtime experience.
 */

import {
  vectorMemoryService,
  type VectorMemoryEntry,
  type MemorySearchResult,
  type MemoryCategory,
  generateDenseEmbedding,
  cosineSimilarity,
} from '../services/vectorMemory.ts';

export type { VectorMemoryEntry, MemorySearchResult, MemoryCategory };

export interface MemoryRecallQuery {
  text: string;
  category?: MemoryCategory;
  workspaceId?: string;
  limit?: number;
  minSimilarity?: number;
  tags?: string[];
}

export interface MemoryStorageStats {
  totalCount: number;
  preferenceCount: number;
  projectKnowledgeCount: number;
  sessionContextCount: number;
  dimensions: number;
  lastUpdated: string;
}

export class ZyntheorMemoryEngine {
  private static instance: ZyntheorMemoryEngine;
  private readonly dimensions: number = 128;

  private constructor() {}

  public static getInstance(): ZyntheorMemoryEngine {
    if (!ZyntheorMemoryEngine.instance) {
      ZyntheorMemoryEngine.instance = new ZyntheorMemoryEngine();
    }
    return ZyntheorMemoryEngine.instance;
  }

  /**
   * Generates a 128-dimensional dense semantic embedding vector.
   */
  public embedText(text: string): number[] {
    return generateDenseEmbedding(text);
  }

  /**
   * Computes cosine similarity between two dense embedding vectors.
   */
  public computeSimilarity(vecA: number[], vecB: number[]): number {
    return cosineSimilarity(vecA, vecB);
  }

  /**
   * Stores a persistent user preference (e.g. coding style, language, brevity).
   */
  public async storeUserPreference(
    key: string,
    preference: string,
    workspaceId: string = 'workspace-main',
    tags: string[] = ['preference', 'user-setting']
  ): Promise<VectorMemoryEntry> {
    return vectorMemoryService.storeMemory({
      workspaceId,
      category: 'USER_PREFERENCE',
      title: key,
      content: preference,
      tags: [...tags, 'preference'],
    });
  }

  /**
   * Stores project-specific knowledge (architectural rules, schema notes, invariants).
   */
  public async storeProjectKnowledge(
    key: string,
    knowledgeContent: string,
    workspaceId: string = 'workspace-main',
    tags: string[] = ['architecture', 'project-knowledge'],
    metadata: Record<string, any> = {}
  ): Promise<VectorMemoryEntry> {
    return vectorMemoryService.storeMemory({
      workspaceId,
      category: 'PROJECT_KNOWLEDGE',
      title: key,
      content: knowledgeContent,
      tags,
      metadata,
    });
  }

  /**
   * Stores multi-turn session context to bridge conversations across page reloads.
   */
  public async storeSessionContext(
    sessionId: string,
    key: string,
    summary: string,
    workspaceId: string = 'workspace-main'
  ): Promise<VectorMemoryEntry> {
    return vectorMemoryService.storeMemory({
      workspaceId,
      sessionId,
      category: 'SESSION_CONTEXT',
      title: key,
      content: summary,
      tags: ['session', sessionId],
    });
  }

  /**
   * Semantically recalls relevant contextual memories matching an input query.
   */
  public async recallRelevantContext(query: MemoryRecallQuery): Promise<MemorySearchResult[]> {
    const workspaceId = query.workspaceId || 'workspace-main';
    const topK = query.limit || 5;
    const minScore = query.minSimilarity || 0.35;

    const results = vectorMemoryService.search(workspaceId, query.text, {
      topK: topK * 2,
      minScore,
    });

    let filtered = results;
    if (query.category) {
      filtered = filtered.filter(r => r.entry.category === query.category);
    }
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(r => query.tags!.some(t => r.entry.tags.includes(t)));
    }

    return filtered.slice(0, topK);
  }

  /**
   * Direct semantic search across memories.
   */
  public search(
    workspaceId: string,
    queryText: string,
    options: { topK?: number; minScore?: number; category?: MemoryCategory } = {}
  ): MemorySearchResult[] {
    const rawResults = vectorMemoryService.search(workspaceId, queryText, {
      topK: (options.topK || 5) * 2,
      minScore: options.minScore || 0.30,
    });

    if (options.category) {
      return rawResults.filter(r => r.entry.category === options.category).slice(0, options.topK || 5);
    }

    return rawResults.slice(0, options.topK || 5);
  }

  /**
   * Builds an enriched prompt context block to be injected into LLM queries.
   */
  public async buildInjectedContextPrompt(
    queryText: string,
    workspaceId: string = 'workspace-main'
  ): Promise<string> {
    const recalled = await this.recallRelevantContext({
      text: queryText,
      workspaceId,
      limit: 4,
      minSimilarity: 0.38,
    });

    if (recalled.length === 0) return '';

    const lines: string[] = ['[ZYNTHEOR RECALLED WORKSPACE MEMORY & CONTEXT]:'];
    for (const match of recalled) {
      const catLabel = match.entry.category === 'USER_PREFERENCE' 
        ? 'User Preference' 
        : match.entry.category === 'PROJECT_KNOWLEDGE' 
          ? 'Project Knowledge' 
          : 'Context';
      lines.push(`• [${catLabel}] ${match.entry.title}: ${match.entry.content}`);
    }
    lines.push('[END RECALLED MEMORY]');

    return lines.join('\n');
  }

  /**
   * Retrieves memories by category.
   */
  public getMemoriesByCategory(
    category: MemoryCategory,
    workspaceId: string = 'workspace-main'
  ): VectorMemoryEntry[] {
    return vectorMemoryService.getByCategory(workspaceId, category);
  }

  /**
   * Lists all active memories for a workspace.
   */
  public listAllMemories(workspaceId: string = 'workspace-main'): VectorMemoryEntry[] {
    return vectorMemoryService.listAll(workspaceId);
  }

  /**
   * Deletes a specific memory entry.
   */
  public async deleteMemory(id: string): Promise<boolean> {
    return vectorMemoryService.deleteMemory(id);
  }

  /**
   * Clears all memories for a workspace.
   */
  public clearWorkspace(workspaceId: string): void {
    vectorMemoryService.clearWorkspace(workspaceId);
  }

  /**
   * Computes storage stats.
   */
  public getStats(workspaceId: string = 'workspace-main'): MemoryStorageStats {
    const all = this.listAllMemories(workspaceId);
    return {
      totalCount: all.length,
      preferenceCount: all.filter(m => m.category === 'USER_PREFERENCE').length,
      projectKnowledgeCount: all.filter(m => m.category === 'PROJECT_KNOWLEDGE').length,
      sessionContextCount: all.filter(m => m.category === 'SESSION_CONTEXT').length,
      dimensions: this.dimensions,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const zyntheorMemoryEngine = ZyntheorMemoryEngine.getInstance();
