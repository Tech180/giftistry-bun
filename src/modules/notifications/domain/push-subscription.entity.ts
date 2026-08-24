export type PushPlatform = 'ios' | 'android';
export type PushTransport = 'ntfy' | 'webpush' | 'fcm';

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

export interface PushSubscriptionPublic {
  Id: string;
  Platform: PushPlatform;
  Transport: PushTransport;
  IsPrimary: boolean;
  CreatedAt: string;
  LastSeenAt?: string;
}

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
