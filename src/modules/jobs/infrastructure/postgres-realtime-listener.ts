import { sql } from '@/common/database/connection';
import { loadConfig } from '@/common/infrastructure/config.loader';
import { mapToJobPublicView } from '../application/map-to-job-public-view.util';
import type { BackgroundJobRepository } from '../domain/ports/background-job.repository';
import {
  isCompactJobFanoutPayload,
  parseRealtimeFanoutMessage,
  REALTIME_FANOUT_CHANNEL,
} from '../domain/realtime-fanout.util';
import type { NotifyItemJobCompletionUseCase } from '../application/notify-item-job-completion.use-case';

export type RealtimeWsPublisher = (room: string, payloadJson: string) => void;

export interface PostgresRealtimeListenerDeps {
  jobRepo: BackgroundJobRepository;
  publishToWs: RealtimeWsPublisher;
  notifyItemJobCompletion?: NotifyItemJobCompletionUseCase;
}

const ITEM_JOB_KINDS = new Set(['item-enrich', 'item-summarize']);

/**
 * LISTEN on the fanout channel and republish payloads to Bun WebSocket rooms.
 * Hydrates compact JobId refs and runs item-job completion notify on the API.
 */
export async function startPostgresRealtimeListener(
  deps: PostgresRealtimeListenerDeps
): Promise<{ stop: () => Promise<void> }> {
  const handle = await sql.listen(REALTIME_FANOUT_CHANNEL, (raw) => {
    void handleFanoutNotify(raw, deps);
  });

  console.log(`[RealtimeListener] listening on ${REALTIME_FANOUT_CHANNEL}`);

  return {
    stop: async () => {
      try {
        await handle.unlisten?.();
      } catch (err) {
        console.error('[RealtimeListener] unlisten failed:', err);
      }
    },
  };
}

/** @internal exported for unit tests */
export async function handleFanoutNotify(
  raw: string,
  deps: PostgresRealtimeListenerDeps
): Promise<void> {
  const message = parseRealtimeFanoutMessage(raw);
  if (!message) {
    console.warn('[RealtimeListener] ignoring invalid fanout payload');
    return;
  }

  let payload = message.payload;
  if (isCompactJobFanoutPayload(payload)) {
    const jobId = payload.JobId as string;
    try {
      const job = await deps.jobRepo.findById(jobId);
      if (!job) {
        console.warn(`[RealtimeListener] job ${jobId} not found for compact fanout`);
        return;
      }
      const items = await deps.jobRepo.listItems(jobId).catch(() => null);
      payload = {
        Type: payload.Type,
        Job: mapToJobPublicView(job, items, { load: loadConfig }),
      };
    } catch (err) {
      console.error('[RealtimeListener] failed to hydrate job fanout:', err);
      return;
    }
  }

  try {
    deps.publishToWs(message.room, JSON.stringify(payload));
  } catch (err) {
    console.error('[RealtimeListener] WebSocket publish failed:', err);
  }

  await maybeNotifyItemJobCompletion(payload, deps);
}

async function maybeNotifyItemJobCompletion(
  payload: Record<string, unknown>,
  deps: PostgresRealtimeListenerDeps
): Promise<void> {
  if (!deps.notifyItemJobCompletion) return;
  const type = payload.Type;
  if (type !== 'job.completed' && type !== 'job.failed') return;

  const jobView = payload.Job;
  if (!jobView || typeof jobView !== 'object' || Array.isArray(jobView)) return;
  const record = jobView as Record<string, unknown>;
  const kind = record.Kind;
  if (typeof kind !== 'string' || !ITEM_JOB_KINDS.has(kind)) return;
  const id = record.Id;
  if (typeof id !== 'string') return;

  try {
    const job = await deps.jobRepo.findById(id);
    if (!job) return;
    await deps.notifyItemJobCompletion.execute(job);
  } catch (err) {
    console.error('[RealtimeListener] item job completion notify failed:', err);
  }
}
