/** Public barrel for the notifications module. Prefer this over deep imports. */
export type { Notification } from './domain/interfaces/notification.interface';
export type { NotificationPrefs } from './domain/interfaces/notification-prefs.interface';
export type { NotificationRepository } from './domain/ports/notification.repository';
export type { NotificationRealtimePublisher } from './domain/ports/notification-realtime-publisher.port';
export type { PushSubscriptionRepository } from './domain/ports/push-subscription.repository';
export type { PushNotificationPort } from './domain/ports/push-notification.port';
export type { NotificationsModuleDeps } from './interfaces/notifications-module-deps.interface';
export { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
export { DeliverPushNotificationUseCase } from './application/use-cases/deliver-push-notification.use-case';
export { registerCreateNotificationHandlers } from './infrastructure/event-handlers/create-notification.handler';
export {
  isUserForegroundConnected,
  addUserWsConnection,
  removeUserWsConnection,
} from './infrastructure/stores/user-ws.store';
export { createNotificationsModule } from './notifications.module';
