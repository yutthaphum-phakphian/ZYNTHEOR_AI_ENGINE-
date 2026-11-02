# ZYNTHEOR Incident Response Plan & Runbook

## 1. Incident Severity Matrix

| Severity | Definition | Target Resolution Time | Escalation Path |
| --- | --- | --- | --- |
| **SEV-1 (Critical)** | System outage, database corruption, or security exposure. | < 30 minutes | Lead Engineer + Security Officer |
| **SEV-2 (High)** | Payment webhook failure, AI model inference outage. | < 2 hours | Backend Engineer |
| **SEV-3 (Medium)** | UI glitch or non-blocking rate limit. | < 24 hours | Product Maintenance |

---

## 2. Emergency Recovery Runbooks

### Runbook A: Webhook Signature Verification Failures
1. Check `STRIPE_WEBHOOK_SECRET` and `PROMPTPAY_WEBHOOK_SECRET` in environment variables.
2. Inspect `payment_webhook_events` error logs via `/api/diagnostics/errors`.
3. Re-verify webhook HMAC calculation in `billingService.verifyAndProcessWebhook`.

### Runbook B: Authentication or Role Privilege Failure
1. Inspect `organization_members.json` for tenant mapping.
2. Check `ZYNTHEOR_ACCESS_TOKEN` configuration.
3. Review audit log entries for `ACCESS_DENIED`.
