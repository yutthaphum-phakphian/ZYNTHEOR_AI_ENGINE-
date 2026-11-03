#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { inspectIdentity } from './migrate-identity-json.mjs';
import { loadIdentityImportProjection } from './identity-import-projection.mjs';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identityDir = path.join(root, 'workspace_data/identity');
const migrationsDir = path.join(root, 'src/db/migrations');
const requiredRelations = [
  'users', 'organizations', 'organization_members', 'workspaces', 'sessions',
  'ownership_transfer_audit', 'identity_imports', 'schema_migrations',
];
const expectedMigrations = ['0001_identity_foundation.sql', '0002_identity_auth.sql'];
const requiredConstraints = [
  'organization_members_org_user_unique',
  'organizations_owner_membership_fk',
  'sessions_tenant_membership_fk',
  'sessions_valid_role_check',
];

async function inspectSource() {
  const projection = await loadIdentityImportProjection(identityDir);
  const original = inspectIdentity(projection.sourceData);
  const projected = inspectIdentity(projection.data);
  return {
    counts: original.counts,
    originalConflicts: original.errors,
    conflicts: projected.errors,
    overridesApplied: projection.overridesApplied,
    overrideDigest: projection.overrideDigest,
    overrideValidationErrors: projection.overrideErrors,
  };
}

function describeTarget(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use postgres:// or postgresql://');
  return { host: url.hostname, port: url.port ? Number(url.port) : 5432, database: decodeURIComponent(url.pathname.replace(/^\//, '')) };
}

function hash(value) { return createHash('sha256').update(value).digest('hex'); }

export async function runPostgresPreflight({ databaseUrl = process.env.DATABASE_URL } = {}) {
  const source = await inspectSource();
  const result = { status: 'PREFLIGHT', writesPerformed: false, source, database: { configured: Boolean(databaseUrl) } };
  if (source.overrideValidationErrors.length) result.status = 'BLOCKED_APPROVED_OVERRIDE_VALIDATION';
  else if (source.conflicts.length) result.status = 'BLOCKED_SOURCE_CONFLICTS';
  if (!databaseUrl) {
    result.database.reason = 'DATABASE_URL_NOT_CONFIGURED';
    result.status = source.overrideValidationErrors.length
      ? 'BLOCKED_APPROVED_OVERRIDE_VALIDATION'
      : source.conflicts.length
        ? 'BLOCKED_SOURCE_CONFLICTS_AND_DATABASE_CONNECTION'
        : 'BLOCKED_PENDING_DATABASE_CONNECTION';
    return result;
  }
  try { result.database.target = describeTarget(databaseUrl); }
  catch (error) {
    result.database.reason = error.message;
    result.status = 'BLOCKED_INVALID_DATABASE_URL';
    return result;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    application_name: 'zyntheor-p3-readonly-preflight',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined,
  });
  let client;
  let transactionOpen = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    const server = await client.query(`
      SELECT current_database() AS database,
             current_setting('server_version') AS server_version,
             current_setting('transaction_read_only') AS transaction_read_only,
             pg_is_in_recovery() AS is_standby
    `);
    const relations = await client.query(
      `SELECT relation_name, to_regclass('public.' || relation_name) IS NOT NULL AS present
       FROM unnest($1::text[]) AS t(relation_name)`,
      [requiredRelations],
    );
    const relationMap = Object.fromEntries(relations.rows.map(row => [row.relation_name, row.present]));
    const sessionColumns = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='sessions'
         AND column_name = ANY($1::text[])`,
      [['user_agent', 'tenant_id', 'role']],
    );
    const columnSet = new Set(sessionColumns.rows.map(row => row.column_name));
    let presentConstraints = [];
    if (relationMap.schema_migrations) {
      const constraints = await client.query(
        `SELECT conname FROM pg_constraint
         WHERE connamespace='public'::regnamespace AND conname = ANY($1::text[])`,
        [requiredConstraints],
      );
      presentConstraints = constraints.rows.map(row => row.conname);
    }

    const tableCounts = {};
    for (const [label, table] of [['users', 'users'], ['organizations', 'organizations'], ['memberships', 'organization_members'], ['sessions', 'sessions']]) {
      tableCounts[label] = relationMap[table]
        ? (await client.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count
        : null;
    }
    const databaseIntegrity = { checked: false };
    if (relationMap.users && relationMap.organizations && relationMap.organization_members) {
      databaseIntegrity.checked = true;
      databaseIntegrity.orphanMemberships = (await client.query(`
        SELECT count(*)::int AS count FROM public.organization_members m
        LEFT JOIN public.organizations o ON o.id=m.org_id
        LEFT JOIN public.users u ON u.id=m.user_id
        WHERE o.id IS NULL OR u.id IS NULL
      `)).rows[0].count;
      databaseIntegrity.ownerPointerWithoutMembership = (await client.query(`
        SELECT count(*)::int AS count FROM public.organizations o
        LEFT JOIN public.organization_members m ON m.org_id=o.id AND m.user_id=o.owner_id AND m.role='OWNER'
        WHERE m.user_id IS NULL
      `)).rows[0].count;
      databaseIntegrity.organizationsWithoutExactlyOneOwner = (await client.query(`
        SELECT count(*)::int AS count FROM public.organizations o
        WHERE (SELECT count(*) FROM public.organization_members m WHERE m.org_id=o.id AND m.role='OWNER') <> 1
      `)).rows[0].count;
      databaseIntegrity.duplicateNormalizedEmails = (await client.query(`
        SELECT count(*)::int AS count FROM (
          SELECT lower(email) FROM public.users GROUP BY lower(email) HAVING count(*) > 1
        ) duplicate_emails
      `)).rows[0].count;
    }
    if (relationMap.sessions && relationMap.organization_members && columnSet.has('tenant_id')) {
      databaseIntegrity.sessionsWithoutTenantMembership = (await client.query(`
        SELECT count(*)::int AS count FROM public.sessions s
        LEFT JOIN public.organization_members m ON m.org_id=s.tenant_id AND m.user_id=s.user_id
        WHERE m.user_id IS NULL
      `)).rows[0].count;
    }

    let applied = [];
    if (relationMap.schema_migrations) {
      const ledger = await client.query('SELECT name, checksum FROM public.schema_migrations ORDER BY name');
      applied = ledger.rows.map(row => ({ name: row.name, checksum: String(row.checksum).trim() }));
    }
    const expected = [];
    for (const name of expectedMigrations) {
      const sql = await readFile(path.join(migrationsDir, name), 'utf8');
      const stored = applied.find(row => row.name === name);
      expected.push({ name, expectedChecksum: hash(sql), applied: Boolean(stored), checksumMatches: Boolean(stored && stored.checksum === hash(sql)) });
    }
    const unknownApplied = applied.filter(row => !expectedMigrations.includes(row.name)).map(row => row.name);
    const allMigrationsMatch = expected.every(row => row.applied && row.checksumMatches) && unknownApplied.length === 0;
    const constraintsReady = requiredConstraints.every(name => presentConstraints.includes(name));
    const schemaReady = ['users', 'organizations', 'organization_members', 'workspaces', 'sessions', 'ownership_transfer_audit', 'identity_imports'].every(name => relationMap[name])
      && ['user_agent', 'tenant_id', 'role'].every(name => columnSet.has(name))
      && constraintsReady;
    result.database.connected = true;
    result.database.server = {
      database: server.rows[0].database,
      serverVersion: server.rows[0].server_version,
      transactionReadOnly: server.rows[0].transaction_read_only === 'on',
      isStandby: server.rows[0].is_standby,
    };
    result.database.relations = relationMap;
    result.database.countsReadOnly = tableCounts;
    result.database.integrityReadOnly = databaseIntegrity;
    result.database.sessionColumns = [...columnSet].sort();
    result.database.constraints = { required: requiredConstraints, present: presentConstraints, allRequiredPresent: constraintsReady };
    result.database.migrations = { expected, unknownApplied, allExpectedChecksumsMatch: allMigrationsMatch };
    result.database.p1P2SchemaReady = schemaReady;
    if (server.rows[0].transaction_read_only !== 'on') result.status = 'BLOCKED_READ_ONLY_GUARD_FAILED';
    else if (server.rows[0].is_standby) result.status = 'BLOCKED_DATABASE_STANDBY';
    else if (source.overrideValidationErrors.length) result.status = 'BLOCKED_APPROVED_OVERRIDE_VALIDATION';
    else if (source.conflicts.length) result.status = 'BLOCKED_SOURCE_CONFLICTS';
    else if (!allMigrationsMatch || !schemaReady) result.status = 'BLOCKED_MIGRATION_STATE';
    else if (Object.entries(databaseIntegrity).some(([key, value]) => key !== 'checked' && typeof value === 'number' && value > 0)) result.status = 'BLOCKED_DATABASE_INTEGRITY';
    else result.status = 'READ_ONLY_PREFLIGHT_READY_NO_CUTOVER';
    await client.query('ROLLBACK');
    transactionOpen = false;
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'POSTGRES_PREFLIGHT_FAILED';
    let message = String(error?.message ?? 'Database preflight failed');
    message = message.replaceAll(databaseUrl, '[DATABASE_URL_REDACTED]');
    result.database.connected = false;
    result.database.error = { code, message };
    result.status = source.overrideValidationErrors.length
      ? 'BLOCKED_APPROVED_OVERRIDE_VALIDATION'
      : source.conflicts.length
        ? 'BLOCKED_SOURCE_CONFLICTS_AND_DATABASE_CONNECTION'
        : 'BLOCKED_DATABASE_CONNECTION';
  } finally {
    if (transactionOpen && client) await client.query('ROLLBACK').catch(() => {});
    client?.release();
    await pool.end();
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPostgresPreflight().then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'READ_ONLY_PREFLIGHT_READY_NO_CUTOVER') process.exitCode = 2;
  }).catch(error => {
    const message = String(error?.message ?? 'Preflight failed');
    console.error(JSON.stringify({ status: 'BLOCKED_PREFLIGHT_ERROR', writesPerformed: false, error: message }, null, 2));
    process.exitCode = 2;
  });
}
