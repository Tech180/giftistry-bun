import type { PushPayload } from '../../domain/interfaces/push-payload.interface';
import type { PushSubscription } from '../../domain/interfaces/push-subscription.interface';
import type { PushNotificationPort } from '../../domain/ports/push-notification.port';
import type { ServerConfigRepository } from '@/modules/system';
import {
  FCM_MESSAGING_SCOPE,
  FCM_SEND_URL_PREFIX,
} from '../constants/push-adapter.constant';
import type { FcmServiceAccount } from '../interfaces/fcm-service-account.interface';
import { buildFcmMessageBody } from '../utils/build-fcm-message-body.util';

/**
 * FCM HTTP v1 adapter for iOS fallback device tokens.
 * Uses a service-account JWT when configured; logs and skips when not fully set up.
 */
export class FcmPushAdapter implements PushNotificationPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    const config = this.serverConfigRepo.load();
    if (!config.FcmEnabled) {
      return;
    }
    if (!config.FcmProjectId || !config.FcmServiceAccountJson) {
      console.warn('[FCM] Missing project id or service account; skipping send');
      return;
    }

    let serviceAccount: FcmServiceAccount;
    try {
      serviceAccount = JSON.parse(config.FcmServiceAccountJson) as FcmServiceAccount;
    } catch {
      throw new Error('Invalid FcmServiceAccountJson');
    }

    const accessToken = await this.fetchAccessToken(serviceAccount);
    const url = `${FCM_SEND_URL_PREFIX}${encodeURIComponent(config.FcmProjectId)}/messages:send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: buildFcmMessageBody(subscription.Endpoint, payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`FCM send failed (${response.status}): ${text}`);
    }
  }

  private async fetchAccessToken(serviceAccount: FcmServiceAccount): Promise<string> {
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FCM service account missing client_email or private_key');
    }

    const { JWT } = await import('google-auth-library');
    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: [FCM_MESSAGING_SCOPE],
    });
    const tokens = await client.authorize();
    if (!tokens.access_token) {
      throw new Error('FCM authorize returned no access_token');
    }
    return tokens.access_token;
  }
}
