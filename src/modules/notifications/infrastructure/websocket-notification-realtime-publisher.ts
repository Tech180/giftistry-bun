import type { Notification } from '../domain/notification.entity';
import type { NotificationRealtimePublisher } from '../domain/ports/notification-realtime-publisher.port';

export type NotificationTransport = (userId: string, payload: Record<string, unknown>) => void;

/** Adapter: domain port → transport wired at boot (WS or Postgres fanout). */
export class WebsocketNotificationRealtimePublisher implements NotificationRealtimePublisher {
  private transport: NotificationTransport | null = null;

  setTransport(fn: NotificationTransport | null): void {
    this.transport = fn;
  }

  publish(userId: string, notification: Notification): void {
    if (!this.transport) {
      return;
    }
    this.transport(userId, {
      Type: 'notification.received',
      Notification: notification,
    });
  }
}
