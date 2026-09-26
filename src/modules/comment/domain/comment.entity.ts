import type { Comment } from './interfaces/comment.interface';
import type { CommentReaction } from './interfaces/comment-reaction.interface';

export class CommentEntity implements Comment {
  Id!: string;
  ListId!: string;
  UserId!: string | null;
  CommenterName!: string;
  Content!: string;
  IsOwnerVisible!: boolean;
  VisibleToUserIds?: string[] | null;
  IsRollover!: boolean;
  IsDeleted?: boolean;
  ParentId?: string | null;
  ImageUrl?: string | null;
  Reactions?: CommentReaction[];
  CreatedAt?: Date;

  constructor(data: Comment) {
    Object.assign(this, data);
  }

  static from(data: Comment): CommentEntity {
    return new CommentEntity(data);
  }

  toPlain(): Comment {
    return { ...this };
  }

  isOwnedBy(userId: string): boolean {
    return this.UserId === userId;
  }

  resolveOwnerVisibility(isOwner: boolean, requestedVisibility: boolean): boolean {
    return isOwner ? true : requestedVisibility;
  }

  hasContent(): boolean {
    return Boolean(this.Content && this.Content.trim());
  }
}
