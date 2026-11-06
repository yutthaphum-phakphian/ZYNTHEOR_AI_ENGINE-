/**
 * ZYNTHEOR INTELLIGENCE ENGINE — LONG-TERM VECTOR MEMORY LAYER
 * ============================================================
 * Vector database layer for storing and retrieving contextual user preferences,
 * project-specific knowledge, and multi-session continuity across the platform.
 *
 * Capabilities:
 * - 128-dimensional sovereign semantic vector embeddings (deterministic local-first + offline)
 * - Cosine similarity vector search with relevance thresholding
 * - Categorized memory: USER_PREFERENCE | PROJECT_KNOWLEDGE | SESSION_CONTEXT | DOMAIN_ENTITY
 * - Context injection builder for Intelligence Core
 * - Cross-session continuity & persistent storage
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type MemoryCategory =
  | 'USER_PREFERENCE'
  | 'PROJECT_KNOWLEDGE'
  | 'SESSION_CONTEXT'
  | 'DOMAIN_ENTITY';

export interface VectorMemoryEntry {
  id: string;
  workspaceId: string;
  category: MemoryCategory;
  title: string;
  content: string;
  embedding: number[]; // 128-dimensional dense vector
  tags: string[];
  metadata: Record<string, any>;
  sessionId?: string;
  accessCount: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorySearchResult {
  entry: VectorMemoryEntry;
  score: number; // Cosine similarity 0.0 - 1.0
}

const VECTOR_DIMENSIONS = 128;
const STORAGE_FILE_PATH = path.resolve(process.cwd(), '.aistudio/vector_memory_store.json');

/**
 * Deterministic Sovereign Semantic Embedding Generator
 * Computes a 128-dimensional unit vector using n-gram frequency,
 * semantic token hashing, and positional weighting without external API requirement.
 */
export function generateDenseEmbedding(text: string): number[] {
  const normalized = (text || '').toLowerCase().trim();
  const vector = new Array(VECTOR_DIMENSIONS).fill(0);

  if (!normalized) {
    // Return unit vector along first dimension for empty input
    vector[0] = 1.0;
    return vector;
  }

  // 1. Word token projections
  const words = normalized.split(/[\s,.;:!?()[\]{}"'`\-\\/]+/).filter(w => w.length > 0);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash = createHash('sha256').update(word).digest();
    for (let d = 0; d < 4; d++) {
      const idx = hash[d] % VECTOR_DIMENSIONS;
      const sign = (hash[d + 4] % 2 === 0) ? 1 : -1;
      const weight = 1.0 + (1.0 / (i + 1)); // slight positional boost
      vector[idx] += sign * weight;
    }
  }

  // 2. Character 3-grams for morphology & Thai/multilingual subword capture
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    const hash = createHash('md5').update(trigram).digest();
    const idx = (hash[0] ^ hash[1]) % VECTOR_DIMENSIONS;
    const sign = (hash[2] % 2 === 0) ? 1 : -1;
    vector[idx] += sign * 0.5;
  }

  // 3. Normalize to unit length (L2 norm = 1.0)
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    vector[i] = Number((vector[i] / norm).toFixed(6));
  }

  return vector;
}

/**
 * Compute Cosine Similarity between two normalized unit vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  // Clamp between -1.0 and 1.0, convert to 0..1 scale for ranking
  return Math.max(0, Math.min(1, (dotProduct + 1) / 2));
}

import { getMemoryStorageProvider, type MemoryStorageProvider } from './memoryStorageProvider.ts';

export class LongTermVectorMemoryService {
  private entries: Map<string, VectorMemoryEntry> = new Map();
  private _provider: MemoryStorageProvider | null = null;
  private isLoaded = false;

  constructor() {
    this.loadFromDisk();
  }

  public getActiveProvider(): MemoryStorageProvider {
    if (!this._provider) {
      this._provider = getMemoryStorageProvider();
    }
    return this._provider;
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE_PATH)) {
        const raw = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.entries.clear();
          for (const item of parsed) {
            this.entries.set(item.id, item);
          }
          this.isLoaded = true;
          return;
        }
      }
    } catch {
      // In-memory fallback
    }

    // Pre-seed default core memories
    this.seedDefaultProjectMemories();
    this.isLoaded = true;
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(STORAGE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.entries.values());
      fs.writeFileSync(STORAGE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore disk write errors in restricted sandboxes
    }
  }

  private seedDefaultProjectMemories() {
    this.storeMemory({
      workspaceId: 'default',
      category: 'PROJECT_KNOWLEDGE',
      title: 'ZYNTHEOR Architectural Identity & Core Separation',
      content:
        'ZYNTHEOR AI ENGINE is the platform; ZYNTHEOR INTELLIGENCE is the shared runtime; ZYNTHEOR CORE is the native model family. External models like Gemini are strictly external providers and never relabeled as CORE.',
      tags: ['architecture', 'identity', 'sovereignty', 'models'],
      metadata: { importance: 'critical', provenance: 'core-constitution' },
    });

    this.storeMemory({
      workspaceId: 'default',
      category: 'USER_PREFERENCE',
      title: 'Default Communication & Language Preference',
      content:
        'Thai language is first-class, supported with professional tone, clean Markdown formatting, and explicit architectural transparency.',
      tags: ['preference', 'language', 'thai', 'tone'],
      metadata: { importance: 'high', autoApplied: true },
    });

    this.storeMemory({
      workspaceId: 'default',
      category: 'PROJECT_KNOWLEDGE',
      title: 'Adaptive Reasoning & Safe Execution Governance',
      content:
        'Model temperature and CoT depth are automatically calibrated by input complexity. High-impact operations require fail-closed validation and human approval gates.',
      tags: ['reasoning', 'governance', 'security', 'approval'],
      metadata: { importance: 'high' },
    });
  }

  /**
   * Store a new entry in the Vector Database with an auto-generated embedding
   */
  public storeMemory(params: {
    workspaceId: string;
    category: MemoryCategory;
    title: string;
    content: string;
    tags?: string[];
    metadata?: Record<string, any>;
    sessionId?: string;
  }): VectorMemoryEntry {
    const textToEmbed = `${params.title}\n${params.content}\n${(params.tags || []).join(' ')}`;
    const embedding = generateDenseEmbedding(textToEmbed);

    const id = `vec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const entry: VectorMemoryEntry = {
      id,
      workspaceId: params.workspaceId || 'default',
      category: params.category,
      title: params.title.trim(),
      content: params.content.trim(),
      embedding,
      tags: params.tags || [],
      metadata: params.metadata || {},
      sessionId: params.sessionId,
      accessCount: 0,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.entries.set(id, entry);
    this.saveToDisk();

    // Also persist through active provider if Postgres
    const activeProvider = this.getActiveProvider();
    if (activeProvider.providerName === 'postgres') {
      activeProvider.store(entry).catch(err => {
        console.error('[LongTermVectorMemoryService] Postgres store error:', err.message);
      });
    }

    return entry;
  }

  /**
   * Semantic Vector Search using Cosine Similarity
   */
  public search(
    workspaceId: string,
    query: string,
    options?: {
      topK?: number;
      minScore?: number;
      category?: MemoryCategory;
    }
  ): MemorySearchResult[] {
    const queryEmbedding = generateDenseEmbedding(query);
    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.45;
    const targetWs = workspaceId || 'default';

    const results: MemorySearchResult[] = [];

    for (const entry of this.entries.values()) {
      if (entry.workspaceId !== targetWs && entry.workspaceId !== 'default') {
        continue;
      }
      if (options?.category && entry.category !== options.category) {
        continue;
      }

      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      if (score >= minScore) {
        // Record access
        entry.accessCount += 1;
        entry.lastAccessedAt = new Date().toISOString();
        results.push({ entry, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const ranked = results.slice(0, topK);

    if (ranked.length > 0) {
      this.saveToDisk();
    }

    return ranked;
  }

  /**
   * Build contextual string block to inject into LLM prompts
   */
  public buildMemoryPromptContext(
    workspaceId: string,
    query: string,
    maxEntries = 3
  ): {
    contextText: string;
    recalledMemories: Array<{ id: string; title: string; category: string; score: number }>;
  } {
    const searchResults = this.search(workspaceId, query, {
      topK: maxEntries,
      minScore: 0.50,
    });

    if (searchResults.length === 0) {
      return { contextText: '', recalledMemories: [] };
    }

    const recalledMemories = searchResults.map(r => ({
      id: r.entry.id,
      title: r.entry.title,
      category: r.entry.category,
      score: Number(r.score.toFixed(3)),
    }));

    const lines = [
      '[LONG-TERM RECALLED MEMORY CONTEXT]',
      ...searchResults.map(
        (r, idx) =>
          `[Memory #${idx + 1} | Category: ${r.entry.category} | Relevance: ${(r.score * 100).toFixed(1)}%]\n` +
          `Title: ${r.entry.title}\n` +
          `Detail: ${r.entry.content}`
      ),
      '[/LONG-TERM RECALLED MEMORY CONTEXT]',
    ];

    return {
      contextText: lines.join('\n\n'),
      recalledMemories,
    };
  }

  public getAll(workspaceId?: string, category?: MemoryCategory): VectorMemoryEntry[] {
    const list = Array.from(this.entries.values());
    return list.filter(item => {
      if (workspaceId && item.workspaceId !== workspaceId && item.workspaceId !== 'default') {
        return false;
      }
      if (category && item.category !== category) {
        return false;
      }
      return true;
    });
  }

  public getById(id: string): VectorMemoryEntry | null {
    return this.entries.get(id) || null;
  }

  public delete(id: string): boolean {
    const exists = this.entries.delete(id);
    if (exists) {
      this.saveToDisk();
    }
    return exists;
  }

  public clear(workspaceId: string): number {
    let count = 0;
    for (const [id, entry] of this.entries.entries()) {
      if (entry.workspaceId === workspaceId) {
        this.entries.delete(id);
        count++;
      }
    }
    if (count > 0) {
      this.saveToDisk();
    }
    return count;
  }

  public getStats(workspaceId = 'default'): {
    totalEntries: number;
    byCategory: Record<MemoryCategory, number>;
    dimensions: number;
    storagePath: string;
  } {
    const entries = this.getAll(workspaceId);
    const byCategory: Record<MemoryCategory, number> = {
      USER_PREFERENCE: 0,
      PROJECT_KNOWLEDGE: 0,
      SESSION_CONTEXT: 0,
      DOMAIN_ENTITY: 0,
    };

    for (const e of entries) {
      if (byCategory[e.category] !== undefined) {
        byCategory[e.category] += 1;
      }
    }

    return {
      totalEntries: entries.length,
      byCategory,
      dimensions: VECTOR_DIMENSIONS,
      storagePath: STORAGE_FILE_PATH,
    };
  }
}

export const vectorMemoryService = new LongTermVectorMemoryService();
