import type { CommentRealtimePublisher } from '../../domain/ports/comment-realtime-publisher.port';
import type { CommentRealtimeEventType } from '../../domain/types/comment-realtime-event-type.type';
import {
  commentCreatedNeedsVisibilityFilter,
  shouldDeliverCommentEventToUser,
} from '../../domain/utils/should-deliver-comment-event.util';
import type { CommentRealtimePayloadComment } from '../interfaces/comment-realtime-payload-comment.interface';
import type { CommentRoomLookup } from '../types/comment-room-lookup.type';
import type { CommentWishlistLookup } from '../types/comment-wishlist-lookup.type';

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
    const comment = payload.Comment as CommentRealtimePayloadComment | undefined;
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
