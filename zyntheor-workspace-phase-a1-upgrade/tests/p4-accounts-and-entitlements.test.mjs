import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import express from 'express';

import { identityService, hashPassword, verifyPassword } from '../src/services/identityService.ts';
import { rbacService } from '../src/services/rbacService.ts';
import { entitlementEngine, SUBSCRIPTION_PLANS } from '../src/services/entitlementEngine.ts';
import { usageMeteringService } from '../src/services/usageMetering.ts';
import { tenantIsolationService } from '../src/services/tenantIsolation.ts';
import authRouter from '../src/routes/auth.ts';

// 1. Password Hashing & PBKDF2 Verification
test('P4-1: Password Hashing — PBKDF2 with salt and timing-safe comparison', () => {
  const password = 'SecurePassword123!';
  const { hash, salt } = hashPassword(password);

  assert.ok(hash);
  assert.ok(salt);
  assert.equal(hash.length, 128); // 64 bytes in hex = 128 chars
  assert.equal(salt.length, 32);  // 16 bytes in hex = 32 chars

  // Verify correct password matches
  const isMatch = verifyPassword(password, hash, salt);
  assert.equal(isMatch, true);

  // Verify wrong password fails
  const isWrong = verifyPassword('WrongPassword123!', hash, salt);
  assert.equal(isWrong, false);
});

// 2. Registration and Login Verification
test('P4-2: User Registration & Login — Account creation and credential validation', () => {
  const testEmail = `testuser_${Date.now()}@zyntheor.local`;
  const testPassword = 'TestPassword123!';

  // Registration
  const regResult = identityService.registerUser({
    email: testEmail,
    password: testPassword,
    name: 'Test Engineer',
  });

  assert.ok(regResult.user);
  assert.equal(regResult.user.email, testEmail);
  assert.ok(regResult.session);
  assert.ok(regResult.session.accessToken.startsWith('zyntheor_sess_'));
  assert.ok(!regResult.session.id.startsWith('zyntheor_sess_'));
  assert.equal(JSON.stringify(regResult.session).includes(regResult.session.accessToken), false);

  // Duplicate registration must fail
  assert.throws(() => {
    identityService.registerUser({
      email: testEmail,
      password: testPassword,
      name: 'Duplicate',
    });
  }, /already exists/);

  // Login
  const loginResult = identityService.loginUser(testEmail, testPassword);
  assert.ok(loginResult.user);
  assert.equal(loginResult.user.email, testEmail);
  assert.ok(loginResult.session.id);
});

// 3. Session Lifecycle & Revocation
test('P4-3: Session Lifecycle — Session validation and revocation', () => {
  const testEmail = `sessuser_${Date.now()}@zyntheor.local`;
  const { session } = identityService.registerUser({
    email: testEmail,
    password: 'SessionPassword123!',
    name: 'Session User',
  });

  // Validate active session
  const validCheck = identityService.validateSession(session.accessToken);
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.user?.email, testEmail);

  // Revoke session
  const revoked = identityService.revokeSession(session.id);
  assert.equal(revoked, true);

  // Validate revoked session fails
  const invalidCheck = identityService.validateSession(session.accessToken);
  assert.equal(invalidCheck.valid, false);
  assert.equal(invalidCheck.reason, 'Session has been revoked');
});

// 4. Role-Based Access Control (RBAC) Permission Matrix
test('P4-4: RBAC Matrix — Roles and deny-by-default permission checks', () => {
  // OWNER permissions
  assert.equal(rbacService.hasPermission('OWNER', 'workspace:delete'), true);
  assert.equal(rbacService.hasPermission('OWNER', 'org:manage'), true);

  // ADMIN permissions
  assert.equal(rbacService.hasPermission('ADMIN', 'workspace:write'), true);
  assert.equal(rbacService.hasPermission('ADMIN', 'account:manage'), false); // Cannot delete account

  // DEVELOPER permissions
  assert.equal(rbacService.hasPermission('DEVELOPER', 'ai:inference'), true);
  assert.equal(rbacService.hasPermission('DEVELOPER', 'tool:execute'), true);
  assert.equal(rbacService.hasPermission('DEVELOPER', 'org:manage'), false);

  // VIEWER permissions
  assert.equal(rbacService.hasPermission('VIEWER', 'workspace:read'), true);
  assert.equal(rbacService.hasPermission('VIEWER', 'workspace:write'), false);
  assert.equal(rbacService.hasPermission('VIEWER', 'tool:execute'), false);
});

// 5. Entitlement Engine Plan Evaluation
test('P4-5: Entitlement Engine — Plan quotas for FREE, PRO, TEAM, ENTERPRISE', () => {
  const freePlan = entitlementEngine.getPlan('FREE');
  assert.equal(freePlan.monthlyAiRequests, 500);
  assert.equal(freePlan.maxWorkspaces, 3);
  assert.equal(freePlan.toolsSandboxEnabled, false);

  const proPlan = entitlementEngine.getPlan('PRO');
  assert.equal(proPlan.monthlyAiRequests, 10000);
  assert.equal(proPlan.toolsSandboxEnabled, true);

  // Quota check under FREE plan (current 100 / limit 500)
  const checkPass = entitlementEngine.checkEntitlement('FREE', 'ai.requests', 100);
  assert.equal(checkPass.entitled, true);

  // Quota check exhausted (current 500 / limit 500)
  const checkFail = entitlementEngine.checkEntitlement('FREE', 'ai.requests', 500);
  assert.equal(checkFail.entitled, false);
  assert.ok(checkFail.reason?.includes('limit reached'));
});

// 6. Usage Metering Idempotency
test('P4-6: Usage Metering — Idempotent recording prevents double-counting on retries', () => {
  const tenantId = `tenant_meter_${Date.now()}`;
  const idempotencyKey = `idem_key_${Date.now()}`;

  // First record
  const record1 = usageMeteringService.recordUsage({
    tenantId,
    userId: 101,
    workspaceId: 'ws-1',
    metric: 'ai_requests',
    amount: 1,
    idempotencyKey,
  });

  assert.ok(record1.id);

  // Retry with same idempotencyKey
  const record2 = usageMeteringService.recordUsage({
    tenantId,
    userId: 101,
    workspaceId: 'ws-1',
    metric: 'ai_requests',
    amount: 1,
    idempotencyKey,
  });

  // Must return identical record without double counting
  assert.equal(record1.id, record2.id);

  const totalUsage = usageMeteringService.getMonthlyUsage(tenantId, 'ai_requests');
  assert.equal(totalUsage, 1);
});

// 7. Multi-Tenant Isolation
test('P4-7: Tenant Isolation — Membership verification blocks cross-tenant access', () => {
  const tenantId = 'org-default';

  // Valid tenant owner (userId 1)
  assert.doesNotThrow(() => {
    tenantIsolationService.verifyTenantMembership(1, tenantId);
  });

  // Non-existent user attempting cross-tenant access
  assert.throws(() => {
    tenantIsolationService.verifyTenantMembership(999999, tenantId);
  }, /TENANT ISOLATION VIOLATION/);
});

test('Entitlements route requires a valid session and verifies the session tenant membership', async () => {
  const { session } = identityService.registerUser({
    email: `entitlements_${Date.now()}@zyntheor.local`,
    password: 'EntitlementsPassword123!',
    name: 'Entitlements Test',
  });
  const app = express();
  app.use(authRouter);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseOrigin = `http://127.0.0.1:${address.port}`;
  const baseUrl = `${baseOrigin}/api/auth/entitlements`;
  const request = (path = '', token) => fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const requestAuth = (endpoint, token) => fetch(`${baseOrigin}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const assertDeniedWithoutEntitlements = async (response, status) => {
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.plan, undefined);
    assert.equal(body.usage, undefined);
    assert.equal(body.entitlements, undefined);
    return body;
  };

  try {
    await assertDeniedWithoutEntitlements(await request(), 401);
    await assertDeniedWithoutEntitlements(await request('', 'invalid-session-token'), 401);

    const originalExpiry = session.expiresAt;
    session.expiresAt = new Date(Date.now() - 1000).toISOString();
    try {
      await assertDeniedWithoutEntitlements(await request('', session.accessToken), 401);
    } finally {
      session.expiresAt = originalExpiry;
    }

    const mismatchResponse = await request('?tenantId=org-default', session.accessToken);
    assert.equal((await assertDeniedWithoutEntitlements(mismatchResponse, 403)).error, 'tenant_access_denied');

    const originalTenantId = session.tenantId;
    session.tenantId = 'org-default';
    try {
      const nonMemberResponse = await request('', session.accessToken);
      assert.equal((await assertDeniedWithoutEntitlements(nonMemberResponse, 403)).error, 'tenant_access_denied');
      for (const endpoint of ['/api/auth/me', '/api/auth/members']) {
        const response = await requestAuth(endpoint, session.accessToken);
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error, 'tenant_access_denied');
      }
    } finally {
      session.tenantId = originalTenantId;
    }

    const authorizedResponse = await request('', session.accessToken);
    assert.equal(authorizedResponse.status, 200);
    const authorizedData = await authorizedResponse.json();
    assert.equal(authorizedData.tenantId, session.tenantId);
    assert.equal(authorizedData.ok, true);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('OAuth profile claims and client Local-Only override cannot create an authenticated session', async () => {
  const email = `fake-oauth_${Date.now()}@zyntheor.local`;
  const providerAccountId = `fake-provider-account-${Date.now()}`;
  const app = express();
  app.use(express.json());
  app.use(authRouter);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/oauth/register-or-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        providerAccountId,
        email,
        name: 'Unverified OAuth User',
        overrideLocalOnlyConsent: true,
      }),
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'oauth_provider_verification_unavailable',
    });
    assert.equal(identityService.users.some(user => user.email === email), false);
    assert.equal(identityService.users.some(user => user.providerAccountId === providerAccountId), false);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('Account center sends its stored bearer token when requesting entitlements', () => {
  const source = readFileSync(new URL('../src/components/AccountCenterModal.tsx', import.meta.url), 'utf8');
  const fetchEntitlements = source.match(/async function fetchEntitlements\(token: string\) \{([\s\S]*?)\n  \}/);
  assert.ok(fetchEntitlements);
  assert.match(fetchEntitlements[1], /fetch\('\/api\/auth\/entitlements'/);
  assert.match(fetchEntitlements[1], /Authorization:\s*`Bearer \$\{token\}`/);
});
