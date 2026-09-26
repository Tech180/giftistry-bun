import type { NotificationRepository } from '../../domain/ports/notification.repository';
import type { NotificationPrefsUpdate } from '../../domain/types/notification-prefs-update.type';

export class UpdateNotificationPrefsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string, updates: NotificationPrefsUpdate) {
    return await this.notificationRepo.updatePrefs(userId, updates);
  }
}
