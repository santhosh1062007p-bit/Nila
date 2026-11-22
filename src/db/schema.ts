import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { isSchemaEnsured, markSchemaEnsured } from './client';

/**
 * Loads the canonical PostgreSQL schema migrations in order
 * and ensures all required tables, constraints, foreign keys, and indexes exist.
 */
export function getInitialSchemaSql(): string {
  const drizzleDir = path.join(process.cwd(), 'drizzle');
  const migrationFiles = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return migrationFiles.map((f) => fs.readFileSync(path.join(drizzleDir, f), 'utf-8')).join('\n');
}

export async function ensurePgSchema(pool: Pool): Promise<void> {
  if (isSchemaEnsured()) return;
  const sql = getInitialSchemaSql();
  await pool.query(sql);
  markSchemaEnsured(true);
}
