import type { Notification } from '../interfaces/notification.interface';

export interface NotificationRealtimePublisher {
  publish(userId: string, notification: Notification): void;
}
