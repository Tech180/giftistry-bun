import type { NotificationRepository } from '../../domain/ports/notification.repository';
import { AppError } from '@/common/domain/errors/app-error';

export class DeleteNotificationUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification || notification.UserId !== userId) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }
    await this.notificationRepo.deleteById(notificationId, userId);
  }
}
