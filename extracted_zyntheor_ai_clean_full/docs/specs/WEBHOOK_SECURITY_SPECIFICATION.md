# ZYNTHEOR Webhook Security & Idempotency Specification

## 1. Security Requirements

All incoming payment webhooks (`/api/billing/webhook/:provider`) must satisfy 5 strict security controls before any state modification is attempted.

### 1. Cryptographic Signature Check
Every incoming webhook signature is validated against the provider secret (`STRIPE_WEBHOOK_SECRET` or `PROMPTPAY_WEBHOOK_SECRET`) using HMAC-SHA256:
```typescript
const computedSig = createHmac('sha256', secret).update(rawPayload).digest('hex');
if (computedSig !== expectedSig) {
  throw new Error('WEBHOOK SIGNATURE MISMATCH');
}
```

### 2. Strict Idempotency Enforcement
To prevent double-crediting or duplicate subscription upgrades, incoming event IDs are checked against `payment_webhook_events`:
- If event ID exists and `processed === true`: Return `200 OK` with `{ duplicate: true, message: 'Event already processed' }`. No database mutation is triggered.
- If event ID is new: Persist record, set `processed = true`, and execute transaction.

### 3. Timestamp Validation & Replay Defense
Webhooks older than 300 seconds (5 minutes) relative to server time are rejected to prevent replay attacks.

### 4. No Client-Submitted Payment Verification
Client requests cannot supply `status: 'paid'` in query string or body parameters to self-approve. The backend MUST query the payment provider's API or verify the signed webhook payload.

### 5. Sensitive Data Sanitization
Raw credit card numbers, CVV, or authentication tokens are never logged in system error tables or audit trails.
