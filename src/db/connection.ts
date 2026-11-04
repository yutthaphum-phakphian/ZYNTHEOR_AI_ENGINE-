import { Pool, type PoolClient } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

let poolInstance: Pool | null = null;
let drizzleInstance: NodePgDatabase<typeof schema> | null = null;

const noOp = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: any) => d?.data ?? {},
  update: async (d: any) => d?.data ?? {},
  delete: async () => ({}),
};

const mockDb = new Proxy({}, {
  get: (_, prop) => (prop === 'query' ? new Proxy({}, { get: () => noOp }) : async () => []),
}) as unknown as NodePgDatabase<typeof schema>;

const mockClient = {
  query: async () => ({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] }),
  release: () => {},
} as unknown as PoolClient;

const mockPool = {
  query: async () => ({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] }),
  connect: async () => mockClient,
  on: () => mockPool,
  end: async () => {},
} as unknown as Pool;

/** Create the real PostgreSQL pool only on first database use; falls back to mock if DATABASE_URL is unset */
export function getPool(): Pool {
  if (poolInstance) return poolInstance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[AI Studio] DATABASE_URL is not set — using in-memory mock PostgreSQL pool');
    return mockPool;
  }
  try {
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
  } catch (error) {
    console.warn('[AI Studio] Database not connected — using mock pool', error);
    return mockPool;
  }
}

/** Lazy Drizzle proxy that resolves to real PostgreSQL-backed Drizzle or mock instance. */
export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property) {
    if (!process.env.DATABASE_URL) {
      const val = Reflect.get(mockDb, property, mockDb);
      return typeof val === 'function' ? val.bind(mockDb) : val;
    }
    try {
      drizzleInstance ??= drizzle(getPool(), { schema });
      const value = Reflect.get(drizzleInstance, property, drizzleInstance);
      return typeof value === 'function' ? value.bind(drizzleInstance) : value;
    } catch {
      console.warn('[AI Studio] Database not connected — using mock');
      const val = Reflect.get(mockDb, property, mockDb);
      return typeof val === 'function' ? val.bind(mockDb) : val;
    }
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
