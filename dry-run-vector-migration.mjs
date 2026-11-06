/**
 * ZYNTHEOR AI ENGINE — Sovereign Vector Store Dry-Run Migration Script (Root Entry Point)
 * ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Parses .aistudio/vector_memory_store.json, performs schema validation against
 * src/db/schema.ts structure, checks for duplicate IDs and content fingerprints,
 * verifies 128-dimensional vector embedding integrity, and outputs a summary of
 * records to be inserted, updated, or skipped without committing any database changes.
 */

import { runDryRunMigration } from './scripts/dry-run-vector-migration.mjs';

// Execute dry-run migration check
runDryRunMigration();
