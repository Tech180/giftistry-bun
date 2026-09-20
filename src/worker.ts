/**
 * Background job worker process — claims queued jobs and fans realtime events
 * to the API via Postgres LISTEN/NOTIFY.
 *
 * Run with: GIFTISTRY_PROCESS_ROLE=worker bun run src/worker.ts
 */
import { getEnv } from './common/consts/runtime-config';
import { closeDatabasePool, pingDatabase } from './common/database/connection';
import { createAppContainer } from './app.container';
import { resolveProcessRole } from './common/utils/process-role.util';
import {
  clearRealtimePublishers,
  wirePostgresRealtimePublishers,
} from './boot/runtime-publishers';

const role = resolveProcessRole();
if (role !== 'worker') {
  console.error(
    `[worker] Set GIFTISTRY_PROCESS_ROLE=worker (got "${role}"). Use src/index.ts for api/all.`
  );
  process.exit(1);
}

async function main(): Promise<void> {
  try {
    await pingDatabase();
  } catch (err) {
    console.error('[worker] Database unreachable:', err);
    process.exit(1);
  }

  const { jobRunner, realtimePublishers } = createAppContainer({
    skipItemJobCompletionNotify: true,
  });

  wirePostgresRealtimePublishers(realtimePublishers);
  jobRunner.start();
  console.log(
    `[worker] Giftistry job worker started (NODE_ENV=${getEnv().NODE_ENV})`
  );

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down…`);
    jobRunner.stop();
    clearRealtimePublishers(realtimePublishers);
    try {
      await closeDatabasePool({ timeout: 5 });
    } catch (err) {
      console.error('[worker] Error closing DB pool:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void main();
