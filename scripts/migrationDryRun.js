/**
 * ZYNTHEOR AI ENGINE — Sovereign Vector Store Migration Dry-Run Script
 * File Name: scripts/migrationDryRun.js
 * Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Parses .aistudio/vector_memory_store.json, validates against src/db/schema.ts structure,
 * checks for duplicate IDs and content fingerprints, verifies 128-dimensional embedding vectors,
 * and prints a structured summary table of potential insertions, updates, and skips.
 */

import fs from 'node:fs';
import path from 'node:path';

const STORAGE_FILE_PATH = path.resolve(process.cwd(), '.aistudio/vector_memory_store.json');
const VALID_CATEGORIES = new Set(['USER_PREFERENCE', 'PROJECT_KNOWLEDGE', 'SESSION_CONTEXT', 'DOMAIN_ENTITY']);
const REQUIRED_VECTOR_DIMENSIONS = 128;

export function runMigrationDryRun(filePath = STORAGE_FILE_PATH) {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('[ZYNTHEOR DB MIGRATION] Starting Structured Vector Migration Dry-Run');
  console.log(`[ZYNTHEOR DB MIGRATION] Source JSON: ${filePath}`);
  console.log('================================================================\n');

  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Source JSON file not found: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const records = JSON.parse(rawData);

  const seenIds = new Set();
  const seenContentHashes = new Set();

  let validCount = 0;
  let invalidCount = 0;
  let dupByIdCount = 0;
  let dupByContentCount = 0;

  const tableRows = [];

  records.forEach((record, index) => {
    let action = 'INSERT';
    let reason = 'Valid entry';
    let isValid = true;

    // 1. Schema Validation against src/db/schema.ts (vector_memories table)
    if (!record || typeof record !== 'object') {
      isValid = false;
      action = 'SKIP';
      reason = 'Not a JSON object';
    } else if (!record.id || typeof record.id !== 'string') {
      isValid = false;
      action = 'SKIP';
      reason = 'Invalid/missing ID';
    } else if (!record.workspaceId || typeof record.workspaceId !== 'string') {
      isValid = false;
      action = 'SKIP';
      reason = 'Missing workspaceId';
    } else if (!record.category || !VALID_CATEGORIES.has(record.category)) {
      isValid = false;
      action = 'SKIP';
      reason = `Invalid category (${record.category})`;
    } else if (!record.title || typeof record.title !== 'string') {
      isValid = false;
      action = 'SKIP';
      reason = 'Missing title';
    } else if (typeof record.content !== 'string') {
      isValid = false;
      action = 'SKIP';
      reason = 'Missing content';
    } else if (!Array.isArray(record.embedding) || record.embedding.length !== REQUIRED_VECTOR_DIMENSIONS) {
      isValid = false;
      action = 'SKIP';
      reason = `Embedding dim mismatch (${record.embedding?.length ?? 0} != ${REQUIRED_VECTOR_DIMENSIONS})`;
    }

    if (!isValid) {
      invalidCount++;
      tableRows.push({
        Index: index + 1,
        ID: record?.id?.slice(0, 18) || 'N/A',
        Workspace: record?.workspaceId?.slice(0, 12) || 'N/A',
        Category: record?.category || 'N/A',
        VectorDim: record?.embedding?.length ?? 0,
        Action: action,
        Reason: reason
      });
      return;
    }

    // 2. Duplicate ID Check
    if (seenIds.has(record.id)) {
      dupByIdCount++;
      tableRows.push({
        Index: index + 1,
        ID: record.id.slice(0, 18),
        Workspace: record.workspaceId.slice(0, 12),
        Category: record.category,
        VectorDim: record.embedding.length,
        Action: 'UPDATE/SKIP',
        Reason: 'Duplicate Record ID'
      });
      return;
    }

    // 3. Duplicate Content Fingerprint Check
    const contentHash = `${record.workspaceId}::${record.category}::${record.title.trim()}::${record.content.trim()}`;
    if (seenContentHashes.has(contentHash)) {
      dupByContentCount++;
      tableRows.push({
        Index: index + 1,
        ID: record.id.slice(0, 18),
        Workspace: record.workspaceId.slice(0, 12),
        Category: record.category,
        VectorDim: record.embedding.length,
        Action: 'SKIP',
        Reason: 'Duplicate Content Fingerprint'
      });
      return;
    }

    seenIds.add(record.id);
    seenContentHashes.add(contentHash);
    validCount++;

    tableRows.push({
      Index: index + 1,
      ID: record.id.slice(0, 18),
      Workspace: record.workspaceId.slice(0, 12),
      Category: record.category,
      VectorDim: record.embedding.length,
      Action: 'INSERT',
      Reason: 'Valid record'
    });
  });

  const durationMs = Date.now() - startTime;

  console.log('[MIGRATION DRY-RUN STRUCTURED SUMMARY TABLE]:');
  console.table(tableRows.slice(0, 15));
  if (tableRows.length > 15) {
    console.log(`... and ${tableRows.length - 15} more records evaluated.\n`);
  }

  console.log('================ SUMMARY METRICS ================');
  console.log(`Total Source Records      : ${records.length}`);
  console.log(`Valid Records to INSERT   : ${validCount}`);
  console.log(`Invalid Records Skipped   : ${invalidCount}`);
  console.log(`Duplicate IDs (To Update) : ${dupByIdCount}`);
  console.log(`Duplicate Content Skipped : ${dupByContentCount}`);
  console.log(`Total Records to SKIP     : ${invalidCount + dupByContentCount}`);
  console.log(`Execution Time            : ${durationMs}ms`);
  console.log(`Database Writes Executed  : 0 (DRY-RUN MODE — ZERO MUTATIONS)`);
  console.log('=================================================\n');
}

runMigrationDryRun();
