import type { FriendRequestAcceptedEvent } from '@/modules/friends';
import type { FriendRequestSentEvent } from '@/modules/friends';
import type { InviteAcceptedEvent } from '@/modules/invites';
import type { ItemRemovedEvent } from '@/modules/item';
import type { WishlistSharedEvent } from '@/modules/wishlist';
import { EVENT_NOTIFICATION_TITLE } from '../constants/event-notification-title.constant';
import type { EventNotificationDraft } from '../interfaces/event-notification-draft.interface';
import type { ItemRemovedNotificationDraft } from '../interfaces/item-removed-notification-draft.interface';

export function friendRequestSentDraft(event: FriendRequestSentEvent): EventNotificationDraft {
  return {
    userId: event.receiverId,
    type: 'friend_request',
    title: EVENT_NOTIFICATION_TITLE.friend_request,
    body: `${event.senderUsername} has sent you a friend request.`,
    metadata: { RequestId: event.requestId, SenderId: event.senderId },
  };
}

export function friendRequestAcceptedDraft(
  event: FriendRequestAcceptedEvent
): EventNotificationDraft {
  return {
    userId: event.senderId,
    type: 'friend_accepted',
    title: EVENT_NOTIFICATION_TITLE.friend_accepted,
    body: 'Your friend request was accepted.',
    metadata: { RequestId: event.requestId, UserId: event.accepterId },
  };
}

export function wishlistSharedDraft(event: WishlistSharedEvent): EventNotificationDraft {
  return {
    userId: event.recipientId,
    type: 'list_shared',
    title: EVENT_NOTIFICATION_TITLE.list_shared,
    body: event.body,
    metadata: {
      ListId: event.listId,
      Role: event.role,
      ...(event.sharedBy ? { SharedBy: event.sharedBy } : {}),
    },
  };
}

export function inviteAcceptedDraft(event: InviteAcceptedEvent): EventNotificationDraft {
  return {
    userId: event.listOwnerId,
    type: 'invite_accepted',
    title: EVENT_NOTIFICATION_TITLE.invite_accepted,
    body: event.body,
    metadata: { ListId: event.listId, UserId: event.accepterId, Type: event.inviteType },
  };
}

export function itemRemovedDraft(event: ItemRemovedEvent): ItemRemovedNotificationDraft {
  return {
    type: 'item_deleted',
    title: EVENT_NOTIFICATION_TITLE.item_deleted,
    body: `"${event.itemName}" was deleted from "${event.listTitle}".`,
    metadata: {
      ListId: event.listId,
      ItemName: event.itemName,
      ListTitle: event.listTitle,
    },
    claimerUserIds: event.claimerUserIds,
  };
}
