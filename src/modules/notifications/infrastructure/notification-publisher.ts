import type { Notification } from '../domain/notification.entity';

export type NotificationPublisher = (userId: string, payload: Record<string, unknown>) => void;

let publisher: NotificationPublisher | null = null;

export function setNotificationPublisher(fn: NotificationPublisher | null): void {
  publisher = fn;
}

export function publishNotification(userId: string, notification: Notification): void {
  if (!publisher) return;
  publisher(userId, {
    Type: 'notification.received',
    Notification,
  });
}
