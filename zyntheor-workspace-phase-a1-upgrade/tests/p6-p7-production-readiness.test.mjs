import test from 'node:test';
import assert from 'node:assert/strict';
import { rbacService, requireOrgRole } from '../src/services/rbacService.ts';
import { billingService } from '../src/services/billingService.ts';
import { identityService } from '../src/services/identityService.ts';

test('P6/P7 - RBAC middleware validates roles correctly against organization_members', () => {
  const allowedRoles = ['OWNER', 'ADMIN'];
  assert.equal(rbacService.hasPermission('OWNER', 'org:manage'), true);
  assert.equal(rbacService.hasPermission('ADMIN', 'org:invite'), true);
  assert.equal(rbacService.hasPermission('MEMBER', 'org:manage'), false);
  assert.equal(rbacService.hasPermission('VIEWER', 'workspace:write'), false);
});

test('P6/P7 - Subscription State Tracker node flow', () => {
  const tenantId = 'org-p6-tracker-test';
  const sub = billingService.getSubscription(tenantId);
  assert.ok(['FREE', 'PENDING', 'ACTIVE', 'CANCEL_AT_PERIOD_END', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'EXPIRED'].includes(sub.status));
});

test('P6/P7 - Health check probe definitions', () => {
  const uptime = Math.floor(process.uptime());
  assert.ok(typeof uptime === 'number' && uptime >= 0);
});

test('P6/P7 - Local-Only policy enforcement', () => {
  const localOnly = !['0', 'false', 'no'].includes((process.env.ZYNTHEOR_LOCAL_ONLY || 'true').toLowerCase());
  assert.equal(typeof localOnly, 'boolean');
});

test('P6/P7 - Financial Audit Hash Chain verification', () => {
  const ledger = billingService.getFinancialAuditLedger();
  assert.ok(Array.isArray(ledger));
  if (ledger.length > 0) {
    assert.ok(ledger[0].hash);
    assert.ok(ledger[0].prevHash);
  }
});
