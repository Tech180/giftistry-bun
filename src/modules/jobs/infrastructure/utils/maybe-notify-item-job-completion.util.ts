import { ITEM_JOB_KINDS } from '../../application/constants/item-job-kinds.constant';
import type { PostgresRealtimeListenerDeps } from '../interfaces/postgres-realtime-listener-deps.interface';

/** Notify item-job completion on the API when fanout carries a terminal item job. */
export async function maybeNotifyItemJobCompletion(
  payload: Record<string, unknown>,
  deps: PostgresRealtimeListenerDeps
): Promise<void> {
  if (!deps.notifyItemJobCompletion) {
    return;
  }

  const type = payload.Type;
  if (type !== 'job.completed' && type !== 'job.failed') {
    return;
  }

  const jobView = payload.Job;
  if (!jobView || typeof jobView !== 'object' || Array.isArray(jobView)) {
    return;
  }

  const record = jobView as Record<string, unknown>;
  const kind = record.Kind;
  if (typeof kind !== 'string' || !ITEM_JOB_KINDS.has(kind)) {
    return;
  }

  const id = record.Id;
  if (typeof id !== 'string') {
    return;
  }

  try {
    const job = await deps.jobRepo.findById(id);
    if (!job) {
      return;
    }
    await deps.notifyItemJobCompletion.execute(job);
  } catch (err) {
    console.error('[RealtimeListener] item job completion notify failed:', err);
  }
}
