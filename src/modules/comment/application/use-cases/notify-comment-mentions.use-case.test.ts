import { describe, expect, mock, test } from 'bun:test';
import type { CreateNotificationUseCase } from '@/modules/notifications';
import { NotifyCommentMentionsUseCase } from './notify-comment-mentions.use-case';

describe('NotifyCommentMentionsUseCase', () => {
  test('creates comment notifications for eligible mentions', async () => {
    const execute = mock(() => Promise.resolve({ Id: 'n1' }));
    const createNotification = { execute } as unknown as CreateNotificationUseCase;
    const useCase = new NotifyCommentMentionsUseCase(createNotification);

    await useCase.execute({
      listId: 'list-1',
      listTitle: 'Birthday',
      commenterName: 'Alice',
      authorUserId: 'alice',
      wishlistOwnerId: 'owner',
      listHasExpired: false,
      comment: {
        Id: 'comment-1',
        ListId: 'list-1',
        UserId: 'alice',
        CommenterName: 'Alice',
        Content: 'Hey [Bob](user:bob)',
        IsOwnerVisible: true,
        VisibleToUserIds: null,
        IsRollover: false,
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      'bob',
      'comment',
      'Comment mention',
      'Alice mentioned you on "Birthday".',
      expect.objectContaining({
        ListId: 'list-1',
        CommentId: 'comment-1',
        MentionedByUserId: 'alice',
      })
    );
  });
});
