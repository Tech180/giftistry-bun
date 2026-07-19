/**
 * Whether a wishlist WS subscriber should receive a comment event.
 * Owners must not get surprise (non-owner-visible) comment.created while the list is active.
 */
export function shouldDeliverCommentEventToUser(input: {
  eventType: string;
  commentIsOwnerVisible?: boolean;
  recipientUserId: string;
  wishlistOwnerId: string;
  listHasExpired: boolean;
}): boolean {
  if (input.eventType !== 'comment.created') {
    return true;
  }
  if (input.commentIsOwnerVisible !== false) {
    return true;
  }
  if (input.listHasExpired) {
    return true;
  }
  return input.recipientUserId !== input.wishlistOwnerId;
}
