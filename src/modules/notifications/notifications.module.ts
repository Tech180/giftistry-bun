import { Elysia } from 'elysia';
import type { NotificationRepository } from './domain/ports/notification.repository';
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  DeleteNotificationUseCase,
  ClearAllNotificationsUseCase,
  GetNotificationPrefsUseCase,
  UpdateNotificationPrefsUseCase,
} from './application/notification.use-cases';
import { notificationsRoutes } from './presentation/notifications.routes';

export interface NotificationsModuleDeps {
  notificationRepo: NotificationRepository;
}

export function createNotificationsModule(deps: NotificationsModuleDeps) {
  return new Elysia().use(
    notificationsRoutes({
      listNotifications: new ListNotificationsUseCase(deps.notificationRepo),
      markNotificationRead: new MarkNotificationReadUseCase(deps.notificationRepo),
      markAllNotificationsRead: new MarkAllNotificationsReadUseCase(deps.notificationRepo),
      deleteNotification: new DeleteNotificationUseCase(deps.notificationRepo),
      clearAllNotifications: new ClearAllNotificationsUseCase(deps.notificationRepo),
      getNotificationPrefs: new GetNotificationPrefsUseCase(deps.notificationRepo),
      updateNotificationPrefs: new UpdateNotificationPrefsUseCase(deps.notificationRepo),
    })
  );
}
