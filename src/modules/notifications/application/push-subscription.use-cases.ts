import { AppError } from '@/common/middlewares/error.middleware';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { PushSubscriptionRepository } from '../domain/ports/push-subscription.repository';
import {
  toPushSubscriptionPublic,
  type PushPlatform,
  type PushSubscriptionPublic,
  type PushTransport,
} from '../domain/push-subscription.entity';

export interface RegisterPushInput {
  Platform: PushPlatform;
  Transport: PushTransport;
  Endpoint?: string;
  Keys?: {
    P256dh?: string;
    Auth?: string;
  };
  IsPrimary?: boolean;
}

export type RegisterPushResult =
  | {
      SubscriptionId: string;
      Topic: string;
      AccessToken: string;
    }
  | PushSubscriptionPublic;

function randomToken(bytes = 16): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('hex');
}

function sanitizeTopicSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'user';
}

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

export class ListPushSubscriptionsUseCase {
  constructor(private pushSubscriptionRepo: PushSubscriptionRepository) {}

  async execute(userId: string): Promise<PushSubscriptionPublic[]> {
    const subs = await this.pushSubscriptionRepo.findByUserId(userId);
    return subs.map(toPushSubscriptionPublic);
  }
}

export class DeletePushSubscriptionUseCase {
  constructor(private pushSubscriptionRepo: PushSubscriptionRepository) {}

  async execute(userId: string, subscriptionId: string): Promise<void> {
    const existing = await this.pushSubscriptionRepo.findById(subscriptionId, userId);
    if (!existing) {
      throw new AppError('Push subscription not found', 404, 'NOT_FOUND');
    }
    await this.pushSubscriptionRepo.deleteById(subscriptionId, userId);
  }
}

export class SetPrimaryPushSubscriptionUseCase {
  constructor(private pushSubscriptionRepo: PushSubscriptionRepository) {}

  async execute(userId: string, subscriptionId: string): Promise<PushSubscriptionPublic> {
    const existing = await this.pushSubscriptionRepo.findById(subscriptionId, userId);
    if (!existing) {
      throw new AppError('Push subscription not found', 404, 'NOT_FOUND');
    }
    const updated = await this.pushSubscriptionRepo.setPrimary(subscriptionId, userId);
    return toPushSubscriptionPublic(updated);
  }
}
