import type { PushPlatform } from '../types/push-platform.type';
import type { PushTransport } from '../types/push-transport.type';

export interface PushSubscriptionPublic {
  Id: string;
  Platform: PushPlatform;
  Transport: PushTransport;
  IsPrimary: boolean;
  CreatedAt: string;
  LastSeenAt?: string;
}
