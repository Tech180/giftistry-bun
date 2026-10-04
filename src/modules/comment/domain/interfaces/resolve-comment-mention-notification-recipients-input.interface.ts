import type { CommentVisibilityFields } from './comment-visibility-fields.interface';

export interface ResolveCommentMentionNotificationRecipientsInput {
  content: string;
  comment: CommentVisibilityFields & { UserId?: string | null };
  authorUserId: string | null;
  wishlistOwnerId: string;
  listHasExpired: boolean;
}
