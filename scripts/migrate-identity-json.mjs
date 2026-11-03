#!/usr/bin/env node
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { IDENTITY_SOURCE_FILES, OWNER_OVERRIDE_FILE, loadIdentityImportProjection, verifyIdentitySnapshot } from './identity-import-projection.mjs';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identityDir = path.join(root, 'workspace_data/identity');
const files = IDENTITY_SOURCE_FILES;
const lockKey = 'ZYNTHEOR_JSON_IDENTITY_IMPORT_P2';

export function inspectIdentity(data) {
  const errors = [];
  const users = data['users.json']; const orgs = data['organizations.json'];
  const members = data['organization_members.json']; const sessions = data['sessions.json'];
  for (const file of files) if (!Array.isArray(data[file])) errors.push(`${file}: expected a JSON array`);
  if (errors.length) return { errors, counts: {} };
  const duplicate = (label, rows) => { if (rows.length !== new Set(rows.map(v => JSON.stringify(v))).size) errors.push(`duplicate ${label}`); };
  duplicate('user IDs', users.map(x => x.id));
  duplicate('normalized user emails', users.map(x => String(x.email ?? '').trim().toLowerCase()));
  duplicate('provider account identities', users.filter(x => x.providerAccountId).map(x => [x.authProvider ?? 'local', x.providerAccountId]));
  duplicate('organization IDs', orgs.map(x => x.id));
  duplicate('organization slugs', orgs.map(x => x.slug));
  duplicate('membership IDs', members.map(x => x.id));
  duplicate('organization/user memberships', members.map(x => [x.orgId, x.userId]));
  duplicate('session IDs', sessions.map(x => x.id));
  duplicate('session token hashes', sessions.map(x => x.tokenHash));
  const userIds = new Set(users.map(x => x.id)); const orgIds = new Set(orgs.map(x => x.id));
  const membershipByPair = new Map(members.map(m => [`${m.orgId}\u0000${m.userId}`, m]));
  for (const m of members) if (!userIds.has(m.userId) || !orgIds.has(m.orgId)) errors.push('membership references a missing user or organization');
  for (const s of sessions) {
    if (!userIds.has(s.userId)) errors.push('session references a missing user');
    if (!s.tenantId || !membershipByPair.has(`${s.tenantId}\u0000${s.userId}`)) errors.push('session tenant has no matching membership');
    if (!/^[a-f0-9]{64}$/i.test(String(s.tokenHash ?? ''))) errors.push('session token hash is malformed');
  }
  for (const u of users) {
    if (!Number.isSafeInteger(Number(u.id)) || Number(u.id) < 1) errors.push('user ID is not a positive integer');
    if (!u.email || !u.passwordHash || !u.salt || !u.name) errors.push('user is missing required credential/profile fields');
    const validHash = /^pbkdf2-sha512\$\d+\$[a-f0-9]{128}$/i.test(String(u.passwordHash ?? '')) || /^[a-f0-9]{128}$/i.test(String(u.passwordHash ?? ''));
    if (!validHash) errors.push('user password hash format is invalid');
  }
  for (const o of orgs) {
    if (!userIds.has(o.ownerId)) errors.push('organization owner references a missing user');
    const ownerMembership = membershipByPair.get(`${o.id}\u0000${o.ownerId}`);
    if (!ownerMembership || ownerMembership.role !== 'OWNER') errors.push('organization owner conflicts with OWNER membership');
    if (members.filter(m => m.orgId === o.id && m.role === 'OWNER').length !== 1) errors.push('organization must have exactly one OWNER membership');
  }
  for (const m of members) if (!['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'].includes(m.role)) errors.push('membership has an invalid role');
  return { errors: [...new Set(errors)], counts: Object.fromEntries(files.map(f => [f, data[f].length])) };
}

async function loadSourceAndBackup() {
  const projection = await loadIdentityImportProjection(identityDir);
  const backupDir = path.join(identityDir, 'backups', `p2-${new Date().toISOString().replace(/[:.]/g, '-')}-${projection.digest.slice(0, 12)}`);
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  for (const file of files) {
    await writeFile(path.join(backupDir, file), projection.rawSourceBytes[file], { mode: 0o600, flag: 'wx' });
    await chmod(path.join(backupDir, file), 0o600);
  }
  if (projection.overrideBytes) {
    await writeFile(path.join(backupDir, OWNER_OVERRIDE_FILE), projection.overrideBytes, { mode: 0o600, flag: 'wx' });
    await chmod(path.join(backupDir, OWNER_OVERRIDE_FILE), 0o600);
  }
  return { ...projection, backupDir };
}

async function counts(client) {
  const out = {};
  for (const [label, table] of [['users', 'users'], ['organizations', 'organizations'], ['memberships', 'organization_members'], ['sessions', 'sessions']]) {
    const r = await client.query(`SELECT count(*)::int AS count FROM ${table}`);
    out[label] = r.rows[0].count;
  }
  return out;
}

async function preflightExisting(client, data) {
  const conflicts = [];
  const users = data['users.json']; const orgs = data['organizations.json']; const members = data['organization_members.json'];
  if (users.length) {
    const emailResult = await client.query('SELECT email FROM users WHERE lower(email)=ANY($1::text[])', [users.map(u => String(u.email).toLowerCase())]);
    if (emailResult.rowCount) conflicts.push('database already contains one or more source emails');
    const idResult = await client.query('SELECT id FROM users WHERE id=ANY($1::int[])', [users.map(u => Number(u.id))]);
    if (idResult.rowCount) conflicts.push('database already contains one or more source user IDs');
  }
  if (orgs.length) {
    const orgResult = await client.query('SELECT id FROM organizations WHERE id=ANY($1::text[]) OR slug=ANY($2::text[])', [orgs.map(o => o.id), orgs.map(o => o.slug)]);
    if (orgResult.rowCount) conflicts.push('database already contains one or more source organizations/slugs');
  }
  if (members.length) {
    const idResult = await client.query('SELECT legacy_id FROM organization_members WHERE legacy_id=ANY($1::text[])', [members.map(m => String(m.id))]);
    if (idResult.rowCount) conflicts.push('database already contains one or more source membership IDs');
    const pairs = await client.query('SELECT org_id,user_id FROM organization_members WHERE (org_id,user_id) IN (SELECT * FROM unnest($1::text[],$2::int[]))', [members.map(m => m.orgId), members.map(m => Number(m.userId))]);
    if (pairs.rowCount) conflicts.push('database already contains one or more source memberships');
  }
  return conflicts;
}

export async function migrateIdentity({ dryRun = true, databaseUrl = process.env.DATABASE_URL } = {}) {
  const { sourceData, data, sourceDigest, digest, overrideDigest, rawSourceHashes, overridesApplied, overrideErrors, backupDir } = await loadSourceAndBackup();
  const originalInspection = inspectIdentity(sourceData);
  const inspection = inspectIdentity(data);
  const sourceSnapshot = await verifyIdentitySnapshot(identityDir, rawSourceHashes, overrideDigest);
  const report = {
    status: 'PREFLIGHT', dryRun, digest, sourceDigest, overrideDigest,
    countsBefore: inspection.counts,
    backupDir: path.relative(root, backupDir),
    conflicts: inspection.errors,
    originalSourceConflicts: originalInspection.errors,
    overridesApplied,
    overrideValidationErrors: overrideErrors,
    sourceSnapshotVerified: sourceSnapshot.unchanged,
  };
  if (overrideErrors.length) return { ...report, status: 'BLOCKED_APPROVED_OVERRIDE_VALIDATION' };
  if (inspection.errors.length) return { ...report, status: 'BLOCKED_SOURCE_CONFLICTS' };
  if (!sourceSnapshot.unchanged) return { ...report, status: 'BLOCKED_SOURCE_SNAPSHOT_CHANGED' };
  if (!databaseUrl) return { ...report, status: 'BLOCKED_PENDING_DATABASE_CONNECTION' };
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, application_name: 'zyntheor-identity-import-p2' });
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);
    const ledger = await client.query('SELECT source_counts FROM identity_imports WHERE source_digest=$1', [digest]);
    if (ledger.rowCount) {
      const ledgerSnapshot = await verifyIdentitySnapshot(identityDir, rawSourceHashes, overrideDigest);
      if (!ledgerSnapshot.unchanged) return { ...report, status: 'BLOCKED_SOURCE_SNAPSHOT_CHANGED', sourceSnapshotVerified: false };
      return { ...report, status: 'ALREADY_IMPORTED', countsAfter: ledger.rows[0].source_counts };
    }
    const dbBefore = await counts(client);
    report.databaseCountsBefore = dbBefore;
    const databaseConflicts = await preflightExisting(client, data);
    if (databaseConflicts.length) return { ...report, conflicts: databaseConflicts, status: 'BLOCKED_DATABASE_CONFLICTS' };
    const afterPreflightSnapshot = await verifyIdentitySnapshot(identityDir, rawSourceHashes, overrideDigest);
    if (!afterPreflightSnapshot.unchanged) return { ...report, status: 'BLOCKED_SOURCE_SNAPSHOT_CHANGED', sourceSnapshotVerified: false, databaseCountsBefore: dbBefore };
    if (dryRun) return { ...report, status: 'DRY_RUN_READY', databaseCountsBefore: dbBefore };

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    try {
      for (const u of data['users.json']) {
        await client.query(
          `INSERT INTO users(id,email,password_hash,salt,name,auth_provider,provider_account_id,avatar_url,status,created_at,updated_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [u.id, String(u.email).trim().toLowerCase(), u.passwordHash, u.salt, u.name, u.authProvider ?? 'local', u.providerAccountId ?? null, u.avatarUrl ?? null, u.status ?? 'active', u.createdAt, u.updatedAt],
        );
      }
      for (const o of data['organizations.json']) await client.query(
        'INSERT INTO organizations(id,name,slug,owner_id,plan_id,created_at) VALUES($1,$2,$3,$4,$5,$6)', [o.id,o.name,o.slug,o.ownerId,o.planId ?? 'FREE',o.createdAt],
      );
      for (const m of data['organization_members.json']) await client.query(
        'INSERT INTO organization_members(org_id,user_id,role,legacy_id,created_at) VALUES($1,$2,$3,$4,$5)', [m.orgId,m.userId,m.role,String(m.id),m.createdAt],
      );
      for (const s of data['sessions.json']) await client.query(
        `INSERT INTO sessions(id,user_id,tenant_id,role,token_hash,ip_address,user_agent,expires_at,revoked_at,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [s.id,s.userId,s.tenantId,s.role,s.tokenHash,s.ipAddress ?? null,s.userAgent ?? null,s.expiresAt,s.revokedAt ?? null,s.createdAt],
      );
      const actual = await counts(client);
      const expected = { users: dbBefore.users + inspection.counts['users.json'], organizations: dbBefore.organizations + inspection.counts['organizations.json'], memberships: dbBefore.memberships + inspection.counts['organization_members.json'], sessions: dbBefore.sessions + inspection.counts['sessions.json'] };
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('POST_IMPORT_COUNT_MISMATCH');
      const fk = await client.query(`SELECT count(*)::int AS violations FROM organization_members m LEFT JOIN organizations o ON o.id=m.org_id LEFT JOIN users u ON u.id=m.user_id WHERE o.id IS NULL OR u.id IS NULL`);
      const owner = await client.query(`SELECT count(*)::int AS violations FROM organizations o LEFT JOIN organization_members m ON m.org_id=o.id AND m.user_id=o.owner_id AND m.role='OWNER' WHERE m.user_id IS NULL`);
      const sessionFk = await client.query(`SELECT count(*)::int AS violations FROM sessions s LEFT JOIN organization_members m ON m.org_id=s.tenant_id AND m.user_id=s.user_id WHERE m.user_id IS NULL`);
      const exactOwner = await client.query(`SELECT count(*)::int AS violations FROM organizations o WHERE o.id=ANY($1::text[]) AND (SELECT count(*) FROM organization_members m WHERE m.org_id=o.id AND m.role='OWNER')<>1`, [data['organizations.json'].map(o => o.id)]);
      if (fk.rows[0].violations || owner.rows[0].violations || sessionFk.rows[0].violations || exactOwner.rows[0].violations) throw new Error('POST_IMPORT_FOREIGN_KEY_OR_OWNER_VALIDATION_FAILED');
      await client.query('SELECT setval(pg_get_serial_sequence(\'users\',\'id\'), COALESCE((SELECT max(id) FROM users),1), true)');
      await client.query('SELECT setval(pg_get_serial_sequence(\'organization_members\',\'id\'), COALESCE((SELECT max(id) FROM organization_members),1), true)');
      await client.query('INSERT INTO identity_imports(source_digest,source_counts) VALUES($1,$2::jsonb)', [digest, JSON.stringify(inspection.counts)]);
      const beforeCommitSnapshot = await verifyIdentitySnapshot(identityDir, rawSourceHashes, overrideDigest);
      if (!beforeCommitSnapshot.unchanged) throw new Error('SOURCE_SNAPSHOT_CHANGED_DURING_IMPORT');
      await client.query('COMMIT');
      return { ...report, status: 'IMPORTED', countsAfter: actual, foreignKeyViolations: fk.rows[0].violations + sessionFk.rows[0].violations, ownerConflicts: owner.rows[0].violations + exactOwner.rows[0].violations };
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]).catch(() => {});
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = !process.argv.includes('--apply');
  migrateIdentity({ dryRun }).then(report => {
    console.log(JSON.stringify(report, null, 2));
    if (report.status.startsWith('BLOCKED')) process.exitCode = 2;
  }).catch(error => { console.error(`identity migration failed: ${error.message}`); process.exitCode = 1; });
}
