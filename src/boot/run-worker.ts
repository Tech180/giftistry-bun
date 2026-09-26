import { getEnv } from '@/common/config/utils/get-env.util';
import { pingDatabase } from '@/common/database';
import { createAppContainer } from '@/app.container';
import { wirePostgresRealtimePublishers } from '@/boot/runtime-publishers';
import { registerWorkerShutdown } from '@/boot/utils/register-worker-shutdown.util';

/** Start the background job worker (DB ping → container → Postgres fanout → runner). */
export async function runWorker(): Promise<void> {
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

  registerWorkerShutdown(jobRunner, realtimePublishers);
}
