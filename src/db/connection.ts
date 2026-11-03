import { Pool, type PoolClient } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

let poolInstance: Pool | null = null;
let drizzleInstance: NodePgDatabase<typeof schema> | null = null;

/** Create the real PostgreSQL pool only on first database use; never substitute another store. */
export function getPool(): Pool {
  if (poolInstance) return poolInstance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL access; database operations fail closed');
  poolInstance = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'zyntheor',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined,
  });
  poolInstance.on('error', error => console.error('Unexpected idle PostgreSQL client error', error));
  return poolInstance;
}

/** Lazy Drizzle proxy that resolves only to a real PostgreSQL-backed Drizzle instance. */
export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property) {
    drizzleInstance ??= drizzle(getPool(), { schema });
    const value = Reflect.get(drizzleInstance, property, drizzleInstance);
    return typeof value === 'function' ? value.bind(drizzleInstance) : value;
  },
});

export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
  options: { isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'; readOnly?: boolean } = {},
): Promise<T> {
  const client = await getPool().connect();
  let began = false;
  try {
    const isolation = options.isolationLevel ?? 'READ COMMITTED';
    await client.query(`BEGIN ISOLATION LEVEL ${isolation}${options.readOnly ? ' READ ONLY' : ''}`);
    began = true;
    const result = await work(client);
    await client.query('COMMIT');
    began = false;
    return result;
  } catch (error) {
    if (began) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (poolInstance) await poolInstance.end();
  poolInstance = null;
  drizzleInstance = null;
}
