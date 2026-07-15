import type { EventBus } from '@/common/domain/events/event-bus.port';
import { FriendRequestSentEvent } from '@/modules/friends/domain/events/friend-request-sent.event';
import { FriendRequestAcceptedEvent } from '@/modules/friends/domain/events/friend-request-accepted.event';
import { WishlistSharedEvent } from '@/modules/wishlist/domain/events/wishlist-shared.event';
import { InviteAcceptedEvent } from '@/modules/invites/domain/events/invite-accepted.event';
import type { CreateNotificationUseCase } from '../../application/create-notification.use-case';

export function registerCreateNotificationHandlers(
  eventBus: EventBus,
  createNotification: CreateNotificationUseCase
): void {
  eventBus.subscribe(FriendRequestSentEvent, async (event) => {
    try {
      await createNotification.execute(
        event.receiverId,
        'friend_request',
        'New friend request',
        `${event.senderUsername} has sent you a friend request.`,
        { RequestId: event.requestId, SenderId: event.senderId }
      );
    } catch (err) {
      console.error('[Notifications] Failed to create friend_request notification:', err);
    }
  });

  eventBus.subscribe(FriendRequestAcceptedEvent, async (event) => {
    try {
      await createNotification.execute(
        event.senderId,
        'friend_accepted',
        'Friend request accepted',
        'Your friend request was accepted.',
        { RequestId: event.requestId, UserId: event.accepterId }
      );
    } catch (err) {
      console.error('[Notifications] Failed to create friend_accepted notification:', err);
    }
  });

  eventBus.subscribe(WishlistSharedEvent, async (event) => {
    try {
      await createNotification.execute(
        event.recipientId,
        'list_shared',
        'Wishlist shared with you',
        event.body,
        {
          ListId: event.listId,
          Role: event.role,
          ...(event.sharedBy ? { SharedBy: event.sharedBy } : {}),
        }
      );
    } catch (err) {
      console.error('[Notifications] Failed to create list_shared notification:', err);
    }
  });

  eventBus.subscribe(InviteAcceptedEvent, async (event) => {
    try {
      await createNotification.execute(
        event.listOwnerId,
        'invite_accepted',
        'Invite accepted',
        event.body,
        { ListId: event.listId, UserId: event.accepterId, Type: event.inviteType }
      );
    } catch (err) {
      console.error('[Notifications] Failed to create invite_accepted notification:', err);
    }
  });
}
