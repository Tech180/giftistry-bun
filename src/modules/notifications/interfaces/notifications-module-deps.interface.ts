import type { NotificationRepository } from '../domain/ports/notification.repository';
import type { PushSubscriptionRepository } from '../domain/ports/push-subscription.repository';
import type { ServerConfigRepository } from '@/modules/system';

export interface NotificationsModuleDeps {
  notificationRepo: NotificationRepository;
  pushSubscriptionRepo: PushSubscriptionRepository;
  serverConfigRepo: ServerConfigRepository;
}
