import { Elysia } from 'elysia';
import type { NotificationRepository } from './domain/ports/notification.repository';
import type { PushSubscriptionRepository } from './domain/ports/push-subscription.repository';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  DeleteNotificationUseCase,
  ClearAllNotificationsUseCase,
  GetNotificationPrefsUseCase,
  UpdateNotificationPrefsUseCase,
} from './application/notification.use-cases';
import {
  DeletePushSubscriptionUseCase,
  ListPushSubscriptionsUseCase,
  RegisterPushSubscriptionUseCase,
  SetPrimaryPushSubscriptionUseCase,
} from './application/push-subscription.use-cases';
import { notificationsRoutes } from './presentation/notifications.routes';

export interface NotificationsModuleDeps {
  notificationRepo: NotificationRepository;
  pushSubscriptionRepo: PushSubscriptionRepository;
  serverConfigRepo: ServerConfigRepository;
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
      registerPushSubscription: new RegisterPushSubscriptionUseCase(
        deps.pushSubscriptionRepo,
        deps.serverConfigRepo
      ),
      listPushSubscriptions: new ListPushSubscriptionsUseCase(deps.pushSubscriptionRepo),
      deletePushSubscription: new DeletePushSubscriptionUseCase(deps.pushSubscriptionRepo),
      setPrimaryPushSubscription: new SetPrimaryPushSubscriptionUseCase(deps.pushSubscriptionRepo),
    })
  );
}
