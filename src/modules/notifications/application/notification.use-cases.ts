import type { NotificationRepository } from '../domain/ports/notification.repository';
import type { Notification, NotificationPrefsUpdate } from '../domain/notification.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class ListNotificationsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<Notification[]> {
    return await this.notificationRepo.findByUserId(userId);
  }
}

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

export class MarkAllNotificationsReadUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await this.notificationRepo.markAllRead(userId);
  }
}

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

export class ClearAllNotificationsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string): Promise<void> {
    await this.notificationRepo.deleteAll(userId);
  }
}

export class GetNotificationPrefsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string) {
    return await this.notificationRepo.getPrefs(userId);
  }
}

export class UpdateNotificationPrefsUseCase {
  constructor(private notificationRepo: NotificationRepository) {}

  async execute(userId: string, updates: NotificationPrefsUpdate) {
    return await this.notificationRepo.updatePrefs(userId, updates);
  }
}
