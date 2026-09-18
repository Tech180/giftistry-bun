import { sql } from '@/common/database/connection';
import {
  encodeRealtimeFanoutMessage,
  REALTIME_FANOUT_CHANNEL,
} from '../domain/realtime-fanout.util';

/**
 * Publish one or more WebSocket rooms via Postgres NOTIFY for the API listener.
 */
export async function publishRealtimeFanout(
  rooms: Array<string | null | undefined>,
  payload: Record<string, unknown>
): Promise<void> {
  const uniqueRooms = Array.from(
    new Set(
      rooms
        .map((room) => (typeof room === 'string' ? room.trim() : ''))
        .filter(Boolean)
    )
  );
  if (uniqueRooms.length === 0) return;

  for (const room of uniqueRooms) {
    const message = encodeRealtimeFanoutMessage(room, payload);
    try {
      await sql.notify(REALTIME_FANOUT_CHANNEL, JSON.stringify(message));
    } catch (err) {
      console.error('[RealtimeFanout] pg_notify failed:', err);
    }
  }
}
