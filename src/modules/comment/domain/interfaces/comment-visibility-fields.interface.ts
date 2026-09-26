import type { Comment } from './comment.interface';

export type CommentVisibilityFields = Pick<Comment, 'IsOwnerVisible' | 'VisibleToUserIds'>;
