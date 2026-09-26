import { sql } from './sql-proxy.util';

/** Graceful pool shutdown for process entrypoints. */
export async function closeDatabasePool(options?: { timeout?: number }): Promise<void> {
  await sql.end({ timeout: options?.timeout ?? 5 });
}
