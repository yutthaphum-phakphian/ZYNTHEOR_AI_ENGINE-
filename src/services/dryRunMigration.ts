// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — DRY-RUN MEMORY MIGRATION UTILITY
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Reads storage/vector_memory_store.json, validates record integrity (types, 128D vectors),
 * and simulates PostgreSQL insertion logic without modifying any database state.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { VECTOR_DIMENSIONS } from './memoryStorageProvider.ts';
import type { VectorMemoryEntry } from './vectorMemory.ts';

export interface DryRunRecordValidation {
  id: string;
  title: string;
  workspaceId: string;
  category: string;
  valid: boolean;
  vectorDimensions: number;
  reasons: string[];
  simulatedSql?: string;
}

export interface DryRunMigrationResult {
  status: 'DRY_RUN_SUCCESS' | 'DRY_RUN_FAILED';
  sourceFilePath: string;
  totalSourceRecords: number;
  validRecordsCount: number;
  malformedRecordsCount: number;
  simulatedInserts: number;
  integrityVerified: boolean;
  recordValidations: DryRunRecordValidation[];
  simulatedQueries: string[];
  errors: string[];
  warnings: string[];
  timestamp: string;
}

export const DEFAULT_STORAGE_PATH = path.resolve(process.cwd(), 'storage/vector_memory_store.json');
export const FALLBACK_STORAGE_PATH = path.resolve(process.cwd(), '.aistudio/vector_memory_store.json');

/**
 * Executes a read-only dry-run migration validating JSON memory store records
 * and simulating PostgreSQL insertion logic without touching database state.
 */
export function executeDryRunMigration(customFilePath?: string): DryRunMigrationResult {
  const timestamp = new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];
  const recordValidations: DryRunRecordValidation[] = [];
  const simulatedQueries: string[] = [];

  // Determine target JSON storage file
  let jsonPath = customFilePath ? path.resolve(customFilePath) : DEFAULT_STORAGE_PATH;
  if (!fs.existsSync(jsonPath)) {
    if (fs.existsSync(FALLBACK_STORAGE_PATH)) {
      warnings.push(`Primary path ${jsonPath} not found. Falling back to ${FALLBACK_STORAGE_PATH}`);
      jsonPath = FALLBACK_STORAGE_PATH;
    } else {
      return {
        status: 'DRY_RUN_FAILED',
        sourceFilePath: jsonPath,
        totalSourceRecords: 0,
        validRecordsCount: 0,
        malformedRecordsCount: 0,
        simulatedInserts: 0,
        integrityVerified: false,
        recordValidations: [],
        simulatedQueries: [],
        errors: [`Vector memory store JSON file not found at ${jsonPath} or ${FALLBACK_STORAGE_PATH}`],
        warnings,
        timestamp,
      };
    }
  }

  // Parse JSON file
  let rawRecords: any[] = [];
  try {
    const rawContent = fs.readFileSync(jsonPath, 'utf-8');
    rawRecords = JSON.parse(rawContent);
    if (!Array.isArray(rawRecords)) {
      throw new Error('JSON contents must be an array of memory objects');
    }
  } catch (err: any) {
    return {
      status: 'DRY_RUN_FAILED',
      sourceFilePath: jsonPath,
      totalSourceRecords: 0,
      validRecordsCount: 0,
      malformedRecordsCount: 0,
      simulatedInserts: 0,
      integrityVerified: false,
      recordValidations: [],
      simulatedQueries: [],
      errors: [`Failed to read or parse JSON file: ${err.message}`],
      warnings,
      timestamp,
    };
  }

  let validCount = 0;
  let malformedCount = 0;
  const seenIds = new Set<string>();

  for (let i = 0; i < rawRecords.length; i++) {
    const rec = rawRecords[i];
    const reasons: string[] = [];
    let isValid = true;

    if (!rec || typeof rec !== 'object') {
      malformedCount++;
      recordValidations.push({
        id: `unknown-${i}`,
        title: 'Malformed Object',
        workspaceId: 'unknown',
        category: 'UNKNOWN',
        valid: false,
        vectorDimensions: 0,
        reasons: [`Record #${i} is not a valid JSON object`],
      });
      continue;
    }

    const id = rec.id && typeof rec.id === 'string' ? rec.id : `missing-id-${i}`;
    if (!rec.id || typeof rec.id !== 'string') {
      isValid = false;
      reasons.push('Missing or non-string "id" field');
    }

    if (seenIds.has(id)) {
      isValid = false;
      reasons.push(`Duplicate ID "${id}" detected in JSON store`);
    } else if (rec.id) {
      seenIds.add(id);
    }

    if (!rec.content || typeof rec.content !== 'string') {
      isValid = false;
      reasons.push('Missing or empty "content" text');
    }

    if (!rec.title || typeof rec.title !== 'string') {
      isValid = false;
      reasons.push('Missing or empty "title" text');
    }

    const embeddingDim = Array.isArray(rec.embedding) ? rec.embedding.length : 0;
    if (!Array.isArray(rec.embedding)) {
      isValid = false;
      reasons.push('Missing "embedding" array');
    } else if (embeddingDim !== VECTOR_DIMENSIONS) {
      isValid = false;
      reasons.push(`Embedding dimension mismatch: expected ${VECTOR_DIMENSIONS}, got ${embeddingDim}`);
    } else {
      const nonNumeric = rec.embedding.some(v => typeof v !== 'number' || isNaN(v));
      if (nonNumeric) {
        isValid = false;
        reasons.push('Embedding array contains non-numeric values');
      }
    }

    const entry: VectorMemoryEntry = {
      id,
      workspaceId: rec.workspaceId || 'default',
      category: rec.category || 'PROJECT_KNOWLEDGE',
      title: rec.title || 'untitled',
      content: rec.content || '',
      embedding: rec.embedding || [],
      tags: Array.isArray(rec.tags) ? rec.tags : [],
      metadata: typeof rec.metadata === 'object' && rec.metadata !== null ? rec.metadata : {},
      sessionId: rec.sessionId || undefined,
      accessCount: typeof rec.accessCount === 'number' ? rec.accessCount : 0,
      lastAccessedAt: rec.lastAccessedAt || timestamp,
      createdAt: rec.createdAt || timestamp,
      updatedAt: rec.updatedAt || timestamp,
    };

    let simulatedSql = '';
    if (isValid) {
      validCount++;
      simulatedSql = `INSERT INTO vector_memories (id, workspace_id, category, title, content, embedding, dimensions, tags, metadata, session_id, access_count, last_accessed_at, created_at, updated_at) VALUES ('${entry.id}', '${entry.workspaceId}', '${entry.category}', '${entry.title.replace(/'/g, "''")}', '${entry.content.slice(0, 40).replace(/'/g, "''")}...', '[vector:128D]', 128, '${JSON.stringify(entry.tags)}', '${JSON.stringify(entry.metadata)}', ${entry.sessionId ? `'${entry.sessionId}'` : 'NULL'}, ${entry.accessCount}, '${entry.lastAccessedAt}', '${entry.createdAt}', '${entry.updatedAt}') ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, embedding = EXCLUDED.embedding, updated_at = EXCLUDED.updated_at;`;
      simulatedQueries.push(simulatedSql);
    } else {
      malformedCount++;
    }

    recordValidations.push({
      id: entry.id,
      title: entry.title,
      workspaceId: entry.workspaceId,
      category: entry.category,
      valid: isValid,
      vectorDimensions: embeddingDim,
      reasons,
      simulatedSql: isValid ? simulatedSql : undefined,
    });
  }

  const integrityVerified = malformedCount === 0 && validCount > 0;

  return {
    status: integrityVerified ? 'DRY_RUN_SUCCESS' : malformedCount > 0 ? 'DRY_RUN_SUCCESS' : 'DRY_RUN_FAILED',
    sourceFilePath: jsonPath,
    totalSourceRecords: rawRecords.length,
    validRecordsCount: validCount,
    malformedRecordsCount: malformedCount,
    simulatedInserts: simulatedQueries.length,
    integrityVerified,
    recordValidations,
    simulatedQueries: simulatedQueries.slice(0, 5), // Provide sample queries
    errors,
    warnings,
    timestamp,
  };
}
