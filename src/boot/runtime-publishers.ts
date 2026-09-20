import type { WebsocketJobProgressPublisher } from '@/modules/jobs/infrastructure/websocket-job-progress-publisher';
import type { WebsocketListChangedPublisher } from '@/modules/wishlist/infrastructure/websocket-list-changed-publisher';
import type { WebsocketNotificationRealtimePublisher } from '@/modules/notifications/infrastructure/websocket-notification-realtime-publisher';
import { publishRealtimeFanout } from '@/modules/jobs/infrastructure/postgres-realtime-fanout';

export type DirectWsPublish = (room: string, data: string) => void;

export type RealtimePublisherAdapters = {
  jobProgress: WebsocketJobProgressPublisher;
  listChanged: WebsocketListChangedPublisher;
  notification: WebsocketNotificationRealtimePublisher;
};

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
    publish(listId, JSON.stringify(payload));
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
    void publishRealtimeFanout([listId], payload);
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
