import type { PushPlatform } from '../../domain/types/push-platform.type';
import type { PushTransport } from '../../domain/types/push-transport.type';

export interface PushSubscriptionRow {
  Id: string;
  UserId: string;
  Platform: PushPlatform;
  Transport: PushTransport;
  Endpoint: string;
  EndpointAuth: string | null;
  P256dh: string | null;
  IsPrimary: boolean;
  CreatedAt: Date | string;
  LastSeenAt: Date | string | null;
}
