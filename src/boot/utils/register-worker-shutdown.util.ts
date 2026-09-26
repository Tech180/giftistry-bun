import type { BackgroundJobRunner } from '@/modules/jobs';
import { closeDatabasePool } from '@/common/database';
import type { RealtimePublisherAdapters } from '@/boot/interfaces/realtime-publisher-adapters.interface';
import { clearRealtimePublishers } from '@/boot/runtime-publishers';

/** Register SIGINT/SIGTERM handlers that stop the job runner and close the DB pool. */
export function registerWorkerShutdown(
  jobRunner: BackgroundJobRunner,
  realtimePublishers: RealtimePublisherAdapters
): void {
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
