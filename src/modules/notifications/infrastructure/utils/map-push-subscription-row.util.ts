import type { PushSubscription } from '../../domain/interfaces/push-subscription.interface';
import type { PushSubscriptionRow } from '../interfaces/push-subscription-row.interface';

export function mapPushSubscriptionRow(row: PushSubscriptionRow): PushSubscription {
  return {
    Id: row.Id,
    UserId: row.UserId,
    Platform: row.Platform,
    Transport: row.Transport,
    Endpoint: row.Endpoint,
    EndpointAuth: row.EndpointAuth ?? null,
    P256dh: row.P256dh ?? null,
    IsPrimary: !!row.IsPrimary,
    CreatedAt: new Date(row.CreatedAt),
    LastSeenAt: row.LastSeenAt ? new Date(row.LastSeenAt) : null,
  };
}
