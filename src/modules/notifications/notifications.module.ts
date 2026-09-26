import { Elysia } from 'elysia';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { DeleteNotificationUseCase } from './application/use-cases/delete-notification.use-case';
import { ClearAllNotificationsUseCase } from './application/use-cases/clear-all-notifications.use-case';
import { GetNotificationPrefsUseCase } from './application/use-cases/get-notification-prefs.use-case';
import { UpdateNotificationPrefsUseCase } from './application/use-cases/update-notification-prefs.use-case';
import { DeletePushSubscriptionUseCase } from './application/use-cases/delete-push-subscription.use-case';
import { ListPushSubscriptionsUseCase } from './application/use-cases/list-push-subscriptions.use-case';
import { RegisterPushSubscriptionUseCase } from './application/use-cases/register-push-subscription.use-case';
import { SetPrimaryPushSubscriptionUseCase } from './application/use-cases/set-primary-push-subscription.use-case';
import type { NotificationsModuleDeps } from './interfaces/notifications-module-deps.interface';
import { notificationsRoutes } from './presentation/notifications.routes';

export function createNotificationsModule(deps: NotificationsModuleDeps) {
  return new Elysia().use(
    notificationsRoutes({
      useCases: {
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
        setPrimaryPushSubscription: new SetPrimaryPushSubscriptionUseCase(
          deps.pushSubscriptionRepo
        ),
      },
    })
  );
}
