import type { CreateNotificationUseCase } from '@/modules/notifications';
import { EVENT_NOTIFICATION_TITLE } from '@/modules/notifications/infrastructure/constants/event-notification-title.constant';
import type { NotifyCommentMentionsInput } from '../interfaces/notify-comment-mentions-input.interface';
import { resolveCommentMentionNotificationRecipients } from '../../domain/utils/resolve-comment-mention-notification-recipients.util';

export class NotifyCommentMentionsUseCase {
  constructor(private createNotification: CreateNotificationUseCase) {}

  async execute(input: NotifyCommentMentionsInput): Promise<void> {
    const recipients = resolveCommentMentionNotificationRecipients({
      content: input.comment.Content,
      comment: {
        UserId: input.comment.UserId,
        IsOwnerVisible: input.comment.IsOwnerVisible,
        VisibleToUserIds: input.comment.VisibleToUserIds,
      },
      authorUserId: input.authorUserId,
      wishlistOwnerId: input.wishlistOwnerId,
      listHasExpired: input.listHasExpired,
    });

    if (recipients.length === 0) {
      return;
    }

    const listTitle = input.listTitle.trim() || 'a wishlist';
    const commenterName = input.commenterName.trim() || 'Someone';
    const title = EVENT_NOTIFICATION_TITLE.comment;
    const body = `${commenterName} mentioned you on "${listTitle}".`;
    const metadata: Record<string, unknown> = {
      ListId: input.listId,
      CommentId: input.comment.Id,
      ListTitle: listTitle,
      MentionedByUserId: input.authorUserId,
    };

    if (input.comment.ParentId) {
      metadata.ParentId = input.comment.ParentId;
    }

    for (const userId of recipients) {
      try {
        await this.createNotification.execute(userId, 'comment', title, body, metadata);
      } catch (err) {
        console.error('[Notifications] Failed to create comment mention notification:', err);
      }
    }
  }
}
