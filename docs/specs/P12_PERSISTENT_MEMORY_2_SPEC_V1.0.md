# P12 — Persistent Memory 2.0 Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P12

## 1. Objective

Provide durable, tenant-isolated, transactional memory with provenance, lifecycle, retrieval controls, and deletion semantics.

## 2. Existing components to reuse

Audit `src/server/MemoryManager.ts`, `src/services/VectorMemory.ts`, `src/services/taskMemory.ts`, database schema/migrations, and workspace memory services. Existing local JSON plus PostgreSQL dual-write/fallback behavior must be reconciled before adding a new store.

## 3. Scope

- Canonical PostgreSQL persistence with ACID transactions and idempotent writes.
- Tenant/workspace isolation enforced in queries and database constraints or row-level security.
- Memory classes: episodic, semantic, procedural, project, and task memory.
- Hybrid retrieval (keyword/vector/graph) with provenance and freshness.
- Retention, export, deletion, legal hold, and migration from legacy JSON.
- Explicit separation of retrieval memory from training datasets.

## 4. Mandatory architecture and security contracts

- Database unavailability must follow an explicit policy; no silent split-brain between JSON and PostgreSQL.
- Use transaction boundaries and unique idempotency keys.
- Every memory record stores tenant/workspace, provenance, source digest, confidence, and timestamps.
- Sensitive values are redacted or excluded before persistence and embedding.
- Deletion propagates to indexes, caches, and derived records according to policy.

## 5. Required verification

- Cross-tenant read/write isolation.
- Concurrent duplicate writes and transaction rollback.
- DB unavailable/failover behavior.
- Migration idempotency and count/hash reconciliation.
- Retention/deletion across SQL, vector index, and caches.
- Secret and prompt-injection sanitization.

## 6. Exit criteria

- Single source of truth is documented and enforced.
- No unscoped memory query remains in critical paths.
- Migration is reversible and data reconciliation is evidenced.
- Training-data consent boundary is tested.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
