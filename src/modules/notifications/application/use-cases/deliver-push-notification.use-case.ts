import type { Notification } from '../../domain/interfaces/notification.interface';
import type { NotificationPrefs } from '../../domain/interfaces/notification-prefs.interface';
import type { PushSubscriptionRepository } from '../../domain/ports/push-subscription.repository';
import type { UserForegroundPresencePort } from '../../domain/ports/user-foreground-presence.port';
import type { PushNotificationAdapters } from '../interfaces/push-notification-adapters.type';
import { buildPushPayload } from '../../domain/utils/build-push-payload.util';
import type { ServerConfigRepository } from '@/modules/system';
import { isPushTransportEnabled } from '../utils/is-push-transport-enabled.util';

export class DeliverPushNotificationUseCase {
  constructor(
    private pushSubscriptionRepo: PushSubscriptionRepository,
    private adapters: PushNotificationAdapters,
    private serverConfigRepo: ServerConfigRepository,
    private presence: UserForegroundPresencePort
  ) {}

  async execute(
    userId: string,
    notification: Notification,
    prefs: NotificationPrefs
  ): Promise<void> {
    if (prefs.PushAlerts === false) {
      return;
    }
    if (this.presence.isUserForegroundConnected(userId)) {
      return;
    }

    const config = this.serverConfigRepo.load();
    const subscriptions = await this.pushSubscriptionRepo.findByUserId(userId);
    if (subscriptions.length === 0) {
      return;
    }

    const payload = buildPushPayload(notification, config.PublicAppUrl);

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        if (
          !isPushTransportEnabled(sub.Transport, {
            NtfyEnabled: !!config.NtfyEnabled,
            WebPushEnabled: !!config.WebPushEnabled,
            FcmEnabled: !!config.FcmEnabled,
          })
        ) {
          return;
        }

        const adapter = this.adapters[sub.Transport];
        if (!adapter) {
          return;
        }

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
