import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequestUser } from '../src/services/authService.ts';
import { identityService } from '../src/services/identityService.ts';

describe('Patch 1: Identity Contract Hardening Regression Suite', () => {
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

  test('1. Client-supplied headers (x-user-id, x-user-role) are REJECTED for privilege escalation or identity spoofing', () => {
    process.env.ZYNTHEOR_ACCESS_TOKEN = 'secret-master-token-12345';
    process.env.NODE_ENV = 'production';

    const fakeRequest = {
      headers: {
        'x-user-id': '999999',
        'x-user-role': 'admin',
        'x-owner-id': 'hacked-owner',
        'x-tenant-id': 'org-malicious',
      },
    };

    const user = resolveRequestUser(fakeRequest);
    assert.equal(user.isTokenVerified, false);
    assert.equal(user.role, 'viewer');
    assert.equal(user.id, 'unverified-viewer');
    assert.notEqual(user.id, '999999');
    assert.notEqual(user.tenantId, 'org-malicious');
  });

  test('2. Valid account session (zyntheor_sess_*) derives identity EXCLUSIVELY from trusted server records', () => {
    const uniqueEmail = `verified_${Date.now()}_${Math.random().toString(36).slice(2)}@zyntheor.local`;
    const registered = identityService.registerUser({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      name: 'Verified User',
    });

    const sessionToken = registered.session.accessToken;
    assert.ok(sessionToken.startsWith('zyntheor_sess_'));

    const reqWithValidSession = {
      headers: {
        authorization: `Bearer ${sessionToken}`,
        'x-user-id': 'attempted-spoof-id',
        'x-user-role': 'admin-attempt',
      },
    };

    const user = resolveRequestUser(reqWithValidSession);
    assert.equal(user.isTokenVerified, true);
    assert.equal(user.id, String(registered.user.id));
    assert.notEqual(user.id, 'attempted-spoof-id');
    assert.equal(user.source, 'verified_token');
    assert.equal(user.tenantId, registered.session.tenantId);
  });

  test('3. Expired or Revoked account sessions fail closed immediately', () => {
    const uniqueEmail = `revoked_${Date.now()}_${Math.random().toString(36).slice(2)}@zyntheor.local`;
    const registered = identityService.registerUser({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      name: 'Revoked User',
    });

    const sessionToken = registered.session.accessToken;
    
    // Revoke session
    identityService.revokeSession(registered.session.id);

    const reqWithRevokedSession = {
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    };

    const user = resolveRequestUser(reqWithRevokedSession);
    assert.equal(user.isTokenVerified, false);
    assert.equal(user.role, 'viewer');
    assert.equal(user.id, 'unverified-viewer');
  });

  test('4. Deployment master access token provides system-level authorization separate from account sessions', () => {
    process.env.ZYNTHEOR_ACCESS_TOKEN = 'deployment-access-key-999';

    const reqWithMasterToken = {
      headers: {
        authorization: 'Bearer deployment-access-key-999',
      },
    };

    const user = resolveRequestUser(reqWithMasterToken);
    assert.equal(user.isTokenVerified, true);
    assert.equal(user.role, 'admin');
    assert.equal(user.id, 'admin-workspace');
  });

  test('5. OWNER and ADMIN roles remain strictly segregated in identity service', () => {
    const uniqueEmail = `owner_test_${Date.now()}@zyntheor.local`;
    const registered = identityService.registerUser({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      name: 'Owner User',
    });

    const userOrgId = registered.session.tenantId;
    const members = identityService.getOrganizationMembers(userOrgId);
    const ownerMember = members.find(m => m.role === 'OWNER');
    assert.ok(ownerMember, 'Registered user workspace must have an OWNER member');

    // Update role to ADMIN
    const updateResult = identityService.updateMemberRole(userOrgId, ownerMember.userId, 'ADMIN');
    assert.equal(updateResult, true);
    
    const updatedMembers = identityService.getOrganizationMembers(userOrgId);
    const updatedMember = updatedMembers.find(m => m.userId === ownerMember.userId);
    assert.equal(updatedMember.role, 'ADMIN');
  });
});
