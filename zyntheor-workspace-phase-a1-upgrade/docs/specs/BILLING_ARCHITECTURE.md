# ZYNTHEOR P5 — Billing Architecture & Platform Specification

## 1. System Overview

ZYNTHEOR P5 implements a provider-independent, secure, and auditable subscription and billing platform for the ZYNTHEOR AI Engine.

```
+-----------------------------------------------------------------------+
|                       ZYNTHEOR CLIENT FRONTEND                        |
|   (Plan Selection, PromptPay QR, Stripe Checkout, Bank Transfer, Inv)  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    SUBSCRIPTION & BILLING ENGINE                      |
|                  (State Machine & Lifecycle Manager)                  |
+-----------------------------------------------------------------------+
                                   |
        +--------------------------+--------------------------+
        |                          |                          |
        v                          v                          v
+---------------+          +---------------+          +---------------+
| Stripe        |          | PromptPay     |          | Bank Transfer |
| Adapter       |          | Adapter       |          | Reconciliation|
+---------------+          +---------------+          +---------------+
        |                          |                          |
        +--------------------------+--------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                     ENTITLEMENT ENGINE INTEGRATION                    |
|             (Quota Allocation, Plan Upgrade/Downgrade Sync)          |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                      FINANCIAL AUDIT LEDGER                           |
|        (Cryptographic Hash Chain, Immutable Invoices & Receipts)      |
+-----------------------------------------------------------------------+
```

## 2. Core Architectural Guarantees

1. **Server-Side Authority**: Frontend user interface elements can never grant paid entitlements. All state transitions, plan upgrades, and entitlement expansions are strictly verified and executed on the backend after validated payment events.
2. **Provider Isolation**: The core subscription engine is decoupled from payment providers via a standard adapter pattern (`PaymentProviderAdapter`). Stripe, PromptPay, and Bank Transfer operate as interchangeable payment mechanisms.
3. **Local-First & Safety Coexistence**: External payment gateways operate under strict local-only policy enforcement. When `ZYNTHEOR_LOCAL_ONLY=true`, external calls require explicit consent while local sandbox workflows remain intact.
4. **Idempotency & Replay Protection**: Webhook events are tracked by unique provider event IDs (`payment_webhook_events`) to prevent duplicate credit allocation or replay attacks.
5. **Financial Auditability**: All monetary operations append cryptographic hash chain records into `financial_audit_ledger.json` and Drizzle schema entities.

## 3. Data Storage & Entity Schema

- `subscriptions`: Primary record of tenant subscription state, plan ID, billing period, and cancellation status.
- `subscription_events`: Immutable transition log of all state machine changes.
- `payment_transactions`: Transaction records detailing payment amount (THB), provider, status (`pending`, `verified`, `failed`), and transaction reference.
- `payment_webhook_events`: Idempotency tracking table storing raw webhook payloads, signature verification results, and processing timestamps.
- `invoices`: Formatted invoice records (`INV-2026-XXXX`), paid status, receipt URLs, and breakdown items.
- `reconciliation_records`: Matching records for Bank Transfer and PromptPay reference reconciliation.
