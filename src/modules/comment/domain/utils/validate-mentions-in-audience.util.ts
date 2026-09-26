import { DomainError } from '@/common/domain/errors/domain-error';
import { extractMentionedUserIds } from './extract-mentioned-user-ids.util';

export function validateMentionsInAudience(
  content: string,
  visibleToUserIds: string[] | null,
  authorUserId: string | null
): void {
  if (!visibleToUserIds || visibleToUserIds.length === 0) {
    return;
  }
  const allowed = new Set(visibleToUserIds);
  if (authorUserId) {
    allowed.add(authorUserId);
  }
  for (const mentionedId of extractMentionedUserIds(content)) {
    if (!allowed.has(mentionedId)) {
      throw new DomainError(
        'Mentioned users must be included in the selected comment audience',
        'BAD_REQUEST'
      );
    }
  }
}
