/**
 * ZYNTHEOR LEVEL 4 — POSTGRESQL INFRASTRUCTURE (P13.1)
 * Fail-Closed Database Client with Drizzle ORM, Tenant Context & Health Verification
 */

import * as schema from './schema.ts';

export interface DbStatus {
  connected: boolean;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'CONNECTION_ERROR';
  urlConfigured: boolean;
  message: string;
}

export interface DbHealthResult {
  status: 'HEALTHY' | 'UNHEALTHY' | 'NOT_CONFIGURED';
  latencyMs?: number;
  error?: string;
}

const DATABASE_URL = process.env.DATABASE_URL || '';

export function getDatabaseStatus(): DbStatus {
  if (!DATABASE_URL) {
    return {
      connected: false,
      status: 'NOT_CONFIGURED',
      urlConfigured: false,
      message: 'DATABASE_URL is not configured in environment variables. Local file storage is active.',
    };
  }
  return {
    connected: true,
    status: 'CONNECTED',
    urlConfigured: true,
    message: 'DATABASE_URL is configured.',
  };
}

let dbClient: any = null;
let poolClient: any = null;

try {
  if (DATABASE_URL && typeof window === 'undefined') {
    const pgPackage = 'pg';
    const drizzlePgPackage = 'drizzle-orm/node-postgres';
    const { drizzle } = await import(/* @vite-ignore */ drizzlePgPackage);
    const { Pool } = await import(/* @vite-ignore */ pgPackage);
    poolClient = new Pool({ connectionString: DATABASE_URL, max: 10, idleTimeoutMillis: 20000 });
    dbClient = drizzle(poolClient, { schema });
  }
} catch (err: any) {
  console.warn('[ZYNTHEOR DB] PostgreSQL connection unavailable, running in fail-closed mode:', err?.message || err);
}

// Fail-closed proxy: if accessed when unconfigured, throws explicit error rather than executing unverified queries
export const db = new Proxy(dbClient || {}, {
  get: (target, prop) => {
    if (target && prop in target) {
      return target[prop];
    }
    return () => {
      throw new Error(
        'DATABASE_UNAVAILABLE: PostgreSQL is not connected. Configure DATABASE_URL or provision Cloud SQL.'
      );
    };
  },
});

/**
 * Executes an operation within a strict PostgreSQL Tenant Context using RLS session variables.
 * Sets `app.current_org_id` and `app.current_workspace_id` within a transaction.
 */
export async function withTenantContext<T>(
  orgId: string,
  workspaceId: string,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  if (!dbClient || !poolClient) {
    throw new Error('DATABASE_UNAVAILABLE: Cannot set tenant context without active PostgreSQL connection.');
  }

  const client = await poolClient.connect();
  try {
    await client.query('BEGIN');
    // Set RLS tenant variables for this specific transaction
    await client.query(`SET LOCAL app.current_org_id = $1`, [orgId]);
    await client.query(`SET LOCAL app.current_workspace_id = $1`, [workspaceId]);

    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check verifying database connectivity and query latency.
 * Complies with Zero-Mock: reports UNHEALTHY or NOT_CONFIGURED when offline.
 */
export async function checkDbHealth(): Promise<DbHealthResult> {
  if (!DATABASE_URL || !poolClient) {
    return {
      status: 'NOT_CONFIGURED',
      error: 'DATABASE_URL is not set',
    };
  }

  const start = Date.now();
  try {
    const res = await poolClient.query('SELECT 1 as health');
    const latencyMs = Date.now() - start;
    if (res.rows?.[0]?.health === 1) {
      return { status: 'HEALTHY', latencyMs };
    }
    return { status: 'UNHEALTHY', latencyMs, error: 'Unexpected response from database' };
  } catch (err: any) {
    return {
      status: 'UNHEALTHY',
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
}

/**
 * Graceful shutdown for database connection pool.
 */
export async function closeDb(): Promise<void> {
  if (poolClient) {
    await poolClient.end();
    poolClient = null;
    dbClient = null;
  }
}

export { schema };
