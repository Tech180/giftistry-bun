import { Elysia } from 'elysia';
import { PostgresNotificationRepository } from './infrastructure/postgres-notification.repository';
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

const notificationRepo = new PostgresNotificationRepository();

export const notificationsModule = new Elysia()
  .use(notificationsRoutes({
    listNotifications: new ListNotificationsUseCase(notificationRepo),
    markNotificationRead: new MarkNotificationReadUseCase(notificationRepo),
    markAllNotificationsRead: new MarkAllNotificationsReadUseCase(notificationRepo),
    deleteNotification: new DeleteNotificationUseCase(notificationRepo),
    clearAllNotifications: new ClearAllNotificationsUseCase(notificationRepo),
    getNotificationPrefs: new GetNotificationPrefsUseCase(notificationRepo),
    updateNotificationPrefs: new UpdateNotificationPrefsUseCase(notificationRepo),
  }));
