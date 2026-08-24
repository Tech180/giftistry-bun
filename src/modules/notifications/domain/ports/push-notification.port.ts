import type { Notification } from '../notification.entity';
import type { PushSubscription } from '../push-subscription.entity';

export interface PushPayload {
  title: string;
  body: string;
  clickUrl?: string;
  notificationId: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface PushNotificationPort {
  send(subscription: PushSubscription, payload: PushPayload): Promise<void>;
}

export function buildPushPayload(notification: Notification, publicAppUrl?: string): PushPayload {
  const listId =
    typeof notification.Metadata?.ListId === 'string' ? notification.Metadata.ListId : null;
  const itemId =
    typeof notification.Metadata?.ItemId === 'string' ? notification.Metadata.ItemId : null;
  let clickUrl: string | undefined;
  if (publicAppUrl && listId) {
    const base = publicAppUrl.replace(/\/$/, '');
    clickUrl = itemId
      ? `${base}/wishlists/${listId}?item=${encodeURIComponent(itemId)}`
      : `${base}/wishlists/${listId}`;
  }

  return {
    title: notification.Title,
    body: notification.Message,
    clickUrl,
    notificationId: notification.Id,
    type: notification.Type,
    metadata: notification.Metadata,
  };
}
