# ZYNTHEOR Incident Operations Runbook

## 1. Primary Operational Procedures

### A. AI Model Provider Outage
1. Detect endpoint failure via `/health/ready` or `/api/diagnostics/smart`.
2. Fallback to local Ollama (external, user-run) (`http://127.0.0.1:11434/v1`).
3. Display `MODEL_UNAVAILABLE` status banner without fabricating responses.

### B. Payment Webhook Failures
1. Query missing webhook transactions in `payment_webhook_events`.
2. Perform bank transfer reconciliation via `/api/billing/reconcile`.
3. Manually trigger payment verification with transaction reference code.
