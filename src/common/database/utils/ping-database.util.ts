import { sql } from './sql-proxy.util';

/** Bootstrap connectivity check for process entrypoints. */
export async function pingDatabase(): Promise<void> {
  await sql`SELECT 1`;
}
