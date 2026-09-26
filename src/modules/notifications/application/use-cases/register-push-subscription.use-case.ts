import { AppError } from '@/common/domain/errors/app-error';
import type { ServerConfigRepository } from '@/modules/system';
import type { PushSubscriptionRepository } from '../../domain/ports/push-subscription.repository';
import { toPushSubscriptionPublic } from '../../domain/utils/to-push-subscription-public.util';
import type { RegisterPushInput } from '../interfaces/register-push-input.interface';
import type { RegisterPushResult } from '../interfaces/register-push-result.type';
import { randomToken } from '../utils/random-token.util';
import { sanitizeTopicSegment } from '../utils/sanitize-topic-segment.util';

export class RegisterPushSubscriptionUseCase {
  constructor(
    private pushSubscriptionRepo: PushSubscriptionRepository,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(userId: string, input: RegisterPushInput): Promise<RegisterPushResult> {
    const platform = input.Platform;
    const transport = input.Transport;
    if (platform !== 'ios' && platform !== 'android') {
      throw new AppError('Platform must be ios or android', 400, 'BAD_REQUEST');
    }
    if (transport !== 'ntfy' && transport !== 'webpush' && transport !== 'fcm') {
      throw new AppError('Transport must be ntfy, webpush, or fcm', 400, 'BAD_REQUEST');
    }

    if (transport === 'ntfy') {
      const config = this.serverConfigRepo.load();
      const prefix = (config.NtfyTopicPrefix || 'giftistry').replace(/\/$/, '');
      const topic = `${prefix}-${sanitizeTopicSegment(userId)}-${randomToken(8)}`;
      const accessToken = config.NtfyAuthToken?.trim() || randomToken(24);
      const created = await this.pushSubscriptionRepo.create({
        userId,
        platform,
        transport: 'ntfy',
        endpoint: topic,
        endpointAuth: accessToken,
        isPrimary: input.IsPrimary === true,
      });
      return {
        SubscriptionId: created.Id,
        Topic: topic,
        AccessToken: accessToken,
      };
    }

    if (transport === 'webpush') {
      const endpoint = input.Endpoint?.trim();
      const p256dh = input.Keys?.P256dh?.trim();
      const auth = input.Keys?.Auth?.trim();
      if (!endpoint || !p256dh || !auth) {
        throw new AppError(
          'WebPush registration requires Endpoint, Keys.P256dh, and Keys.Auth',
          400,
          'BAD_REQUEST'
        );
      }
      const created = await this.pushSubscriptionRepo.create({
        userId,
        platform,
        transport: 'webpush',
        endpoint,
        endpointAuth: auth,
        p256dh,
        isPrimary: input.IsPrimary === true,
      });
      return toPushSubscriptionPublic(created);
    }

    const endpoint = input.Endpoint?.trim();
    if (!endpoint) {
      throw new AppError('FCM registration requires Endpoint (device token)', 400, 'BAD_REQUEST');
    }
    const created = await this.pushSubscriptionRepo.create({
      userId,
      platform,
      transport: 'fcm',
      endpoint,
      isPrimary: input.IsPrimary === true,
    });
    return toPushSubscriptionPublic(created);
  }
}
