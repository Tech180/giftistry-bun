import type { PushNotificationPort, PushPayload } from '../domain/ports/push-notification.port';
import type { PushSubscription } from '../domain/push-subscription.entity';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

export class NtfyPushAdapter implements PushNotificationPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    const config = this.serverConfigRepo.load();
    if (!config.NtfyEnabled) return;
    const baseUrl = (config.NtfyBaseUrl || 'https://ntfy.sh').replace(/\/$/, '');
    const topic = subscription.Endpoint;
    const headers: Record<string, string> = {
      Title: payload.title,
      Priority: 'default',
      'Content-Type': 'text/plain',
    };
    if (payload.clickUrl) {
      headers.Click = payload.clickUrl;
    }
    const token = config.NtfyAuthToken || subscription.EndpointAuth;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers,
      body: payload.body,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ntfy publish failed (${response.status}): ${text}`);
    }
  }
}
