import { describe, expect, test } from 'bun:test';
import { resolveCommentMentionNotificationRecipients } from '../src/modules/comment/domain/utils/resolve-comment-mention-notification-recipients.util';

describe('resolveCommentMentionNotificationRecipients', () => {
  test('excludes author and dedupes mentions', () => {
    const recipients = resolveCommentMentionNotificationRecipients({
      content: 'Hi [Me](user:author) and [Bob](user:bob) and [Bob](user:bob)',
      comment: {
        UserId: 'author',
        IsOwnerVisible: true,
        VisibleToUserIds: null,
      },
      authorUserId: 'author',
      wishlistOwnerId: 'owner',
      listHasExpired: false,
    });

    expect(recipients).toEqual(['bob']);
  });

  test('does not notify owner mentioned on hidden-from-owner comment', () => {
    const recipients = resolveCommentMentionNotificationRecipients({
      content: 'Secret [Owner](user:owner)',
      comment: {
        UserId: 'collab',
        IsOwnerVisible: false,
        VisibleToUserIds: null,
      },
      authorUserId: 'collab',
      wishlistOwnerId: 'owner',
      listHasExpired: false,
    });

    expect(recipients).toEqual([]);
  });

  test('only notifies users in selected audience', () => {
    const recipients = resolveCommentMentionNotificationRecipients({
      content: 'Hey [A](user:a) and [B](user:b)',
      comment: {
        UserId: 'author',
        IsOwnerVisible: true,
        VisibleToUserIds: ['a'],
      },
      authorUserId: 'author',
      wishlistOwnerId: 'owner',
      listHasExpired: false,
    });

    expect(recipients).toEqual(['a']);
  });
});
