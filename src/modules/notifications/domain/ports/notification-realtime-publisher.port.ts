import type { Notification } from '../notification.entity';

export interface NotificationRealtimePublisher {
  publish(userId: string, notification: Notification): void;
}
