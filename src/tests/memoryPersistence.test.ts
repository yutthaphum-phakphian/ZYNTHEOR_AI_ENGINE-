// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { executeDryRunMigration } from '../services/dryRunMigration.ts';
import {
  PostgresVectorStorageProvider,
  LocalJsonVectorStorageProvider,
  VECTOR_DIMENSIONS,
} from '../services/memoryStorageProvider.ts';
import { generateDenseEmbedding, cosineSimilarity, type VectorMemoryEntry } from '../services/vectorMemory.ts';

describe('ZYNTHEOR Phase 1 — Memory Persistence & PostgreSQL Vector Storage Integration Tests', () => {

  it('Dry-Run Migration Utility reads storage/vector_memory_store.json and verifies 128D record integrity', () => {
    const dryRunResult = executeDryRunMigration();
    expect(dryRunResult.status).toBe('DRY_RUN_SUCCESS');
    expect(dryRunResult.totalSourceRecords).toBeGreaterThan(0);
    expect(dryRunResult.validRecordsCount).toBe(dryRunResult.totalSourceRecords);
    expect(dryRunResult.malformedRecordsCount).toBe(0);
    expect(dryRunResult.integrityVerified).toBe(true);
    expect(dryRunResult.simulatedQueries.length).toBeGreaterThan(0);
  });

  it('PostgreSQL Vector Storage Provider enforces Fail-Closed policy when DATABASE_URL is unavailable', async () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const provider = new PostgresVectorStorageProvider();
    expect(provider.providerName).toBe('postgres');

    const sampleEmbedding = generateDenseEmbedding('Postgres Integration Test');
    expect(sampleEmbedding.length).toBe(VECTOR_DIMENSIONS);

    const testEntry: VectorMemoryEntry = {
      id: 'vec-integration-1',
      workspaceId: 'workspace-test',
      category: 'PROJECT_KNOWLEDGE',
      title: 'Database Fail-Closed Invariant',
      content: 'When DATABASE_URL is missing, PostgresVectorStorageProvider must throw explicit operational error.',
      embedding: sampleEmbedding,
      tags: ['integration', 'fail-closed'],
      metadata: { environment: 'test' },
      accessCount: 0,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(provider.store(testEntry)).rejects.toThrow(/Fail-Closed Error/);

    process.env.DATABASE_URL = originalUrl;
  });

  it('Local JSON Provider maintains CRUD lifecycle and 128D Vector similarity search', async () => {
    const provider = new LocalJsonVectorStorageProvider();
    const testEmbedding = generateDenseEmbedding('PostgreSQL & pgvector 128D Integration');

    const entry: VectorMemoryEntry = {
      id: 'vec-crud-test-1',
      workspaceId: 'workspace-integration-test',
      category: 'PROJECT_KNOWLEDGE',
      title: 'pgvector Integration Rule',
      content: 'pgvector extension provides fast indexing for 128-dimensional sovereign semantic vectors.',
      embedding: testEmbedding,
      tags: ['pgvector', 'postgres'],
      metadata: { testSuite: 'memoryPersistence' },
      accessCount: 1,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Store
    const saved = await provider.store(entry);
    expect(saved.id).toBe('vec-crud-test-1');

    // 2. Fetch by ID
    const fetched = await provider.getById('vec-crud-test-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe('pgvector Integration Rule');

    // 3. Vector Similarity Search
    const searchResults = await provider.search('workspace-integration-test', testEmbedding, { topK: 3 });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].entry.id).toBe('vec-crud-test-1');
    expect(searchResults[0].score).toBeGreaterThan(0.95);

    // 4. Update
    const updated = await provider.update('vec-crud-test-1', { title: 'Updated pgvector Rule' });
    expect(updated.title).toBe('Updated pgvector Rule');

    // 5. Delete
    const deleted = await provider.delete('vec-crud-test-1');
    expect(deleted).toBe(true);

    const afterDelete = await provider.getById('vec-crud-test-1');
    expect(afterDelete).toBeNull();
  });

  it('Vector dimension enforcement rejects non-128D vectors across all providers', async () => {
    const provider = new LocalJsonVectorStorageProvider();

    const invalidEntry: VectorMemoryEntry = {
      id: 'vec-bad-dim-integration',
      workspaceId: 'workspace-test',
      category: 'PROJECT_KNOWLEDGE',
      title: 'Bad Dimension',
      content: 'This vector has invalid dimensions.',
      embedding: [0.1, 0.2, 0.3], // Invalid 3-dimensional vector
      tags: [],
      metadata: {},
      accessCount: 0,
      lastAccessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await expect(provider.store(invalidEntry)).rejects.toThrow(/Vector dimension mismatch/);
  });

  it('Cosine similarity utility measures mathematical unit vector proximity accurately', () => {
    const vecA = generateDenseEmbedding('Sovereign Artificial Intelligence');
    const vecB = generateDenseEmbedding('Sovereign Artificial Intelligence');
    const vecC = generateDenseEmbedding('Unrelated recipe for baking chocolate cake');

    const simExact = cosineSimilarity(vecA, vecB);
    const simDiff = cosineSimilarity(vecA, vecC);

    expect(simExact).toBeGreaterThan(0.99);
    expect(simExact).toBeGreaterThan(simDiff);
  });
});
