import type { Notification } from '../interfaces/notification.interface';
import type { PushPayload } from '../interfaces/push-payload.interface';

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
