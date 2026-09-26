import type { Comment } from './comment.interface';

export interface CanUserViewCommentInput {
  comment: Pick<Comment, 'UserId' | 'IsOwnerVisible' | 'VisibleToUserIds'>;
  viewerUserId: string | null;
  wishlistOwnerId: string;
  hasExpired: boolean;
}
