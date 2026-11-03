# ZYNTHEOR Observability & Monitoring Specification

## 1. Health Probe Endpoints

- `GET /health/live`: Liveness probe. Returns `{ status: 'live', uptimeSeconds, timestamp }`. No sensitive details exposed.
- `GET /health/ready`: Readiness probe. Returns `{ status: 'ready', checks: { serverProcess: 'ok', storage: 'ok', modelStatus } }`.

## 2. Persistent Error & Telemetry Tracking
- **System Error Logging**: Application errors logged via `logSystemError()` and stored persistently in `systemErrors` ORM schema.
- **Audit Ledger**: All user and system actions logged in `auditEvents` with nanosecond precision timestamps and cryptographic SHA-256 hash chaining.
- **GPU & Hardware Telemetry**: `/api/diagnostics/gpu-telemetry` provides system RAM, CPU usage, and hardware readiness metrics.
