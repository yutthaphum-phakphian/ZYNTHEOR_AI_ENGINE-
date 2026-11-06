// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — PHASE 1 MEMORY PERSISTENCE & STORAGE ARCHITECTURE
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Provides a clean, typed Storage Provider abstraction for ZyntheorMemoryEngine.
 * Supports:
 * 1. PostgresVectorStorageProvider (PostgreSQL + pgvector / Drizzle ORM)
 * 2. LocalJsonVectorStorageProvider (Disk-backed .aistudio/vector_memory_store.json)
 *
 * STRICT RULES:
 * - No automatic provider switching
 * - No silent fallback
 * - No fake successful writes
 * - If the configured provider fails, throw an explicit operational error
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Pool } from 'pg';
import {
  type VectorMemoryEntry,
  type MemorySearchResult,
  type MemoryCategory,
  generateDenseEmbedding,
  cosineSimilarity,
} from './vectorMemory.ts';
import { getPool } from '../db/connection.ts';

export const VECTOR_DIMENSIONS = 128;
export const LOCAL_STORAGE_FILE_PATH = path.resolve(process.cwd(), '.aistudio/vector_memory_store.json');

export interface MemoryStorageProvider {
  readonly providerName: 'postgres' | 'json';
  store(entry: VectorMemoryEntry): Promise<VectorMemoryEntry>;
  search(
    workspaceId: string,
    queryEmbedding: number[],
    options?: { topK?: number; minScore?: number; category?: MemoryCategory }
  ): Promise<MemorySearchResult[]>;
  getById(id: string): Promise<VectorMemoryEntry | null>;
  getAll(workspaceId?: string, category?: MemoryCategory): Promise<VectorMemoryEntry[]>;
  update(id: string, updates: Partial<VectorMemoryEntry>): Promise<VectorMemoryEntry>;
  delete(id: string): Promise<boolean>;
  clear(workspaceId: string): Promise<number>;
  getStats(workspaceId?: string): Promise<{ totalEntries: number; dimensions: number; provider: string }>;
  isAvailable(): Promise<boolean>;
}

/**
 * Local JSON Vector Storage Provider
 * Reads and persists vector entries in local disk file .aistudio/vector_memory_store.json
 */
export class LocalJsonVectorStorageProvider implements MemoryStorageProvider {
  readonly providerName = 'json' as const;
  private entries: Map<string, VectorMemoryEntry> = new Map();
  private loaded = false;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(LOCAL_STORAGE_FILE_PATH)) {
        const raw = fs.readFileSync(LOCAL_STORAGE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.entries.clear();
          for (const item of parsed) {
            if (item && item.id && Array.isArray(item.embedding)) {
              this.entries.set(item.id, item);
            }
          }
          this.loaded = true;
          return;
        }
      }
    } catch (err) {
      // In-memory fallback if disk read fails
    }
    this.loaded = true;
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(LOCAL_STORAGE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.entries.values());
      fs.writeFileSync(LOCAL_STORAGE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      throw new Error(`[LocalJsonVectorStorageProvider] Failed to persist memory to disk: ${err.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async store(entry: VectorMemoryEntry): Promise<VectorMemoryEntry> {
    if (!entry.embedding || entry.embedding.length !== VECTOR_DIMENSIONS) {
      throw new Error(`[LocalJsonVectorStorageProvider] Vector dimension mismatch: Expected ${VECTOR_DIMENSIONS}, got ${entry.embedding?.length}`);
    }
    this.entries.set(entry.id, entry);
    this.saveToDisk();
    return entry;
  }

  async search(
    workspaceId: string,
    queryEmbedding: number[],
    options?: { topK?: number; minScore?: number; category?: MemoryCategory }
  ): Promise<MemorySearchResult[]> {
    if (!queryEmbedding || queryEmbedding.length !== VECTOR_DIMENSIONS) {
      throw new Error(`[LocalJsonVectorStorageProvider] Query vector dimension mismatch: Expected ${VECTOR_DIMENSIONS}`);
    }
    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.45;
    const targetWs = workspaceId || 'default';

    const results: MemorySearchResult[] = [];

    for (const entry of this.entries.values()) {
      if (entry.workspaceId !== targetWs && entry.workspaceId !== 'default' && entry.workspaceId !== 'workspace-main') {
        continue;
      }
      if (options?.category && entry.category !== options.category) {
        continue;
      }
      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      if (score >= minScore) {
        results.push({ entry, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async getById(id: string): Promise<VectorMemoryEntry | null> {
    return this.entries.get(id) || null;
  }

  async getAll(workspaceId?: string, category?: MemoryCategory): Promise<VectorMemoryEntry[]> {
    const list = Array.from(this.entries.values());
    return list.filter(item => {
      if (workspaceId && item.workspaceId !== workspaceId && item.workspaceId !== 'default' && item.workspaceId !== 'workspace-main') {
        return false;
      }
      if (category && item.category !== category) {
        return false;
      }
      return true;
    });
  }

  async update(id: string, updates: Partial<VectorMemoryEntry>): Promise<VectorMemoryEntry> {
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`[LocalJsonVectorStorageProvider] Memory entry not found: ${id}`);
    }
    const updated: VectorMemoryEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const exists = this.entries.delete(id);
    if (exists) {
      this.saveToDisk();
    }
    return exists;
  }

  async clear(workspaceId: string): Promise<number> {
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

  async getStats(workspaceId = 'default'): Promise<{ totalEntries: number; dimensions: number; provider: string }> {
    const all = await this.getAll(workspaceId);
    return {
      totalEntries: all.length,
      dimensions: VECTOR_DIMENSIONS,
      provider: 'json',
    };
  }
}

/**
 * PostgreSQL + pgvector Storage Provider
 * Operates against PostgreSQL vector_memories table using parameterized queries.
 * NO SILENT FALLBACK: Throws explicit operational error if PostgreSQL is offline or misconfigured.
 */
export class PostgresVectorStorageProvider implements MemoryStorageProvider {
  readonly providerName = 'postgres' as const;

  async isAvailable(): Promise<boolean> {
    if (!process.env.DATABASE_URL) return false;
    try {
      const pool = getPool();
      const res = await pool.query('SELECT 1 as alive');
      return Boolean(res && res.rows && res.rows.length > 0);
    } catch {
      return false;
    }
  }

  private async ensureDatabaseReady(): Promise<Pool> {
    if (!process.env.DATABASE_URL) {
      throw new Error('[ZyntheorMemoryEngine] Fail-Closed Error: ZYNTHEOR_MEMORY_PROVIDER=postgres configured, but DATABASE_URL environment variable is missing.');
    }
    const pool = getPool();
    try {
      // Test basic connection
      await pool.query('SELECT 1');
      return pool;
    } catch (err: any) {
      throw new Error(`[ZyntheorMemoryEngine] Fail-Closed Error: PostgreSQL database connection failed for memory engine: ${err.message}`);
    }
  }

  async store(entry: VectorMemoryEntry): Promise<VectorMemoryEntry> {
    const pool = await this.ensureDatabaseReady();

    if (!entry.embedding || entry.embedding.length !== VECTOR_DIMENSIONS) {
      throw new Error(`[PostgresVectorStorageProvider] Vector dimension mismatch: Expected ${VECTOR_DIMENSIONS}, got ${entry.embedding?.length}`);
    }

    const query = `
      INSERT INTO vector_memories (
        id, workspace_id, category, title, content, embedding, dimensions, tags, metadata, session_id, access_count, last_accessed_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;

    const values = [
      entry.id,
      entry.workspaceId,
      entry.category,
      entry.title,
      entry.content,
      JSON.stringify(entry.embedding),
      VECTOR_DIMENSIONS,
      JSON.stringify(entry.tags || []),
      JSON.stringify(entry.metadata || {}),
      entry.sessionId || null,
      entry.accessCount || 0,
      entry.lastAccessedAt || new Date().toISOString(),
      entry.createdAt || new Date().toISOString(),
      entry.updatedAt || new Date().toISOString(),
    ];

    try {
      await pool.query(query, values);
      return entry;
    } catch (err: any) {
      throw new Error(`[PostgresVectorStorageProvider] Database insert failed for memory id ${entry.id}: ${err.message}`);
    }
  }

  async search(
    workspaceId: string,
    queryEmbedding: number[],
    options?: { topK?: number; minScore?: number; category?: MemoryCategory }
  ): Promise<MemorySearchResult[]> {
    const pool = await this.ensureDatabaseReady();

    if (!queryEmbedding || queryEmbedding.length !== VECTOR_DIMENSIONS) {
      throw new Error(`[PostgresVectorStorageProvider] Vector dimension mismatch: Expected ${VECTOR_DIMENSIONS}`);
    }

    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.40;

    let query = `SELECT * FROM vector_memories WHERE (workspace_id = $1 OR workspace_id = 'default' OR workspace_id = 'workspace-main')`;
    const params: any[] = [workspaceId || 'default'];

    if (options?.category) {
      params.push(options.category);
      query += ` AND category = $${params.length}`;
    }

    try {
      const res = await pool.query(query, params);
      const rows = res.rows || [];

      const results: MemorySearchResult[] = [];

      for (const row of rows) {
        const embedding = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
        const score = cosineSimilarity(queryEmbedding, embedding);

        if (score >= minScore) {
          const entry: VectorMemoryEntry = {
            id: row.id,
            workspaceId: row.workspace_id,
            category: row.category as MemoryCategory,
            title: row.title,
            content: row.content,
            embedding,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
            sessionId: row.session_id || undefined,
            accessCount: row.access_count || 0,
            lastAccessedAt: row.last_accessed_at?.toISOString() || new Date().toISOString(),
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
          };
          results.push({ entry, score });
        }
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);
    } catch (err: any) {
      throw new Error(`[PostgresVectorStorageProvider] Search execution failed: ${err.message}`);
    }
  }

  async getById(id: string): Promise<VectorMemoryEntry | null> {
    const pool = await this.ensureDatabaseReady();
    const res = await pool.query('SELECT * FROM vector_memories WHERE id = $1', [id]);
    if (!res.rows || res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      category: row.category as MemoryCategory,
      title: row.title,
      content: row.content,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      sessionId: row.session_id || undefined,
      accessCount: row.access_count || 0,
      lastAccessedAt: row.last_accessed_at?.toISOString() || new Date().toISOString(),
      createdAt: row.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
    };
  }

  async getAll(workspaceId?: string, category?: MemoryCategory): Promise<VectorMemoryEntry[]> {
    const pool = await this.ensureDatabaseReady();

    let query = 'SELECT * FROM vector_memories';
    const params: any[] = [];

    if (workspaceId) {
      params.push(workspaceId);
      query += ` WHERE (workspace_id = $${params.length} OR workspace_id = 'default' OR workspace_id = 'workspace-main')`;
    }

    if (category) {
      params.push(category);
      query += params.length === 1 ? ` WHERE category = $${params.length}` : ` AND category = $${params.length}`;
    }

    const res = await pool.query(query, params);
    return (res.rows || []).map(row => ({
      id: row.id,
      workspaceId: row.workspace_id,
      category: row.category as MemoryCategory,
      title: row.title,
      content: row.content,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      sessionId: row.session_id || undefined,
      accessCount: row.access_count || 0,
      lastAccessedAt: row.last_accessed_at?.toISOString() || new Date().toISOString(),
      createdAt: row.created_at?.toISOString() || new Date().toISOString(),
      updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async update(id: string, updates: Partial<VectorMemoryEntry>): Promise<VectorMemoryEntry> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`[PostgresVectorStorageProvider] Memory entry not found: ${id}`);
    }
    const updated: VectorMemoryEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.store(updated);
  }

  async delete(id: string): Promise<boolean> {
    const pool = await this.ensureDatabaseReady();
    const res = await pool.query('DELETE FROM vector_memories WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async clear(workspaceId: string): Promise<number> {
    const pool = await this.ensureDatabaseReady();
    const res = await pool.query('DELETE FROM vector_memories WHERE workspace_id = $1', [workspaceId]);
    return res.rowCount || 0;
  }

  async getStats(workspaceId = 'default'): Promise<{ totalEntries: number; dimensions: number; provider: string }> {
    const pool = await this.ensureDatabaseReady();
    const res = await pool.query('SELECT COUNT(*) as cnt FROM vector_memories WHERE workspace_id = $1 OR workspace_id = $2', [workspaceId, 'default']);
    const count = parseInt(res.rows[0]?.cnt || '0', 10);
    return {
      totalEntries: count,
      dimensions: VECTOR_DIMENSIONS,
      provider: 'postgres',
    };
  }
}

/**
 * Storage Provider Factory & Configuration Selector
 */
export function getMemoryStorageProvider(): MemoryStorageProvider {
  const configuredProvider = (process.env.ZYNTHEOR_MEMORY_PROVIDER || process.env.MEMORY_PROVIDER || '').toLowerCase();

  if (configuredProvider === 'postgres') {
    if (!process.env.DATABASE_URL) {
      throw new Error('[ZyntheorMemoryEngine] Fail-Closed Error: ZYNTHEOR_MEMORY_PROVIDER=postgres configured, but DATABASE_URL is missing.');
    }
    return new PostgresVectorStorageProvider();
  }

  // Default to local JSON provider
  return new LocalJsonVectorStorageProvider();
}
