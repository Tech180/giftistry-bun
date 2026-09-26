import type { NotificationRepository } from '../../domain/ports/notification.repository';
import type { Notification } from '../../domain/interfaces/notification.interface';

export class ListNotificationsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<Notification[]> {
    return await this.notificationRepo.findByUserId(userId);
  }
}
