import type { PushSubscriptionPublic } from '../../domain/interfaces/push-subscription-public.interface';

export type RegisterPushResult =
  | {
      SubscriptionId: string;
      Topic: string;
      AccessToken: string;
    }
  | PushSubscriptionPublic;
