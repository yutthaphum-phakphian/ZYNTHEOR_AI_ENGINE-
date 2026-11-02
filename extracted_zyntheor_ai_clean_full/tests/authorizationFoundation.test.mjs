import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authorizeOperation, resolveEffectiveRole } from '../src/services/authorizationService.ts';
import { resolveRequestUser } from '../src/services/authService.ts';
import { identityService } from '../src/services/identityService.ts';

describe('Patch 2: Shared Authorization Foundation Regression Suite', () => {
  let origMasterToken;
  let origEnv;

  beforeEach(() => {
    origMasterToken = process.env.ZYNTHEOR_ACCESS_TOKEN;
    origEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (origMasterToken !== undefined) process.env.ZYNTHEOR_ACCESS_TOKEN = origMasterToken;
    else delete process.env.ZYNTHEOR_ACCESS_TOKEN;
    if (origEnv !== undefined) process.env.NODE_ENV = origEnv;
    else delete process.env.NODE_ENV;
  });

  test('1. Direct service invocation without valid principal is DENIED (Deny by default)', () => {
    // Null principal
    const resNull = authorizeOperation(null, 'project:read');
    assert.equal(resNull.allowed, false);
    assert.equal(resNull.effectiveRole, 'UNKNOWN');

    // Undefined principal
    const resUndef = authorizeOperation(undefined, 'project:read');
    assert.equal(resUndef.allowed, false);

    // Empty object principal
    const resEmpty = authorizeOperation({}, 'project:read');
    assert.equal(resEmpty.allowed, false);
  });

  test('2. Unverified principal (isTokenVerified: false) is DENIED for all protected operations', () => {
    const unverifiedUser = {
      id: 'unverified-viewer',
      role: 'viewer',
      isTokenVerified: false,
      source: 'unverified',
    };

    const operations = ['project:read', 'project:write', 'project:delete', 'backup:create', 'backup:restore'];
    for (const op of operations) {
      const res = authorizeOperation(unverifiedUser, op);
      assert.equal(res.allowed, false, `Unverified user must be denied for '${op}'`);
    }
  });

  test('3. OWNER vs ADMIN Distinction: OWNER allows backup:restore, ADMIN strictly DENIES backup:restore', () => {
    const ownerPrincipal = {
      id: '101',
      role: 'admin',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'OWNER',
    };

    const adminPrincipal = {
      id: '102',
      role: 'admin',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'ADMIN',
    };

    // Both OWNER and ADMIN allow backup:create
    assert.equal(authorizeOperation(ownerPrincipal, 'backup:create').allowed, true);
    assert.equal(authorizeOperation(adminPrincipal, 'backup:create').allowed, true);

    // Both OWNER and ADMIN allow project:delete
    assert.equal(authorizeOperation(ownerPrincipal, 'project:delete').allowed, true);
    assert.equal(authorizeOperation(adminPrincipal, 'project:delete').allowed, true);

    // CRITICAL POLICY: OWNER allows backup:restore, ADMIN DENIES backup:restore
    const ownerRestore = authorizeOperation(ownerPrincipal, 'backup:restore');
    assert.equal(ownerRestore.allowed, true, 'OWNER must be ALLOWED for backup:restore');

    const adminRestore = authorizeOperation(adminPrincipal, 'backup:restore');
    assert.equal(adminRestore.allowed, false, 'ADMIN must be DENIED for backup:restore');
    assert.match(adminRestore.reason, /denied for role 'ADMIN'/i);
  });

  test('4. DEVELOPER restrictions: Allows project:read and project:write; Denies project:delete, backup:create, backup:restore', () => {
    const devPrincipal = {
      id: '103',
      role: 'engineer',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'DEVELOPER',
    };

    assert.equal(authorizeOperation(devPrincipal, 'project:read').allowed, true);
    assert.equal(authorizeOperation(devPrincipal, 'project:write').allowed, true);

    assert.equal(authorizeOperation(devPrincipal, 'project:delete').allowed, false);
    assert.equal(authorizeOperation(devPrincipal, 'backup:create').allowed, false);
    assert.equal(authorizeOperation(devPrincipal, 'backup:restore').allowed, false);
  });

  test('5. MEMBER restrictions: Allows project:read; Denies project:write, project:delete, backup:create, backup:restore', () => {
    const memberPrincipal = {
      id: '104',
      role: 'engineer',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'MEMBER',
    };

    assert.equal(authorizeOperation(memberPrincipal, 'project:read').allowed, true);

    assert.equal(authorizeOperation(memberPrincipal, 'project:write').allowed, false);
    assert.equal(authorizeOperation(memberPrincipal, 'project:delete').allowed, false);
    assert.equal(authorizeOperation(memberPrincipal, 'backup:create').allowed, false);
    assert.equal(authorizeOperation(memberPrincipal, 'backup:restore').allowed, false);
  });

  test('6. VIEWER restrictions: Allows project:read; Denies all state-modifying operations', () => {
    const viewerPrincipal = {
      id: '105',
      role: 'viewer',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'VIEWER',
    };

    assert.equal(authorizeOperation(viewerPrincipal, 'project:read').allowed, true);

    assert.equal(authorizeOperation(viewerPrincipal, 'project:write').allowed, false);
    assert.equal(authorizeOperation(viewerPrincipal, 'project:delete').allowed, false);
    assert.equal(authorizeOperation(viewerPrincipal, 'backup:create').allowed, false);
    assert.equal(authorizeOperation(viewerPrincipal, 'backup:restore').allowed, false);
  });

  test('7. Tenant Boundary Verification: Tenant mismatch results in immediate DENIAL', () => {
    const principal = {
      id: '101',
      role: 'admin',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'OWNER',
    };

    // Matching tenant -> Allowed
    const matchRes = authorizeOperation(principal, 'project:read', 'org-tenant-alpha');
    assert.equal(matchRes.allowed, true);

    // Mismatched tenant -> Denied
    const mismatchRes = authorizeOperation(principal, 'project:read', 'org-tenant-beta');
    assert.equal(mismatchRes.allowed, false);
    assert.match(mismatchRes.reason, /Tenant mismatch/i);
  });

  test('8. Rejection of Forged Client Tenant/Role/Owner Headers in End-to-End authorization flow', () => {
    process.env.ZYNTHEOR_ACCESS_TOKEN = 'master-token-999';
    process.env.NODE_ENV = 'production';

    // Malicious request attempting to forge role='OWNER' and tenant='org-target' in headers
    const forgedRequest = {
      headers: {
        'x-user-role': 'OWNER',
        'x-user-id': '99999',
        'x-owner-id': 'spoofed-owner',
        'x-tenant-id': 'org-target',
      },
    };

    const resolvedUser = resolveRequestUser(forgedRequest);
    assert.equal(resolvedUser.isTokenVerified, false);

    // Evaluate authorization with resolved user -> Must be DENIED
    const authRes = authorizeOperation(resolvedUser, 'backup:restore', 'org-target');
    assert.equal(authRes.allowed, false);
    assert.equal(authRes.effectiveRole, 'UNKNOWN');
  });

  test('9. Unknown or unmapped operations are DENIED by default', () => {
    const ownerPrincipal = {
      id: '101',
      role: 'admin',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-alpha',
      accountRole: 'OWNER',
    };

    const res = authorizeOperation(ownerPrincipal, 'unknown:admin_nuke');
    assert.equal(res.allowed, false);
    assert.match(res.reason, /Unknown or unmapped canonical operation/i);
  });
});
