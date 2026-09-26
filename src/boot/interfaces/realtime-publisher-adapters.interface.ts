import type { WebsocketJobProgressPublisher } from '@/modules/jobs/infrastructure/adapters/websocket-job-progress-publisher';
import type { WebsocketListChangedPublisher } from '@/modules/wishlist/infrastructure/adapters/websocket-list-changed-publisher';
import type { WebsocketNotificationRealtimePublisher } from '@/modules/notifications/infrastructure/adapters/websocket-notification-realtime-publisher';

export interface RealtimePublisherAdapters {
  jobProgress: WebsocketJobProgressPublisher;
  listChanged: WebsocketListChangedPublisher;
  notification: WebsocketNotificationRealtimePublisher;
}
