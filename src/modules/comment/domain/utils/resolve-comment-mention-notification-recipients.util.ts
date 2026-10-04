import type { ResolveCommentMentionNotificationRecipientsInput } from '../interfaces/resolve-comment-mention-notification-recipients-input.interface';
import { canUserViewComment } from './can-user-view-comment.util';
import { extractMentionedUserIds } from './extract-mentioned-user-ids.util';

export function resolveCommentMentionNotificationRecipients(
  input: ResolveCommentMentionNotificationRecipientsInput
): string[] {
  const { content, comment, authorUserId, wishlistOwnerId, listHasExpired } = input;
  const mentionedIds = extractMentionedUserIds(content);
  const recipients: string[] = [];

  for (const userId of mentionedIds) {
    if (!userId || userId === authorUserId) {
      continue;
    }

    if (recipients.includes(userId)) {
      continue;
    }

    if (
      !canUserViewComment({
        comment,
        viewerUserId: userId,
        wishlistOwnerId,
        hasExpired: listHasExpired,
      })
    ) {
      continue;
    }

    recipients.push(userId);
  }

  return recipients;
}
