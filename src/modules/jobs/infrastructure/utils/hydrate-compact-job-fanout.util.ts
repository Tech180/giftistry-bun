import { loadConfig } from '@/common/config/utils/server-config-file.util';
import { mapToJobPublicView } from '../../application/utils/map-to-job-public-view.util';
import { isCompactJobFanoutPayload } from '../../domain/utils/realtime-fanout.util';
import type { PostgresRealtimeListenerDeps } from '../interfaces/postgres-realtime-listener-deps.interface';

/**
 * If the fanout payload is a compact JobId ref, reload the job and expand it.
 * Returns null when the job is missing or hydration fails (caller should abort).
 */
export async function hydrateCompactJobFanoutPayload(
  payload: Record<string, unknown>,
  deps: PostgresRealtimeListenerDeps
): Promise<Record<string, unknown> | null> {
  if (!isCompactJobFanoutPayload(payload)) {
    return payload;
  }

  const jobId = payload.JobId as string;
  try {
    const job = await deps.jobRepo.findById(jobId);
    if (!job) {
      console.warn(`[RealtimeListener] job ${jobId} not found for compact fanout`);
      return null;
    }
    const items = await deps.jobRepo.listItems(jobId).catch(() => null);
    return {
      Type: payload.Type,
      Job: mapToJobPublicView(job, items, { load: loadConfig }),
    };
  } catch (err) {
    console.error('[RealtimeListener] failed to hydrate job fanout:', err);
    return null;
  }
}
