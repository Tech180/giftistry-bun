import { PostgresNotificationRepository } from '../infrastructure/postgres-notification.repository';
import type { Notification } from '../domain/notification.entity';

const notificationRepo = new PostgresNotificationRepository();

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<Notification> {
  return await notificationRepo.create(userId, type, title, body, metadata);
}
