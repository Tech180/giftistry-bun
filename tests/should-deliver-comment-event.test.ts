import { describe, expect, test } from 'bun:test';
import { shouldDeliverCommentEventToUser } from '../src/modules/comment/domain/should-deliver-comment-event.util';

describe('shouldDeliverCommentEventToUser', () => {
  test('skips surprise comment.created for the list owner while active', () => {
    expect(
      shouldDeliverCommentEventToUser({
        eventType: 'comment.created',
        commentIsOwnerVisible: false,
        recipientUserId: 'owner',
        wishlistOwnerId: 'owner',
        listHasExpired: false,
      })
    ).toBe(false);
  });

  test('delivers surprise comment.created to collaborators', () => {
    expect(
      shouldDeliverCommentEventToUser({
        eventType: 'comment.created',
        commentIsOwnerVisible: false,
        recipientUserId: 'collab',
        wishlistOwnerId: 'owner',
        listHasExpired: false,
      })
    ).toBe(true);
  });

  test('delivers surprise to owner after list expiry', () => {
    expect(
      shouldDeliverCommentEventToUser({
        eventType: 'comment.created',
        commentIsOwnerVisible: false,
        recipientUserId: 'owner',
        wishlistOwnerId: 'owner',
        listHasExpired: true,
      })
    ).toBe(true);
  });

  test('delivers visible comments and non-created events to owner', () => {
    expect(
      shouldDeliverCommentEventToUser({
        eventType: 'comment.created',
        commentIsOwnerVisible: true,
        recipientUserId: 'owner',
        wishlistOwnerId: 'owner',
        listHasExpired: false,
      })
    ).toBe(true);
    expect(
      shouldDeliverCommentEventToUser({
        eventType: 'comment.deleted',
        commentIsOwnerVisible: false,
        recipientUserId: 'owner',
        wishlistOwnerId: 'owner',
        listHasExpired: false,
      })
    ).toBe(true);
  });
});
