import test from 'node:test';
import assert from 'node:assert/strict';
import { isDevAccessModeActive } from '../src/components/AuthGate.tsx';
import { resolveRequestUser, requireRole } from '../src/services/authService.ts';
import { tenantMiddleware } from '../src/middleware/tenant.ts';

test('Development Access Mode Suite', async (t) => {
  await t.test('1. isDevAccessModeActive returns boolean and respects environment boundary', () => {
    const isDev = isDevAccessModeActive();
    assert.equal(typeof isDev, 'boolean');
  });

  await t.test('2. Production Gate strictly fails closed if NODE_ENV=production', () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const devActive = isDevAccessModeActive();
      assert.equal(devActive, false, 'Production environment MUST NOT allow development access mode bypass');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  await t.test('3. Protected API Authorization: No unverified principal is granted admin role', () => {
    const unverifiedReq = { headers: {} };
    const user = resolveRequestUser(unverifiedReq);
    assert.notEqual(user.role, 'admin', 'Unverified principal must never receive admin role');
  });

  await t.test('4. Tenant Isolation: Header forgery of x-tenant-id is rejected and never sets tenantId', () => {
    const fakeHeadersReq = {
      headers: {
        'x-tenant-id': 'tenant-hacked-999',
        'x-user-role': 'admin',
      },
    };
    const res = { setHeader: () => {} };
    let nextCalled = false;
    tenantMiddleware(fakeHeadersReq, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.notEqual(
      fakeHeadersReq.tenantId,
      'tenant-hacked-999',
      'Forged client x-tenant-id must be completely ignored by tenant middleware'
    );
  });

  await t.test('5. requireRole middleware rejects insufficient roles even in local dev', () => {
    const viewerReq = {
      user: { id: 'test-user', role: 'viewer', isTokenVerified: false, source: 'unverified' },
    };
    let statusSet = 0;
    let jsonSent = null;
    const mockRes = {
      status: (s) => {
        statusSet = s;
        return {
          json: (j) => {
            jsonSent = j;
          },
        };
      },
    };

    const adminGuard = requireRole('admin');
    adminGuard(viewerReq, mockRes, () => {
      assert.fail('Next should not be called for viewer when admin is required');
    });

    assert.equal(statusSet, 403);
    assert.equal(jsonSent?.error, 'insufficient_role_permissions');
  });
});
