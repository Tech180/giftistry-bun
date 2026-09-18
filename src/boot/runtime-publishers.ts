import { setWishlistJobPublisher } from '@/modules/jobs/infrastructure/wishlist-job-publisher';
import { setListChangedPublisher } from '@/modules/wishlist/infrastructure/wishlist-list-publisher';
import { setNotificationPublisher } from '@/modules/notifications/infrastructure/notification-publisher';
import { publishRealtimeFanout } from '@/modules/jobs/infrastructure/postgres-realtime-fanout';

export type DirectWsPublish = (room: string, data: string) => void;

/** In-process Bun WebSocket publishers (api / all roles). */
export function wireDirectRealtimePublishers(publish: DirectWsPublish): void {
  setWishlistJobPublisher((listId, userId, payload) => {
    const json = JSON.stringify(payload);
    if (listId) publish(listId, json);
    if (userId) publish(userId, json);
  });
  setListChangedPublisher((listId, payload) => {
    publish(listId, JSON.stringify(payload));
  });
  setNotificationPublisher((userId, payload) => {
    publish(userId, JSON.stringify(payload));
  });
}

/** Worker-side publishers: fan out through Postgres NOTIFY. */
export function wirePostgresRealtimePublishers(): void {
  setWishlistJobPublisher((listId, userId, payload) => {
    void publishRealtimeFanout([listId, userId], payload);
  });
  setListChangedPublisher((listId, payload) => {
    void publishRealtimeFanout([listId], payload);
  });
  setNotificationPublisher((userId, payload) => {
    void publishRealtimeFanout([userId], payload);
  });
}

export function clearRealtimePublishers(): void {
  setWishlistJobPublisher(null);
  setListChangedPublisher(null);
  setNotificationPublisher(null);
}
