import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateRepairAuthorization, enforceTenantIsolation } from './repairGovernanceService.ts';

describe('Repair Governance Authorization & Tenant Isolation Unit Tests', () => {
  describe('validateRepairAuthorization', () => {
    it('1. Rejects unauthenticated principals without verified session', () => {
      const result = validateRepairAuthorization(null);
      assert.equal(result.allowed, false);
      assert.match(result.reason || '', /UNAUTHENTICATED/);
    });

    it('2. Rejects session with unverified token flag (isTokenVerified: false)', () => {
      const result = validateRepairAuthorization({ id: 'user-1', role: 'admin', isTokenVerified: false });
      assert.equal(result.allowed, false);
      assert.match(result.reason || '', /UNAUTHENTICATED/);
    });

    it('3. Denies ADMIN role from approving repairs (OWNER role strictly required)', () => {
      const adminUser = { id: 'admin-user', role: 'admin', isTokenVerified: true, tenantId: 'tenant-1' };
      const result = validateRepairAuthorization(adminUser);
      assert.equal(result.allowed, false);
      assert.match(result.reason || '', /AUTHORIZATION_DENIED/);
      assert.equal(result.userRole, 'ADMIN');
    });

    it('4. Denies DEVELOPER / engineer role from approving repairs', () => {
      const devUser = { id: 'dev-user', role: 'engineer', isTokenVerified: true, tenantId: 'tenant-1' };
      const result = validateRepairAuthorization(devUser);
      assert.equal(result.allowed, false);
      assert.match(result.reason || '', /AUTHORIZATION_DENIED/);
      assert.equal(result.userRole, 'DEVELOPER');
    });

    it('5. Denies VIEWER role from approving repairs', () => {
      const viewerUser = { id: 'viewer-user', role: 'viewer', isTokenVerified: true, tenantId: 'tenant-1' };
      const result = validateRepairAuthorization(viewerUser);
      assert.equal(result.allowed, false);
      assert.match(result.reason || '', /AUTHORIZATION_DENIED/);
      assert.equal(result.userRole, 'VIEWER');
    });

    it('6. Allows OWNER role to authorize repairs for matching tenant', () => {
      const ownerUser = { id: 'owner-workspace', role: 'admin', accountRole: 'OWNER', isTokenVerified: true, tenantId: 'tenant-1' };
      const result = validateRepairAuthorization(ownerUser, 'tenant-1');
      assert.equal(result.allowed, true);
      assert.equal(result.userRole, 'OWNER');
    });

    it('7. Denies OWNER role if principal tenant does not match target tenant ID', () => {
      const ownerUser = { id: 'owner-workspace', role: 'admin', accountRole: 'OWNER', isTokenVerified: true, tenantId: 'tenant-A' };
      const result = validateRepairAuthorization(ownerUser, 'tenant-B');
      assert.equal(result.allowed, false);
      assert.match(result.reason || '', /TENANT_MISMATCH/);
    });
  });

  describe('enforceTenantIsolation', () => {
    it('1. Confirms isolation when principal tenant matches target tenant', () => {
      const result = enforceTenantIsolation('tenant-1', 'tenant-1');
      assert.equal(result.isolated, true);
      assert.equal(result.reason, undefined);
    });

    it('2. Defaults missing tenant IDs to default-tenant and confirms isolation', () => {
      const result = enforceTenantIsolation(undefined, undefined);
      assert.equal(result.isolated, true);
    });

    it('3. Denies cross-tenant repair request access when tenant IDs mismatch', () => {
      const result = enforceTenantIsolation('tenant-alpha', 'tenant-beta');
      assert.equal(result.isolated, false);
      assert.match(result.reason || '', /TENANT_ISOLATION_VIOLATION/);
    });
  });
});
