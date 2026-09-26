import type { PushPlatform } from '../types/push-platform.type';
import type { PushTransport } from '../types/push-transport.type';

export interface CreatePushSubscriptionInput {
  userId: string;
  platform: PushPlatform;
  transport: PushTransport;
  endpoint: string;
  endpointAuth?: string | null;
  p256dh?: string | null;
  isPrimary?: boolean;
}
