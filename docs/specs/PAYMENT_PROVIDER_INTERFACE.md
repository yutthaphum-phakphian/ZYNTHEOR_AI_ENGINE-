# ZYNTHEOR Payment Provider Interface & Adapter Specification

## 1. Provider Abstraction Interface

ZYNTHEOR defines a uniform `PaymentProviderAdapter` interface that abstracts all external payment mechanisms.

```typescript
export interface PaymentProviderAdapter {
  providerId: 'stripe' | 'promptpay' | 'bank_transfer';
  
  createCheckoutSession(params: {
    tenantId: string;
    planId: string;
    amountThb: number;
    email: string;
  }): Promise<{ checkoutId: string; checkoutUrl: string; qrPayload?: string }>;

  verifyWebhookSignature(
    rawPayload: string,
    signature: string,
    secret: string
  ): boolean;

  processPaymentEvent(
    eventPayload: Record<string, unknown>
  ): Promise<{ transactionId: string; verified: boolean }>;

  refundTransaction(
    transactionId: string,
    reason: string
  ): Promise<{ refundId: string; status: 'processed' | 'pending' }>;
}
```

---

## 2. Provider Adapters Implementation

### A. Stripe Adapter
- **Mechanisms**: Stripe Checkout Sessions, Payment Intents API, Webhook Signature Verification (`stripe-signature` header with HMAC SHA-256).
- **Events Processed**: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`.

### B. PromptPay QR Adapter
- **Mechanisms**: Standard EMVCo PromptPay QR payload generation (Payload Format Indicator `000201`, Point of Initiation `010212`, Thai Baht `5303764`, Amount).
- **Callback Verification**: Signed webhooks / callback verification for instant payment notifications.

### C. Bank Transfer Reconciliation Adapter
- **Mechanisms**: Unique reference code generator (`ZYN-[TENANT_HASH]-[TIMESTAMP]`), transaction matching engine, duplicate transfer protection.
- **Audit Verification**: Admin / Owner reconciliation dashboard (`/api/billing/reconcile`) for manual & automated bank statement matching.
