import type { Comment } from '../../domain/interfaces/comment.interface';

export interface NotifyCommentMentionsInput {
  listId: string;
  listTitle: string;
  comment: Comment;
  commenterName: string;
  authorUserId: string | null;
  wishlistOwnerId: string;
  listHasExpired: boolean;
}
