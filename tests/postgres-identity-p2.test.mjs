import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectIdentity } from '../scripts/migrate-identity-json.mjs';
import { hashPassword, verifyPassword, needsPasswordUpgrade } from '../src/services/passwordSecurity.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFile(path.join(root, file), 'utf8');
const validFixture = () => {
  const pw = hashPassword('strong-password');
  return {
    'users.json': [{ id: 1, email: 'alpha@example.test', passwordHash: pw.hash, salt: pw.salt, name: 'Alpha', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    'organizations.json': [{ id: 'org-a', name: 'A', slug: 'a', ownerId: 1, planId: 'FREE', createdAt: new Date().toISOString() }],
    'organization_members.json': [{ id: 'legacy-member-a', orgId: 'org-a', userId: 1, role: 'OWNER', createdAt: new Date().toISOString() }],
    'sessions.json': [{ id: 'session-a', userId: 1, tenantId: 'org-a', role: 'OWNER', tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 100000).toISOString(), revokedAt: null, createdAt: new Date().toISOString() }],
  };
};

test('P2 password utility verifies current secure hashes, rejects wrong passwords and recognizes weak legacy hash work factors', () => {
  const strong = hashPassword('StrongPassword123!');
  assert.equal(verifyPassword('StrongPassword123!', strong.hash, strong.salt), true);
  assert.equal(verifyPassword('wrong-password', strong.hash, strong.salt), false);
  const legacy = hashPassword('legacy-password', undefined, 10_000);
  assert.equal(verifyPassword('legacy-password', legacy.hash, legacy.salt), true);
  assert.equal(needsPasswordUpgrade(legacy.hash), true);
  assert.equal(needsPasswordUpgrade(strong.hash), false);
});

test('P2 JSON identity preflight validates uniqueness and foreign/tenant/owner references', () => {
  assert.deepEqual(inspectIdentity(validFixture()).errors, []);
  const bad = validFixture(); bad['organizations.json'][0].ownerId = 99;
  assert.ok(inspectIdentity(bad).errors.some(x => x.includes('missing user') || x.includes('owner conflicts')));
  const duplicate = validFixture(); duplicate['users.json'].push({ ...duplicate['users.json'][0], id: 2 });
  assert.ok(inspectIdentity(duplicate).errors.some(x => x.includes('normalized user emails')));
  const sessionWrongTenant = validFixture(); sessionWrongTenant['sessions.json'][0].tenantId = 'org-other';
  assert.ok(inspectIdentity(sessionWrongTenant).errors.some(x => x.includes('session tenant')));
});

test('P2 source preserves immutable JSON backups, uses idempotent digest ledger and transaction count/FK checks', async () => {
  const migration = await read('scripts/migrate-identity-json.mjs');
  const rollback = await read('src/db/migrations/0002_identity_auth.down.sql');
  const upMigration = await read('src/db/migrations/0002_identity_auth.sql');
  assert.match(migration, /backups/);
  assert.match(migration, /source_digest/);
  assert.match(migration, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(migration, /ROLLBACK/);
  assert.match(migration, /POST_IMPORT_COUNT_MISMATCH/);
  assert.match(migration, /POST_IMPORT_FOREIGN_KEY_OR_OWNER_VALIDATION_FAILED/);
  assert.match(migration, /BLOCKED_PENDING_DATABASE_CONNECTION/);
  assert.match(rollback, /P2 rollback blocked/);
  assert.match(rollback, /identity_imports/);
  assert.doesNotMatch(upMigration, /ADD COLUMN user_agent/);
  assert.doesNotMatch(rollback, /DROP COLUMN IF EXISTS user_agent/);
});

test('P2 routes use PostgreSQL identity, HttpOnly cookie, CSRF, DB role, tenant scope and explicit owner-transfer route', async () => {
  const routes = await read('src/routes/auth.ts');
  assert.match(routes, /postgresIdentityService/);
  assert.match(routes, /HttpOnly/);
  assert.match(routes, /x-csrf-token/);
  assert.match(routes, /csrf_token_required/);
  assert.match(routes, /ownership-transfer/);
  assert.doesNotMatch(routes, /identityService\./);
  assert.doesNotMatch(routes, /token:\s*result\.session\.accessToken/);
});

test('P2 PostgreSQL service implements token hashing, expiration/revocation and atomic team/ownership transitions', async () => {
  const service = await read('src/services/postgresIdentityService.ts');
  assert.match(service, /expires_at>now\(\)/);
  assert.match(service, /revoked_at IS NULL/);
  assert.match(service, /tokenHash\(accessToken\)/);
  assert.match(service, /withTransaction/);
  assert.match(service, /FOR UPDATE/);
  assert.match(service, /ownership_transfer_audit/);
  assert.match(service, /org_id=s\.tenant_id/);
});

test('legacy IdentityService unit tests use disposable per-worker storage and cannot mutate source JSON', async () => {
  const legacy = await read('src/services/identityService.ts');
  assert.match(legacy, /NODE_TEST_CONTEXT/);
  assert.match(legacy, /VITEST/);
  assert.match(legacy, /zyntheor-identity-test-\$\{process\.pid\}-\$\{threadId\}/);
  assert.match(legacy, /rmSync\(STORAGE_DIR, \{ recursive: true, force: true \}\)/);
});

test('P2 real PostgreSQL transaction, auth, session, tenant and ownership integration', { skip: !process.env.P2_TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.P2_TEST_DATABASE_URL;
  const { withTransaction, getPool } = await import('../src/db/connection.ts');
  const { postgresIdentityService } = await import('../src/services/postgresIdentityService.ts');
  const probe = `p2_tx_probe_${process.pid}_${Date.now()}`;
  const pool = getPool();
  await pool.query(`CREATE TABLE ${probe}(id integer PRIMARY KEY)`);
  try {
    await assert.rejects(withTransaction(async client => { await client.query(`INSERT INTO ${probe} VALUES(1)`); throw new Error('force rollback'); }), /force rollback/);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${probe}`)).rows[0].n, 0);
    await withTransaction(client => client.query(`INSERT INTO ${probe} VALUES(2)`));
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${probe}`)).rows[0].n, 1);

    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const a = await postgresIdentityService.registerUser({ email: `p2-owner-${suffix}@example.test`, password: 'P2StrongPassword!123', name: 'P2 Owner' });
    const b = await postgresIdentityService.registerUser({ email: `p2-member-${suffix}@example.test`, password: 'P2StrongPassword!123', name: 'P2 Member' });
    try {
      assert.equal((await postgresIdentityService.validateSession(a.accessToken)).valid, true);
      assert.equal((await postgresIdentityService.loginUser(a.user.email, 'P2StrongPassword!123')).user.id, a.user.id);
      assert.equal(await postgresIdentityService.isTenantMember(b.user.id, a.session.tenantId), false);
      await pool.query("INSERT INTO organization_members(org_id,user_id,role) VALUES($1,$2,'MEMBER')", [a.session.tenantId, b.user.id]);
      assert.equal(await postgresIdentityService.isTenantMember(b.user.id, a.session.tenantId), true);
      await postgresIdentityService.transferOwnership({ tenantId: a.session.tenantId, currentOwnerId: a.user.id, targetUserId: b.user.id, reason: 'Integration test transfer' });
      const members = await postgresIdentityService.getOrganizationMembers(a.session.tenantId);
      assert.equal(members.find(m => m.userId === b.user.id)?.role, 'OWNER');
      assert.equal((await postgresIdentityService.validateSession(a.accessToken)).session.role, 'ADMIN');
      await postgresIdentityService.revokeSession(a.session.id, a.accessToken);
      assert.equal((await postgresIdentityService.validateSession(a.accessToken)).valid, false);
    } finally {
      await pool.query('DELETE FROM organizations WHERE id = ANY($1::text[])', [[a.session.tenantId, b.session.tenantId]]);
      await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [[a.user.id, b.user.id]]);
    }

    const express = (await import('express')).default;
    const { default: authRoutes } = await import('../src/routes/auth.ts');
    const app = express(); app.use(express.json()); app.use(authRoutes);
    const http = await import('node:http'); const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let httpUserId;
    try {
      const csrfRes = await fetch(`${base}/api/auth/csrf`);
      const csrfJson = await csrfRes.json();
      const csrfCookie = csrfRes.headers.getSetCookie().find(v => v.startsWith('zyntheor_csrf='))?.split(';')[0];
      assert.equal(csrfRes.status, 200); assert.ok(csrfCookie);
      const email = `p2-http-${suffix}@example.test`;
      const rejected = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'P2StrongPassword!123', name: 'HTTP User' }) });
      assert.equal(rejected.status, 403, 'cookie-auth mutation without CSRF proof must be rejected');
      const register = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: csrfCookie, 'X-CSRF-Token': csrfJson.csrfToken }, body: JSON.stringify({ email, password: 'P2StrongPassword!123', name: 'HTTP User' }) });
      const registerJson = await register.json();
      assert.equal(register.status, 201); assert.equal(registerJson.ok, true); assert.equal('token' in registerJson, false);
      httpUserId = registerJson.user.id;
      const sessionCookie = register.headers.getSetCookie().find(v => v.startsWith('zyntheor_session='))?.split(';')[0];
      assert.ok(sessionCookie); assert.match(register.headers.getSetCookie().find(v => v.startsWith('zyntheor_session=')), /HttpOnly/);
      const crossTenant = await fetch(`${base}/api/auth/entitlements?tenantId=another-tenant`, { headers: { Cookie: `${csrfCookie}; ${sessionCookie}` } });
      assert.equal(crossTenant.status, 403, 'caller-selected tenant must not cross the authenticated tenant boundary');
      const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: csrfCookie, 'X-CSRF-Token': csrfJson.csrfToken }, body: JSON.stringify({ email, password: 'P2StrongPassword!123' }) });
      const loginJson = await login.json(); assert.equal(login.status, 200); assert.equal(loginJson.ok, true); assert.equal('token' in loginJson, false);
      const loginCookie = login.headers.getSetCookie().find(v => v.startsWith('zyntheor_session='))?.split(';')[0];
      const authenticated = await fetch(`${base}/api/auth/me`, { headers: { Cookie: `${csrfCookie}; ${loginCookie}` } });
      assert.equal(authenticated.status, 200);
      const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: `${csrfCookie}; ${loginCookie}`, 'X-CSRF-Token': csrfJson.csrfToken } });
      assert.equal(logout.status, 200);
      const afterLogout = await fetch(`${base}/api/auth/me`, { headers: { Cookie: `${csrfCookie}; ${loginCookie}` } });
      assert.equal(afterLogout.status, 401, 'revoked cookie session must fail validation');
    } finally {
      server.close();
      if (httpUserId) {
        const result = await pool.query('SELECT id FROM organizations WHERE owner_id=$1', [httpUserId]);
        await pool.query('DELETE FROM organizations WHERE owner_id=$1', [httpUserId]);
        await pool.query('DELETE FROM users WHERE id=$1', [httpUserId]);
        assert.ok(result.rowCount >= 1);
      }
    }
  } finally {
    await pool.query(`DROP TABLE IF EXISTS ${probe}`);
  }
});
