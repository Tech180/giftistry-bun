import type { PushNotificationPort, PushPayload } from '../domain/ports/push-notification.port';
import type { PushSubscription } from '../domain/push-subscription.entity';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

/**
 * FCM HTTP v1 adapter for iOS fallback device tokens.
 * Uses a service-account JWT when configured; logs and skips when not fully set up.
 */
export class FcmPushAdapter implements PushNotificationPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    const config = this.serverConfigRepo.load();
    if (!config.FcmEnabled) return;
    if (!config.FcmProjectId || !config.FcmServiceAccountJson) {
      console.warn('[FCM] Missing project id or service account; skipping send');
      return;
    }

    let serviceAccount: { client_email?: string; private_key?: string; token_uri?: string };
    try {
      serviceAccount = JSON.parse(config.FcmServiceAccountJson);
    } catch {
      throw new Error('Invalid FcmServiceAccountJson');
    }

    const accessToken = await this.fetchAccessToken(serviceAccount);
    const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.FcmProjectId)}/messages:send`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: subscription.Endpoint,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            notificationId: payload.notificationId,
            type: payload.type,
            ...(payload.clickUrl ? { clickUrl: payload.clickUrl } : {}),
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`FCM send failed (${response.status}): ${text}`);
    }
  }

  private async fetchAccessToken(serviceAccount: {
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  }): Promise<string> {
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FCM service account missing client_email or private_key');
    }

    // Prefer google-auth-library when installed; otherwise surface a clear error.
    try {
      const { JWT } = await import('google-auth-library');
      const client = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
      const tokens = await client.authorize();
      if (!tokens.access_token) throw new Error('FCM authorize returned no access_token');
      return tokens.access_token;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'google-auth-library is required for FCM push. Install it or disable FcmEnabled.'
        );
      }
      throw err;
    }
  }
}
