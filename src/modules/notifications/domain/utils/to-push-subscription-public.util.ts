import type { PushSubscription } from '../interfaces/push-subscription.interface';
import type { PushSubscriptionPublic } from '../interfaces/push-subscription-public.interface';

export function toPushSubscriptionPublic(sub: PushSubscription): PushSubscriptionPublic {
  return {
    Id: sub.Id,
    Platform: sub.Platform,
    Transport: sub.Transport,
    IsPrimary: sub.IsPrimary,
    CreatedAt: sub.CreatedAt.toISOString(),
    ...(sub.LastSeenAt ? { LastSeenAt: sub.LastSeenAt.toISOString() } : {}),
  };
}
