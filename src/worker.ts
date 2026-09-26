/**
 * Background job worker process — claims queued jobs and fans realtime events
 * to the API via Postgres LISTEN/NOTIFY.
 *
 * Run with: GIFTISTRY_PROCESS_ROLE=worker bun run src/worker.ts
 */
import { resolveProcessRole } from './common/utils/process-role.util';
import { runWorker } from '@/boot/run-worker';

const role = resolveProcessRole();

if (role !== 'worker') {
  console.error(
    `[worker] Set GIFTISTRY_PROCESS_ROLE=worker (got "${role}"). Use src/index.ts for api/all.`
  );
  process.exit(1);
}

void runWorker();
