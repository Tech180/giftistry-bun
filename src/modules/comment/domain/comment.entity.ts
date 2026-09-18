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
  Reactions?: { userId: string; username: string; reaction: string }[];
  CreatedAt?: Date;
}

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
  Reactions?: { userId: string; username: string; reaction: string }[];
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
