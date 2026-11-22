import { Pool, PoolClient } from 'pg';
import { shouldRequirePostgres } from '@/lib/env';

let pgPool: Pool | null = null;
let pgReachable: boolean | null = null;
let schemaEnsured = false;

export function getPgPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (shouldRequirePostgres()) {
      throw new Error('DATABASE_URL is required when running in production / PostgreSQL mode.');
    }
    return null;
  }

  if (!pgPool) {
    pgPool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 20),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_500,
    });

    pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err.message);
      pgReachable = false;
    });
  }

  return pgPool;
}

export async function isPostgresReady(): Promise<boolean> {
  if (pgReachable === true) return true;
  const pool = getPgPool();
  if (!pool) return false;

  try {
    await pool.query('SELECT 1');
    pgReachable = true;
    return true;
  } catch (err) {
    pgReachable = false;
    if (shouldRequirePostgres()) {
      throw new Error(
        `[Database Error] PostgreSQL is required in production and JSON fallback is disabled: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    return false;
  }
}

/**
 * Execute critical database mutations inside an ACID PostgreSQL transaction.
 */
export async function withPgTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPgPool();
  if (!pool) {
    throw new Error('PostgreSQL pool unavailable for transaction.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export function markSchemaEnsured(done = true): void {
  schemaEnsured = done;
}

export function isSchemaEnsured(): boolean {
  return schemaEnsured;
}

export function resetPgProbeForTest(): void {
  pgReachable = null;
  schemaEnsured = false;
}
