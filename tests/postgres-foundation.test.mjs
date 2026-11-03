import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

test('P1 migration defines tenant identity constraints and production indexes', async () => {
  const up = await read('src/db/migrations/0001_identity_foundation.sql');
  assert.match(up, /CREATE TABLE users/);
  assert.match(up, /email varchar\(255\) NOT NULL UNIQUE/);
  assert.match(up, /CREATE TABLE organization_members/);
  assert.match(up, /UNIQUE \(org_id, user_id\)/);
  assert.match(up, /CREATE TABLE sessions/);
  assert.match(up, /token_hash varchar\(255\) NOT NULL UNIQUE/);
  assert.match(up, /workspaces_one_default_per_org/);
  assert.match(up, /REFERENCES users\(id\) ON DELETE CASCADE/);
});

test('P1 migration rollback removes created objects in dependency-safe order', async () => {
  const down = await read('src/db/migrations/0001_identity_foundation.down.sql');
  const sequence = ['sessions', 'workspaces', 'organization_members', 'organizations', 'users'];
  let previous = -1;
  for (const table of sequence) {
    const index = down.indexOf(`DROP TABLE IF EXISTS ${table};`);
    assert.ok(index > previous, `${table} is dropped after its dependent tables`);
    previous = index;
  }
});

test('P1 migration runner verifies checksums and serializes runners with advisory lock', async () => {
  const runner = await read('scripts/db-migrate.mjs');
  assert.match(runner, /pg_advisory_lock/);
  assert.match(runner, /checksum mismatch/i);
  assert.match(runner, /BEGIN/);
  assert.match(runner, /COMMIT/);
  assert.match(runner, /ROLLBACK/);
  assert.match(runner, /Rollback file missing/);
});

test('P1 database connection is a real PostgreSQL pool and does not fall back to mocks', async () => {
  const connection = await read('src/db/connection.ts');
  assert.match(connection, /new Pool\(/);
  assert.match(connection, /DATABASE_URL is required/);
  assert.match(connection, /client\.query\('COMMIT'\)/);
  assert.match(connection, /client\.query\('ROLLBACK'\)/);
  assert.doesNotMatch(connection, /in-memory|returning: async|Date\.now\(\)/i);
});
