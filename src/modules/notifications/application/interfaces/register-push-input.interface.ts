import type { PushPlatform } from '../../domain/types/push-platform.type';
import type { PushTransport } from '../../domain/types/push-transport.type';

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
