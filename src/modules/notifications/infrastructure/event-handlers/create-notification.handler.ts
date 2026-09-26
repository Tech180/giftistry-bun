import type { EventBus } from '@/common/domain/ports/event-bus.port';
import { FriendRequestAcceptedEvent, FriendRequestSentEvent } from '@/modules/friends';
import { InviteAcceptedEvent } from '@/modules/invites';
import { ItemRemovedEvent } from '@/modules/item';
import { WishlistSharedEvent } from '@/modules/wishlist';
import type { CreateNotificationUseCase } from '../../application/use-cases/create-notification.use-case';
import {
  friendRequestAcceptedDraft,
  friendRequestSentDraft,
  inviteAcceptedDraft,
  itemRemovedDraft,
  wishlistSharedDraft,
} from '../utils/build-event-notification-draft.util';
import { safeCreateNotification } from '../utils/safe-create-notification.util';

export function registerCreateNotificationHandlers(
  eventBus: EventBus,
  createNotification: CreateNotificationUseCase
): void {
  eventBus.subscribe(FriendRequestSentEvent, async (event) => {
    const draft = friendRequestSentDraft(event);
    await safeCreateNotification(createNotification, draft.type, draft);
  });

  eventBus.subscribe(FriendRequestAcceptedEvent, async (event) => {
    const draft = friendRequestAcceptedDraft(event);
    await safeCreateNotification(createNotification, draft.type, draft);
  });

  eventBus.subscribe(WishlistSharedEvent, async (event) => {
    const draft = wishlistSharedDraft(event);
    await safeCreateNotification(createNotification, draft.type, draft);
  });

  eventBus.subscribe(InviteAcceptedEvent, async (event) => {
    const draft = inviteAcceptedDraft(event);
    await safeCreateNotification(createNotification, draft.type, draft);
  });

  eventBus.subscribe(ItemRemovedEvent, async (event) => {
    const draft = itemRemovedDraft(event);
    for (const userId of draft.claimerUserIds) {
      await safeCreateNotification(createNotification, draft.type, {
        userId,
        type: draft.type,
        title: draft.title,
        body: draft.body,
        metadata: draft.metadata,
      });
    }
  });
}
