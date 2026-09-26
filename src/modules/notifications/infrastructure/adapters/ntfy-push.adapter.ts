import type { PushPayload } from '../../domain/interfaces/push-payload.interface';
import type { PushSubscription } from '../../domain/interfaces/push-subscription.interface';
import type { PushNotificationPort } from '../../domain/ports/push-notification.port';
import type { ServerConfigRepository } from '@/modules/system';
import {
  DEFAULT_NTFY_BASE_URL,
  NTFY_DEFAULT_PRIORITY,
} from '../constants/push-adapter.constant';

export class NtfyPushAdapter implements PushNotificationPort {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  async send(subscription: PushSubscription, payload: PushPayload): Promise<void> {
    const config = this.serverConfigRepo.load();
    if (!config.NtfyEnabled) {
      return;
    }
    const baseUrl = (config.NtfyBaseUrl || DEFAULT_NTFY_BASE_URL).replace(/\/$/, '');
    const topic = subscription.Endpoint;
    const headers: Record<string, string> = {
      Title: payload.title,
      Priority: NTFY_DEFAULT_PRIORITY,
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
