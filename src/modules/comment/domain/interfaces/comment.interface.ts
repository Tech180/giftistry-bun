import type { CommentReaction } from './comment-reaction.interface';

export interface Comment {
  Id: string;
  ListId: string;
  UserId: string | null;
  CommenterName: string;
  Content: string;
  IsOwnerVisible: boolean;
  /** When set, only these users (plus author) can see the comment. */
  VisibleToUserIds?: string[] | null;
  IsRollover: boolean;
  IsDeleted?: boolean;
  ParentId?: string | null;
  ImageUrl?: string | null;
  Reactions?: CommentReaction[];
  CreatedAt?: Date;
}
