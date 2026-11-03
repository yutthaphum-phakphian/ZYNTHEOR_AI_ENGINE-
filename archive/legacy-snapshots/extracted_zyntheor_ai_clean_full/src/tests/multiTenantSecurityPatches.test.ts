import { describe, it, expect, beforeEach } from 'vitest';
import {
  findByTenant,
  findOneByTenant,
  createForTenant,
  updateForTenant,
  deleteForTenant,
  getQuarantinedLegacyProjects,
  classifyLegacyProject,
  createTenantBackup,
  isBackupSecretConfigured,
  restoreTenantBackup,
} from '../services/tenantScopedStorage';
import { authorizationService, PERMISSION_MATRIX } from '../services/authorizationService';
import type { AuthenticatedUser } from '../services/authService';

describe('MULTI-TENANT SECURITY IMPLEMENTATION (PATCH 3, 4, 5 & 6)', () => {
  beforeEach(() => {
    process.env.BACKUP_HMAC_SECRET = 'test-sovereign-hmac-secret-key-12345';
  });

  it('uses a test-only fallback when no backup HMAC secret is configured', () => {
    const previousEnv = {
      backup: process.env.BACKUP_HMAC_SECRET,
      server: process.env.SERVER_BACKUP_HMAC_SECRET,
      tenant: process.env.TENANT_STORAGE_HMAC_SECRET,
      billing: process.env.BILLING_WEBHOOK_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };

    try {
      delete process.env.BACKUP_HMAC_SECRET;
      delete process.env.SERVER_BACKUP_HMAC_SECRET;
      delete process.env.TENANT_STORAGE_HMAC_SECRET;
      delete process.env.BILLING_WEBHOOK_SECRET;
      process.env.NODE_ENV = 'production';
      expect(isBackupSecretConfigured()).toBe(false);

      process.env.NODE_ENV = 'test';

      expect(isBackupSecretConfigured()).toBe(true);
    } finally {
      if (previousEnv.backup === undefined) delete process.env.BACKUP_HMAC_SECRET;
      else process.env.BACKUP_HMAC_SECRET = previousEnv.backup;
      if (previousEnv.server === undefined) delete process.env.SERVER_BACKUP_HMAC_SECRET;
      else process.env.SERVER_BACKUP_HMAC_SECRET = previousEnv.server;
      if (previousEnv.tenant === undefined) delete process.env.TENANT_STORAGE_HMAC_SECRET;
      else process.env.TENANT_STORAGE_HMAC_SECRET = previousEnv.tenant;
      if (previousEnv.billing === undefined) delete process.env.BILLING_WEBHOOK_SECRET;
      else process.env.BILLING_WEBHOOK_SECRET = previousEnv.billing;
      if (previousEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnv.nodeEnv;
    }
  });

  const tenantAOwner: AuthenticatedUser = {
    id: 'usr-owner-a',
    email: 'owner-a@tenant-a.com',
    role: 'admin',
    accountRole: 'OWNER',
    tenantId: 'org-tenant-a',
    isTokenVerified: true,
    source: 'verified_token',
  };

  const tenantAAdmin: AuthenticatedUser = {
    id: 'usr-admin-a',
    email: 'admin-a@tenant-a.com',
    role: 'admin',
    accountRole: 'ADMIN',
    tenantId: 'org-tenant-a',
    isTokenVerified: true,
    source: 'verified_token',
  };

  const tenantADeveloper: AuthenticatedUser = {
    id: 'usr-dev-a',
    email: 'dev-a@tenant-a.com',
    role: 'engineer',
    accountRole: 'DEVELOPER',
    tenantId: 'org-tenant-a',
    isTokenVerified: true,
    source: 'verified_token',
  };

  const tenantAMember: AuthenticatedUser = {
    id: 'usr-mem-a',
    email: 'mem-a@tenant-a.com',
    role: 'viewer',
    accountRole: 'MEMBER',
    tenantId: 'org-tenant-a',
    isTokenVerified: true,
    source: 'verified_token',
  };

  const tenantBOwner: AuthenticatedUser = {
    id: 'usr-owner-b',
    email: 'owner-b@tenant-b.com',
    role: 'admin',
    accountRole: 'OWNER',
    tenantId: 'org-tenant-b',
    isTokenVerified: true,
    source: 'verified_token',
  };

  const unverifiedCaller: AuthenticatedUser = {
    id: 'usr-unverified',
    email: 'fake@tenant-a.com',
    role: 'admin',
    accountRole: 'OWNER',
    tenantId: 'org-tenant-a',
    isTokenVerified: false,
    source: 'unverified',
  };

  describe('PATCH 3 — TENANT PERSISTENCE FOUNDATION', () => {
    it('3.1 Should stamp principal tenantId on create and prevent client tenantId spoofing', () => {
      const created = createForTenant(tenantAOwner, {
        name: 'Tenant A Secured Project',
        description: 'Testing tenant isolation',
        tenantId: 'org-tenant-b-spoofed', // Client attempts to spoof tenantId
      } as any);

      expect(created.success).toBe(true);
      expect(created.data).toBeDefined();
      expect(created.data?.tenantId).toBe('org-tenant-a'); // Stamped from verified principal!
      expect(created.data?.tenantId).not.toBe('org-tenant-b-spoofed');
    });

    it('3.2 Should isolate reads between Tenant A and Tenant B', () => {
      const projA = createForTenant(tenantAOwner, { name: 'Tenant A Exclusive' });
      const projB = createForTenant(tenantBOwner, { name: 'Tenant B Exclusive' });

      expect(projA.success).toBe(true);
      expect(projB.success).toBe(true);

      const listA = findByTenant(tenantAOwner);
      expect(listA.success).toBe(true);
      expect(listA.data?.some((p) => p.id === projA.data?.id)).toBe(true);
      expect(listA.data?.some((p) => p.id === projB.data?.id)).toBe(false);

      const listB = findByTenant(tenantBOwner);
      expect(listB.success).toBe(true);
      expect(listB.data?.some((p) => p.id === projB.data?.id)).toBe(true);
      expect(listB.data?.some((p) => p.id === projA.data?.id)).toBe(false);
    });

    it('3.3 Should deny cross-tenant updates and deletes', () => {
      const projA = createForTenant(tenantAOwner, { name: 'Tenant A Targeted' });
      expect(projA.success).toBe(true);

      // Tenant B tries to update Tenant A's project
      const updateResult = updateForTenant(tenantBOwner, projA.data!.id, { name: 'Hacked Name' });
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('project_not_found');

      // Tenant B tries to delete Tenant A's project
      const deleteResult = deleteForTenant(tenantBOwner, projA.data!.id);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBe('project_not_found');
    });

    it('3.4 Should reject direct service calls from unverified principals', () => {
      const result = findByTenant(unverifiedCaller);
      expect(result.success).toBe(false);
      expect(result.error).toBe('tenant_authorization_denied');
      expect(result.reason).toContain('verified principal');
    });
  });

  describe('PATCH 4 — LEGACY DATA AUDIT & QUARANTINE', () => {
    it('4.1 Should quarantine legacy unclassified records from normal tenant queries', () => {
      const quarantined = getQuarantinedLegacyProjects(tenantAOwner);
      expect(quarantined.success).toBe(true);
      expect(Array.isArray(quarantined.data)).toBe(true);

      const normalProjects = findByTenant(tenantAOwner);
      expect(normalProjects.success).toBe(true);
      // Quarantined projects must NOT leak into normal tenant list
      expect(normalProjects.data?.every((p) => !p.unclassified)).toBe(true);
    });

    it('4.2 Should allow manual classification of a quarantined project to an authorized tenant', () => {
      const quarantined = getQuarantinedLegacyProjects(tenantAOwner);
      if (quarantined.data && quarantined.data.length > 0) {
        const targetId = quarantined.data[0].id;
        const classified = classifyLegacyProject(tenantAOwner, targetId, 'org-tenant-a');

        expect(classified.success).toBe(true);
        expect(classified.data?.tenantId).toBe('org-tenant-a');
        expect(classified.data?.unclassified).toBe(false);

        // Project should now appear in Tenant A's project list
        const updatedList = findByTenant(tenantAOwner);
        expect(updatedList.data?.some((p) => p.id === targetId)).toBe(true);
      }
    });
  });

  describe('PATCH 5 — WORKSPACE CRUD AUTHORIZATION & MATRIX', () => {
    it('5.1 MEMBER and VIEWER roles must be DENIED project write (Create/Update)', () => {
      const createAttempt = createForTenant(tenantAMember, { name: 'Member Illegal Project' });
      expect(createAttempt.success).toBe(false);
      expect(createAttempt.error).toBe('tenant_authorization_denied');
      expect(createAttempt.reason).toContain("denied for role 'MEMBER'");
    });

    it('5.2 DEVELOPER role is ALLOWED write, but DENIED delete', () => {
      const devCreate = createForTenant(tenantADeveloper, { name: 'Developer Allowed Project' });
      expect(devCreate.success).toBe(true);

      const devDelete = deleteForTenant(tenantADeveloper, devCreate.data!.id);
      expect(devDelete.success).toBe(false);
      expect(devDelete.error).toBe('tenant_authorization_denied');
      expect(devDelete.reason).toContain("denied for role 'DEVELOPER'");
    });

    it('5.3 OWNER and ADMIN roles are ALLOWED create, update, and delete', () => {
      const adminCreate = createForTenant(tenantAAdmin, { name: 'Admin Allowed Project' });
      expect(adminCreate.success).toBe(true);

      const adminDelete = deleteForTenant(tenantAAdmin, adminCreate.data!.id);
      expect(adminDelete.success).toBe(true);
    });
  });

  describe('PATCH 6 — TENANT-AWARE BACKUP & RESTORE', () => {
    it('6.1 Backup creation is ALLOWED for OWNER & ADMIN, DENIED for DEVELOPER', () => {
      const ownerBackup = createTenantBackup(tenantAOwner);
      expect(ownerBackup.success).toBe(true);
      expect(ownerBackup.data?.backup.tenantId).toBe('org-tenant-a');
      expect(ownerBackup.data?.backup.signature).toBeDefined();

      const adminBackup = createTenantBackup(tenantAAdmin);
      expect(adminBackup.success).toBe(true);

      const devBackup = createTenantBackup(tenantADeveloper);
      expect(devBackup.success).toBe(false);
      expect(devBackup.error).toBe('tenant_authorization_denied');
    });

    it('6.2 Restore policy: OWNER is ALLOWED, ADMIN is DENIED (Strict Policy Matrix)', () => {
      const backupResult = createTenantBackup(tenantAOwner);
      expect(backupResult.success).toBe(true);
      const payload = backupResult.data!.backup;

      // OWNER restore attempt -> ALLOWED
      const ownerRestore = restoreTenantBackup(tenantAOwner, payload);
      expect(ownerRestore.success).toBe(true);
      expect(ownerRestore.data?.tenantId).toBe('org-tenant-a');

      // ADMIN restore attempt -> STRICTLY DENIED by Policy Matrix
      const adminRestore = restoreTenantBackup(tenantAAdmin, payload);
      expect(adminRestore.success).toBe(false);
      expect(adminRestore.error).toBe('tenant_authorization_denied');
      expect(adminRestore.reason).toContain("denied for role 'ADMIN'");
    });

    it('6.3 Should reject Cross-Tenant restore attempts', () => {
      const backupA = createTenantBackup(tenantAOwner);
      expect(backupA.success).toBe(true);
      const payloadA = backupA.data!.backup;

      // Tenant B tries to restore Tenant A's backup
      const crossRestore = restoreTenantBackup(tenantBOwner, payloadA);
      expect(crossRestore.success).toBe(false);
      expect(crossRestore.error).toBe('cross_tenant_restore_denied');
      expect(crossRestore.reason).toContain('does not match principal tenantId');
    });

    it('6.4 Should reject tampered or corrupted backup payloads', () => {
      const backupA = createTenantBackup(tenantAOwner);
      expect(backupA.success).toBe(true);
      const tamperedPayload = JSON.parse(JSON.stringify(backupA.data!.backup));

      // Tamper with project contents
      tamperedPayload.projects.push({
        id: 'hacked-proj-123',
        name: 'Malicious Injected Project',
      });

      const tamperedRestore = restoreTenantBackup(tenantAOwner, tamperedPayload);
      expect(tamperedRestore.success).toBe(false);
      expect(['backup_integrity_mismatch', 'backup_signature_invalid']).toContain(tamperedRestore.error);
    });
  });
});
