import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runPostgresPreflight } from '../scripts/postgres-preflight.mjs';
import { loadIdentityImportProjection } from '../scripts/identity-import-projection.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const identityFiles = ['users.json', 'organizations.json', 'organization_members.json', 'sessions.json'];
const sourceHashes = async () => Object.fromEntries(await Promise.all(identityFiles.map(async file => [
  file,
  createHash('sha256').update(await readFile(new URL(`../workspace_data/identity/${file}`, import.meta.url))).digest('hex'),
])));

test('approved owner override changes only the import projection and is bound to immutable source hashes', async () => {
  const before = await sourceHashes();
  const projection = await loadIdentityImportProjection(new URL('../workspace_data/identity', import.meta.url).pathname);
  const rawMember = projection.sourceData['organization_members.json'].find(row => row.id === 'mem-3-org-usr-3');
  const projectedMember = projection.data['organization_members.json'].find(row => row.id === 'mem-3-org-usr-3');
  const projectedOrg = projection.data['organizations.json'].find(row => row.id === 'org-usr-3');
  assert.equal(projection.overrideErrors.length, 0);
  assert.equal(projection.overridesApplied.length, 1);
  assert.equal(rawMember.role, 'ADMIN');
  assert.equal(projectedMember.role, 'OWNER');
  assert.equal(projectedOrg.ownerId, 3);
  assert.deepEqual(await sourceHashes(), before);
});

test('P3 preflight reports connection/source blockers without connecting or writing when no endpoint is supplied', async () => {
  const report = await runPostgresPreflight({ databaseUrl: '' });
  assert.equal(report.writesPerformed, false);
  assert.equal(report.database.configured, false);
  assert.equal(report.database.reason, 'DATABASE_URL_NOT_CONFIGURED');
  assert.equal(report.status, 'BLOCKED_PENDING_DATABASE_CONNECTION');
  assert.deepEqual(report.source.counts, {
    'users.json': 7,
    'organizations.json': 7,
    'organization_members.json': 7,
    'sessions.json': 8,
  });
  assert.ok(report.source.originalConflicts.some(value => value.includes('organization owner conflicts')));
  assert.equal(report.source.conflicts.length, 0);
  assert.equal(report.source.overridesApplied.length, 1);
  assert.equal(report.source.overridesApplied[0].membershipId, 'mem-3-org-usr-3');
  assert.equal(report.source.overridesApplied[0].fromRole, 'ADMIN');
  assert.equal(report.source.overridesApplied[0].toRole, 'OWNER');
  assert.equal(report.source.overridesApplied[0].ownerIdPreserved, true);
  assert.deepEqual(report.source.overrideValidationErrors, []);
});

test('P3 database probe is read-only and checks the exact P1/P2 migration ledger and schema', async () => {
  const source = await read('scripts/postgres-preflight.mjs');
  assert.match(source, /BEGIN READ ONLY/);
  assert.match(source, /transaction_read_only/);
  assert.match(source, /0001_identity_foundation\.sql/);
  assert.match(source, /0002_identity_auth\.sql/);
  assert.match(source, /allExpectedChecksumsMatch/);
  assert.match(source, /requiredConstraints/);
  assert.match(source, /organizations_owner_membership_fk/);
  assert.match(source, /sessions_tenant_membership_fk/);
  assert.match(source, /countsReadOnly/);
  assert.match(source, /integrityReadOnly/);
  assert.match(source, /sessionsWithoutTenantMembership/);
  assert.match(source, /ROLLBACK/);
  assert.doesNotMatch(source, /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COMMIT)\b/);
  assert.match(source, /writesPerformed: false/);
});
