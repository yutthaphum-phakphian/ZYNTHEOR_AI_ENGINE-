import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export interface CodeEmbeddingRecord {
  filepath: string;
  relativePath: string;
  contentSnippet: string;
  vector: number[];
  byteSize: number;
  indexedAt: string;
}

export interface CodebaseIndexMetadata {
  indexedFiles: number;
  lastIndexedAt: string | null;
  model: string;
  dimensions: number;
  status: 'IDLE' | 'INDEXING' | 'READY' | 'ERROR' | 'UNCONFIGURED';
  error?: string;
}

export interface SearchResult {
  filepath: string;
  relativePath: string;
  score: number;
  snippet: string;
}

const STORAGE_PATH = path.join(process.cwd(), 'workspace_data', 'vector_index.json');
const EMBEDDING_MODEL = 'text-embedding-004';

// Supported extensions for codebase indexing
const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.html', '.md', '.sql', '.yaml', '.yml'
]);

// Ignored directories
const IGNORED_DIRS = new Set([
  'node_modules', 'dist', '.git', '.cache', 'workspace_data', 'backups', 'data'
]);

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

export class VectorMemory {
  private static records: CodeEmbeddingRecord[] = [];
  private static isIndexing = false;
  private static lastIndexedAt: string | null = null;
  private static lastError: string | null = null;
  private static initialized = false;

  private static getApiKey(): string | null {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  }

  private static loadPersistedIndex(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      if (existsSync(STORAGE_PATH)) {
        const raw = readFileSync(STORAGE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.records)) {
          this.records = data.records;
          this.lastIndexedAt = data.lastIndexedAt || null;
        }
      }
    } catch (e) {
      console.warn('[VectorMemory] Could not load persisted index:', e);
      this.records = [];
    }
  }

  private static savePersistedIndex(): void {
    try {
      const dir = path.dirname(STORAGE_PATH);
      if (!existsSync(dir)) {
        writeFileSync(dir, '');
      }
      writeFileSync(
        STORAGE_PATH,
        JSON.stringify({
          model: EMBEDDING_MODEL,
          dimensions: this.records[0]?.vector?.length || 768,
          lastIndexedAt: this.lastIndexedAt,
          indexedFiles: this.records.length,
          records: this.records,
        }, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.error('[VectorMemory] Failed to persist vector index:', e);
    }
  }

  static getStatus(): CodebaseIndexMetadata {
    this.loadPersistedIndex();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        indexedFiles: this.records.length,
        lastIndexedAt: this.lastIndexedAt,
        model: EMBEDDING_MODEL,
        dimensions: this.records[0]?.vector?.length || 768,
        status: 'UNCONFIGURED',
        error: 'GEMINI_API_KEY is not configured. Embeddings require a valid Gemini API key.',
      };
    }

    if (this.isIndexing) {
      return {
        indexedFiles: this.records.length,
        lastIndexedAt: this.lastIndexedAt,
        model: EMBEDDING_MODEL,
        dimensions: this.records[0]?.vector?.length || 768,
        status: 'INDEXING',
      };
    }

    if (this.lastError) {
      return {
        indexedFiles: this.records.length,
        lastIndexedAt: this.lastIndexedAt,
        model: EMBEDDING_MODEL,
        dimensions: this.records[0]?.vector?.length || 768,
        status: 'ERROR',
        error: this.lastError,
      };
    }

    return {
      indexedFiles: this.records.length,
      lastIndexedAt: this.lastIndexedAt,
      model: EMBEDDING_MODEL,
      dimensions: this.records[0]?.vector?.length || 768,
      status: this.records.length > 0 ? 'READY' : 'IDLE',
    };
  }

  private static async getEmbedding(text: string): Promise<number[] | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text.slice(0, 8000), // Protect against token limits
      });

      const values = (response as any)?.embedding?.values ?? (response as any)?.embeddings?.[0]?.values;
      if (Array.isArray(values)) {
        return values;
      }
      return null;
    } catch (err: any) {
      console.error('[VectorMemory] Embedding error:', err?.message || err);
      throw err;
    }
  }

  private static async scanDirectory(dir: string, baseDir: string, maxFiles = 100): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= maxFiles) break;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            const nested = await this.scanDirectory(fullPath, baseDir, maxFiles - files.length);
            files.push(...nested);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ALLOWED_EXTENSIONS.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (err) {
      console.warn(`[VectorMemory] Skipping unreadable directory ${dir}:`, err);
    }
    return files;
  }

  static async indexCodebase(targetDirs: string[] = ['src', 'lib']): Promise<{ success: boolean; indexedCount: number; error?: string }> {
    this.loadPersistedIndex();
    if (this.isIndexing) {
      return { success: false, indexedCount: this.records.length, error: 'Indexing already in progress' };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, indexedCount: 0, error: 'GEMINI_API_KEY is not configured.' };
    }

    this.isIndexing = true;
    this.lastError = null;

    try {
      const rootDir = process.cwd();
      const allFiles: string[] = [];

      for (const dirName of targetDirs) {
        const fullDir = path.join(rootDir, dirName);
        if (existsSync(fullDir)) {
          const scanned = await this.scanDirectory(fullDir, rootDir, 80);
          allFiles.push(...scanned);
        }
      }

      const newRecords: CodeEmbeddingRecord[] = [];

      for (const filePath of allFiles) {
        try {
          const stat = await fs.stat(filePath);
          if (stat.size > 200_000) continue; // Skip huge files

          const content = await fs.readFile(filePath, 'utf-8');
          const relPath = path.relative(rootDir, filePath);
          const snippet = content.slice(0, 1500);

          // Embed relative path + content snippet for high contextual relevance
          const embeddingText = `File: ${relPath}\n\n${snippet}`;
          const vector = await this.getEmbedding(embeddingText);

          if (vector && vector.length > 0) {
            newRecords.push({
              filepath: filePath,
              relativePath: relPath,
              contentSnippet: snippet.slice(0, 500),
              vector,
              byteSize: stat.size,
              indexedAt: new Date().toISOString(),
            });
          }
        } catch (fileErr: any) {
          console.warn(`[VectorMemory] Could not embed file ${filePath}:`, fileErr?.message || fileErr);
        }
      }

      this.records = newRecords;
      this.lastIndexedAt = new Date().toISOString();
      this.savePersistedIndex();

      return { success: true, indexedCount: this.records.length };
    } catch (e: any) {
      this.lastError = e?.message || String(e);
      return { success: false, indexedCount: 0, error: this.lastError || undefined };
    } finally {
      this.isIndexing = false;
    }
  }

  static async search(query: string, limit = 5): Promise<SearchResult[]> {
    this.loadPersistedIndex();
    if (!query || !query.trim()) return [];
    if (this.records.length === 0) return [];

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured for semantic search');
    }

    const queryVector = await this.getEmbedding(query);
    if (!queryVector) return [];

    const scored = this.records.map((rec) => ({
      filepath: rec.filepath,
      relativePath: rec.relativePath,
      score: cosineSimilarity(queryVector, rec.vector),
      snippet: rec.contentSnippet,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  static getRecordCount(): number {
    this.loadPersistedIndex();
    return this.records.length;
  }
}
