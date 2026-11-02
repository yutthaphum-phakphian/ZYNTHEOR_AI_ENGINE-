# Production Security Control Status

This report describes controls verified in the current implementation. A configured control is not evidence that every endpoint has tenant-level authorization.

## Verified controls

- The server binds to loopback by default. `npm start` runs in production mode and refuses startup unless `ZYNTHEOR_ACCESS_TOKEN` is configured.
- Production API routes require that access token, except health checks and `/api/auth/*`. Authentication routes perform their own session checks where required; registration and login remain public and rate-limited.
- New account sessions use random bearer tokens whose SHA-256 hashes, not the bearer tokens, are persisted. Session tokens expire after seven days and can be revoked.
- The development-only default admin seed is not created in production, and the known default credential is rejected there.
- Local-only mode defaults to enabled. External model calls require Local-only mode to be disabled and explicit online consent. Revoking consent blocks later external calls; consent is process-local and resets to false after restart.
- The OAuth register-or-login endpoint returns `503` until trusted provider verification is implemented. Client-supplied OAuth profile claims do not create sessions.
- Billing endpoints return `503` until trusted membership, provider, webhook, and reconciliation contracts are available. No live webhook signature-verification guarantee is claimed.
- JSON request bodies are limited to 1 MB, and security headers are set for API responses.

## Scope and remaining work

- The shared `ZYNTHEOR_ACCESS_TOKEN` is a deployment-wide API gate, not a per-user or per-tenant identity. Tenant membership checks currently apply to the account routes that explicitly perform them; do not infer per-tenant isolation for unrelated APIs.
- The identity store uses JSON files. Passwords currently use PBKDF2-HMAC-SHA-512 with 10,000 iterations; strengthen this with a versioned work factor and a migration before production account rollout.
- Existing local data stores can contain a development-seeded account. Production rejects its known default password; operators should review and rotate local identity data before moving it to production.
- OAuth login, billing, provider webhooks, and bank reconciliation are intentionally unavailable until their trust and verification boundaries are implemented.
- `rbacService.hasPermission` defines the permission matrix, but each endpoint still needs explicit middleware or route-level authorization. The matrix alone is not proof that all routes enforce those permissions.
