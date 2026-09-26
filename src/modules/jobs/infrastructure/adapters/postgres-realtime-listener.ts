import { sql } from '@/common/database';
import { REALTIME_FANOUT_CHANNEL } from '../../domain/constants/realtime-fanout.constant';
import { parseRealtimeFanoutMessage } from '../../domain/utils/realtime-fanout.util';
import type { PostgresRealtimeListenerDeps } from '../interfaces/postgres-realtime-listener-deps.interface';
import { hydrateCompactJobFanoutPayload } from '../utils/hydrate-compact-job-fanout.util';
import { maybeNotifyItemJobCompletion } from '../utils/maybe-notify-item-job-completion.util';

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

  const payload = await hydrateCompactJobFanoutPayload(message.payload, deps);
  if (!payload) {
    return;
  }

  try {
    deps.publishToWs(message.room, JSON.stringify(payload));
  } catch (err) {
    console.error('[RealtimeListener] WebSocket publish failed:', err);
  }

  await maybeNotifyItemJobCompletion(payload, deps);
}
