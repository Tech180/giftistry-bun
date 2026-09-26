import type { DirectWsPublish } from '@/boot/interfaces/direct-ws-publish.type';
import type { RealtimePublisherAdapters } from '@/boot/interfaces/realtime-publisher-adapters.interface';
import { guestListWsRoom } from '@/modules/invites/infrastructure/utils/guest-list-ws-room.util';
import { publishRealtimeFanout } from '@/modules/jobs/infrastructure/adapters/postgres-realtime-fanout';

export type { DirectWsPublish } from '@/boot/interfaces/direct-ws-publish.type';
export type { RealtimePublisherAdapters } from '@/boot/interfaces/realtime-publisher-adapters.interface';

/** In-process Bun WebSocket publishers (api / all roles). */
export function wireDirectRealtimePublishers(
  publish: DirectWsPublish,
  adapters: RealtimePublisherAdapters
): void {
  adapters.jobProgress.setTransport((listId, userId, payload) => {
    const json = JSON.stringify(payload);
    if (listId) {
      publish(listId, json);
    }
    if (userId) {
      publish(userId, json);
    }
  });
  adapters.listChanged.setTransport((listId, payload) => {
    const json = JSON.stringify(payload);
    publish(listId, json);
    publish(guestListWsRoom(listId), json);
  });
  adapters.notification.setTransport((userId, payload) => {
    publish(userId, JSON.stringify(payload));
  });
}

/** Worker-side publishers: fan out through Postgres NOTIFY. */
export function wirePostgresRealtimePublishers(adapters: RealtimePublisherAdapters): void {
  adapters.jobProgress.setTransport((listId, userId, payload) => {
    void publishRealtimeFanout([listId, userId], payload);
  });
  adapters.listChanged.setTransport((listId, payload) => {
    void publishRealtimeFanout([listId, guestListWsRoom(listId)], payload);
  });
  adapters.notification.setTransport((userId, payload) => {
    void publishRealtimeFanout([userId], payload);
  });
}

export function clearRealtimePublishers(adapters: RealtimePublisherAdapters): void {
  adapters.jobProgress.setTransport(null);
  adapters.listChanged.setTransport(null);
  adapters.notification.setTransport(null);
}
