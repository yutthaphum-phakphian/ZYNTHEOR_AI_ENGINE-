#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'src/db/migrations');
const lockId = 'ZYNTHEOR_DB_MIGRATIONS_V1';

function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

export async function runMigrations({ direction = 'up', pool: suppliedPool } = {}) {
  if (!['up', 'down'].includes(direction)) throw new Error(`Unsupported migration direction: ${direction}`);
  if (!suppliedPool && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = suppliedPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockId]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const filenames = (await readdir(migrationsDir)).filter(name => /^\d+_.+\.sql$/.test(name) && !name.endsWith('.down.sql')).sort();
    const appliedResult = await client.query('SELECT name, checksum FROM schema_migrations ORDER BY name');
    const applied = new Map(appliedResult.rows.map(row => [row.name, row.checksum.trim()]));

    for (const [name, storedChecksum] of applied) {
      if (!filenames.includes(name)) throw new Error(`Applied migration is missing from disk: ${name}`);
      const current = checksum(await readFile(path.join(migrationsDir, name), 'utf8'));
      if (current !== storedChecksum) throw new Error(`Checksum mismatch for applied migration ${name}; restore the original file or create a new migration`);
    }

    if (direction === 'up') {
      const pending = filenames.filter(name => !applied.has(name));
      for (const name of pending) {
        const sql = await readFile(path.join(migrationsDir, name), 'utf8');
        await client.query('BEGIN'); transactionOpen = true;
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name, checksum) VALUES ($1, $2)', [name, checksum(sql)]);
        await client.query('COMMIT'); transactionOpen = false;
        console.log(`applied ${name}`);
      }
      if (!pending.length) console.log('database schema is up to date');
      return { direction, applied: pending };
    }

    const latest = appliedResult.rows.at(-1);
    if (!latest) { console.log('no applied migrations to roll back'); return { direction, rolledBack: null }; }
    const downName = latest.name.replace(/\.sql$/, '.down.sql');
    const downPath = path.join(migrationsDir, downName);
    let downSql;
    try { downSql = await readFile(downPath, 'utf8'); }
    catch { throw new Error(`Rollback file missing for ${latest.name}: ${downName}`); }
    await client.query('BEGIN'); transactionOpen = true;
    await client.query(downSql);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [latest.name]);
    await client.query('COMMIT'); transactionOpen = false;
    console.log(`rolled back ${latest.name}`);
    return { direction, rolledBack: latest.name };
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockId]).catch(() => {});
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const direction = process.argv[2] ?? 'up';
  runMigrations({ direction }).catch(error => { console.error(`database migration failed: ${error.message}`); process.exitCode = 1; });
}
