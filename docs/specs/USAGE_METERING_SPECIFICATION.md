# ZYNTHEOR AI ENGINE — USAGE METERING SPECIFICATION

## 1. Metering Engine Overview (`src/services/usageMetering.ts`)

The Usage Metering Service records AI consumption events authoritatively on the backend for audit and billing readiness.

## 2. Idempotency Guarantee
- Every usage event requires an `idempotencyKey` (e.g. `req-chat-session123-step1`).
- Re-transmitting or retrying a request with an existing `idempotencyKey` returns the existing usage record without double-counting metrics.

## 3. Measured Metrics
- `ai_requests`: Count of completed inference calls.
- `input_tokens`: Estimated / provider-reported prompt token length.
- `output_tokens`: Estimated / provider-reported generated token length.
- `tool_execution`: Count of tool gateway execution runs.
