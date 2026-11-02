import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { billingService } from '../src/services/billingService.ts';
import { identityService } from '../src/services/identityService.ts';
import { rbacService } from '../src/services/rbacService.ts';
import billingRouter from '../src/routes/billing.ts';

test('P5 - Subscription State Machine initial state', () => {
  const tenantId = 'org-p5-test-01';
  const sub = billingService.getSubscription(tenantId);
  assert.equal(sub.status, 'FREE');
  assert.equal(sub.planId, 'FREE');
});

test('P5 - Subscription transition to PENDING does NOT activate paid entitlements', () => {
  const tenantId = 'org-p5-test-02';
  const checkout = billingService.createCheckout(tenantId, 'PRO', 'promptpay', 'test@zyntheor.local');
  
  assert.equal(checkout.amountThb, 990);
  assert.ok(checkout.qrCodePayload);

  const sub = billingService.getSubscription(tenantId);
  assert.equal(sub.status, 'PENDING');
  
  // Organization plan should still be FREE until payment verification
  const org = identityService.getOrganization(tenantId);
  if (org) {
    assert.equal(org.planId, 'FREE');
  }
});

test('Billing containment - manual approval without provider evidence cannot activate a transaction', () => {
  const tenantId = `org-p5-manual-blocked-${Date.now()}`;
  const checkout = billingService.createCheckout(tenantId, 'PRO', 'stripe', 'pro@zyntheor.local');
  const invoicesBefore = billingService.getTenantInvoices(tenantId).length;

  assert.throws(
    () => billingService.verifyAndApprovePayment(checkout.transaction.id, 'stripe', 'caller-supplied-reference'),
    /PAYMENT_PROVIDER_VERIFICATION_UNAVAILABLE/
  );
  assert.throws(
    () => billingService.transitionSubscriptionState(tenantId, 'ACTIVE', 'PRO', 'stripe', 'test'),
    /PAYMENT_PROVIDER_VERIFICATION_UNAVAILABLE/
  );

  assert.equal(billingService.getSubscription(tenantId).status, 'PENDING');
  assert.equal(checkout.transaction.status, 'pending');
  assert.equal(billingService.getTenantInvoices(tenantId).length, invoicesBefore);
  assert.equal(identityService.getOrganization(tenantId), null);
});

test('P5 - Invalid state transition throws server error', () => {
  const tenantId = 'org-p5-test-04';
  assert.throws(() => {
    // Cannot transition directly from FREE to PAST_DUE
    billingService.transitionSubscriptionState(tenantId, 'PAST_DUE', 'PRO', 'stripe', 'Invalid transition test');
  }, /INVALID SUBSCRIPTION TRANSITION/);
});

test('Billing containment - missing and unverified webhook signatures cannot mutate payments', () => {
  const tenantId = `org-p5-webhook-blocked-${Date.now()}`;
  const checkout = billingService.createCheckout(tenantId, 'PRO', 'stripe', 'webhook@zyntheor.local');
  const rawPayload = JSON.stringify({ type: 'payment_intent.succeeded', transactionId: checkout.transaction.id });
  const headers = { 'x-webhook-id': `wh_evt_${Date.now()}` };

  assert.throws(
    () => billingService.verifyAndProcessWebhook('stripe', rawPayload, '', headers),
    /WEBHOOK_PROVIDER_CONTRACT_UNAVAILABLE/
  );
  assert.throws(
    () => billingService.verifyAndProcessWebhook('stripe', rawPayload, 'mock_sig', headers),
    /WEBHOOK_PROVIDER_CONTRACT_UNAVAILABLE/
  );

  assert.equal(billingService.getSubscription(tenantId).status, 'PENDING');
  assert.equal(checkout.transaction.status, 'pending');
  assert.equal(billingService.getTenantInvoices(tenantId).length, 0);
});

test('Billing containment - bank reconciliation fails without a trusted statement source', () => {
  const tenantId = `org-p5-bank-blocked-${Date.now()}`;
  const checkout = billingService.createCheckout(tenantId, 'TEAM', 'bank_transfer', 'team@zyntheor.local');
  const mismatchedReference = `${checkout.bankReference}-wrong`;

  assert.throws(
    () => billingService.reconcileBankTransfer(mismatchedReference, 3900, 'admin-tester'),
    /BANK_RECONCILIATION_SOURCE_UNAVAILABLE/
  );
  assert.throws(
    () => billingService.reconcileBankTransfer(checkout.bankReference, 3900, 'admin-tester'),
    /BANK_RECONCILIATION_SOURCE_UNAVAILABLE/
  );

  assert.equal(billingService.getSubscription(tenantId).status, 'PENDING');
  assert.equal(checkout.transaction.status, 'pending');
});

test('Billing containment - subscription and invoice reads deny caller-selected tenants', async () => {
  const app = express();
  app.use(express.json());
  app.use(billingRouter);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    for (const path of [
      '/api/billing/subscription?tenantId=org-other-tenant',
      '/api/billing/invoices?tenantId=org-other-tenant',
      '/api/billing/audit',
    ]) {
      const response = await fetch(`${baseUrl}${path}`);
      const body = await response.json();
      assert.equal(response.status, 503);
      assert.equal(body.ok, false);
      assert.equal(body.tenantId, undefined);
      assert.equal(body.subscription, undefined);
      assert.equal(body.invoices, undefined);
    }

    const checkoutResponse = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'org-other-tenant', planId: 'PRO' }),
    });
    assert.equal(checkoutResponse.status, 503);

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook/stripe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'mock_sig',
      },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });
    assert.equal(webhookResponse.status, 503);
    assert.deepEqual(await webhookResponse.json(), {
      ok: false,
      error: 'webhook_provider_contract_unavailable',
    });

    const verificationResponse = await fetch(`${baseUrl}/api/billing/verify-payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transactionId: 'client-selected-transaction' }),
    });
    assert.equal(verificationResponse.status, 503);

    const reconciliationResponse = await fetch(`${baseUrl}/api/billing/reconcile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'caller-supplied-reference', amountThb: 3900 }),
    });
    assert.equal(reconciliationResponse.status, 503);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('P5 - RBAC Role Validation Middleware permissions', () => {
  assert.equal(rbacService.hasPermission('OWNER', 'org:manage'), true);
  assert.equal(rbacService.hasPermission('ADMIN', 'org:invite'), true);
  assert.equal(rbacService.hasPermission('MEMBER', 'org:manage'), false);
  assert.equal(rbacService.hasPermission('VIEWER', 'workspace:write'), false);
});

test('P5 - Financial Audit Hash Chain integrity', () => {
  const ledger = billingService.getFinancialAuditLedger();
  assert.ok(ledger.length > 0);
  assert.ok(ledger[0].hash.length === 64);
});
