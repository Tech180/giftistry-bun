import { initializeSchema, pingDatabase, runMigrations } from '@/common/database';

/**
 * Best-effort schema + migrations at API boot.
 * Returns false when the database is unreachable so HTTP can still listen.
 */
export async function ensureDatabaseSchema(): Promise<boolean> {
  try {
    await pingDatabase();
    await initializeSchema();
    await runMigrations();
    return true;
  } catch (err) {
    console.error('[boot] Database unavailable; skipping schema/migrations:', err);
    return false;
  }
}
