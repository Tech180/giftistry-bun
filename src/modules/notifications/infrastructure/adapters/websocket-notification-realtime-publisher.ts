import type { Notification } from '../../domain/interfaces/notification.interface';
import type { NotificationRealtimePublisher } from '../../domain/ports/notification-realtime-publisher.port';
import { NOTIFICATION_RECEIVED_EVENT_TYPE } from '../constants/notification-realtime-event.constant';
import type { NotificationTransport } from '../interfaces/notification-transport.type';

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
      Type: NOTIFICATION_RECEIVED_EVENT_TYPE,
      Notification: notification,
    });
  }
}
