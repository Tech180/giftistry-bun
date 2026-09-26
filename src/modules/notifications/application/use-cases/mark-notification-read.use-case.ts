import type { NotificationRepository } from '../../domain/ports/notification.repository';
import type { Notification } from '../../domain/interfaces/notification.interface';
import { AppError } from '@/common/domain/errors/app-error';

export class MarkNotificationReadUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification || notification.UserId !== userId) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }
    return await this.notificationRepo.markRead(notificationId, userId);
  }
}
