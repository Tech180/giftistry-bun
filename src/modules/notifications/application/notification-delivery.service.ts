import type { Notification, NotificationPrefs } from '../domain/notification.entity';
import type { PushSubscriptionRepository } from '../domain/ports/push-subscription.repository';
import {
  buildPushPayload,
  type PushNotificationPort,
} from '../domain/ports/push-notification.port';
import type { PushTransport } from '../domain/push-subscription.entity';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

export type UserForegroundPresencePort = {
  isUserForegroundConnected: (userId: string) => boolean;
};

export class NotificationDeliveryService {
  constructor(
    private pushSubscriptionRepo: PushSubscriptionRepository,
    private adapters: Partial<Record<PushTransport, PushNotificationPort>>,
    private serverConfigRepo: ServerConfigRepository,
    private presence: UserForegroundPresencePort
  ) {}

  async deliverPush(
    userId: string,
    notification: Notification,
    prefs: NotificationPrefs
  ): Promise<void> {
    if (prefs.PushAlerts === false) return;
    if (this.presence.isUserForegroundConnected(userId)) return;

    const config = this.serverConfigRepo.load();
    const subscriptions = await this.pushSubscriptionRepo.findByUserId(userId);
    if (subscriptions.length === 0) return;

    const payload = buildPushPayload(notification, config.PublicAppUrl);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const transportEnabled =
          (sub.Transport === 'ntfy' && config.NtfyEnabled) ||
          (sub.Transport === 'webpush' && config.WebPushEnabled) ||
          (sub.Transport === 'fcm' && config.FcmEnabled);
        if (!transportEnabled) return;

        const adapter = this.adapters[sub.Transport];
        if (!adapter) return;

        try {
          await adapter.send(sub, payload);
        } catch (err) {
          console.error(
            `[Notifications] Push failed for ${sub.Transport} subscription ${sub.Id}:`,
            err
          );
        }
      })
    );
  }
}
