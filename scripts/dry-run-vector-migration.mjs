/**
 * ZYNTHEOR AI ENGINE — Sovereign Vector Store Dry-Run Migration Script
 * ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Reads .aistudio/vector_memory_store.json, validates against PostgreSQL schema,
 * checks for record duplicates, validates 128-dimensional embedding integrity,
 * and produces a detailed dry-run summary WITHOUT modifying database state.
 */

import fs from 'node:fs';
import path from 'node:path';

const STORAGE_FILE_PATH = path.resolve(process.cwd(), '.aistudio/vector_memory_store.json');
const VALID_CATEGORIES = new Set(['USER_PREFERENCE', 'PROJECT_KNOWLEDGE', 'SESSION_CONTEXT', 'DOMAIN_ENTITY']);
const REQUIRED_VECTOR_DIMENSIONS = 128;

export function runDryRunMigration(filePath = STORAGE_FILE_PATH) {
  const startTime = Date.now();
  console.log('----------------------------------------------------------------');
  console.log('[ZYNTHEOR DB MIGRATION] Starting Sovereign Vector Store Dry-Run');
  console.log(`[ZYNTHEOR DB MIGRATION] Source File: ${filePath}`);
  console.log('----------------------------------------------------------------\n');

  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Source JSON file not found: ${filePath}`);
    return {
      success: false,
      error: 'FILE_NOT_FOUND',
      stats: { total: 0, valid: 0, invalid: 0, dupById: 0, dupByContent: 0, wouldInsert: 0, wouldSkip: 0 }
    };
  }

  let rawData;
  try {
    rawData = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[ERROR] Failed to read source JSON file: ${err.message}`);
    return {
      success: false,
      error: 'READ_FAILED',
      stats: { total: 0, valid: 0, invalid: 0, dupById: 0, dupByContent: 0, wouldInsert: 0, wouldSkip: 0 }
    };
  }

  let records;
  try {
    records = JSON.parse(rawData);
    if (!Array.isArray(records)) {
      throw new Error('Root JSON element is not an array');
    }
  } catch (err) {
    console.error(`[ERROR] Failed to parse JSON content: ${err.message}`);
    return {
      success: false,
      error: 'INVALID_JSON',
      stats: { total: 0, valid: 0, invalid: 0, dupById: 0, dupByContent: 0, wouldInsert: 0, wouldSkip: 0 }
    };
  }

  const seenIds = new Set();
  const seenContentHashes = new Set();

  let validCount = 0;
  let invalidCount = 0;
  let dupByIdCount = 0;
  let dupByContentCount = 0;
  let wouldInsertCount = 0;
  let wouldSkipCount = 0;

  const invalidDetails = [];
  const duplicateDetails = [];
  const validInsertions = [];

  records.forEach((record, index) => {
    const recordLabel = record?.id || `Index #${index}`;
    const errors = [];

    // 1. Structural Schema Validation
    if (!record || typeof record !== 'object') {
      errors.push('Record is not an object');
    } else {
      if (!record.id || typeof record.id !== 'string') errors.push('Missing or invalid "id" (string)');
      if (!record.workspaceId || typeof record.workspaceId !== 'string') errors.push('Missing or invalid "workspaceId" (string)');
      if (!record.category || !VALID_CATEGORIES.has(record.category)) errors.push(`Invalid "category": ${record.category}`);
      if (!record.title || typeof record.title !== 'string') errors.push('Missing or invalid "title" (string)');
      if (typeof record.content !== 'string') errors.push('Missing or invalid "content" (string)');

      // 2. Vector Embedding 128-Dimension Integrity Check
      if (!Array.isArray(record.embedding)) {
        errors.push('Missing or non-array "embedding"');
      } else if (record.embedding.length !== REQUIRED_VECTOR_DIMENSIONS) {
        errors.push(`Embedding dimension mismatch: got ${record.embedding.length}, expected ${REQUIRED_VECTOR_DIMENSIONS}`);
      } else {
        const hasNonNumber = record.embedding.some(v => typeof v !== 'number' || !Number.isFinite(v));
        if (hasNonNumber) {
          errors.push('Embedding contains NaN, Infinity, or non-numeric values');
        }
      }
    }

    if (errors.length > 0) {
      invalidCount++;
      wouldSkipCount++;
      invalidDetails.push({ id: recordLabel, errors });
      return;
    }

    // 3. Deduplication Check
    if (seenIds.has(record.id)) {
      dupByIdCount++;
      wouldSkipCount++;
      duplicateDetails.push({ id: record.id, reason: 'Duplicate ID' });
      return;
    }

    // Fingerprint: workspaceId + category + title + content
    const contentHash = `${record.workspaceId}::${record.category}::${record.title.trim()}::${record.content.trim()}`;
    if (seenContentHashes.has(contentHash)) {
      dupByContentCount++;
      wouldSkipCount++;
      duplicateDetails.push({ id: record.id, title: record.title, reason: 'Duplicate Content Fingerprint' });
      return;
    }

    // Passed validation and deduplication
    seenIds.add(record.id);
    seenContentHashes.add(contentHash);
    validCount++;
    wouldInsertCount++;
    validInsertions.push({
      id: record.id,
      workspaceId: record.workspaceId,
      category: record.category,
      title: record.title,
      vectorDim: record.embedding.length,
    });
  });

  const durationMs = Date.now() - startTime;

  console.log('===== DRY-RUN VECTOR MIGRATION SUMMARY =====');
  console.log(`Total Source Records Parsed : ${records.length}`);
  console.log(`Schema Valid Records        : ${validCount}`);
  console.log(`Schema Invalid Records      : ${invalidCount}`);
  console.log(`Duplicates Skipped (By ID)  : ${dupByIdCount}`);
  console.log(`Duplicates Skipped (Content): ${dupByContentCount}`);
  console.log(`Total Records to INSERT     : ${wouldInsertCount}`);
  console.log(`Total Records to SKIP       : ${wouldSkipCount}`);
  console.log(`Execution Time              : ${durationMs}ms`);
  console.log('Database State Modified     : NO (0 Database Writes Executed)');
  console.log('============================================\n');

  if (invalidDetails.length > 0) {
    console.log('[INVALID RECORDS DETAILS]:');
    invalidDetails.forEach(d => console.log(`  - ${d.id}: ${d.errors.join(', ')}`));
    console.log('');
  }

  if (duplicateDetails.length > 0) {
    console.log('[DUPLICATE RECORDS DETAILS]:');
    duplicateDetails.slice(0, 10).forEach(d => console.log(`  - ${d.id} (${d.reason}) - ${d.title || ''}`));
    if (duplicateDetails.length > 10) {
      console.log(`  ... and ${duplicateDetails.length - 10} more duplicate records`);
    }
    console.log('');
  }

  return {
    success: true,
    stats: {
      total: records.length,
      valid: validCount,
      invalid: invalidCount,
      dupById: dupByIdCount,
      dupByContent: dupByContentCount,
      wouldInsert: wouldInsertCount,
      wouldSkip: wouldSkipCount,
      durationMs
    },
    validInsertions
  };
}

if (process.argv[1] && process.argv[1].endsWith('/scripts/dry-run-vector-migration.mjs')) {
  runDryRunMigration();
}
