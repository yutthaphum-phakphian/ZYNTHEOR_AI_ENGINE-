# PostgreSQL Foundation — P1

## Delivered

The active relational model is `src/db/schema.ts`. Migration `0001_identity_foundation.sql` establishes the first transactional persistence boundary for users, organizations, organization membership, workspaces, and sessions. It adds uniqueness, foreign-key, expiry, and active-session constraints plus tenant lookup indexes. The paired `.down.sql` rolls back only those objects, in dependency-safe order.

`scripts/db-migrate.mjs` applies each migration and records its SHA-256 checksum in `schema_migrations`. It serializes migration runners with a PostgreSQL advisory lock, rejects edited/missing applied migration files, and runs each apply or rollback in a database transaction. Migrations are forward-only after application: edit history is detected as drift; create a new migration instead.

`src/db/connection.ts` uses the actual `pg` pool and Drizzle PostgreSQL driver. There is no in-memory database, mock connection, synthetic query result, or silent fallback. Database imports fail clearly without `DATABASE_URL`. `withTransaction` reserves one PostgreSQL client, commits only after the callback succeeds, and rolls back when it throws. Isolation levels are explicitly bounded to supported values.

## Commands

Configure `DATABASE_URL` in the deployment environment; `.env.example` contains a placeholder only.

```sh
npm run db:migrate   # apply pending SQL migrations
npm run db:rollback  # roll back exactly the latest applied migration
```

Before applying or rolling back against a non-disposable database, take a verified backup and inspect the migration SQL. Rollback of `0001` drops the five tables introduced by that migration and therefore destroys data stored in those tables; it is not a data-preserving downgrade.

## Scope and cutover boundary

P1 alone is a schema/driver foundation, not an identity cutover. The additive P2 source now routes authentication/session/team APIs to PostgreSQL and fails closed when unavailable; it does not silently fall back to JSON. Existing JSON identity, session, organization, and membership files remain preserved as the migration source and are not deleted. P2 import is still blocked by a source owner/membership inconsistency and the absence of a live database endpoint; see [`POSTGRESQL_IDENTITY_P2.md`](POSTGRESQL_IDENTITY_P2.md). No production database was contacted or modified. Existing product entities in `src/db/schema.ts` beyond the identity/tenant baseline remain outside these migrations and need separately reviewed migrations before PostgreSQL use.

The repository also contains an older `database/schema.ts` with a separate projects/snapshots/error-log model. Do not treat that legacy file as the migration source of truth or run its shape against the new identity tables; consolidate that schema in a later reviewed migration task.

## Verification status

- P1 static tests: 4/4 pass (migration constraints, rollback ordering, runner safety invariants, real PostgreSQL-only connection contract).
- `npm run typecheck`: pass.
- `npm run build`: pass; Vite emitted existing Node core-module externalization and large-chunk warnings.
- Live PostgreSQL apply/rollback, transaction behavior against a server, and concurrent migration execution: **not run** because no PostgreSQL endpoint or `DATABASE_URL` was provided. Static tests are not a substitute for integration evidence.
