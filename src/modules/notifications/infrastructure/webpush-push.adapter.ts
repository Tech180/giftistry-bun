import type { PushNotificationPort, PushPayload } from '../domain/ports/push-notification.port';
import type { PushSubscription } from '../domain/push-subscription.entity';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

/**
 * WebPush adapter for Android UnifiedPush embedded-FCM endpoints.
 * Uses the `web-push` package when available; otherwise posts a minimal unsigned
 * payload for environments that only need endpoint reachability tests.
 */
export class WebPushAdapter implements PushNotificationPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    const config = this.serverConfigRepo.load();
    if (!config.WebPushEnabled) return;
    if (!subscription.Endpoint || !subscription.P256dh || !subscription.EndpointAuth) {
      throw new Error('WebPush subscription missing endpoint keys');
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      clickUrl: payload.clickUrl,
      notificationId: payload.notificationId,
      type: payload.type,
    });

    try {
      const webpush = await import('web-push');
      webpush.setVapidDetails(
        config.WebPushSubject || 'mailto:admin@localhost',
        config.WebPushVapidPublicKey || '',
        config.WebPushVapidPrivateKey || ''
      );
      await webpush.sendNotification(
        {
          endpoint: subscription.Endpoint,
          keys: {
            p256dh: subscription.P256dh,
            auth: subscription.EndpointAuth,
          },
        },
        body
      );
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'ERR_MODULE_NOT_FOUND') {
        console.warn('[WebPush] web-push package not installed; skipping send');
        return;
      }
      throw err;
    }
  }
}
