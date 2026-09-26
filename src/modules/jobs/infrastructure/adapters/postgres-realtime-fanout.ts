import { sql } from '@/common/database';
import { REALTIME_FANOUT_CHANNEL } from '../../domain/constants/realtime-fanout.constant';
import { encodeRealtimeFanoutMessage } from '../../domain/utils/realtime-fanout.util';
import { uniqueFanoutRooms } from '../utils/unique-fanout-rooms.util';

/**
 * Publish one or more WebSocket rooms via Postgres NOTIFY for the API listener.
 */
export async function publishRealtimeFanout(
  rooms: Array<string | null | undefined>,
  payload: Record<string, unknown>
): Promise<void> {
  const uniqueRooms = uniqueFanoutRooms(rooms);
  if (uniqueRooms.length === 0) {
    return;
  }

  for (const room of uniqueRooms) {
    const message = encodeRealtimeFanoutMessage(room, payload);
    try {
      await sql.notify(REALTIME_FANOUT_CHANNEL, JSON.stringify(message));
    } catch (err) {
      console.error('[RealtimeFanout] pg_notify failed:', err);
    }
  }
}
