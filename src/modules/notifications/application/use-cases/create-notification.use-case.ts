import type { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationEntity } from '../../domain/notification.entity';
import type { Notification } from '../../domain/interfaces/notification.interface';
import { shouldCreateNotification } from '../../domain/utils/notification-preference.util';
import type { NotificationRealtimePublisher } from '../../domain/ports/notification-realtime-publisher.port';
import type { DeliverPushNotificationUseCase } from './deliver-push-notification.use-case';

export class CreateNotificationUseCase {
  constructor(
    private notificationRepo: NotificationRepository,
    private realtime: NotificationRealtimePublisher,
    private deliverPush?: DeliverPushNotificationUseCase
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
    this.realtime.publish(userId, created);
    if (this.deliverPush) {
      void this.deliverPush.execute(userId, created, prefs).catch((err) => {
        console.error('[Notifications] Push delivery failed:', err);
      });
    }
    return created;
  }
}
