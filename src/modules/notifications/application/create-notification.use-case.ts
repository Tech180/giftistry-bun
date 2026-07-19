import type { NotificationRepository } from '../domain/ports/notification.repository';
import { NotificationEntity, type Notification } from '../domain/notification.entity';
import { publishNotification } from '../infrastructure/notification-publisher';

export class CreateNotificationUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<Notification> {
    const notification = NotificationEntity.create(userId, type, title, body, metadata);
    const created = await this.notificationRepo.create(
      notification.UserId,
      notification.Type,
      notification.Title,
      notification.Message,
      notification.Metadata
    );
    publishNotification(userId, created);
    return created;
  }
}

