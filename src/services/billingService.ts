import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { identityService } from './identityService.ts';
import { entitlementEngine, SUBSCRIPTION_PLANS, type SubscriptionPlanId } from './entitlementEngine.ts';
import { usageMeteringService } from './usageMetering.ts';

export type SubscriptionState =
  | 'FREE'
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCEL_AT_PERIOD_END'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'EXPIRED';

export type PaymentProviderType = 'stripe' | 'promptpay' | 'bank_transfer';

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionState;
  provider: PaymentProviderType;
  providerSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEventRecord {
  id: string;
  subscriptionId: string;
  tenantId: string;
  fromState: SubscriptionState;
  toState: SubscriptionState;
  reason: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  tenantId: string;
  amount: number; // in THB
  currency: string;
  provider: PaymentProviderType;
  providerTransactionId?: string;
  status: 'pending' | 'verified' | 'failed' | 'refunded';
  paymentMethodDetails?: Record<string, unknown>;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  paidAt?: string;
  receiptUrl?: string;
  items: Array<{ description: string; amount: number }>;
  createdAt: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: PaymentProviderType;
  eventType: string;
  processed: boolean;
  signatureVerified: boolean;
  payload: Record<string, unknown>;
  error?: string;
  receivedAt: string;
}

export interface ReconciliationRecord {
  id: string;
  provider: PaymentProviderType;
  reference: string;
  amount: number;
  matched: boolean;
  matchedTransactionId?: string;
  reconciledBy?: string;
  reconciledAt: string;
}

export interface FinancialAuditEntry {
  id: string;
  tenantId: string;
  eventType: string;
  detail: string;
  amount?: number;
  prevHash: string;
  hash: string;
  timestamp: string;
}

const STORAGE_DIR = path.resolve(process.cwd(), 'workspace_data/billing');

function ensureStorageDir() {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function loadJsonFile<T>(filename: string, fallback: T): T {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, filename);
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJsonFile(filename: string, data: unknown): void {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, filename);
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  writeFileSync(filePath, readFileSync(tmpPath, 'utf8'), 'utf8');
}

// Allowed State Machine Transitions
const VALID_STATE_TRANSITIONS: Record<SubscriptionState, Set<SubscriptionState>> = {
  FREE: new Set(['PENDING', 'ACTIVE']),
  PENDING: new Set(['ACTIVE', 'FREE', 'EXPIRED']),
  ACTIVE: new Set(['CANCEL_AT_PERIOD_END', 'PAST_DUE', 'ACTIVE', 'SUSPENDED', 'PENDING']),
  CANCEL_AT_PERIOD_END: new Set(['ACTIVE', 'EXPIRED', 'PENDING']),
  PAST_DUE: new Set(['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'EXPIRED', 'PENDING']),
  GRACE_PERIOD: new Set(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING']),
  SUSPENDED: new Set(['ACTIVE', 'EXPIRED', 'PENDING']),
  EXPIRED: new Set(['FREE', 'PENDING', 'ACTIVE']),
};

export class BillingService {
  private subscriptions: SubscriptionRecord[];
  private events: SubscriptionEventRecord[];
  private transactions: PaymentTransactionRecord[];
  private invoicesList: InvoiceRecord[];
  private webhooks: WebhookEventRecord[];
  private reconciliations: ReconciliationRecord[];
  private financialAudit: FinancialAuditEntry[];

  constructor() {
    this.subscriptions = loadJsonFile<SubscriptionRecord[]>('subscriptions.json', []);
    this.events = loadJsonFile<SubscriptionEventRecord[]>('subscription_events.json', []);
    this.transactions = loadJsonFile<PaymentTransactionRecord[]>('payment_transactions.json', []);
    this.invoicesList = loadJsonFile<InvoiceRecord[]>('invoices.json', []);
    this.webhooks = loadJsonFile<WebhookEventRecord[]>('payment_webhook_events.json', []);
    this.reconciliations = loadJsonFile<ReconciliationRecord[]>('reconciliation_records.json', []);
    this.financialAudit = loadJsonFile<FinancialAuditEntry[]>('financial_audit_ledger.json', []);
  }

  private persist() {
    saveJsonFile('subscriptions.json', this.subscriptions);
    saveJsonFile('subscription_events.json', this.events);
    saveJsonFile('payment_transactions.json', this.transactions);
    saveJsonFile('invoices.json', this.invoicesList);
    saveJsonFile('payment_webhook_events.json', this.webhooks);
    saveJsonFile('reconciliation_records.json', this.reconciliations);
    saveJsonFile('financial_audit_ledger.json', this.financialAudit);
  }

  private recordFinancialAudit(tenantId: string, eventType: string, detail: string, amount?: number): FinancialAuditEntry {
    const prevHash = this.financialAudit.length > 0 ? this.financialAudit[0].hash : 'GENESIS_FINANCIAL';
    const timestamp = new Date().toISOString();
    const id = `fin-${crypto.randomUUID()}`;
    const payload = `${id}|${tenantId}|${eventType}|${detail}|${amount || 0}|${prevHash}|${timestamp}`;
    const hash = createHash('sha256').update(payload).digest('hex');

    const entry: FinancialAuditEntry = {
      id,
      tenantId,
      eventType,
      detail,
      amount,
      prevHash,
      hash,
      timestamp,
    };

    this.financialAudit.unshift(entry);
    return entry;
  }

  // --- 1. Subscription Lifecycle State Machine ---

  public getSubscription(tenantId: string): SubscriptionRecord {
    let sub = this.subscriptions.find(s => s.tenantId === tenantId);
    if (!sub) {
      const now = new Date();
      sub = {
        id: `sub-${tenantId}`,
        tenantId,
        planId: 'FREE',
        status: 'FREE',
        provider: 'stripe',
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: new Date(now.getTime() + 365 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.subscriptions.push(sub);
      this.persist();
    }
    return sub;
  }

  public transitionSubscriptionState(
    tenantId: string,
    targetState: SubscriptionState,
    targetPlanId: SubscriptionPlanId,
    provider: PaymentProviderType,
    reason: string,
    actorId = 'system',
    metadata?: Record<string, unknown>
  ): { subscription: SubscriptionRecord; event: SubscriptionEventRecord } {
    if (targetState === 'ACTIVE') {
      throw new Error('PAYMENT_PROVIDER_VERIFICATION_UNAVAILABLE');
    }

    const sub = this.getSubscription(tenantId);
    const currentState = sub.status;

    // Check valid transition rule
    if (currentState !== targetState && !VALID_STATE_TRANSITIONS[currentState]?.has(targetState)) {
      throw new Error(`INVALID SUBSCRIPTION TRANSITION: Cannot transition from '${currentState}' to '${targetState}'`);
    }

    const now = new Date();
    sub.status = targetState;
    sub.planId = targetPlanId;
    sub.provider = provider;
    sub.updatedAt = now.toISOString();

    if (targetState === 'CANCEL_AT_PERIOD_END') {
      sub.cancelAtPeriodEnd = true;
      sub.canceledAt = now.toISOString();
    } else if (targetState === 'EXPIRED' || targetState === 'SUSPENDED') {
      sub.endedAt = now.toISOString();
      const org = identityService.getOrganization(tenantId);
      if (org) org.planId = 'FREE'; // Revert to Free plan upon expiration
    }

    const event: SubscriptionEventRecord = {
      id: `evt-sub-${crypto.randomUUID()}`,
      subscriptionId: sub.id,
      tenantId,
      fromState: currentState,
      toState: targetState,
      reason,
      actorId,
      metadata,
      createdAt: now.toISOString(),
    };

    this.events.unshift(event);
    this.recordFinancialAudit(tenantId, 'SUBSCRIPTION_STATE_CHANGED', `Transitioned from ${currentState} to ${targetState} (${reason})`);
    this.persist();

    return { subscription: sub, event };
  }

  // --- 2. Billing Provider Operations & Checkouts ---

  public createCheckout(
    tenantId: string,
    planId: SubscriptionPlanId,
    provider: PaymentProviderType,
    customerEmail: string
  ): {
    checkoutId: string;
    checkoutUrl: string;
    qrCodePayload?: string;
    bankReference?: string;
    amountThb: number;
    transaction: PaymentTransactionRecord;
  } {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error(`Invalid plan ID: ${planId}`);

    const amountThb = planId === 'PRO' ? 990 : planId === 'TEAM' ? 3900 : planId === 'ENTERPRISE' ? 19900 : 0;
    const checkoutId = `chk_${provider}_${Date.now().toString(36)}`;

    // Transition subscription to PENDING (Does NOT activate paid plan yet!)
    this.transitionSubscriptionState(tenantId, 'PENDING', planId, provider, `Checkout initiated for ${plan.name}`, tenantId);

    const tx: PaymentTransactionRecord = {
      id: `tx_${Date.now().toString(36)}`,
      tenantId,
      amount: amountThb,
      currency: 'THB',
      provider,
      providerTransactionId: checkoutId,
      status: 'pending',
      paymentMethodDetails: { planId, customerEmail },
      createdAt: new Date().toISOString(),
    };
    this.transactions.unshift(tx);

    let checkoutUrl = '';
    let qrCodePayload: string | undefined = undefined;
    let bankReference: string | undefined = undefined;

    if (provider === 'stripe') {
      checkoutUrl = `https://checkout.stripe.com/pay/${checkoutId}`;
    } else if (provider === 'promptpay') {
      // Standard PromptPay EMVCo Payload simulation
      qrCodePayload = `00020101021229370016A000000677010111021308112345678905303764540${amountThb}.005802TH5916ZYNTHEOR ENGINE6007BANGKOK6304`;
      checkoutUrl = `/checkout/promptpay?tx=${tx.id}&payload=${encodeURIComponent(qrCodePayload)}`;
    } else if (provider === 'bank_transfer') {
      bankReference = `ZYN-${tenantId.slice(-6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      checkoutUrl = `/checkout/bank-transfer?tx=${tx.id}&ref=${bankReference}`;
    }

    this.recordFinancialAudit(tenantId, 'CHECKOUT_CREATED', `Initiated ${provider} checkout for ${planId} (${amountThb} THB)`, amountThb);
    this.persist();

    return { checkoutId, checkoutUrl, qrCodePayload, bankReference, amountThb, transaction: tx };
  }

  public verifyAndApprovePayment(
    _transactionId: string,
    _provider: PaymentProviderType,
    _providerRef?: string
  ): { transaction: PaymentTransactionRecord; subscription: SubscriptionRecord; invoice: InvoiceRecord } {
    throw new Error('PAYMENT_PROVIDER_VERIFICATION_UNAVAILABLE');
  }

  // --- 3. Webhook Security & Processing ---

  public verifyAndProcessWebhook(
    _provider: PaymentProviderType,
    _rawPayload: string,
    _signature: string,
    _headers: Record<string, string>
  ): { ok: boolean; eventId: string; duplicate: boolean; message: string } {
    throw new Error('WEBHOOK_PROVIDER_CONTRACT_UNAVAILABLE');
  }

  // --- 4. Bank Transfer Reconciliation ---

  public reconcileBankTransfer(
    _reference: string,
    _amountThb: number,
    _reconciledBy: string
  ): { matched: boolean; transaction?: PaymentTransactionRecord } {
    throw new Error('BANK_RECONCILIATION_SOURCE_UNAVAILABLE');
  }

  // --- 5. Invoices & Receipts ---

  private generateInvoice(tx: PaymentTransactionRecord): InvoiceRecord {
    const invoiceNum = `INV-2026-${String(this.invoicesList.length + 1).padStart(4, '0')}`;
    const invoice: InvoiceRecord = {
      id: `inv_${Date.now().toString(36)}`,
      invoiceNumber: invoiceNum,
      tenantId: tx.tenantId,
      subscriptionId: `sub-${tx.tenantId}`,
      amount: tx.amount,
      currency: tx.currency,
      status: 'paid',
      paidAt: new Date().toISOString(),
      receiptUrl: `/invoices/${invoiceNum}/receipt.pdf`,
      items: [
        {
          description: `ZYNTHEOR AI ENGINE Subscription (${tx.paymentMethodDetails?.planId || 'PRO'})`,
          amount: tx.amount,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    this.invoicesList.unshift(invoice);
    return invoice;
  }

  public getTenantInvoices(tenantId: string): InvoiceRecord[] {
    return this.invoicesList.filter(i => i.tenantId === tenantId);
  }

  public getFinancialAuditLedger(): FinancialAuditEntry[] {
    return this.financialAudit;
  }
}

export const billingService = new BillingService();
