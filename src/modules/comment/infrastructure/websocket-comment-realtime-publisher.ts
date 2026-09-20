import type {
  CommentRealtimeEventType,
  CommentRealtimePublisher,
} from '../domain/ports/comment-realtime-publisher.port';
import {
  commentCreatedNeedsVisibilityFilter,
  shouldDeliverCommentEventToUser,
} from '../domain/should-deliver-comment-event.util';
import type { WishlistWsRoomEntry } from '@/modules/wishlist/infrastructure/wishlist-ws-registry';

export type CommentWishlistLookup = (listId: string) => Promise<{
  UserId: string;
  ExpiresAt: Date | string | null;
} | null>;

export type CommentRoomLookup = (
  listId: string
) => Map<string, WishlistWsRoomEntry> | undefined;

/**
 * Comment realtime adapter: delivers per-connection with visibility filtering
 * (not Bun topic publish). Room + wishlist lookup are wired at construction.
 */
export class WebsocketCommentRealtimePublisher implements CommentRealtimePublisher {
  constructor(
    private getRoom: CommentRoomLookup,
    private findWishlist: CommentWishlistLookup
  ) {}

  publish(
    listId: string,
    type: CommentRealtimeEventType,
    data: Record<string, unknown>
  ): void {
    const room = this.getRoom(listId);
    if (!room || room.size === 0) {
      return;
    }

    const payload: Record<string, unknown> = { Type: type, ...data };
    const comment = payload.Comment as
      | {
          UserId?: string | null;
          IsOwnerVisible?: boolean;
          VisibleToUserIds?: string[] | null;
        }
      | undefined;
    const needsVisibilityFilter =
      type === 'comment.created' && commentCreatedNeedsVisibilityFilter(comment);

    const deliver = (wishlistOwnerId: string, listHasExpired: boolean) => {
      const json = JSON.stringify(payload);
      for (const entry of room.values()) {
        if (
          !shouldDeliverCommentEventToUser({
            eventType: type,
            comment,
            commentIsOwnerVisible: comment?.IsOwnerVisible,
            recipientUserId: entry.userId,
            wishlistOwnerId,
            listHasExpired,
          })
        ) {
          continue;
        }
        try {
          entry.send(json);
        } catch (err) {
          console.error('[ERROR] Failed to send comment WS event:', err);
        }
      }
    };

    if (!needsVisibilityFilter) {
      deliver('', false);
      return;
    }

    void this.findWishlist(listId)
      .then((wishlist) => {
        if (!wishlist) {
          deliver('', false);
          return;
        }
        const listHasExpired = wishlist.ExpiresAt
          ? new Date() > new Date(wishlist.ExpiresAt)
          : false;
        deliver(wishlist.UserId, listHasExpired);
      })
      .catch((err) => {
        console.error('[ERROR] Failed to resolve wishlist for comment WS filter:', err);
      });
  }
}
