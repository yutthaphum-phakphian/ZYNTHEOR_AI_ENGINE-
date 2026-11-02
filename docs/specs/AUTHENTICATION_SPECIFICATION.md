# ZYNTHEOR AI ENGINE — AUTHENTICATION SPECIFICATION

## 1. Password Security & Hashing Algorithm
- **Algorithm:** PBKDF2 with SHA-512 digest.
- **Iterations:** 10,000 iterations.
- **Salt Generation:** Cryptographically secure 16-byte random salt (`crypto.randomBytes(16)`).
- **Comparison:** Timing-safe buffer equality (`crypto.timingSafeEqual`) to mitigate side-channel timing attacks.
- **Anti-Enumeration:** Generic authentication failure message (`Invalid email or password credentials`) returned regardless of whether the email exists.

## 2. Session Lifecycle & Token Management
- **Token Format:** Cryptographic Bearer string prefixed with `zyntheor_sess_`.
- **Token Hashing:** Stored as a SHA-256 digest in `workspace_data/identity/sessions.json`.
- **Session Duration:** 7 days from issue date.
- **Revocation:** Explicit session revocation via `POST /api/auth/logout` sets `revokedAt` timestamp. Revoked sessions are immediately invalidated.

## 3. Endpoints & REST Interface
- `POST /api/auth/register`: Creates new user, default organization, and active session.
- `POST /api/auth/login`: Authenticates user credentials and issues session token.
- `POST /api/auth/logout`: Revokes active session.
- `GET /api/auth/me`: Returns verified identity, organization details, and usage summary.
