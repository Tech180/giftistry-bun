import type { ClearAllNotificationsUseCase } from '../../application/use-cases/clear-all-notifications.use-case';
import type { DeleteNotificationUseCase } from '../../application/use-cases/delete-notification.use-case';
import type { DeletePushSubscriptionUseCase } from '../../application/use-cases/delete-push-subscription.use-case';
import type { GetNotificationPrefsUseCase } from '../../application/use-cases/get-notification-prefs.use-case';
import type { ListNotificationsUseCase } from '../../application/use-cases/list-notifications.use-case';
import type { ListPushSubscriptionsUseCase } from '../../application/use-cases/list-push-subscriptions.use-case';
import type { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read.use-case';
import type { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read.use-case';
import type { RegisterPushSubscriptionUseCase } from '../../application/use-cases/register-push-subscription.use-case';
import type { SetPrimaryPushSubscriptionUseCase } from '../../application/use-cases/set-primary-push-subscription.use-case';
import type { UpdateNotificationPrefsUseCase } from '../../application/use-cases/update-notification-prefs.use-case';

export interface UseCases {
  listNotifications: ListNotificationsUseCase;
  markNotificationRead: MarkNotificationReadUseCase;
  markAllNotificationsRead: MarkAllNotificationsReadUseCase;
  deleteNotification: DeleteNotificationUseCase;
  clearAllNotifications: ClearAllNotificationsUseCase;
  getNotificationPrefs: GetNotificationPrefsUseCase;
  updateNotificationPrefs: UpdateNotificationPrefsUseCase;
  registerPushSubscription: RegisterPushSubscriptionUseCase;
  listPushSubscriptions: ListPushSubscriptionsUseCase;
  deletePushSubscription: DeletePushSubscriptionUseCase;
  setPrimaryPushSubscription: SetPrimaryPushSubscriptionUseCase;
}
