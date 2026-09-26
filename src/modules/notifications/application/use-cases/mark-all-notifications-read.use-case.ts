import type { NotificationRepository } from '../../domain/ports/notification.repository';

export class MarkAllNotificationsReadUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await this.notificationRepo.markAllRead(userId);
  }
}
