import type { NotificationRepository } from '../../domain/ports/notification.repository';

export class GetNotificationPrefsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string) {
    return await this.notificationRepo.getPrefs(userId);
  }
}
