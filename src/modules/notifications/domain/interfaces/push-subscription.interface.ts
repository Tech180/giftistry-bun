import type { PushPlatform } from '../types/push-platform.type';
import type { PushTransport } from '../types/push-transport.type';

export interface PushSubscription {
  Id: string;
  UserId: string;
  Platform: PushPlatform;
  Transport: PushTransport;
  Endpoint: string;
  EndpointAuth: string | null;
  P256dh: string | null;
  IsPrimary: boolean;
  CreatedAt: Date;
  LastSeenAt: Date | null;
}
