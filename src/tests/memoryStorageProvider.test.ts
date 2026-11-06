// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  LocalJsonVectorStorageProvider,
  PostgresVectorStorageProvider,
  getMemoryStorageProvider,
  VECTOR_DIMENSIONS,
  LOCAL_STORAGE_FILE_PATH,
} from '../services/memoryStorageProvider';
import { migrateJsonToPostgres } from '../services/memoryMigration';
import { generateDenseEmbedding, type VectorMemoryEntry } from '../services/vectorMemory';

describe('ZYNTHEOR Phase 1 — Memory Storage Provider Architecture & Persistence Tests', () => {
  it('LocalJsonVectorStorageProvider initializes and performs CRUD operations', async () => {
    const provider = new LocalJsonVectorStorageProvider();
    expect(provider.providerName).toBe('json');
    expect(await provider.isAvailable()).toBe(true);

    const sampleEmbedding = generateDenseEmbedding('Test Architectural Rule');
    expect(sampleEmbedding.length).toBe(VECTOR_DIMENSIONS);

    const testEntry: VectorMemoryEntry = {
      id: 'vec-test-1',
      workspaceId: 'workspace-main',
      category: 'PROJECT_KNOWLEDGE',
      title: 'Test Rule',
      content: 'Zyntheor memory engine uses 128D dense vector embeddings.',
      embedding: sampleEmbedding,
      tags: ['test', 'architecture'],
      metadata: { importance: 'high' },
      accessCount: 1,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const stored = await provider.store(testEntry);
    expect(stored.id).toBe('vec-test-1');

    const fetched = await provider.getById('vec-test-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('Test Rule');

    const searchResults = await provider.search('workspace-main', sampleEmbedding, { topK: 3 });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].entry.id).toBe('vec-test-1');
    expect(searchResults[0].score).toBeGreaterThan(0.9);

    const updated = await provider.update('vec-test-1', { title: 'Updated Test Rule' });
    expect(updated.title).toBe('Updated Test Rule');

    const deleted = await provider.delete('vec-test-1');
    expect(deleted).toBe(true);

    const afterDelete = await provider.getById('vec-test-1');
    expect(afterDelete).toBeNull();
  });

  it('Rejects vector entries with invalid dimensions (Fail-Closed)', async () => {
    const provider = new LocalJsonVectorStorageProvider();
    const badEntry: VectorMemoryEntry = {
      id: 'vec-bad-dim',
      workspaceId: 'workspace-main',
      category: 'PROJECT_KNOWLEDGE',
      title: 'Bad Dimension Entry',
      content: 'This vector has only 3 dimensions instead of 128.',
      embedding: [0.1, 0.2, 0.3], // Invalid length
      tags: [],
      metadata: {},
      accessCount: 0,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(provider.store(badEntry)).rejects.toThrow(/Vector dimension mismatch/);
  });

  it('PostgresVectorStorageProvider throws explicit operational error if DATABASE_URL is missing', async () => {
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const provider = new PostgresVectorStorageProvider();
    expect(provider.providerName).toBe('postgres');

    const sampleEmbedding = generateDenseEmbedding('Postgres Test');
    const testEntry: VectorMemoryEntry = {
      id: 'vec-pg-1',
      workspaceId: 'workspace-main',
      category: 'PROJECT_KNOWLEDGE',
      title: 'Postgres Test',
      content: 'Postgres vector store content',
      embedding: sampleEmbedding,
      tags: [],
      metadata: {},
      accessCount: 0,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(provider.store(testEntry)).rejects.toThrow(/Fail-Closed Error/);

    process.env.DATABASE_URL = originalDbUrl;
  });

  it('getMemoryStorageProvider selects provider based on environment configuration without silent fallback', () => {
    const originalProvider = process.env.ZYNTHEOR_MEMORY_PROVIDER;

    // Default without ZYNTHEOR_MEMORY_PROVIDER
    delete process.env.ZYNTHEOR_MEMORY_PROVIDER;
    const defaultProvider = getMemoryStorageProvider();
    expect(defaultProvider.providerName).toBe('json');

    process.env.ZYNTHEOR_MEMORY_PROVIDER = originalProvider;
  });

  it('migrateJsonToPostgres executes dry-run migration safely', async () => {
    const dryRunResult = await migrateJsonToPostgres({ dryRun: true });
    expect(dryRunResult.status).toBe('DRY_RUN_COMPLETED');
    expect(dryRunResult.totalSourceRecords).toBeGreaterThanOrEqual(0);
    expect(dryRunResult.integrityVerified).toBe(true);
  });
});
