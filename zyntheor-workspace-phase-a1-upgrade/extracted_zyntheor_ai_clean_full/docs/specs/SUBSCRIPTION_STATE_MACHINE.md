# ZYNTHEOR Subscription State Machine Specification

## 1. State Machine Definitions

The ZYNTHEOR Subscription State Machine governs the full lifecycle of paid and free tenant plans on the server side.

### Supported States

1. **FREE**: Default tier. Basic AI quota (500 requests/mo).
2. **PENDING**: Checkout initiated. Payment is outstanding. **Entitlements remain FREE.**
3. **ACTIVE**: Payment verified by provider. Paid plan entitlements activated.
4. **CANCEL_AT_PERIOD_END**: User initiated cancellation. Active paid access retained until period end date.
5. **PAST_DUE**: Subscription renewal payment failed. Soft warning state.
6. **GRACE_PERIOD**: Temporary 7-day grace period following past due state.
7. **SUSPENDED**: Payment uncollected after grace period. Entitlements revoked.
8. **EXPIRED**: Billing period ended without renewal or canceled. Reverted to `FREE`.

---

## 2. Transition Matrix

```
       +-----> FREE <-----+
       |                  |
       v                  |
    PENDING               |
       |                  |
       v                  |
    ACTIVE ----------> EXPIRED
     |   ^                ^
     |   |                |
     v   +----+           |
CANCEL_AT_    |           |
PERIOD_END    |           |
     |        |           |
     v        |           |
  PAST_DUE ---+           |
     |                    |
     v                    |
GRACE_PERIOD -------------+
     |
     v
 SUSPENDED ---------------/
```

### Transition Enforcement Rules

- `FREE` -> `PENDING`: Initiated via `/api/billing/checkout`.
- `PENDING` -> `ACTIVE`: Granted ONLY upon verified payment via `/api/billing/verify-payment` or webhook.
- `PENDING` -> `FREE` / `EXPIRED`: Abandoned checkout or expired payment intent.
- `ACTIVE` -> `CANCEL_AT_PERIOD_END`: User requests cancellation via `/api/billing/cancel`.
- `ACTIVE` -> `PAST_DUE`: Recurring charge failure event from Stripe / PromptPay.
- `CANCEL_AT_PERIOD_END` -> `ACTIVE`: User reactivates prior to currentPeriodEnd.
- `CANCEL_AT_PERIOD_END` -> `EXPIRED`: Period end timestamp reached. Plan reverts to `FREE`.
- `PAST_DUE` -> `ACTIVE`: Retry payment succeeds.
- `PAST_DUE` -> `GRACE_PERIOD`: System grants 7-day retry window.
- `GRACE_PERIOD` -> `SUSPENDED`: 7 days elapse without payment. Entitlements revoked on backend.
- `SUSPENDED` -> `ACTIVE`: Outstanding invoice settled.

---

## 3. Server-Side Safety Code Rule

```typescript
// CRITICAL: Initiating checkout DOES NOT grant paid entitlements.
if (targetState === 'PENDING') {
  // Plan remains FREE until verified payment event is received
  sub.status = 'PENDING';
  // Entitlement Engine retains FREE quotas
}
```
