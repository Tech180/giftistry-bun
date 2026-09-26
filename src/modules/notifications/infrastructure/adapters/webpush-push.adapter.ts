import webpush from 'web-push';
import type { PushPayload } from '../../domain/interfaces/push-payload.interface';
import type { PushSubscription } from '../../domain/interfaces/push-subscription.interface';
import type { PushNotificationPort } from '../../domain/ports/push-notification.port';
import type { ServerConfigRepository } from '@/modules/system';
import { DEFAULT_WEBPUSH_SUBJECT } from '../constants/push-adapter.constant';
import { buildWebPushBody } from '../utils/build-web-push-body.util';

/** WebPush adapter for Android UnifiedPush embedded-FCM endpoints. */
export class WebPushAdapter implements PushNotificationPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    const config = this.serverConfigRepo.load();
    if (!config.WebPushEnabled) {
      return;
    }
    if (!subscription.Endpoint || !subscription.P256dh || !subscription.EndpointAuth) {
      throw new Error('WebPush subscription missing endpoint keys');
    }

    webpush.setVapidDetails(
      config.WebPushSubject || DEFAULT_WEBPUSH_SUBJECT,
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
      buildWebPushBody(payload)
    );
  }
}
