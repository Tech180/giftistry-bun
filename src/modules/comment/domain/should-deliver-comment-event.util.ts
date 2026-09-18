import { canUserViewComment } from './comment-visibility.service';

/**
 * Whether a wishlist WS subscriber should receive a comment event.
 * Restricts comment.created by the same visibility rules as list-comments.
 */
export function shouldDeliverCommentEventToUser(input: {
  eventType: string;
  comment?: {
    UserId?: string | null;
    IsOwnerVisible?: boolean;
    VisibleToUserIds?: string[] | null;
  };
  /** @deprecated Prefer `comment.IsOwnerVisible` */
  commentIsOwnerVisible?: boolean;
  recipientUserId: string;
  wishlistOwnerId: string;
  listHasExpired: boolean;
}): boolean {
  if (input.eventType !== 'comment.created') {
    return true;
  }

  const isOwnerVisible =
    input.comment?.IsOwnerVisible ?? input.commentIsOwnerVisible ?? true;
  const visibleToUserIds = input.comment?.VisibleToUserIds ?? null;
  const authorUserId = input.comment?.UserId ?? null;

  const needsFilter =
    isOwnerVisible === false ||
    (Array.isArray(visibleToUserIds) && visibleToUserIds.length > 0);

  if (!needsFilter) {
    return true;
  }

  return canUserViewComment({
    comment: {
      UserId: authorUserId,
      IsOwnerVisible: isOwnerVisible,
      VisibleToUserIds: visibleToUserIds,
    },
    viewerUserId: input.recipientUserId,
    wishlistOwnerId: input.wishlistOwnerId,
    hasExpired: input.listHasExpired,
  });
}

/** True when comment.created must be filtered per recipient (not broadcast blindly). */
export function commentCreatedNeedsVisibilityFilter(comment?: {
  IsOwnerVisible?: boolean;
  VisibleToUserIds?: string[] | null;
}): boolean {
  if (!comment) return false;
  if (comment.IsOwnerVisible === false) return true;
  return Array.isArray(comment.VisibleToUserIds) && comment.VisibleToUserIds.length > 0;
}
