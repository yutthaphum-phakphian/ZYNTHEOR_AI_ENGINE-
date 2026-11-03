import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTenantProjects,
  saveTenantProject,
  deleteTenantProject,
  getQuarantinedLegacyProjects,
} from '../src/services/tenantScopedStorage.ts';

describe('Patch 3: Tenant Persistence Foundation Regression Suite', () => {
  const principalTenantAlpha = {
    id: 'usr-alpha-101',
    role: 'admin',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'org-tenant-alpha',
    accountRole: 'OWNER',
  };

  const principalTenantBeta = {
    id: 'usr-beta-202',
    role: 'admin',
    isTokenVerified: true,
    source: 'verified_token',
    tenantId: 'org-tenant-beta',
    accountRole: 'OWNER',
  };

  const unverifiedPrincipal = {
    id: 'unverified-user',
    role: 'viewer',
    isTokenVerified: false,
    source: 'unverified',
  };

  test('1. Direct service invocation without verified principal is DENIED (Deny by default)', () => {
    const resNull = getTenantProjects(null);
    assert.equal(resNull.success, false);
    assert.equal(resNull.error, 'tenant_authorization_denied');

    const resUnverified = getTenantProjects(unverifiedPrincipal);
    assert.equal(resUnverified.success, false);
    assert.equal(resUnverified.error, 'tenant_authorization_denied');
  });

  test('2. Tenant Isolation: Project saved under Tenant Alpha is isolated from Tenant Beta', () => {
    const projectName = `Alpha Project ${Date.now()}`;
    const saveRes = saveTenantProject(principalTenantAlpha, {
      name: projectName,
      description: 'Alpha Tenant Isolated Workspace',
    });

    assert.equal(saveRes.success, true);
    assert.ok(saveRes.data);
    assert.equal(saveRes.data.tenantId, 'org-tenant-alpha');

    // Tenant Alpha can list its project
    const listAlpha = getTenantProjects(principalTenantAlpha);
    assert.equal(listAlpha.success, true);
    const foundInAlpha = listAlpha.data.find((p) => p.id === saveRes.data.id);
    assert.ok(foundInAlpha, 'Project must exist in Tenant Alpha listing');

    // Tenant Beta listing DOES NOT contain Tenant Alpha project
    const listBeta = getTenantProjects(principalTenantBeta);
    assert.equal(listBeta.success, true);
    const foundInBeta = listBeta.data.find((p) => p.id === saveRes.data.id);
    assert.equal(foundInBeta, undefined, 'Tenant Beta MUST NOT see Tenant Alpha project');
  });

  test('3. Cross-Tenant Write Denial: Principal from Tenant Beta cannot write to Tenant Alpha scope', () => {
    const crossWriteRes = saveTenantProject(
      principalTenantBeta,
      { name: 'Spoofed Cross-Tenant Project' },
      'org-tenant-alpha' // Attempting to target Tenant Alpha scope
    );

    assert.equal(crossWriteRes.success, false);
    assert.equal(crossWriteRes.error, 'tenant_authorization_denied');
    assert.match(crossWriteRes.reason, /Tenant mismatch/i);
  });

  test('4. Cross-Tenant Delete Denial: Principal from Tenant Beta cannot delete Tenant Alpha project', () => {
    // Save project under Tenant Alpha
    const saveRes = saveTenantProject(principalTenantAlpha, {
      name: `Target Delete ${Date.now()}`,
    });
    assert.equal(saveRes.success, true);
    const targetId = saveRes.data.id;

    // Tenant Beta attempts to delete Tenant Alpha's project
    const deleteRes = deleteTenantProject(principalTenantBeta, targetId);
    assert.equal(deleteRes.success, false);
    assert.equal(deleteRes.error, 'project_not_found');
  });

  test('5. Zero Client Trust: Forged tenantId in request body is strictly OVERRIDDEN by principal.tenantId', () => {
    const forgedInput = {
      name: 'Forged Body Project',
      tenantId: 'org-tenant-malicious-target', // Attempted forge in payload
    };

    const saveRes = saveTenantProject(principalTenantAlpha, forgedInput);
    assert.equal(saveRes.success, true);
    assert.equal(
      saveRes.data.tenantId,
      'org-tenant-alpha',
      'Saved tenantId must match principal.tenantId, not forged input'
    );
  });

  test('6. Quarantined Legacy Records: Unclassified projects are isolated', () => {
    const quarantineRes = getQuarantinedLegacyProjects(principalTenantAlpha);
    assert.equal(quarantineRes.success, true);
    assert.ok(Array.isArray(quarantineRes.data));
  });
});
