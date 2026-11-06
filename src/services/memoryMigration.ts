// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — PHASE 3 DATA INTEGRITY & MIGRATION SERVICE
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Provides safe, idempotent migration from local JSON memory store (.aistudio/vector_memory_store.json)
 * into PostgreSQL vector_memories table.
 *
 * Requirements:
 * 1. Read & validate existing JSON records.
 * 2. Detect malformed records & vector dimension mismatch.
 * 3. Support dry-run migration mode.
 * 4. Idempotent insertion (ON CONFLICT DO UPDATE).
 * 5. Record verification & destination count integrity check.
 * 6. Never delete original JSON file automatically.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { LOCAL_STORAGE_FILE_PATH, VECTOR_DIMENSIONS } from './memoryStorageProvider.ts';
import { getPool } from '../db/connection.ts';
import type { VectorMemoryEntry } from './vectorMemory.ts';

export interface MigrationOptions {
  dryRun?: boolean;
  jsonFilePath?: string;
  targetWorkspaceId?: string;
}

export interface MigrationResult {
  status: 'SUCCESS' | 'DRY_RUN_COMPLETED' | 'FAILED';
  totalSourceRecords: number;
  validRecordsCount: number;
  malformedRecordsCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  integrityVerified: boolean;
  destinationRecordCount?: number;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

export async function migrateJsonToPostgres(options: MigrationOptions = {}): Promise<MigrationResult> {
  const isDryRun = Boolean(options.dryRun);
  const jsonPath = options.jsonFilePath || LOCAL_STORAGE_FILE_PATH;
  const errors: string[] = [];
  const warnings: string[] = [];

  const timestamp = new Date().toISOString();

  // 1. Check if JSON source file exists
  if (!fs.existsSync(jsonPath)) {
    return {
      status: 'SUCCESS',
      totalSourceRecords: 0,
      validRecordsCount: 0,
      malformedRecordsCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      integrityVerified: true,
      errors: [],
      warnings: [`Source JSON file not found at ${jsonPath} — zero records to migrate.`],
      timestamp,
    };
  }

  // 2. Read and parse JSON content
  let rawRecords: any[] = [];
  try {
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    rawRecords = JSON.parse(fileContent);
    if (!Array.isArray(rawRecords)) {
      throw new Error('JSON content is not a valid array');
    }
  } catch (err: any) {
    return {
      status: 'FAILED',
      totalSourceRecords: 0,
      validRecordsCount: 0,
      malformedRecordsCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      integrityVerified: false,
      errors: [`Failed to parse JSON file at ${jsonPath}: ${err.message}`],
      warnings,
      timestamp,
    };
  }

  // 3. Validate JSON Records
  const validEntries: VectorMemoryEntry[] = [];
  let malformedCount = 0;
  const seenIds = new Set<string>();

  for (let i = 0; i < rawRecords.length; i++) {
    const item = rawRecords[i];
    if (!item || typeof item !== 'object') {
      malformedCount++;
      warnings.push(`Record #${i} is not a valid object.`);
      continue;
    }

    if (!item.id || typeof item.id !== 'string') {
      malformedCount++;
      warnings.push(`Record #${i} missing valid id.`);
      continue;
    }

    if (seenIds.has(item.id)) {
      warnings.push(`Duplicate ID detected: ${item.id}. Keeping first occurrence.`);
      continue;
    }
    seenIds.add(item.id);

    if (!item.content || typeof item.content !== 'string') {
      malformedCount++;
      warnings.push(`Record #${item.id} missing content string.`);
      continue;
    }

    if (!Array.isArray(item.embedding) || item.embedding.length !== VECTOR_DIMENSIONS) {
      malformedCount++;
      warnings.push(`Record #${item.id} embedding dimension mismatch: Expected ${VECTOR_DIMENSIONS}, got ${item.embedding?.length}`);
      continue;
    }

    validEntries.push({
      id: item.id,
      workspaceId: item.workspaceId || options.targetWorkspaceId || 'default',
      category: item.category || 'PROJECT_KNOWLEDGE',
      title: item.title || 'untitled',
      content: item.content,
      embedding: item.embedding,
      tags: Array.isArray(item.tags) ? item.tags : [],
      metadata: typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {},
      sessionId: item.sessionId || undefined,
      accessCount: typeof item.accessCount === 'number' ? item.accessCount : 0,
      lastAccessedAt: item.lastAccessedAt || timestamp,
      createdAt: item.createdAt || timestamp,
      updatedAt: item.updatedAt || timestamp,
    });
  }

  if (isDryRun) {
    return {
      status: 'DRY_RUN_COMPLETED',
      totalSourceRecords: rawRecords.length,
      validRecordsCount: validEntries.length,
      malformedRecordsCount: malformedCount,
      migratedCount: 0,
      skippedCount: validEntries.length,
      failedCount: 0,
      integrityVerified: errors.length === 0,
      errors,
      warnings,
      timestamp,
    };
  }

  // 4. Perform PostgreSQL Database Insertion
  if (!process.env.DATABASE_URL) {
    return {
      status: 'FAILED',
      totalSourceRecords: rawRecords.length,
      validRecordsCount: validEntries.length,
      malformedRecordsCount: malformedCount,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: validEntries.length,
      integrityVerified: false,
      errors: ['DATABASE_URL environment variable is not configured. Cannot perform PostgreSQL migration.'],
      warnings,
      timestamp,
    };
  }

  let migratedCount = 0;
  let failedCount = 0;

  try {
    const pool = getPool();

    // Ensure database table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vector_memories (
        id VARCHAR(128) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding JSONB NOT NULL,
        dimensions INT DEFAULT 128 NOT NULL,
        tags JSONB DEFAULT '[]'::jsonb NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        session_id VARCHAR(128),
        access_count INT DEFAULT 0 NOT NULL,
        last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    for (const entry of validEntries) {
      try {
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
            updated_at = EXCLUDED.updated_at;
        `;

        const values = [
          entry.id,
          entry.workspaceId,
          entry.category,
          entry.title,
          entry.content,
          JSON.stringify(entry.embedding),
          VECTOR_DIMENSIONS,
          JSON.stringify(entry.tags),
          JSON.stringify(entry.metadata),
          entry.sessionId || null,
          entry.accessCount,
          entry.lastAccessedAt,
          entry.createdAt,
          entry.updatedAt,
        ];

        await pool.query(query, values);
        migratedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`Failed to migrate record ${entry.id}: ${err.message}`);
      }
    }

    // 5. Verify Destination Count Integrity
    const countRes = await pool.query('SELECT COUNT(*) as cnt FROM vector_memories;');
    const destCount = parseInt(countRes.rows[0]?.cnt || '0', 10);
    const integrityVerified = destCount >= migratedCount && failedCount === 0;

    return {
      status: failedCount === 0 ? 'SUCCESS' : 'FAILED',
      totalSourceRecords: rawRecords.length,
      validRecordsCount: validEntries.length,
      malformedRecordsCount: malformedCount,
      migratedCount,
      skippedCount: 0,
      failedCount,
      integrityVerified,
      destinationRecordCount: destCount,
      errors,
      warnings,
      timestamp,
    };
  } catch (err: any) {
    return {
      status: 'FAILED',
      totalSourceRecords: rawRecords.length,
      validRecordsCount: validEntries.length,
      malformedRecordsCount: malformedCount,
      migratedCount,
      skippedCount: 0,
      failedCount: validEntries.length,
      integrityVerified: false,
      errors: [`Database migration execution error: ${err.message}`],
      warnings,
      timestamp,
    };
  }
}
