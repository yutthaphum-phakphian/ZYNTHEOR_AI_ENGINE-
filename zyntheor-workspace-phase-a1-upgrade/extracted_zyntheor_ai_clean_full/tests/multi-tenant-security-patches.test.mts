import { describe, expect, it } from 'vitest';
import {
  createForTenant,
  createTenantBackup,
  findByTenant,
  restoreTenantBackup,
} from '../src/services/tenantScopedStorage.js';
import type { AuthenticatedUser } from '../src/services/authService.js';

const ownerA: AuthenticatedUser = {
  id: 'test-owner-a',
  role: 'admin',
  accountRole: 'OWNER',
  tenantId: 'org-default',
  isTokenVerified: true,
  source: 'verified_token',
};

const ownerB: AuthenticatedUser = {
  id: 'test-owner-b',
  role: 'admin',
  accountRole: 'OWNER',
  tenantId: 'org-other',
  isTokenVerified: true,
  source: 'verified_token',
};

describe('Multi-Tenant Security Patches', () => {
  it('isolates projects by tenant', () => {
    const projectA = createForTenant(ownerA, { name: `Tenant A ${crypto.randomUUID()}` });
    const projectB = createForTenant(ownerB, { name: `Tenant B ${crypto.randomUUID()}` });

    expect(projectA.success).toBe(true);
    expect(projectB.success).toBe(true);
    expect(findByTenant(ownerA).data?.some((project) => project.id === projectA.data?.id)).toBe(true);
    expect(findByTenant(ownerB).data?.some((project) => project.id === projectA.data?.id)).toBe(false);
  });

  it('denies a write targeting another tenant', () => {
    const result = createForTenant(ownerB, { name: 'Cross-tenant attempt' }, ownerA.tenantId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('tenant_authorization_denied');
  });

  it('creates signed tenant backups and denies cross-tenant restores', () => {
    const backupResult = createTenantBackup(ownerA);

    expect(backupResult.success).toBe(true);
    expect(backupResult.data?.backup.formatVersion).toBe('1.0');
    expect(restoreTenantBackup(ownerB, backupResult.data!.backup).error).toBe(
      'cross_tenant_restore_denied'
    );
  });
});
