# Clean Rebuild — Scope and Verification Notes

## Purpose
This folder is a fresh implementation boundary. The supplied legacy archive was inspected for its package/runtime shape; its source, history and evidence values were not copied into this new app. The old ZIP must remain available separately for read-only evidence review.

## Implemented in this starter
- Responsive React UI for Chat, Projects, Plans, Files, Models, Audit Ledger, Diagnostics and Settings.
- Express API for health, settings, model listing, chat completions, fixed-prompt inference diagnostics and in-memory server events.
- OpenAI-compatible model endpoint integration, intended for Ollama's `/v1` endpoint or a configured compatible service.
- Local-only default and explicit consent gate before calling a non-loopback endpoint.
- A local PWA manifest and shell cache.
- Browser-local persistence for chat, projects, plans and local audit event fingerprints.
- Source guardrails covering policy, request limits, loopback binding, secret handling and truthful inference reporting.
- A bounded live inference diagnostic endpoint that reports response presence, latency and whether the expected test marker matched.

## Not implemented / not claimed
- A trained ZYNTHEOR CORE checkpoint or independent model weights.
- Durable account/database sync, multi-user access control, server-side project/file store, repository mutation, shell execution, or AI-driven code changes.
- A tamper-proof/WORM ledger, signatures, HSM/KMS, formal evidence certification, legal compliance, or ISO certification.
- Verified production deployment or successful full build/integration test in this environment. Package installation was blocked by registry DNS failure (`EAI_AGAIN`), so runtime tests must be run after `npm install` on a connected environment.

## Trust rules
- UNKNOWN is not PASS.
- UI presence is not proof that a model is reachable.
- A server health response is not proof that inference works.
- SHA-256 of an event proves the digest for the supplied bytes only; it does not prove truth, identity, authorization, or immutability.
- Do not import old Genesis Anchors, Merkle roots, runtime digests, or legacy evidence as new values. Revalidate source records independently before migration.
