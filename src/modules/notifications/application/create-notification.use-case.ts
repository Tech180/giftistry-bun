import type { NotificationRepository } from '../domain/ports/notification.repository';
import { NotificationEntity, type Notification } from '../domain/notification.entity';
import { shouldCreateNotification } from '../domain/notification-preference.util';
import { publishNotification } from '../infrastructure/notification-publisher';
import type { NotificationDeliveryService } from './notification-delivery.service';

export class CreateNotificationUseCase {
  constructor(
    private notificationRepo: NotificationRepository,
    private delivery?: NotificationDeliveryService
  ) {}

  async execute(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<Notification | null> {
    const prefs = await this.notificationRepo.getPrefs(userId);
    if (!shouldCreateNotification(type, prefs)) {
      return null;
    }

    const notification = NotificationEntity.create(userId, type, title, body, metadata);
    const created = await this.notificationRepo.create(
      notification.UserId,
      notification.Type,
      notification.Title,
      notification.Message,
      notification.Metadata
    );
    publishNotification(userId, created);
    if (this.delivery) {
      void this.delivery.deliverPush(userId, created, prefs).catch((err) => {
        console.error('[Notifications] Push delivery failed:', err);
      });
    }
    return created;
  }
}
