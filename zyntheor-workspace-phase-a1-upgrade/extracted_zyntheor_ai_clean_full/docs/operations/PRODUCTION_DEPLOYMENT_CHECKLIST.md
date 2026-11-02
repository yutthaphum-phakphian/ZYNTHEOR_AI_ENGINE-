# ZYNTHEOR Production Deployment Checklist

- [x] Environment variables populated in `.env` (`HOST=0.0.0.0`, `PORT=3000`, `ZYNTHEOR_LOCAL_ONLY=true`).
- [x] Production build passes cleanly with zero TypeScript errors (`npm run build`).
- [x] Production Health Endpoints `/health/live` and `/health/ready` operational.
- [x] Server session role verification middleware (`serverSessionMiddleware`) active.
- [x] RBAC permission checks enforced against `organization_members`.
- [x] Payment webhook HMAC-SHA256 signature verification enabled.
- [x] Payment idempotency check via `payment_webhook_events` operational.
- [x] Financial audit SHA-256 hash chaining active in `financial_audit_ledger.json`.
- [x] Automated backup snapshot system active in `workspace_data/backups/`.
- [x] All unit and integration test suites pass 100%.
