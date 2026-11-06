# ZYNTHEOR AI ENGINE — PHASE 7 API CONTRACT REPORT

**Version**: 1.3.1
**Status**: `VERIFIED_CONTRACTS`
**Timestamp**: 2026-11-06

---

## Key API Endpoints & Contracts

| Endpoint | Method | Input Schema | Output Schema | Security Control |
| :--- | :--- | :--- | :--- | :--- |
| `/api/intelligence/run` | `POST` | `ZyntheorIntelligenceRequest` | `ZyntheorIntelligenceResponse` | Workspace Isolation & Rate Limit |
| `/api/intelligence/orchestrate` | `POST` | `{ query, workspaceId, model }` | `{ status, finalAnswer, audit }` | Model Sovereignty Policy |
| `/api/native-model/status` | `GET` | N/A | Checkpoint & probe metadata | Local CPU / Enclave Guard |
| `/api/system/integrity` | `GET` | N/A | Canonical SSoT drift report | Fail-Closed Read-Only Mode |
| `/api/audit/qr-verify` | `GET` | `{ merkle_root, block }` | Court-ready admissibility status | Post-Quantum Cryptography |
